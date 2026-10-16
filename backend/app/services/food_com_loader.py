"""
Food.com Dataset Loader
=======================
Provides real Food.com recipe and interaction data to algorithmic modules.

All files are loaded READ-ONLY and never modified or recreated.

Dataset files (located in backend/):
  RAW_recipes.csv        -- 231,637 recipes with name, tags, ingredients, steps
  RAW_interactions.csv   -- ~1.1M raw user-recipe ratings (not loaded directly here)
  PP_recipes.csv         -- Preprocessed recipe token vectors (reserved)
  PP_users.csv           -- Preprocessed user feature vectors (fallback for K-Means)
  interactions_train.csv -- Training split (~1.4M rows) <- PRIMARY source
  interactions_validation.csv -- Validation split (reserved)
  interactions_test.csv  -- Test split (reserved)

Integration points:
  apriori_engine.py    -> get_apriori_baskets()          -- tag-level user baskets
  clustering_engine.py -> get_user_clustering_features() -- per-user interaction stats
"""

import ast
import pandas as pd
import numpy as np
from pathlib import Path

# ---------------------------------------------------------------------------
# Path resolution
# This file lives at:  backend/app/services/food_com_loader.py
# backend/ is 3 levels up (.parent x3)
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
BACKEND_DIR = _THIS_FILE.parent.parent.parent   # -> backend/

RAW_RECIPES_PATH = BACKEND_DIR / "RAW_recipes.csv"
INTERACTIONS_TRAIN_PATH = BACKEND_DIR / "interactions_train.csv"
INTERACTIONS_VAL_PATH = BACKEND_DIR / "interactions_validation.csv"
INTERACTIONS_TEST_PATH = BACKEND_DIR / "interactions_test.csv"
PP_USERS_PATH = BACKEND_DIR / "PP_users.csv"
PP_RECIPES_PATH = BACKEND_DIR / "PP_recipes.csv"

# ---------------------------------------------------------------------------
# Tag filtering -- keep only semantically meaningful recipe tags.
# Strip procedural/time/equipment meta-tags that produce noise in Apriori.
# ---------------------------------------------------------------------------
_SKIP_TAGS = frozenset({
    # Procedural/meta tags (category markers, not food concepts)
    "time-to-make", "course", "main-ingredient", "cuisine", "preparation",
    "occasion", "dietary", "technique", "equipment", "number-of-servings",
    "to-go", "beginner-cook", "easy", "inexpensive", "presentation",
    # Time duration tags
    "60-minutes-or-less", "30-minutes-or-less", "15-minutes-or-less",
    "4-hours-or-less", "1-day-or-more", "weeknight", "weekend",
    # Cooking equipment
    "oven", "stove-top", "refrigerator", "freezer", "microwave",
    "slow-cooker", "pressure-cooker", "deep-fryer", "broil",
    # Temperature/serving style
    "served-hot", "served-cold",
})


def _parse_tags(raw_tag_str: str) -> list:
    """
    Safely parse a tags column value (stored as Python list literal) into a
    deduplicated list of clean lowercase tag strings, excluding noise tags.
    """
    try:
        tags = ast.literal_eval(str(raw_tag_str))
        seen = set()
        result = []
        for t in tags:
            t_clean = t.strip().lower()
            if t_clean and t_clean not in _SKIP_TAGS and t_clean not in seen:
                seen.add(t_clean)
                result.append(t_clean)
        return result
    except Exception:
        return []


# ---------------------------------------------------------------------------
# FoodComLoader -- singleton with lazy-loaded, cached DataFrames
# ---------------------------------------------------------------------------

class FoodComLoader:
    """
    Singleton loader for the Food.com dataset.

    Usage:
        from .food_com_loader import get_loader
        loader = get_loader()
        if loader.is_available():
            baskets = loader.get_apriori_baskets()
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._recipes_df = None
            cls._instance._train_df = None
            cls._instance._pp_users_df = None
        return cls._instance

    # ------------------------------------------------------------------
    # Availability checks
    # ------------------------------------------------------------------

    @staticmethod
    def is_available() -> bool:
        """Return True when the minimum required CSV files are present."""
        return RAW_RECIPES_PATH.exists() and INTERACTIONS_TRAIN_PATH.exists()

    @staticmethod
    def files_status() -> dict:
        """Return existence status for every dataset file."""
        return {
            "RAW_recipes.csv": RAW_RECIPES_PATH.exists(),
            "RAW_interactions.csv": (BACKEND_DIR / "RAW_interactions.csv").exists(),
            "PP_recipes.csv": PP_RECIPES_PATH.exists(),
            "PP_users.csv": PP_USERS_PATH.exists(),
            "interactions_train.csv": INTERACTIONS_TRAIN_PATH.exists(),
            "interactions_validation.csv": INTERACTIONS_VAL_PATH.exists(),
            "interactions_test.csv": INTERACTIONS_TEST_PATH.exists(),
        }

    # ------------------------------------------------------------------
    # Lazy loaders (result cached after first call)
    # ------------------------------------------------------------------

    def load_recipes(self, n_sample=20000):
        """
        Load a sample of RAW_recipes.csv.
        Only reads columns: id, name, tags.
        Parses tags into a list of semantic strings stored in 'parsed_tags'.
        """
        if self._recipes_df is not None:
            return self._recipes_df
        if not RAW_RECIPES_PATH.exists():
            return pd.DataFrame()

        print("[FoodCom] Loading %d recipes from RAW_recipes.csv ..." % n_sample)
        df = pd.read_csv(
            RAW_RECIPES_PATH,
            usecols=["id", "name", "tags"],
            nrows=n_sample,
            dtype={"id": "int64", "name": "str", "tags": "str"},
            on_bad_lines="skip",
        )
        df = df.dropna(subset=["id", "name", "tags"])
        df["name"] = df["name"].str.strip().str.title()
        df["parsed_tags"] = df["tags"].apply(_parse_tags)
        self._recipes_df = df.reset_index(drop=True)
        print("[FoodCom] Loaded %d recipes." % len(self._recipes_df))
        return self._recipes_df

    def load_train_interactions(self, n_sample=200000):
        """
        Load interactions_train.csv -- the pre-split training subset.
        Reads columns: user_id, recipe_id, rating.
        Retains only positive interactions (rating >= 3).
        """
        if self._train_df is not None:
            return self._train_df
        if not INTERACTIONS_TRAIN_PATH.exists():
            return pd.DataFrame()

        print("[FoodCom] Loading %d rows from interactions_train.csv ..." % n_sample)
        df = pd.read_csv(
            INTERACTIONS_TRAIN_PATH,
            usecols=["user_id", "recipe_id", "rating"],
            nrows=n_sample,
            dtype={"user_id": "int64", "recipe_id": "int64", "rating": "float32"},
            on_bad_lines="skip",
        )
        df = df[df["rating"] >= 3.0].reset_index(drop=True)
        self._train_df = df
        print("[FoodCom] Loaded %d positive train interactions." % len(self._train_df))
        return self._train_df

    def load_pp_users(self, n_sample=5000):
        """
        Load PP_users.csv (preprocessed user feature vectors).
        Reads columns: u (user index), n_items, n_ratings.
        Used as fallback for K-Means if interactions_train.csv is unavailable.
        """
        if self._pp_users_df is not None:
            return self._pp_users_df
        if not PP_USERS_PATH.exists():
            return pd.DataFrame()

        print("[FoodCom] Loading %d rows from PP_users.csv ..." % n_sample)
        df = pd.read_csv(
            PP_USERS_PATH,
            usecols=["u", "n_items", "n_ratings"],
            nrows=n_sample,
            dtype={"u": "int64", "n_items": "int64", "n_ratings": "int64"},
            on_bad_lines="skip",
        )
        self._pp_users_df = df.reset_index(drop=True)
        print("[FoodCom] Loaded %d PP_users rows." % len(self._pp_users_df))
        return self._pp_users_df

    # ------------------------------------------------------------------
    # Derived datasets for algorithmic modules
    # ------------------------------------------------------------------

    def get_apriori_baskets(self, min_basket_size=2, max_users=8000):
        """
        Build transaction baskets for Apriori Association Rule Mining.

        Strategy
        --------
        Individual recipe names have near-zero support across 231k+ unique
        recipes. Instead, semantic TAGS are extracted from each recipe and
        used as basket items, producing interpretable rules such as:

            italian -> desserts  (confidence: 0.74, lift: 1.4)
            chicken -> main-dish (confidence: 0.91, lift: 1.1)
            vegetarian -> healthy (confidence: 0.82, lift: 1.6)

        Algorithm
        ---------
        1. Load RAW_recipes.csv: build recipe_id -> parsed_tags mapping.
        2. Load interactions_train.csv (positive ratings >= 3 only).
        3. For each user: collect union of all tags from their rated recipes.
        4. Deduplicate tags within each user basket.
        5. Return baskets with at least min_basket_size items.

        Parameters
        ----------
        min_basket_size : Minimum number of tags per basket (default 2)
        max_users       : Maximum number of user baskets to return (default 8000)

        Returns
        -------
        list of list of str  -- Each inner list is one user's tag basket.
        """
        interactions = self.load_train_interactions()
        recipes = self.load_recipes()

        if interactions.empty or recipes.empty:
            return []

        # Build recipe_id -> list of tags mapping
        id_to_tags = dict(zip(recipes["id"], recipes["parsed_tags"]))

        # Filter interactions to only recipes we have tag data for
        interactions_filtered = interactions[interactions["recipe_id"].isin(id_to_tags)]
        if interactions_filtered.empty:
            return []

        baskets = []
        for user_id, group in interactions_filtered.groupby("user_id"):
            tag_set = []
            seen = set()
            for rid in group["recipe_id"].tolist():
                for tag in id_to_tags.get(rid, []):
                    if tag not in seen:
                        seen.add(tag)
                        tag_set.append(tag)
            if len(tag_set) >= min_basket_size:
                baskets.append(tag_set)
            if len(baskets) >= max_users:
                break

        print("[FoodCom] Built %d Apriori tag-baskets." % len(baskets))
        return baskets

    def get_user_clustering_features(self, n_users=3000):
        """
        Build a user feature matrix for K-Means clustering.

        Features (derived from interactions_train.csv)
        -----------------------------------------------
        n_ratings         : total positive interactions recorded
        avg_rating        : mean rating score given
        n_unique_recipes  : number of distinct recipes rated
        pct_high_ratings  : fraction of ratings that are 4 or 5

        Fallback: if interactions_train.csv is unavailable, uses PP_users.csv
        columns n_items and n_ratings with neutral placeholders for the rest.

        Parameters
        ----------
        n_users : Max users to return (default 3000)

        Returns
        -------
        DataFrame with columns:
            user_id, n_ratings, avg_rating, n_unique_recipes, pct_high_ratings
        """
        interactions = self.load_train_interactions(n_sample=500000)

        if not interactions.empty:
            stats = interactions.groupby("user_id").agg(
                n_ratings=("rating", "count"),
                avg_rating=("rating", "mean"),
                n_unique_recipes=("recipe_id", "nunique"),
                pct_high_ratings=("rating", lambda x: float((x >= 4.0).mean())),
            ).reset_index()

            # Keep users with at least 3 interactions for stable clustering features
            stats = stats[stats["n_ratings"] >= 3].head(n_users).reset_index(drop=True)

            if not stats.empty:
                print("[FoodCom] Built clustering features for %d users." % len(stats))
                return stats

        # Fallback to PP_users.csv
        pp = self.load_pp_users(n_sample=n_users)
        if not pp.empty:
            pp = pp.rename(columns={"u": "user_id", "n_items": "n_unique_recipes"})
            pp["avg_rating"] = 4.0
            pp["pct_high_ratings"] = 0.5
            return pp[["user_id", "n_ratings", "avg_rating",
                        "n_unique_recipes", "pct_high_ratings"]].head(n_users)

        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Module-level singleton accessor
# ---------------------------------------------------------------------------

_singleton = None


def get_loader():
    """Return the module-level FoodComLoader singleton instance."""
    global _singleton
    if _singleton is None:
        _singleton = FoodComLoader()
    return _singleton

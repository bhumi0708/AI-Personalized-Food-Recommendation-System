"""
Food.com Recommendation Model Training Pipeline
================================================
Trains a Hybrid Content & Collaborative Food Recommendation Model using:
- RAW_recipes.csv: Recipe metadata, ingredients, and culinary tags (231,637 recipes)
- interactions_train.csv: Historical user-recipe ratings (~700k rows) for model fitting
- interactions_validation.csv: Validation split for offline evaluation (~7k rows)
- interactions_test.csv: Held-out test split for final evaluation (~12.5k rows)
- Operational Catalog: 15 food items from SQLite dim_food

Learns:
1. TF-IDF tag representations and a 15x15 Item-to-Item Flavor Similarity Matrix
2. Bayesian smoothed rating priors and empirical popularity scores per dish
3. Cross-item co-occurrence and companion affinity from user interaction history
4. Offline evaluation metrics (MAE, RMSE, Hit Rate@3, Hit Rate@5) on held-out splits

Saves model artifacts to:
- backend/food_model.joblib (Primary joblib format)
- backend/models/food_recommendation_model.pkl (Engine pickle format)
"""

import os
import sys
import math
import time
import pickle
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from itertools import combinations

# Path resolution: allow running from project root or backend directory
THIS_DIR = Path(__file__).resolve().parent
ROOT_DIR = THIS_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

import pandas as pd
import numpy as np

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

# Path configurations
RAW_RECIPES_PATH = THIS_DIR / "RAW_recipes.csv"
TRAIN_INTERACTIONS_PATH = THIS_DIR / "interactions_train.csv"
VAL_INTERACTIONS_PATH = THIS_DIR / "interactions_validation.csv"
TEST_INTERACTIONS_PATH = THIS_DIR / "interactions_test.csv"
MODELS_DIR = THIS_DIR / "models"
MODEL_PKL_PATH = MODELS_DIR / "food_recommendation_model.pkl"
MODEL_JOBLIB_PATH = THIS_DIR / "food_model.joblib"

# Operational 15-food catalog definition
CATALOG_ITEMS = [
    {
        "food_id": 1, "food_name": "Biryani", "category": "Main Course", "cuisine": "Indian",
        "primary_names": ["biryani"],
        "keywords": ["rice", "spicy", "chicken", "meat", "indian", "main-dish", "curry"]
    },
    {
        "food_id": 2, "food_name": "Chicken 65", "category": "Starter", "cuisine": "Indian",
        "primary_names": ["chicken 65", "chicken sixty five"],
        "keywords": ["chicken", "fried", "spicy", "starter", "appetizer", "indian", "snack"]
    },
    {
        "food_id": 3, "food_name": "Raita", "category": "Side Dish", "cuisine": "Indian",
        "primary_names": ["raita"],
        "keywords": ["yogurt", "curd", "cucumber", "dip", "side-dishes", "indian", "cooling"]
    },
    {
        "food_id": 4, "food_name": "Paneer Curry", "category": "Main Course", "cuisine": "Indian",
        "primary_names": ["paneer curry", "paneer"],
        "keywords": ["curry", "cottage-cheese", "vegetarian", "indian", "main-dish", "gravy"]
    },
    {
        "food_id": 5, "food_name": "Dosa", "category": "Main Course", "cuisine": "South Indian",
        "primary_names": ["dosa", "dosas"],
        "keywords": ["crepe", "fermented", "south-indian", "breakfast", "vegetarian", "main-dish", "pancake"]
    },
    {
        "food_id": 6, "food_name": "Idli", "category": "Starter", "cuisine": "South Indian",
        "primary_names": ["idli", "idlis"],
        "keywords": ["steamed", "rice-cake", "south-indian", "breakfast", "vegetarian", "starter"]
    },
    {
        "food_id": 7, "food_name": "Meals", "category": "Main Course", "cuisine": "Indian",
        "primary_names": ["thali", "meals", "south indian meal"],
        "keywords": ["rice", "dal", "sambar", "platter", "indian", "lunch", "main-dish"]
    },
    {
        "food_id": 8, "food_name": "Pizza", "category": "Main Course", "cuisine": "Fast Food",
        "primary_names": ["pizza", "pizzas"],
        "keywords": ["cheese", "crust", "italian", "baked", "fast-food", "mozzarella", "main-dish"]
    },
    {
        "food_id": 9, "food_name": "Burger", "category": "Main Course", "cuisine": "Fast Food",
        "primary_names": ["burger", "burgers", "cheeseburger"],
        "keywords": ["patty", "bun", "fast-food", "beef", "chicken", "sandwich", "main-dish"]
    },
    {
        "food_id": 10, "food_name": "Fries", "category": "Side Dish", "cuisine": "Fast Food",
        "primary_names": ["fries", "french fries"],
        "keywords": ["potato", "crispy", "snack", "side-dishes", "fast-food"]
    },
    {
        "food_id": 11, "food_name": "Garlic Bread", "category": "Starter", "cuisine": "Fast Food",
        "primary_names": ["garlic bread"],
        "keywords": ["bread", "garlic", "butter", "toast", "starter", "italian", "fast-food"]
    },
    {
        "food_id": 12, "food_name": "Fried Rice", "category": "Main Course", "cuisine": "Chinese",
        "primary_names": ["fried rice"],
        "keywords": ["rice", "wok", "chinese", "asian", "vegetables", "main-dish"]
    },
    {
        "food_id": 13, "food_name": "Noodles", "category": "Main Course", "cuisine": "Chinese",
        "primary_names": ["noodles", "chow mein", "lo mein"],
        "keywords": ["pasta", "chinese", "asian", "stir-fry", "main-dish"]
    },
    {
        "food_id": 14, "food_name": "Ice Cream", "category": "Dessert", "cuisine": "Desserts",
        "primary_names": ["ice cream", "ice-cream"],
        "keywords": ["frozen", "dessert", "sweet", "vanilla", "chocolate", "dairy"]
    },
    {
        "food_id": 15, "food_name": "Coke", "category": "Beverage", "cuisine": "Beverages",
        "primary_names": ["coke", "coca cola", "cola"],
        "keywords": ["soda", "beverage", "drink", "soft-drink", "carbonated"]
    }
]

# Noise tags to exclude from tag vectors
SKIP_TAGS = frozenset({
    "time-to-make", "course", "main-ingredient", "cuisine", "preparation",
    "occasion", "dietary", "technique", "equipment", "number-of-servings",
    "to-go", "beginner-cook", "easy", "inexpensive", "presentation",
    "60-minutes-or-less", "30-minutes-or-less", "15-minutes-or-less",
    "4-hours-or-less", "1-day-or-more", "weeknight", "weekend",
    "oven", "stove-top", "refrigerator", "freezer", "microwave",
    "slow-cooker", "pressure-cooker", "deep-fryer", "broil",
    "served-hot", "served-cold"
})

# Ensure UTF-8 output if possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def parse_tags_clean(raw_tags_str: str) -> list:
    """Safely parse literal tag lists into deduplicated clean tokens."""
    if not isinstance(raw_tags_str, str) or not raw_tags_str:
        return []
    try:
        import ast
        tags = ast.literal_eval(raw_tags_str)
        cleaned = []
        for t in tags:
            clean = str(t).strip().lower()
            if clean and clean not in SKIP_TAGS:
                cleaned.append(clean)
        return cleaned
    except Exception:
        raw = raw_tags_str.strip("[]'\"").replace("'", "").replace('"', "")
        return [t.strip().lower() for t in raw.split(",") if t.strip() and t.strip().lower() not in SKIP_TAGS]


def evaluate_split(split_df: pd.DataFrame, recipe_to_catalog: dict, catalog_priors: dict, split_name: str) -> dict:
    """Evaluate rating prediction accuracy and Top-K hit rates on a held-out split."""
    split_df["catalog_food_id"] = split_df["recipe_id"].map(recipe_to_catalog)
    matched = split_df.dropna(subset=["catalog_food_id"]).copy()
    matched["catalog_food_id"] = matched["catalog_food_id"].astype(int)

    total_rows = len(split_df)
    matched_rows = len(matched)

    if matched_rows == 0:
        return {
            "total_rows": total_rows,
            "matched_rows": 0,
            "mae": 0.0,
            "rmse": 0.0,
            "hit_rate_at_3": 0.0,
            "hit_rate_at_5": 0.0
        }

    # Rating prediction metrics (MAE, RMSE)
    y_true = matched["rating"].values
    y_pred = np.array([catalog_priors[int(fid)]["bayesian_rating"] for fid in matched["catalog_food_id"]])

    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    # Ranking hit-rate metrics
    hits_3 = 0
    hits_5 = 0
    eval_users_count = 0

    user_groups = matched[matched["rating"] >= 4.0].groupby("user_id")
    ranked_dishes = sorted(
        CATALOG_ITEMS,
        key=lambda d: catalog_priors[d["food_id"]]["popularity_score"] * catalog_priors[d["food_id"]]["bayesian_rating"],
        reverse=True
    )
    top_3 = set(d["food_id"] for d in ranked_dishes[:3])
    top_5 = set(d["food_id"] for d in ranked_dishes[:5])

    for _, group in user_groups:
        liked_dishes = set(group["catalog_food_id"].unique())
        if liked_dishes.intersection(top_3):
            hits_3 += 1
        if liked_dishes.intersection(top_5):
            hits_5 += 1
        eval_users_count += 1

    hit_rate_3 = round((hits_3 / eval_users_count) * 100, 2) if eval_users_count else 0.0
    hit_rate_5 = round((hits_5 / eval_users_count) * 100, 2) if eval_users_count else 0.0

    print(f"  [Evaluation on {split_name}] ({matched_rows}/{total_rows:,} aligned interactions):")
    print(f"    * Mean Absolute Error (MAE):     {mae:.4f} stars")
    print(f"    * Root Mean Squared Error (RMSE): {rmse:.4f} stars")
    print(f"    * Recommendation Hit Rate @ 3:    {hit_rate_3}%")
    print(f"    * Recommendation Hit Rate @ 5:    {hit_rate_5}%")

    return {
        "total_rows": total_rows,
        "matched_rows": matched_rows,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "hit_rate_at_3": hit_rate_3,
        "hit_rate_at_5": hit_rate_5
    }


def train():
    print("=" * 72)
    print("FOOD.COM HYBRID RECOMMENDATION MODEL TRAINING PIPELINE")
    print("=" * 72)
    start_total_time = time.time()

    # Step 1: Verify Dataset Files
    print("\n[Step 1/6] Verifying Dataset Files...")
    required_files = [
        (RAW_RECIPES_PATH, "RAW_recipes.csv"),
        (TRAIN_INTERACTIONS_PATH, "interactions_train.csv"),
        (VAL_INTERACTIONS_PATH, "interactions_validation.csv")
    ]
    if TEST_INTERACTIONS_PATH.exists():
        required_files.append((TEST_INTERACTIONS_PATH, "interactions_test.csv"))

    for p, name in required_files:
        if not p.exists():
            raise FileNotFoundError(f"Required dataset file not found: {p}")
        size_mb = p.stat().st_size / (1024 * 1024)
        print(f"  [OK] Found {name} ({size_mb:.2f} MB)")

    # Step 2: Load and Index Full Recipe Corpus
    print("\n[Step 2/6] Loading Full Recipe Corpus & Parsing Culinary Tags...")
    t0 = time.time()
    recipes_df = pd.read_csv(
        RAW_RECIPES_PATH,
        usecols=["id", "name", "tags"],
        dtype={"id": "int64", "name": "str", "tags": "str"}
    ).dropna(subset=["id", "name", "tags"])

    recipes_df["clean_name"] = recipes_df["name"].str.strip().str.title()
    recipes_df["parsed_tags"] = recipes_df["tags"].apply(parse_tags_clean)
    num_recipes = len(recipes_df)
    print(f"  [OK] Loaded {num_recipes:,} recipes in {time.time() - t0:.2f}s")

    # Build tag document frequencies for TF-IDF weighting
    tag_doc_freq = defaultdict(int)
    for tags in recipes_df["parsed_tags"]:
        for t in set(tags):
            tag_doc_freq[t] += 1

    total_docs = num_recipes
    tag_idf = {t: math.log((total_docs + 1.0) / (df + 1.0)) + 1.0 for t, df in tag_doc_freq.items()}

    # Step 3: Map Catalog Items to Food.com Recipes & Build Culinary Profiles
    print("\n[Step 3/6] Mapping 15 Catalog Menu Items to Food.com Flavor Profiles...")
    catalog_profiles = {}
    recipe_to_catalog = {}

    # Fast in-memory tuple iteration
    recipe_tuples = [
        (int(rid), str(name).title(), str(name).lower(), set(tags))
        for rid, name, tags in zip(recipes_df["id"], recipes_df["name"], recipes_df["parsed_tags"])
    ]

    for item in CATALOG_ITEMS:
        fid = item["food_id"]
        fname = item["food_name"]
        keywords = set(k.lower() for k in item["keywords"])
        cuis = item["cuisine"].lower()
        primaries = item["primary_names"]

        matched_recipes = []
        for r_id, clean_name, r_name_lower, r_tags in recipe_tuples:
            score = 0.0
            name_matched = False
            for p_name in primaries:
                if p_name in r_name_lower:
                    score += 25.0
                    name_matched = True
                    break

            matching_kw = keywords.intersection(r_tags)
            score += len(matching_kw) * 2.0

            if cuis in r_tags:
                score += 2.0

            # Guard against false positives: non-name matches require at least 2 relevant culinary keywords
            if not name_matched and len(matching_kw) < 2:
                continue

            if score >= 4.0:
                matched_recipes.append((r_id, clean_name, score, r_tags))

        matched_recipes.sort(key=lambda x: x[2], reverse=True)
        top_matches = matched_recipes[:20]

        # Record recipe_id -> food_id mapping for interaction matching
        for r_id, _, _, _ in matched_recipes[:50]:
            recipe_to_catalog[r_id] = fid

        # Aggregate TF-IDF tag profile
        dish_tag_weights = defaultdict(float)
        for _, _, s, r_tags in top_matches:
            for t in r_tags:
                dish_tag_weights[t] += tag_idf.get(t, 1.0) * s

        # Normalize tag vector
        vec_norm = math.sqrt(sum(w * w for w in dish_tag_weights.values())) or 1.0
        normalized_vec = {t: w / vec_norm for t, w in dish_tag_weights.items()}

        top_recipe_name = top_matches[0][1] if top_matches else "N/A"
        catalog_profiles[fid] = {
            "food_id": fid,
            "food_name": fname,
            "category": item["category"],
            "cuisine": item["cuisine"],
            "matched_recipes_count": len(matched_recipes),
            "top_food_com_recipes": [m[1] for m in top_matches[:5]],
            "tag_vector": normalized_vec
        }
        print(f"  * #{fid:02d} {fname:<14} ({item['cuisine']:<12}): {len(matched_recipes):>5} matches | Top: '{top_recipe_name}'")

    # Step 4: Compute 15x15 Item-to-Item Flavor Similarity Matrix
    print("\n[Step 4/6] Computing 15x15 Item-to-Item Flavor Similarity Matrix...")
    item_sim_matrix = {}
    for i in range(1, 16):
        vec_i = catalog_profiles[i]["tag_vector"]
        for j in range(1, 16):
            if i == j:
                sim = 1.0
            else:
                vec_j = catalog_profiles[j]["tag_vector"]
                common_tags = set(vec_i.keys()).intersection(vec_j.keys())
                dot_product = sum(vec_i[t] * vec_j[t] for t in common_tags)
                sim = round(max(0.0, min(1.0, dot_product)), 4)
            item_sim_matrix[(i, j)] = sim

    print("  [OK] Sample Learned Similarities:")
    print(f"    Fried Rice <-> Noodles: {item_sim_matrix[(12, 13)]:.3f}")
    print(f"    Pizza <-> Garlic Bread: {item_sim_matrix[(8, 11)]:.3f}")
    print(f"    Burger <-> Fries:       {item_sim_matrix[(9, 10)]:.3f}")
    print(f"    Dosa <-> Idli:          {item_sim_matrix[(5, 6)]:.3f}")
    print(f"    Biryani <-> Ice Cream:  {item_sim_matrix[(1, 14)]:.3f}")

    # Step 5: Fit Bayesian Rating Priors and Co-occurrence Exclusively on Train Interactions
    print("\n[Step 5/6] Learning Bayesian Rating Priors & Co-occurrence from Train Interactions...")
    t1 = time.time()
    train_df = pd.read_csv(
        TRAIN_INTERACTIONS_PATH,
        usecols=["user_id", "recipe_id", "rating"],
        dtype={"user_id": "int64", "recipe_id": "int64", "rating": "float32"}
    )
    total_train_rows = len(train_df)
    global_mean_rating = float(train_df["rating"].mean())
    print(f"  [OK] Loaded {total_train_rows:,} train interactions (Global Mean Rating: {global_mean_rating:.2f} stars) in {time.time() - t1:.2f}s")

    # Map train interactions to catalog dishes
    train_df["catalog_food_id"] = train_df["recipe_id"].map(recipe_to_catalog)
    catalog_interactions = train_df.dropna(subset=["catalog_food_id"]).copy()
    catalog_interactions["catalog_food_id"] = catalog_interactions["catalog_food_id"].astype(int)

    # Compute Bayesian smoothed ratings per dish
    m_prior = 15.0
    catalog_stats = catalog_interactions.groupby("catalog_food_id")["rating"].agg(["count", "mean"]).to_dict("index")

    catalog_priors = {}
    for item in CATALOG_ITEMS:
        fid = item["food_id"]
        stats = catalog_stats.get(fid, {"count": 0, "mean": global_mean_rating})
        v = float(stats["count"])
        R = float(stats["mean"])
        bayesian_rating = (v / (v + m_prior)) * R + (m_prior / (v + m_prior)) * global_mean_rating
        pop_score = round(min(5.0, 3.5 + math.log10(max(1.0, v + 1.0)) * 0.4), 2)

        catalog_priors[fid] = {
            "food_id": fid,
            "food_name": item["food_name"],
            "cuisine": item["cuisine"],
            "category": item["category"],
            "interaction_count": int(v),
            "empirical_mean_rating": round(R, 2),
            "bayesian_rating": round(bayesian_rating, 2),
            "popularity_score": pop_score,
            "top_recipes": catalog_profiles[fid]["top_food_com_recipes"]
        }
        print(f"  * #{fid:02d} {item['food_name']:<14}: {int(v):>5} interactions | Mean: {R:.2f} stars | Bayesian: {bayesian_rating:.2f} stars | Pop: {pop_score}")

    # Cross-dish user co-occurrence matrix from positive interactions
    print("  [OK] Computing cross-dish user co-occurrence matrix...")
    user_dish_baskets = defaultdict(set)
    for row in catalog_interactions[catalog_interactions["rating"] >= 3.0].itertuples():
        user_dish_baskets[row.user_id].add(row.catalog_food_id)

    total_baskets = len(user_dish_baskets)
    dish_counts = defaultdict(int)
    pair_counts = defaultdict(int)

    for basket in user_dish_baskets.values():
        for d in basket:
            dish_counts[d] += 1
        if len(basket) >= 2:
            for a, b in combinations(sorted(basket), 2):
                pair_counts[(a, b)] += 1
                pair_counts[(b, a)] += 1

    cooccurrence_lift = {}
    for i in range(1, 16):
        for j in range(1, 16):
            if i == j:
                cooccurrence_lift[(i, j)] = 1.0
            else:
                p_i = dish_counts[i] / total_baskets if total_baskets else 0
                p_j = dish_counts[j] / total_baskets if total_baskets else 0
                p_ij = pair_counts.get((i, j), 0) / total_baskets if total_baskets else 0
                lift = (p_ij / (p_i * p_j)) if (p_i * p_j > 0) else 1.0
                cooccurrence_lift[(i, j)] = round(lift, 3)

    # Step 6: Held-out Offline Evaluation (Validation & Test Splits)
    print("\n[Step 6/6] Evaluating Model on Held-out Validation & Test Splits...")
    val_df = pd.read_csv(
        VAL_INTERACTIONS_PATH,
        usecols=["user_id", "recipe_id", "rating"],
        dtype={"user_id": "int64", "recipe_id": "int64", "rating": "float32"}
    )
    val_metrics = evaluate_split(val_df, recipe_to_catalog, catalog_priors, "Validation Split (interactions_validation.csv)")

    test_metrics = None
    if TEST_INTERACTIONS_PATH.exists():
        test_df = pd.read_csv(
            TEST_INTERACTIONS_PATH,
            usecols=["user_id", "recipe_id", "rating"],
            dtype={"user_id": "int64", "recipe_id": "int64", "rating": "float32"}
        )
        test_metrics = evaluate_split(test_df, recipe_to_catalog, catalog_priors, "Test Split (interactions_test.csv)")

    # Construct complete model artifact
    model_artifact = {
        "model_name": "FoodCom-Hybrid-Recommender",
        "version": "1.0.0",
        "trained_at": datetime.now().isoformat(),
        "training_time_sec": round(time.time() - start_total_time, 2),
        "dataset_files": {
            "recipes_corpus": "RAW_recipes.csv",
            "train_split": "interactions_train.csv",
            "validation_split": "interactions_validation.csv",
            "test_split": "interactions_test.csv" if TEST_INTERACTIONS_PATH.exists() else None
        },
        "stats": {
            "recipes_indexed": num_recipes,
            "train_interactions_processed": total_train_rows,
            "validation_interactions_evaluated": val_metrics["total_rows"],
            "test_interactions_evaluated": test_metrics["total_rows"] if test_metrics else 0,
            "global_mean_rating": round(global_mean_rating, 2)
        },
        "metrics": {
            "validation": val_metrics,
            "test": test_metrics
        },
        "catalog_priors": catalog_priors,
        "item_similarity_matrix": item_sim_matrix,
        "cooccurrence_lift_matrix": cooccurrence_lift
    }

    # Save artifacts to both designated locations
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Primary engine pickle artifact
    with open(MODEL_PKL_PATH, "wb") as f:
        pickle.dump(model_artifact, f)
    pkl_kb = MODEL_PKL_PATH.stat().st_size / 1024

    # 2. Joblib artifact (backend/food_model.joblib)
    if HAS_JOBLIB:
        joblib.dump(model_artifact, MODEL_JOBLIB_PATH)
    else:
        with open(MODEL_JOBLIB_PATH, "wb") as f:
            pickle.dump(model_artifact, f)
    joblib_kb = MODEL_JOBLIB_PATH.stat().st_size / 1024

    print("\n" + "=" * 72)
    print("SUCCESS: Recommendation Model Trained & Saved!")
    print(f"  * Primary Joblib Artifact: {MODEL_JOBLIB_PATH} ({joblib_kb:.2f} KB)")
    print(f"  * Pickled Model Artifact:  {MODEL_PKL_PATH} ({pkl_kb:.2f} KB)")
    print(f"  * Total Execution Time:    {time.time() - start_total_time:.2f}s")
    print("=" * 72)

    return model_artifact


if __name__ == "__main__":
    train()

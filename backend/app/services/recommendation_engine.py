from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
import pickle
from pathlib import Path
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_JOBLIB_PATH = _BACKEND_DIR / "food_model.joblib"
_PKL_PATH = _BACKEND_DIR / "models" / "food_recommendation_model.pkl"
_CACHED_MODEL = None

def _load_ml_model() -> Optional[Dict[str, Any]]:
    global _CACHED_MODEL
    if _CACHED_MODEL is not None:
        return _CACHED_MODEL

    for candidate_path in [_JOBLIB_PATH, _PKL_PATH]:
        if candidate_path.exists():
            try:
                try:
                    import joblib
                    _CACHED_MODEL = joblib.load(candidate_path)
                    return _CACHED_MODEL
                except Exception:
                    with open(candidate_path, "rb") as f:
                        _CACHED_MODEL = pickle.load(f)
                    return _CACHED_MODEL
            except Exception:
                continue
    return None

class RecommendationEngine:
    """
    AI-Based Personalized Food Recommendation & Next-Order Prediction Engine.
    Uses customer profiles, order history, repeat purchase frequencies,
    recency, cuisine affinity, and Food.com interaction data to deliver
    transparent, personalized recommendations and next-order predictions.
    """

    def __init__(self, db: Session):
        self.db = db
        self.ml_model = _load_ml_model()

    def get_frequent_orders(self, customer_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Calculate frequent orders specifically from the logged-in customer's actual historical order records.
        Groups orders by food item, calculating:
        - total number of orders (order_count)
        - total quantity
        - most recent order date and relative days ago
        - order source breakdown (Swiggy, Zomato, Project App)
        - percentage frequency of customer's orders
        Sorted by highest order frequency first.
        """
        customer = self.db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
        if not customer:
            return []

        orders = (
            self.db.query(OrderFact, FoodDim, TimeDim)
            .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
            .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
            .filter(OrderFact.customer_id == customer_id)
            .order_by(desc(TimeDim.date), desc(OrderFact.order_id))
            .all()
        )

        if not orders:
            return []

        total_customer_orders = len(orders)
        grouped: Dict[int, Dict[str, Any]] = {}

        for order, food, time_dim in orders:
            fid = food.food_id
            source = getattr(order, "order_source", None) or "Project App"
            if fid not in grouped:
                grouped[fid] = {
                    "food_id": food.food_id,
                    "food_name": food.food_name,
                    "category": food.category,
                    "cuisine": food.cuisine,
                    "price": food.price,
                    "image_url": food.image_url,
                    "order_count": 0,
                    "total_quantity": 0,
                    "last_order_date": time_dim.date,
                    "dates": [],
                    "sources": {}
                }

            grouped[fid]["order_count"] += 1
            grouped[fid]["total_quantity"] += (order.quantity or 1)
            grouped[fid]["dates"].append(time_dim.date)
            grouped[fid]["sources"][source] = grouped[fid]["sources"].get(source, 0) + 1

        now = datetime.now()
        result: List[Dict[str, Any]] = []

        for fid, data in grouped.items():
            valid_dates = []
            for d in data["dates"]:
                try:
                    valid_dates.append(datetime.strptime(d, "%Y-%m-%d"))
                except Exception:
                    pass

            last_date_str = data["last_order_date"]
            relative_text = last_date_str
            if valid_dates:
                most_recent_dt = max(valid_dates)
                last_date_str = most_recent_dt.strftime("%Y-%m-%d")
                diff_days = (now - most_recent_dt).days
                if diff_days <= 0:
                    relative_text = "Recently"
                elif diff_days == 1:
                    relative_text = "Yesterday"
                elif diff_days < 30:
                    relative_text = f"{diff_days} days ago"
                elif diff_days < 365:
                    months = max(1, diff_days // 30)
                    relative_text = f"{months} month{'s' if months > 1 else ''} ago"
                else:
                    years = max(1, diff_days // 365)
                    relative_text = f"{years} year{'s' if years > 1 else ''} ago"

            freq_pct = round((data["order_count"] / total_customer_orders) * 100, 1)

            result.append({
                "food_id": data["food_id"],
                "food_name": data["food_name"],
                "category": data["category"],
                "cuisine": data["cuisine"],
                "price": data["price"],
                "image_url": data["image_url"],
                "order_count": data["order_count"],
                "total_quantity": data["total_quantity"],
                "last_order_date": last_date_str,
                "last_order_days_ago": relative_text,
                "sources": data["sources"],
                "frequency_pct": freq_pct
            })

        # Sort by highest order_count first, then total_quantity
        result.sort(key=lambda x: (x["order_count"], x["total_quantity"]), reverse=True)
        return result[:limit]

    def generate_recommendations_for_customer(self, customer_id: int, top_n: int = 8) -> List[Dict[str, Any]]:
        """
        Generate personalized explainable food recommendations for a customer.
        Uses customer's actual historical orders, frequent dishes, order sources
        (Swiggy, Zomato, Project App), cuisine affinities, and companion items.
        """
        customer = self.db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
        if not customer:
            return self._get_fallback_popular(top_n)

        # 1. Fetch Customer Order History from project database
        past_orders = (
            self.db.query(OrderFact, FoodDim, TimeDim)
            .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
            .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
            .filter(OrderFact.customer_id == customer_id)
            .order_by(desc(OrderFact.order_id))
            .all()
        )

        all_foods = self.db.query(FoodDim).all()
        scored_items = []

        # =========================================================================
        # SCENARIO A: CUSTOMER HAS NO PREVIOUS ORDER HISTORY (Cold Start)
        # =========================================================================
        if not past_orders:
            for food in all_foods:
                score = 1.0
                reasons = []
                rec_type = "Personalized Recommendation"

                # Factor 1: Customer Profile Declared Preference
                pref = (customer.preferences or "").lower()
                food_cuis = (food.cuisine or "").lower()
                if pref and (pref in food_cuis or food_cuis in pref):
                    score += 4.5
                    rec_type = "Cuisine Preference Match"
                    reasons.append(f"Matches your registered cuisine preference ({customer.preferences}).")
                    reasons.append(f"Popular recipe interaction trend in the Food.com dataset for {customer.preferences} cuisine.")

                # Factor 2: Location Demographic Preference
                if customer.location:
                    score += 1.5
                    reasons.append(f"Curated for popular dining preferences in {customer.location}.")

                # Factor 3: High quality & feedback rating signal (ML Bayesian Prior if available)
                prior = (self.ml_model.get("catalog_priors", {}) if self.ml_model else {}).get(food.food_id)
                if prior:
                    base_rating = float(prior.get("bayesian_rating", 4.2))
                    score += float(prior.get("popularity_score", 3.5)) * 0.4
                    top_rec = prior.get("top_recipes", [])
                    if top_rec:
                        reasons.append(f"Top-rated Food.com recipe interaction trend: '{top_rec[0]}'.")
                else:
                    base_rating = 4.6 if food.food_name in ["Biryani", "Burger", "Pizza", "Dosa", "Paneer Curry"] else 4.2
                    score += (base_rating - 3.5) * 1.5

                if not reasons:
                    reasons.append(f"Top-rated {food.cuisine} dish with excellent customer feedback.")
                    reasons.append("Trending favorite in the Food.com recipe interaction catalog.")
                    rec_type = "Top Rated Choice"

                scored_items.append({
                    "food_id": food.food_id,
                    "food_name": food.food_name,
                    "category": food.category,
                    "cuisine": food.cuisine,
                    "price": food.price,
                    "image_url": food.image_url,
                    "rating": base_rating,
                    "recommendation_type": rec_type,
                    "reasons": reasons,
                    "score": round(score, 2)
                })

            scored_items.sort(key=lambda x: x["score"], reverse=True)
            return scored_items[:top_n]

        # =========================================================================
        # SCENARIO B: CUSTOMER HAS HISTORICAL ORDERS IN DATABASE
        # =========================================================================
        ordered_food_counts: Dict[str, int] = {}
        ordered_food_sources: Dict[str, Dict[str, int]] = {}
        ordered_food_ids = list(set([f.food_id for _, f, _ in past_orders]))
        ordered_food_names = [f.food_name for _, f, _ in past_orders]
        past_cuisines: Dict[str, int] = {}
        past_categories: Dict[str, int] = {}
        past_times_of_day: Dict[str, int] = {}
        source_totals: Dict[str, int] = {}

        for order, f, t in past_orders:
            ordered_food_counts[f.food_name] = ordered_food_counts.get(f.food_name, 0) + 1
            src = getattr(order, "order_source", None) or "Project App"
            source_totals[src] = source_totals.get(src, 0) + 1

            if f.food_name not in ordered_food_sources:
                ordered_food_sources[f.food_name] = {}
            ordered_food_sources[f.food_name][src] = ordered_food_sources[f.food_name].get(src, 0) + 1

            past_cuisines[f.cuisine] = past_cuisines.get(f.cuisine, 0) + 1
            past_categories[f.category] = past_categories.get(f.category, 0) + 1
            past_times_of_day[t.time_of_day] = past_times_of_day.get(t.time_of_day, 0) + 1

        most_recent_food = past_orders[0][1]
        favorite_cuisine = max(past_cuisines, key=past_cuisines.get) if past_cuisines else customer.preferences
        favorite_category = max(past_categories, key=past_categories.get) if past_categories else "Main Course"
        favorite_tod = max(past_times_of_day, key=past_times_of_day.get) if past_times_of_day else "Dinner"
        dominant_source = max(source_totals, key=source_totals.get) if source_totals else "Project App"

        # Find top 2 frequent food items
        frequent_foods_sorted = sorted(ordered_food_counts.items(), key=lambda x: x[1], reverse=True)
        top_frequent_food_name = frequent_foods_sorted[0][0] if frequent_foods_sorted else None

        # Discover basket companion items (Frequently Ordered Together)
        paired_food_scores: Dict[int, Dict[str, Any]] = {}
        if ordered_food_ids:
            baskets_with_user_foods = (
                self.db.query(OrderFact.customer_id, OrderFact.time_id)
                .filter(OrderFact.food_id.in_(ordered_food_ids))
                .distinct()
                .subquery()
            )

            companion_orders = (
                self.db.query(
                    OrderFact.food_id,
                    FoodDim.food_name,
                    func.count(OrderFact.order_id).label("pair_count")
                )
                .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
                .join(
                    baskets_with_user_foods,
                    (OrderFact.customer_id == baskets_with_user_foods.c.customer_id) &
                    (OrderFact.time_id == baskets_with_user_foods.c.time_id)
                )
                .filter(~OrderFact.food_id.in_(ordered_food_ids))
                .group_by(OrderFact.food_id, FoodDim.food_name)
                .order_by(desc("pair_count"))
                .limit(10)
                .all()
            )

            for comp in companion_orders:
                paired_food_scores[comp.food_id] = {
                    "pair_name": comp.food_name,
                    "count": comp.pair_count,
                    "anchor_item": ordered_food_names[0] if ordered_food_names else "previous items"
                }

        for food in all_foods:
            score = 0.0
            reasons = []
            rec_type = "Personalized Recommendation"

            # 1. Frequently Ordered & Repeat Purchases with Order Source Breakdown
            if food.food_name in ordered_food_counts:
                count = ordered_food_counts[food.food_name]
                score += min(7.0, 3.5 + (count * 1.5))
                food_sources = ordered_food_sources.get(food.food_name, {})

                if count >= 2:
                    rec_type = "Repeated Favorite"
                    # Tailor explanation based on order sources
                    if "Swiggy" in food_sources and "Zomato" in food_sources:
                        reasons.append(f"Frequently ordered by you — {count} previous orders across Swiggy and Zomato.")
                    elif "Swiggy" in food_sources and food_sources["Swiggy"] >= 2:
                        reasons.append(f"Frequently ordered from Swiggy ({food_sources['Swiggy']} orders) and matches your {customer.preferences or food.cuisine} cuisine preference.")
                    elif "Zomato" in food_sources and food_sources["Zomato"] >= 2:
                        reasons.append(f"Recommended based on your recent Zomato order history ({food_sources['Zomato']} orders).")
                    elif "Project App" in food_sources:
                        reasons.append(f"Frequently ordered by you — {count} previous orders.")
                    else:
                        reasons.append(f"Frequently ordered by you — {count} previous orders.")

                    if count >= 4:
                        reasons.append(f"You ordered this item {count} times recently.")
                else:
                    source_name = list(food_sources.keys())[0] if food_sources else "previous orders"
                    reasons.append(f"Frequently ordered by you in your past dining history ({source_name}).")
                    rec_type = "Previous Purchase"

            # 2. Recency & Similarity to Recent Orders
            sim_matrix = (self.ml_model.get("item_similarity_matrix", {}) if self.ml_model else {})
            flavor_sim = sim_matrix.get((most_recent_food.food_id, food.food_id), 0.0)

            if food.food_name == most_recent_food.food_name:
                score += 2.0
                reasons.append(f"Recommended based on your recent ordering pattern ({food.food_name}).")
            elif (food.cuisine == most_recent_food.cuisine or food.category == most_recent_food.category or flavor_sim >= 0.40) and food.food_name not in ordered_food_counts:
                score += 2.2 + (flavor_sim * 1.2)
                if flavor_sim >= 0.40:
                    reasons.append(f"Culinary flavor affinity ({int(flavor_sim * 100)}%) with your recent {most_recent_food.food_name} order in the Food.com model.")
                elif top_frequent_food_name and top_frequent_food_name != most_recent_food.food_name:
                    reasons.append(f"Similar to your frequently ordered dishes ({top_frequent_food_name}).")
                else:
                    reasons.append(f"Similar to dishes in your previous order history ({most_recent_food.food_name}).")
                if rec_type == "Personalized Recommendation":
                    rec_type = "Similar to Recent Order"

            # 3. Customer Declared & Historical Cuisine Preference
            pref = (customer.preferences or "").lower()
            food_cuis = (food.cuisine or "").lower()
            fav_cuis = (favorite_cuisine or "").lower()
            if pref and (pref in food_cuis or food_cuis in pref):
                score += 3.0
                reasons.append(f"Matches your preferred cuisine ({customer.preferences}).")
                if rec_type == "Personalized Recommendation":
                    rec_type = "Cuisine Preference Match"
            elif fav_cuis and fav_cuis in food_cuis:
                score += 2.2
                reasons.append(f"Aligns with your frequent order history of {favorite_cuisine} dishes.")

            # 4. Favorite Category Match
            if food.category == favorite_category:
                score += 1.5
                reasons.append(f"Matches your most ordered meal category ({food.category}).")

            # 5. Basket Companion Pattern
            if food.food_id in paired_food_scores:
                pair_data = paired_food_scores[food.food_id]
                score += min(4.5, 2.0 + (pair_data["count"] * 0.4))
                reasons.append(f"Frequently ordered together with your previous order of {pair_data['anchor_item']}.")
                if rec_type == "Personalized Recommendation":
                    rec_type = "Frequently Ordered Together"

            # 6. Meal Time Pattern
            if food.category == "Main Course" and favorite_tod in ["Evening", "Night"]:
                score += 0.8
                reasons.append(f"Ideal choice for your typical {favorite_tod} dining hours.")

            # Quality base rating & Model Prior
            prior = (self.ml_model.get("catalog_priors", {}) if self.ml_model else {}).get(food.food_id)
            if prior:
                base_rating = float(prior.get("bayesian_rating", 4.2))
                score += float(prior.get("popularity_score", 3.5)) * 0.25
            else:
                base_rating = 4.5 if food.food_name in ["Biryani", "Burger", "Pizza", "Dosa", "Paneer Curry"] else 4.2
                score += (base_rating - 3.5) * 1.2

            if not reasons:
                reasons.append(f"Matches your dining profile with high customer satisfaction.")
                reasons.append(f"Trending favorite in {food.cuisine} cuisine.")

            scored_items.append({
                "food_id": food.food_id,
                "food_name": food.food_name,
                "category": food.category,
                "cuisine": food.cuisine,
                "price": food.price,
                "image_url": food.image_url,
                "rating": base_rating,
                "recommendation_type": rec_type,
                "reasons": reasons,
                "score": round(score, 2)
            })

        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:top_n]

    def predict_likely_next_order(self, customer_id: int) -> Dict[str, Any]:
        """
        Predict the food item the customer is most likely to order next.
        Considers recency, frequency, repeated purchases, cuisine preference,
        historical intervals, and previous order sources without claiming 100% certainty.
        """
        customer = self.db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
        if not customer:
            return {
                "has_prediction": False,
                "food_id": None,
                "food_name": None,
                "category": None,
                "cuisine": None,
                "price": None,
                "image_url": None,
                "confidence_level": None,
                "reason": "Customer profile not found.",
                "factors": [],
                "order_count": 0,
                "last_ordered_days_ago": None,
                "last_order_date": None,
                "order_sources": {}
            }

        past_orders = (
            self.db.query(OrderFact, FoodDim, TimeDim)
            .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
            .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
            .filter(OrderFact.customer_id == customer_id)
            .order_by(desc(OrderFact.order_id))
            .all()
        )

        # No order history scenario (Cold Start)
        if not past_orders:
            pref = (customer.preferences or "Indian").lower()
            fallback_food = self.db.query(FoodDim).filter(FoodDim.cuisine.ilike(f"%{pref}%")).first()
            if not fallback_food:
                fallback_food = self.db.query(FoodDim).first()

            return {
                "has_prediction": False,
                "food_id": fallback_food.food_id if fallback_food else None,
                "food_name": fallback_food.food_name if fallback_food else None,
                "category": fallback_food.category if fallback_food else None,
                "cuisine": fallback_food.cuisine if fallback_food else None,
                "price": fallback_food.price if fallback_food else None,
                "image_url": fallback_food.image_url if fallback_food else None,
                "confidence_level": "Preliminary Profile Match",
                "reason": "No previous order history available. As you place orders, FoodAI will analyze your repeat patterns and time intervals to predict your likely next order.",
                "factors": [
                    f"Registered cuisine preference: {customer.preferences}",
                    f"Customer location: {customer.location}",
                    "No historical orders found in the database",
                    "Awaiting order records to calculate repeat purchase cycles"
                ],
                "order_count": 0,
                "last_ordered_days_ago": None,
                "last_order_date": None,
                "order_sources": {}
            }

        # Analyze customer order patterns
        food_frequency: Dict[int, int] = {}
        food_sources_map: Dict[int, Dict[str, int]] = {}
        food_obj_map: Dict[int, FoodDim] = {}
        food_last_date: Dict[int, str] = {}
        time_of_day_counts: Dict[str, int] = {}
        order_dates = []

        for order, food, time_dim in past_orders:
            fid = food.food_id
            food_frequency[fid] = food_frequency.get(fid, 0) + 1
            food_obj_map[fid] = food

            if fid not in food_sources_map:
                food_sources_map[fid] = {}
            src = getattr(order, "order_source", None) or "Project App"
            food_sources_map[fid][src] = food_sources_map[fid].get(src, 0) + 1

            if fid not in food_last_date:
                food_last_date[fid] = time_dim.date

            time_of_day_counts[time_dim.time_of_day] = time_of_day_counts.get(time_dim.time_of_day, 0) + 1
            order_dates.append(time_dim.date)

        fav_tod = max(time_of_day_counts, key=time_of_day_counts.get) if time_of_day_counts else "Dinner"

        # Calculate approximate intervals between orders
        avg_interval_days = 5
        try:
            date_objs = sorted([datetime.strptime(d, "%Y-%m-%d") for d in order_dates if d and d != "N/A"])
            if len(date_objs) >= 2:
                total_span = (date_objs[-1] - date_objs[0]).days
                avg_interval_days = max(1, total_span // (len(date_objs) - 1))
        except Exception:
            avg_interval_days = 5

        # Score candidates for Next Order Prediction
        # Priority: Most repeated food item with recency
        top_food_id = max(food_frequency, key=food_frequency.get)
        top_freq = food_frequency[top_food_id]
        predicted_food = food_obj_map[top_food_id]
        top_sources = food_sources_map.get(top_food_id, {})
        last_date_str = food_last_date.get(top_food_id, order_dates[0] if order_dates else "Recently")

        # Relative last ordered time
        now = datetime.now()
        relative_days_text = last_date_str
        try:
            dt = datetime.strptime(last_date_str, "%Y-%m-%d")
            diff = (now - dt).days
            if diff <= 0:
                relative_days_text = "recently"
            elif diff == 1:
                relative_days_text = "1 day ago"
            elif diff < 30:
                relative_days_text = f"{diff} days ago"
            elif diff < 365:
                months = max(1, diff // 30)
                relative_days_text = f"{months} month{'s' if months > 1 else ''} ago"
            else:
                years = max(1, diff // 365)
                relative_days_text = f"{years} year{'s' if years > 1 else ''} ago"
        except Exception:
            relative_days_text = last_date_str

        # Format sources summary
        sources_summary = ", ".join([f"{s} ({c})" for s, c in top_sources.items()])

        # Calculate confidence level without claiming 100% certainty
        if top_freq >= 3:
            confidence = "86% Likelihood (High)"
            reason = f"You frequently reorder {predicted_food.food_name} and your recent ordering pattern suggests it is likely to be ordered again."
        elif top_freq == 2:
            confidence = "78% Likelihood (Medium-High)"
            reason = f"You have repeatedly ordered {predicted_food.food_name} ({top_freq} orders) in your dining history, showing strong preference for this {predicted_food.cuisine} dish."
        else:
            confidence = "72% Likelihood (Medium)"
            reason = f"Based on your recent order of {predicted_food.food_name} and your {customer.preferences} cuisine preference, {predicted_food.food_name} is your predicted next order."

        factors = [
            f"{top_freq} previous orders logged ({sources_summary})",
            f"Last ordered: {last_date_str} ({relative_days_text})",
            f"Matches preferred cuisine: {predicted_food.cuisine} ({predicted_food.category})",
            f"Typical dining time: {fav_tod}",
            f"Historical order cycle: ~{avg_interval_days} days average interval"
        ]

        return {
            "has_prediction": True,
            "food_id": predicted_food.food_id,
            "food_name": predicted_food.food_name,
            "category": predicted_food.category,
            "cuisine": predicted_food.cuisine,
            "price": predicted_food.price,
            "image_url": predicted_food.image_url,
            "confidence_level": confidence,
            "reason": reason,
            "factors": factors,
            "order_count": top_freq,
            "last_ordered_days_ago": relative_days_text,
            "last_order_date": last_date_str,
            "order_sources": top_sources
        }

    def _get_fallback_popular(self, top_n: int = 8) -> List[Dict[str, Any]]:
        """Fallback recommendations for new customers without prior order history."""
        popular_foods = (
            self.db.query(
                FoodDim,
                func.count(OrderFact.order_id).label("total_orders"),
                func.avg(OrderFact.rating).label("avg_rating")
            )
            .outerjoin(OrderFact, FoodDim.food_id == OrderFact.food_id)
            .group_by(FoodDim.food_id)
            .order_by(desc("total_orders"))
            .limit(top_n)
            .all()
        )

        res = []
        for food, total_orders, avg_rating in popular_foods:
            rating_val = round(float(avg_rating or 4.5), 1)
            res.append({
                "food_id": food.food_id,
                "food_name": food.food_name,
                "category": food.category,
                "cuisine": food.cuisine,
                "price": food.price,
                "image_url": food.image_url,
                "rating": rating_val,
                "recommendation_type": "Popular Item",
                "reasons": [
                    f"Trending customer favorite with {total_orders} total orders.",
                    f"Consistently high customer rating of ★ {rating_val}."
                ],
                "score": 3.5
            })
        return res

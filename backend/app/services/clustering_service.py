import math
import random
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim

class CustomerClusteringService:
    """
    Genuine Customer Segmentation Engine using K-Means Clustering.
    Analyzes historical customer order frequency, average basket value, recency,
    cuisine preferences, and category distributions to produce interpretable customer segments.
    """

    def __init__(self, db: Session):
        self.db = db

    def extract_customer_features(self) -> Tuple[List[Dict[str, Any]], List[List[float]], List[str]]:
        """
        Extract numerical features from actual customer profiles and completed orders.
        Features extracted:
          0: order_frequency (total completed orders)
          1: avg_order_value (average spend per order)
          2: recency_days (days since most recent order)
          3: pct_indian (proportion of orders that are Indian cuisine)
          4: pct_south_indian (proportion of orders that are South Indian)
          5: pct_fast_food (proportion of orders that are Fast Food)
          6: pct_chinese (proportion of orders that are Chinese)
          7: pct_main_course (proportion in Main Course category)
          8: pct_starter (proportion in Starter category)
        """
        customers = self.db.query(CustomerDim).all()
        orders = (
            self.db.query(
                OrderFact.customer_id,
                OrderFact.price,
                OrderFact.quantity,
                TimeDim.date,
                FoodDim.cuisine,
                FoodDim.category
            )
            .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
            .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
            .filter(OrderFact.order_status == "Completed")
            .all()
        )

        cust_orders = defaultdict(list)
        for cid, price, qty, dt_str, cuis, cat in orders:
            item_spend = float(price or 0.0) * int(qty or 1)
            cust_orders[cid].append({
                "spend": item_spend,
                "date": dt_str,
                "cuisine": cuis or "Indian",
                "category": cat or "Main Course"
            })

        now = datetime.now()
        customer_metadata: List[Dict[str, Any]] = []
        feature_matrix: List[List[float]] = []
        feature_names = [
            "Order Frequency",
            "Avg Order Value",
            "Recency (Days)",
            "% Indian Cuisine",
            "% South Indian",
            "% Fast Food",
            "% Chinese",
            "% Main Course",
            "% Starters"
        ]

        for cust in customers:
            cid = cust.customer_id
            c_orders = cust_orders[cid]
            order_count = len(c_orders)

            if order_count > 0:
                total_spend = sum(o["spend"] for o in c_orders)
                avg_val = total_spend / order_count

                valid_dates = []
                for o in c_orders:
                    try:
                        valid_dates.append(datetime.strptime(o["date"], "%Y-%m-%d"))
                    except Exception:
                        pass
                
                if valid_dates:
                    recency = max(1, (now - max(valid_dates)).days)
                else:
                    recency = 60

                cuis_counts = defaultdict(int)
                cat_counts = defaultdict(int)
                for o in c_orders:
                    cuis_counts[o["cuisine"]] += 1
                    cat_counts[o["category"]] += 1

                pct_indian = cuis_counts["Indian"] / order_count
                pct_south_indian = cuis_counts["South Indian"] / order_count
                pct_fast_food = cuis_counts["Fast Food"] / order_count
                pct_chinese = cuis_counts["Chinese"] / order_count
                pct_main = cat_counts["Main Course"] / order_count
                pct_starter = cat_counts["Starter"] / order_count
            else:
                # Handle new customer with zero past orders
                total_spend = 0.0
                avg_val = 0.0
                recency = 180 # baseline non-recent
                pref = (cust.preferences or "Indian").strip()
                pct_indian = 1.0 if pref == "Indian" else 0.0
                pct_south_indian = 1.0 if pref == "South Indian" else 0.0
                pct_fast_food = 1.0 if pref == "Fast Food" else 0.0
                pct_chinese = 1.0 if pref == "Chinese" else 0.0
                pct_main = 0.70
                pct_starter = 0.30

            vec = [
                float(order_count),
                float(avg_val),
                float(recency),
                float(pct_indian),
                float(pct_south_indian),
                float(pct_fast_food),
                float(pct_chinese),
                float(pct_main),
                float(pct_starter)
            ]

            feature_matrix.append(vec)
            customer_metadata.append({
                "customer_id": cust.customer_id,
                "name": cust.name,
                "email": cust.email,
                "phone": cust.phone,
                "location": cust.location,
                "stated_preference": cust.preferences,
                "dietary_preference": cust.dietary_preferences or "Standard",
                "order_count": order_count,
                "total_spend": round(total_spend, 2),
                "avg_order_value": round(avg_val, 2),
                "status": cust.status
            })

        return customer_metadata, feature_matrix, feature_names

    @staticmethod
    def _standard_scale(matrix: List[List[float]]) -> Tuple[List[List[float]], List[float], List[float]]:
        """Standardize feature matrix to zero mean and unit variance."""
        n = len(matrix)
        d = len(matrix[0])
        means = [sum(matrix[i][j] for i in range(n)) / n for j in range(d)]
        stds = []
        for j in range(d):
            variance = sum((matrix[i][j] - means[j]) ** 2 for i in range(n)) / n
            stds.append(math.sqrt(variance) if variance > 1e-9 else 1.0)

        scaled = []
        for i in range(n):
            scaled.append([(matrix[i][j] - means[j]) / stds[j] for j in range(d)])
        return scaled, means, stds

    @staticmethod
    def _dist_sq(u: List[float], v: List[float]) -> float:
        return sum((a - b) ** 2 for a, b in zip(u, v))

    def run_clustering(self, k: int = 3, seed: int = 42) -> Dict[str, Any]:
        """
        Execute full K-Means segmentation on customer feature space.
        Returns cluster profiles, customer assignments, and analytical insights.
        """
        customers_meta, raw_matrix, feature_names = self.extract_customer_features()
        n = len(raw_matrix)

        if n < 4:
            return {
                "success": False,
                "message": "Insufficient customer data (minimum 4 customer profiles required for clustering).",
                "clusters": [],
                "customers": []
            }

        k = min(k, max(2, n // 3))
        scaled_matrix, means, stds = self._standard_scale(raw_matrix)
        d = len(scaled_matrix[0])

        random.seed(seed)

        # 1. K-Means++ Initialization
        centroids = [scaled_matrix[random.randint(0, n - 1)]]
        for _ in range(1, k):
            distances = []
            for pt in scaled_matrix:
                min_d2 = min(self._dist_sq(pt, c) for c in centroids)
                distances.append(min_d2)
            total_d2 = sum(distances)
            if total_d2 == 0:
                centroids.append(scaled_matrix[random.randint(0, n - 1)])
                continue
            r = random.uniform(0, total_d2)
            cum = 0.0
            chosen = scaled_matrix[0]
            for pt, d2 in zip(scaled_matrix, distances):
                cum += d2
                if cum >= r:
                    chosen = pt
                    break
            centroids.append(chosen)

        # 2. EM Iterative Optimization
        assignments = [0] * n
        max_iters = 100
        for it in range(max_iters):
            new_assignments = []
            for pt in scaled_matrix:
                best_idx = min(range(k), key=lambda c_idx: self._dist_sq(pt, centroids[c_idx]))
                new_assignments.append(best_idx)

            if new_assignments == assignments and it > 0:
                break
            assignments = new_assignments

            # Recalculate centroids
            new_centroids = []
            for c_idx in range(k):
                pts_in_c = [scaled_matrix[i] for i in range(n) if assignments[i] == c_idx]
                if not pts_in_c:
                    new_centroids.append(centroids[c_idx])
                else:
                    new_centroids.append([sum(p[j] for p in pts_in_c) / len(pts_in_c) for j in range(d)])
            centroids = new_centroids

        # Calculate inertia
        inertia = sum(self._dist_sq(scaled_matrix[i], centroids[assignments[i]]) for i in range(n))

        # 3. Analyze Cluster Characteristics
        cluster_summaries: List[Dict[str, Any]] = []

        for c_idx in range(k):
            member_indices = [i for i in range(n) if assignments[i] == c_idx]
            cluster_size = len(member_indices)

            if cluster_size == 0:
                continue

            orig_points = [raw_matrix[i] for i in member_indices]
            avg_orders = sum(pt[0] for pt in orig_points) / cluster_size
            avg_spend_per_order = sum(pt[1] for pt in orig_points) / cluster_size
            avg_recency = sum(pt[2] for pt in orig_points) / cluster_size
            avg_indian = sum(pt[3] for pt in orig_points) / cluster_size
            avg_south = sum(pt[4] for pt in orig_points) / cluster_size
            avg_fast = sum(pt[5] for pt in orig_points) / cluster_size
            avg_chinese = sum(pt[6] for pt in orig_points) / cluster_size

            # Determine dominant cuisine
            cuis_map = {
                "Indian": avg_indian,
                "South Indian": avg_south,
                "Fast Food": avg_fast,
                "Chinese": avg_chinese
            }
            dominant_cuisine = max(cuis_map, key=cuis_map.get)

            # Generate natural persona label
            if avg_orders >= 20 and dominant_cuisine == "Indian":
                persona_label = "Frequent Indian Cuisine & Biryani Enthusiasts"
                tag_color = "#f97316"
            elif dominant_cuisine == "South Indian":
                persona_label = "South Indian Breakfast & Dosa Regulars"
                tag_color = "#10b981"
            elif dominant_cuisine == "Fast Food":
                persona_label = "Fast Food & Quick Bite Diners (Burgers & Pizza)"
                tag_color = "#6366f1"
            elif avg_orders < 5:
                persona_label = "New / Occasional Exploratory Diners"
                tag_color = "#38bdf8"
            else:
                persona_label = f"High-Value {dominant_cuisine} Diners"
                tag_color = "#ec4899"

            members_preview = [customers_meta[i]["name"] for i in member_indices[:5]]

            cluster_summaries.append({
                "cluster_id": c_idx,
                "name": persona_label,
                "tag_color": tag_color,
                "customer_count": cluster_size,
                "pct_of_customers": round((cluster_size / n) * 100, 1),
                "avg_orders": round(avg_orders, 1),
                "avg_order_value": round(avg_spend_per_order, 2),
                "avg_recency_days": round(avg_recency, 1),
                "dominant_cuisine": dominant_cuisine,
                "cuisine_affinity": {
                    "Indian": round(avg_indian * 100, 1),
                    "South Indian": round(avg_south * 100, 1),
                    "Fast Food": round(avg_fast * 100, 1),
                    "Chinese": round(avg_chinese * 100, 1)
                },
                "sample_customers": members_preview
            })

        # Attach cluster labels to customer metadata
        enriched_customers = []
        cluster_label_lookup = {c["cluster_id"]: c["name"] for c in cluster_summaries}
        for i in range(n):
            c_meta = dict(customers_meta[i])
            assigned_c = assignments[i]
            c_meta["cluster_id"] = assigned_c
            c_meta["cluster_name"] = cluster_label_lookup.get(assigned_c, f"Cluster {assigned_c}")
            enriched_customers.append(c_meta)

        return {
            "success": True,
            "total_customers": n,
            "k": k,
            "inertia": round(inertia, 2),
            "feature_names": feature_names,
            "clusters": cluster_summaries,
            "customers": enriched_customers
        }

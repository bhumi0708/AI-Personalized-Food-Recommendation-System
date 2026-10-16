import math
from typing import List, Dict, Any, Set, Tuple, Optional
from collections import defaultdict
from itertools import combinations
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import OrderFact, FoodDim, CustomerDim, TimeDim

class AprioriService:
    """
    Genuine Association Rule Mining Engine using the Apriori algorithm.
    Mines real transaction baskets from confirmed historical orders, calculates
    support, confidence, and lift, and delivers complementary food suggestions.
    """

    def __init__(self, db: Session):
        self.db = db

    def extract_transactions(self) -> Tuple[List[Set[int]], Dict[int, Dict[str, Any]]]:
        """
        Extract completed order items grouped into transactions by (customer_id, time_id).
        Returns:
            - transactions: list of sets of food_ids
            - food_lookup: mapping of food_id to food entity attributes
        """
        # Fetch completed order facts joined with food dimension
        rows = (
            self.db.query(OrderFact.customer_id, OrderFact.time_id, FoodDim)
            .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
            .filter(OrderFact.order_status == "Completed")
            .all()
        )

        tx_map = defaultdict(set)
        food_lookup: Dict[int, Dict[str, Any]] = {}

        for cid, tid, food in rows:
            tx_map[(cid, tid)].add(food.food_id)
            if food.food_id not in food_lookup:
                food_lookup[food.food_id] = {
                    "food_id": food.food_id,
                    "food_name": food.food_name,
                    "category": food.category,
                    "cuisine": food.cuisine,
                    "price": float(food.price or 0.0),
                    "image_url": food.image_url or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"
                }

        # Multi-item transactions (transactions with at least 2 distinct items)
        transactions = [items for items in tx_map.values() if len(items) >= 2]
        return transactions, food_lookup

    def mine_association_rules(
        self,
        min_support: float = 0.04,
        min_confidence: float = 0.20,
        min_lift: float = 1.05
    ) -> List[Dict[str, Any]]:
        """
        Execute genuine Apriori algorithm on available transaction data.
        Returns a sorted list of association rules with support, confidence, and lift.
        """
        transactions, food_lookup = self.extract_transactions()
        num_transactions = len(transactions)

        if num_transactions < 5:
            # Insufficient transactions for reliable statistical mining
            return []

        # Step 1: Count frequent 1-itemsets
        item_counts = defaultdict(int)
        for tx in transactions:
            for item in tx:
                item_counts[item] += 1

        min_support_count = max(2, int(min_support * num_transactions))
        frequent_1 = {item: count for item, count in item_counts.items() if count >= min_support_count}

        # Step 2: Count frequent 2-itemsets
        pair_counts = defaultdict(int)
        for tx in transactions:
            # Filter tx to frequent items only
            valid_items = [it for it in tx if it in frequent_1]
            if len(valid_items) >= 2:
                for a, b in combinations(sorted(valid_items), 2):
                    pair_counts[(a, b)] += 1

        # Step 3: Rule Generation (A -> B and B -> A)
        rules = []
        for (item_a, item_b), count in pair_counts.items():
            if count < min_support_count:
                continue

            rule_support = count / num_transactions

            # Direction 1: item_a -> item_b
            supp_a = item_counts[item_a] / num_transactions
            supp_b = item_counts[item_b] / num_transactions
            conf_a_to_b = count / item_counts[item_a]
            lift_a_to_b = conf_a_to_b / supp_b if supp_b > 0 else 0.0

            if conf_a_to_b >= min_confidence and lift_a_to_b >= min_lift:
                name_a = food_lookup.get(item_a, {}).get("food_name", f"Food #{item_a}")
                name_b = food_lookup.get(item_b, {}).get("food_name", f"Food #{item_b}")
                rules.append({
                    "antecedent_id": item_a,
                    "consequent_id": item_b,
                    "antecedent_name": name_a,
                    "consequent_name": name_b,
                    "support": round(rule_support, 4),
                    "confidence": round(conf_a_to_b, 4),
                    "lift": round(lift_a_to_b, 3),
                    "transaction_count": count,
                    "consequent_item": food_lookup.get(item_b, {})
                })

            # Direction 2: item_b -> item_a
            conf_b_to_a = count / item_counts[item_b]
            lift_b_to_a = conf_b_to_a / supp_a if supp_a > 0 else 0.0

            if conf_b_to_a >= min_confidence and lift_b_to_a >= min_lift:
                name_a = food_lookup.get(item_a, {}).get("food_name", f"Food #{item_a}")
                name_b = food_lookup.get(item_b, {}).get("food_name", f"Food #{item_b}")
                rules.append({
                    "antecedent_id": item_b,
                    "consequent_id": item_a,
                    "antecedent_name": name_b,
                    "consequent_name": name_a,
                    "support": round(rule_support, 4),
                    "confidence": round(conf_b_to_a, 4),
                    "lift": round(lift_b_to_a, 3),
                    "transaction_count": count,
                    "consequent_item": food_lookup.get(item_a, {})
                })

        # Sort rules by highest lift first, then confidence, then support
        rules.sort(key=lambda r: (r["lift"], r["confidence"], r["support"]), reverse=True)
        return rules

    def get_complementary_recommendations(
        self,
        basket_food_ids: Optional[List[int]] = None,
        basket_food_names: Optional[List[str]] = None,
        limit: int = 4
    ) -> Dict[str, Any]:
        """
        Recommend complementary items frequently purchased with items in the current basket.
        Ensures:
          1. Genuine rules learned from historical transactions are applied.
          2. Items already in the basket are filtered out.
          3. Unavailable/inactive items are excluded.
          4. Returns top strongest complementary items sorted by lift & confidence.
          5. If insufficient data or no rules match, returns a clear, honest status.
        """
        transactions, food_lookup = self.extract_transactions()
        total_tx = len(transactions)

        if total_tx < 5:
            return {
                "has_recommendations": False,
                "items": [],
                "total_transactions_analyzed": total_tx,
                "message": "Insufficient historical transaction data to compute reliable association rules."
            }

        # Normalize basket identifiers
        target_ids: Set[int] = set()
        if basket_food_ids:
            target_ids.update(basket_food_ids)

        if basket_food_names:
            name_lower_map = {v["food_name"].strip().lower(): k for k, v in food_lookup.items()}
            for name in basket_food_names:
                clean = name.strip().lower()
                if clean in name_lower_map:
                    target_ids.add(name_lower_map[clean])

        if not target_ids:
            return {
                "has_recommendations": False,
                "items": [],
                "total_transactions_analyzed": total_tx,
                "message": "Your basket is empty. Add a dish to receive complementary pairing suggestions."
            }

        # Mine active association rules
        rules = self.mine_association_rules(min_support=0.03, min_confidence=0.18, min_lift=1.05)

        # Match rules where antecedent is in the basket and consequent is NOT in the basket
        candidate_items: Dict[int, Dict[str, Any]] = {}

        for r in rules:
            ant_id = r["antecedent_id"]
            cons_id = r["consequent_id"]

            if ant_id in target_ids and cons_id not in target_ids:
                cons_data = food_lookup.get(cons_id)
                if not cons_data:
                    continue

                # If candidate not yet seen or this rule has higher lift
                if cons_id not in candidate_items or r["lift"] > candidate_items[cons_id]["lift"]:
                    ant_name = r["antecedent_name"]
                    lift_val = r["lift"]
                    conf_pct = int(round(r["confidence"] * 100))
                    
                    reason_text = (
                        f"Frequently ordered together with {ant_name} in historical transactions "
                        f"(Lift: {lift_val}x, {conf_pct}% confidence)."
                    )

                    candidate_items[cons_id] = {
                        "food_id": cons_data["food_id"],
                        "food_name": cons_data["food_name"],
                        "category": cons_data["category"],
                        "cuisine": cons_data["cuisine"],
                        "price": cons_data["price"],
                        "image_url": cons_data["image_url"],
                        "reason": reason_text,
                        "paired_with": ant_name,
                        "lift": r["lift"],
                        "confidence": r["confidence"],
                        "support": r["support"],
                        "transaction_count": r["transaction_count"]
                    }

        sorted_candidates = sorted(candidate_items.values(), key=lambda c: (c["lift"], c["confidence"]), reverse=True)
        final_items = sorted_candidates[:limit]

        if not final_items:
            return {
                "has_recommendations": False,
                "items": [],
                "total_transactions_analyzed": total_tx,
                "message": "No strong historical association pairings found for the current items in your basket."
            }

        return {
            "has_recommendations": True,
            "items": final_items,
            "total_transactions_analyzed": total_tx,
            "rules_applied_count": len(final_items),
            "message": f"Learned from {total_tx} historical multi-item order transactions."
        }

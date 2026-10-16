import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import SessionLocal
from backend.app.services.apriori_service import AprioriService
from backend.app.services.clustering_service import CustomerClusteringService
from backend.app.services.dwh_service import DataWarehouseService

db = SessionLocal()

print("=" * 60)
print("1. TESTING APRIORI ASSOCIATION RULE MINING")
print("=" * 60)
ap_service = AprioriService(db)
rules = ap_service.mine_association_rules(min_support=0.03, min_confidence=0.18, min_lift=1.05)
print(f"Total Rules Mined: {len(rules)}")
for r in rules[:6]:
    print(f"  {r['antecedent_name']} -> {r['consequent_name']} (Lift: {r['lift']}, Conf: {r['confidence']:.1%}, Supp: {r['support']:.1%})")

# Test complementary suggestions when Biryani is in basket
biryani_comp = ap_service.get_complementary_recommendations(basket_food_names=["Biryani"])
print(f"\nComplementary for basket ['Biryani'] (Found: {biryani_comp.get('has_recommendations')}):")
for it in biryani_comp.get("items", []):
    print(f"  - {it['food_name']} (Rs. {it['price']}): {it['reason']}")

# Test filtering: if Biryani AND Raita are both in basket, Raita must NOT be recommended!
both_comp = ap_service.get_complementary_recommendations(basket_food_names=["Biryani", "Raita"])
print(f"\nComplementary for basket ['Biryani', 'Raita']:")
both_names = [it['food_name'] for it in both_comp.get("items", [])]
print(f"  Recommended items: {both_names}")
assert "Raita" not in both_names, "ERROR: Raita should have been excluded because it is already in basket!"
assert "Biryani" not in both_names, "ERROR: Biryani should have been excluded because it is already in basket!"
print("  PASS: Basket items correctly excluded from complementary suggestions!")

print("\n" + "=" * 60)
print("2. TESTING CUSTOMER CLUSTERING (K-MEANS)")
print("=" * 60)
clust_service = CustomerClusteringService(db)
res_cluster = clust_service.run_clustering(k=3, seed=42)
print(f"Clustering Success: {res_cluster['success']}, Total Customers: {res_cluster['total_customers']}, Inertia: {res_cluster['inertia']}")
for c in res_cluster["clusters"]:
    print(f"  Cluster #{c['cluster_id']}: '{c['name']}' | Count: {c['customer_count']} ({c['pct_of_customers']}%) | Avg Orders: {c['avg_orders']} | Dominant Cuisine: {c['dominant_cuisine']}")

print("\n" + "=" * 60)
print("3. TESTING DATA WAREHOUSE (STAR SCHEMA ETL & IDEMPOTENCY)")
print("=" * 60)
dwh_service = DataWarehouseService(db)
# First refresh
ref1 = dwh_service.refresh_star_schema()
print(f"Refresh 1 Result: {ref1['status']} | Facts synced: {ref1['fact_order_items_synced']}")
stats1 = dwh_service.get_warehouse_stats()
fact_count_1 = stats1["tables"]["dwh_fact_order_item"]["count"]
print(f"Fact Table Count after Refresh 1: {fact_count_1}")

# Second refresh to verify idempotency (MUST NOT duplicate rows!)
ref2 = dwh_service.refresh_star_schema()
stats2 = dwh_service.get_warehouse_stats()
fact_count_2 = stats2["tables"]["dwh_fact_order_item"]["count"]
print(f"Fact Table Count after Refresh 2: {fact_count_2}")
assert fact_count_1 == fact_count_2, f"Idempotency failure! Count changed from {fact_count_1} to {fact_count_2}"
print("  PASS: Repeated warehouse refreshes NEVER duplicate facts! (Idempotent)")

analytics = dwh_service.get_analytical_summaries()
print(f"Analytical Total Revenue: Rs. {analytics['total_revenue']}")
print(f"Top 3 Selling Dishes: {[d['food_name'] for d in analytics['top_dishes'][:3]]}")
print(f"Cuisine Revenue Breakdown: {[(c['cuisine'], c['revenue']) for c in analytics['by_cuisine'][:3]]}")

db.close()
print("\n" + "=" * 60)
print("ALL BACKEND SERVICES TESTED AND VERIFIED SUCCESSFULLY!")
print("=" * 60)

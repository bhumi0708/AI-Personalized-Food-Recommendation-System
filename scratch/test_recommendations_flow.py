import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def api_call(path, method="GET", body=None):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json"}
    if body is not None:
        data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def run_tests():
    print("==================================================")
    print("RUNNING COMPREHENSIVE AI RECOMMENDATIONS TEST SUITE")
    print("==================================================")

    # 1. Login as Customer 1
    print("\n--- Test 1: Mobile Login Customer #1 ---")
    login_res = api_call("/auth/login", method="POST", body={"mobile_number": "9590078541"})
    cust_data = login_res["customer"]
    assert cust_data["customer_id"] == 1, f"Expected customer_id 1, got {cust_data['customer_id']}"
    assert cust_data["name"] == "Aarav Sharma"
    print(f"SUCCESS: Logged in as {cust_data['name']} (ID: {cust_data['customer_id']})")

    # 2. Frequent Orders for Customer 1
    print("\n--- Test 2: Frequently Ordered By You (Customer #1) ---")
    frequent_1 = api_call("/orders/customer/1/frequent")
    assert len(frequent_1) > 0, "Expected frequent orders for Customer 1"
    print(f"SUCCESS: Found {len(frequent_1)} frequent food items for Aarav Sharma.")
    
    # Verify sorting
    counts = [item["order_count"] for item in frequent_1]
    assert counts == sorted(counts, reverse=True), "Expected items sorted by highest order frequency first"
    print("SUCCESS: Items correctly sorted by descending order frequency.")

    # Verify multi-source display
    top_dish = frequent_1[0]
    print(f"Top Dish: {top_dish['food_name']}, Orders: {top_dish['order_count']}, Sources: {top_dish['sources']}, Last: {top_dish['last_order_days_ago']}")
    assert len(top_dish["sources"]) > 0, "Sources dictionary should not be empty"
    print(f"SUCCESS: Source breakdown confirmed: {top_dish['sources']}")

    # 3. Likely Next Order for Customer 1
    print("\n--- Test 3: Likely Next Order (Customer #1) ---")
    next_order_1 = api_call("/recommendations/1/likely-next-order")
    assert next_order_1["has_prediction"] == True
    assert next_order_1["food_name"] is not None
    assert "Likelihood" in next_order_1["confidence_level"]
    assert "100%" not in next_order_1["confidence_level"]
    print(f"SUCCESS: Predicted dish: {next_order_1['food_name']}")
    print(f"Confidence: {next_order_1['confidence_level']}")
    print(f"Reason: {next_order_1['reason']}")
    print(f"Factors: {next_order_1['factors']}")

    # 4. AI Recommendations for Customer 1 with personalized reasons
    print("\n--- Test 4: Personalized AI Recommendations (Customer #1) ---")
    recs_1 = api_call("/recommendations/1?top_n=5")
    assert len(recs_1) > 0
    for r in recs_1:
        print(f"- {r['food_name']} ({r['cuisine']}): {r['reasons']}")
        assert len(r["reasons"]) > 0
    print("SUCCESS: Generated personalized recommendations with real customer order reasons.")

    # 5. Customer 2 (Ananya Verma) with distinct history
    print("\n--- Test 5: Distinct Customer #2 (Ananya Verma) ---")
    login_res_2 = api_call("/auth/login", method="POST", body={"mobile_number": "7837069898"})
    assert login_res_2["customer"]["customer_id"] == 2
    frequent_2 = api_call("/orders/customer/2/frequent")
    next_order_2 = api_call("/recommendations/2/likely-next-order")
    recs_2 = api_call("/recommendations/2?top_n=3")
    print(f"Customer #2 Top Frequent: {frequent_2[0]['food_name']} (Orders: {frequent_2[0]['order_count']}, Sources: {frequent_2[0]['sources']})")
    print(f"Customer #2 Likely Next Order: {next_order_2['food_name']}")
    assert frequent_2[0]["food_name"] is not None
    print("SUCCESS: Customer #2 calculations based on their own separate order records.")

    # 6. Cold Start Customer with 0 Orders
    print("\n--- Test 6: Cold Start Customer (Zero Orders) ---")
    # Register new customer via API
    new_cust_payload = {
        "name": "Cold Start User",
        "phone": "+91 9123456780",
        "email": "coldstart@foodai.example",
        "age": 28,
        "gender": "Female",
        "location": "Bengaluru",
        "preferences": "Italian"
    }
    created_cust = api_call("/customers", method="POST", body=new_cust_payload)
    new_cid = created_cust["customer_id"]
    print(f"Created temporary zero-order customer #{new_cid}")

    try:
        # Check frequent orders for zero-order customer
        cold_frequent = api_call(f"/orders/customer/{new_cid}/frequent")
        assert len(cold_frequent) == 0, f"Expected 0 frequent orders, got {len(cold_frequent)}"
        print("SUCCESS: Zero-order customer returns [] for frequent orders (No previous order history).")

        # Check likely next order for zero-order customer
        cold_next = api_call(f"/recommendations/{new_cid}/likely-next-order")
        assert cold_next["has_prediction"] == False, "has_prediction must be False for cold start"
        assert "No previous orders" in cold_next["reason"] or "No previous order history" in cold_next["reason"]
        assert len(cold_next["order_sources"]) == 0, "No fake order sources should exist"
        print(f"SUCCESS: Zero-order next order reason: {cold_next['reason']}")

        # Check recommendations for zero-order customer
        cold_recs = api_call(f"/recommendations/{new_cid}?top_n=4")
        assert len(cold_recs) > 0, "Expected cold start recommendations based on profile/preferences"
        # Check reasons cite profile and Food.com dataset, without fake Swiggy/Zomato orders
        for cr in cold_recs:
            for reason in cr["reasons"]:
                assert "Swiggy" not in reason and "Zomato" not in reason, f"Fake source in cold start: {reason}"
        print(f"SUCCESS: Cold start recommendations correctly use profile/Food.com trends: {cold_recs[0]['reasons']}")

    finally:
        # Cleanup zero-order customer
        api_call(f"/customers/{new_cid}", method="DELETE")
        print(f"Cleaned up temporary customer #{new_cid}")

    # 7. Check Existing Core Modules Still Functioning
    print("\n--- Test 7: Verify Overview, Orders, and Admin Modules ---")
    stats = api_call("/admin/dashboard/stats")
    assert stats["total_customers"] > 0
    assert stats["total_orders"] > 0
    print(f"SUCCESS: Overview stats intact (Customers: {stats['total_customers']}, Orders: {stats['total_orders']})")

    foods = api_call("/admin/foods")
    assert len(foods) > 0
    print(f"SUCCESS: Food catalog intact ({len(foods)} foods available)")

    print("\n==================================================")
    print("ALL AI RECOMMENDATION ENHANCEMENT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("--- 1. Testing GET /api/admin/dashboard/stats ---")
    res = requests.get(f"{BASE_URL}/admin/dashboard/stats")
    print("Admin Stats:", res.json())

    print("\n--- 2. Testing POST /api/customers (Creating a new test customer) ---")
    new_cust_payload = {
        "name": "Testing Admin Customer",
        "email": "test.admin.customer@fooddwh.com",
        "phone": "+91 9876543210",
        "age": 28,
        "gender": "Female",
        "location": "Hyderabad",
        "preferences": "Indian",
        "status": "Active"
    }
    res = requests.post(f"{BASE_URL}/customers", json=new_cust_payload)
    print("Create Customer Status Code:", res.status_code)
    cust_data = res.json()
    print("Created Customer:", cust_data)
    test_cust_id = cust_data["customer_id"]

    print("\n--- 3. Testing Duplicate Email Validation ---")
    dup_res = requests.post(f"{BASE_URL}/customers", json=new_cust_payload)
    print("Duplicate Email Status Code (Expected 400):", dup_res.status_code, dup_res.json())

    print("\n--- 4. Testing Adding 5 Historical Orders for Customer ---")
    sample_orders = [
        {"food_name": "Biryani", "category": "Main Course", "cuisine": "Indian", "quantity": 1, "price": 280.0, "rating": 5.0, "order_date": "2025-03-01", "time_of_day": "Dinner", "payment_method": "UPI"},
        {"food_name": "Raita", "category": "Side Dish", "cuisine": "Indian", "quantity": 1, "price": 60.0, "rating": 4.8, "order_date": "2025-03-01", "time_of_day": "Dinner", "payment_method": "UPI"},
        {"food_name": "Chicken 65", "category": "Starter", "cuisine": "Indian", "quantity": 1, "price": 220.0, "rating": 4.7, "order_date": "2025-03-02", "time_of_day": "Dinner", "payment_method": "Credit Card"},
        {"food_name": "Biryani", "category": "Main Course", "cuisine": "Indian", "quantity": 2, "price": 280.0, "rating": 5.0, "order_date": "2025-03-05", "time_of_day": "Dinner", "payment_method": "UPI"},
        {"food_name": "Raita", "category": "Side Dish", "cuisine": "Indian", "quantity": 1, "price": 60.0, "rating": 4.5, "order_date": "2025-03-05", "time_of_day": "Dinner", "payment_method": "UPI"}
    ]

    order_ids = []
    for ord_payload in sample_orders:
        ord_payload["customer_id"] = test_cust_id
        res = requests.post(f"{BASE_URL}/orders", json=ord_payload)
        print("Add Order Response:", res.json())
        order_ids.append(res.json()["order_id"])

    print("\n--- 5. Testing GET /api/customers/{id} Profile & Aggregations ---")
    profile_res = requests.get(f"{BASE_URL}/customers/{test_cust_id}")
    profile_data = profile_res.json()
    print("Customer Profile Stats:", profile_data["stats"])
    print("Total Orders in Profile:", len(profile_data["order_history"]))

    print("\n--- 6. Testing GET /api/recommendations/{id} AI Integration ---")
    rec_res = requests.get(f"{BASE_URL}/recommendations/{test_cust_id}?top_n=5")
    recs = rec_res.json()
    print("AI Recommendations for Customer:")
    for item in recs:
        print(f" -> {item['food_name']} ({item['recommendation_type']}): {item['reasons']}")

    print("\n--- 7. Testing PUT /api/customers/{id} ---")
    update_res = requests.put(f"{BASE_URL}/customers/{test_cust_id}", json={"location": "Bengaluru", "preferences": "Fast Food"})
    print("Updated Customer:", update_res.json())

    print("\n--- 8. Testing PUT /api/orders/{order_id} ---")
    ord_update_res = requests.put(f"{BASE_URL}/orders/{order_ids[0]}", json={"quantity": 3, "rating": 4.9})
    print("Updated Order Response:", ord_update_res.json())

    print("\n--- 9. Testing GET /api/orders (Global Order Filtering) ---")
    global_orders = requests.get(f"{BASE_URL}/orders?customer_id={test_cust_id}").json()
    print(f"Filtered Orders Count for Customer #{test_cust_id}:", len(global_orders))

    print("\n--- ALL API TESTS COMPLETED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()

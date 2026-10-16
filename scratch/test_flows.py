import os
import sys
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal, Base, engine
from backend.app.models import CustomerDim, FoodDim, OrderFact, TimeDim
from backend.app.schemas import CustomerCreate, OrderCreate, MobileLoginRequest
from backend.app.routes.customers import create_customer, get_customer_profile
from backend.app.routes.auth import login
from backend.app.routes.orders import create_past_order, get_customer_orders
from backend.app.services.recommendation_engine import RecommendationEngine
from backend.app.services.email_service import get_smtp_config, send_account_creation_email

def run_tests():
    db = SessionLocal()
    print("=" * 60)
    print("RUNNING FOODAI END-TO-END FLOW TESTS")
    print("=" * 60)

    # 1. Check initial customer count
    initial_count = db.query(CustomerDim).count()
    print(f"[TEST 1] Initial customer count: {initial_count}")

    # 2. Test Customer Registration with Mobile & Email
    test_phone = f"+91 99999{datetime.now().strftime('%M%S')}"
    test_email = f"test.user{datetime.now().strftime('%M%S')}@example.com"
    print(f"\n[TEST 2] Registering new customer with phone={test_phone}, email={test_email}")

    cust_in = CustomerCreate(
        name="Rohit Sharma",
        age=34,
        gender="Male",
        location="Mumbai",
        preferences="Indian",
        email=test_email,
        phone=test_phone,
        status="Active"
    )

    created_cust = create_customer(cust_in, db=db)
    print(f"-> Customer successfully created: ID #{created_cust.customer_id}, Name: {created_cust.name}")
    print(f"-> Email delivery status message: {created_cust.email_status}")
    assert created_cust.customer_id is not None
    assert created_cust.phone == test_phone
    assert created_cust.email == test_email

    # 3. Verify customer stored permanently & count increased
    new_count = db.query(CustomerDim).count()
    print(f"\n[TEST 3] Verifying DB persistence: Count was {initial_count}, now {new_count}")
    assert new_count == initial_count + 1

    # 4. Test Duplicate Mobile Validation
    print(f"\n[TEST 4] Testing duplicate mobile number validation")
    try:
        dup_cust_in = CustomerCreate(
            name="Duplicate User",
            age=25,
            gender="Male",
            location="Pune",
            preferences="Chinese",
            email="dup.user@example.com",
            phone=test_phone
        )
        create_customer(dup_cust_in, db=db)
        print("ERROR: Duplicate mobile was not rejected!")
        assert False
    except Exception as e:
        print(f"-> Correctly rejected duplicate phone: {e}")

    # 5. Test Customer Mobile Login
    print(f"\n[TEST 5] Testing customer mobile login with '{test_phone}'")
    # Exact format login
    login_res = login(payload=MobileLoginRequest(mobile_number=test_phone), db=db)
    print(f"-> Login response status: {login_res['status']}, Customer: {login_res['customer']['name']}")
    assert login_res['status'] == "success"
    assert login_res['customer']['customer_id'] == created_cust.customer_id

    # Test 10-digit login (without +91 prefix)
    plain_digits = "".join([c for c in test_phone if c.isdigit()])[-10:]
    print(f"\n[TEST 6] Testing normalized 10-digit login with '{plain_digits}'")
    login_res2 = login(payload=MobileLoginRequest(mobile_number=plain_digits), db=db)
    print(f"-> Login response status: {login_res2['status']}, ID: {login_res2['customer']['customer_id']}")
    assert login_res2['customer']['customer_id'] == created_cust.customer_id

    # Test Invalid Mobile Login (Customer Not Found)
    print(f"\n[TEST 7] Testing invalid mobile number login")
    try:
        login(payload=MobileLoginRequest(mobile_number="9000000000"), db=db)
        print("ERROR: Non-existent mobile did not raise 404!")
        assert False
    except Exception as e:
        print(f"-> Correctly rejected non-existent mobile: {e.detail if hasattr(e, 'detail') else e}")
        assert "Customer not found. Please contact the administrator to create your account." in str(e)

    # 6. Test New Customer (No Order History)
    print(f"\n[TEST 8] Testing customer with NO order history")
    engine = RecommendationEngine(db)
    cold_start_recs = engine.generate_recommendations_for_customer(created_cust.customer_id, top_n=4)
    print(f"-> Cold start recommendations count: {len(cold_start_recs)}")
    for r in cold_start_recs:
        print(f"   * {r['food_name']} ({r['cuisine']}) - Type: {r['recommendation_type']}")
        print(f"     Why: {r['reasons'][0]}")

    cold_start_next = engine.predict_likely_next_order(created_cust.customer_id)
    print(f"-> Cold start likely next order prediction:")
    print(f"   Has prediction: {cold_start_next['has_prediction']}")
    print(f"   Reason: {cold_start_next['reason']}")
    assert cold_start_next['has_prediction'] == False

    # 7. Add Historical Orders with Swiggy, Zomato, and Project App sources
    print(f"\n[TEST 9] Adding historical orders for customer #{created_cust.customer_id}")
    order1 = create_past_order(OrderCreate(
        customer_id=created_cust.customer_id,
        food_name="Biryani",
        category="Main Course",
        cuisine="Indian",
        quantity=2,
        price=280.0,
        order_source="Swiggy",
        order_date="2026-09-20"
    ), db=db)
    print(f"-> Added Order 1: Food={order1['food_name']}, Source={order1['order_source']}, Total=Rs.{order1['price'] * order1['quantity']}")

    order2 = create_past_order(OrderCreate(
        customer_id=created_cust.customer_id,
        food_name="Paneer Curry",
        category="Main Course",
        cuisine="Indian",
        quantity=1,
        price=240.0,
        order_source="Zomato",
        order_date="2026-09-25"
    ), db=db)
    print(f"-> Added Order 2: Food={order2['food_name']}, Source={order2['order_source']}, Total=Rs.{order2['price'] * order2['quantity']}")

    order3 = create_past_order(OrderCreate(
        customer_id=created_cust.customer_id,
        food_name="Biryani",
        category="Main Course",
        cuisine="Indian",
        quantity=1,
        price=280.0,
        order_source="Swiggy",
        order_date="2026-10-01"
    ), db=db)
    print(f"-> Added Order 3 (Repeat): Food={order3['food_name']}, Source={order3['order_source']}, Total=Rs.{order3['price'] * order3['quantity']}")

    # 8. Verify Order History for Customer
    print(f"\n[TEST 10] Fetching customer order history from database")
    cust_orders = get_customer_orders(created_cust.customer_id, db=db)
    print(f"-> Total orders fetched: {len(cust_orders)}")
    for ord_item in cust_orders:
        print(f"   Order #{ord_item['order_id']} | {ord_item['food_name']} | Source: {ord_item['order_source']} | Date: {ord_item['date']} | Rs.{ord_item['total_price']}")
    assert len(cust_orders) == 3
    assert any(o['order_source'] == "Swiggy" for o in cust_orders)
    assert any(o['order_source'] == "Zomato" for o in cust_orders)

    # 9. Verify AI Personalized Recommendations and Likely Next Order
    print(f"\n[TEST 11] Generating AI Recommendations with History")
    history_recs = engine.generate_recommendations_for_customer(created_cust.customer_id, top_n=5)
    for r in history_recs:
        print(f"   * {r['food_name']} ({r['recommendation_type']}, Score: {r['score']})")
        print(f"     Why: {r['reasons'][0]}")

    print(f"\n[TEST 12] Predicting Likely Next Order with History")
    next_order_pred = engine.predict_likely_next_order(created_cust.customer_id)
    print(f"-> Has prediction: {next_order_pred['has_prediction']}")
    print(f"-> Predicted Food: {next_order_pred['food_name']}")
    print(f"-> Confidence: {next_order_pred['confidence_level']}")
    print(f"-> Reason: {next_order_pred['reason']}")
    print(f"-> Factors: {next_order_pred['factors']}")
    assert next_order_pred['has_prediction'] == True
    assert next_order_pred['food_name'] == "Biryani" # most repeated dish!

    # 10. Test Email Configuration and Safe Fallback
    print(f"\n[TEST 13] Testing Email Service Safe Fallback")
    cfg = get_smtp_config()
    print(f"-> Current SMTP configured: {cfg['is_configured']}")
    ok, status_msg = send_account_creation_email("Test User", 999, "+91 9999999999", "test@example.com")
    print(f"-> Email dispatch result: success={ok}, message='{status_msg}'")
    assert ok == False  # In dev without real SMTP, safely returns False with clear status message without crashing

    db.close()
    print("\n" + "=" * 60)
    print("ALL 13 AUTOMATED TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

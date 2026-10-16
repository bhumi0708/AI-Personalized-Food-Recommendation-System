import urllib.request
import urllib.error
import json
import sys
import time

BASE_URL = "http://127.0.0.1:8001"

def make_request(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.getcode()
            res_body = response.read().decode("utf-8")
            parsed = json.loads(res_body) if res_body else {}
            return status, parsed
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = {"raw": err_body}
        return e.code, parsed
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("STARTING COMPREHENSIVE CUSTOMER SELF-REGISTRATION & AUTH TESTS")
    print("=" * 70)

    # 1. Visitor signed out: GET /api/auth/me should return 401
    status, res = make_request("GET", "/api/auth/me")
    assert status == 401, f"Expected 401 for unauthenticated visitor, got {status}: {res}"
    print(" PASS: Unauthenticated visitor rejected (401 Unauthorized)")

    # 2. Register a new customer
    unique_suffix = int(time.time()) % 100000
    test_phone = f"988{unique_suffix:05d}21"
    test_email = f"autotest_{unique_suffix}@foodaitest.com"
    test_name = f"Test User {unique_suffix}"
    
    reg_payload = {
        "name": test_name,
        "phone": test_phone,
        "email": test_email,
        "age": 28,
        "gender": "Female",
        "location": "Bengaluru",
        "preferences": "South Indian",
        "dietary_preferences": "Vegetarian"
    }

    status, res = make_request("POST", "/api/auth/register", reg_payload)
    assert status == 200, f"Expected 200 for registration, got {status}: {res}"
    assert res.get("status") == "success", f"Registration response failed: {res}"
    new_customer = res["customer"]
    cust_id = new_customer["customer_id"]
    reg_token = res["token"]
    email_status = res.get("email_status", "")
    print(f" PASS: Registered new customer '{test_name}' with ID {cust_id} and phone {test_phone}")
    print(f"       Email delivery status honestly reported: '{email_status}'")
    assert "SMTP not configured" in email_status or "Pending SMTP" in email_status or "delivered" in email_status.lower()

    # 3. Duplicate mobile registration attempt must be rejected (400)
    dup_payload = dict(reg_payload)
    dup_payload["email"] = f"diff_email_{unique_suffix}@foodaitest.com" # different email, same phone
    status, res = make_request("POST", "/api/auth/register", dup_payload)
    assert status == 400, f"Expected 400 for duplicate phone, got {status}: {res}"
    print(f" PASS: Duplicate phone rejection verified (400 Bad Request: {res.get('detail')})")

    # 4. Request OTP for the customer
    status, res = make_request("POST", "/api/auth/request-otp", {"mobile_number": test_phone})
    assert status == 200, f"Expected 200 for request-otp, got {status}: {res}"
    otp_code = res.get("code")
    is_demo = res.get("is_demo_mode")
    assert is_demo is True, "Expected demo mode notice when real SMS gateway is not configured"
    assert otp_code is not None and len(str(otp_code)) == 6, f"Expected 6 digit OTP, got {otp_code}"
    print(f" PASS: Request OTP generated {otp_code} with honest demo mode indicator")

    # 5. Invalid OTP attempt must fail
    status, res = make_request("POST", "/api/auth/verify-otp", {"mobile_number": test_phone, "otp": "000000"})
    assert status == 400, f"Expected 400 for invalid OTP, got {status}: {res}"
    print(" PASS: Invalid OTP rejected (400 Bad Request)")

    # 6. Valid OTP verification
    status, res = make_request("POST", "/api/auth/verify-otp", {"mobile_number": test_phone, "otp": str(otp_code)})
    assert status == 200, f"Expected 200 for valid OTP, got {status}: {res}"
    auth_token = res["token"]
    auth_cust = res["customer"]
    assert auth_cust["customer_id"] == cust_id, "Customer ID mismatch in OTP verify"
    print(f" PASS: OTP verification succeeded, received secure token: {auth_token[:12]}...")

    # 7. Check /api/auth/me with customer token
    status, res = make_request("GET", "/api/auth/me", token=auth_token)
    assert status == 200, f"Expected 200 for /api/auth/me, got {status}: {res}"
    assert res["role"] == "customer"
    assert res["customer"]["customer_id"] == cust_id
    print(f" PASS: /api/auth/me returned correct authenticated customer profile")

    # 8. Access customer's own basket (allowed)
    status, res = make_request("GET", f"/api/basket/{cust_id}", token=auth_token)
    assert status == 200, f"Expected 200 for customer's own basket, got {status}: {res}"
    print(" PASS: Customer accessed their own basket")

    # 9. Add item to customer basket & checkout
    status, res = make_request("POST", "/api/basket/items", {"customer_id": cust_id, "food_id": 1, "quantity": 2}, token=auth_token)
    assert status == 200, f"Expected 200 for add to basket, got {status}: {res}"
    print(" PASS: Customer successfully added item to their basket")

    # Checkout basket with payment method selection
    checkout_payload = {
        "payment_method": "UPI",
        "order_notes": "Automated auth test order"
    }
    status, res = make_request("POST", f"/api/basket/{cust_id}/checkout", checkout_payload, token=auth_token)
    assert status == 200, f"Expected 200 for checkout, got {status}: {res}"
    print(f" PASS: Customer placed order with UPI payment method. Order ID: {res.get('order_id')}")

    # 10. Customer data isolation check: Customer attempting to access ANOTHER customer's basket
    other_cust_id = 33 if cust_id != 33 else 1
    status, res = make_request("GET", f"/api/basket/{other_cust_id}", token=auth_token)
    assert status == 403, f"Expected 403 Forbidden for cross-customer access, got {status}: {res}"
    print(f" PASS: Cross-customer isolation enforced (403 Forbidden: {res.get('detail')})")

    # 11. Admin Login
    admin_payload = {"username": "admin", "password": "adminpassword123"}
    status, res = make_request("POST", "/api/auth/admin-login", admin_payload)
    assert status == 200, f"Expected 200 for admin login, got {status}: {res}"
    admin_token = res["token"]
    assert res["user"]["role"] == "admin"
    print(" PASS: Admin login succeeded with secure admin token")

    # Admin should be allowed to view any customer's basket or profile
    status, res = make_request("GET", f"/api/basket/{cust_id}", token=admin_token)
    assert status == 200, f"Expected 200 for admin accessing customer basket, got {status}: {res}"
    print(" PASS: Admin access privileges verified")

    # 12. Logout
    status, res = make_request("POST", "/api/auth/logout", token=auth_token)
    assert status == 200, f"Expected 200 for logout, got {status}: {res}"
    print(" PASS: Customer logout succeeded")

    # Token should now be invalid
    status, res = make_request("GET", "/api/auth/me", token=auth_token)
    assert status == 401, f"Expected 401 after logout, got {status}: {res}"
    print(" PASS: Logged out token properly invalidated (401 Unauthorized)")

    print("=" * 70)
    print("ALL 12 BACKEND AUTHENTICATION AND SECURITY TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

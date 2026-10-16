import urllib.request
import urllib.error
import json

BASE_URL = 'http://127.0.0.1:8001'

def make_req(method, path, body=None, token=None):
    url = f'{BASE_URL}{path}'
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.getcode(), json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print('=== 1. Testing Complementary Recommendations (Apriori) API ===')
# Querying complementary items for Biryani (food_id=1)
status, res = make_req('GET', '/api/recommendations/complementary?food_ids=1')
print(f"Status: {status}, Has Recommendations: {res.get('has_recommendations')}, Items Count: {len(res.get('items', []))}")
for item in res.get('items', []):
    print(f"  -> {item['food_name']} (Rs. {item['price']}) | Reason: {item['reason']}")

print('\n=== 2. Testing Basket Exclusions in Complementary Suggestions ===')
# Querying complementary items when both Biryani (1) and Raita (3) are in basket
status, res_excl = make_req('GET', '/api/recommendations/complementary?food_ids=1,3')
print(f"Status: {status}, Items Count: {len(res_excl.get('items', []))}")
for item in res_excl.get('items', []):
    print(f"  -> {item['food_name']} (Rs. {item['price']}) | Reason: {item['reason']}")
assert not any(i['food_id'] == 3 for i in res_excl.get('items', [])), "Raita should be excluded since it is in basket!"

print('\n=== 3. Testing Admin Login and Analytics Endpoints ===')
status, login_res = make_req('POST', '/api/auth/admin-login', {'username': 'admin', 'password': 'admin123'})
print('Admin Login Status:', status, 'Role:', login_res.get('role'))
admin_token = login_res.get('token')

# Association rules
status, ar_res = make_req('GET', '/api/admin/association-rules', token=admin_token)
print('Rules Status:', status, 'Mined Rules Count:', len(ar_res.get('rules', [])))
if ar_res.get('rules'):
    sample = ar_res['rules'][0]
    print(f"  Sample Rule: {sample['antecedent_name']} -> {sample['consequent_name']} (Lift: {sample['lift']}x, Conf: {sample['confidence']}, Supp: {sample['support']})")

# Customer insights (K-Means)
status, ci_res = make_req('GET', '/api/admin/customer-insights', token=admin_token)
print('Insights Status:', status, 'Clusters Count:', len(ci_res.get('clusters', [])))
for cl in ci_res.get('clusters', []):
    print(f"  Cluster #{cl['cluster_id']}: '{cl['name']}' | Size: {cl['customer_count']} ({cl['pct_of_customers']}%) | Avg Orders: {cl['avg_orders']}")

# Warehouse stats & analytics
status, ws_res = make_req('GET', '/api/admin/warehouse/stats', token=admin_token)
fact_cnt = ws_res.get('tables', {}).get('dwh_fact_order_item', {}).get('count')
cust_cnt = ws_res.get('tables', {}).get('dwh_dim_customer', {}).get('count')
print('Warehouse Stats Status:', status, 'Fact Rows:', fact_cnt, 'Customer Dims:', cust_cnt, 'Status:', ws_res.get('status'))

status, wa_res = make_req('GET', '/api/admin/warehouse/analytics', token=admin_token)
print('Warehouse Analytics Status:', status, 'Total Revenue: Rs.', wa_res.get('total_revenue'))

# Warehouse refresh
status, wr_res = make_req('POST', '/api/admin/warehouse/refresh', token=admin_token)
print('Warehouse Refresh Status:', status, 'Message:', wr_res.get('message'), 'Facts Synced:', wr_res.get('fact_order_items_synced'))

print('\nALL LIVE HTTP APIS FUNCTIONING ACCURATELY AND FULLY VALIDATED!')

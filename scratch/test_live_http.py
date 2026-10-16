import urllib.request
import json

def test_api():
    base = 'http://127.0.0.1:8000'
    print('1. Checking backend root...')
    with urllib.request.urlopen(base + '/') as r:
        print('Root response:', json.loads(r.read().decode()))

    print('\n2. Testing Admin Dashboard Stats...')
    with urllib.request.urlopen(base + '/api/admin/dashboard/stats') as r:
        stats = json.loads(r.read().decode())
        print('Total Customers:', stats['total_customers'])
        print('Total Orders:', stats['total_orders'])
        print('Total Foods:', stats['total_foods'])

    print('\n3. Testing Mobile Login with +91 999992730...')
    req = urllib.request.Request(
        base + '/api/auth/login',
        data=json.dumps({'mobile_number': '+91 999992730'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as r:
        login_res = json.loads(r.read().decode())
        print('Logged in user:', login_res['customer']['name'], 'ID:', login_res['customer']['customer_id'])
        c_id = login_res['customer']['customer_id']

    print(f'\n4. Testing Recommendations for customer #{c_id}...')
    with urllib.request.urlopen(f'{base}/api/recommendations/{c_id}?top_n=3') as r:
        recs = json.loads(r.read().decode())
        for item in recs:
            print(f"   - {item['food_name']} ({item['recommendation_type']}) | Why: {item['reasons'][0]}")

    print(f'\n5. Testing Likely Next Order for customer #{c_id}...')
    with urllib.request.urlopen(f'{base}/api/recommendations/{c_id}/likely-next-order') as r:
        next_ord = json.loads(r.read().decode())
        print('Likely next dish:', next_ord['food_name'])
        print('Confidence:', next_ord['confidence_level'])
        print('Reason:', next_ord['reason'])

    print('\n6. Checking frontend server at http://localhost:5173/...')
    with urllib.request.urlopen('http://localhost:5173/') as r:
        print('Frontend HTTP status:', r.status, 'HTML length:', len(r.read()))

if __name__ == '__main__':
    test_api()

import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import CustomerDim, FoodDim, TimeDim, OrderFact

FOOD_CATALOG = [
    {"food_name": "Biryani", "category": "Main Course", "cuisine": "Indian", "price": 280.0, "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80"},
    {"food_name": "Chicken 65", "category": "Starter", "cuisine": "Indian", "price": 220.0, "image_url": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&q=80"},
    {"food_name": "Raita", "category": "Side Dish", "cuisine": "Indian", "price": 60.0, "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80"},
    {"food_name": "Paneer Curry", "category": "Main Course", "cuisine": "Indian", "price": 240.0, "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80"},
    {"food_name": "Dosa", "category": "Main Course", "cuisine": "South Indian", "price": 120.0, "image_url": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&q=80"},
    {"food_name": "Idli", "category": "Starter", "cuisine": "South Indian", "price": 80.0, "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&q=80"},
    {"food_name": "Meals", "category": "Main Course", "cuisine": "Indian", "price": 180.0, "image_url": "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500&q=80"},
    {"food_name": "Pizza", "category": "Main Course", "cuisine": "Fast Food", "price": 350.0, "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80"},
    {"food_name": "Burger", "category": "Main Course", "cuisine": "Fast Food", "price": 160.0, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80"},
    {"food_name": "Fries", "category": "Side Dish", "cuisine": "Fast Food", "price": 110.0, "image_url": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80"},
    {"food_name": "Garlic Bread", "category": "Starter", "cuisine": "Fast Food", "price": 140.0, "image_url": "https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=500&q=80"},
    {"food_name": "Fried Rice", "category": "Main Course", "cuisine": "Chinese", "price": 200.0, "image_url": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80"},
    {"food_name": "Noodles", "category": "Main Course", "cuisine": "Chinese", "price": 190.0, "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80"},
    {"food_name": "Ice Cream", "category": "Dessert", "cuisine": "Desserts", "price": 90.0, "image_url": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=500&q=80"},
    {"food_name": "Coke", "category": "Beverage", "cuisine": "Beverages", "price": 50.0, "image_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80"}
]

NAMES = [
    "Aarav Sharma", "Ananya Verma", "Rahul Dravid", "Priya Patel", "Vikram Singh",
    "Sneha Reddy", "Rohan Mehta", "Kavya Iyer", "Arjun Nair", "Meera Joshi",
    "Siddharth Rao", "Pooja Gupta", "Aditya Kumar", "Rhea Sen", "Varun Teja",
    "Deepika Padukone", "Karan Johar", "Divya Agarwal", "Manish Malhotra", "Swati Bose",
    "Kishore Kumar", "Bhavna Shah", "Nikhil Chopra", "Tanvi Bhatia", "Amitabh Bachchan",
    "Ritu Kumar", "Sanjay Dutt", "Preeti Zinta", "Tarun Tahiliani", "Gayatri Devi"
]

LOCATIONS = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Delhi", "Pune"]
PREFERENCES = ["Indian", "Fast Food", "South Indian", "Chinese"]
TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Night"]
SEASONS = ["Summer", "Monsoon", "Winter"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "Cash on Delivery", "Net Banking"]

def seed_database(db: Session, force_reset: bool = False):
    if force_reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        # Check if email column exists by trying a query
        try:
            if db.query(CustomerDim).count() > 0:
                print("Database already seeded with customer data.")
                return
        except Exception:
            print("Schema mismatch detected. Rebuilding database tables...")
            db.rollback()
            Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)

    print("Seeding database with 1000+ realistic food order records and customer profiles...")

    # 1. Seed Customer Dimension (30 customers with valid email, phone, registration_date)
    customers = []
    start_date = datetime(2025, 1, 1)

    for i, name in enumerate(NAMES):
        pref = PREFERENCES[i % len(PREFERENCES)]
        first_name = name.split()[0].lower()
        last_name = name.split()[1].lower()
        email = f"{first_name}.{last_name}{i+1}@fooddwh.com"
        phone = f"+91 {random.randint(70000, 99999)}{random.randint(10000, 99999)}"
        reg_date = (start_date + timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")

        c = CustomerDim(
            name=name,
            email=email,
            phone=phone,
            age=random.randint(19, 52),
            gender="Male" if i % 2 == 0 else "Female",
            location=random.choice(LOCATIONS),
            preferences=pref,
            registration_date=reg_date,
            status="Active" if i < 28 else "Inactive"
        )
        db.add(c)
        customers.append(c)
    db.commit()

    for c in customers:
        db.refresh(c)

    # 2. Seed Food Dimension
    foods = {}
    for item in FOOD_CATALOG:
        f = FoodDim(
            food_name=item["food_name"],
            category=item["category"],
            cuisine=item["cuisine"],
            price=item["price"],
            image_url=item["image_url"]
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        foods[f.food_name] = f

    # 3. Seed Time Dimension
    time_entries = []
    for i in range(120):
        cur_date = start_date + timedelta(days=i)
        day_str = DAYS[cur_date.weekday()]
        tod = random.choice(TIMES_OF_DAY)
        month = cur_date.month
        season = "Winter" if month in [12, 1, 2] else ("Summer" if month in [3, 4, 5, 6] else "Monsoon")
        
        t = TimeDim(
            date=cur_date.strftime("%Y-%m-%d"),
            day=day_str,
            month=month,
            year=cur_date.year,
            time_of_day=tod,
            season=season
        )
        db.add(t)
        time_entries.append(t)
    db.commit()

    for t in time_entries:
        db.refresh(t)

    # 4. Seed Fact Table with order baskets adhering to realistic pattern combinations
    for basket_idx in range(360):
        customer = random.choice(customers)
        time_slot = random.choice(time_entries)
        pay_method = random.choice(PAYMENT_METHODS)
        ord_status = "Cancelled" if random.random() < 0.04 else "Completed"

        rand_val = random.random()
        basket = []

        if customer.preferences == "Indian" or rand_val < 0.35:
            basket = ["Biryani", "Raita"]
            if random.random() < 0.65:
                basket.append("Chicken 65")
            if random.random() < 0.30:
                basket.append("Coke")
        elif customer.preferences == "Fast Food" or rand_val < 0.65:
            if random.random() < 0.5:
                basket = ["Burger", "Fries"]
                if random.random() < 0.70:
                    basket.append("Coke")
            else:
                basket = ["Pizza", "Garlic Bread"]
                if random.random() < 0.75:
                    basket.append("Coke")
        elif customer.preferences == "South Indian" or rand_val < 0.85:
            basket = ["Dosa", "Idli"]
            if random.random() < 0.40:
                basket.append("Raita")
        else:
            basket = ["Fried Rice", "Noodles"]
            if random.random() < 0.60:
                basket.append("Ice Cream")

        for food_name in basket:
            food_item = foods[food_name]
            base_rating = 4.5 if food_name in ["Biryani", "Pizza", "Burger", "Dosa"] else 4.2
            rating = round(min(5.0, max(1.0, random.gauss(base_rating, 0.4))), 1)

            fact = OrderFact(
                customer_id=customer.customer_id,
                food_id=food_item.food_id,
                time_id=time_slot.time_id,
                quantity=random.choice([1, 1, 1, 2]),
                price=food_item.price,
                rating=rating,
                payment_method=pay_method,
                order_status=ord_status
            )
            db.add(fact)

    db.commit()
    print(f"Successfully seeded database! Total order records in fact_order: {db.query(OrderFact).count()}")

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db, force_reset=True)
    db.close()

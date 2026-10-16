from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime
from typing import Optional, List

from ..database import get_db
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim
from ..schemas import OrderCreate, OrderUpdate, OrderOut, FrequentOrderItem
from ..services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/api/orders", tags=["Order Management"])

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def get_or_create_time_dim(db: Session, date_str: str, time_of_day: str = "Dinner") -> TimeDim:
    """Find existing TimeDim entry or insert a new one for date_str."""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        dt = datetime.now()
        date_str = dt.strftime("%Y-%m-%d")

    day_str = DAYS[dt.weekday()]
    month = dt.month
    year = dt.year
    season = "Winter" if month in [12, 1, 2] else ("Summer" if month in [3, 4, 5, 6] else "Monsoon")

    time_entry = db.query(TimeDim).filter(
        TimeDim.date == date_str,
        TimeDim.time_of_day == time_of_day
    ).first()

    if not time_entry:
        time_entry = TimeDim(
            date=date_str,
            day=day_str,
            month=month,
            year=year,
            time_of_day=time_of_day,
            season=season
        )
        db.add(time_entry)
        db.commit()
        db.refresh(time_entry)

    return time_entry

def get_or_create_food_dim(db: Session, food_id: Optional[int], food_name: Optional[str], category: str, cuisine: str, price: Optional[float]) -> FoodDim:
    """Find existing FoodDim by ID or name, or create a new food item."""
    if food_id:
        food_item = db.query(FoodDim).filter(FoodDim.food_id == food_id).first()
        if food_item:
            return food_item

    if food_name:
        food_name = food_name.strip()
        food_item = db.query(FoodDim).filter(func.lower(FoodDim.food_name) == food_name.lower()).first()
        if food_item:
            return food_item

        # Create new food entry
        img_url = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"
        food_item = FoodDim(
            food_name=food_name,
            category=category or "Main Course",
            cuisine=cuisine or "Indian",
            price=price or 200.0,
            image_url=img_url
        )
        db.add(food_item)
        db.commit()
        db.refresh(food_item)
        return food_item

    # Default fallback food item
    default_food = db.query(FoodDim).first()
    if not default_food:
        default_food = FoodDim(food_name="Biryani", category="Main Course", cuisine="Indian", price=280.0)
        db.add(default_food)
        db.commit()
        db.refresh(default_food)
    return default_food

@router.post("", response_model=OrderOut)
@router.post("/", response_model=OrderOut, include_in_schema=False)
def create_past_order(order_in: OrderCreate, db: Session = Depends(get_db)):
    """Add a past order for a customer and update recommendation history."""
    # 1. Validate Customer Exists
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == order_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer ID #{order_in.customer_id} does not exist.")

    # 2. Validations
    if order_in.quantity is None or order_in.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be a positive integer.")

    if order_in.rating is not None and (order_in.rating < 1.0 or order_in.rating > 5.0):
        raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0.")

    # 3. Get or Create Food Dimension row
    food_item = get_or_create_food_dim(
        db=db,
        food_id=order_in.food_id,
        food_name=order_in.food_name,
        category=order_in.category,
        cuisine=order_in.cuisine,
        price=order_in.price
    )

    item_price = order_in.price if (order_in.price is not None and order_in.price > 0) else food_item.price

    # 4. Get or Create Time Dimension row
    time_entry = get_or_create_time_dim(
        db=db,
        date_str=order_in.order_date,
        time_of_day=order_in.time_of_day or "Dinner"
    )

    # 5. Insert Order Fact record
    valid_source = order_in.order_source if order_in.order_source in ["Swiggy", "Zomato", "Project App"] else "Project App"
    pay_status = order_in.payment_status
    if not pay_status:
        pay_status = "Pending" if (order_in.payment_method or "").strip().lower() in ["cash on delivery", "cod"] else "Demo Payment Successful"

    fact = OrderFact(
        customer_id=customer.customer_id,
        food_id=food_item.food_id,
        time_id=time_entry.time_id,
        quantity=order_in.quantity,
        price=item_price,
        rating=order_in.rating or 4.5,
        payment_method=order_in.payment_method or "UPI",
        payment_status=pay_status,
        order_status=order_in.order_status or "Completed",
        order_source=valid_source
    )

    db.add(fact)
    db.commit()
    db.refresh(fact)

    return {
        "order_id": fact.order_id,
        "customer_id": fact.customer_id,
        "food_id": fact.food_id,
        "time_id": fact.time_id,
        "quantity": fact.quantity,
        "price": fact.price,
        "rating": fact.rating,
        "payment_method": fact.payment_method,
        "payment_status": fact.payment_status,
        "order_status": fact.order_status,
        "order_source": fact.order_source or "Project App",
        "customer_name": customer.name,
        "food_name": food_item.food_name,
        "category": food_item.category,
        "cuisine": food_item.cuisine,
        "date": time_entry.date,
        "time_of_day": time_entry.time_of_day
    }

@router.get("")
@router.get("/", include_in_schema=False)
def get_all_orders(
    customer_id: Optional[int] = Query(None),
    order_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, description="Search customer name, food name, ID"),
    date: Optional[str] = Query(None),
    cuisine: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    order_status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("date", description="Sort by: date, price, rating"),
    sort_dir: Optional[str] = Query("desc", description="Sort direction: asc, desc"),
    db: Session = Depends(get_db)
):
    """Search, filter, and sort global orders list."""
    query = (
        db.query(OrderFact, CustomerDim, FoodDim, TimeDim)
        .join(CustomerDim, OrderFact.customer_id == CustomerDim.customer_id)
        .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
        .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
    )

    if customer_id:
        query = query.filter(OrderFact.customer_id == customer_id)
    if order_id:
        query = query.filter(OrderFact.order_id == order_id)
    if date:
        query = query.filter(TimeDim.date == date)
    if cuisine and cuisine.lower() != "all":
        query = query.filter(func.lower(FoodDim.cuisine) == cuisine.lower())
    if category and category.lower() != "all":
        query = query.filter(func.lower(FoodDim.category) == category.lower())
    if order_status and order_status.lower() != "all":
        query = query.filter(func.lower(OrderFact.order_status) == order_status.lower())

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            CustomerDim.name.ilike(search_pattern) |
            FoodDim.food_name.ilike(search_pattern)
        )

    # Sorting
    is_asc = sort_dir.lower() == "asc"
    if sort_by == "price":
        sort_col = OrderFact.price
    elif sort_by == "rating":
        sort_col = OrderFact.rating
    else:
        sort_col = TimeDim.date

    query = query.order_by(asc(sort_col) if is_asc else desc(sort_col))

    rows = query.limit(200).all()

    results = []
    for order, cust, food, time in rows:
        results.append({
            "order_id": order.order_id,
            "customer_id": cust.customer_id,
            "customer_name": cust.name,
            "food_id": food.food_id,
            "food_name": food.food_name,
            "category": food.category,
            "cuisine": food.cuisine,
            "quantity": order.quantity,
            "price": order.price,
            "total_price": round(order.price * order.quantity, 2),
            "date": time.date,
            "time_of_day": time.time_of_day,
            "rating": order.rating,
            "payment_method": order.payment_method or "UPI",
            "payment_status": getattr(order, "payment_status", None) or ("Pending" if (order.payment_method or "").strip().lower() in ["cash on delivery", "cod"] else "Demo Payment Successful"),
            "order_status": order.order_status or "Completed",
            "order_source": getattr(order, "order_source", "Project App") or "Project App"
        })

    return results

@router.get("/customer/{customer_id}")
def get_customer_orders(customer_id: int, db: Session = Depends(get_db)):
    """Fetch complete order history for a specific customer."""
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    rows = (
        db.query(OrderFact, FoodDim, TimeDim)
        .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
        .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
        .filter(OrderFact.customer_id == customer_id)
        .order_by(desc(OrderFact.order_id))
        .all()
    )

    results = []
    for order, food, time in rows:
        results.append({
            "order_id": order.order_id,
            "customer_id": customer.customer_id,
            "customer_name": customer.name,
            "food_name": food.food_name,
            "category": food.category,
            "cuisine": food.cuisine,
            "quantity": order.quantity,
            "price": order.price,
            "total_price": round(order.price * order.quantity, 2),
            "date": time.date,
            "time_of_day": time.time_of_day,
            "rating": order.rating,
            "payment_method": order.payment_method or "UPI",
            "payment_status": getattr(order, "payment_status", None) or ("Pending" if (order.payment_method or "").strip().lower() in ["cash on delivery", "cod"] else "Demo Payment Successful"),
            "order_status": order.order_status or "Completed",
            "order_source": getattr(order, "order_source", "Project App") or "Project App"
        })

    return results

@router.get("/customer/{customer_id}/frequent", response_model=List[FrequentOrderItem])
def get_customer_frequent_orders(
    customer_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Fetch customer's most frequently ordered foods with source breakdown and recency."""
    engine = RecommendationEngine(db)
    return engine.get_frequent_orders(customer_id=customer_id, limit=limit)

@router.put("/{order_id}")
def update_order_details(order_id: int, update_in: OrderUpdate, db: Session = Depends(get_db)):
    """Edit existing order details."""
    fact = db.query(OrderFact).filter(OrderFact.order_id == order_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Order not found")

    if update_in.quantity is not None:
        if update_in.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
        fact.quantity = update_in.quantity

    if update_in.price is not None:
        if update_in.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0.")
        fact.price = update_in.price

    if update_in.rating is not None:
        if update_in.rating < 1.0 or update_in.rating > 5.0:
            raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0.")
        fact.rating = update_in.rating

    if update_in.payment_method:
        fact.payment_method = update_in.payment_method
    if update_in.order_status:
        fact.order_status = update_in.order_status
    if update_in.order_source and update_in.order_source in ["Swiggy", "Zomato", "Project App"]:
        fact.order_source = update_in.order_source

    if update_in.order_date or update_in.time_of_day:
        cur_time = db.query(TimeDim).filter(TimeDim.time_id == fact.time_id).first()
        new_date = update_in.order_date or (cur_time.date if cur_time else datetime.now().strftime("%Y-%m-%d"))
        new_tod = update_in.time_of_day or (cur_time.time_of_day if cur_time else "Dinner")
        time_dim = get_or_create_time_dim(db, new_date, new_tod)
        fact.time_id = time_dim.time_id

    db.commit()
    db.refresh(fact)
    return {"message": f"Order #{order_id} updated successfully.", "order_id": order_id}

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete or cancel an order record."""
    fact = db.query(OrderFact).filter(OrderFact.order_id == order_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Order not found")

    db.delete(fact)
    db.commit()
    return {"message": f"Order #{order_id} deleted successfully.", "order_id": order_id}

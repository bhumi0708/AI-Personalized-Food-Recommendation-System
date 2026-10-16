from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim
from ..schemas import CustomerCreate, FoodCreate, OrderCreate
from ..routes.customers import create_customer
from ..routes.orders import get_or_create_time_dim
import random
from datetime import datetime

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])

@router.get("/foods")
def get_all_foods(db: Session = Depends(get_db)):
    """Fetch all food items from database catalog."""
    return db.query(FoodDim).all()

@router.post("/food")
def add_food_item(food: FoodCreate, db: Session = Depends(get_db)):
    """Add a new food item to the catalog."""
    img_url = food.image_url or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"
    new_food = FoodDim(
        food_name=food.food_name,
        category=food.category,
        cuisine=food.cuisine,
        price=food.price,
        image_url=img_url
    )
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return {"message": "Food item added successfully", "food": new_food}

@router.post("/customer")
def add_customer(cust: CustomerCreate, db: Session = Depends(get_db)):
    """Add a new customer profile permanently and trigger welcome email."""
    new_cust = create_customer(cust=cust, db=db)
    return {"message": "Customer added successfully", "customer": new_cust, "email_status": getattr(new_cust, "email_status", None)}

@router.post("/order")
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Create a new historical or current customer order record with order_source."""
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == order.customer_id).first()
    food = db.query(FoodDim).filter(FoodDim.food_id == order.food_id).first() if order.food_id else None
    
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not food and order.food_name:
        food = db.query(FoodDim).filter(FoodDim.food_name.ilike(order.food_name.strip())).first()

    if not food:
        food = db.query(FoodDim).first()
        if not food:
            raise HTTPException(status_code=400, detail="No food items found in catalog")

    order_date_str = order.order_date or datetime.now().strftime("%Y-%m-%d")
    tod = order.time_of_day or "Dinner"
    time_entry = get_or_create_time_dim(db, date_str=order_date_str, time_of_day=tod)

    unit_price = order.price if (order.price is not None and order.price > 0) else food.price
    valid_source = order.order_source if order.order_source in ["Swiggy", "Zomato", "Project App"] else "Project App"

    fact = OrderFact(
        customer_id=order.customer_id,
        food_id=food.food_id,
        time_id=time_entry.time_id,
        quantity=order.quantity or 1,
        price=unit_price,
        rating=order.rating or 4.5,
        payment_method=order.payment_method or "UPI",
        order_status=order.order_status or "Completed",
        order_source=valid_source
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)
    return {
        "message": "Order created successfully",
        "order_id": fact.order_id,
        "order_source": fact.order_source,
        "food_name": food.food_name,
        "customer_id": customer.customer_id
    }

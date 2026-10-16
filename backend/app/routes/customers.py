from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
from typing import Optional, List
import re

from ..database import get_db
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim
from ..schemas import CustomerCreate, CustomerUpdate, CustomerOut

from ..services.email_service import send_account_creation_email
from .auth import verify_session_customer_access

router = APIRouter(prefix="/api/customers", tags=["Customer Management"])

def validate_email_format(email: str) -> bool:
    if not email:
        return False
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email.strip()) is not None

def extract_phone_digits(phone: str) -> str:
    if not phone:
        return ""
    return "".join([c for c in phone if c.isdigit()])

@router.post("", response_model=CustomerOut)
@router.post("/", response_model=CustomerOut, include_in_schema=False)
def create_customer(cust: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer with validation, duplicate checks, permanent DB storage, and welcome email."""
    if not cust.name or not cust.name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required.")
    
    if cust.age is None or cust.age <= 0 or cust.age > 120:
        raise HTTPException(status_code=400, detail="Valid age between 1 and 120 is required.")

    # Validate Mobile Number (Mandatory & Unique Account Identifier)
    if not cust.phone or not cust.phone.strip():
        raise HTTPException(status_code=400, detail="Mobile number is required to uniquely identify the customer account.")
    
    clean_phone = cust.phone.strip()
    digits = extract_phone_digits(clean_phone)
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Please provide a valid mobile number with at least 10 digits.")

    # Check for duplicate mobile number (exact or matching last 10 digits)
    dup_phone = db.query(CustomerDim).filter(CustomerDim.phone == clean_phone).first()
    if not dup_phone:
        all_phones = db.query(CustomerDim.customer_id, CustomerDim.phone).all()
        for cid, p_str in all_phones:
            if p_str and extract_phone_digits(p_str)[-10:] == digits[-10:]:
                dup_phone = cid
                break
    if dup_phone:
        raise HTTPException(status_code=400, detail=f"Customer with mobile number '{clean_phone}' already exists.")

    # Validate Email (Mandatory for account notification)
    if not cust.email or not cust.email.strip():
        raise HTTPException(status_code=400, detail="Email address is required for account notification.")
    
    clean_email = cust.email.strip().lower()
    if not validate_email_format(clean_email):
        raise HTTPException(status_code=400, detail="Invalid email format provided.")

    existing_email = db.query(CustomerDim).filter(func.lower(CustomerDim.email) == clean_email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail=f"Customer with email '{clean_email}' already exists.")

    reg_date = cust.registration_date or datetime.now().strftime("%Y-%m-%d")

    # Store customer permanently in project database
    new_cust = CustomerDim(
        name=cust.name.strip(),
        email=clean_email,
        phone=clean_phone,
        age=cust.age,
        gender=cust.gender or "Male",
        location=cust.location or "Hyderabad",
        preferences=cust.preferences or "Indian",
        dietary_preferences=getattr(cust, "dietary_preferences", "Standard") or "Standard",
        registration_date=reg_date,
        status=cust.status or "Active"
    )

    db.add(new_cust)
    db.commit()
    db.refresh(new_cust)

    # Immediately attempt sending confirmation email
    email_ok, email_msg = send_account_creation_email(
        customer_name=new_cust.name,
        customer_id=new_cust.customer_id,
        mobile_number=new_cust.phone,
        email_address=new_cust.email
    )

    # Attach email delivery status to response without breaking customer creation
    new_cust.email_status = email_msg
    return new_cust

@router.get("/count")
def get_customer_count(db: Session = Depends(get_db)):
    """Fetch live total customer count from the database."""
    total = db.query(CustomerDim).count()
    active = db.query(CustomerDim).filter(CustomerDim.status == "Active").count()
    return {"total_customers": total, "active_customers": active}

@router.get("", response_model=List[CustomerOut])
@router.get("/", response_model=List[CustomerOut], include_in_schema=False)
def get_all_customers(
    q: Optional[str] = Query(None, description="Search by ID, name, email, phone, location, preferences"),
    status: Optional[str] = Query(None, description="Filter by status: Active, Inactive, All"),
    db: Session = Depends(get_db)
):
    """List all customers with optional search and filter, including order counts and spend statistics."""
    query = db.query(CustomerDim)

    if status and status.lower() != "all":
        query = query.filter(func.lower(CustomerDim.status) == status.lower())

    if q:
        search_term = q.strip()
        search_pattern = f"%{search_term}%"
        is_num = search_term.isdigit()

        if is_num:
            query = query.filter(
                (CustomerDim.customer_id == int(search_term)) |
                CustomerDim.name.ilike(search_pattern) |
                CustomerDim.email.ilike(search_pattern) |
                CustomerDim.phone.ilike(search_pattern) |
                CustomerDim.location.ilike(search_pattern) |
                CustomerDim.preferences.ilike(search_pattern)
            )
        else:
            query = query.filter(
                CustomerDim.name.ilike(search_pattern) |
                CustomerDim.email.ilike(search_pattern) |
                CustomerDim.phone.ilike(search_pattern) |
                CustomerDim.location.ilike(search_pattern) |
                CustomerDim.preferences.ilike(search_pattern)
            )

    customers = query.order_by(CustomerDim.customer_id.desc()).all()

    # Calculate metrics per customer
    results = []
    for c in customers:
        order_metrics = (
            db.query(
                func.count(OrderFact.order_id).label("total_orders"),
                func.sum(OrderFact.price * OrderFact.quantity).label("total_spent")
            )
            .filter(OrderFact.customer_id == c.customer_id)
            .first()
        )
        
        tot_orders = order_metrics.total_orders if order_metrics else 0
        tot_spent = round(float(order_metrics.total_spent or 0.0), 2)

        # Retrieve last order date from order history
        last_order = (
            db.query(TimeDim.date)
            .join(OrderFact, OrderFact.time_id == TimeDim.time_id)
            .filter(OrderFact.customer_id == c.customer_id)
            .order_by(OrderFact.order_id.desc())
            .first()
        )
        last_order_date = last_order[0] if last_order else "N/A"

        results.append({
            "customer_id": c.customer_id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "age": c.age,
            "gender": c.gender,
            "location": c.location,
            "preferences": c.preferences,
            "registration_date": c.registration_date,
            "status": c.status,
            "total_orders": tot_orders,
            "total_spent": tot_spent,
            "last_order_date": last_order_date
        })

    return results

@router.get("/{customer_id}")
def get_customer_profile(
    customer_id: int, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Fetch complete customer profile, aggregate stats, order history, and chart datasets."""
    verify_session_customer_access(authorization, customer_id)
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Fetch order history with joined dimension attributes
    orders_query = (
        db.query(OrderFact, FoodDim, TimeDim)
        .join(FoodDim, OrderFact.food_id == FoodDim.food_id)
        .join(TimeDim, OrderFact.time_id == TimeDim.time_id)
        .filter(OrderFact.customer_id == customer_id)
        .order_by(OrderFact.order_id.desc())
        .all()
    )

    order_history = []
    total_spending = 0.0
    ratings_sum = 0.0
    food_counts = {}
    cuisine_counts = {}
    category_counts = {}
    orders_by_date = {}
    spending_by_date = {}

    for order, food, time in orders_query:
        item_total = order.price * order.quantity
        total_spending += item_total
        ratings_sum += order.rating

        food_counts[food.food_name] = food_counts.get(food.food_name, 0) + order.quantity
        cuisine_counts[food.cuisine] = cuisine_counts.get(food.cuisine, 0) + order.quantity
        category_counts[food.category] = category_counts.get(food.category, 0) + order.quantity

        d_str = time.date
        orders_by_date[d_str] = orders_by_date.get(d_str, 0) + 1
        spending_by_date[d_str] = spending_by_date.get(d_str, 0.0) + item_total

        order_history.append({
            "order_id": order.order_id,
            "food_id": food.food_id,
            "food_name": food.food_name,
            "category": food.category,
            "cuisine": food.cuisine,
            "quantity": order.quantity,
            "price": order.price,
            "total_price": round(item_total, 2),
            "date": time.date,
            "time_of_day": time.time_of_day,
            "rating": order.rating,
            "payment_method": order.payment_method or "UPI",
            "payment_status": getattr(order, "payment_status", None) or ("Pending" if (order.payment_method or "").strip().lower() in ["cash on delivery", "cod"] else "Demo Payment Successful"),
            "order_status": order.order_status or "Completed",
            "order_source": getattr(order, "order_source", "Project App") or "Project App"
        })

    total_orders = len(order_history)
    avg_order_value = round(total_spending / total_orders, 2) if total_orders > 0 else 0.0
    avg_rating = round(ratings_sum / total_orders, 2) if total_orders > 0 else 0.0

    most_ordered_food = max(food_counts, key=food_counts.get) if food_counts else "None"
    most_preferred_cuisine = max(cuisine_counts, key=cuisine_counts.get) if cuisine_counts else customer.preferences
    last_order_date = order_history[0]["date"] if order_history else "N/A"

    # Format chart datasets
    sorted_dates = sorted(orders_by_date.keys())
    orders_over_time = [{"date": d, "orders": orders_by_date[d]} for d in sorted_dates]
    spending_over_time = [{"date": d, "spending": round(spending_by_date[d], 2)} for d in sorted_dates]
    category_distribution = [{"category": cat, "count": cnt} for cat, cnt in category_counts.items()]
    cuisine_distribution = [{"cuisine": cuis, "count": cnt} for cuis, cnt in cuisine_counts.items()]

    return {
        "customer": {
            "customer_id": customer.customer_id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "age": customer.age,
            "gender": customer.gender,
            "location": customer.location,
            "preferences": customer.preferences,
            "registration_date": customer.registration_date,
            "status": customer.status
        },
        "stats": {
            "total_orders": total_orders,
            "total_spending": round(total_spending, 2),
            "avg_order_value": avg_order_value,
            "avg_rating": avg_rating,
            "most_ordered_food": most_ordered_food,
            "most_preferred_cuisine": most_preferred_cuisine,
            "last_order_date": last_order_date
        },
        "order_history": order_history,
        "charts": {
            "orders_over_time": orders_over_time,
            "spending_over_time": spending_over_time,
            "category_distribution": category_distribution,
            "cuisine_distribution": cuisine_distribution
        }
    }

@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, cust_update: CustomerUpdate, db: Session = Depends(get_db)):
    """Edit existing customer details."""
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if cust_update.email:
        new_email = cust_update.email.strip().lower()
        if not validate_email_format(new_email):
            raise HTTPException(status_code=400, detail="Invalid email format.")
        
        # Check duplicate email
        existing = db.query(CustomerDim).filter(
            func.lower(CustomerDim.email) == new_email,
            CustomerDim.customer_id != customer_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Email '{new_email}' is already taken by another customer.")
        customer.email = new_email

    if cust_update.phone:
        new_phone = cust_update.phone.strip()
        existing = db.query(CustomerDim).filter(
            CustomerDim.phone == new_phone,
            CustomerDim.customer_id != customer_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Phone number '{new_phone}' is already taken.")
        customer.phone = new_phone

    if cust_update.name is not None:
        customer.name = cust_update.name.strip()
    if cust_update.age is not None:
        customer.age = cust_update.age
    if cust_update.gender is not None:
        customer.gender = cust_update.gender
    if cust_update.location is not None:
        customer.location = cust_update.location
    if cust_update.preferences is not None:
        customer.preferences = cust_update.preferences
    if cust_update.status is not None:
        customer.status = cust_update.status

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}")
def delete_or_deactivate_customer(
    customer_id: int,
    permanent: bool = Query(False, description="If true, permanently delete record from DB; otherwise toggle status to Inactive"),
    db: Session = Depends(get_db)
):
    """Deactivate or permanently delete a customer."""
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if permanent:
        db.delete(customer)
        db.commit()
        return {"message": f"Customer ID #{customer_id} permanently deleted.", "status": "deleted"}
    else:
        customer.status = "Inactive" if customer.status == "Active" else "Active"
        db.commit()
        return {"message": f"Customer ID #{customer_id} status updated to {customer.status}.", "status": customer.status}

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from ..database import get_db
from ..models import CustomerDim, FoodDim, BasketItem, OrderFact, TimeDim
from ..schemas import BasketItemAdd, BasketItemUpdate, BasketOut, BasketItemOut, CheckoutRequest
from .orders import get_or_create_time_dim, get_or_create_food_dim
from .auth import verify_session_customer_access

router = APIRouter(prefix="/api/basket", tags=["Basket & Cart"])

def get_basket_details(customer_id: int, db: Session) -> dict:
    """Retrieve all items in the customer basket and calculate totals."""
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer ID #{customer_id} does not exist.")

    rows = (
        db.query(BasketItem, FoodDim)
        .join(FoodDim, BasketItem.food_id == FoodDim.food_id)
        .filter(BasketItem.customer_id == customer_id)
        .order_by(BasketItem.item_id.asc())
        .all()
    )

    items = []
    total_items = 0
    subtotal = 0.0

    for b_item, food in rows:
        item_sub = round(b_item.quantity * food.price, 2)
        total_items += b_item.quantity
        subtotal += item_sub

        items.append({
            "item_id": b_item.item_id,
            "customer_id": b_item.customer_id,
            "food_id": food.food_id,
            "food_name": food.food_name,
            "category": food.category,
            "cuisine": food.cuisine,
            "price": food.price,
            "image_url": food.image_url,
            "quantity": b_item.quantity,
            "item_subtotal": item_sub,
            "added_at": b_item.added_at
        })

    return {
        "customer_id": customer_id,
        "items": items,
        "total_items": total_items,
        "subtotal": round(subtotal, 2),
        "grand_total": round(subtotal, 2)
    }

@router.get("/{customer_id}", response_model=BasketOut)
@router.get("/{customer_id}/", response_model=BasketOut, include_in_schema=False)
def get_customer_basket(
    customer_id: int, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Fetch all food items currently in the customer's shopping basket."""
    verify_session_customer_access(authorization, customer_id)
    return get_basket_details(customer_id=customer_id, db=db)

@router.post("", response_model=BasketOut)
@router.post("/", response_model=BasketOut, include_in_schema=False)
@router.post("/items", response_model=BasketOut, include_in_schema=False)
def add_to_basket(
    payload: BasketItemAdd, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Add an item to the customer's basket.
    If the same food item is already in the basket, increases its quantity.
    Returns the customer's updated basket.
    """
    verify_session_customer_access(authorization, payload.customer_id)
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found. Please log in first.")

    qty = payload.quantity if (payload.quantity is not None and payload.quantity > 0) else 1

    # Find food item by food_id or food_name
    food_item = None
    if payload.food_id:
        food_item = db.query(FoodDim).filter(FoodDim.food_id == payload.food_id).first()
    if not food_item and payload.food_name:
        food_item = db.query(FoodDim).filter(FoodDim.food_name.ilike(payload.food_name.strip())).first()

    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found in catalog.")

    # Check if this item is already in the customer's basket
    existing_item = (
        db.query(BasketItem)
        .filter(
            BasketItem.customer_id == payload.customer_id,
            BasketItem.food_id == food_item.food_id
        )
        .first()
    )

    if existing_item:
        existing_item.quantity += qty
    else:
        new_item = BasketItem(
            customer_id=payload.customer_id,
            food_id=food_item.food_id,
            quantity=qty,
            added_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.add(new_item)

    db.commit()
    return get_basket_details(customer_id=payload.customer_id, db=db)

@router.put("/{customer_id}/{item_id}", response_model=BasketOut)
@router.put("/{customer_id}/{item_id}/", response_model=BasketOut, include_in_schema=False)
def update_basket_item_quantity(
    customer_id: int, 
    item_id: int, 
    update: BasketItemUpdate, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update the quantity of an item in the customer's basket.
    item_id can be either the basket item_id or the food_id.
    If quantity <= 0, the item is removed.
    """
    verify_session_customer_access(authorization, customer_id)
    target = (
        db.query(BasketItem)
        .filter(
            BasketItem.customer_id == customer_id,
            (BasketItem.item_id == item_id) | (BasketItem.food_id == item_id)
        )
        .first()
    )

    if not target:
        raise HTTPException(status_code=404, detail="Item not found in basket.")

    if update.quantity <= 0:
        db.delete(target)
    else:
        target.quantity = update.quantity

    db.commit()
    return get_basket_details(customer_id=customer_id, db=db)

@router.delete("/{customer_id}/{item_id}", response_model=BasketOut)
@router.delete("/{customer_id}/{item_id}/", response_model=BasketOut, include_in_schema=False)
def remove_from_basket(
    customer_id: int, 
    item_id: int, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Remove a specific item from the customer's basket."""
    verify_session_customer_access(authorization, customer_id)
    target = (
        db.query(BasketItem)
        .filter(
            BasketItem.customer_id == customer_id,
            (BasketItem.item_id == item_id) | (BasketItem.food_id == item_id)
        )
        .first()
    )

    if target:
        db.delete(target)
        db.commit()

    return get_basket_details(customer_id=customer_id, db=db)

@router.delete("/{customer_id}", response_model=BasketOut)
@router.delete("/{customer_id}/", response_model=BasketOut, include_in_schema=False)
def clear_customer_basket(
    customer_id: int, 
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Empty all items from the customer's basket."""
    verify_session_customer_access(authorization, customer_id)
    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    db.query(BasketItem).filter(BasketItem.customer_id == customer_id).delete()
    db.commit()
    return get_basket_details(customer_id=customer_id, db=db)

@router.post("/{customer_id}/checkout")
@router.post("/{customer_id}/checkout/", include_in_schema=False)
@router.post("/checkout")
def checkout_basket(
    customer_id: Optional[int] = None,
    req: Optional[CheckoutRequest] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Checkout all items in customer's basket:
    1. Validates that basket is not empty.
    2. Creates individual OrderFact records for each basket item with shared timestamp.
    3. Clears the customer's basket.
    4. Returns order confirmation with generated order IDs and details.
    """
    target_customer_id = customer_id or (req.customer_id if req else None)
    if not target_customer_id:
        raise HTTPException(status_code=400, detail="Customer ID is required to place an order.")

    verify_session_customer_access(authorization, target_customer_id)

    customer = db.query(CustomerDim).filter(CustomerDim.customer_id == target_customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer ID #{target_customer_id} does not exist.")

    basket_rows = (
        db.query(BasketItem, FoodDim)
        .join(FoodDim, BasketItem.food_id == FoodDim.food_id)
        .filter(BasketItem.customer_id == target_customer_id)
        .all()
    )

    if not basket_rows:
        raise HTTPException(status_code=400, detail="Your basket is empty. Please add items before placing an order.")

    now = datetime.now()
    order_date = now.strftime("%Y-%m-%d")
    order_time_str = now.strftime("%H:%M:%S")

    # Determine time of day
    hour = now.hour
    tod = "Dinner" if hour >= 18 else ("Lunch" if hour >= 12 else ("Breakfast" if hour >= 6 else "Late Night"))
    if req and req.time_of_day:
        tod = req.time_of_day

    time_entry = get_or_create_time_dim(db, date_str=order_date, time_of_day=tod)

    payment_method = (req.payment_method if req and req.payment_method else "UPI")
    order_source = (req.order_source if req and req.order_source else "Project App")

    # Payment status logic: Cash on Delivery -> "Pending", UPI/Card demo -> "Demo Payment Successful"
    if req and req.payment_status:
        payment_status = req.payment_status
    elif payment_method.strip().lower() in ["cash on delivery", "cod"]:
        payment_status = "Pending"
    else:
        payment_status = "Demo Payment Successful"

    created_facts = []
    total_amount = 0.0
    total_items = 0

    for b_item, food in basket_rows:
        line_total = round(food.price * b_item.quantity, 2)
        total_amount += line_total
        total_items += b_item.quantity

        fact = OrderFact(
            customer_id=target_customer_id,
            food_id=food.food_id,
            time_id=time_entry.time_id,
            quantity=b_item.quantity,
            price=food.price,
            rating=5.0,
            payment_method=payment_method,
            payment_status=payment_status,
            order_status="Completed",
            order_source=order_source
        )
        db.add(fact)
        created_facts.append({
            "fact": fact,
            "food": food,
            "quantity": b_item.quantity,
            "line_total": line_total
        })

    db.commit()

    # Clear customer basket
    db.query(BasketItem).filter(BasketItem.customer_id == target_customer_id).delete()
    db.commit()

    for item in created_facts:
        db.refresh(item["fact"])

    primary_order_id = created_facts[0]["fact"].order_id
    order_ids = [item["fact"].order_id for item in created_facts]

    items_detail = [
        {
            "order_id": item["fact"].order_id,
            "food_id": item["food"].food_id,
            "food_name": item["food"].food_name,
            "category": item["food"].category,
            "cuisine": item["food"].cuisine,
            "price": item["food"].price,
            "quantity": item["quantity"],
            "subtotal": item["line_total"],
            "image_url": item["food"].image_url
        }
        for item in created_facts
    ]

    return {
        "status": "success",
        "message": f"Order #{primary_order_id} placed successfully!",
        "order_id": primary_order_id,
        "order_ids": order_ids,
        "customer_id": customer.customer_id,
        "customer_name": customer.name,
        "order_date": order_date,
        "order_time": order_time_str,
        "time_of_day": tod,
        "payment_method": payment_method,
        "payment_status": payment_status,
        "order_status": "Completed",
        "order_source": order_source,
        "total_amount": round(total_amount, 2),
        "total_items": total_items,
        "items": items_detail
    }

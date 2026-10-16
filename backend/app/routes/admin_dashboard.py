from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..models import CustomerDim, FoodDim, OrderFact, TimeDim

router = APIRouter(prefix="/api/admin/dashboard", tags=["Admin Dashboard"])

@router.get("/stats")
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch Admin Dashboard KPIs and system overview statistics."""
    total_customers = db.query(CustomerDim).count()
    active_customers = db.query(CustomerDim).filter(CustomerDim.status == "Active").count()
    total_orders = db.query(OrderFact).count()
    total_foods = db.query(FoodDim).count()

    avg_rating_res = db.query(func.avg(OrderFact.rating)).scalar()
    avg_rating = round(float(avg_rating_res or 4.5), 1)

    total_revenue_res = db.query(func.sum(OrderFact.price * OrderFact.quantity)).scalar()
    total_revenue = round(float(total_revenue_res or 0.0), 2)

    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    # Most Ordered Food
    top_food_query = (
        db.query(FoodDim.food_name, func.sum(OrderFact.quantity).label("total_qty"))
        .join(OrderFact, FoodDim.food_id == OrderFact.food_id)
        .group_by(FoodDim.food_name)
        .order_by(desc("total_qty"))
        .first()
    )
    most_ordered_food = top_food_query[0] if top_food_query else "Biryani"

    # Most Popular Cuisine
    top_cuisine_query = (
        db.query(FoodDim.cuisine, func.sum(OrderFact.quantity).label("total_qty"))
        .join(OrderFact, FoodDim.food_id == OrderFact.food_id)
        .group_by(FoodDim.cuisine)
        .order_by(desc("total_qty"))
        .first()
    )
    most_popular_cuisine = top_cuisine_query[0] if top_cuisine_query else "Indian"

    # Top Ordered Food Items for overview / trending lists
    top_foods_query = (
        db.query(
            FoodDim.food_name,
            FoodDim.category,
            FoodDim.cuisine,
            func.count(OrderFact.order_id).label("order_count"),
            func.avg(OrderFact.rating).label("avg_rating")
        )
        .join(OrderFact, FoodDim.food_id == OrderFact.food_id)
        .group_by(FoodDim.food_name, FoodDim.category, FoodDim.cuisine)
        .order_by(desc("order_count"))
        .limit(10)
        .all()
    )
    top_foods = [
        {
            "food_name": f.food_name,
            "category": f.category,
            "cuisine": f.cuisine,
            "order_count": f.order_count,
            "avg_rating": round(float(f.avg_rating or 4.5), 1)
        }
        for f in top_foods_query
    ]

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "total_orders": total_orders,
        "total_foods": total_foods,
        "avg_rating": avg_rating,
        "total_revenue": total_revenue,
        "avg_order_value": avg_order_value,
        "most_ordered_food": most_ordered_food,
        "most_popular_cuisine": most_popular_cuisine,
        "top_foods": top_foods
    }

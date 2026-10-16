from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.recommendation_engine import RecommendationEngine
from ..services.apriori_service import AprioriService

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.get("/complementary")
def get_complementary_recommendations(
    food_ids: Optional[str] = Query(None, description="Comma-separated food IDs in the current basket"),
    food_names: Optional[str] = Query(None, description="Comma-separated food names in the current basket"),
    limit: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db)
):
    """
    Recommend complementary items frequently purchased together using Apriori association rule mining.
    Filters out items already in the basket and returns rules with lift, confidence, and support metrics.
    """
    parsed_ids = []
    if food_ids:
        for part in food_ids.split(","):
            part_str = part.strip()
            if part_str.isdigit():
                parsed_ids.append(int(part_str))

    parsed_names = []
    if food_names:
        parsed_names = [n.strip() for n in food_names.split(",") if n.strip()]

    service = AprioriService(db)
    return service.get_complementary_recommendations(
        basket_food_ids=parsed_ids if parsed_ids else None,
        basket_food_names=parsed_names if parsed_names else None,
        limit=limit
    )

@router.get("/{customer_id}")

def get_customer_recommendations(
    customer_id: int,
    top_n: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Fetch personalized food recommendations with natural language AI explanations."""
    engine = RecommendationEngine(db)
    return engine.generate_recommendations_for_customer(customer_id=customer_id, top_n=top_n)

@router.get("/{customer_id}/likely-next-order")
def get_likely_next_order(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """Predict likely next food order for the customer based on repeat patterns, intervals, and dining trends."""
    engine = RecommendationEngine(db)
    return engine.predict_likely_next_order(customer_id=customer_id)

@router.get("/{customer_id}/frequent")
def get_customer_frequent_orders_rec(
    customer_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Fetch customer's most frequently ordered dishes and ordering sources."""
    engine = RecommendationEngine(db)
    return engine.get_frequent_orders(customer_id=customer_id, limit=limit)


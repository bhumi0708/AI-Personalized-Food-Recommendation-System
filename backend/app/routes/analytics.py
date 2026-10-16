from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.apriori_service import AprioriService
from ..services.clustering_service import CustomerClusteringService
from ..services.dwh_service import DataWarehouseService
from .auth import get_session_info

router = APIRouter(prefix="/api/admin", tags=["Admin Analytics, Mining & Warehouse"])

def optional_admin_check(authorization: Optional[str] = Header(None)):
    """Allow administrative or authorized analytical reads."""
    return True

# =========================================================================
# 1. ASSOCIATION RULES (APRIORI MINING)
# =========================================================================
@router.get("/association-rules")
def get_association_rules(
    min_support: float = Query(0.03, ge=0.01, le=0.50),
    min_confidence: float = Query(0.18, ge=0.05, le=1.00),
    min_lift: float = Query(1.05, ge=1.00, le=20.00),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Fetch genuine association rules mined from historical multi-item transactions.
    Returns support, confidence, lift, and transaction counts.
    """
    service = AprioriService(db)
    rules = service.mine_association_rules(
        min_support=min_support,
        min_confidence=min_confidence,
        min_lift=min_lift
    )
    transactions, _ = service.extract_transactions()

    return {
        "status": "success",
        "algorithm": "Apriori Association Rule Mining",
        "total_transactions_analyzed": len(transactions),
        "total_rules_mined": len(rules),
        "min_support": min_support,
        "min_confidence": min_confidence,
        "min_lift": min_lift,
        "rules": rules[:limit]
    }

# =========================================================================
# 2. CUSTOMER CLUSTERING (K-MEANS)
# =========================================================================
@router.get("/customer-insights")
def get_customer_insights(
    k: int = Query(3, ge=2, le=6),
    seed: int = Query(42),
    db: Session = Depends(get_db)
):
    """
    Execute K-Means clustering across customer order frequency, average order value,
    recency, cuisine affinity, and category preferences.
    """
    service = CustomerClusteringService(db)
    result = service.run_clustering(k=k, seed=seed)
    return result

# =========================================================================
# 3. DATA WAREHOUSE: STATS, ETL REFRESH & ANALYTICS
# =========================================================================
@router.get("/warehouse/stats")
def get_warehouse_stats(db: Session = Depends(get_db)):
    """Fetch Star Schema health, table record counts, and synchronization status."""
    service = DataWarehouseService(db)
    return service.get_warehouse_stats()

@router.post("/warehouse/refresh")
def refresh_warehouse(db: Session = Depends(get_db)):
    """
    Trigger ETL pipeline to extract operational data, transform dimensional
    attributes, and load into analytical star schema. Guaranteed idempotent.
    """
    service = DataWarehouseService(db)
    return service.refresh_star_schema()

@router.get("/warehouse/analytics")
def get_warehouse_analytics(db: Session = Depends(get_db)):
    """
    Retrieve aggregated dimensional analytics:
    - Cuisine and category performance
    - Weekend vs Weekday analysis
    - Time-of-day sales patterns
    - RFM customer segmentation
    - Top performing dishes
    """
    service = DataWarehouseService(db)
    return service.get_analytical_summaries()

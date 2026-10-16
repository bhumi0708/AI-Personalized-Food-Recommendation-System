import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .routes import auth, recommendations, admin, customers, orders, admin_dashboard, basket, analytics

# Initialize tables
Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_database(db)
        # Ensure analytical Star Schema tables are initialized and populated
        from .services.dwh_service import DataWarehouseService
        DataWarehouseService(db).refresh_star_schema()
    finally:
        db.close()
    yield

app = FastAPI(
    title="AI Personalized Food Recommendation System API",
    description="AI-powered personalized food recommendations and order intelligence API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8001",
        "http://localhost:8001",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for active modules
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(admin_dashboard.router)
app.include_router(recommendations.router)
app.include_router(admin.router)
app.include_router(basket.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": "AI-Based Personalized Food Recommendation System",
        "description": "AI-powered food recommendation and order intelligence system",
        "docs_url": "/docs"
    }

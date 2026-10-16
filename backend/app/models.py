from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class CustomerDim(Base):
    __tablename__ = "dim_customer"

    customer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    age = Column(Integer)
    gender = Column(String(20))
    location = Column(String(100))
    preferences = Column(String(255))
    dietary_preferences = Column(String(100), default="Standard")
    registration_date = Column(String(20), nullable=True)
    status = Column(String(20), default="Active")

    orders = relationship("OrderFact", back_populates="customer", cascade="all, delete-orphan")
    basket_items = relationship("BasketItem", back_populates="customer", cascade="all, delete-orphan")

class FoodDim(Base):
    __tablename__ = "dim_food"

    food_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    food_name = Column(String(100), nullable=False)
    category = Column(String(50))
    cuisine = Column(String(50))
    price = Column(Float)
    image_url = Column(String(255))

    orders = relationship("OrderFact", back_populates="food", cascade="all, delete-orphan")
    basket_items = relationship("BasketItem", back_populates="food", cascade="all, delete-orphan")

class TimeDim(Base):
    __tablename__ = "dim_time"

    time_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String(20), nullable=False)
    day = Column(String(20))
    month = Column(Integer)
    year = Column(Integer)
    time_of_day = Column(String(20))
    season = Column(String(20))

    orders = relationship("OrderFact", back_populates="time", cascade="all, delete-orphan")

class OrderFact(Base):
    __tablename__ = "fact_order"

    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("dim_customer.customer_id"), nullable=False)
    food_id = Column(Integer, ForeignKey("dim_food.food_id"), nullable=False)
    time_id = Column(Integer, ForeignKey("dim_time.time_id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float)
    rating = Column(Float)
    payment_method = Column(String(50), default="UPI")
    payment_status = Column(String(50), default="Completed")
    order_status = Column(String(30), default="Completed")
    order_source = Column(String(50), default="Project App")

    customer = relationship("CustomerDim", back_populates="orders")
    food = relationship("FoodDim", back_populates="orders")
    time = relationship("TimeDim", back_populates="orders")

class BasketItem(Base):
    __tablename__ = "customer_basket"

    item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("dim_customer.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    food_id = Column(Integer, ForeignKey("dim_food.food_id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, default=1, nullable=False)
    added_at = Column(String(30), nullable=True)

    customer = relationship("CustomerDim", back_populates="basket_items")
    food = relationship("FoodDim", back_populates="basket_items")


# =========================================================================
# ANALYTICAL DATA WAREHOUSE (STAR SCHEMA)
# Dimensional analytical data mart mirroring operational data with surrogate
# keys, analytical aggregates, and idempotent refresh guarantees.
# =========================================================================

class DwhCustomerDim(Base):
    __tablename__ = "dwh_dim_customer"

    customer_key = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, unique=True, index=True, nullable=False) # Natural key
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    location = Column(String(100), nullable=True)
    preferred_cuisine = Column(String(100), nullable=True)
    dietary_preferences = Column(String(100), default="Standard")
    customer_status = Column(String(20), default="Active")
    registration_date = Column(String(20), nullable=True)
    total_lifetime_orders = Column(Integer, default=0)
    total_lifetime_spend = Column(Float, default=0.0)
    rfm_segment = Column(String(50), default="New")

    order_items = relationship("DwhOrderItemFact", back_populates="customer")


class DwhFoodDim(Base):
    __tablename__ = "dwh_dim_food"

    food_key = Column(Integer, primary_key=True, index=True, autoincrement=True)
    food_id = Column(Integer, unique=True, index=True, nullable=False) # Natural key
    food_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    cuisine = Column(String(50), nullable=True)
    unit_price = Column(Float, nullable=False)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Integer, default=1) # 1=Active, 0=Inactive

    order_items = relationship("DwhOrderItemFact", back_populates="food")


class DwhDateDim(Base):
    __tablename__ = "dwh_dim_date"

    date_key = Column(Integer, primary_key=True, index=True, autoincrement=True)
    time_id = Column(Integer, unique=True, index=True, nullable=False) # Natural key
    full_date = Column(String(20), nullable=False)
    day_of_week = Column(String(20), nullable=True)
    is_weekend = Column(Integer, default=0)
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    quarter = Column(Integer, nullable=True)
    time_of_day = Column(String(20), nullable=True)
    season = Column(String(20), nullable=True)

    order_items = relationship("DwhOrderItemFact", back_populates="date")


class DwhOrderItemFact(Base):
    __tablename__ = "dwh_fact_order_item"

    fact_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, unique=True, index=True, nullable=False) # Operational order ID ensuring idempotency
    customer_key = Column(Integer, ForeignKey("dwh_dim_customer.customer_key"), nullable=False)
    food_key = Column(Integer, ForeignKey("dwh_dim_food.food_key"), nullable=False)
    date_key = Column(Integer, ForeignKey("dwh_dim_date.date_key"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False)
    rating = Column(Float, default=4.5)
    payment_method = Column(String(50), default="UPI")
    order_status = Column(String(30), default="Completed")
    order_source = Column(String(50), default="Project App")
    is_completed = Column(Integer, default=1)

    customer = relationship("DwhCustomerDim", back_populates="order_items")
    food = relationship("DwhFoodDim", back_populates="order_items")
    date = relationship("DwhDateDim", back_populates="order_items")


from pydantic import BaseModel, EmailStr
from typing import List, Optional

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    age: int
    gender: str
    location: str
    preferences: str
    dietary_preferences: Optional[str] = "Standard"
    registration_date: Optional[str] = None
    status: Optional[str] = "Active"

class CustomerCreate(CustomerBase):
    pass

class CustomerRegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    age: int
    gender: str = "Male"
    location: str = "Hyderabad"
    preferences: str = "Indian"
    dietary_preferences: Optional[str] = "Standard"

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    preferences: Optional[str] = None
    dietary_preferences: Optional[str] = None
    status: Optional[str] = None

class CustomerOut(CustomerBase):
    customer_id: int
    total_orders: Optional[int] = 0
    total_spent: Optional[float] = 0.0
    last_order_date: Optional[str] = "N/A"
    email_status: Optional[str] = None

    class Config:
        from_attributes = True

class MobileLoginRequest(BaseModel):
    mobile_number: str

class OTPRequest(BaseModel):
    mobile_number: str

class OTPVerifyRequest(BaseModel):
    mobile_number: str
    otp: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class FoodBase(BaseModel):
    food_name: str
    category: str
    cuisine: str
    price: float
    image_url: Optional[str] = None

class FoodCreate(FoodBase):
    pass

class FoodOut(FoodBase):
    food_id: int
    class Config:
        from_attributes = True

class TimeOut(BaseModel):
    time_id: int
    date: str
    day: str
    month: int
    year: int
    time_of_day: str
    season: str
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: int
    food_id: Optional[int] = None
    food_name: Optional[str] = None
    category: Optional[str] = "Main Course"
    cuisine: Optional[str] = "Indian"
    quantity: int = 1
    price: Optional[float] = None
    rating: float = 4.5
    order_date: Optional[str] = None
    time_of_day: Optional[str] = "Dinner"
    payment_method: Optional[str] = "UPI"
    payment_status: Optional[str] = "Completed"
    order_status: Optional[str] = "Completed"
    order_source: Optional[str] = "Project App"

class OrderUpdate(BaseModel):
    quantity: Optional[int] = None
    price: Optional[float] = None
    rating: Optional[float] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    order_status: Optional[str] = None
    time_of_day: Optional[str] = None
    order_date: Optional[str] = None
    order_source: Optional[str] = None

class OrderOut(BaseModel):
    order_id: int
    customer_id: int
    food_id: int
    time_id: int
    quantity: int
    price: float
    rating: float
    payment_method: Optional[str] = "UPI"
    payment_status: Optional[str] = "Completed"
    order_status: Optional[str] = "Completed"
    order_source: Optional[str] = "Project App"
    customer_name: Optional[str] = None
    food_name: Optional[str] = None
    category: Optional[str] = None
    cuisine: Optional[str] = None
    date: Optional[str] = None
    time_of_day: Optional[str] = None

    class Config:
        from_attributes = True

class CustomerProfileStats(BaseModel):
    total_orders: int
    total_spending: float
    avg_order_value: float
    avg_rating: float
    most_ordered_food: str
    most_preferred_cuisine: str
    last_order_date: str

class RecommendationResponse(BaseModel):
    food_id: int
    food_name: str
    category: str
    cuisine: str
    price: float
    image_url: str
    rating: float
    recommendation_type: str
    reasons: List[str]
    score: float

class FrequentOrderItem(BaseModel):
    food_id: int
    food_name: str
    category: Optional[str] = "Main Course"
    cuisine: Optional[str] = "Indian"
    price: Optional[float] = 0.0
    image_url: Optional[str] = None
    order_count: int
    total_quantity: int
    last_order_date: Optional[str] = None
    last_order_days_ago: Optional[str] = None
    sources: dict = {}
    frequency_pct: Optional[float] = 0.0

class NextOrderPredictionResponse(BaseModel):
    has_prediction: bool
    food_id: Optional[int] = None
    food_name: Optional[str] = None
    category: Optional[str] = None
    cuisine: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    confidence_level: Optional[str] = None
    reason: str
    factors: List[str] = []
    order_count: Optional[int] = 0
    last_ordered_days_ago: Optional[str] = None
    last_order_date: Optional[str] = None
    order_sources: Optional[dict] = None

class BasketItemAdd(BaseModel):
    customer_id: int
    food_id: Optional[int] = None
    food_name: Optional[str] = None
    quantity: Optional[int] = 1

class BasketItemUpdate(BaseModel):
    quantity: int

class BasketItemOut(BaseModel):
    item_id: int
    customer_id: int
    food_id: int
    food_name: str
    category: str
    cuisine: str
    price: float
    image_url: Optional[str] = None
    quantity: int
    item_subtotal: float
    added_at: Optional[str] = None

    class Config:
        from_attributes = True

class BasketOut(BaseModel):
    customer_id: int
    items: List[BasketItemOut] = []
    total_items: int = 0
    subtotal: float = 0.0
    grand_total: float = 0.0

class CheckoutRequest(BaseModel):
    customer_id: Optional[int] = None
    payment_method: Optional[str] = "UPI"
    payment_status: Optional[str] = None
    order_source: Optional[str] = "Project App"
    time_of_day: Optional[str] = "Dinner"

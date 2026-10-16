# AI-Based Personalized Food Recommendation System

> **AI-Powered Food Recommendation & Order Intelligence System**

---

## 📌 Project Overview

This project is a full-stack AI food recommendation web application. It uses customer profiles, previous orders, food preferences, and historical behavior to provide personalized recommendations and predict likely next orders with explainable AI reasoning.

---

## 🚀 Active Modules

1. **Overview**:
   - High-level KPIs and metrics: Total Customers, Total Orders, Food Catalog size, and Average Rating.
   - End-to-end recommendation pipeline visualizer.
   - Popular & trending dishes.

2. **Customer Portal**:
   - Customer profile details and cuisine preferences.
   - Personalized recommendations with natural language AI reasoning.
   - Frequently ordered together pairings and next-order predictions.
   - Order history and rating submission.

3. **AI Recommendations**:
   - Dynamic explainable AI food recommendations tailored to customer taste profiles.
   - Multi-factor scoring combining cuisine affinity, order co-occurrence, ratings, and customer favorites.
   - Search and filtering by cuisine and category.

4. **Admin Panel**:
   - Customer management (create, update, view, and deactivate customers).
   - Menu catalog management (add new food items with category, cuisine, and price).
   - Order management and live analytics.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite), HTML5, CSS3, Lucide Icons.
- **Backend**: Python, FastAPI, Uvicorn, SQLAlchemy.
- **Database**: SQLite (`food_dwh.db`) & MySQL DDL script (`schema.sql`).
- **Data**: Food.com recipe & interaction datasets preserved in `backend/`.

---

## 📂 Database Architecture

```
                     ┌──────────────────┐
                     │   dim_customer   │
                     │ (customer_id PK) │
                     └────────┬─────────┘
                              │ 1
                              │
                              │ N
┌──────────────────┐ 1      N ┌─────────┴────────┐ N      1 ┌──────────────────┐
│     dim_food     ├──────────┤    fact_order    ├──────────┤     dim_time     │
│  (food_id PK)    │          │  (order_id PK)   │          │   (time_id PK)   │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

---

## 🏁 How to Run Locally

### 1. Backend Setup & Run

```bash
# Navigate to backend directory or project root
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (Port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup & Run

```bash
# Open terminal and navigate to frontend directory
cd frontend

# Install dependencies (if needed)
npm install

# Start Vite dev server (Port 5173)
npm run dev
```
- Web Application UI: `http://127.0.0.1:5173/`

---

## 📡 API Endpoint Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/customers` | Fetch customer directory for quick switching |
| `POST` | `/api/auth/login` | Simulate login for Customer or Admin |
| `GET` | `/api/recommendations/{customer_id}` | Generate personalized explainable food recommendations |
| `GET` | `/api/customers` | Search and filter registered customers with order stats |
| `POST` | `/api/customers` | Create new customer profile |
| `GET` | `/api/customers/{customer_id}` | Complete customer profile, order history, and stats |
| `PUT` | `/api/customers/{customer_id}` | Update customer details |
| `DELETE` | `/api/customers/{customer_id}` | Deactivate or delete customer |
| `GET` | `/api/orders` | Search, filter, and sort global orders list |
| `POST` | `/api/orders` | Place/record a customer order |
| `PUT` | `/api/orders/{order_id}` | Update order details |
| `DELETE` | `/api/orders/{order_id}` | Delete/cancel an order |
| `GET` | `/api/admin/dashboard/stats` | High-level system KPIs, revenue, and popular foods |
| `POST` | `/api/admin/food` | Add a new food item to catalog |
| `POST` | `/api/admin/customer` | Add a new customer profile |
| `POST` | `/api/admin/order` | Create an order record |

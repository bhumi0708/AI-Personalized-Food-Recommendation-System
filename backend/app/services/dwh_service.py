from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models import (
    CustomerDim, FoodDim, TimeDim, OrderFact,
    DwhCustomerDim, DwhFoodDim, DwhDateDim, DwhOrderItemFact
)

class DataWarehouseService:
    """
    Analytical Star Schema ETL and Business Intelligence Service.
    Transforms operational OLTP tables into an analytical dimensional model,
    enforces idempotency on refreshes, and provides aggregated analytical marts.
    """

    def __init__(self, db: Session):
        self.db = db

    def refresh_star_schema(self) -> Dict[str, Any]:
        """
        Extract operational records, transform into analytical star schema dimensions
        and fact items, and load with natural key matching.
        Guarantees that repeated executions never duplicate records.
        """
        start_time = datetime.now()

        # ---------------------------------------------------------
        # 1. Dimension: Customers (dwh_dim_customer)
        # ---------------------------------------------------------
        op_customers = self.db.query(CustomerDim).all()
        # Compute lifetime metrics per customer from operational fact_order
        cust_aggregates = (
            self.db.query(
                OrderFact.customer_id,
                func.count(OrderFact.order_id).label("total_orders"),
                func.sum(OrderFact.price * OrderFact.quantity).label("total_spend")
            )
            .filter(OrderFact.order_status == "Completed")
            .group_by(OrderFact.customer_id)
            .all()
        )
        cust_agg_map = {row[0]: (row[1] or 0, float(row[2] or 0.0)) for row in cust_aggregates}

        dwh_cust_map = {c.customer_id: c for c in self.db.query(DwhCustomerDim).all()}
        cust_synced = 0

        for c in op_customers:
            tot_orders, tot_spend = cust_agg_map.get(c.customer_id, (0, 0.0))
            
            # Compute RFM Persona
            if tot_orders >= 25 and tot_spend >= 5000:
                rfm = "Champions"
            elif tot_orders >= 12:
                rfm = "Loyal Customers"
            elif tot_orders >= 4:
                rfm = "Potential Loyalists"
            elif tot_orders >= 1:
                rfm = "Recent Diners"
            else:
                rfm = "New / Dormant"

            if c.customer_id in dwh_cust_map:
                # Update existing dimensional record
                d_cust = dwh_cust_map[c.customer_id]
                d_cust.name = c.name
                d_cust.email = c.email
                d_cust.phone = c.phone
                d_cust.age = c.age
                d_cust.gender = c.gender
                d_cust.location = c.location
                d_cust.preferred_cuisine = c.preferences
                d_cust.dietary_preferences = getattr(c, "dietary_preferences", "Standard")
                d_cust.customer_status = c.status
                d_cust.registration_date = c.registration_date
                d_cust.total_lifetime_orders = tot_orders
                d_cust.total_lifetime_spend = round(tot_spend, 2)
                d_cust.rfm_segment = rfm
            else:
                # Insert new dimensional record
                d_cust = DwhCustomerDim(
                    customer_id=c.customer_id,
                    name=c.name,
                    email=c.email,
                    phone=c.phone,
                    age=c.age,
                    gender=c.gender,
                    location=c.location,
                    preferred_cuisine=c.preferences,
                    dietary_preferences=getattr(c, "dietary_preferences", "Standard"),
                    customer_status=c.status,
                    registration_date=c.registration_date,
                    total_lifetime_orders=tot_orders,
                    total_lifetime_spend=round(tot_spend, 2),
                    rfm_segment=rfm
                )
                self.db.add(d_cust)
            cust_synced += 1

        self.db.commit()

        # Re-fetch customer_key lookup
        customer_key_lookup = {c.customer_id: c.customer_key for c in self.db.query(DwhCustomerDim).all()}

        # ---------------------------------------------------------
        # 2. Dimension: Food Items (dwh_dim_food)
        # ---------------------------------------------------------
        op_foods = self.db.query(FoodDim).all()
        dwh_food_map = {f.food_id: f for f in self.db.query(DwhFoodDim).all()}
        food_synced = 0

        for f in op_foods:
            if f.food_id in dwh_food_map:
                d_food = dwh_food_map[f.food_id]
                d_food.food_name = f.food_name
                d_food.category = f.category
                d_food.cuisine = f.cuisine
                d_food.unit_price = f.price
                d_food.image_url = f.image_url
                d_food.is_active = 1
            else:
                d_food = DwhFoodDim(
                    food_id=f.food_id,
                    food_name=f.food_name,
                    category=f.category,
                    cuisine=f.cuisine,
                    unit_price=f.price,
                    image_url=f.image_url,
                    is_active=1
                )
                self.db.add(d_food)
            food_synced += 1

        self.db.commit()

        # Re-fetch food_key lookup
        food_key_lookup = {f.food_id: f.food_key for f in self.db.query(DwhFoodDim).all()}

        # ---------------------------------------------------------
        # 3. Dimension: Date & Time (dwh_dim_date)
        # ---------------------------------------------------------
        op_times = self.db.query(TimeDim).all()
        dwh_date_map = {t.time_id: t for t in self.db.query(DwhDateDim).all()}
        date_synced = 0

        for t in op_times:
            # Determine is_weekend
            is_wknd = 1 if (t.day or "").strip().lower() in ["saturday", "sunday"] else 0
            m = t.month or 1
            quarter = (m - 1) // 3 + 1

            if t.time_id in dwh_date_map:
                d_date = dwh_date_map[t.time_id]
                d_date.full_date = t.date
                d_date.day_of_week = t.day
                d_date.is_weekend = is_wknd
                d_date.month = t.month
                d_date.year = t.year
                d_date.quarter = quarter
                d_date.time_of_day = t.time_of_day
                d_date.season = t.season
            else:
                d_date = DwhDateDim(
                    time_id=t.time_id,
                    full_date=t.date,
                    day_of_week=t.day,
                    is_weekend=is_wknd,
                    month=t.month,
                    year=t.year,
                    quarter=quarter,
                    time_of_day=t.time_of_day,
                    season=t.season
                )
                self.db.add(d_date)
            date_synced += 1

        self.db.commit()

        # Re-fetch date_key lookup
        date_key_lookup = {t.time_id: t.date_key for t in self.db.query(DwhDateDim).all()}

        # ---------------------------------------------------------
        # 4. Fact Table: Order Items (dwh_fact_order_item)
        # Grain: 1 row per order item transaction
        # ---------------------------------------------------------
        op_orders = self.db.query(OrderFact).all()
        dwh_facts_map = {f.order_id: f for f in self.db.query(DwhOrderItemFact).all()}
        facts_synced = 0

        for o in op_orders:
            ck = customer_key_lookup.get(o.customer_id)
            fk = food_key_lookup.get(o.food_id)
            dk = date_key_lookup.get(o.time_id)

            if not ck or not fk or not dk:
                continue

            qty = o.quantity or 1
            unit_p = float(o.price or 0.0)
            line_tot = round(qty * unit_p, 2)
            is_comp = 1 if o.order_status == "Completed" else 0

            if o.order_id in dwh_facts_map:
                f_item = dwh_facts_map[o.order_id]
                f_item.customer_key = ck
                f_item.food_key = fk
                f_item.date_key = dk
                f_item.quantity = qty
                f_item.unit_price = unit_p
                f_item.line_total = line_tot
                f_item.rating = float(o.rating or 4.5)
                f_item.payment_method = o.payment_method or "UPI"
                f_item.order_status = o.order_status or "Completed"
                f_item.order_source = getattr(o, "order_source", "Project App") or "Project App"
                f_item.is_completed = is_comp
            else:
                f_item = DwhOrderItemFact(
                    order_id=o.order_id, # Natural key guarantee
                    customer_key=ck,
                    food_key=fk,
                    date_key=dk,
                    quantity=qty,
                    unit_price=unit_p,
                    line_total=line_tot,
                    rating=float(o.rating or 4.5),
                    payment_method=o.payment_method or "UPI",
                    order_status=o.order_status or "Completed",
                    order_source=getattr(o, "order_source", "Project App") or "Project App",
                    is_completed=is_comp
                )
                self.db.add(f_item)
            facts_synced += 1

        self.db.commit()
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        return {
            "status": "success",
            "message": "Analytical Star Schema ETL refresh completed successfully without duplicates.",
            "customers_synced": cust_synced,
            "foods_synced": food_synced,
            "dates_synced": date_synced,
            "fact_order_items_synced": facts_synced,
            "duration_ms": duration_ms,
            "refreshed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_warehouse_stats(self) -> Dict[str, Any]:
        """Return warehouse table health and record counts."""
        dwh_cust_count = self.db.query(DwhCustomerDim).count()
        dwh_food_count = self.db.query(DwhFoodDim).count()
        dwh_date_count = self.db.query(DwhDateDim).count()
        dwh_fact_count = self.db.query(DwhOrderItemFact).count()

        op_cust_count = self.db.query(CustomerDim).count()
        op_food_count = self.db.query(FoodDim).count()
        op_time_count = self.db.query(TimeDim).count()
        op_order_count = self.db.query(OrderFact).count()

        is_synced = (dwh_fact_count == op_order_count and dwh_cust_count == op_cust_count)

        return {
            "schema_type": "Analytical Star Schema (Kimball Methodology)",
            "status": "Healthy & Synchronized" if is_synced else "Active (Pending Sync)",
            "is_synchronized": is_synced,
            "tables": {
                "dwh_dim_customer": {"count": dwh_cust_count, "operational_source": "dim_customer", "source_count": op_cust_count},
                "dwh_dim_food": {"count": dwh_food_count, "operational_source": "dim_food", "source_count": op_food_count},
                "dwh_dim_date": {"count": dwh_date_count, "operational_source": "dim_time", "source_count": op_time_count},
                "dwh_fact_order_item": {"count": dwh_fact_count, "operational_source": "fact_order", "source_count": op_order_count}
            }
        }

    def get_analytical_summaries(self) -> Dict[str, Any]:
        """
        Aggregate analytical marts for executive business intelligence:
        - Revenue by Category & Cuisine
        - Weekend vs Weekday Trends
        - Time of Day Distribution
        - Top Selling Dishes
        - Customer RFM Segmentation
        """
        # Ensure facts exist
        fact_count = self.db.query(DwhOrderItemFact).count()
        if fact_count == 0:
            self.refresh_star_schema()

        # 1. Total Metrics
        total_revenue_row = (
            self.db.query(
                func.sum(DwhOrderItemFact.line_total),
                func.sum(DwhOrderItemFact.quantity),
                func.avg(DwhOrderItemFact.line_total)
            )
            .filter(DwhOrderItemFact.is_completed == 1)
            .first()
        )
        total_rev = round(float(total_revenue_row[0] or 0.0), 2)
        total_items_sold = int(total_revenue_row[1] or 0)
        avg_item_value = round(float(total_revenue_row[2] or 0.0), 2)

        # 2. Revenue & Volume by Cuisine
        cuisine_rows = (
            self.db.query(
                DwhFoodDim.cuisine,
                func.sum(DwhOrderItemFact.line_total).label("revenue"),
                func.count(DwhOrderItemFact.fact_id).label("orders_count"),
                func.sum(DwhOrderItemFact.quantity).label("units")
            )
            .join(DwhFoodDim, DwhOrderItemFact.food_key == DwhFoodDim.food_key)
            .filter(DwhOrderItemFact.is_completed == 1)
            .group_by(DwhFoodDim.cuisine)
            .order_by(desc("revenue"))
            .all()
        )
        by_cuisine = [
            {
                "cuisine": row[0] or "Other",
                "revenue": round(float(row[1] or 0.0), 2),
                "orders_count": int(row[2] or 0),
                "units_sold": int(row[3] or 0),
                "pct_of_revenue": round((float(row[1] or 0.0) / total_rev * 100), 1) if total_rev > 0 else 0.0
            }
            for row in cuisine_rows
        ]

        # 3. Revenue & Volume by Category
        category_rows = (
            self.db.query(
                DwhFoodDim.category,
                func.sum(DwhOrderItemFact.line_total).label("revenue"),
                func.count(DwhOrderItemFact.fact_id).label("orders_count")
            )
            .join(DwhFoodDim, DwhOrderItemFact.food_key == DwhFoodDim.food_key)
            .filter(DwhOrderItemFact.is_completed == 1)
            .group_by(DwhFoodDim.category)
            .order_by(desc("revenue"))
            .all()
        )
        by_category = [
            {
                "category": row[0] or "Other",
                "revenue": round(float(row[1] or 0.0), 2),
                "orders_count": int(row[2] or 0)
            }
            for row in category_rows
        ]

        # 4. Weekend vs Weekday Performance
        weekend_rows = (
            self.db.query(
                DwhDateDim.is_weekend,
                func.sum(DwhOrderItemFact.line_total).label("revenue"),
                func.count(DwhOrderItemFact.fact_id).label("orders_count")
            )
            .join(DwhDateDim, DwhOrderItemFact.date_key == DwhDateDim.date_key)
            .filter(DwhOrderItemFact.is_completed == 1)
            .group_by(DwhDateDim.is_weekend)
            .all()
        )
        weekend_analysis = {
            "Weekday": {"revenue": 0.0, "orders_count": 0},
            "Weekend": {"revenue": 0.0, "orders_count": 0}
        }
        for row in weekend_rows:
            label = "Weekend" if row[0] == 1 else "Weekday"
            weekend_analysis[label] = {
                "revenue": round(float(row[1] or 0.0), 2),
                "orders_count": int(row[2] or 0)
            }

        # 5. Time of Day Distribution
        tod_rows = (
            self.db.query(
                DwhDateDim.time_of_day,
                func.sum(DwhOrderItemFact.line_total).label("revenue"),
                func.count(DwhOrderItemFact.fact_id).label("orders_count")
            )
            .join(DwhDateDim, DwhOrderItemFact.date_key == DwhDateDim.date_key)
            .filter(DwhOrderItemFact.is_completed == 1)
            .group_by(DwhDateDim.time_of_day)
            .all()
        )
        by_time_of_day = [
            {
                "time_of_day": row[0] or "Dinner",
                "revenue": round(float(row[1] or 0.0), 2),
                "orders_count": int(row[2] or 0)
            }
            for row in tod_rows
        ]

        # 6. Top 8 Best Selling Dishes
        top_foods_rows = (
            self.db.query(
                DwhFoodDim.food_name,
                DwhFoodDim.category,
                DwhFoodDim.cuisine,
                DwhFoodDim.unit_price,
                func.sum(DwhOrderItemFact.quantity).label("units_sold"),
                func.sum(DwhOrderItemFact.line_total).label("total_revenue")
            )
            .join(DwhFoodDim, DwhOrderItemFact.food_key == DwhFoodDim.food_key)
            .filter(DwhOrderItemFact.is_completed == 1)
            .group_by(DwhFoodDim.food_name, DwhFoodDim.category, DwhFoodDim.cuisine, DwhFoodDim.unit_price)
            .order_by(desc("units_sold"))
            .limit(8)
            .all()
        )
        top_dishes = [
            {
                "food_name": row[0],
                "category": row[1],
                "cuisine": row[2],
                "price": float(row[3]),
                "units_sold": int(row[4] or 0),
                "total_revenue": round(float(row[5] or 0.0), 2)
            }
            for row in top_foods_rows
        ]

        # 7. Customer RFM Segmentation Distribution
        rfm_rows = (
            self.db.query(
                DwhCustomerDim.rfm_segment,
                func.count(DwhCustomerDim.customer_key).label("cust_count"),
                func.sum(DwhCustomerDim.total_lifetime_spend).label("spend")
            )
            .group_by(DwhCustomerDim.rfm_segment)
            .order_by(desc("cust_count"))
            .all()
        )
        rfm_segments = [
            {
                "segment": row[0] or "New",
                "customer_count": int(row[1] or 0),
                "total_spend": round(float(row[2] or 0.0), 2)
            }
            for row in rfm_rows
        ]

        return {
            "total_revenue": total_rev,
            "total_items_sold": total_items_sold,
            "avg_item_value": avg_item_value,
            "by_cuisine": by_cuisine,
            "by_category": by_category,
            "weekend_analysis": weekend_analysis,
            "by_time_of_day": by_time_of_day,
            "top_dishes": top_dishes,
            "rfm_segments": rfm_segments
        }

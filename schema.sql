-- Relational & Analytical Schema DDL for MySQL
-- Title: AI-Based Personalized Food Recommendation System
-- Contains Operational (OLTP) Tables and Analytical Star Schema (OLAP) Data Mart

CREATE DATABASE IF NOT EXISTS food_recommendation_db;
USE food_recommendation_db;

-- ============================================================================
-- 1. OPERATIONAL TABLES (OLTP)
-- ============================================================================

-- 1.1 Customer Table
CREATE TABLE IF NOT EXISTS dim_customer (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    age INT,
    gender VARCHAR(20),
    location VARCHAR(100),
    preferences VARCHAR(255),
    dietary_preferences VARCHAR(100) DEFAULT 'Standard',
    registration_date VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Active'
);

-- 1.2 Food Catalog Table
CREATE TABLE IF NOT EXISTS dim_food (
    food_id INT PRIMARY KEY AUTO_INCREMENT,
    food_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    cuisine VARCHAR(50),
    price DECIMAL(10, 2),
    image_url VARCHAR(255)
);

-- 1.3 Order Time Dimension Table
CREATE TABLE IF NOT EXISTS dim_time (
    time_id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    day VARCHAR(20),
    month INT,
    year INT,
    time_of_day VARCHAR(20),
    season VARCHAR(20)
);

-- 1.4 Operational Order Records Table
CREATE TABLE IF NOT EXISTS fact_order (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    food_id INT NOT NULL,
    time_id INT NOT NULL,
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2),
    rating DECIMAL(3, 2),
    payment_method VARCHAR(50) DEFAULT 'UPI',
    payment_status VARCHAR(50) DEFAULT 'Completed',
    order_status VARCHAR(30) DEFAULT 'Completed',
    order_source VARCHAR(50) DEFAULT 'Project App',
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES dim_food(food_id) ON DELETE CASCADE,
    FOREIGN KEY (time_id) REFERENCES dim_time(time_id) ON DELETE CASCADE
);

-- 1.5 Customer Shopping Basket Table
CREATE TABLE IF NOT EXISTS customer_basket (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at VARCHAR(30),
    FOREIGN KEY (customer_id) REFERENCES dim_customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES dim_food(food_id) ON DELETE CASCADE
);

-- Indices for operational query performance
CREATE INDEX idx_order_customer ON fact_order(customer_id);
CREATE INDEX idx_order_food ON fact_order(food_id);
CREATE INDEX idx_order_time ON fact_order(time_id);
CREATE INDEX idx_basket_customer ON customer_basket(customer_id);

-- ============================================================================
-- 2. ANALYTICAL STAR SCHEMA DATA WAREHOUSE (OLAP)
-- ============================================================================

-- 2.1 Analytical Customer Dimension (SCD-ready with RFM attributes)
CREATE TABLE IF NOT EXISTS dwh_dim_customer (
    customer_key INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    age INT,
    gender VARCHAR(20),
    location VARCHAR(100),
    preferred_cuisine VARCHAR(100),
    dietary_preferences VARCHAR(100) DEFAULT 'Standard',
    customer_status VARCHAR(20) DEFAULT 'Active',
    registration_date VARCHAR(20),
    total_lifetime_orders INT DEFAULT 0,
    total_lifetime_spend DECIMAL(10, 2) DEFAULT 0.00,
    rfm_segment VARCHAR(50) DEFAULT 'New'
);

-- 2.2 Analytical Food Dimension
CREATE TABLE IF NOT EXISTS dwh_dim_food (
    food_key INT PRIMARY KEY AUTO_INCREMENT,
    food_id INT NOT NULL UNIQUE,
    food_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    cuisine VARCHAR(50),
    unit_price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    is_active INT DEFAULT 1
);

-- 2.3 Analytical Date/Time Dimension
CREATE TABLE IF NOT EXISTS dwh_dim_date (
    date_key INT PRIMARY KEY AUTO_INCREMENT,
    time_id INT NOT NULL UNIQUE,
    full_date VARCHAR(20) NOT NULL,
    day_of_week VARCHAR(20),
    is_weekend INT DEFAULT 0,
    month INT,
    year INT,
    quarter INT,
    time_of_day VARCHAR(20),
    season VARCHAR(20)
);

-- 2.4 Analytical Order Item Fact Table (Grain: 1 row per order item)
CREATE TABLE IF NOT EXISTS dwh_fact_order_item (
    fact_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL UNIQUE, -- Natural key ensuring idempotent refreshes without duplicates
    customer_key INT NOT NULL,
    food_key INT NOT NULL,
    date_key INT NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    line_total DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 4.50,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    order_status VARCHAR(30) DEFAULT 'Completed',
    order_source VARCHAR(50) DEFAULT 'Project App',
    is_completed INT DEFAULT 1,
    FOREIGN KEY (customer_key) REFERENCES dwh_dim_customer(customer_key) ON DELETE CASCADE,
    FOREIGN KEY (food_key) REFERENCES dwh_dim_food(food_key) ON DELETE CASCADE,
    FOREIGN KEY (date_key) REFERENCES dwh_dim_date(date_key) ON DELETE CASCADE
);

-- Indices for analytical star schema queries
CREATE INDEX idx_dwh_fact_customer ON dwh_fact_order_item(customer_key);
CREATE INDEX idx_dwh_fact_food ON dwh_fact_order_item(food_key);
CREATE INDEX idx_dwh_fact_date ON dwh_fact_order_item(date_key);

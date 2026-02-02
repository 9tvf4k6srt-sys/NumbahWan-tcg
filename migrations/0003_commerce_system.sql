-- ============================================================================
-- NumbahWan Commerce System Database Schema
-- Version: 1.0.0
-- Created: 2026-02-02
-- Description: Guild member business platform - shops, products, orders
-- ============================================================================

-- ============================================================================
-- BUSINESSES TABLE - Member shops/storefronts
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_device_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', -- general, grocery, restaurant, services, crafts
    emoji TEXT DEFAULT '🏪',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, pending, suspended
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_device_uuid) REFERENCES citizens(device_uuid)
);

-- ============================================================================
-- PRODUCTS TABLE - Items listed by businesses
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_zh TEXT,
    name_th TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other', -- grocery, food, crafts, services, other
    price INTEGER NOT NULL,
    original_price INTEGER, -- for sales
    stock INTEGER DEFAULT 0,
    emoji TEXT DEFAULT '📦',
    badge TEXT, -- organic, sale, new, hot, premium
    status TEXT NOT NULL DEFAULT 'active', -- active, draft, sold_out, deleted
    sales_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- ============================================================================
-- ORDERS TABLE - Purchase records
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL, -- NW-ORD-XXXXX format
    buyer_device_uuid TEXT NOT NULL,
    seller_device_uuid TEXT NOT NULL,
    business_id INTEGER NOT NULL,
    store_type TEXT NOT NULL, -- supermarket, restaurant, services
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER DEFAULT 0,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, cancelled, refunded
    payment_status TEXT NOT NULL DEFAULT 'paid', -- paid, refunded
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (buyer_device_uuid) REFERENCES citizens(device_uuid),
    FOREIGN KEY (seller_device_uuid) REFERENCES citizens(device_uuid),
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- ============================================================================
-- ORDER_ITEMS TABLE - Individual items in an order
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_emoji TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================================================
-- BUSINESS_REVIEWS TABLE - Customer reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    reviewer_device_uuid TEXT NOT NULL,
    order_id INTEGER,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (reviewer_device_uuid) REFERENCES citizens(device_uuid),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ============================================================================
-- SERVICE_BOOKINGS TABLE - Service appointments
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_number TEXT UNIQUE NOT NULL, -- NW-SVC-XXXXX format
    service_id INTEGER NOT NULL,
    provider_device_uuid TEXT NOT NULL,
    client_device_uuid TEXT NOT NULL,
    client_name TEXT,
    client_contact TEXT,
    booking_date DATE NOT NULL,
    details TEXT,
    price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, in_progress, completed, cancelled
    payment_status TEXT NOT NULL DEFAULT 'paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES products(id),
    FOREIGN KEY (provider_device_uuid) REFERENCES citizens(device_uuid),
    FOREIGN KEY (client_device_uuid) REFERENCES citizens(device_uuid)
);

-- ============================================================================
-- INDEXES - For query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_device_uuid);
CREATE INDEX IF NOT EXISTS idx_businesses_type ON businesses(type);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_device_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_device_uuid);
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON business_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON business_reviews(reviewer_device_uuid);

CREATE INDEX IF NOT EXISTS idx_bookings_service ON service_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON service_bookings(provider_device_uuid);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON service_bookings(client_device_uuid);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON service_bookings(booking_date);

-- ============================================================================
-- INITIAL DATA - Sample businesses (no foreign key constraints on system entries)
-- Note: These are system-owned businesses, actual member businesses will be created via API
-- ============================================================================
-- Skipping initial data - businesses will be created by actual members via the /my-business page

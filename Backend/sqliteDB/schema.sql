PRAGMA foreign_keys = ON;

-- ======================
-- CUSTOMERS
-- ======================
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    date_of_birth TEXT,
    customer_category TEXT,
    table_number INTEGER,
    created_at TEXT,
    last_login TEXT
);

-- ======================
-- CUSTOMER AUTH (separate for security)
-- ======================
CREATE TABLE customer_auth (
    customer_id TEXT PRIMARY KEY,
    otp_hash TEXT,
    otp_expires_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- MENU
-- ======================
CREATE TABLE menu (
    item_id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    base_price REAL,
    low_cap_price REAL,
    high_cap_price REAL,
    current_price REAL,
    description TEXT,
    is_active INTEGER
);

-- ======================
-- ORDERS
-- ======================
CREATE TABLE orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT,
    order_price REAL,
    created_at TEXT,
    status TEXT,
    table_number INTEGER,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- ORDER ITEMS
-- ======================
CREATE TABLE order_items (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT,
    item_id TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (item_id) REFERENCES menu(item_id)
);

-- ======================
-- CUSTOMER PREFERENCES
-- ======================
CREATE TABLE customer_preferences (
    customer_id TEXT PRIMARY KEY,
    dietary_type TEXT,
    preferred_soup TEXT,
    favorite_bun TEXT,
    dessert_preference TEXT,
    updated_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- CUSTOMER ACTIVITIES
-- ======================
CREATE TABLE customer_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    activities TEXT,
    insights TEXT,
    created_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- CUSTOMER INSIGHTS
-- ======================
CREATE TABLE customer_insights (
    customer_id TEXT PRIMARY KEY,
    dietary TEXT,
    favorites TEXT,
    aov REAL,
    frequency REAL,
    attitude TEXT,
    customer_score REAL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- REVIEWS
-- ======================
CREATE TABLE reviews (
    review_id TEXT PRIMARY KEY,
    customer_id TEXT,
    review_datetime TEXT,
    food_quality INTEGER,
    service INTEGER,
    cleanliness INTEGER,
    value_for_money INTEGER,
    overall_experience INTEGER,
    comments TEXT,
    review_type TEXT,
    urgency TEXT,
    assigned_to TEXT,
    actions_needed TEXT,
    internal_comments TEXT,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- CHATS
-- ======================
CREATE TABLE chats (
    chat_id TEXT PRIMARY KEY,
    customer_id TEXT,
    chat_datetime TEXT,
    session_text TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ======================
-- CAMPAIGNS
-- ======================
CREATE TABLE campaigns (
    campaign_id TEXT PRIMARY KEY,
    text TEXT,
    target_customer_category TEXT,
    start_datetime TEXT,
    end_datetime TEXT,
    message_count INTEGER,
    campaign_type TEXT,
    status TEXT,
    message_template_1 TEXT,
    message_send_timing_1 TEXT,
    message_template_2 TEXT,
    message_send_timing_2 TEXT,
    message_template_3 TEXT,
    message_send_timing_3 TEXT,
    message_template_4 TEXT,
    message_send_timing_4 TEXT,
    message_template_5 TEXT,
    message_send_timing_5 TEXT,
    message_template_6 TEXT,
    message_send_timing_6 TEXT,
    message_template_7 TEXT,
    message_send_timing_7 TEXT,
    message_template_8 TEXT,
    message_send_timing_8 TEXT,
    message_template_9 TEXT,
    message_send_timing_9 TEXT,
    message_template_10 TEXT,
    message_send_timing_10 TEXT
);

-- INDEXES
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ======================
-- STAFF / DASHBOARD USERS
-- ======================
CREATE TABLE IF NOT EXISTS staff (
    staff_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'staff',   -- 'admin', 'manager', 'chef', 'staff'
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
);

-- ======================
-- STAFF AUTH
-- ======================
CREATE TABLE IF NOT EXISTS staff_auth (
    staff_id TEXT PRIMARY KEY,
    otp_hash TEXT,
    otp_expires_at TEXT,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);
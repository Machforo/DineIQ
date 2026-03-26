# DineIQ Codebase Overview

## 1. BACKEND API ROUTES STRUCTURE

### Auth Routes (`/auth`)
FastAPI endpoints for customer authentication:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/signup` | POST | Signup with name, email, phone, table_number → sends OTP |
| `/auth/check-user` | POST | Check if user exists by email or phone → sends OTP |
| `/auth/verify-otp` | POST | Verify OTP, returns customer_id, name, email, table_number |

**Data Flow:**
- Signup checks for conflicts (duplicate email/phone)
- OTP generated (6-digit random) and hashed with SHA256
- OTP expires after 300 seconds
- Gmail is used to send OTPs (via GmailClient service)

### Order Routes (Root level)
FastAPI endpoints for order management:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pricing-strategy` | POST | Calculate subtotal, discounts, nudges (frontend calls this for pricing) |
| `/place-order` | POST | Create order in SQLite, sync to sheets, trigger categorization agent |
| `/order-history/{email}` | GET | Fetch all orders for customer |
| `/coupons` | GET | Fetch available coupons |
| `/call-waiter` | POST | Alert waiter (webhook/notification) |
| `/active-order/{table_number}` | GET | Get current order for table |

**Pricing Strategy Logic:**
- Normalizes cart items from frontend (handles `id` vs `Item_ID`, `price` vs `Current_Price`)
- Fetches order count from SQLite for loyalty/coupon eligibility
- Returns `pricing_agent.get_pricing_strategy(subtotal, order_count, items_normalized)`

**Place Order Process:**
1. Generates sequential order ID: `Ord_0001`, `Ord_0002`, etc.
2. Looks up customer by email from `customers` table
3. Inserts into `orders` table (order_id, customer_id, order_price, created_at, status, table_number)
4. Inserts items into `order_items` table (order_item_id, order_id, item_id, quantity, price)
5. **Triggers categorization agent** (`categorize_single_customer`) after order saved

### Other Routers Included
- **Menu** (`/menu`) - Fetch personalized menu
- **Recommendations** (root level) - `/item-addons`, `/ai-pitch` for upsells
- **Chatbot** (`/chatbot`) - AI chat
- **Campaigns** (`/campaigns`) - Marketing campaigns
- **Monitoring** (`/activity`) - Activity logs & AI insights
- **Reviews** (`/reviews`) - Customer feedback

---

## 2. DATABASE SCHEMA (SQLite)

### Core Tables

**customers**
```sql
customer_id TEXT PRIMARY KEY
name TEXT
email TEXT (unique-ish, checked in code)
phone TEXT (unique-ish, checked in code)
date_of_birth TEXT
customer_category TEXT
table_number INTEGER
created_at TEXT
last_login TEXT
```

**customer_auth** (OTP storage)
```sql
customer_id TEXT PRIMARY KEY (FK → customers)
otp_hash TEXT (SHA256 hash)
otp_expires_at TEXT
```

**orders**
```sql
order_id TEXT PRIMARY KEY (e.g., "Ord_0001")
customer_id TEXT (FK → customers)
order_price REAL
created_at TEXT
status TEXT (e.g., "CREATED")
table_number INTEGER
```

**order_items**
```sql
order_item_id TEXT PRIMARY KEY (e.g., "Ord_0001_Item_0001")
order_id TEXT (FK → orders)
item_id TEXT (FK → menu)
quantity INTEGER
price REAL
```

**menu**
```sql
item_id TEXT PRIMARY KEY
name TEXT
category TEXT
base_price REAL
low_cap_price REAL
high_cap_price REAL
current_price REAL
description TEXT
is_active INTEGER
```

**Additional Tables:**
- `customer_preferences` - dietary types, preferences
- `customer_activities` - activity logs
- `customer_insights` - scores, AOV, frequency, attitude
- `reviews` - feedback (food_quality, service, cleanliness, value_for_money, overall_experience)
- `chats` - chat sessions
- `campaigns` - marketing campaigns with templated messages

**Indexes:**
- `idx_orders_customer` on `orders(customer_id)`
- `idx_order_items_order` on `order_items(order_id)`

---

## 3. LOCAL SERVER CURRENT STATE

### **local-server/main.py** - FastAPI Server
**Architecture:** Python FastAPI with WebSocket hub for real-time kitchen/staff communication

```python
# Routes
POST /orders              → Create order, broadcast to clients
GET  /orders              → Get all orders
PATCH /orders/{id}/status → Update status, broadcast
POST /sync                → Trigger cloud sync

# WebSocket
WS /ws                    → Subscribe all clients (kitchen, manager, waiters)
```

**Database:** SQLite with simple schema
```sql
orders (
  id TEXT PRIMARY KEY,
  table_no TEXT,
  items TEXT (JSON),
  status TEXT DEFAULT 'pending',
  sync_status TEXT DEFAULT 'pending_sync',
  created_at TEXT,
  updated_at TEXT
)
```

**Real-time Flow:**
1. Order created → broadcast to all connected WebSocket clients
2. Status updates → broadcast to all clients
3. Separate sync job sends data to cloud

### **local-server/db.py** - Database Setup
Simple SQLite initialization and connection handler:
```python
DB_PATH = "dineiq_local.db"
get_db()      → Returns sqlite3 connection
init_db()     → Creates orders table if not exists
```

### **local-server/sync.py** - EMPTY
Currently empty—no sync logic implemented yet.

**Missing Implementation Needed:**
- Cloud sync logic (push local SQLite to Backend/Google Sheets)
- Conflict resolution strategy
- Retry mechanism

---

## 4. FRONTEND API CALLS (Webapp)

### **Webapp/src/config.ts**
```typescript
API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"
```

### **Webapp/src/api.ts** - Main API Client
Exports `const api = { ... }` with methods:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `fetchMenu(email)` | POST `/menu` | Get personalized menu |
| `fetchOffers()` | GET `/offers` | Get offers/campaigns |
| `savePreferences(email, prefs)` | POST `/save-preferences` | Save dietary/preferences |
| `fetchRecommendations(email, itemId, skipPitch)` | POST `/item-addons` | Get add-ons/upsells |
| `fetchAiPitch(itemName, category, recs)` | POST `/ai-pitch` | Get AI sales pitch |
| `getPricingStrategy(email, cartItems)` | POST `/pricing-strategy` | Get discounts, nudges |
| `fetchUpsellItems()` | GET `/upsell-items` | Get available upsells |
| `fetchCoupons()` | GET `/coupons` | Get coupon list |
| `generateCombos(num, customerId)` | POST `/generate-combos` | Generate combo offers |
| `fetchOrderHistory(email)` | GET `/order-history/{email}` | Get order history |
| `placeOrder(orderData)` | POST `/place-order` | Finalize order |

**Request Format Example (placeOrder):**
```typescript
{
  customer_email: "user@example.com",
  cart_items: [
    {
      Item_ID: "item123",
      Item_Name: "Burger",
      Current_Price: 9.99,
      quantity: 2,
      category: "Burgers"
    }
  ],
  discount_amount: 2.00,
  final_total: 17.98,
  instructions: "No onions",
  table_number: "5"
}
```

**Note:** Frontend normalizes both field name styles (id/Item_ID, price/Current_Price) to handle backend variations.

---

## 5. WEBAPP STRUCTURE

### **Pages** (`Webapp/src/pages/`)
- `HomeScreen.tsx` - Main menu/browsing
- `CartPage.tsx` - Shopping cart with recommendations & pricing nudges
- `LoginScreen.tsx` - OTP authentication
- `PreferenceScreen.tsx` - Dietary preferences
- `ProfilePage.tsx` - User profile
- `OrderHistoryPage.tsx` - Past orders
- `TrackOrderPage.tsx` - Real-time order tracking
- `ReviewPage.tsx` - Submit feedback
- `ChatbotPage.tsx` - AI chat interface
- `Payment.tsx` - Stripe/payment integration
- `SplashScreen.tsx` - Loading/startup
- `NotFound.tsx` - 404 error

### **Components** (`Webapp/src/components/`)
**UI Components:**
- `DishCard.tsx` - Menu item card
- `CartBar.tsx` - Cart display
- `BestsellerRow.tsx` - Bestseller carousel
- `OfferCarousel.tsx` - Offer/campaign carousel

**Functional Components:**
- `AIButton.tsx` - Trigger AI features
- `AIComboCard.tsx` - Display AI-generated combos
- `ComboCard.tsx` - Combo offer card
- `HomeHeader.tsx` - Top navigation
- `CategoryScroll.tsx` - Menu category filter
- `MenuSection.tsx` - Menu section display

**Context/Utilities:**
- `InstallPrompt.tsx` - PWA install prompt
- `Offlinebanner.tsx` - Shows offline status
- `SessionControls.tsx` - Session management
- `SidebarMenu.tsx` - Mobile navigation

**Payment Dummies:**
- `CashDummyModal.tsx`, `StripeDummyModal.tsx` - Payment simulation

**Chat Components:**
- `ChatInput.tsx`, `ChatMessage.tsx`, `TranscriptModal.tsx`

**UI Library:** `ui/` folder (shadcn/ui components)

### **Contexts** (`Webapp/src/contexts/`)
- `CartContext` - Cart state management
- `UserContext` - User session/auth state

---

## 6. PACKAGE.JSON DEPENDENCIES

### **Webapp/package.json**
```json
{
  "name": "vite_react_shadcn_ts",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Key Dependencies:**
- **UI Framework:** React 18.3.1, React DOM 18.3.1
- **UI Components:** 30+ @radix-ui/* (accordion, dialog, dropdown, tabs, etc.)
- **Form Handling:** react-hook-form 7.61.1, @hookform/resolvers 3.10.0
- **Styling:** TailwindCSS (tailwind.config.ts exists), clsx, class-variance-authority
- **State Management:** @tanstack/react-query 5.83.0
- **Routing:** react-router-dom 6.30.1
- **Payment:** @stripe/stripe-js 8.6.3
- **Charting:** recharts 2.15.4
- **Utilities:** date-fns 3.6.0, lucide-react (icons), framer-motion (animations)
- **QR Code:** html5-qrcode 2.3.8
- **OTP Input:** input-otp 1.4.2
- **Notifications:** sonner (toast notifications)

### **Dashboard/package.json**
Similar to Webapp but:
- Adds: framer-motion 12.38.0 (animations)
- Adds: @stripe/stripe-js 8.6.3
- Removes: framer-motion from the shortened section (but same tech stack)

---

## 7. KEY ARCHITECTURAL PATTERNS

### Backend Workflow
1. **Request** → Route handler
2. **Validation** → Pydantic models
3. **Service Layer** → Database queries via `sqlite_db` service
4. **Agent Layer** → AI logic (pricing, recommendations, categorization)
5. **Sync** → Progressive sync to Google Sheets (async task)

### Frontend Workflow
1. **User Action** → Component state update
2. **API Call** → Fetch via `api.ts` client
3. **Context Update** → Cart/User context
4. **Re-render** → Component displays new state
5. **Offline Support** → `offlineApi` utility for PWA

### Real-time Kitchen Operations
- Local server WebSocket hub for instant status updates
- No polling—true pub/sub model
- Sync job handles cloud propagation

---

## 8. INTEGRATION POINTS

### Customer Flow
1. **Login:** Email OTP → `/auth/verify-otp` → `customer_id` token
2. **Browse:** `/menu` (personalized based on history)
3. **Add to Cart:** `/item-addons` (get recommendations)
4. **Checkout:** `/pricing-strategy` (discounts, nudges)
5. **Place Order:** `/place-order` → SQLite → Categorization Agent
6. **Kitchen:** Local server WebSocket broadcasts order
7. **Track:** `/active-order/{table_number}` / WebSocket updates

### Manager Dashboard
- Reviews: `/reviews` endpoints
- Campaigns: `/campaigns` CRUD
- Analytics: Aggregated from `customer_insights`, orders
- Activity: `/activity` for logs

---

## Summary Table

| Layer | Tech | Purpose |
|-------|------|---------|
| **Backend** | FastAPI, SQLite, Python Agents | API, DB, AI logic |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS | Customer UI |
| **Kitchen** | Fast API, WebSocket, Python | Real-time order hub |
| **Database** | SQLite (local) + Google Sheets (cloud) | Persistent storage + sync |
| **Auth** | OTP via Gmail | Customer verification |
| **Pricing** | PricingAgent | Dynamic discounts |
| **Categorization** | Categorization Agent | Customer segmentation |


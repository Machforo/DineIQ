# DineIQ Offline-First Architecture

Complete offline-first system for DineIQ with **local server sync**, **browser caching**, and **conflict resolution**.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Webapp/Dashboard)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Service    │  │  IndexedDB   │  │    Sync Engine   │  │
│  │   Worker     │->│   (Dexie)    │->│   (Queue/Retry)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│        │                   △                    │            │
│        └───────────────────┼────────────────────┘            │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
        ┌───────────▼─────────┐  ┌─────▼──────────────┐
        │  Local Server       │  │  Cloud API         │
        │  (Mini PC LAN)      │  │  (dineiq-backend)  │
        │  ┌───────────────┐  │  │                    │
        │  │ FastAPI + WS  │  │  │  FastAPI + Routes  │
        │  │ sync.py       │  │  │                    │
        │  │ SQLite        │  │  │  PostgreSQL        │
        │  │ Broadcasting  │  │  │                    │
        │  └───────────────┘  │  │                    │
        └─────────────────────┘  └────────────────────┘
```

## 📦 Components

### 1. **IndexedDB Offline Store** (Dexie.js)
- **Files**: `offlineOrderStore.ts` (Webapp & Dashboard)
- **Purpose**: Local database for storing orders, status updates, and sync conflicts
- **Schema**:
  ```
  orders: tempOrderId, customerId, items, syncStatus (pending_sync|synced|conflict|failed)
  conflicts: orderId, localVersion, serverVersion, conflictType
  ```

### 2. **Sync Engine**
- **Files**: `syncEngine.ts` (Webapp)
- **Purpose**: Intelligent queue management, retry logic, conflict resolution
- **Features**:
  - Auto-sync every 30s
  - Exponential backoff (5s → 10s → 20s)
  - Conflict detection & recording
  - Manual retry capability

### 3. **Service Worker**
- **Files**: `public/service-worker.ts` (Webapp & Dashboard)
- **Purpose**: Offline asset caching, network interception
- **Strategies**:
  - Static assets: cache-first
  - API calls: network-first with cache fallback
  - Navigation: network-first

### 4. **Local Server Sync**
- **Files**: `DineIQ/local-server/sync.py`
- **Purpose**: Background sync to cloud with connectivity check
- **Features**:
  - Async sync loop
  - Cloud API posting
  - Conflict resolution
  - Health check endpoint

### 5. **Offline API Wrapper**
- **Files**: `hooks/useOfflineMode.ts` (Webapp & Dashboard)
- **Purpose**: Unified interface for offline operations
- **Exports**: `placeOrder()`, `triggerSync()`, `getSyncStats()`

---

## 🚀 Setup & Integration

### Step 1: Webapp Main.tsx

```tsx
import initializeWebappOfflineMode from './init/initOfflineMode';

// In App.tsx or main.tsx, call during initialization:
useEffect(() => {
  initializeWebappOfflineMode();
}, []);
```

### Step 2: Dashboard Main.tsx

```tsx
import initializeDashboardOfflineMode, { 
  preloadOrdersToCache 
} from './init/initOfflineMode';

useEffect(() => {
  initializeDashboardOfflineMode();
}, []);

// When fetching orders from API:
const orders = await fetchOrders();
await preloadOrdersToCache(orders);
```

### Step 3: Update `package.json` Dependencies

Both Webapp and Dashboard need Dexie.js:

```bash
npm install dexie
# or
bun add dexie
```

### Step 4: Manifest.json

Both apps now have PWA manifest files configured:
- Webapp: `public/manifest.json`
- Dashboard: `public/manifest.json`

### Step 5: HTML Head Tags

Add to both apps' `index.html`:

```html
<head>
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/icons/icon-192x192.png">
  <meta name="apple-mobile-web-app-capable" content="true">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
</head>
```

---

## 💻 Webapp Usage

### Place Order (Works Offline)

```typescript
import { placeOrder } from './hooks/useOfflineMode';

const result = await placeOrder(
  customerId,
  items,
  totalAmount,
  appliedDiscount,
  paymentMethod,
  {
    specialInstructions: "No onions",
    discountReason: "loyalty"
  }
);

// Returns: { success, orderId, offline, message }
```

### Get Customer Orders (Including Offline)

```typescript
import { getCustomerOrdersWithOffline } from './hooks/useOfflineMode';

const orders = await getCustomerOrdersWithOffline(customerId);
// Returns cached + pending orders with isOffline flag
```

### Manual Sync

```typescript
import { triggerSync } from './hooks/useOfflineMode';

const result = await triggerSync();
// { success, message: "Synced 5/5 orders" }
```

### Listen for Sync Status

```typescript
window.addEventListener('offline-sync-status', (event) => {
  const { status, data } = event.detail;
  console.log('Sync:', status); // 'syncing' | 'idle' | 'error'
});
```

---

## 🎛️ Dashboard Kitchen Display (Offline)

### Cache Orders

```typescript
import { cacheOrdersForOffline } from './hooks/useOfflineMode';

const result = await cacheOrdersForOffline(ordersFromAPI);
// Orders now available offline
```

### Update Item Status

```typescript
import { updateKitchenItemStatus } from './hooks/useOfflineMode';

await updateKitchenItemStatus(
  orderId,
  itemId,
  'preparing' // or 'pending' | 'ready'
);
// Queued for sync, displayed immediately
```

### Get Kitchen Stats

```typescript
import { getOfflineDashboardStats } from './hooks/useOfflineMode';

const stats = await getOfflineDashboardStats();
// { total, pending, preparing, ready, pendingUpdates }
```

### Listen for Kitchen Sync Events

```typescript
window.addEventListener('dashboard-kitchen-sync', (event) => {
  // Kitchen status updates queued for sync
});
```

---

## 🔄 Sync Flow

### When Online:

```
1. Order placed via placeOrder()
   ↓
2. Stored in IndexedDB (pending_sync)
   ↓
3. Sync Engine attempts cloud POST
   ↓
4. Success → marked synced, cloudOrderId set
   ↓
5. Local Server also syncs to cloud periodically
```

### When Offline:

```
1. Order placed via placeOrder()
   ↓
2. Stored in IndexedDB (pending_sync)
   ↓
3. Sync Engine tries, fails gracefully
   ↓
4. Order kept locally, shows offline banner
   ↓
5. When online → auto-retry with exponential backoff
```

### Conflict Resolution:

```
1. Server returns 409 Conflict
   ↓
2. Recorded in IndexedDB conflicts table
   ↓
3. Default strategy: use server version
   ↓
4. Or: Manual review in admin panel
```

---

## 📊 Monitoring & Stats

### Sync Statistics

```typescript
import { getSyncStats } from './lib/offlineOrderStore';

const stats = await getSyncStats();
// { total, pending, synced, failed, conflicts }
```

### Local Server Sync Endpoint

```bash
GET /health
# Returns:
{
  "status": "healthy",
  "sync": {
    "total": 100,
    "synced": 95,
    "pending": 3,
    "failed": 2,
    "conflicts": 0
  }
}
```

### Manual Retry Failed Orders

```bash
POST /sync/retry-failed
# Local server retries all failed orders
```

---

## 🛠️ Configuration

### Sync Engine Config (in `initOfflineMode.ts`)

```typescript
const syncConfig: SyncConfig = {
  cloudApiBase: 'https://dineiq-backend.in',
  localServerBase: 'http://192.168.1.10:8000',
  maxRetries: 3,
  retryDelayMs: 5000,
  conflictStrategy: 'server', // 'server' | 'client' | 'manual'
  enableLocalSync: true, // Try local server first
};
```

### Service Worker Config

```typescript
await registerServiceWorker({
  filePath: '/service-worker.ts',
  scope: '/',
  autoUpdate: true,
  updateInterval: 60000, // Check for updates every 60s
});
```

---

## 🎯 Offline Indicators & UI

### Show Offline Banner

```tsx
function App() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    window.addEventListener('app-connection-status', (e: any) => {
      setIsOnline(e.detail.isOnline);
    });
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="bg-red-500 text-white p-2">
          📡 Offline - Orders will sync when online
        </div>
      )}
    </>
  );
}
```

### Show Sync Status

```tsx
import { getSyncStatusForUI } from './hooks/useOfflineMode';

function SyncStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getSyncStatusForUI().then(setStatus);
  }, []);

  if (!status) return null;

  return (
    <div>
      Pending: {status.pending} | Synced: {status.synced} | Failed: {status.failed}
    </div>
  );
}
```

### Show Sync Progress

```tsx
useEffect(() => {
  window.addEventListener('offline-sync-status', (e: any) => {
    if (e.detail.status === 'syncing') {
      console.log('Syncing...');
    } else if (e.detail.status === 'idle') {
      console.log('Sync complete:', e.detail.data.result);
    }
  });
}, []);
```

---

## 🔒 Security Considerations

1. **Authentication**: Service Worker inherits auth from main app
2. **HTTPS**: Use HTTPS in production for Service Worker security
3. **Data Privacy**: IndexedDB is per-origin, isolated from other sites
4. **Offline Orders**: Treated as unconfirmed until cloud sync completes

---

## 📱 Testing Offline Mode

### Browser DevTools:

1. **Chrome DevTools → Application → Service Workers**
   - Check if SW is registered and active
   - Use "Offline" checkbox to simulate offline

2. **Application → Manifest**
   - Verify manifest.json is loaded

3. **Application → Storage → IndexedDB**
   - View orders, conflicts, sync status

### Simulate Network Issues:

```bash
# Slow 3G connection
# DevTools → Network → Throttling → Slow 3G

# Go offline
# DevTools → Application → Service Workers → Offline
```

---

## 🚨 Troubleshooting

### Service Worker Not Registering

```typescript
// Check browser console for errors
// Ensure public/service-worker.ts exists
// Check manifest.json is valid JSON
```

### Orders Not Syncing

```typescript
// 1. Check IndexedDB: DevTools → Storage → IndexedDB → DineIQOfflineDB
// 2. Check sync engine: console.log('[SyncEngine]...' messages
// 3. Check network: DevTools → Network tab
// 4. Check cloud API: curl https://dineiq-backend.in/health
```

### Conflicts Not Resolving

```typescript
// Check conflicts table in IndexedDB
// Verify conflictStrategy setting
// Manually retry: triggerSync()
```

---

## 📈 Performance Tips

1. **Cache Size**: Older synced orders can be cleared with `clearSyncedOrders()`
2. **Sync Interval**: Adjust based on order frequency (default: 30s)
3. **Auto-Updates**: Set Service Worker update check interval (default: 60s)
4. **Local Server**: Run on mini PC with WiFi for LAN-first experience

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `src/lib/offlineOrderStore.ts` | IndexedDB schema & operations |
| `src/lib/syncEngine.ts` | Sync queue & retry logic |
| `src/lib/serviceWorkerManager.ts` | SW registration & messaging |
| `src/hooks/useOfflineMode.ts` | API wrapper & utilities |
| `src/init/initOfflineMode.ts` | Initialization & setup |
| `public/service-worker.ts` | Service Worker code |
| `local-server/sync.py` | Cloud sync from local server |

---

## 🎓 Example: Complete Order Flow

```typescript
// 1. User places order on Webapp
const result = await placeOrder(
  'customer123',
  [{ itemId: 'biryani', quantity: 2 }],
  500,
  50,
  'upi'
);
// Result: { success: true, orderId: 'Ord_1234', offline: true }

// 2. If online, Sync Engine immediately tries cloud
// If offline, order stays in IndexedDB for later

// 3. Service Worker caches the order in its cache strategy

// 4. When online again, auto-sync triggers
// Exponential backoff if cloud API is slow

// 5. If conflict (order exists on server):
// Recorded in conflicts table, user sees notification

// 6. Dashboard kitchen display:
// Gets order from local cache
// Staff updates item status locally
// Status updates queued for sync

// 7. Local Server (in restaurant):
// Periodically syncs all orders to cloud
// Updates pushed to all connected staff devices via WebSocket

// 8. Cloud Portal:
// Shows all orders once synced
// Kitchen display updates streamed in real-time
```

---

## 🎉 Benefits

✅ **Works offline** – no internet? orders still placed  
✅ **Fast sync** – local server handles LAN traffic  
✅ **Conflict resolution** – built-in handling for race conditions  
✅ **Auto-retry** – intelligent exponential backoff  
✅ **Real-time updates** – WebSocket broadcast on LAN  
✅ **PWA support** – installable on mobile & desktop  
✅ **Persistent cache** – IndexedDB survives app restart  
✅ **Manual override** – retry or resolve conflicts manually

---

Made for DineIQ offline-first restaurant ordering system.

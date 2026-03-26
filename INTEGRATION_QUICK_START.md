# Quick Start: Integrating Offline Mode into Webapp & Dashboard

## ✅ Files Already Created

The complete offline-first architecture has been built. All files are ready to use:

### Core System Files
- ✅ `Webapp/src/lib/offlineOrderStore.ts` - IndexedDB wrapper
- ✅ `Webapp/src/lib/syncEngine.ts` - Sync queue engine
- ✅ `Webapp/src/lib/serviceWorkerManager.ts` - SW management
- ✅ `Webapp/src/hooks/useOfflineMode.ts` - Offline API wrapper
- ✅ `Webapp/src/init/initOfflineMode.ts` - Initialization
- ✅ `Webapp/public/service-worker.ts` - Service Worker
- ✅ `Webapp/public/manifest.json` - PWA manifest

Same for Dashboard:
- ✅ `Dashboard/src/lib/offlineOrderStore.ts`
- ✅ `Dashboard/src/lib/serviceWorkerManager.ts`
- ✅ `Dashboard/src/hooks/useOfflineMode.ts`
- ✅ `Dashboard/src/init/initOfflineMode.ts`
- ✅ `Dashboard/public/service-worker.ts`
- ✅ `Dashboard/public/manifest.json`

Local Server:
- ✅ `local-server/sync.py` - Cloud sync engine

Documentation:
- ✅ `OFFLINE_ARCHITECTURE.md` - Complete guide
- ✅ `INTEGRATION_QUICK_START.md` - This file

---

## 📋 Integration Checklist

### 1. Install Dependencies

```bash
# Webapp
cd DineIQ/Frontend/Webapp
npm install dexie
# or with bun
bun add dexie

# Dashboard  
cd DineIQ/Frontend/Dashboard
npm install dexie
# or
bun add dexie

# Local Server
cd DineIQ/local-server
pip install httpx -U  # Already in requirements.txt probably
```

### 2. Update `main.tsx` in Webapp

**File: `DineIQ/Frontend/Webapp/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import initializeWebappOfflineMode from './init/initOfflineMode' // ← ADD THIS

// Initialize offline support before rendering app
initializeWebappOfflineMode().catch(err => {
  console.error('Failed to initialize offline mode:', err)
  // Continue anyway - offline is optional
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 3. Update `main.tsx` in Dashboard

**File: `DineIQ/Frontend/Dashboard/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import initializeDashboardOfflineMode from './init/initOfflineMode' // ← ADD THIS

// Initialize offline support before rendering app
initializeDashboardOfflineMode().catch(err => {
  console.error('Failed to initialize offline mode:', err)
  // Continue anyway
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 4. Update both `index.html` files

**Files: `Webapp/index.html` and `Dashboard/index.html`**

In the `<head>` section, add:

```html
<head>
  <!-- Existing meta tags -->
  
  <!-- PWA Support -->
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/icons/icon-192x192.png">
  
  <!-- iOS Support -->
  <meta name="apple-mobile-web-app-capable" content="true">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="DineIQ">
  
  <!-- Your existing tags... -->
</head>
```

### 5. Update Webapp: Replace Order Placement

**File: `Webapp/src/pages/CartPage.tsx` (or wherever orders are placed)**

Current code (probably):
```tsx
const handleCheckout = async () => {
  // Existing code that calls API directly
  const response = await fetch(`${apiBase}/orders/place-order`, {
    method: 'POST',
    // ...
  })
}
```

Replace with:
```tsx
import { placeOrder } from '../hooks/useOfflineMode'

const handleCheckout = async () => {
  const result = await placeOrder(
    customerId,
    cartItems,
    totalAmount,
    appliedDiscount,
    paymentMethod,
    {
      specialInstructions: specialInstructions,
    }
  )

  if (result.success) {
    showToast(result.message)
    if (result.offline) {
      showBanner('📡 Offline Mode: Orders will sync when online')
    }
    navigateTo(`/order-tracking/${result.orderId}`)
  } else {
    showError(result.error)
  }
}
```

### 6. Update Webapp: Show Sync Status

**File: `Webapp/src/App.tsx` or create `components/OfflineIndicator.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { getSyncStatusForUI } from './hooks/useOfflineMode'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState(null)

  useEffect(() => {
    // Listen for connection status
    window.addEventListener('app-connection-status', (e: any) => {
      setIsOnline(e.detail.isOnline)
    })

    // Listen for sync status
    window.addEventListener('offline-sync-status', (e: any) => {
      if (e.detail.status === 'idle' && e.detail.data?.result) {
        setSyncStatus(e.detail.data.result)
      }
    })

    // Initial sync status
    getSyncStatusForUI().then(setSyncStatus)
  }, [])

  if (isOnline && !syncStatus) return null

  return (
    <div>
      {!isOnline && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          📡 Offline - Orders saved locally, will sync when online
        </div>
      )}
      {syncStatus?.pending > 0 && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center">
          📤 Syncing: {syncStatus.pending} orders { 
            syncStatus.failed > 0 ? `(${syncStatus.failed} failed)` : ''
          }
        </div>
      )}
    </div>
  )
}

// Then in your main App component, add it near the top:
// <OfflineIndicator />
```

### 7. Update Dashboard: Cache Orders

**File: `Dashboard/src/pages/OrdersPage.tsx` (or your orders list)**

After fetching orders from API:

```tsx
import { cacheOrdersForOffline } from '../hooks/useOfflineMode'

const handleLoadOrders = async () => {
  const orders = await fetchOrdersFromAPI()
  
  // Cache for offline access
  await cacheOrdersForOffline(orders)
  
  setOrders(orders)
}
```

### 8. Update Dashboard: Item Status Updates

**File: `Dashboard/src/components/KitchenDisplay.tsx` (or similar)**

When staff updates item status:

```tsx
import { updateKitchenItemStatus } from '../hooks/useOfflineMode'

const handleItemStatusChange = async (orderId, itemId, newStatus) => {
  // Update optimistically in UI
  setItemStatus(itemId, newStatus)
  
  // Queue for sync (works offline too)
  const result = await updateKitchenItemStatus(orderId, itemId, newStatus)
  
  if (!result.success) {
    showError(result.message)
  }
}
```

### 9. Update Local Server: Initialize Sync

**File: `DineIQ/Backend/main.py` or `local-server/main.py`**

At startup, initialize sync engine:

```python
from sync import SyncEngine
from db import Database

# In your app startup:
db = Database()
sync_engine = SyncEngine(
    db=db,
    cloud_api_base='https://dineiq-backend.in',
    max_retries=3,
    sync_interval_seconds=30
)

# Start background sync
import asyncio
asyncio.create_task(sync_engine.start())

# Expose health endpoint
@app.get('/health')
async def health():
    stats = await sync_engine.get_sync_stats()
    return {
        'status': 'healthy',
        'sync': stats,
        'timestamp': datetime.now().isoformat()
    }
```

### 10. Test Offline Mode

```bash
# 1. Start Webapp
cd DineIQ/Frontend/Webapp
npm run dev

# 2. Open DevTools (F12)
# 3. Go to Application tab → Service Workers
# 4. Check "Offline" checkbox
# 5. Try placing an order
# 6. Check IndexedDB → DineIQOfflineDB → orders table

# 7. Uncheck offline, order should sync automatically
```

---

## 🧪 Testing Checklist

- [ ] Install Dexie.js in both apps
- [ ] Update main.tsx files to call init functions
- [ ] Update index.html with PWA meta tags
- [ ] Create icon files in `public/icons/` (512x512 minimum)
- [ ] Update order placement to use offline API
- [ ] Add offline indicator component
- [ ] Test placing order while offline
- [ ] Check IndexedDB shows orders
- [ ] Go back online and verify sync
- [ ] Test on mobile using "Add to Home Screen"
- [ ] Test kitchen display caching
- [ ] Test status updates while offline

---

## 📱 Mobile Installation

### iOS (Safari):
1. Open webapp URL
2. Tap Share → Add to Home Screen
3. Works offline after first visit

### Android (Chrome):
1. Open webapp URL  
2. Tap menu → Install App
3. Works offline immediately

---

## 🔧 Configuration

### Local Server IP
Edit in `Webapp/src/init/initOfflineMode.ts`:
```typescript
const localServerBase = 'http://192.168.1.10:8000'; // Change to your mini PC IP
```

### Sync Interval
Edit in same file:
```typescript
syncEngine.startAutoSync(30000); // Change milliseconds as needed
```

### Retry Strategy
Edit `syncConfig`:
```typescript
maxRetries: 3,              // Increase for slower networks
retryDelayMs: 5000,        // Increase to wait longer
conflictStrategy: 'server', // Change to 'client' or 'manual'
```

---

## 🐛 Debugging

### Check Service Worker Registration
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log(regs)
})
```

### Check Offline Store
```javascript
// In browser console:
const db = await import('./lib/offlineOrderStore').then(m => m.default)
await db.orders.toArray().then(orders => console.log(orders))
```

### Check Sync Engine
```javascript
import { getSyncEngine } from './lib/syncEngine'
const engine = getSyncEngine()
console.log('Syncing:', engine.isSyncingNow())
```

### Local Server Sync Status
```bash
curl http://192.168.1.10:8000/health
```

---

## ⚠️ Common Issues

### Service Worker Not Updating
- Clear cache: DevTools → Application → Storage → Clear site data
- Reconnect: Unregister and reload page

### Orders Not Syncing
- Check internet: `navigator.onLine` in console
- Check cloud API: `curl https://dineiq-backend.in/health`
- Check local server: `curl http://192.168.1.10:8000/health`

### Conflicts Not Resolving
- Check conflicts table in IndexedDB
- Manually trigger sync with retry

---

## Next Steps

1. ✅ Complete the checklist above
2. 📝 Read `OFFLINE_ARCHITECTURE.md` for deep dive
3. 🧪 Test all scenarios (online, offline, slow network, conflict)
4. 🎨 Customize UI indicators and notifications
5. 📊 Monitor sync stats in production
6. 🚀 Deploy to production with confidence!

---

Need help? Check:
- `/OFFLINE_ARCHITECTURE.md` - Full technical reference
- Browser DevTools → Application tab - Debugging
- Console logs with `[SW]`, `[SyncEngine]`, `[OfflineAPI]` prefixes

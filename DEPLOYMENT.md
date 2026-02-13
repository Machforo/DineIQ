# DineIQ Deployment Guide

## 🚀 Deployment Checklist

### Pre-Deployment Cleanup ✅
- [x] Removed debug logs (`debug_order.log`)
- [x] Removed test scripts (`test_auth.py`, `authenticate_gmail.py`)
- [x] Removed development utilities (`convert_json_to_base64.ps1`, `generate_qr.py`)
- [x] Removed generated QR codes folder (`table_qrs/`)
- [x] Updated `.gitignore` for better security

### Environment Variables Required

#### Backend (.env)
```env
# Database
SPREADSHEET_ID=your_google_sheet_id

# Google Sheets API
SERVICE_ACCOUNT_FILE=dineIQ_service_account.json

# Gmail OAuth (for campaigns)
GMAIL_CREDENTIALS_FILE=dineIQ_gmail_OAuth_Credentials.json

# AI/LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-domain.vercel.app
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

---

## 📦 Backend Deployment (Render)

### 1. Prepare Credentials
Convert JSON credentials to Base64 for Render environment variables:
```powershell
# Already done via startup.py - credentials are decoded automatically
```

### 2. Render Configuration
File: `render.yaml` (already configured)
- **Service Type**: Web Service
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 3. Environment Variables on Render
Set these in Render Dashboard:
- `SPREADSHEET_ID`
- `SERVICE_ACCOUNT_JSON_BASE64` (Base64 encoded service account)
- `GMAIL_CREDENTIALS_JSON_BASE64` (Base64 encoded Gmail OAuth)
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `ALLOWED_ORIGINS`

### 4. Deploy
```bash
git push origin main
# Render auto-deploys from GitHub
```

---

## 🌐 Frontend Deployment (Vercel)

### 1. Update API URL
Ensure `.env` points to production backend:
```env
VITE_API_URL=https://dineiq-backend.onrender.com
```

### 2. Vercel Configuration
File: `vercel.json` (already configured)

### 3. Deploy
```bash
# Via Vercel CLI
vercel --prod

# Or via GitHub integration
git push origin main
```

---

## 🔒 Security Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] JSON credential files are in `.gitignore`
- [ ] No hardcoded API keys in code
- [ ] CORS is properly configured
- [ ] Service account has minimum required permissions

---

## 📁 Project Structure (Deployment-Ready)

```
DineIQ-pre_main/
├── Backend/
│   ├── agents/          # AI agents (menu, recommendation, chatbot, etc.)
│   ├── routes/          # API routes (auth, order)
│   ├── services/        # External services (sheets, llm, campaigns)
│   ├── utilities/       # Helper functions
│   ├── main.py          # FastAPI app entry point
│   ├── startup.py       # Credential decoding for Render
│   ├── requirements.txt # Python dependencies
│   ├── render.yaml      # Render deployment config
│   └── .env             # Environment variables (NOT in git)
│
└── Frontend/Webapp/
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── contexts/    # React contexts
    │   ├── lib/         # Utilities
    │   └── api.ts       # API client
    ├── public/          # Static assets
    ├── vercel.json      # Vercel deployment config
    └── .env             # Environment variables (NOT in git)
```

---

## 🧪 Testing Before Deployment

### Backend
```bash
# Local test
uvicorn main:app --reload --port 8001

# Test endpoints
curl http://localhost:8001/
curl http://localhost:8001/menu/get-menu
```

### Frontend
```bash
# Local test
npm run dev

# Build test
npm run build
npm run preview
```

---

## 🚨 Common Deployment Issues

### Issue: CORS Error
**Solution**: Add frontend domain to `ALLOWED_ORIGINS` in backend `.env`

### Issue: 500 Internal Server Error
**Solution**: Check Render logs for missing environment variables

### Issue: Google Sheets API Error
**Solution**: Verify service account JSON is correctly Base64 encoded

### Issue: Frontend can't connect to backend
**Solution**: Verify `VITE_API_URL` in frontend `.env` points to correct backend URL

---

## 📊 Post-Deployment Verification

1. ✅ Frontend loads without errors
2. ✅ Login/Signup works
3. ✅ Menu items display correctly
4. ✅ Cart functionality works
5. ✅ Orders are saved to Google Sheets
6. ✅ AI combo generation works
7. ✅ Recommendations display

---

## 🔄 Continuous Deployment

Both Render (backend) and Vercel (frontend) support automatic deployments:
- **Push to `main` branch** → Auto-deploy to production
- **Push to `dev` branch** → Deploy to staging (if configured)

---

## 📞 Support

For deployment issues, check:
1. Render logs: `https://dashboard.render.com`
2. Vercel logs: `https://vercel.com/dashboard`
3. Browser console for frontend errors
4. Network tab for API call failures

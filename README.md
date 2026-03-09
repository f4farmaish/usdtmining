# USDTMINE — Full Stack Setup Guide

## 📁 Project Structure
```
mining-app/
├── backend/
│   ├── server.js       ← Node.js Express backend
│   ├── package.json
│   └── db.json         ← Auto-created on first run (JSON database)
└── frontend/
    └── App.jsx         ← React frontend (single file)
```

---

## ⚙️ BACKEND SETUP

### 1. Install Node.js (v18+)
Download from https://nodejs.org

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure your deposit addresses
Open `server.js` and replace:
```js
const DEPOSIT_ADDRESSES = {
  USDT_TRC20: "TYourUSDTAddressHereReplaceThis",  // ← Your USDT TRC-20 address
  TRX:        "TYourTRXAddressHereReplaceThis",    // ← Your TRX address
};
```
Also do the same in `frontend/App.jsx` in the DEPOSIT_ADDRESSES constant.

### 4. Change the admin key
In `server.js`, find and replace:
```js
if (adminKey !== "admin_secret_key_change_this")
```
With your own secret key.

### 5. Start the backend
```bash
npm start
# Server runs on http://localhost:5000
```

---

## 🎨 FRONTEND SETUP

### Option A — Use with Vite (recommended)
```bash
npm create vite@latest usdtmine-frontend -- --template react
cd usdtmine-frontend
npm install
# Replace src/App.jsx with the provided App.jsx
npm run dev
```

### Option B — Use directly in claude.ai
The App.jsx file works as a React artifact on claude.ai.

---

## 🔑 ADMIN PANEL (Manual)

### Approve a deposit (activate user plan):
```bash
curl -X POST http://localhost:5000/admin/approve-deposit \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"your_admin_key","depositId":"DEPOSIT_ID_HERE"}'
```

### View all pending deposits:
```bash
curl "http://localhost:5000/admin/deposits?adminKey=your_admin_key"
```

---

## 💰 MINING PLANS

| Level | Name     | Investment | Daily Earn | Min Withdraw | 30-Day ROI |
|-------|----------|-----------|------------|--------------|------------|
| 1     | Starter  | $15       | $2/day     | $4           | ~300%      |
| 2     | Basic    | $25       | $5/day     | $8           | ~500%      |
| 3     | Bronze   | $50       | $10/day    | $15          | ~500%      |
| 4     | Silver   | $100      | $22/day    | $30          | ~560%      |
| 5     | Gold     | $250      | $60/day    | $80          | ~620%      |
| 6     | Platinum | $500      | $130/day   | $150         | ~680%      |
| 7     | Diamond  | $1000     | $280/day   | $300         | ~740%      |

---

## 🔄 HOW IT WORKS

1. **User registers** → Zero balance
2. **User picks a plan** → Clicks "Activate"
3. **Deposit screen** → Shows your USDT/TRX address + QR
4. **User sends payment** → Pastes TX hash → Submits
5. **Admin approves** via API → Plan activates
6. **Earnings credited** automatically every hour
7. **User withdraws** → You send manually after verifying

---

## 🌐 PRODUCTION DEPLOYMENT

### Backend:
- Deploy to **Railway**, **Render**, or **VPS**
- Replace JSON db with **MySQL** or **MongoDB**
- Set `API` in frontend to your deployed backend URL

### Frontend:
- Build with `npm run build`
- Deploy to **Vercel**, **Netlify**, or **cPanel**

---

## 🔒 SECURITY CHECKLIST
- [ ] Change JWT_SECRET in server.js
- [ ] Change admin key
- [ ] Add your real wallet addresses
- [ ] Use HTTPS in production
- [ ] Replace JSON db with real database
- [ ] Add rate limiting (express-rate-limit)

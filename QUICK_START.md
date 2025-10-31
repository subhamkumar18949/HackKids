# ⚡ Quick Start - Unified VeriSeal API

## 🎯 What You Need to Know

**BEFORE**: You had 2 separate APIs
- `main.py` (blockchain) on port 8001
- `Backend/main.py` (packages) on port 8000

**NOW**: Everything is in ONE API
- `Backend/main.py` has BOTH blockchain + packages
- Single port: `8000`
- All existing endpoints still work exactly the same ✅

---

## 🚀 How to Run (3 Steps)

### **1. Install web3 library**
```bash
cd Backend
pip install web3==6.11.3
```

### **2. Start the unified server**
```bash
uvicorn main:app --reload
```

### **3. That's it!**
Your API is running on `http://localhost:8000` with:
- ✅ All package tracking endpoints
- ✅ All authentication endpoints  
- ✅ Blockchain logging endpoints

---

## 📋 What's Available

### **Package Endpoints** (MongoDB)
```
POST /auth/register
POST /auth/login
POST /packages/create
POST /delivery/scan-checkpoint
GET  /sender/packages
GET  /delivery/packages
```

### **Blockchain Endpoints** (Ethereum)
```
POST /api/log-access       - Write to blockchain
GET  /api/get-all-logs     - Read from blockchain
```

---

## 🔧 Environment Variables

Your `Backend/.env` should have:
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret

# Optional - for blockchain features
SERVER_PRIVATE_KEY=0x...
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/...
```

**Note**: If blockchain variables are missing, the API still works! Only blockchain endpoints will return 503.

---

## ✅ No Breaking Changes

All your existing API calls work exactly the same:
- Frontend code doesn't need changes
- Same endpoints, same responses
- Just added 2 new blockchain endpoints

---

## 🎯 Quick Test

```bash
# Test it works
curl http://localhost:8000/

# Should return: {"message": "VeriSeal API is running!"}
```

**You're all set!** 🎉

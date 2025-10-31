# 🔗 Blockchain + Backend Integration Guide

## ✅ What Changed?

The blockchain API endpoints have been **merged** into `Backend/main.py`. Now you have **ONE unified API** instead of two separate servers.

## 🎯 All Endpoints in One Place

### **Single Server**: `http://localhost:8000`

#### **Existing Endpoints** (unchanged):
- ✅ `/auth/register` - User registration
- ✅ `/auth/login` - User login
- ✅ `/auth/me` - Get current user
- ✅ `/packages/create` - Create package
- ✅ `/delivery/scan-checkpoint` - Scan checkpoint
- ✅ `/sender/packages` - Get sender packages
- ✅ `/delivery/packages` - Get delivery packages
- ✅ `/demo/create-mock-data` - Generate demo data

#### **New Blockchain Endpoints** (added):
- 🆕 `POST /api/log-access` - Log device access to blockchain
- 🆕 `GET /api/get-all-logs` - Get all blockchain logs

---

## 🚀 How to Run

### **Step 1: Install Dependencies**
```bash
cd c:\Users\subha\OneDrive\Desktop\hackman\VeriSeal\HackKids\Backend
pip install -r requirements.txt
```

### **Step 2: Configure Environment Variables**
Make sure your `Backend/.env` file has:
```env
# MongoDB
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret

# Blockchain (optional - API works without these)
SERVER_PRIVATE_KEY=your_ethereum_private_key
ALCHEMY_URL=your_alchemy_url
```

### **Step 3: Start the Server**
```bash
cd Backend
uvicorn main:app --reload
```

**That's it!** One server runs everything. 🎉

---

## 🔍 How It Works

### **Graceful Degradation**
The blockchain integration is **optional**:
- ✅ If blockchain credentials are configured → Blockchain endpoints work
- ⚠️ If blockchain credentials are missing → Blockchain endpoints return 503, but all other endpoints work fine

### **Startup Messages**
When you start the server, you'll see:
```
✅ Blockchain connected: 0xYourWalletAddress
Connected to MongoDB!
```

Or if blockchain is not configured:
```
⚠️ Blockchain not configured (missing ALCHEMY_URL or SERVER_PRIVATE_KEY)
Connected to MongoDB!
```

---

## 📱 Frontend Integration

Your React app should call **ONE API** now:

```javascript
const API_BASE_URL = 'http://localhost:8000';

// Package tracking (MongoDB)
fetch(`${API_BASE_URL}/packages/create`, { ... });

// Blockchain logging (Ethereum)
fetch(`${API_BASE_URL}/api/log-access`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: 'ESP32_001',
    userId: 'user_123'
  })
});

// Get blockchain logs
fetch(`${API_BASE_URL}/api/get-all-logs`);
```

---

## 🎯 Use Cases

### **When to use Blockchain Endpoints?**

1. **Log Device Access** (`POST /api/log-access`)
   - When a delivery person scans a package
   - When an ESP32 device is assigned to a package
   - When a receiver verifies a package
   - Creates an **immutable audit trail** on Ethereum

2. **View Audit Trail** (`GET /api/get-all-logs`)
   - Show complete history of all device accesses
   - Prove package handling timeline
   - Compliance and verification purposes

### **Example: Enhanced Checkpoint Scanning**

You could modify the checkpoint scan endpoint to also log to blockchain:

```python
@app.post("/delivery/scan-checkpoint")
async def scan_checkpoint(checkpoint_data: CheckpointScan, token_data: dict):
    # ... existing MongoDB logic ...
    
    # Also log to blockchain for immutable record
    if web3 and contract:
        try:
            await log_access({
                "deviceId": checkpoint_data.package_token,
                "userId": token_data["sub"]
            })
        except:
            pass  # Don't fail if blockchain logging fails
    
    return {"message": "Checkpoint recorded"}
```

---

## 🔧 Testing

### **Test MongoDB Endpoints**
```bash
# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123","role":"sender"}'
```

### **Test Blockchain Endpoints**
```bash
# Log to blockchain
curl -X POST http://localhost:8000/api/log-access \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ESP32_001","userId":"user_alice"}'

# Get blockchain logs
curl http://localhost:8000/api/get-all-logs
```

---

## ✨ Benefits of This Integration

1. **Single Port** - No port conflicts, easier deployment
2. **Unified CORS** - Frontend only needs to configure one API URL
3. **Shared Authentication** - Can protect blockchain endpoints with JWT if needed
4. **Graceful Fallback** - App works even if blockchain is down
5. **Easier Development** - One server to start, one set of logs

---

## 🎓 Next Steps

1. ✅ Install web3 dependency: `pip install -r requirements.txt`
2. ✅ Add blockchain credentials to `.env` file
3. ✅ Start the unified server: `uvicorn main:app --reload`
4. ✅ Update frontend to use single API URL
5. 🎯 Optionally integrate blockchain logging into checkpoint scans

---

**🎉 You now have a unified API with both MongoDB and Blockchain capabilities!**

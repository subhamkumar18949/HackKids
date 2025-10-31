# 🧪 VeriSeal QR Scanner Testing Guide

## 🚀 Quick Start

### 1. Start Backend
```bash
cd Backend
uvicorn main:app --reload
```

### 2. Load Demo Data
```bash
python demo_setup.py
```

### 3. Start Frontend
```bash
cd Frontend
npm run dev
```

---

## 📱 Test Scenarios

### **Scenario 1: Normal Package (No Tampering)**

**Package:** Electronics  
**Token:** `demo_token_electronics_001`  
**PIN:** `123456`

#### Logistics Test:
1. Login as delivery user
2. Go to "Package Scanner" tab
3. Enter token: `demo_token_electronics_001`
4. Select checkpoint: `CP001`
5. Click "📱 Scan QR Code"

**Expected Result:**
```
✅ No tampering detected. Good to proceed!

📍 Checkpoint: Warehouse Dispatch
📦 Package: PKG20251031001
⏰ Logged at: [timestamp]
```

#### Receiver Test:
1. Scan QR with token: `demo_token_electronics_001`
2. Enter PIN: `123456`

**Expected Result:**
```
✅ Package Verified!

Status: ✅ SAFE
Total Scans: 0
Tamper Events: 0
```

---

### **Scenario 2: Tampered Package** 🚨

**Package:** Tampered Electronics  
**Token:** `demo_token_tampered_003`  
**PIN:** `789012`

#### Logistics Test:
1. Login as delivery user
2. Enter token: `demo_token_tampered_003`
3. Select checkpoint: `CP002`
4. Click "📱 Scan QR Code"

**Expected Result:**
```
🚨 TAMPERING DETECTED! Return package to sender.

📍 Checkpoint: Local Hub
📦 Package: PKG20251031003
⚠️ Tamper Events: 1

❌ DO NOT PROCEED - Return package to sender immediately!
```

#### Receiver Test:
1. Scan QR with token: `demo_token_tampered_003`
2. Enter PIN: `789012`

**Expected Result:**
```
✅ Package Verified!

Status: 🚨 TAMPERED
Total Scans: 2
Tamper Events: 1
```

**Journey Details:**
- CP001: ✅ Passed (8:00 AM)
- ESP32 detected shock at 10:15 AM
- CP002: 🚨 Failed - Return to sender (1:20 PM)

---

## 🔧 API Testing (Postman/cURL)

### Test 1: QR Scan (No Tampering)
```bash
curl -X POST http://127.0.0.1:8000/delivery/scan-qr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_token": "demo_token_electronics_001",
    "checkpoint_id": "CP001"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "proceed": true,
  "action": "proceed",
  "message": "✅ No tampering detected. Good to proceed!",
  "package_id": "PKG20251031001",
  "checkpoint_id": "CP001",
  "scan_logged": true
}
```

### Test 2: QR Scan (Tampered)
```bash
curl -X POST http://127.0.0.1:8000/delivery/scan-qr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_token": "demo_token_tampered_003",
    "checkpoint_id": "CP002"
  }'
```

**Expected Response:**
```json
{
  "status": "tampered",
  "proceed": false,
  "action": "return_to_sender",
  "message": "🚨 TAMPERING DETECTED! Return package to sender.",
  "tamper_events": [
    {
      "timestamp": "2025-10-31T10:15:00",
      "tamper_type": "shock",
      "sensor_data": {"shock_intensity": 8.5}
    }
  ],
  "scan_logged": true
}
```

### Test 3: ESP32 Reports Tampering
```bash
curl -X POST http://127.0.0.1:8000/esp32/report-tamper \
  -H "Content-Type: application/json" \
  -d '{
    "package_token": "demo_token_electronics_001",
    "device_id": "DEV001",
    "tamper_type": "shock",
    "sensor_data": {"shock_intensity": 7.2},
    "gps_location": "19.0760,72.8777"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Tamper event recorded",
  "package_id": "PKG20251031001",
  "timestamp": "2025-10-31T22:30:00"
}
```

### Test 4: Receiver Verification
```bash
curl -X POST http://127.0.0.1:8000/receiver/verify-package \
  -H "Content-Type: application/json" \
  -d '{
    "package_token": "demo_token_tampered_003",
    "pin": "789012"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "package": {
    "package_id": "PKG20251031003",
    "is_tampered": true,
    "journey": {
      "total_scans": 2,
      "scan_logs": [
        {
          "checkpoint_id": "CP001",
          "scanned_at": "2025-10-31T08:00:00",
          "action": "proceed",
          "tamper_check": "passed"
        },
        {
          "checkpoint_id": "CP002",
          "scanned_at": "2025-10-31T13:20:00",
          "action": "return_to_sender",
          "tamper_check": "failed"
        }
      ],
      "tamper_events": [
        {
          "timestamp": "2025-10-31T10:15:00",
          "tamper_type": "shock"
        }
      ],
      "tamper_count": 1
    }
  }
}
```

---

## ✅ Checklist

- [ ] Backend server running on port 8000
- [ ] Demo data loaded successfully
- [ ] Frontend running
- [ ] Can login as delivery user
- [ ] Can scan normal package → Shows "Good to proceed"
- [ ] Can scan tampered package → Shows "Return to sender"
- [ ] Receiver can verify with PIN
- [ ] Receiver sees complete journey with all scans
- [ ] Receiver sees tamper events

---

## 🎯 Demo Flow for Judges

1. **Show Package Creation**
   - Sender creates package
   - QR code generated
   - PIN sent to receiver

2. **Show Normal Journey**
   - Logistics scans at CP1 → ✅ Proceed
   - Logistics scans at CP2 → ✅ Proceed
   - Receiver scans → Sees all checkpoint logs

3. **Show Tamper Detection**
   - Use tampered demo package
   - Logistics scans at CP2 → 🚨 Return to sender
   - Show tamper event timestamp
   - Receiver scans → Sees tamper event in journey

4. **Highlight Key Features**
   - Automatic tamper detection
   - Every scan logged to database
   - Complete transparency for receiver
   - Real-time decision making

---

## 🐛 Troubleshooting

### "404 Not Found" Error
- Make sure backend server is running
- Check URL is `http://127.0.0.1:8000` not `localhost:8000`

### "401 Unauthorized" Error
- Login again to get fresh token
- Check token is included in Authorization header

### "Package not found" Error
- Run `python demo_setup.py` to load demo data
- Check package token is correct

### Scan logs not showing
- Make sure you're using `/delivery/scan-qr` endpoint
- Check `scan_logs` field exists in database

---

**Your QR Scanner System is Ready!** 🎉

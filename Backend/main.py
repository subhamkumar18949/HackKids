from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
import jwt
import bcrypt
import secrets
import string
from datetime import datetime, timedelta
from dotenv import load_dotenv
from bson import ObjectId
from web3 import Web3

# Load environment variables from .env file
load_dotenv()

app = FastAPI()
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# --- Pre-configured CORS ---
# This allows your React app (running on localhost:5173)
# to make requests to this API (running on localhost:8000)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Blockchain Configuration ---
# Get blockchain secrets from .env file
BLOCKCHAIN_PRIVATE_KEY = os.getenv("SERVER_PRIVATE_KEY")
ALCHEMY_URL = os.getenv("ALCHEMY_URL")
CONTRACT_ADDRESS = "0x4b96Ec59eB55a82D4F35A381250e97d7E0Ddae09"

# Smart Contract ABI
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_deviceId", "type": "string"},
            {"internalType": "string", "name": "_userId", "type": "string"}
        ],
        "name": "addLog",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "allLogs",
        "outputs": [
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "string", "name": "deviceId", "type": "string"},
            {"internalType": "string", "name": "userId", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getLogCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Initialize Web3 connection (will be None if blockchain is not configured)
web3 = None
contract = None
server_account = None

if ALCHEMY_URL and BLOCKCHAIN_PRIVATE_KEY:
    try:
        web3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))
        server_account = web3.eth.account.from_key(BLOCKCHAIN_PRIVATE_KEY)
        web3.eth.default_account = server_account.address
        contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        print(f"✅ Blockchain connected: {server_account.address}")
    except Exception as e:
        print(f"⚠️ Blockchain connection failed: {e}")
        web3 = None
else:
    print("⚠️ Blockchain not configured (missing ALCHEMY_URL or SERVER_PRIVATE_KEY)")

# --- MongoDB Connection ---
@app.on_event("startup")
async def startup_db_client():
    # Get the connection string from the .env file
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise ValueError("MONGO_URI not found in .env file")
        
    app.mongodb_client = AsyncIOMotorClient(mongo_uri)
    # Use "veriseal_db" as your database name
    app.mongodb = app.mongodb_client["veriseal_db"] 
    print("Connected to MongoDB!")

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()
    print("Disconnected from MongoDB.")

# --- API Endpoints ---

@app.get("/")
async def root():
    """
    "Hello World" test endpoint to verify the API is running
    and the frontend can connect to it.
    """
    return {"message": "VeriSeal API is running!"}

# --- Pydantic Models ---
class UserRegistration(BaseModel):
    username: str
    email: str
    password: str
    role: str  # "sender", "receiver", "delivery"
    phone: Optional[str] = None
    company_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    phone: Optional[str] = None
    company_name: Optional[str] = None

# --- Package & Checkpoint Models ---
class ESP32Data(BaseModel):
    temperature: float
    humidity: Optional[float] = None
    tamper_status: str  # "secure", "tampered"
    battery_level: int
    shock_detected: bool = False
    gps_location: Optional[str] = None

class CheckpointData(BaseModel):
    checkpoint_id: str
    name: str
    location: str
    scanned_by: str  # delivery user ID
    esp32_data: ESP32Data
    status: str  # "passed", "failed", "pending"
    notes: Optional[str] = None

class PackageCreation(BaseModel):
    order_id: str
    package_type: str
    receiver_phone: str
    device_id: str
    sender_id: str
    notes: Optional[str] = None

class CheckpointScan(BaseModel):
    package_token: str
    checkpoint_id: str
    esp32_data: ESP32Data
    status: str
    notes: Optional[str] = None

class QRScanRequest(BaseModel):
    package_token: str
    checkpoint_id: str
    notes: Optional[str] = None

class ESP32TamperReport(BaseModel):
    package_token: str
    device_id: str
    tamper_type: str  # "shock", "temperature", "seal_broken"
    sensor_data: dict
    gps_location: Optional[str] = None

class ReceiverVerification(BaseModel):
    package_token: str
    pin: str

# --- JWT Helper Functions ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# --- Authentication Endpoints ---

@app.post("/auth/register")
async def register_user(user_data: UserRegistration):
    """
    Register a new user with role-based information
    """
    try:
        # Check if user already exists
        existing_user = await app.mongodb.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password": hashed_password,
            "role": user_data.role,
            "phone": user_data.phone,
            "company_name": user_data.company_name,
            "created_at": datetime.now(),
            "is_active": True
        }
        
        # Insert user
        result = await app.mongodb.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create JWT token
        token_data = {
            "sub": user_id,
            "email": user_data.email,
            "role": user_data.role
        }
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "username": user_data.username,
                "email": user_data.email,
                "role": user_data.role,
                "phone": user_data.phone,
                "company_name": user_data.company_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Blockchain Endpoints ---

@app.post("/api/log-access")
async def log_access(data: dict):
    """
    Log device access to blockchain (immutable audit trail)
    Expected JSON: {"deviceId": "ESP32_001", "userId": "User_Alice"}
    """
    if not web3 or not contract:
        raise HTTPException(status_code=503, detail="Blockchain service not available")
    
    device_id = data.get("deviceId")
    user_id = data.get("userId")

    if not device_id or not user_id:
        raise HTTPException(status_code=400, detail="Missing 'deviceId' or 'userId'")

    print(f"📝 Logging to blockchain: Device={device_id}, User={user_id}")

    try:
        # Build transaction to call addLog function
        tx = contract.functions.addLog(
            device_id,
            user_id
        ).build_transaction({
            'from': server_account.address,
            'nonce': web3.eth.get_transaction_count(server_account.address),
            'gas': 200000,
            'gasPrice': web3.eth.gas_price
        })

        # Sign transaction
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=BLOCKCHAIN_PRIVATE_KEY)
        
        # Send transaction
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for confirmation
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        print(f"✅ Blockchain log added! TX: {tx_hash.hex()}")

        return {
            "status": "success",
            "transaction_hash": tx_hash.hex(),
            "block_number": tx_receipt.blockNumber,
            "device_id": device_id,
            "user_id": user_id
        }

    except Exception as e:
        print(f"❌ Blockchain error: {e}")
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(e)}")

@app.get("/api/get-all-logs")
async def get_all_logs():
    """
    Read all access logs from blockchain
    This is a read-only call (no gas cost)
    """
    if not web3 or not contract:
        raise HTTPException(status_code=503, detail="Blockchain service not available")
    
    print("📖 Reading logs from blockchain...")
    
    log_list = []
    
    try:
        # Get total log count
        total_logs = contract.functions.getLogCount().call()
        
        # Loop from newest to oldest
        for i in range(total_logs - 1, -1, -1):
            log_entry = contract.functions.allLogs(i).call()
            
            log_list.append({
                "timestamp": log_entry[0],
                "deviceId": log_entry[1],
                "userId": log_entry[2]
            })

        print(f"✅ Retrieved {len(log_list)} logs from blockchain")
        
        return {
            "status": "success",
            "log_count": total_logs,
            "logs": log_list
        }
    
    except Exception as e:
        print(f"❌ Blockchain read error: {e}")
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(e)}")

@app.post("/auth/login")
async def login_user(login_data: UserLogin):
    """
    Login user and return JWT token
    """
    try:
        # Find user by email
        user = await app.mongodb.users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(login_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        # Create JWT token
        token_data = {
            "sub": str(user["_id"]),
            "email": user["email"],
            "role": user["role"]
        }
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "phone": user.get("phone"),
                "company_name": user.get("company_name")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/me")
async def get_current_user(token_data: dict = Depends(verify_token)):
    """
    Get current user information from JWT token
    """
    try:
        user_id = token_data["sub"]
        user = await app.mongodb.users.find_one({"_id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "phone": user.get("phone"),
            "company_name": user.get("company_name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Role-based Access Control ---
def require_role(required_role: str):
    def role_checker(token_data: dict = Depends(verify_token)):
        if token_data["role"] != required_role:
            raise HTTPException(status_code=403, detail=f"Access denied. Required role: {required_role}")
        return token_data
    return role_checker

# --- TODO DURING HACKATHON ---

@app.post("/log")
async def log_seal_status(request: Request):
    """
    Endpoint for the React app to send seal data (e.g., status, id)
    which you will then save to MongoDB.
    """
    data = await request.json() 
    # Example: {'seal_id': 'seal-001', 'status': 'TAMPERED'}
    
    # Use Motor to update/insert the document in the 'seals' collection
    await app.mongodb.seals.update_one(
        {"seal_id": data["seal_id"]},
        {"$set": {"status": data["status"], "last_updated": datetime.now()}},
        upsert=True
    )
    return {"status": "success", "received_data": data}

@app.get("/dashboard-data")
async def get_dashboard_data():
    """
    Endpoint for the Dashboard to poll.
    This will query MongoDB for all seal statuses.
    """
    seals = []
    cursor = app.mongodb.seals.find({})
    async for seal in cursor:
        seal["_id"] = str(seal["_id"]) # Convert ObjectId to string for JSON
        seals.append(seal)
    return seals

# --- Package Management Endpoints ---

@app.post("/packages/create")
async def create_package(package_data: PackageCreation, token_data: dict = Depends(verify_token)):
    """
    Create a new package with tracking capabilities
    """
    try:
        # Generate unique package token
        package_token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        package_id = f"PKG{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Generate PIN for customer
        pin = ''.join(secrets.choice(string.digits) for _ in range(6))
        
        # Create package document
        package_doc = {
            "package_id": package_id,
            "package_token": package_token,
            "order_id": package_data.order_id,
            "package_type": package_data.package_type,
            "device_id": package_data.device_id,
            "sender_id": package_data.sender_id,
            "receiver_phone": package_data.receiver_phone,
            "pin": pin,
            "authenticated": False,
            
            # Current status
            "current_status": "created",
            "current_checkpoint": None,
            "current_location": "Warehouse",
            
            # Checkpoint journey
            "checkpoints": [],
            
            # Timestamps
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            
            # Additional info
            "notes": package_data.notes
        }
        
        # Insert package
        result = await app.mongodb.packages.insert_one(package_doc)
        
        # Mock SMS sending
        print(f"📱 SMS to {package_data.receiver_phone}: Your VeriSeal PIN is {pin}")
        
        return {
            "package_id": package_id,
            "package_token": package_token,
            "pin": pin,  # For demo purposes
            "qr_url": f"https://veriseal.app/scan?token={package_token}",
            "message": "Package created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delivery/scan-checkpoint")
async def scan_checkpoint(checkpoint_data: CheckpointScan, token_data: dict = Depends(require_role("delivery"))):
    """
    Scan package at checkpoint and update journey
    """
    try:
        package = await app.mongodb.packages.find_one({"package_token": checkpoint_data.package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Create checkpoint entry
        checkpoint_entry = {
            "checkpoint_id": checkpoint_data.checkpoint_id,
            "name": get_checkpoint_name(checkpoint_data.checkpoint_id),
            "location": get_checkpoint_location(checkpoint_data.checkpoint_id),
            "scanned_by": token_data["sub"],  # delivery user ID
            "scanned_at": datetime.now(),
            "esp32_data": checkpoint_data.esp32_data.dict(),
            "status": checkpoint_data.status,
            "notes": checkpoint_data.notes
        }
        
        # Update package with new checkpoint
        update_data = {
            "$push": {"checkpoints": checkpoint_entry},
            "$set": {
                "current_checkpoint": checkpoint_data.checkpoint_id,
                "current_location": get_checkpoint_location(checkpoint_data.checkpoint_id),
                "current_status": "at_checkpoint" if checkpoint_data.status == "passed" else "checkpoint_failed",
                "updated_at": datetime.now()
            }
        }
        
        await app.mongodb.packages.update_one(
            {"package_token": checkpoint_data.package_token},
            update_data
        )
        
        return {
            "message": "Checkpoint scan recorded successfully",
            "checkpoint_id": checkpoint_data.checkpoint_id,
            "status": checkpoint_data.status,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delivery/scan-qr")
async def scan_qr_code(scan_data: dict, token_data: dict = Depends(require_role("delivery"))):
    """
    Logistics scans QR code - just validates and returns package info
    ESP32 data comes from QR code, not database
    """
    try:
        package_token = scan_data.get("package_token")
        
        # Find package by QR token
        package = await app.mongodb.packages.find_one({"package_token": package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found. Invalid QR code.")
        
        # Return package info - ESP32 data will come from QR code in frontend
        return {
            "status": "success",
            "package_id": package["package_id"],
            "order_id": package["order_id"],
            "package_type": package["package_type"],
            "device_id": package["device_id"],
            "current_status": package["current_status"],
            "current_location": package.get("current_location", "Unknown"),
            "receiver_phone": package["receiver_phone"][-4:],  # Last 4 digits only
            "message": "✅ Package found. Review ESP32 data and upload."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in scan_qr_code: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delivery/upload-scan")
async def upload_scan_data(scan_data: dict, token_data: dict = Depends(require_role("delivery"))):
    """
    Upload checkpoint scan with ESP32 data to database
    Called after logistics reviews the QR data
    """
    try:
        package_token = scan_data.get("package_token")
        checkpoint_id = scan_data.get("checkpoint_id")
        esp32_data = scan_data.get("esp32_data", {})
        notes = scan_data.get("notes", "")
        decision = scan_data.get("decision", "proceed")  # "proceed" or "return"
        
        # Find package
        package = await app.mongodb.packages.find_one({"package_token": package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Determine status based on decision
        if decision == "return":
            status = "failed"
            action = "return_to_sender"
            current_status = "returning_to_sender"
        else:
            status = "passed"
            action = "proceed"
            current_status = "in_transit"
        
        # Create scan log entry with ESP32 data from QR
        scan_log = {
            "checkpoint_id": checkpoint_id,
            "name": get_checkpoint_name(checkpoint_id),
            "location": get_checkpoint_location(checkpoint_id),
            "scanned_by": token_data["sub"],
            "scanned_at": datetime.now(),
            "status": status,
            "action": action,
            "esp32_data": esp32_data,  # Data from QR code
            "notes": notes
        }
        
        # Update package in database
        update_data = {
            "$push": {"scan_logs": scan_log},
            "$set": {
                "current_checkpoint": checkpoint_id,
                "current_location": get_checkpoint_location(checkpoint_id),
                "current_status": current_status,
                "updated_at": datetime.now()
            }
        }
        
        await app.mongodb.packages.update_one(
            {"package_token": package_token},
            update_data
        )
        
        return {
            "status": "success",
            "message": "✅ Scan data uploaded successfully",
            "package_id": package["package_id"],
            "checkpoint_id": checkpoint_id,
            "action": action,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upload_scan_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/esp32/report-tamper")
async def report_tamper(tamper_data: ESP32TamperReport):
    """
    ESP32 device reports tampering - creates timestamp in database
    This is called automatically by ESP32 hardware when tampering detected
    """
    try:
        # Find package
        package = await app.mongodb.packages.find_one({"package_token": tamper_data.package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Verify device ID
        if package["device_id"] != tamper_data.device_id:
            raise HTTPException(status_code=403, detail="Device ID mismatch")
        
        # Create tamper event with timestamp
        tamper_event = {
            "timestamp": datetime.now(),
            "tamper_type": tamper_data.tamper_type,
            "sensor_data": tamper_data.sensor_data,
            "gps_location": tamper_data.gps_location,
            "detected_at": datetime.now().isoformat()
        }
        
        # Add to database
        await app.mongodb.packages.update_one(
            {"package_token": tamper_data.package_token},
            {
                "$push": {"tamper_events": tamper_event},
                "$set": {
                    "is_tampered": True,
                    "updated_at": datetime.now()
                }
            }
        )
        
        print(f"🚨 TAMPER REPORTED: Package {package['package_id']} - {tamper_data.tamper_type}")
        
        return {
            "status": "success",
            "message": "Tamper event recorded",
            "package_id": package["package_id"],
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in report_tamper: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/receiver/verify-package")
async def verify_package(verification: ReceiverVerification):
    """
    Receiver scans QR and enters PIN to see complete journey
    Shows ALL scan logs from logistics + tamper events
    """
    try:
        # Find package
        package = await app.mongodb.packages.find_one({"package_token": verification.package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found. Invalid QR code.")
        
        # Verify PIN
        if package["pin"] != verification.pin:
            raise HTTPException(status_code=401, detail="Invalid PIN. Please check your SMS.")
        
        # Mark as authenticated
        await app.mongodb.packages.update_one(
            {"package_token": verification.package_token},
            {"$set": {"authenticated": True, "authenticated_at": datetime.now()}}
        )
        
        # Return complete journey
        return {
            "status": "success",
            "message": "Package verified successfully",
            "package": {
                "package_id": package["package_id"],
                "order_id": package["order_id"],
                "package_type": package["package_type"],
                "device_id": package["device_id"],
                "receiver_phone": package["receiver_phone"],
                "current_status": package["current_status"],
                "current_location": package.get("current_location", "Unknown"),
                "is_tampered": package.get("is_tampered", False),
                "created_at": package["created_at"].isoformat(),
                "updated_at": package["updated_at"].isoformat(),
                
                # Complete journey - ALL scan logs
                "journey": {
                    "total_scans": len(package.get("scan_logs", [])),
                    "scan_logs": package.get("scan_logs", []),
                    "tamper_events": package.get("tamper_events", []),
                    "tamper_count": len(package.get("tamper_events", []))
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in verify_package: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/receiver/package/{package_token}")
async def get_package_info(package_token: str):
    """
    Get basic package info before PIN entry
    """
    try:
        package = await app.mongodb.packages.find_one({"package_token": package_token})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return {
            "package_id": package["package_id"],
            "order_id": package["order_id"],
            "package_type": package["package_type"],
            "current_status": package["current_status"],
            "is_tampered": package.get("is_tampered", False),
            "receiver_phone": package["receiver_phone"][-4:],
            "requires_pin": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Helper Functions ---

def get_checkpoint_name(checkpoint_id: str) -> str:
    """Get checkpoint name from ID"""
    checkpoint_names = {
        "CP001": "Warehouse Dispatch",
        "CP002": "Local Hub",
        "CP003": "Transit Hub", 
        "CP004": "Destination Hub",
        "CP005": "Out for Delivery",
        "CP006": "Delivered"
    }
    return checkpoint_names.get(checkpoint_id, f"Checkpoint {checkpoint_id}")

def get_checkpoint_location(checkpoint_id: str) -> str:
    """Get checkpoint location from ID"""
    checkpoint_locations = {
        "CP001": "Mumbai Warehouse",
        "CP002": "Mumbai Central Hub",
        "CP003": "Delhi Transit Hub",
        "CP004": "Bangalore Hub", 
        "CP005": "Local Delivery Center",
        "CP006": "Customer Location"
    }
    return checkpoint_locations.get(checkpoint_id, f"Location {checkpoint_id}")

# --- Mock Data for Demo ---

@app.post("/demo/create-mock-data")
async def create_mock_data():
    """
    Create mock packages with checkpoint journeys for demo
    """
    try:
        # Clear existing packages for demo
        await app.mongodb.packages.delete_many({})
        
        mock_packages = [
            {
                "package_id": "PKG20251031001",
                "package_token": "demo_token_electronics_001",
                "order_id": "ORD12345",
                "package_type": "electronics",
                "device_id": "DEV001",
                "sender_id": "sender_demo_001",
                "receiver_phone": "+91 98765 43210",
                "pin": "123456",
                "authenticated": False,
                "current_status": "in_transit",
                "current_checkpoint": "CP003",
                "current_location": "Delhi Transit Hub",
                "is_tampered": False,
                "tamper_events": [],
                "scan_logs": [],
                "checkpoints": [
                    {
                        "checkpoint_id": "CP001",
                        "name": "Warehouse Dispatch",
                        "location": "Mumbai Warehouse",
                        "scanned_by": "delivery_user_001",
                        "scanned_at": datetime(2025, 10, 31, 9, 30, 0),
                        "esp32_data": {
                            "temperature": 22.5,
                            "humidity": 45.0,
                            "tamper_status": "secure",
                            "battery_level": 95,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "action": "proceed",
                        "tamper_check": "passed",
                        "notes": "✅ No tampering detected. Good to go."
                    },
                    {
                        "checkpoint_id": "CP002",
                        "name": "Local Hub",
                        "location": "Mumbai Central Hub",
                        "scanned_by": "delivery_user_002",
                        "scanned_at": datetime(2025, 10, 31, 12, 15, 0),
                        "esp32_data": {
                            "temperature": 24.1,
                            "humidity": 48.0,
                            "tamper_status": "secure",
                            "battery_level": 88,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "action": "proceed",
                        "tamper_check": "passed",
                        "notes": "✅ No tampering detected. Good to go."
                    },
                    {
                        "checkpoint_id": "CP003",
                        "name": "Transit Hub",
                        "location": "Delhi Transit Hub",
                        "scanned_by": "delivery_user_003",
                        "scanned_at": datetime(2025, 10, 31, 18, 45, 0),
                        "esp32_data": {
                            "temperature": 26.8,
                            "humidity": 52.0,
                            "tamper_status": "secure",
                            "battery_level": 82,
                            "shock_detected": False,
                            "gps_location": "28.7041,77.1025"
                        },
                        "status": "passed",
                        "action": "proceed",
                        "tamper_check": "passed",
                        "notes": "✅ No tampering detected. Good to go."
                    }
                ],
                "created_at": datetime(2025, 10, 31, 9, 0, 0),
                "updated_at": datetime(2025, 10, 31, 18, 45, 0),
                "notes": "High-value electronics package"
            },
            {
                "package_id": "PKG20251031002",
                "package_token": "demo_token_jewelry_002",
                "order_id": "ORD12346",
                "package_type": "jewelry",
                "device_id": "DEV002",
                "sender_id": "sender_demo_001",
                "receiver_phone": "+91 98765 43211",
                "pin": "654321",
                "authenticated": True,
                "current_status": "delivered",
                "current_checkpoint": "CP006",
                "current_location": "Customer Location",
                "is_tampered": False,
                "tamper_events": [],
                "scan_logs": [],
                "checkpoints": [
                    {
                        "checkpoint_id": "CP001",
                        "name": "Warehouse Dispatch",
                        "location": "Mumbai Warehouse",
                        "scanned_by": "delivery_user_001",
                        "scanned_at": datetime(2025, 10, 30, 10, 0, 0),
                        "esp32_data": {
                            "temperature": 21.8,
                            "humidity": 42.0,
                            "tamper_status": "secure",
                            "battery_level": 98,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "notes": "High-security jewelry package"
                    },
                    {
                        "checkpoint_id": "CP002",
                        "name": "Local Hub",
                        "location": "Mumbai Central Hub",
                        "scanned_by": "delivery_user_002",
                        "scanned_at": datetime(2025, 10, 30, 14, 30, 0),
                        "esp32_data": {
                            "temperature": 23.2,
                            "humidity": 46.0,
                            "tamper_status": "secure",
                            "battery_level": 92,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "notes": "Special handling applied"
                    },
                    {
                        "checkpoint_id": "CP005",
                        "name": "Out for Delivery",
                        "location": "Local Delivery Center",
                        "scanned_by": "delivery_user_005",
                        "scanned_at": datetime(2025, 10, 31, 8, 0, 0),
                        "esp32_data": {
                            "temperature": 25.5,
                            "humidity": 50.0,
                            "tamper_status": "secure",
                            "battery_level": 85,
                            "shock_detected": False,
                            "gps_location": "12.9716,77.5946"
                        },
                        "status": "passed",
                        "notes": "Out for final delivery"
                    },
                    {
                        "checkpoint_id": "CP006",
                        "name": "Delivered",
                        "location": "Customer Location",
                        "scanned_by": "delivery_user_005",
                        "scanned_at": datetime(2025, 10, 31, 11, 30, 0),
                        "esp32_data": {
                            "temperature": 24.8,
                            "humidity": 48.0,
                            "tamper_status": "secure",
                            "battery_level": 83,
                            "shock_detected": False,
                            "gps_location": "12.9716,77.5946"
                        },
                        "status": "passed",
                        "notes": "Successfully delivered to customer"
                    }
                ],
                "created_at": datetime(2025, 10, 30, 9, 30, 0),
                "updated_at": datetime(2025, 10, 31, 11, 30, 0),
                "notes": "Premium jewelry with enhanced security"
            },
            {
                "package_id": "PKG20251031003",
                "package_token": "demo_token_tampered_003",
                "order_id": "ORD12347",
                "package_type": "electronics",
                "device_id": "DEV003",
                "sender_id": "sender_demo_001",
                "receiver_phone": "+91 98765 43212",
                "pin": "789012",
                "authenticated": False,
                "current_status": "returning_to_sender",
                "current_checkpoint": "CP002",
                "current_location": "Mumbai Central Hub",
                "is_tampered": True,
                "tamper_detected_at": datetime(2025, 10, 31, 10, 15, 0),
                "scan_logs": [
                    {
                        "checkpoint_id": "CP001",
                        "name": "Warehouse Dispatch",
                        "location": "Mumbai Warehouse",
                        "scanned_by": "delivery_user_001",
                        "scanned_at": datetime(2025, 10, 31, 8, 0, 0),
                        "status": "passed",
                        "action": "proceed",
                        "tamper_check": "passed",
                        "tamper_count": 0,
                        "notes": "✅ No tampering detected. Good to proceed!"
                    },
                    {
                        "checkpoint_id": "CP002",
                        "name": "Local Hub",
                        "location": "Mumbai Central Hub",
                        "scanned_by": "delivery_user_002",
                        "scanned_at": datetime(2025, 10, 31, 13, 20, 0),
                        "status": "failed",
                        "action": "return_to_sender",
                        "tamper_check": "failed",
                        "tamper_count": 1,
                        "notes": "🚨 TAMPERING DETECTED! Return package to sender."
                    }
                ],
                "tamper_events": [
                    {
                        "timestamp": datetime(2025, 10, 31, 10, 15, 0),
                        "tamper_type": "shock",
                        "sensor_data": {
                            "shock_intensity": 8.5,
                            "temperature": 45.2,
                            "battery": 87
                        },
                        "gps_location": "19.0760,72.8777",
                        "detected_at": "2025-10-31T10:15:00"
                    }
                ],
                "checkpoints": [
                    {
                        "checkpoint_id": "CP001",
                        "name": "Warehouse Dispatch",
                        "location": "Mumbai Warehouse",
                        "scanned_by": "delivery_user_001",
                        "scanned_at": datetime(2025, 10, 31, 8, 0, 0),
                        "esp32_data": {
                            "temperature": 22.0,
                            "humidity": 44.0,
                            "tamper_status": "secure",
                            "battery_level": 94,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "action": "proceed",
                        "tamper_check": "passed",
                        "notes": "✅ No tampering detected. Good to go."
                    },
                    {
                        "checkpoint_id": "CP002",
                        "name": "Local Hub",
                        "location": "Mumbai Central Hub",
                        "scanned_by": "delivery_user_002",
                        "scanned_at": datetime(2025, 10, 31, 13, 20, 0),
                        "esp32_data": {
                            "temperature": 28.5,
                            "humidity": 55.0,
                            "tamper_status": "tampered",
                            "battery_level": 89,
                            "shock_detected": True,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "failed",
                        "action": "return_to_sender",
                        "reason": "Tampering detected",
                        "tamper_count": 1,
                        "notes": "🚨 TAMPERED - Returning to sender. 1 tamper event(s) detected."
                    }
                ],
                "created_at": datetime(2025, 10, 31, 7, 45, 0),
                "updated_at": datetime(2025, 10, 31, 13, 20, 0),
                "notes": "SECURITY INCIDENT - Investigation required"
            },
            {
                "package_id": "PKG20251031004",
                "package_token": "demo_token_fashion_004",
                "order_id": "ORD12348",
                "package_type": "fashion",
                "device_id": "DEV004",
                "sender_id": "sender_demo_001",
                "receiver_phone": "+91 98765 43213",
                "pin": "456789",
                "authenticated": False,
                "current_status": "created",
                "current_checkpoint": None,
                "current_location": "Warehouse",
                "is_tampered": False,
                "tamper_events": [],
                "scan_logs": [],
                "checkpoints": [],
                "created_at": datetime(2025, 10, 31, 19, 0, 0),
                "updated_at": datetime(2025, 10, 31, 19, 0, 0),
                "notes": "Fashion package ready for dispatch"
            },
            {
                "package_id": "PKG20251031005",
                "package_token": "demo_token_gaming_005",
                "order_id": "ORD12349",
                "package_type": "gaming",
                "device_id": "DEV005",
                "sender_id": "sender_demo_001",
                "receiver_phone": "+91 98765 43214",
                "pin": "321654",
                "authenticated": False,
                "current_status": "in_transit",
                "current_checkpoint": "CP005",
                "current_location": "Local Delivery Center",
                "is_tampered": False,
                "tamper_events": [],
                "scan_logs": [],
                "checkpoints": [
                    {
                        "checkpoint_id": "CP001",
                        "name": "Warehouse Dispatch",
                        "location": "Mumbai Warehouse",
                        "scanned_by": "delivery_user_001",
                        "scanned_at": datetime(2025, 10, 30, 16, 0, 0),
                        "esp32_data": {
                            "temperature": 23.1,
                            "humidity": 47.0,
                            "tamper_status": "secure",
                            "battery_level": 96,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "notes": "Gaming console package"
                    },
                    {
                        "checkpoint_id": "CP002",
                        "name": "Local Hub",
                        "location": "Mumbai Central Hub",
                        "scanned_by": "delivery_user_002",
                        "scanned_at": datetime(2025, 10, 30, 20, 15, 0),
                        "esp32_data": {
                            "temperature": 24.8,
                            "humidity": 49.0,
                            "tamper_status": "secure",
                            "battery_level": 91,
                            "shock_detected": False,
                            "gps_location": "19.0760,72.8777"
                        },
                        "status": "passed",
                        "notes": "Fragile handling applied"
                    },
                    {
                        "checkpoint_id": "CP004",
                        "name": "Destination Hub",
                        "location": "Bangalore Hub",
                        "scanned_by": "delivery_user_004",
                        "scanned_at": datetime(2025, 10, 31, 6, 30, 0),
                        "esp32_data": {
                            "temperature": 26.2,
                            "humidity": 51.0,
                            "tamper_status": "secure",
                            "battery_level": 87,
                            "shock_detected": False,
                            "gps_location": "12.9716,77.5946"
                        },
                        "status": "passed",
                        "notes": "Arrived at destination city"
                    },
                    {
                        "checkpoint_id": "CP005",
                        "name": "Out for Delivery",
                        "location": "Local Delivery Center",
                        "scanned_by": "delivery_user_005",
                        "scanned_at": datetime(2025, 10, 31, 9, 45, 0),
                        "esp32_data": {
                            "temperature": 25.9,
                            "humidity": 50.0,
                            "tamper_status": "secure",
                            "battery_level": 84,
                            "shock_detected": False,
                            "gps_location": "12.9716,77.5946"
                        },
                        "status": "passed",
                        "notes": "Loaded for final delivery"
                    }
                ],
                "created_at": datetime(2025, 10, 30, 15, 30, 0),
                "updated_at": datetime(2025, 10, 31, 9, 45, 0),
                "notes": "Gaming console - handle with care"
            }
        ]
        
        # Insert mock packages
        await app.mongodb.packages.insert_many(mock_packages)
        
        return {
            "message": "Mock data created successfully",
            "packages_created": len(mock_packages),
            "demo_tokens": [
                "demo_token_electronics_001",
                "demo_token_jewelry_002", 
                "demo_token_tampered_003",
                "demo_token_fashion_004",
                "demo_token_gaming_005"
            ],
            "demo_pins": [
                "123456",
                "654321",
                "789012", 
                "456789",
                "321654"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/delivery/packages")
async def get_delivery_packages(checkpoint_id: str = None, token_data: dict = Depends(require_role("delivery"))):
    """
    Get packages for delivery dashboard
    """
    try:
        query = {}
        if checkpoint_id:
            query["current_checkpoint"] = checkpoint_id
        
        packages = []
        cursor = app.mongodb.packages.find(query).sort("updated_at", -1)
        
        async for package in cursor:
            package["_id"] = str(package["_id"])
            packages.append({
                "package_id": package["package_id"],
                "order_id": package["order_id"],
                "package_type": package["package_type"],
                "current_status": package["current_status"],
                "current_location": package["current_location"],
                "current_checkpoint": package.get("current_checkpoint"),
                "updated_at": package["updated_at"].isoformat(),
                "checkpoints_count": len(package.get("checkpoints", []))
            })
        
        return packages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/delivery/package/{package_id}")
async def get_delivery_package_details(package_id: str, token_data: dict = Depends(require_role("delivery"))):
    """
    Get detailed package information for delivery dashboard
    """
    try:
        package = await app.mongodb.packages.find_one({"package_id": package_id})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        package["_id"] = str(package["_id"])
        
        return {
            "package_id": package["package_id"],
            "package_token": package["package_token"],
            "order_id": package["order_id"],
            "package_type": package["package_type"],
            "device_id": package["device_id"],
            "receiver_phone": package["receiver_phone"],
            "current_status": package["current_status"],
            "current_location": package["current_location"],
            "current_checkpoint": package.get("current_checkpoint"),
            "is_tampered": package.get("is_tampered", False),
            "tamper_events": package.get("tamper_events", []),
            "checkpoints": package.get("checkpoints", []),
            "created_at": package["created_at"].isoformat(),
            "updated_at": package["updated_at"].isoformat(),
            "notes": package.get("notes")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sender/packages")
async def get_sender_packages(token_data: dict = Depends(require_role("sender"))):
    """
    Get all packages for sender dashboard
    """
    try:
        sender_id = token_data["sub"]
        
        packages = []
        cursor = app.mongodb.packages.find({"sender_id": sender_id}).sort("created_at", -1)
        
        async for package in cursor:
            package["_id"] = str(package["_id"])
            
            # Get latest ESP32 data
            latest_esp32_data = None
            if package.get("checkpoints"):
                latest_checkpoint = package["checkpoints"][-1]
                latest_esp32_data = latest_checkpoint.get("esp32_data")
            
            packages.append({
                "package_id": package["package_id"],
                "order_id": package["order_id"],
                "package_type": package["package_type"],
                "device_id": package["device_id"],
                "current_status": package["current_status"],
                "current_location": package["current_location"],
                "current_checkpoint": package.get("current_checkpoint"),
                "checkpoints_count": len(package.get("checkpoints", [])),
                "latest_esp32_data": latest_esp32_data,
                "created_at": package["created_at"].isoformat(),
                "updated_at": package["updated_at"].isoformat()
            })
        
        return packages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sender/package/{package_id}/journey")
async def get_package_journey(package_id: str, token_data: dict = Depends(require_role("sender"))):
    """
    Get detailed checkpoint journey for a package
    """
    try:
        package = await app.mongodb.packages.find_one({"package_id": package_id, "sender_id": token_data["sub"]})
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return {
            "package_id": package["package_id"],
            "order_id": package["order_id"],
            "current_status": package["current_status"],
            "current_location": package["current_location"],
            "checkpoints": package.get("checkpoints", []),
            "created_at": package["created_at"].isoformat(),
            "updated_at": package["updated_at"].isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
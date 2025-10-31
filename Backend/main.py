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
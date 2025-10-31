from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from dotenv import load_dotenv

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
    phone: str = None
    company_name: str = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    phone: str = None
    company_name: str = None

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
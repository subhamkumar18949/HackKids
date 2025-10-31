from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# --- Pre-configured CORS ---
# This allows your React app (running on localhost:5173)
# to make requests to this API (running on localhost:8000)
origins = [
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


# --- TODO DURING HACKATHON ---

# @app.post("/log")
# async def log_seal_status(request: Request):
#     """
#     Endpoint for the React app to send seal data (e.g., status, id)
#     which you will then save to MongoDB.
#     """
#     data = await request.json() 
#     # Example: {'seal_id': 'seal-001', 'status': 'TAMPERED'}
#     
#     # Use Motor to update/insert the document in the 'seals' collection
#     # await app.mongodb.seals.update_one(
#     #     {"seal_id": data["seal_id"]},
#     #     {"$set": {"status": data["status"], "last_updated": datetime.now()}},
#     #     upsert=True
#     # )
#     return {"status": "success", "received_data": data}

# @app.get("/dashboard-data")
# async def get_dashboard_data():
#     """
#     Endpoint for the Dashboard to poll.
#     This will query MongoDB for all seal statuses.
#     """
#     seals = []
#     # cursor = app.mongodb.seals.find({})
#     # async for seal in cursor:
#     #     seal["_id"] = str(seal["_id"]) # Convert ObjectId to string for JSON
#     #     seals.append(seal)
#     # return seals
#     return [{"seal_id": "test-001", "status": "SAFE"}] # Placeholder
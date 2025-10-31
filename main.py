# main.py
import os
from fastapi import FastAPI
from web3 import Web3
from dotenv import load_dotenv

# Load your secret keys from the .env file
load_dotenv()

# --- 1. SET UP YOUR VARIABLES ---

# Get your secrets from the .env file
YOUR_HELPER_PRIVATE_KEY = os.getenv("SERVER_PRIVATE_KEY")
YOUR_ALCHEMY_URL = os.getenv("ALCHEMY_URL")

# Your contract details
CONTRACT_ADDRESS = "0x4b96Ec59eB55a82D4F35A381250e97d7E0Ddae09"

# This is the "magic rule book" part (your ABI)
CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_deviceId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_userId",
                "type": "string"
            }
        ],
        "name": "addLog",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "allLogs",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "deviceId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "userId",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getLogCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# --- 2. CONNECT TO THE BLOCKCHAIN ---

# Connect to the Sepolia testnet via Alchemy
web3 = Web3(Web3.HTTPProvider(YOUR_ALCHEMY_URL))

# Load your helper's wallet
server_account = web3.eth.account.from_key(YOUR_HELPER_PRIVATE_KEY)
web3.eth.default_account = server_account.address # Set it as the default

print(f"Helper server is connecting with wallet: {server_account.address}")

# Load the "Rule Book" (your smart contract)
contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

# --- 3. CREATE THE API ---

app = FastAPI()

# --- API ENDPOINT 1: WRITE TO BLOCKCHAIN ---
@app.post("/api/log-access")
async def log_access(data: dict):
    """
    Receives data from the website and writes it to the blockchain.
    Expected JSON: {"deviceId": "ESP32_001", "userId": "User_Alice"}
    """
    device_id = data.get("deviceId")
    user_id = data.get("userId")

    if not device_id or not user_id:
        return {"status": "error", "message": "Missing 'deviceId' or 'userId'"}

    print(f"Received log request: Device={device_id}, User={user_id}")

    try:
        # 1. Build the transaction to call the "addLog" function
        tx = contract.functions.addLog(
            device_id,
            user_id
        ).build_transaction({
            'from': server_account.address,
            'nonce': web3.eth.get_transaction_count(server_account.address),
            'gas': 200000,
            'gasPrice': web3.eth.gas_price
        })

        # 2. Sign the transaction with the helper's private key ("pen")
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=YOUR_HELPER_PRIVATE_KEY)
        
        # 3. Send the transaction to the "post office" (Alchemy)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # 4. Wait for the "delivery confirmation" (transaction receipt)
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)

        print(f"Success! Log added to blockchain.")
        print(f"Transaction hash: {tx_hash.hex()}")

        return {
            "status": "success",
            "transaction_hash": tx_hash.hex(),
            "block_number": tx_receipt.blockNumber
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

# --- API ENDPOINT 2: READ FROM BLOCKCHAIN ---
@app.get("/api/get-all-logs")
async def get_all_logs():
    """
    Reads all access logs directly from the smart contract.
    This is a "read-only" call, so it costs no gas.
    """
    print("Received request to get all logs...")
    
    log_list = []
    
    try:
        # 1. Call the "getLogCount" function on the contract
        total_logs = contract.functions.getLogCount().call()
        
        # 2. Loop from the newest log to the oldest
        # (We loop backwards so the newest logs are first)
        for i in range(total_logs - 1, -1, -1):
            
            # 3. Call the "allLogs(i)" function to get the log
            # This calls the "allLogs" function from your ABI
            log_entry = contract.functions.allLogs(i).call()
            
            # log_entry looks like: [1698765432, "Device-001", "User-Alice"]
            
            # Format it nicely for the website
            log_list.append({
                "timestamp": log_entry[0],
                "deviceId": log_entry[1],
                "userId": log_entry[2]
            })

        print(f"Successfully retrieved {len(log_list)} logs.")
        
        return {
            "status": "success",
            "log_count": total_logs,
            "logs": log_list
        }
    
    except Exception as e:
        print(f"Error reading logs: {e}")
        return {"status": "error", "message": str(e)}

# --- 4. RUN THE SERVER ---
# To run this server, go to your terminal and type:
# uvicorn main:app --reload

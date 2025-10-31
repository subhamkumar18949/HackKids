#!/usr/bin/env python3
"""
Demo Setup Script for VeriSeal Hackathon
Run this to populate the database with impressive mock data for judges
"""

import requests
import json

def setup_demo_data():
    """Setup demo data for hackathon presentation"""
    
    print("🚀 Setting up VeriSeal Demo Data...")
    print("=" * 50)
    
    try:
        # Call the mock data endpoint
        response = requests.post('http://127.0.0.1:8000/demo/create-mock-data')
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Mock data created successfully!")
            print(f"📦 Created {data['packages_created']} demo packages")
            print()
            
            print("🎯 Demo Scenarios Ready:")
            print("=" * 30)
            
            scenarios = [
                {
                    "title": "📱 Electronics Package (In Transit)",
                    "token": "demo_token_electronics_001",
                    "pin": "123456",
                    "status": "Currently at Delhi Transit Hub",
                    "checkpoints": "3 checkpoints passed",
                    "highlight": "Shows real-time tracking through supply chain"
                },
                {
                    "title": "💎 Jewelry Package (Delivered)",
                    "token": "demo_token_jewelry_002", 
                    "pin": "654321",
                    "status": "Successfully delivered",
                    "checkpoints": "4 checkpoints completed",
                    "highlight": "Complete journey from warehouse to customer"
                },
                {
                    "title": "🚨 Tampered Package (ESP32 Detected Shock)",
                    "token": "demo_token_tampered_003",
                    "pin": "789012", 
                    "status": "RETURNING TO SENDER - Tampering detected",
                    "checkpoints": "CP1 ✅ passed → ESP32 detected shock → CP2 🚨 return to sender",
                    "highlight": "Shows ESP32 tamper detection between checkpoints"
                },
                {
                    "title": "👕 Fashion Package (Ready to Ship)",
                    "token": "demo_token_fashion_004",
                    "pin": "456789",
                    "status": "Created, ready for dispatch",
                    "checkpoints": "0 checkpoints (just created)",
                    "highlight": "Shows package creation workflow"
                },
                {
                    "title": "🎮 Gaming Console (Out for Delivery)",
                    "token": "demo_token_gaming_005",
                    "pin": "321654",
                    "status": "Out for delivery",
                    "checkpoints": "4 checkpoints passed",
                    "highlight": "Near final delivery stage"
                }
            ]
            
            for i, scenario in enumerate(scenarios, 1):
                print(f"{i}. {scenario['title']}")
                print(f"   Token: {scenario['token']}")
                print(f"   PIN: {scenario['pin']}")
                print(f"   Status: {scenario['status']}")
                print(f"   Progress: {scenario['checkpoints']}")
                print(f"   💡 {scenario['highlight']}")
                print()
            
            print("🎭 Demo Instructions for Judges:")
            print("=" * 35)
            print("1. 👤 Login as different roles:")
            print("   • Sender: Create packages, view live tracking")
            print("   • Delivery: Scan packages at checkpoints") 
            print("   • Receiver: Scan QR codes, enter PINs")
            print()
            print("2. 📱 Test the complete flow:")
            print("   • Use any demo token above in receiver scanner")
            print("   • Enter corresponding PIN to see full journey")
            print("   • Check sender dashboard for live updates")
            print()
            print("3. 🚨 Test Tamper Detection Flow:")
            print("   • Package #3 shows ESP32 detected shock at 10:15 AM")
            print("   • CP1 scan: ✅ Good to go (no tampering yet)")
            print("   • ESP32 reports shock between CP1 and CP2")
            print("   • CP2 scan: 🚨 Return to sender (tampering detected)")
            print()
            print("4. 🎯 Key Features to Highlight:")
            print("   • ESP32 continuously monitors packages")
            print("   • Automatic tamper detection with timestamps")
            print("   • Logistics sees 'proceed' or 'return to sender'")
            print("   • Complete transparency for receivers")
            print()
            print("✨ Your demo database is ready!")
            print("🚀 New Endpoints Available:")
            print("   • POST /esp32/report-tamper - ESP32 reports tampering")
            print("   • POST /delivery/scan-qr - Checkpoint scan with tamper check")
            print("   • POST /receiver/verify-package - View complete journey")
            print()
            print("Start your FastAPI server and impress the judges! 🏆")
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to FastAPI server")
        print("Make sure your server is running on http://127.0.0.1:8000")
        print("Run: uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    setup_demo_data()

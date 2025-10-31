#!/usr/bin/env python3
"""Test if the scan-qr endpoint exists"""

from main import app

# List all routes
print("📋 All registered routes:")
print("=" * 50)
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        methods = ','.join(route.methods) if route.methods else 'N/A'
        print(f"{methods:10} {route.path}")

print("\n🔍 Searching for 'scan-qr' routes:")
print("=" * 50)
scan_qr_routes = [route for route in app.routes if hasattr(route, 'path') and 'scan-qr' in route.path]
if scan_qr_routes:
    for route in scan_qr_routes:
        print(f"✅ Found: {route.methods} {route.path}")
else:
    print("❌ No 'scan-qr' routes found!")

print("\n🔍 Searching for '/delivery/' routes:")
print("=" * 50)
delivery_routes = [route for route in app.routes if hasattr(route, 'path') and '/delivery/' in route.path]
for route in delivery_routes:
    methods = ','.join(route.methods) if route.methods else 'N/A'
    print(f"{methods:10} {route.path}")

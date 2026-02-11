
import requests
import json

url = "http://localhost:8001/place-order"
data = {
    "customer_email": "test@dineiq.ai",
    "cart_items": [
        {
            "id": "1",
            "name": "Test Item",
            "price": 100,
            "quantity": 1,
            "category": "Test"
        }
    ],
    "final_total": 100,
    "payment_method": "CASH",
    "instructions": "Test Order"
}

try:
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    try:
        print("Response JSON:", response.json())
    except:
        print("Response Text:", response.text)
except Exception as e:
    print(f"Request Failed: {e}")

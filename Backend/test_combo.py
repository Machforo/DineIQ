
import requests
import json

url = "http://localhost:8000/generate-combos"
data = {
    "num_combos": 3,
    "email": "test@dineiq.ai"
}

try:
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=data, timeout=30) # Increased timeout for AI
    print(f"Status Code: {response.status_code}")
    try:
        print("Response JSON:", json.dumps(response.json(), indent=2))
    except:
        print("Response Text:", response.text)
except Exception as e:
    print(f"Request Failed: {e}")

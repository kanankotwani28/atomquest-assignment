import requests

url = "http://localhost:5000/api/auth/login"
email = "admin@atomquest.com"
password = "password123"

try:
    resp = requests.post(url, json={"email": email, "password": password})
    print(f"Status Code: {resp.status_code}")
    print(f"Response Body: {resp.text}")
except Exception as e:
    print(f"Connection failed: {e}")

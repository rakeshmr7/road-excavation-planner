import httpx
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.core.config import settings

url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={settings.GEMINI_API_KEY}"
payload = {
    "model": "models/text-embedding-004",
    "content": {"parts": [{"text": "Testing"}]}
}
print(url[:80] + "...")
try:
    response = httpx.post(url, json=payload, timeout=5.0)
    print("Status:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print(e)

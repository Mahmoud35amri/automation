import requests, os
api_key = os.environ.get("GROQ_API_KEY", "")
r = requests.get("https://api.groq.com/openai/v1/models",
                  headers={"Authorization": f"Bearer {api_key}"})
print(r.status_code)
for m in r.json().get("data", []):
    print(m["id"])
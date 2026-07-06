import httpx
import json
import asyncio
from langsmith import traceable
from app.core.config import settings

@traceable(run_type="llm", name="Cascading LLM Query")
async def query_llm(prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
    """
    Submits a query to the configured LLMs with a cascading failover strategy:
    Groq (Primary) -> Gemini (Fallback 1) -> Ollama (Fallback 2).
    Includes automatic retry and timeout bounds.
    """
    errors = []

    # ----------------------------------------------------
    # PHASE 1: Primary - Groq API
    # ----------------------------------------------------
    if settings.GROQ_API_KEY:
        try:
            print("AI Pipeline: Attempting Primary LLM (Groq)...")
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1500
                }
                # Timeout set to 5.0 seconds
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=5.0
                )
                if response.status_code == 200:
                    data = response.json()
                    answer = data["choices"][0]["message"]["content"]
                    print("AI Pipeline: Groq call successful.")
                    return answer
                else:
                    err_msg = f"Groq responded with status {response.status_code}: {response.text}"
                    print(f"AI Pipeline Warning: {err_msg}")
                    errors.append(err_msg)
        except Exception as e:
            err_msg = f"Groq request failed: {str(e)}"
            print(f"AI Pipeline Warning: {err_msg}")
            errors.append(err_msg)

    # ----------------------------------------------------
    # PHASE 2: Fallback 1 - Gemini API
    # ----------------------------------------------------
    if settings.GEMINI_API_KEY:
        for attempt in range(3):
            try:
                print(f"AI Pipeline: Attempting Fallback 1 (Gemini API) - Attempt {attempt+1}...")
                async with httpx.AsyncClient() as client:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                    headers = {"Content-Type": "application/json"}
                    # Combine system prompt and user prompt for Gemini
                    combined_prompt = f"{system_prompt}\n\nUser Question:\n{prompt}"
                    payload = {
                        "contents": [
                            {"parts": [{"text": combined_prompt}]}
                        ],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 1500
                        }
                    }
                    # Timeout set to 7.0 seconds
                    response = await client.post(
                        url,
                        headers=headers,
                        json=payload,
                        timeout=7.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        answer = data["candidates"][0]["content"]["parts"][0]["text"]
                        print("AI Pipeline: Gemini call successful.")
                        return answer
                    else:
                        err_msg = f"Gemini responded with status {response.status_code}: {response.text}"
                        print(f"AI Pipeline Warning: {err_msg}")
                        errors.append(err_msg)
            except Exception as e:
                err_msg = f"Gemini request failed: {str(e)}"
                print(f"AI Pipeline Warning: {err_msg}")
                errors.append(err_msg)
                if attempt < 2:
                    await asyncio.sleep(0.5 * (attempt + 1))

    # ----------------------------------------------------
    # PHASE 3: Fallback 2 - Local Ollama
    # ----------------------------------------------------
    try:
        print("AI Pipeline: Primary and Fallback 1 failed. Attempting Fallback 2 (Local Ollama)...")
        async with httpx.AsyncClient() as client:
            url = f"{settings.OLLAMA_HOST}/api/chat"
            payload = {
                "model": "llama3",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            }
            # Timeout set to 120.0 seconds to accommodate large RAG contexts and slow local inference
            response = await client.post(
                url,
                json=payload,
                timeout=120.0
            )
            if response.status_code == 200:
                data = response.json()
                answer = data["message"]["content"]
                print("AI Pipeline: Ollama call successful.")
                return answer
            else:
                err_msg = f"Ollama responded with status {response.status_code}: {response.text}"
                print(f"AI Pipeline Error: {err_msg}")
                errors.append(err_msg)
    except Exception as e:
        err_msg = f"Ollama request failed: {str(e)}"
        print(f"AI Pipeline Error: {err_msg}")
        errors.append(err_msg)

    # If all options fail
    raise RuntimeError(f"All LLMs in the failover chain failed. Errors: {'; '.join(errors)}")

#!/usr/bin/env python3
"""
Laisky API Model Connection Tester

Tests connectivity and availability of all models on the Laisky OneAPI endpoint.
Usage: python3 scripts/test-laisky-models.py
"""

import json
import time
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Configuration
API_URL = "https://oneapi.laisky.com"
API_KEY = "sk-oNRAXxWHvppzJdqx019bA0Bc3f0770Df8128Ae7cAe995209"

# Models to test
MODELS = [
    # Google
    {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash Preview"},
    {"id": "gemini-2.5-pro-preview-05-06", "name": "Gemini 2.5 Pro Preview"},
    {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
    {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
    {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro"},

    # Anthropic
    {"id": "claude-3.5-haiku", "name": "Claude 3.5 Haiku"},
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet"},
    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},

    # OpenAI
    {"id": "gpt-4o-mini-2024-07-18", "name": "GPT-4o Mini"},
    {"id": "gpt-4o-2024-11-20", "name": "GPT-4o"},
    {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo"},
    {"id": "o1-preview", "name": "o1 Preview"},
    {"id": "o1-mini", "name": "o1 Mini"},

    # DeepSeek
    {"id": "deepseek-chat", "name": "DeepSeek Chat"},
    {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner"},
]

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def test_model(model_id: str) -> dict:
    """Test a single model with a simple chat completion request."""

    url = f"{API_URL}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }

    payload = {
        "model": model_id,
        "messages": [
            {"role": "user", "content": "Say 'OK' if you can hear me."}
        ],
        "max_tokens": 10,
        "temperature": 0,
    }

    start_time = time.time()

    try:
        req = Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        with urlopen(req, timeout=30) as response:
            latency = time.time() - start_time
            data = json.loads(response.read().decode())

            # Extract response
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            return {
                "status": "ok",
                "latency": latency,
                "response": content[:50],
                "error": None,
            }

    except HTTPError as e:
        latency = time.time() - start_time
        try:
            error_body = e.read().decode()
            error_json = json.loads(error_body)
            error_msg = error_json.get("error", {}).get("message", str(e))
        except:
            error_msg = str(e)

        return {
            "status": "error",
            "latency": latency,
            "response": None,
            "error": f"{e.code}: {error_msg[:80]}",
        }

    except URLError as e:
        return {
            "status": "error",
            "latency": time.time() - start_time,
            "response": None,
            "error": f"Connection error: {str(e.reason)[:50]}",
        }

    except Exception as e:
        return {
            "status": "error",
            "latency": time.time() - start_time,
            "response": None,
            "error": str(e)[:80],
        }


def main():
    print(f"\n{BOLD}{BLUE}╔════════════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{BLUE}║         Laisky API Model Connection Tester                     ║{RESET}")
    print(f"{BOLD}{BLUE}╚════════════════════════════════════════════════════════════════╝{RESET}")
    print(f"\n{YELLOW}API URL:{RESET} {API_URL}")
    print(f"{YELLOW}API Key:{RESET} {API_KEY[:20]}...")
    print(f"\n{BOLD}Testing {len(MODELS)} models...{RESET}\n")

    results = []
    ok_count = 0
    error_count = 0

    for i, model in enumerate(MODELS, 1):
        model_id = model["id"]
        model_name = model["name"]

        print(f"[{i:2}/{len(MODELS)}] Testing {model_name}... ", end="", flush=True)

        result = test_model(model_id)
        result["model_id"] = model_id
        result["model_name"] = model_name
        results.append(result)

        if result["status"] == "ok":
            ok_count += 1
            print(f"{GREEN}✓ OK{RESET} ({result['latency']:.2f}s) - Response: \"{result['response']}\"")
        else:
            error_count += 1
            print(f"{RED}✗ FAIL{RESET} - {result['error']}")

        # Small delay between requests
        time.sleep(0.5)

    # Summary
    print(f"\n{BOLD}{'═' * 64}{RESET}")
    print(f"{BOLD}Summary:{RESET}")
    print(f"  {GREEN}✓ OK:{RESET} {ok_count}")
    print(f"  {RED}✗ Errors:{RESET} {error_count}")
    print(f"{'═' * 64}\n")

    # Working models
    if ok_count > 0:
        print(f"{GREEN}{BOLD}Working models:{RESET}")
        for r in results:
            if r["status"] == "ok":
                print(f"  • {r['model_id']}")
        print()

    # Failed models
    if error_count > 0:
        print(f"{RED}{BOLD}Failed models:{RESET}")
        for r in results:
            if r["status"] == "error":
                print(f"  • {r['model_id']}: {r['error']}")
        print()

    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

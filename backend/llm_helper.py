import os
import httpx
import json
import re

PROMPT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diagnose_prompt.md")

def load_system_prompt() -> str:
    """Loads system instructions from diagnose_prompt.md."""
    if not os.path.exists(PROMPT_FILE):
        return "You are NetSage, a network troubleshooting assistant for Cisco-style lab networks."
    
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract the System Prompt section
    # Usually starts under the ## System Prompt header and goes to Worked Example 1
    match = re.search(r"## System Prompt.*?\n(.*?)(?=\n## Worked Example)", content, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Fallback to the whole file if regex fails
    return content.strip()

def diagnose_with_llm(symptom: str, show_output: str, topology_note: str = "") -> dict:
    """
    Constructs the prompt, calls Gemini API using httpx, and parses/validates the structured JSON result.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")

    system_instruction = load_system_prompt()
    
    user_prompt = f"Symptom: {symptom}\nTopology note: {topology_note}\nShow-command output: {show_output}"
    
    # Construct Google Gemini REST API payload
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {
            "parts": [
                {"text": system_instruction}
            ]
        },
        "contents": [
            {
                "parts": [
                    {"text": user_prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    # Make synchronous HTTP request
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=20.0)
        response.raise_for_status()
        result_json = response.json()
        
        # Extract text response from Gemini's nested JSON
        # Response structure: candidates -> content -> parts -> text
        text_content = result_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        
        # Parse the structured JSON response from the LLM
        parsed_diagnosis = json.loads(text_content)
        
        # Validate required schema fields
        required_keys = ["root_cause", "osi_layer", "confidence", "evidence", "next_command", "fix_steps"]
        for key in required_keys:
            if key not in parsed_diagnosis:
                parsed_diagnosis[key] = "Not provided by model"
                
        return parsed_diagnosis
        
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Gemini API returned status {e.response.status_code}: {e.response.text}")
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Malformed response format from Gemini API: {str(e)}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Model failed to generate valid JSON: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error calling Gemini API: {str(e)}")

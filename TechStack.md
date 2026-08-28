Tech Stack — NetSage AI
Frontend / Dashboard
React (JSX, functional components + hooks) — dashboard UI
Tailwind CSS (core utility classes) — layout and styling
Recharts — verdict donut chart, severity bar chart
Lucide React — icons
AI Layer
Claude (Anthropic API) or GPT-4 (OpenAI API) — whichever your team has access to; either works since this is pure prompt engineering, no fine-tuning
Vision-capable model endpoint (e.g. Claude with image input, or GPT-4V) — for the screenshot/image input feature
Plain prompt templates (diagnose_prompt.md) — no LangChain or agent framework needed; a single structured API call per case is enough for this scope
Deterministic Logic
Python 3 — rule checker (rule_checker.py)
Standard library only (json, ipaddress, dataclasses, argparse) — no extra dependencies needed, keeps it easy to run for grading
Data Storage
CSV files — cases.csv, AI results, human review log (no database needed at this scale — 30 rows)
JSON — structured AI diagnosis output per case, and rule-checker input/output
Orchestration (the piece connecting everything)
A simple Python script that:
Reads cases.csv
Sends each case through the AI API using diagnose_prompt.md
Saves the JSON response
Optionally calls rule_checker.py on the same case for cross-verification
Outputs a combined results file for the dashboard to consume
Dev Environment
VS Code or any editor
Git/GitHub — version control, especially since it's a group project (Cisco also checks for plagiarism, so commit history helps prove originality)
Python virtual environment (venv) — keep dependencies isolated
Optional / Stretch
Streamlit — if you want a faster, all-Python alternative dashboard instead of maintaining React (not needed since React dashboard is already built, but worth knowing as a fallback)
PapaParse (JS) — if you want the React dashboard to load cases.csv directly in-browser instead of hardcoded data
OCR fallback (e.g. Tesseract) — only needed if your chosen AI model can't handle images directly; most modern vision models skip this need entirely

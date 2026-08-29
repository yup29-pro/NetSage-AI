# NetSage-AI — Memory & Context

## Project Overview & Mission
NetSage AI is an intelligent network diagnostic, deterministic rule checking, and human-in-the-loop review assistant designed for Cisco-style lab topologies and Packet Tracer scenarios.

## Tech Stack & Architecture
- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide React (vector icons only), Recharts, Framer Motion.
- **Backend / Engine**: Python 3 (FastAPI REST API, deterministic `rule_checker.py`), SQLite (`netsage.db`), CSV/JSON datasets.
- **AI Integration**: Structured prompt engineering (`diagnose_prompt.md`) supporting Anthropic Claude / OpenAI GPT-4 / Gemini Vision & reasoning models.

## Key Completed Milestones & Repairs
- [x] Cloned GitHub repository (`yup29-pro/NetSage-AI`) to local workspace
- [x] Repaired hardcoded relative paths in `backend/init_db.py` and `backend/main.py` using absolute base directory resolution
- [x] Expanded Cisco lab case dataset in `backend/data/cases.csv` to 30 comprehensive scenarios across 10 fault domains (`VLAN`, `Gateway`, `DHCP`, `DNS`, `Routing`, `ACL`, `NAT`, `Wireless`, `Interface`, `Trunk`)
- [x] Initialized and seeded SQLite database (`netsage.db`) with full 30-case dataset and human reviews (including documented corrections for Responsible AI Log)
- [x] Enhanced FastAPI backend (`backend/main.py`) with complete REST API endpoints:
  - `GET /api/cases` (with search and multi-criteria filtering)
  - `GET /api/cases/{case_id}`
  - `GET /api/stats`
  - `POST /api/reviews`
  - `POST /api/diagnose`
  - `POST /api/rule-checker` & `GET /api/rule-checker/sample`
  - `GET /api/export/{export_type}`
- [x] Resolved all linter warnings (`oxlint` in `frontend/`) and verified clean production build (`vite build`)
- [x] Implemented master **Cases View** (`currentView === 'cases'`) with live search and multi-filtering
- [x] Implemented **Reports & Export Center** (`currentView === 'reports'`) for deliverable downloads
- [x] Connected live diagnostic engine with preset Cisco lab loaders and seamless offline demo fallback
- [x] Standardized UTF-8 `.gitignore` for Python and Node environments

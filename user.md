# NetSage AI - Project Analysis & User Guide

Welcome to **NetSage AI**! This document provides an overview of what has been built, the architecture, and how a user interacts with the application.

## What We Have Built

NetSage AI is an AI-assisted troubleshooting copilot tailored for Cisco-style lab networks. It is designed to help Junior Network Engineers narrow down fault categories while enforcing evidence-based troubleshooting and mandating human oversight. 

### Key Components

1. **Frontend (React + Vite + Tailwind CSS)**
   - **Dashboard & UI:** A modern, Cisco-themed web interface that presents metrics, case logs, and a sleek workspace for engineers.
   - **Case Management:** A review queue and detailed case views where junior engineers can run diagnoses and senior reviewers can accept, edit, or reject the AI's suggestions.
   - **Multimodal Inputs:** The interface is built to handle text-based symptom descriptions and terminal outputs, with planned support for screenshot evidence.

2. **Backend (Python + FastAPI)**
   - **API Layer (`main.py`):** A lightweight FastAPI server providing endpoints for frontend-backend communication.
   - **Data Persistence:** An SQLite database (`netsage.db`) holding case data, AI diagnoses, and human reviews. It is initialized via `init_db.py`.
   - **Deterministic Cross-checking (`rule_checker.py`):** A pure Python script that acts as a guardrail against AI hallucinations. It detects deterministic errors like duplicate IPs, subnet mismatches, or administratively down interfaces.
   - **AI Prompting Logic (`diagnose_prompt.md`):** Contains the core system prompts used to constrain the LLM into generating strict, evidence-backed JSON responses.

### Directory Structure

The project has been organized into a clean, modular structure:

- `frontend/` - Contains all the React/Vite code.
- `backend/` - Contains the FastAPI server, database scripts, and the `rule_checker`.
  - `backend/data/` - Holds the `cases.csv` dataset acting as the ground truth.
- `PRD.md` & `TechStack.md` - Core project documentation.

## User Roles & Workflow

- **Junior Engineer:** Encounters a fault in a lab, runs show commands, and inputs the symptoms and outputs into NetSage AI. The engineer relies on the AI's suggested root cause and "next command" but cannot apply fixes until approved.
- **Senior Reviewer:** Reviews the AI's diagnosis in the "Review Queue". They ensure the AI cited the correct evidence and either Accept, Edit, or Reject the diagnosis. Escalated or difficult cases are handled exclusively by this role.

## Running the Application Locally

The application runs using two distinct servers:

1. **Start the Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
   *The backend will run on `http://127.0.0.1:8000`.*

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

## Unique Selling Points (USPs)

- **Never Auto-Applied:** By design, NetSage AI does not auto-fix problems. It strictly requires human review, building a *Responsible AI Log*.
- **Hybrid Troubleshooting:** Merges generative AI intuition with a deterministic Python rule-checker to catch obvious misconfigurations.
- **Role-based Escalation:** Ensures that uncertain or repeated issues are bubbled up to senior team members.

---
*This file serves as a high-level summary of the NetSage AI architecture and built features.*

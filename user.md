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

## Full User Flow & Page Breakdown

The application is structured into a logical flow to guide engineers from encountering an issue to documenting its resolution, with built-in human oversight.

### 1. Landing Page
- **Use:** The entry point to the application.
- **Description:** A light, Cisco-themed hero page that pitches the product. It features a clear "Enter Console" call-to-action (CTA) to draw the user into the main application.

### 2. Login (Welcome / Reviewer Setup)
- **Use:** Establishes lightweight, session-based identity.
- **Description:** A simple setup screen where users enter their Name and select a Role (Junior Engineer or Senior Reviewer). This data is stored in the browser's session storage. There is no formal backend authentication system required for this scope, making it easy to test and switch users on the fly.

### 3. Overview
- **Use:** The main dashboard providing a high-level view of system health and metrics.
- **Description:** Features at-a-glance stat cards (Total Cases, AI-Human Agreement, etc.), a Reviewer Verdicts donut chart, Cases by Severity bar chart, and an AI Confidence Calibration chart. It helps managers and engineers see the aggregate performance of the AI and the team.

### 4. Cases
- **Use:** The master view of the entire dataset.
- **Description:** A comprehensive, searchable, and filterable list of all cases in the system. Users can browse past incidents to see what faults were diagnosed and how they were resolved.

### 5. New Diagnosis
- **Use:** Where the core troubleshooting happens.
- **Description:** A live input form where engineers submit symptom text, paste show-command output, and optionally upload a screenshot. Hitting "Run Diagnosis" queries the AI, which returns a structured card detailing the root cause, confidence level, cited evidence, and the next command to run. The engineer can then send it to the Review Queue.

### 6. Review Queue
- **Use:** A holding area for unverified AI diagnoses.
- **Description:** Displays a list of cases that have been generated but not yet reviewed by a human. It is sorted by severity, ensuring critical issues are addressed first. Reviewers open these cases to Accept, Edit, or Reject the AI's findings.

### 7. My Reviews
- **Use:** A personalized log of past actions.
- **Description:** Shows all cases previously reviewed by the currently logged-in user. It is filterable by verdict and opens cases in a read-only state, acting as a personal audit trail.

### 8. Escalations
- **Use:** A specialized queue for difficult or recurring issues.
- **Description:** Contains cases flagged for senior-level review (e.g., due to low AI confidence or repeated rejections). Only users with the **Senior Reviewer** role can resolve cases in this queue, enforcing a strict hierarchy for complex faults.

### 9. Responsible AI Log
- **Use:** Transparency and accountability for AI mistakes.
- **Description:** A filtered view showing only cases that were Edited or Rejected by humans. It provides a side-by-side comparison of "AI Suggested" vs "Human Corrected," along with a callout explaining why the correction was made, demonstrating responsible AI usage.

### 10. Playbooks
- **Use:** Institutional knowledge and procedure reference.
- **Description:** A searchable library of proven fix procedures grouped by fault type (e.g., VLAN mismatch, DNS failure). Each playbook outlines numbered fix steps and links to related historical case IDs, allowing engineers to fix known issues without running a new AI query.

### 11. Rule Checker
- **Use:** A deterministic safety net.
- **Description:** Displays the results of a pure Python script (`rule_checker.py`) that cross-checks configurations without relying on AI. It catches objective errors like duplicate IPs or mask mismatches. The page shows a summary row and finding cards linked to specific cases, proving that the application doesn't rely solely on generative AI.

## Running the Application Locally

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

---
*This file serves as a high-level summary of the NetSage AI architecture and built features.*

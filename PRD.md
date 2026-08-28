NetSage AI — Product Requirements Document (Updated)

Use this document as the single source of truth for the NetSage AI project. It reflects the current state of the build and should guide any further development, ensuring consistency across pages already built and pages still pending.

1. Overview

Product name: NetSage AI
One-line description: An AI-assisted troubleshooting copilot for Cisco-style lab networks that reads symptoms and show-command output (text or screenshot), suggests a likely root cause with cited evidence, and requires human review before any fix is trusted or applied.

Context: Cisco Virtual Internship Program — Applied AI + Network Troubleshooting track.
Team size: 2–3 students.

2. Problem Statement

Junior network engineers often know individual Cisco commands but struggle to connect a symptom to its actual root cause. A single symptom — e.g., "PC gets an IP but can't reach the server" — could stem from a VLAN misconfiguration, routing issue, DHCP problem, DNS failure, ACL block, or NAT misconfiguration. NetSage AI narrows this down using evidence-based AI reasoning, with a human always making the final call.

3. Goals
Reduce time spent narrowing down a fault category
Enforce evidence-based troubleshooting — every AI diagnosis must cite specific command output
Ensure AI suggestions are never blindly trusted — human review is mandatory
Demonstrate responsible AI use with a documented correction trail
Support multiple reviewers with individual accountability and role-based permissions
4. Non-Goals
No automatic application of configuration changes
No custom model training — prompt engineering against an existing LLM only
Not scoped for production/live enterprise networks — Packet Tracer/lab use only
No user management system beyond lightweight session-based identity (no real auth/backend accounts required for this scope)
5. Users & Roles
Junior Engineer — can diagnose cases, review evidence, submit Accept/Edit/Reject decisions, flag cases for escalation
Senior Reviewer — all Junior Engineer permissions, plus the ability to resolve escalated cases

Identity is established once per browser session via a lightweight name + role entry screen (no formal login/auth system) and persists via session storage until the browser session ends or the user manually switches.

6. Core User Flow (real-world usage)
Engineer hits a fault in a Packet Tracer lab
Engineer runs relevant show commands
Engineer opens NetSage and submits a symptom description plus evidence (pasted text, and/or an uploaded screenshot of terminal output)
NetSage returns a structured diagnosis: root cause, OSI layer, confidence, cited evidence, next command to confirm, suggested fix
Engineer runs the suggested next command to validate or rule out the hypothesis
A reviewer marks the diagnosis Accepted, Edited, or Rejected, with a note — or escalates it if uncertain
If escalated, a Senior Reviewer resolves it
Only after acceptance does the engineer apply the fix and verify resolution
7. Application Structure (pages already specified/built)

Entry flow:

Landing page — light Cisco-themed hero page with product pitch and "Enter Console" CTA
Welcome / Reviewer Setup screen — one-time-per-session name + role entry (Junior Engineer / Senior Reviewer), stores name, initials, and role in session storage; skipped on subsequent loads within the same session

Sidebar navigation (final structure):

Workspace

Overview — main dashboard: stat cards (Total Cases, AI–Human Agreement, AI Corrected, High Severity), Reviewer Verdicts donut chart, Cases by Severity bar chart, AI Confidence Calibration chart, fault-type filter chips, filterable case log
Cases — full searchable/filterable list of all cases (master view of the dataset)
New Diagnosis — live input form: symptom text field, show-command text area, optional screenshot upload, "Run Diagnosis" button, resulting AI diagnosis card with "Send to Review Queue" / "Discard" actions
Review Queue — list of cases not yet reviewed by any human, sorted by severity then oldest first, each with a "Review" button opening the case detail panel; count badge reflects live pending count
My Reviews — cases already reviewed by the current session's identity, filterable by verdict (All/Accepted/Edited/Rejected), opens cases read-only
Escalations — cases flagged for senior-level review (reasons: Low AI Confidence, Repeated Rejection Pattern, Unresolved 24h+, Manually Flagged), "Resolve Escalation" enabled only for Senior Reviewer role; count badge reflects live count

Analytics

Reports — export/download center for deliverables (cases.csv, AI Diagnosis Results, Human Review Log, Responsible AI Log PDF, Rule Checker Output), plus a combined "Export Full Submission Package" button; downloads trigger real file generation from in-app data
Responsible AI Log — filtered view showing only Edited/Rejected cases, each with side-by-side "AI Suggested" vs "Human Corrected" comparison and a "Why it was corrected" callout

Knowledge

Playbooks — searchable/filterable library of proven fix procedures grouped by fault type, each showing numbered fix steps and related case IDs
Rule Checker — results of the deterministic, non-AI Python cross-check (duplicate IPs, mask mismatches, gateway mismatches, down interfaces, VLAN mismatches, missing routes), with a check-type summary row, finding cards linked to case IDs, and a read-only code preview

Removed/cut pages (explicitly out of scope): Dashboards (merged into Overview), Evidence Library, Users, Integrations, Settings.

Case Detail Panel (shared component, opened from Overview, Review Queue, My Reviews, Escalations):

Header: case ID, fault type, OSI layer, severity
Symptom box
AI Root Cause, AI Confidence, Evidence Cited, Next Command, Suggested Fix
Human Review section: Accept / Edit / Reject buttons + reviewer note field, disabled/read-only when opened from My Reviews (already finalized)

Top nav bar (global): logo/product name, notifications icon, help icon, reviewer avatar showing session-derived initials + name + role, clickable to open a dropdown with "View Profile" and "Switch User" (with confirmation step before clearing session).

8. Functional Requirements — Backend Deliverables
8.1 Case Dataset (backend/data/cases.csv)

Minimum 30 cases covering VLAN, Gateway, DHCP, DNS, Routing, ACL, NAT, Wireless, Interface, Trunk. Columns: symptom, topology note, show-command output, expected root cause, OSI layer, concept tag, severity.

8.2 AI Prompt Library (backend/diagnose_prompt.md)

System prompt constraining the AI to reason only from provided evidence, output strict JSON (root_cause, osi_layer, confidence, evidence, next_command, fix_steps), with 3 few-shot worked examples. Low confidence must be used when evidence is incomplete/ambiguous.

8.3 Deterministic Rule Checker (backend/rule_checker.py)

Pure Python, no AI. Detects: duplicate IPs, subnet mask mismatches, gateway/SVI mismatches, interfaces administratively down, VLAN assignment mismatches, missing static routes. Runs against backend/sample_config.json for testing; outputs findings with severity and evidence.

8.4 Multimodal Input

Accepts screenshots of terminal output or topology diagrams alongside text in the New Diagnosis page. Text is authoritative when both are present; image is used for OCR-style extraction and context confirmation.

8.5 AI Diagnosis Execution

Each case run through the AI using the prompt library; output saved and compared against the known-correct answer.

8.6 Human Review Log

Every AI diagnosis marked Accepted, Edited, or Rejected by a human, attributed to the session's stored reviewer name. At least 5 cases must show a documented correction with an explanatory note.

9. Folder Structure
Cisco_NetSage_AI/
├── backend/
│   ├── main.py
│   ├── init_db.py
│   ├── netsage.db
│   ├── requirements.txt
│   ├── rule_checker.py
│   ├── sample_config.json
│   ├── diagnose_prompt.md
│   └── data/
│       └── cases.csv
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── README.md
├── PRD.md
└── TechStack.md
10. Tech Stack
Frontend: React (JSX, hooks), Tailwind CSS, Recharts, Lucide React
Backend: Python (FastAPI or Flask via main.py), SQLite (netsage.db) for session/case state if needed
AI Layer: Claude or GPT-4 API via prompt templates in diagnose_prompt.md; vision-capable endpoint for screenshot input
Deterministic Logic: Python standard library only (json, ipaddress, dataclasses, argparse)
Data Storage: CSV/JSON files, no external database required at this scale
Session/Identity: Browser session storage only — no formal authentication system
11. Non-Functional Requirements
No diagnosis is ever presented as auto-applied — always framed as pending human approval
AI must not fabricate show-command values it wasn't given
Confidence levels must reflect genuine evidence completeness, not default to "high"
Escalation resolution restricted to Senior Reviewer role only
Session identity persists across refreshes within a browser session, resets on new session or manual "Switch User"
12. Success Metrics (grading-aligned)
Metric	Target
Case coverage	≥30 cases, multiple fault types
Evidence use	AI cites actual show-command values in every diagnosis
Human oversight	Review log shows a mix of Accepted / Edited / Rejected
Deterministic accuracy	Rule checker correctly flags injected config errors
Responsible AI documentation	≥5 corrected cases with clear explanation
13. Deliverables
cases.csv
diagnose_prompt.md (+ helper prompt templates)
rule_checker.py (with sample output)
Working web app (React frontend + Python backend) covering all pages listed in Section 7
Responsible AI log (≥5 corrected cases)
5–10 minute demo video: landing page → reviewer setup → new diagnosis → review queue → detail panel decision → dashboard update → Responsible AI Log
14. Differentiators / USPs
Hybrid diagnosis: AI reasoning cross-checked against a deterministic rule engine (visible in the Rule Checker page)
Multimodal input: screenshots accepted alongside typed text
Confidence calibration tracking (visible as a chart on Overview)
Escalation system: a second layer of human oversight beyond standard review, with role-gated resolution
Playbook library: institutional knowledge built from confirmed diagnoses, browsable independent of running new AI queries
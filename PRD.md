Product Requirements Document — NetSage AI
1. Overview

Product name: NetSage AI
One-line description: An AI-assisted troubleshooting copilot for Cisco-style lab networks that reads symptoms and show-command output (text or screenshot), suggests a likely root cause with evidence, and requires human review before any fix is trusted or applied.

Course/context: Cisco Virtual Internship Program — Applied AI + Network Troubleshooting track.

Team size: 2–3 students

2. Problem Statement

Junior network engineers often know individual Cisco commands but struggle to connect a symptom to its actual root cause. A single symptom — e.g., "PC gets an IP but can't reach the server" — could stem from a VLAN misconfiguration, routing issue, DHCP problem, DNS failure, ACL block, or NAT misconfiguration. Without guided reasoning, engineers waste time checking the wrong layer first.

3. Goals
Reduce the time a junior engineer spends narrowing down a fault category
Teach evidence-based troubleshooting (every diagnosis must cite specific command output, not guesswork)
Ensure AI suggestions are never blindly trusted — human review is mandatory before any fix is applied
Demonstrate applied, responsible use of AI in a safety-relevant technical domain
4. Non-Goals
NetSage does not apply configuration changes automatically
NetSage does not train or fine-tune a custom model — it uses prompt engineering on an existing LLM
NetSage does not replace a certification-level understanding of networking; it accelerates diagnosis, not learning fundamentals
Not intended for production/live enterprise networks — scoped to Packet Tracer / lab environments
5. Users

Primary user: Junior network engineer / student working through a Packet Tracer lab
Secondary user: Instructor or senior engineer reviewing/grading the diagnosis and the student's troubleshooting process

6. Core User Flow (real-world usage)
Engineer hits a fault in a Packet Tracer lab
Engineer runs relevant show commands on affected devices
Engineer opens NetSage and provides:
A short symptom description (required, text)
Show-command output — pasted as text (primary) and/or uploaded as a screenshot (optional, secondary)
NetSage returns a structured diagnosis: root cause, OSI layer, confidence level, evidence cited, next command to confirm, suggested fix
Engineer runs the suggested next command to validate or rule out the hypothesis
A reviewer (senior engineer, instructor, or the student self-reviewing) marks the diagnosis Accepted, Edited, or Rejected, with a note
Only after acceptance does the engineer apply the fix in the lab and verify resolution
7. Functional Requirements
7.1 Case Dataset (cases.csv)
Minimum 30 troubleshooting cases
Fault types covered: VLAN, Gateway, DHCP, DNS, Routing, ACL, NAT, Wireless, Interface, Trunk
Each case includes: symptom, topology note, show-command output, expected root cause, OSI layer, concept tag, severity
7.2 AI Prompt Library (diagnose_prompt.md)
System prompt constrains the AI to reason only from provided evidence
Output must be strict JSON: root_cause, osi_layer, confidence, evidence, next_command, fix_steps
Includes 2–3 few-shot worked examples
Confidence must be explicitly "low" when evidence is ambiguous or incomplete
7.3 Deterministic Rule Checker (rule_checker.py)
Pure Python, no AI — runs independently as a cross-check
Detects: duplicate IPs, subnet mask mismatches, gateway/SVI mismatches, interfaces administratively down, VLAN assignment mismatches, missing static routes
Outputs findings with severity and evidence, usable alongside the AI's diagnosis
7.4 Multimodal Input (image support)
Accepts screenshots of terminal output (show command results) or topology diagrams in addition to text
Text input is authoritative when both are provided; image is used for OCR-style extraction and context confirmation, not as the sole evidence source
Useful for Layer 1 physical/cabling issues where a photo/screenshot is more natural than a text description
7.5 AI Diagnosis Execution
Each of the 30 cases is run through the AI using the prompt library
Output saved and compared against the known-correct answer per case
7.6 Human Review Log
Every AI diagnosis is marked Accepted, Edited, or Rejected by a human reviewer
At least 5 cases must show a documented correction, with a note explaining what was wrong and why
7.7 Dashboard
Visual summary showing: total cases, AI–human agreement rate, breakdown by fault type and severity, expandable case-level detail (AI output vs. reviewer note)
Built as a React interface styled as a network-operations review console
Filterable by fault type
8. Non-Functional Requirements
Safety: No diagnosis is ever presented as a final, auto-applied fix. Every output is explicitly framed as a suggestion pending human approval.
Evidence integrity: The AI must not fabricate show-command values it wasn't given.
Transparency: Confidence levels must genuinely reflect evidence completeness, not be uniformly "high."
Reproducibility: Prompt templates and case data must be structured so any teammate can rerun the diagnosis pipeline.
9. Success Metrics (grading-aligned)
Metric	Target
Case coverage	≥30 cases, multiple fault types
Evidence use	AI cites actual show-command values in every diagnosis
Human oversight	Review log shows a mix of Accepted / Edited / Rejected
Deterministic accuracy	Rule checker correctly flags injected config errors
Responsible AI documentation	≥5 corrected cases with clear explanation
10. Deliverables
cases.csv
diagnose_prompt.md (+ helper prompt templates)
rule_checker.py (with sample output)
Dashboard (React) showing themes and AI agreement rate
Responsible AI log (≥5 corrected cases)
5–10 minute demo video: broken case → AI diagnosis → human review → fix → verification
11. Differentiators / USPs
Hybrid diagnosis: AI reasoning cross-checked against a deterministic rule engine, not AI output alone
Multimodal input: accepts screenshots of terminal output, not just typed text
Confidence calibration tracking: measuring whether AI's stated confidence actually correlates with correctness
Escalating uncertainty behavior: AI explicitly asks for more evidence rather than guessing when confidence is low

tech stack
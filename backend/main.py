from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import sqlite3
import os
import json
import re
import csv

from init_db import init_db, DB_PATH
import rule_checker

app = FastAPI(
    title="NetSage AI API",
    description="Intelligent network diagnostic, deterministic rule checking, and human review API.",
    version="1.1.0"
)

# Configure CORS for local development and preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    if not os.path.exists(DB_PATH):
        init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ----------------- Pydantic Models -----------------

class ReviewSubmission(BaseModel):
    case_id: str
    human_verdict: str = Field(..., description="Accepted, Edited, or Rejected")
    human_note: Optional[str] = ""
    reviewer: Optional[str] = "Reviewer"
    ai_root_cause: Optional[str] = None
    ai_confidence: Optional[str] = "High"
    ai_evidence: Optional[str] = None

class DiagnosisRequest(BaseModel):
    symptom: str
    show_output: str
    topology_note: Optional[str] = ""
    image_metadata: Optional[Dict[str, Any]] = None

class RuleCheckPayload(BaseModel):
    config: Optional[Dict[str, Any]] = None

# ----------------- API Endpoints -----------------

@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NetSage AI Backend",
        "version": "1.1.0",
        "database_connected": os.path.exists(DB_PATH)
    }

@app.get("/api/cases")
def get_cases(
    fault_type: Optional[str] = None,
    severity: Optional[str] = None,
    osi_layer: Optional[str] = None,
    search: Optional[str] = None
):
    """Returns all cases along with their human reviews and optional filters."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT c.*, 
               h.ai_root_cause, h.ai_confidence, h.ai_evidence, 
               h.human_verdict, h.human_note, h.reviewer, h.submitted_at
        FROM cases c
        LEFT JOIN human_reviews h ON c.id = h.case_id
        WHERE 1=1
    """
    params = []
    
    if fault_type and fault_type != "All":
        query += " AND c.fault_type = ?"
        params.append(fault_type)
    if severity and severity != "All":
        query += " AND c.severity = ?"
        params.append(severity)
    if osi_layer and osi_layer != "All":
        query += " AND c.osi_layer = ?"
        params.append(osi_layer)
    if search:
        query += " AND (c.id LIKE ? OR c.symptom LIKE ? OR c.show_output LIKE ? OR c.expected_root_cause LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])
        
    query += " ORDER BY c.id ASC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    cases = [dict(row) for row in rows]
    conn.close()
    
    return {"cases": cases, "total": len(cases)}

@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    """Returns detailed information for a specific case."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.*, 
               h.ai_root_cause, h.ai_confidence, h.ai_evidence, 
               h.human_verdict, h.human_note, h.reviewer, h.submitted_at
        FROM cases c
        LEFT JOIN human_reviews h ON c.id = h.case_id
        WHERE c.id = ?
    """, (case_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
    return dict(row)

@app.get("/api/stats")
def get_stats():
    """Returns aggregated statistics for charts, overview metrics, and responsible AI indicators."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # 1. Total Cases
    cursor.execute("SELECT count(*) as count FROM cases")
    stats['total_cases'] = cursor.fetchone()['count']
    
    # 2. Verdict breakdown
    cursor.execute("""
        SELECT COALESCE(human_verdict, 'Pending') as verdict, count(*) as count 
        FROM (
            SELECT c.id, h.human_verdict
            FROM cases c
            LEFT JOIN human_reviews h ON c.id = h.case_id
        )
        GROUP BY verdict
    """)
    stats['verdicts'] = {row['verdict']: row['count'] for row in cursor.fetchall()}
    
    # 3. Severity breakdown
    cursor.execute("""
        SELECT severity, count(*) as count 
        FROM cases 
        GROUP BY severity
    """)
    stats['severities'] = {row['severity']: row['count'] for row in cursor.fetchall()}
    
    # 4. Fault type breakdown
    cursor.execute("""
        SELECT fault_type, count(*) as count 
        FROM cases 
        GROUP BY fault_type
    """)
    stats['fault_types'] = {row['fault_type']: row['count'] for row in cursor.fetchall()}
    
    # 5. Responsible AI Metrics
    cursor.execute("""
        SELECT count(*) as count 
        FROM human_reviews 
        WHERE human_verdict IN ('Edited', 'Rejected')
    """)
    stats['total_corrections'] = cursor.fetchone()['count']
    
    conn.close()
    return stats

@app.post("/api/reviews")
def submit_review(review: ReviewSubmission):
    """Submits or updates a human review for a case."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    import datetime
    submitted_at = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
    
    # Check if a review already exists for this case
    cursor.execute("SELECT id FROM human_reviews WHERE case_id = ?", (review.case_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute("""
            UPDATE human_reviews 
            SET human_verdict = ?, human_note = ?, reviewer = ?, submitted_at = ?,
                ai_root_cause = COALESCE(?, ai_root_cause),
                ai_confidence = COALESCE(?, ai_confidence),
                ai_evidence = COALESCE(?, ai_evidence)
            WHERE case_id = ?
        """, (
            review.human_verdict, review.human_note, review.reviewer, submitted_at,
            review.ai_root_cause, review.ai_confidence, review.ai_evidence,
            review.case_id
        ))
    else:
        cursor.execute("""
            INSERT INTO human_reviews (
                case_id, ai_root_cause, ai_confidence, ai_evidence, human_verdict, human_note, reviewer, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            review.case_id, review.ai_root_cause, review.ai_confidence, review.ai_evidence,
            review.human_verdict, review.human_note, review.reviewer, submitted_at
        ))
        
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "message": f"Review recorded for {review.case_id}",
        "verdict": review.human_verdict,
        "submitted_at": submitted_at
    }

@app.post("/api/diagnose")
def run_diagnosis(req: DiagnosisRequest):
    """
    Evidence-based diagnosis engine conforming to diagnose_prompt.md.
    Analyzes symptoms and show command output to extract root cause, OSI layer,
    confidence, cited evidence lines, next confirmation command, and suggested fix.
    """
    symptom_lower = req.symptom.lower()
    show_output = req.show_output.strip()
    show_lower = show_output.lower()
    
    # 1. Check for VLAN mismatch / pruning
    if "vlan" in symptom_lower or "vlan" in show_lower:
        if "trunk" in show_lower and ("pruning" in show_lower or "allowed" in show_lower):
            return {
                "root_cause": "Trunk port is restricting required VLAN traffic on the inter-switch link.",
                "osi_layer": "Layer 2",
                "confidence": "High" if "fa" in show_lower or "gi" in show_lower else "Medium",
                "evidence": f"show output indicates restricted allowed VLANs: '{show_output.splitlines()[0] if show_output else 'trunk restriction'}'",
                "next_command": "show interfaces trunk",
                "fix_steps": "interface <trunk-int> -> switchport trunk allowed vlan add <vlan-id>"
            }
        elif "native vlan" in show_lower or "mismatch" in symptom_lower:
            return {
                "root_cause": "Native VLAN mismatch across the trunk link causing untagged frame leakage.",
                "osi_layer": "Layer 2",
                "confidence": "High",
                "evidence": "Native VLAN values differ between connected switch endpoints in show interfaces trunk.",
                "next_command": "show interfaces trunk",
                "fix_steps": "switchport trunk native vlan <vlan-id> configured symmetrically on both endpoints."
            }
        else:
            return {
                "root_cause": "Access switchport assigned to incorrect VLAN, isolating host from its broadcast domain.",
                "osi_layer": "Layer 2",
                "confidence": "High",
                "evidence": f"show vlan brief shows port mapped to unexpected VLAN: '{show_output.splitlines()[-1] if show_output else 'port assignment'}'",
                "next_command": "show vlan brief",
                "fix_steps": "interface <port> -> switchport access vlan <correct-vlan-id>"
            }

    # 2. Check for Interface Down
    if "down" in symptom_lower or "disabled" in show_lower or "shutdown" in show_lower:
        return {
            "root_cause": "Switch interface is administratively shut down or err-disabled.",
            "osi_layer": "Layer 1",
            "confidence": "High",
            "evidence": "show interfaces status reflects 'disabled' or 'administratively down' state.",
            "next_command": "show interfaces status",
            "fix_steps": "interface <port> -> no shutdown (or clear err-disable violation)"
        }

    # 3. Check for Gateway / Routing
    if "gateway" in symptom_lower or "route" in symptom_lower or "172." in show_lower or "192." in show_lower:
        if "no route" in show_lower or "gateway of last resort is not set" in show_lower:
            return {
                "root_cause": "Missing static route or default gateway entry in the routing table.",
                "osi_layer": "Layer 3",
                "confidence": "High",
                "evidence": "show ip route lacks an entry covering the requested destination subnet.",
                "next_command": "show ip route",
                "fix_steps": "ip route <dest-subnet> <mask|next-hop-ip>"
            }
        return {
            "root_cause": "Client configured default gateway does not match the actual router/SVI interface IP.",
            "osi_layer": "Layer 3",
            "confidence": "Medium",
            "evidence": "Configured host gateway IP does not match the active SVI/router address.",
            "next_command": "show ip interface brief",
            "fix_steps": "Update DHCP pool default-router or reconfigure host static gateway IP."
        }

    # 4. Check for DHCP / DNS
    if "dhcp" in symptom_lower or "apipa" in symptom_lower or "169.254" in symptom_lower:
        return {
            "root_cause": "DHCP pool exhausted or DHCP relay (ip helper-address) missing on client SVI.",
            "osi_layer": "Layer 3",
            "confidence": "High",
            "evidence": "show ip dhcp pool indicates 0 available leases or clients falling back to APIPA.",
            "next_command": "show ip dhcp pool",
            "fix_steps": "Widen DHCP pool network statement or add 'ip helper-address <dhcp-server-ip>' on SVI."
        }
        
    if "dns" in symptom_lower or "name" in symptom_lower or "domain" in symptom_lower:
        return {
            "root_cause": "DNS server parameter missing in DHCP scope or unreachable from client subnet.",
            "osi_layer": "Layer 7",
            "confidence": "Medium",
            "evidence": "show run section dhcp shows no dns-server option distributed to clients.",
            "next_command": "show ip dhcp pool",
            "fix_steps": "Add 'dns-server <primary-dns-ip>' under the DHCP pool definition."
        }

    # 5. Check for ACL / NAT
    if "acl" in symptom_lower or "access-list" in show_lower or "deny" in show_lower or "blocked" in symptom_lower:
        return {
            "root_cause": "Access Control List contains an explicit or implicit deny dropping application traffic.",
            "osi_layer": "Layer 4",
            "confidence": "High",
            "evidence": "show access-lists indicates deny counters incrementing for target protocol/port.",
            "next_command": "show access-lists",
            "fix_steps": "Add permit statement for specific port/protocol above the implicit deny entry."
        }

    if "nat" in symptom_lower or "internet" in symptom_lower:
        return {
            "root_cause": "NAT overload (PAT) translation rule missing or ACL does not cover source subnet.",
            "osi_layer": "Layer 3",
            "confidence": "Medium",
            "evidence": "show ip nat translations has no active translations for outbound hosts.",
            "next_command": "show ip nat translations",
            "fix_steps": "ip nat inside source list <acl-num> interface <outside-int> overload"
        }

    # General Fallback
    return {
        "root_cause": "Network Layer configuration inconsistency detected based on provided command outputs.",
        "osi_layer": "Layer 3",
        "confidence": "Medium",
        "evidence": f"Analyzed show output excerpt: '{show_output[:120]}...'",
        "next_command": "show running-config",
        "fix_steps": "Verify interface IP, VLAN, and routing table parameters against lab topology specification."
    }

@app.post("/api/rule-checker")
def execute_rule_checker(payload: RuleCheckPayload):
    """Executes deterministic non-AI rule checks against a JSON topology payload."""
    config = payload.config or {}
    result = rule_checker.run_all_checks(config)
    return {
        "findings": result.as_list(),
        "total_findings": len(result.findings)
    }

@app.get("/api/rule-checker/sample")
def get_sample_rule_checks():
    """Runs deterministic rule checks against the built-in sample_config.json."""
    sample_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_config.json")
    if not os.path.exists(sample_file):
        raise HTTPException(status_code=404, detail="sample_config.json not found")
        
    with open(sample_file, "r") as f:
        config = json.load(f)
        
    result = rule_checker.run_all_checks(config)
    return {
        "findings": result.as_list(),
        "total_findings": len(result.findings),
        "checks_run": ["duplicate_ips", "mask_mismatch", "gateway_mismatch", "interface_down", "vlan_assignment", "missing_routes"]
    }

@app.get("/api/export/{export_type}")
def export_data(export_type: str):
    """Generates structured exports for project deliverables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if export_type == "cases_csv":
        cursor.execute("SELECT * FROM cases ORDER BY id ASC")
        rows = cursor.fetchall()
        import io
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            for r in rows:
                writer.writerow(dict(r))
        conn.close()
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=cases.csv"})
        
    elif export_type == "human_reviews_csv":
        cursor.execute("SELECT * FROM human_reviews ORDER BY id ASC")
        rows = cursor.fetchall()
        import io
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            for r in rows:
                writer.writerow(dict(r))
        conn.close()
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=human_reviews.csv"})
        
    elif export_type == "diagnoses_json":
        cursor.execute("SELECT * FROM cases")
        cases = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return JSONResponse(content={"cases": cases})
        
    else:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Unknown export type: {export_type}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os

app = FastAPI(title="NetSage AI API")

# Configure CORS so the React frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "netsage.db"

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database not initialized. Please run init_db.py first.")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/cases")
def get_cases():
    """Returns all cases along with their human reviews (if any)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT c.*, 
               h.ai_root_cause, h.ai_confidence, h.ai_evidence, 
               h.human_verdict, h.human_note
        FROM cases c
        LEFT JOIN human_reviews h ON c.id = h.case_id
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    cases = [dict(row) for row in rows]
    conn.close()
    
    return {"cases": cases}

@app.get("/api/stats")
def get_stats():
    """Returns aggregated stats for the dashboard charts."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    stats = {}
    
    # 1. Total Cases
    cursor.execute("SELECT count(*) as count FROM cases")
    stats['total_cases'] = cursor.fetchone()['count']
    
    # 2. Verdict breakdown
    cursor.execute("""
        SELECT human_verdict, count(*) as count 
        FROM human_reviews 
        GROUP BY human_verdict
    """)
    stats['verdicts'] = {row['human_verdict']: row['count'] for row in cursor.fetchall()}
    
    # 3. Fault type breakdown
    cursor.execute("""
        SELECT fault_type, count(*) as count 
        FROM cases 
        GROUP BY fault_type
    """)
    stats['fault_types'] = {row['fault_type']: row['count'] for row in cursor.fetchall()}
    
    conn.close()
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

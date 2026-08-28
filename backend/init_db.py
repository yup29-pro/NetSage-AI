import sqlite3
import csv
import os

DB_PATH = "netsage.db"
CSV_PATH = "../cases.csv"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create cases table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            fault_type TEXT,
            concept_tag TEXT,
            osi_layer TEXT,
            severity TEXT,
            symptom TEXT,
            topology_note TEXT,
            show_output TEXT,
            expected_root_cause TEXT,
            expected_next_command TEXT,
            expected_fix TEXT
        )
    """)
    
    # Create human_reviews table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS human_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT,
            ai_root_cause TEXT,
            ai_confidence TEXT,
            ai_evidence TEXT,
            human_verdict TEXT, -- 'Accepted', 'Edited', 'Rejected'
            human_note TEXT,
            FOREIGN KEY (case_id) REFERENCES cases (id)
        )
    """)

    conn.commit()

    # Read CSV and insert into database
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cursor.execute("""
                    INSERT OR REPLACE INTO cases (
                        id, fault_type, concept_tag, osi_layer, severity, 
                        symptom, topology_note, show_output, expected_root_cause, 
                        expected_next_command, expected_fix
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row['case_id'], row['fault_type'], row['concept_tag'], 
                    row['osi_layer'], row['severity'], row['symptom'], 
                    row['topology_note'], row['show_output'], 
                    row['expected_root_cause'], row['expected_next_command'], 
                    row['expected_fix']
                ))
        conn.commit()
        print(f"Loaded cases from {CSV_PATH} into database.")
    else:
        print(f"CSV file not found at {CSV_PATH}")

    # Insert some mock reviews to show in dashboard
    cursor.execute("SELECT count(*) FROM human_reviews")
    if cursor.fetchone()[0] == 0:
        mock_reviews = [
            ("CASE001", "Port Fa0/4 is not assigned to VLAN 30", "high", "show vlan brief output shows Fa0/2 in VLAN 30, Fa0/4 in VLAN 10", "Accepted", "AI correctly identified the VLAN mismatch."),
            ("CASE002", "Default gateway on PC is incorrect", "high", "show ip interface brief on PC shows gateway set to 192.168.20.2", "Edited", "Correct, but it's more likely a DHCP scope issue than static config."),
            ("CASE003", "DHCP pool exhausted", "medium", "show ip dhcp pool VLAN40 shows 0 addresses available", "Accepted", "Spot on."),
            ("CASE004", "DNS Server missing in DHCP", "high", "No dns-server line in show run section dhcp", "Accepted", "Good catch."),
            ("CASE005", "Missing routing protocol", "low", "show ip route shows no entry for 172.16.5.0/24", "Rejected", "It's a missing static route, not a routing protocol issue. We are not running OSPF here.")
        ]
        
        cursor.executemany("""
            INSERT INTO human_reviews (
                case_id, ai_root_cause, ai_confidence, ai_evidence, human_verdict, human_note
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, mock_reviews)
        conn.commit()
        print("Inserted mock human reviews.")

    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()

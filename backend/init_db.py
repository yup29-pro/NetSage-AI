import sqlite3
import csv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "netsage.db")

CSV_CANDIDATES = [
    os.path.join(BASE_DIR, "data", "cases.csv"),
    os.path.join(BASE_DIR, "cases.csv"),
    os.path.join(BASE_DIR, "..", "cases.csv"),
]

def get_csv_path():
    for path in CSV_CANDIDATES:
        if os.path.exists(path):
            return path
    return None

def init_db(force_recreate=False):
    if force_recreate and os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass

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
            reviewer TEXT,
            submitted_at TEXT,
            FOREIGN KEY (case_id) REFERENCES cases (id)
        )
    """)

    # Migrate columns if existing table was missing them
    cursor.execute("PRAGMA table_info(human_reviews)")
    cols = [col[1] for col in cursor.fetchall()]
    if "reviewer" not in cols:
        cursor.execute("ALTER TABLE human_reviews ADD COLUMN reviewer TEXT")
    if "submitted_at" not in cols:
        cursor.execute("ALTER TABLE human_reviews ADD COLUMN submitted_at TEXT")

    conn.commit()

    csv_path = get_csv_path()
    if csv_path and os.path.exists(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            loaded_count = 0
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
                loaded_count += 1
        conn.commit()
        print(f"Loaded {loaded_count} cases from {csv_path} into database.")

    # Seed initial human reviews if empty or less than 5
    cursor.execute("SELECT count(*) FROM human_reviews")
    review_count = cursor.fetchone()[0]
    if review_count < 5:
        mock_reviews = [
            ("CASE001", "Port Fa0/4 is not assigned to VLAN 30", "High", "show vlan brief output shows Fa0/2 in VLAN 30, Fa0/4 in VLAN 10", "Accepted", "AI correctly identified the VLAN mismatch.", "Arjun Desai", "2026-08-26 10:15 AM"),
            ("CASE002", "Default gateway on PC is incorrect", "Medium", "show ip interface brief on PC shows gateway set to 192.168.20.2", "Edited", "Corrected the fix target from SVI to the DHCP pool configuration.", "Arjun Desai", "2026-08-25 10:24 AM"),
            ("CASE003", "DHCP pool exhausted", "High", "show ip dhcp pool VLAN40 shows 0 addresses available", "Accepted", "Spot on. Expanded DHCP pool scope.", "Arjun Desai", "2026-08-25 09:41 AM"),
            ("CASE004", "DNS Server missing in DHCP", "High", "No dns-server line in show run section dhcp", "Accepted", "Good catch. Added DNS option to DHCP pool.", "Arjun Desai", "2026-08-24 11:20 AM"),
            ("CASE005", "Missing routing protocol (OSPF)", "Low", "show ip route shows no entry for 172.16.5.0/24", "Rejected", "Lab uses static routing only, not OSPF. Corrected to a static route.", "Arjun Desai", "2026-08-24 03:12 PM"),
            ("CASE006", "Server firewall blocking port 22", "Low", "show access-lists shows deny counters incrementing", "Edited", "AI blamed a server firewall with no evidence. Corrected to the actual ACL cause.", "Arjun Desai", "2026-08-23 09:41 AM"),
            ("CASE008", "AP offline / RF interference", "Low", "show vlan brief / WLC interface mapping shows Guest SSID mapped to VLAN 10", "Rejected", "AI's cause did not match the WLC evidence. Re-diagnosed to VLAN mapping mismatch.", "Arjun Desai", "2026-08-22 04:03 PM"),
            ("CASE009", "Interface Fa0/6 administratively down", "High", "show interfaces Fa0/6 status shows disabled and shutdown in show run", "Accepted", "Verified link state. Applied no shutdown.", "Arjun Desai", "2026-08-22 11:08 AM"),
            ("CASE010", "Native VLAN mismatch on trunk link", "Medium", "show interfaces trunk shows SW1 native VLAN 1, SW2 native VLAN 99", "Accepted", "Aligned native VLAN across both switches.", "Arjun Desai", "2026-08-21 02:30 PM"),
        ]
        
        for rev in mock_reviews:
            cursor.execute("SELECT id FROM human_reviews WHERE case_id = ?", (rev[0],))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO human_reviews (
                        case_id, ai_root_cause, ai_confidence, ai_evidence, human_verdict, human_note, reviewer, submitted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, rev)
        conn.commit()
        print("Ensured human reviews are populated.")

    conn.close()
    print(f"Database at {DB_PATH} initialized successfully.")

if __name__ == "__main__":
    init_db()

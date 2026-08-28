import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  Network, LayoutGrid, FileText, CheckSquare, Clock, AlertTriangle, 
  BarChart2, FileBarChart, TrendingUp, BookOpen, Code, FolderOpen,
  Users, Zap, Settings, ChevronLeft, Bell, HelpCircle, Calendar, 
  Download, Search, Filter, MoreHorizontal, ChevronRight, X,
  Check, Edit2, Save, UploadCloud, Sparkles, Info, ShieldAlert,
  ArrowRight, UserCheck, Bot, FileCheck, Code2, ChevronDown, ChevronUp
} from 'lucide-react';

const COLORS = {
  Accepted: '#3b82f6', // blue
  Edited: '#f59e0b', // yellow
  Rejected: '#ef4444', // red
};

const initialReviewQueue = [
  { "id": "CASE011", "fault_type": "VLAN", "osi_layer": "Layer 2", "severity": "High", "ai_root_cause_preview": "Trunk port Fa0/1 may be pruning VLAN 40 traffic between switches.", "ai_confidence": "Medium", "submitted": "2026-08-25 09:10 AM", "waiting_for": "2 days", "symptom": "PC in VLAN 40 cannot reach the remote server.", "expected_root_cause": "Trunk port Fa0/1 may be pruning VLAN 40 traffic between switches.", "show_output": "show interfaces trunk\nFa0/1 VLANs allowed and active: 1-39", "expected_next_command": "show interfaces trunk", "expected_fix": "interface fa0/1 -> switchport trunk allowed vlan add 40" },
  { "id": "CASE012", "fault_type": "DNS", "osi_layer": "Layer 7", "severity": "High", "ai_root_cause_preview": "DNS server IP configured on clients is unreachable from their subnet.", "ai_confidence": "High", "submitted": "2026-08-25 11:45 AM", "waiting_for": "1 day", "symptom": "Users cannot browse the internet by name, but ping to 8.8.8.8 works.", "expected_root_cause": "DNS server IP configured on clients is unreachable from their subnet.", "show_output": "ipconfig /all shows DNS server 192.168.100.1, but ping fails.", "expected_next_command": "ping 192.168.100.1", "expected_fix": "Update DHCP scope with correct DNS server IP or fix routing to 192.168.100.1" },
  { "id": "CASE013", "fault_type": "NAT", "osi_layer": "Layer 3", "severity": "Medium", "ai_root_cause_preview": "NAT overload ACL may be too narrow, excluding a subnet from translation.", "ai_confidence": "Medium", "submitted": "2026-08-26 08:30 AM", "waiting_for": "18 hours", "symptom": "New VLAN 50 cannot access the internet, but other VLANs can.", "expected_root_cause": "NAT overload ACL may be too narrow, excluding a subnet from translation.", "show_output": "show ip nat translations: no entries for 10.0.50.0/24.\nshow access-lists 1: permit 10.0.10.0, permit 10.0.20.0", "expected_next_command": "show access-lists 1", "expected_fix": "access-list 1 permit 10.0.50.0 0.0.0.255" },
  { "id": "CASE014", "fault_type": "Interface", "osi_layer": "Layer 1", "severity": "Medium", "ai_root_cause_preview": "Fa0/8 shows err-disabled state, likely from a port security violation.", "ai_confidence": "High", "submitted": "2026-08-26 01:15 PM", "waiting_for": "13 hours", "symptom": "Printer connected to Fa0/8 has lost network connectivity.", "expected_root_cause": "Fa0/8 shows err-disabled state, likely from a port security violation.", "show_output": "show interfaces status: Fa0/8 is err-disabled.", "expected_next_command": "show port-security interface fa0/8", "expected_fix": "interface fa0/8 -> shutdown -> no shutdown" },
  { "id": "CASE015", "fault_type": "ACL", "osi_layer": "Layer 4", "severity": "Low", "ai_root_cause_preview": "An ACL permit statement may be missing for a secondary application port.", "ai_confidence": "Low", "submitted": "2026-08-26 03:00 PM", "waiting_for": "10 hours", "symptom": "Main application works, but reporting module fails to load data.", "expected_root_cause": "An ACL permit statement may be missing for a secondary application port.", "show_output": "show access-lists 101:\npermit tcp any any eq 80\npermit tcp any any eq 443", "expected_next_command": "show access-lists 101", "expected_fix": "access-list 101 permit tcp any any eq 8080" },
  { "id": "CASE016", "fault_type": "Gateway", "osi_layer": "Layer 3", "severity": "Low", "ai_root_cause_preview": "Static default gateway on a host may not match the actual SVI address.", "ai_confidence": "Medium", "submitted": "2026-08-26 04:20 PM", "waiting_for": "9 hours", "symptom": "Server can reach local subnet but cannot reach the internet.", "expected_root_cause": "Static default gateway on a host may not match the actual SVI address.", "show_output": "Server gateway: 192.168.1.254\nSVI config: interface vlan 1, ip address 192.168.1.1 255.255.255.0", "expected_next_command": "show ip interface brief | include Vlan1", "expected_fix": "Change server static gateway from .254 to .1" }
];

const initialMyReviews = [
  { "id": "CASE001", "reviewer": "Arjun Desai", "fault_type": "VLAN", "osi_layer": "Layer 2", "severity": "High", "human_verdict": "Accepted", "human_note": "Matches root cause exactly. No correction needed.", "submitted": "2026-08-26 10:15 AM", "symptom": "PC in VLAN 30 can't reach the server.", "ai_root_cause": "Trunk port missing VLAN.", "ai_confidence": "High", "expected_next_command": "show vlan brief", "expected_fix": "Add vlan 30 to trunk", "show_output": "Trunk allowed vlans: 10,20" },
  { "id": "CASE002", "reviewer": "Arjun Desai", "fault_type": "Gateway", "osi_layer": "Layer 3", "severity": "High", "human_verdict": "Edited", "human_note": "Corrected the fix target from SVI to the DHCP pool configuration.", "submitted": "2026-08-25 10:24 AM", "symptom": "Valid IP but cannot reach off-subnet.", "ai_root_cause": "DHCP pool has wrong gateway.", "ai_confidence": "Medium", "expected_next_command": "show run section dhcp", "expected_fix": "Correct default-router in DHCP pool", "show_output": "DHCP gateway: 192.168.20.2. SVI: 192.168.20.1" },
  { "id": "CASE003", "reviewer": "Arjun Desai", "fault_type": "DHCP", "osi_layer": "Layer 3", "severity": "Medium", "human_verdict": "Accepted", "human_note": "Correct on first pass.", "submitted": "2026-08-25 09:41 AM", "symptom": "Clients not getting IP addresses.", "ai_root_cause": "DHCP snooping dropping packets.", "ai_confidence": "High", "expected_next_command": "show ip dhcp snooping", "expected_fix": "Trust the uplink port", "show_output": "DHCP snooping is enabled on untrusted ports" },
  { "id": "CASE005", "reviewer": "Arjun Desai", "fault_type": "Routing", "osi_layer": "Layer 3", "severity": "High", "human_verdict": "Rejected", "human_note": "Lab uses static routing only, not OSPF. Corrected to a static route.", "submitted": "2026-08-24 03:12 PM", "symptom": "No route to branch office.", "ai_root_cause": "OSPF neighbor down.", "ai_confidence": "Low", "expected_next_command": "show ip route", "expected_fix": "ip route 10.1.0.0 255.255.0.0 10.0.0.2", "show_output": "Routing table empty for 10.1.0.0/16" },
  { "id": "CASE006", "reviewer": "Arjun Desai", "fault_type": "ACL", "osi_layer": "Layer 4", "severity": "High", "human_verdict": "Edited", "human_note": "AI blamed a server firewall with no evidence. Corrected to the actual ACL cause.", "submitted": "2026-08-23 09:41 AM", "symptom": "SSH access to server blocked.", "ai_root_cause": "Server firewall blocking port 22.", "ai_confidence": "Low", "expected_next_command": "show access-lists", "expected_fix": "permit tcp any host 10.0.0.5 eq 22", "show_output": "deny ip any any matches packet" },
  { "id": "CASE008", "reviewer": "Arjun Desai", "fault_type": "Wireless", "osi_layer": "Layer 2", "severity": "Medium", "human_verdict": "Rejected", "human_note": "AI's cause did not match the WLC evidence. Re-diagnosed from scratch.", "submitted": "2026-08-22 04:03 PM", "symptom": "Clients dropping from SSID.", "ai_root_cause": "AP offline.", "ai_confidence": "Low", "expected_next_command": "show ap summary", "expected_fix": "Check WLC client limits", "show_output": "APs are joined and active" },
  { "id": "CASE009", "reviewer": "Arjun Desai", "fault_type": "Interface", "osi_layer": "Layer 1", "severity": "High", "human_verdict": "Accepted", "human_note": "Correct on first pass.", "submitted": "2026-08-22 11:08 AM", "symptom": "Interface flapping.", "ai_root_cause": "Bad cable.", "ai_confidence": "Medium", "expected_next_command": "show int status err", "expected_fix": "Replace physical cable", "show_output": "Interface input errors increasing" }
];

const initialEscalations = [
  {
    "id": "CASE010", "fault_type": "Trunk", "osi_layer": "Layer 2", "severity": "Medium", "escalation_reason": "Low AI Confidence",
    "symptom": "Intermittent connectivity and CDP native VLAN mismatch warnings between two switches.",
    "flagged_by": "AD", "flagged_at": "2026-08-26 08:15 AM", "note": null,
    "ai_root_cause": "Native VLAN mismatch on trunk link.", "ai_confidence": "Low",
    "expected_next_command": "show interfaces trunk", "expected_fix": "Fix native VLAN configuration",
    "show_output": "Native VLAN mismatch discovered on FastEthernet0/1"
  },
  {
    "id": "CASE005", "fault_type": "Routing", "osi_layer": "Layer 3", "severity": "High", "escalation_reason": "Manually Flagged by Reviewer",
    "symptom": "HQ router can't reach the Branch subnet 172.16.5.0/24.",
    "flagged_by": "AD", "flagged_at": "2026-08-26 09:00 AM", 
    "note": "AI recommended a dynamic routing protocol that contradicts the lab's static-only design. Wanted a second opinion before rejecting outright.",
    "ai_root_cause": "OSPF neighbor down.", "ai_confidence": "Low",
    "expected_next_command": "show ip route", "expected_fix": "Configure static route",
    "show_output": "Routing table empty for 172.16.5.0/24"
  },
  {
    "id": "CASE012", "fault_type": "DNS", "osi_layer": "Layer 7", "severity": "High", "escalation_reason": "Unresolved 24h+",
    "symptom": "DNS server IP configured on clients is unreachable from their subnet.",
    "flagged_by": "System", "flagged_at": "2026-08-25 11:45 AM", "note": null,
    "ai_root_cause": "DNS server IP configured on clients is unreachable from their subnet.", "ai_confidence": "High",
    "expected_next_command": "ping 192.168.100.1", "expected_fix": "Update DHCP scope with correct DNS server IP or fix routing to 192.168.100.1",
    "show_output": "ipconfig /all shows DNS server 192.168.100.1, but ping fails."
  }
];

const ruleCheckerIssues = [
  { "check": "Duplicate IPs", "severity": "High", "message": "Duplicate IP address 192.168.30.10 found on PC1 and PC5.", "evidence": "PC1 and PC5 both report IP 192.168.30.10", "case_id": "CASE001" },
  { "check": "Mask Mismatch", "severity": "Medium", "message": "Hosts in VLAN 20 have inconsistent subnet masks.", "evidence": "PC3 = 255.255.255.0, PC7 = 255.255.0.0", "case_id": "CASE003" },
  { "check": "Gateway Mismatch", "severity": "High", "message": "PC2 gateway 192.168.20.2 does not match SVI for VLAN 20 (192.168.20.1).", "evidence": "PC2 configured gateway=192.168.20.2, actual VLAN20 SVI=192.168.20.1", "case_id": "CASE002" },
  { "check": "Interface Down", "severity": "High", "message": "Interface Fa0/6 is administratively down.", "evidence": "show interfaces status: Fa0/6 -> administratively down", "case_id": "CASE009" },
  { "check": "VLAN Mismatch", "severity": "High", "message": "PC2 is in VLAN 10 but expected VLAN 30.", "evidence": "show vlan brief: PC2 port assigned to VLAN 10", "case_id": "CASE001" },
  { "check": "Missing Route", "severity": "High", "message": "No route found covering required subnet 172.16.5.0/24.", "evidence": "show ip route entries checked: 192.168.10.0/24, 192.168.20.0/24, 192.168.30.0/24", "case_id": "CASE005" }
];

const initialPlaybooks = [
  {
    "fault_type": "VLAN Misconfiguration",
    "category": "VLAN",
    "description": "Port assigned to the wrong VLAN, isolating a host from its intended broadcast domain.",
    "steps": [
      "Run 'show vlan brief' to confirm actual port-to-VLAN assignment",
      "Enter interface config mode for the affected port",
      "Run 'switchport access vlan <correct-vlan-id>'",
      "Re-verify with 'show vlan brief'"
    ],
    "based_on": 3,
    "related_cases": ["CASE001", "CASE011"]
  },
  {
    "fault_type": "Gateway Mismatch",
    "category": "Gateway",
    "description": "Host's configured default gateway does not match the actual SVI or router interface IP.",
    "steps": [
      "Compare host gateway config against 'show ip interface brief' on the router/switch",
      "Correct the DHCP pool's default-router value, or fix static host config",
      "Verify connectivity with a ping to the corrected gateway"
    ],
    "based_on": 2,
    "related_cases": ["CASE002", "CASE016"]
  },
  {
    "fault_type": "DHCP Pool Exhaustion",
    "category": "DHCP",
    "description": "No addresses remain in the DHCP pool for new clients, causing APIPA addresses.",
    "steps": [
      "Run 'show ip dhcp pool <name>' to confirm exhaustion",
      "Widen the pool's network statement, or reduce the excluded address range",
      "Confirm new clients can lease an address"
    ],
    "based_on": 2,
    "related_cases": ["CASE003"]
  },
  {
    "fault_type": "ACL Blocking Traffic",
    "category": "ACL",
    "description": "An access list permits some traffic but silently denies other required ports or protocols.",
    "steps": [
      "Run 'show access-lists' and check deny counters for the affected traffic",
      "Add a permit statement for the missing port/protocol above the implicit deny",
      "Re-test the blocked application traffic"
    ],
    "based_on": 4,
    "related_cases": ["CASE006", "CASE015"]
  },
  {
    "fault_type": "NAT Overload Missing",
    "category": "NAT",
    "description": "Internal hosts cannot reach external networks because outbound address translation was never configured.",
    "steps": [
      "Run 'show ip nat translations' to confirm no active translations",
      "Configure 'ip nat inside source list <acl> interface <outside> overload'",
      "Verify outbound connectivity and re-check translation table"
    ],
    "based_on": 1,
    "related_cases": ["CASE013"]
  },
  {
    "fault_type": "Trunk Native VLAN Mismatch",
    "category": "Trunk",
    "description": "Native VLAN configured differently on each end of a trunk link, causing untagged traffic to land incorrectly.",
    "steps": [
      "Run 'show interfaces trunk' on both switches to compare native VLAN",
      "Set matching native VLAN on both ends with 'switchport trunk native vlan <id>'",
      "Confirm CDP native VLAN mismatch warnings clear"
    ],
    "based_on": 2,
    "related_cases": ["CASE010"]
  }
];

export default function Dashboard({ onBack }) {
  const [cases, setCases] = useState([]);
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue);
  const [myReviews, setMyReviews] = useState(initialMyReviews);
  const [escalations, setEscalations] = useState(initialEscalations);
  
  const [myReviewsFilter, setMyReviewsFilter] = useState('All');
  const [playbookFilter, setPlaybookFilter] = useState('All');
  const [playbookSearch, setPlaybookSearch] = useState('');
  const [expandedPlaybook, setExpandedPlaybook] = useState(null);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedCase, setSelectedCase] = useState(null);
  const [currentView, setCurrentView] = useState('overview'); 
  const [diagnosisRunning, setDiagnosisRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('netsage_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [setupName, setSetupName] = useState('');
  const [setupRole, setSetupRole] = useState(null);
  const [showNameError, setShowNameError] = useState(false);
  
  const [modalVerdict, setModalVerdict] = useState('Accepted');
  const [modalNote, setModalNote] = useState('');
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showSwitchUserConfirm, setShowSwitchUserConfirm] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
        setShowSwitchUserConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/cases').then(res => res.json()),
      fetch('http://localhost:8000/api/stats').then(res => res.json())
    ]).then(([casesData, statsData]) => {
      setCases(casesData.cases);
      setStats(statsData);
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching data:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center text-[#07182B]">Loading Dashboard...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center relative font-sans text-[#07182B]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-10%] opacity-40 bg-[url('/isometric-bg.jpg')] bg-cover bg-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex justify-center mb-6"><div className="bg-[#049FD9]/10 text-[#049FD9] p-3 rounded-xl"><Network size={32} /></div></div>
          <h2 className="text-2xl font-bold text-center mb-2">Welcome to NetSage AI</h2>
          <p className="text-slate-500 text-center mb-8">Let's set up your reviewer profile for this session.</p>
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-semibold mb-2">Your Name</label>
              <input type="text" value={setupName} onChange={e => { setSetupName(e.target.value); setShowNameError(false); }} placeholder="e.g. Arjun Desai" className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9]" />
              {showNameError && <p className="text-red-500 text-xs mt-1">Please enter your name to continue.</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Your Role</label>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setSetupRole('Junior Engineer')} className={`p-4 rounded-xl text-left border-2 transition-all ${setupRole === 'Junior Engineer' ? 'border-[#049FD9] bg-[#049FD9]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <h4 className={`font-bold text-sm mb-1 ${setupRole === 'Junior Engineer' ? 'text-[#049FD9]' : 'text-[#07182B]'}`}>Junior Engineer</h4>
                  <p className="text-xs text-slate-500 leading-tight">Diagnose cases, review evidence, submit for approval</p>
                </button>
                <button onClick={() => setSetupRole('Senior Reviewer')} className={`p-4 rounded-xl text-left border-2 transition-all ${setupRole === 'Senior Reviewer' ? 'border-[#049FD9] bg-[#049FD9]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <h4 className={`font-bold text-sm mb-1 ${setupRole === 'Senior Reviewer' ? 'text-[#049FD9]' : 'text-[#07182B]'}`}>Senior Reviewer</h4>
                  <p className="text-xs text-slate-500 leading-tight">All junior permissions, plus resolve escalated cases</p>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => {
            if (!setupName.trim()) { setShowNameError(true); return; }
            const initials = setupName.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || 'U';
            const user = { name: setupName.trim(), initials, role: setupRole };
            sessionStorage.setItem('netsage_user', JSON.stringify(user));
            setCurrentUser(user);
          }} disabled={!setupName.trim() || !setupRole} className="w-full bg-[#049FD9] text-white py-3.5 rounded-lg font-bold disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-[#0385B5] transition-colors">
            Continue to Console
          </button>
        </motion.div>
      </div>
    );
  }

  // Format data for charts
  const verdictData = stats?.verdicts ? Object.keys(stats.verdicts).map(key => ({
    name: key,
    value: stats.verdicts[key]
  })) : [];

  const severityCounts = { High: 0, Medium: 0, Low: 0 };
  cases.forEach(c => {
    if (c.severity === 'High') severityCounts.High++;
    else if (c.severity === 'Medium') severityCounts.Medium++;
    else severityCounts.Low++;
  });
  
  const severityData = [
    { name: 'Low', count: severityCounts.Low, fill: '#3b82f6' },
    { name: 'Medium', count: severityCounts.Medium, fill: '#f59e0b' },
    { name: 'High', count: severityCounts.High, fill: '#ef4444' },
  ];

  const filteredCases = activeTab === 'All' ? cases : cases.filter(c => c.fault_type === activeTab);
  
  // Data for Responsible AI Log
  const correctedCases = cases.filter(c => c.human_verdict === 'Edited' || c.human_verdict === 'Rejected');
  const totalCorrections = correctedCases.length;
  const totalEdited = correctedCases.filter(c => c.human_verdict === 'Edited').length;
  const totalRejected = correctedCases.filter(c => c.human_verdict === 'Rejected').length;

  // Data for My Reviews
  const sessionMyReviews = myReviews.filter(c => c.reviewer === currentUser.name);

  const filteredMyReviews = myReviewsFilter === 'All' 
    ? sessionMyReviews 
    : sessionMyReviews.filter(c => c.human_verdict === myReviewsFilter);
  const totalMyReviews = sessionMyReviews.length;
  const totalMyAccepted = sessionMyReviews.filter(c => c.human_verdict === 'Accepted').length;
  const totalMyEdited = sessionMyReviews.filter(c => c.human_verdict === 'Edited').length;
  const totalMyRejected = sessionMyReviews.filter(c => c.human_verdict === 'Rejected').length;

  // Data for Playbooks
  const filteredPlaybooks = initialPlaybooks.filter(pb => {
    const matchesFilter = playbookFilter === 'All' || pb.category === playbookFilter;
    const matchesSearch = playbookSearch === '' || 
      pb.fault_type.toLowerCase().includes(playbookSearch.toLowerCase()) || 
      pb.description.toLowerCase().includes(playbookSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getConfidence = (id) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 70 + (hash % 26);
  };

  const handleRunDiagnosis = () => {
    setDiagnosisRunning(true);
    setShowResult(false);
    setTimeout(() => {
      setDiagnosisRunning(false);
      setShowResult(true);
    }, 1500);
  };

  const handleSaveReview = () => {
    let reviewedCase = null;
    if (currentView === 'review_queue' && selectedCase) {
      setReviewQueue(prev => prev.filter(c => c.id !== selectedCase.id));
      reviewedCase = selectedCase;
    } else if (currentView === 'escalations' && selectedCase) {
      setEscalations(prev => prev.filter(c => c.id !== selectedCase.id));
      reviewedCase = selectedCase;
    }
    
    if (reviewedCase) {
       const completedReview = {
         ...reviewedCase,
         human_verdict: modalVerdict,
         human_note: modalNote,
         reviewer: currentUser.name,
         submitted: new Date().toLocaleString()
       };
       setMyReviews(prev => [completedReview, ...prev]);
    }
    
    setSelectedCase(null);
  };

  const handleCaseClick = (caseId) => {
    const allCases = [...cases, ...reviewQueue, ...myReviews, ...escalations];
    let foundCase = allCases.find(c => c.id === caseId);
    if (!foundCase) {
      // Fallback stub if not in existing lists
      foundCase = {
        id: caseId,
        fault_type: "Unknown",
        osi_layer: "Layer 3",
        severity: "High",
        symptom: "Configuration issue or playbook reference.",
        ai_root_cause: "Linked reference from rule checker or playbook.",
        ai_confidence: "High",
        expected_next_command: "show running-config",
        expected_fix: "Review reference evidence to verify.",
        show_output: "See related checks or playbooks."
      };
    }
    setModalVerdict(foundCase.human_verdict || 'Accepted');
    setModalNote(foundCase.human_note || '');
    setSelectedCase(foundCase);
  };

  const sortedReviewQueue = [...reviewQueue].sort((a, b) => {
    const sevOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    return new Date(a.submitted) - new Date(b.submitted);
  });

  const highSeverityQueueCount = reviewQueue.filter(c => c.severity === 'High').length;
  const oldestWaiting = reviewQueue.length > 0 ? sortedReviewQueue[sortedReviewQueue.length-1].waiting_for : "0 days";
  
  const highSeverityEscalationsCount = escalations.filter(c => c.severity === 'High').length;

  // Check if modal is in read-only mode
  const isReadOnlyModal = currentView === 'my_reviews' || currentView === 'rule_checker' || currentView === 'playbooks';
  const isModalAllowed = ['overview', 'review_queue', 'my_reviews', 'escalations', 'rule_checker', 'playbooks'].includes(currentView);

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex font-sans text-[#07182B] overflow-hidden relative">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 relative z-20">
        <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <Network className="text-[#049FD9]" size={28} />
          <span className="font-bold text-xl text-[#07182B] tracking-tight">NetSage AI</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-scroll">
          <div>
            <div onClick={() => setCurrentView('overview')} className={`rounded-lg p-2.5 flex items-center gap-3 font-medium mb-1 cursor-pointer transition-colors ${currentView === 'overview' ? 'bg-[#049FD9]/10 text-[#049FD9]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <LayoutGrid size={18} />
              <span>Overview</span>
            </div>
            
            <div className="space-y-1 mt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Workspace</h4>
              <NavItem icon={FileText} label="Cases" isActive={currentView === 'overview'} onClick={() => setCurrentView('overview')} />
              <NavItem icon={Sparkles} label="New Diagnosis" isActive={currentView === 'new_diagnosis'} onClick={() => setCurrentView('new_diagnosis')} />
              <NavItem icon={CheckSquare} label="Review Queue" badge={reviewQueue.length} isActive={currentView === 'review_queue'} onClick={() => setCurrentView('review_queue')} />
              <NavItem icon={Clock} label="My Reviews" isActive={currentView === 'my_reviews'} onClick={() => setCurrentView('my_reviews')} />
              <NavItem icon={AlertTriangle} label="Escalations" badge={escalations.length} badgeColor="bg-red-500" isActive={currentView === 'escalations'} onClick={() => setCurrentView('escalations')} />
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Analytics</h4>
            <NavItem icon={ShieldAlert} label="Responsible AI Log" isActive={currentView === 'responsible_ai_log'} onClick={() => setCurrentView('responsible_ai_log')} />
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Knowledge</h4>
            <NavItem icon={BookOpen} label="Playbooks" isActive={currentView === 'playbooks'} onClick={() => setCurrentView('playbooks')} />
            <NavItem icon={Code} label="Rule Checker" isActive={currentView === 'rule_checker'} onClick={() => setCurrentView('rule_checker')} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 text-slate-500 hover:text-slate-800 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Collapse</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 h-16 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#07182B] leading-tight">
              {currentView === 'overview' ? 'Diagnosis Review Console' : 
               currentView === 'new_diagnosis' ? 'New Diagnosis' : 
               currentView === 'responsible_ai_log' ? 'Responsible AI Log' :
               currentView === 'review_queue' ? 'Review Queue' :
               currentView === 'my_reviews' ? 'My Reviews' :
               currentView === 'escalations' ? 'Escalations' :
               currentView === 'rule_checker' ? 'Rule Checker' :
               currentView === 'playbooks' ? 'Playbooks' :
               currentView.replace(/_/g, ' ')}
            </h1>
            <p className="text-xs text-slate-500">
              {currentView === 'overview' ? 'Review AI diagnoses, validate evidence, and approve or edit fixes.' : 
               currentView === 'new_diagnosis' ? 'Describe the fault and provide evidence to get an AI-suggested root cause.' :
               currentView === 'responsible_ai_log' ? "Cases where a human reviewer corrected or rejected the AI's diagnosis." :
               currentView === 'review_queue' ? "Cases awaiting human review before any fix is approved." :
               currentView === 'my_reviews' ? "Cases you have already reviewed and their outcomes." :
               currentView === 'escalations' ? "Cases flagged for senior review due to low confidence, repeated correction, or unresolved urgency." :
               currentView === 'rule_checker' ? "Deterministic config checks, independent of AI diagnosis. Used as a cross-check on every case." :
               currentView === 'playbooks' ? "Proven fix procedures by fault type, drawn from confirmed diagnoses." :
               ""}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {currentView === 'overview' && (
              <>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  Human Review Required
                </div>
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
              </>
            )}
            <button className="relative text-slate-400 hover:text-slate-600">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-[#049FD9] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">3</span>
            </button>
            <button className="text-slate-400 hover:text-slate-600"><HelpCircle size={20} /></button>
            <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-4 relative" ref={profileDropdownRef}>
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-none text-[#07182B] group-hover:text-[#049FD9] transition-colors">{currentUser.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{currentUser.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-[#049FD9] text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:shadow-md transition-shadow">
                  {currentUser.initials}
                </div>
              </div>

              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-3 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    {!showSwitchUserConfirm ? (
                      <>
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">View Profile</p>
                          <p className="font-bold text-[#07182B]">{currentUser.name}</p>
                          <p className="text-sm text-slate-500">{currentUser.role}</p>
                        </div>
                        <div className="p-2">
                          <button 
                            onClick={() => setShowSwitchUserConfirm(true)}
                            className="w-full text-left px-3 py-2.5 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <UserCheck size={16} /> Switch User
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertTriangle size={18} />
                          <h4 className="font-bold text-sm">Switch User?</h4>
                        </div>
                        <p className="text-xs text-slate-600 mb-4">
                          Switch to a different user? Your current session will end.
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowSwitchUserConfirm(false)}
                            className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => { 
                              sessionStorage.removeItem('netsage_user'); 
                              setCurrentUser(null); 
                              setSetupName(''); 
                              setSetupRole(null); 
                              setIsProfileDropdownOpen(false);
                              setShowSwitchUserConfirm(false);
                            }} 
                            className="flex-1 px-3 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                          >
                            Switch
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {currentView === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-end gap-3 mb-2">
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50">
                  <Calendar size={16} /> May 19 – May 25, 2025 <ChevronRight size={14} className="rotate-90 ml-2" />
                </button>
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-[#049FD9] px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-[#049FD9]/10">
                  <Download size={16} /> Export
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={FileText} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Total Cases" value={stats?.total_cases || 0} unit="cases" trend="up" trendValue="12%" />
                <MetricCard icon={CheckSquare} iconColor="text-emerald-500" iconBg="bg-emerald-50" title="AI-Human Agreement" value={`${stats?.verdicts?.Accepted ? Math.round((stats.verdicts.Accepted / stats.total_cases) * 100) : 0}%`} trend="up" trendValue="6%" />
                <MetricCard icon={AlertTriangle} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="AI Corrected" value={stats?.verdicts?.Edited || 0} unit="cases" trend="down" trendValue="1" />
                <MetricCard icon={AlertTriangle} iconColor="text-red-500" iconBg="bg-red-50" title="High Severity" value={severityCounts.High} unit="cases" trend="up" trendValue="3" trendColor="text-red-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-xl shadow-sm relative">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-[#07182B]">Reviewer Verdicts</h3>
                    <MoreHorizontal size={18} className="text-slate-400 cursor-pointer" />
                  </div>
                  <div className="flex items-center h-48">
                    <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={verdictData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                            {verdictData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />)}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-[#07182B]">{stats?.total_cases}</span>
                        <span className="text-xs text-slate-500">Total</span>
                      </div>
                    </div>
                    <div className="w-1/2 space-y-3">
                      {verdictData.map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[v.name] }}></div>
                            <span className="text-sm text-slate-600">{v.name}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#07182B]">{v.value} <span className="text-slate-400 font-normal text-xs">({Math.round((v.value/stats?.total_cases)*100)}%)</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-[#07182B]">Cases by Severity</h3>
                    <MoreHorizontal size={18} className="text-slate-400 cursor-pointer" />
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12}} width={60} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                          {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-xs text-slate-500 pl-[60px] pr-[30px] -mt-4 border-t border-slate-100 pt-2">
                      <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span>
                    </div>
                    <div className="text-center text-xs text-slate-500 mt-1">Number of Cases</div>
                  </div>
                </motion.div>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {['All', 'VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT'].map(tab => (
                      <button 
                        key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === tab ? 'bg-[#049FD9] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >{tab}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold">
                        <th className="p-4 font-medium pl-6">Case ID</th>
                        <th className="p-4 font-medium">Fault Type</th>
                        <th className="p-4 font-medium">OSI Layer</th>
                        <th className="p-4 font-medium">Severity</th>
                        <th className="p-4 font-medium w-1/4">Symptoms</th>
                        <th className="p-4 font-medium text-center">AI Confidence</th>
                        <th className="p-4 font-medium text-center">Status</th>
                        <th className="p-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <AnimatePresence>
                        {filteredCases.slice(0,7).map((c, idx) => (
                          <motion.tr 
                            key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: idx * 0.05 }}
                            onClick={() => setSelectedCase(c)}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          >
                            <td className="p-4 pl-6 font-semibold text-[#049FD9]">{c.id}</td>
                            <td className="p-4 text-[#07182B]">{c.fault_type}</td>
                            <td className="p-4"><span className="text-[#049FD9] bg-[#049FD9]/10 px-2.5 py-1 rounded-md text-xs font-medium">{c.osi_layer}</span></td>
                            <td className="p-4 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${c.severity === 'High' ? 'bg-red-500' : c.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div>
                              <span className="text-slate-600">{c.severity}</span>
                            </td>
                            <td className="p-4 text-slate-600 truncate max-w-xs">{c.symptom}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 justify-center">
                                <span className="text-xs font-semibold text-slate-700 w-8">{getConfidence(c.id)}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#049FD9] rounded-full" style={{ width: `${getConfidence(c.id)}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border ${
                                c.human_verdict === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                c.human_verdict === 'Edited' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                c.human_verdict === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                                {c.human_verdict || 'Pending'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400"><MoreHorizontal size={16} className="cursor-pointer hover:text-slate-600" /></td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'new_diagnosis' && (
            <motion.div key="new_diagnosis" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="space-y-6 flex-1">
                  <div><label className="block text-sm font-semibold text-[#07182B] mb-2">Symptom</label><input type="text" defaultValue="PC in VLAN 30 can't reach the server, but ping to gateway works." className="w-full p-3 rounded-lg border border-slate-200 text-[#07182B] focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9]" /></div>
                  <div><label className="block text-sm font-semibold text-[#07182B] mb-2">Show-Command Output (paste text)</label><textarea rows={5} defaultValue={`show vlan brief\nFa0/2 30 active\nFa0/4 10 active`} className="w-full p-3 rounded-lg border border-slate-200 text-[#07182B] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9] resize-none" /></div>
                  <div className="flex items-center my-4"><div className="flex-1 border-t border-slate-200"></div><span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">OR</span><div className="flex-1 border-t border-slate-200"></div></div>
                  <div><label className="block text-sm font-semibold text-[#07182B] mb-2">Upload Screenshot</label><div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group"><UploadCloud className="text-[#049FD9] mb-3 group-hover:scale-110 transition-transform" size={32} /><p className="text-sm text-slate-600 font-medium">Drag and drop a terminal or topology screenshot, or click to browse</p></div></div>
                </div>
                <button onClick={handleRunDiagnosis} disabled={diagnosisRunning} className="w-full mt-8 bg-[#049FD9] hover:bg-[#0385B5] text-white py-3.5 rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm">{diagnosisRunning ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Sparkles size={18} /></motion.div> : <Sparkles size={18} />}{diagnosisRunning ? 'Analyzing...' : 'Run Diagnosis'}</button>
              </div>
              <div className="h-full">
                {showResult ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between mb-2"><span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Check size={14} /> Diagnosis Complete</span></div>
                      <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Root Cause</h4><p className="text-[#07182B] font-medium text-lg">Fa0/4 is assigned to VLAN 10 instead of VLAN 30, isolating the server from PC1.</p></div>
                      <div className="flex gap-8">
                        <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">OSI Layer</h4><span className="px-3 py-1 bg-[#049FD9]/10 text-[#049FD9] rounded-md text-sm font-semibold border border-[#049FD9]/20">Layer 2</span></div>
                        <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Confidence</h4><span className="px-3 py-1 bg-[#049FD9] text-white rounded-md text-sm font-semibold">High</span></div>
                      </div>
                      <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Evidence</h4><div className="bg-[#049FD9]/5 p-4 rounded-lg border border-[#049FD9]/20"><code className="text-sm font-mono text-[#07182B]">show vlan brief: Fa0/2 -&gt; VLAN 30, Fa0/4 -&gt; VLAN 10</code></div></div>
                      <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Next Command to Confirm</h4><div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><code className="text-sm font-mono text-[#07182B]">show vlan brief</code></div></div>
                      <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Suggested Fix</h4><div className="bg-[#049FD9]/10 p-4 rounded-lg border border-[#049FD9]/20"><code className="text-sm font-mono text-[#07182B]">interface fa0/4 -&gt; switchport access vlan 30</code></div></div>
                    </div>
                    <div className="mt-8">
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3 mb-4"><Info size={16} className="text-slate-400" /><span className="text-xs text-slate-500 font-medium">This is a suggestion. A human reviewer must approve before applying any fix.</span></div>
                      <div className="flex gap-4">
                        <button onClick={() => { alert("Diagnosis submitted to the Review Queue successfully!"); setShowResult(false); }} className="flex-1 bg-[#049FD9] hover:bg-[#0385B5] text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-sm">Send to Review Queue</button>
                        <button onClick={() => setShowResult(false)} className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">Discard</button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 border-dashed h-full flex flex-col items-center justify-center text-center p-8"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4"><Sparkles className="text-slate-300" size={24} /></div><h3 className="text-lg font-semibold text-slate-400 mb-2">Ready for Diagnosis</h3><p className="text-sm text-slate-400 max-w-sm">Provide symptoms and evidence in the left panel, then run the diagnosis to see AI suggestions here.</p></div>
                )}
              </div>
            </motion.div>
          )}

          {currentView === 'review_queue' && (
            <motion.div key="review_queue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard icon={CheckSquare} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Pending Review" value={reviewQueue.length} />
                <MetricCard icon={AlertTriangle} iconColor="text-red-500" iconBg="bg-red-50" title="High Severity Pending" value={highSeverityQueueCount} />
                <MetricCard icon={Clock} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Oldest Waiting" value={oldestWaiting} />
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {sortedReviewQueue.map((c) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-[#049FD9]/30 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="font-mono font-bold text-[#049FD9]">{c.id}</div>
                        <div className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold uppercase tracking-wider">{c.fault_type}</div>
                        <div className="px-3 py-1 bg-[#049FD9]/10 text-[#049FD9] rounded-md text-xs font-bold">{c.osi_layer}</div>
                        <div className="flex items-center gap-1.5 ml-2"><div className={`w-2 h-2 rounded-full ${c.severity === 'High' ? 'bg-red-500' : c.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div><span className="text-sm font-medium text-slate-600">{c.severity}</span></div>
                      </div>
                      <div className="flex-1 px-4 min-w-0"><div className="flex items-center gap-2 text-sm italic text-slate-500 truncate"><Sparkles size={14} className="text-[#049FD9] shrink-0" /><span className="truncate">{c.ai_root_cause_preview}</span></div></div>
                      <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col text-right"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Confidence</span><span className={`text-sm font-semibold ${c.ai_confidence === 'High' ? 'text-emerald-600' : c.ai_confidence === 'Medium' ? 'text-amber-500' : 'text-slate-500'}`}>{c.ai_confidence}</span></div>
                          <div className="flex flex-col text-right w-24"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Submitted</span><span className="text-sm text-slate-600 truncate">{c.submitted.split(' ')[0]}</span></div>
                        </div>
                        <button onClick={() => setSelectedCase(c)} className="px-6 py-2 border-2 border-[#049FD9] text-[#049FD9] rounded-lg font-bold hover:bg-[#049FD9]/10 transition-colors whitespace-nowrap">Review</button>
                      </div>
                    </motion.div>
                  ))}
                  {reviewQueue.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200"><CheckSquare className="mx-auto mb-3 text-emerald-400" size={32} /><h3 className="text-lg font-semibold text-[#07182B]">You're all caught up!</h3><p className="text-sm">No cases currently awaiting review.</p></motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {currentView === 'responsible_ai_log' && (
            <motion.div key="responsible_ai_log" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard icon={ShieldAlert} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Total Corrections" value={totalCorrections} trend="up" trendValue="1" />
                <MetricCard icon={Edit2} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Edited Cases" value={totalEdited} trend="up" trendValue="1" />
                <MetricCard icon={X} iconColor="text-red-500" iconBg="bg-red-50" title="Rejected Cases" value={totalRejected} trend="down" trendValue="2" trendColor="text-red-500" />
              </div>
              <div className="space-y-6">
                {correctedCases.map((c, idx) => {
                  const isEdited = c.human_verdict === 'Edited';
                  const statusColor = isEdited ? 'amber' : 'red';
                  
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <h3 className="font-mono text-lg font-bold text-[#049FD9]">{c.id}</h3>
                          <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-semibold uppercase tracking-wider">{c.fault_type}</span>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-${statusColor}-50 text-${statusColor}-600 border border-${statusColor}-100`}>{c.human_verdict}</span>
                      </div>
                      <div className="p-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6"><p className="text-sm font-medium text-slate-700"><span className="font-bold text-slate-400 mr-2 uppercase text-xs">Symptom</span> {c.symptom}</p></div>
                        <div className="flex items-stretch gap-4 mb-6">
                          <div className="flex-1 bg-slate-50/50 p-5 rounded-xl border border-slate-100"><h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><Bot size={16} /> AI Suggested</h4><div className="space-y-4 text-slate-500 text-sm"><div><strong className="block text-xs mb-1 text-slate-400">Root Cause</strong><p>{c.ai_root_cause}</p></div></div></div>
                          <div className="flex items-center justify-center text-slate-300"><ArrowRight size={24} /></div>
                          <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h4 className="flex items-center gap-2 text-xs font-bold text-[#07182B] uppercase tracking-widest mb-4"><UserCheck size={16} className="text-[#049FD9]" /> Human Corrected</h4><div className="space-y-4 text-[#07182B] text-sm"><div><strong className="block text-xs mb-1 text-slate-500">Root Cause & Fix</strong><p>{c.expected_root_cause}</p><p className="mt-2 font-mono text-xs bg-slate-50 p-2 rounded">{c.expected_fix}</p></div></div></div>
                        </div>
                        <div className={`p-4 rounded-lg border bg-${statusColor}-50/50 border-${statusColor}-100`}><h4 className={`text-xs font-bold uppercase tracking-widest mb-2 text-${statusColor}-700`}>Why it was corrected</h4><p className={`text-sm text-${statusColor}-900`}>{c.human_note}</p></div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end items-center gap-3"><div className="flex flex-col text-right"><span className="text-sm font-bold text-slate-700">Alice Reviewer</span><span className="text-xs text-slate-400">May 25, 2025 • 10:42 AM</span></div><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border-2 border-white shadow-sm">AR</div></div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {currentView === 'my_reviews' && (
            <motion.div key="my_reviews" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MetricCard icon={FileCheck} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Total Reviewed" value={totalMyReviews} />
                <MetricCard icon={CheckSquare} iconColor="text-emerald-500" iconBg="bg-emerald-50" title="Accepted" value={totalMyAccepted} />
                <MetricCard icon={Edit2} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Edited" value={totalMyEdited} />
                <MetricCard icon={X} iconColor="text-red-500" iconBg="bg-red-50" title="Rejected" value={totalMyRejected} />
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                  {['All', 'Accepted', 'Edited', 'Rejected'].map(tab => (
                    <button key={tab} onClick={() => setMyReviewsFilter(tab)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${myReviewsFilter === tab ? 'bg-[#049FD9] text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>{tab}</button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <AnimatePresence>
                        {filteredMyReviews.map((c, idx) => (
                          <motion.tr key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, delay: idx * 0.05 }} onClick={() => handleCaseClick(c.id)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                            <td className="p-5 pl-6 font-semibold text-[#049FD9] w-28">{c.id}</td>
                            <td className="p-5 w-24"><span className="text-[#07182B] font-medium">{c.fault_type}</span></td>
                            <td className="p-5 w-24"><span className="text-[#049FD9] bg-[#049FD9]/10 px-2.5 py-1 rounded-md text-xs font-bold">{c.osi_layer}</span></td>
                            <td className="p-5 flex items-center gap-2 w-32 mt-1">
                              <div className={`w-2 h-2 rounded-full ${c.severity === 'High' ? 'bg-red-500' : c.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div>
                              <span className="text-slate-600 font-medium">{c.severity}</span>
                            </td>
                            <td className="p-5 w-32 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
                                c.human_verdict === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                c.human_verdict === 'Edited' ? 'bg-[#F2A93B]/10 text-[#F2A93B] border-[#F2A93B]/20' :
                                'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                {c.human_verdict}
                              </span>
                            </td>
                            <td className="p-5 text-slate-500 italic max-w-md truncate">"{c.human_note}"</td>
                            <td className="p-5 text-slate-400 text-xs text-right pr-6 whitespace-nowrap font-medium">{c.submitted}</td>
                          </motion.tr>
                        ))}
                        {filteredMyReviews.length === 0 && (
                          <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No reviews found for this filter.</td></tr>
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'escalations' && (
            <motion.div key="escalations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard icon={AlertTriangle} iconColor="text-[#E5606A]" iconBg="bg-[#E5606A]/10" title="Active Escalations" value={escalations.length} />
                <MetricCard icon={Clock} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Avg Time to Resolution" value="6 hours" />
                <MetricCard icon={AlertTriangle} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="High Severity Escalations" value={highSeverityEscalationsCount} />
              </div>
              <div className="space-y-6">
                <AnimatePresence>
                  {escalations.map((c) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-[#049FD9]">{c.id}</span>
                            <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold uppercase">{c.fault_type}</span>
                            <div className="flex items-center gap-1.5 ml-1"><div className={`w-2.5 h-2.5 rounded-full ${c.severity === 'High' ? 'bg-[#E5606A]' : c.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div><span className="text-sm font-medium text-slate-600">{c.severity}</span></div>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-red-50 text-[#E5606A] border border-red-100 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><ShieldAlert size={14} />{c.escalation_reason}</span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-sm font-medium text-slate-700">{c.symptom}</p></div>
                        <div className="flex justify-between items-end pt-2">
                          <div className="space-y-2 max-w-xl">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">Flagged by {c.flagged_by} &middot; {c.flagged_at}</p>
                            {c.note && (<p className="text-sm italic text-slate-500 border-l-2 border-slate-300 pl-3 py-0.5">"{c.note}"</p>)}
                          </div>
                          {currentUser.role === 'Senior Reviewer' ? (
                            <button onClick={() => handleCaseClick(c.id)} className="px-6 py-2.5 border-2 border-[#049FD9] text-[#049FD9] rounded-lg font-bold hover:bg-[#049FD9]/10 transition-colors whitespace-nowrap shadow-sm">Resolve Escalation</button>
                          ) : (
                            <div className="group/btn relative">
                              <button disabled className="px-6 py-2.5 border-2 border-slate-300 text-slate-400 rounded-lg font-bold cursor-not-allowed whitespace-nowrap shadow-sm bg-slate-50">Resolve Escalation</button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-xs text-center p-2 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-10">Only Senior Reviewers can resolve escalations.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {escalations.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200"><ShieldAlert className="mx-auto mb-4 text-emerald-400" size={40} /><h3 className="text-xl font-semibold text-[#07182B] mb-1">Zero Active Escalations</h3><p className="text-sm">Great job! There are no cases requiring senior review.</p></motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {currentView === 'rule_checker' && (
            <motion.div key="rule_checker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MetricCard icon={Code2} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Checks Run" value={42} />
                <MetricCard icon={AlertTriangle} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Issues Found" value={ruleCheckerIssues.length} />
                <MetricCard icon={CheckSquare} iconColor="text-emerald-500" iconBg="bg-emerald-50" title="Clean Cases" value={36} />
                <MetricCard icon={ShieldAlert} iconColor="text-red-500" iconBg="bg-red-50" title="High Severity Issues" value={ruleCheckerIssues.filter(i => i.severity === 'High').length} />
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <h4 className="text-sm font-bold text-[#07182B] mr-2">Active Rules:</h4>
                {['Duplicate IPs', 'Mask Mismatch', 'Gateway Mismatch', 'Interface Down', 'VLAN Mismatch', 'Missing Route'].map(check => {
                  const count = ruleCheckerIssues.filter(i => i.check === check).length;
                  return (
                    <div key={check} className="flex items-center bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1 py-1 group hover:border-[#049FD9]/30 transition-colors">
                      <span className="text-xs font-semibold text-slate-700 mr-2">{check}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4">
                {ruleCheckerIssues.map((issue, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${issue.severity === 'High' ? 'bg-red-500' : issue.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div>
                      <span className="text-sm font-bold text-slate-700">{issue.severity}</span>
                    </div>
                    <div className="shrink-0 w-40"><span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider">{issue.check}</span></div>
                    <div className="flex-1 min-w-0 space-y-1.5"><p className="text-[#07182B] font-medium text-sm">{issue.message}</p><code className="block text-xs font-mono text-slate-500 bg-slate-50 p-1.5 rounded truncate max-w-xl">{issue.evidence}</code></div>
                    <div className="shrink-0"><button onClick={() => handleCaseClick(issue.case_id)} className="flex items-center gap-1 text-sm font-bold text-[#049FD9] hover:text-[#0385B5] bg-[#049FD9]/5 hover:bg-[#049FD9]/10 px-3 py-1.5 rounded-lg transition-colors"><ArrowRight size={14} />{issue.case_id}</button></div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 bg-[#07182B] rounded-xl overflow-hidden shadow-lg border border-slate-800">
                <button onClick={() => setShowCodePreview(!showCodePreview)} className="w-full flex items-center justify-between p-4 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2"><Code2 size={18} className="text-[#049FD9]" /><span className="text-sm font-medium">View check logic (Python)</span></div>
                  {showCodePreview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <AnimatePresence>
                  {showCodePreview && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-6 pt-2 border-t border-slate-800">
                        <pre className="text-sm font-mono text-slate-300 overflow-x-auto"><span className="text-emerald-400">def</span> <span className="text-blue-400">check_interfaces_down</span>(interfaces, result):{'\n'}    <span className="text-amber-400">for</span> iface <span className="text-amber-400">in</span> interfaces:{'\n'}        <span className="text-amber-400">if</span> iface.get(<span className="text-emerald-300">"status"</span>) <span className="text-amber-400">in</span> (<span className="text-emerald-300">"administratively down"</span>, <span className="text-emerald-300">"disabled"</span>, <span className="text-emerald-300">"shutdown"</span>):{'\n'}            result.add(<span className="text-emerald-300">"interface_down"</span>, <span className="text-emerald-300">"High"</span>, <span className="text-emerald-300">f"Interface</span> {'{'}iface[<span className="text-emerald-300">'name'</span>]{'}'} <span className="text-emerald-300">is down."</span>)</pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {currentView === 'playbooks' && (
            <motion.div key="playbooks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
              
              {/* Search and Filters */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-6">
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search playbooks by fault type or keyword..." 
                    value={playbookSearch}
                    onChange={(e) => setPlaybookSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9] text-sm text-[#07182B]"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {['All', 'VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Interface', 'Trunk'].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setPlaybookFilter(tab)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                        playbookFilter === tab 
                          ? 'bg-[#049FD9] text-white shadow-sm' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Playbook Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                  {filteredPlaybooks.map((pb, idx) => (
                    <motion.div 
                      key={pb.fault_type}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:border-[#049FD9]/30 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => setExpandedPlaybook(expandedPlaybook === pb.fault_type ? null : pb.fault_type)}
                    >
                      <div className="p-6 pb-4">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#049FD9]/10 text-[#049FD9] flex items-center justify-center shrink-0">
                            <BookOpen size={20} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-[#07182B] group-hover:text-[#049FD9] transition-colors">{pb.fault_type}</h3>
                            <p className="text-sm text-slate-500 mt-1">{pb.description}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Fix Procedure</h4>
                          <ol className="list-decimal list-inside space-y-2">
                            {pb.steps.map((step, sIdx) => (
                              <li key={sIdx} className="text-sm font-mono text-[#07182B] leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      {/* Expandable Related Cases Section */}
                      <AnimatePresence>
                        {expandedPlaybook === pb.fault_type && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-[#F7F9FA] border-t border-slate-100 px-6 py-4"
                          >
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Related Cases</h4>
                            <div className="flex flex-wrap gap-2">
                              {pb.related_cases.map(caseId => (
                                <button
                                  key={caseId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCaseClick(caseId);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-[#049FD9] rounded-md text-sm font-bold hover:bg-[#049FD9]/5 transition-colors shadow-sm"
                                >
                                  <FileText size={14} />
                                  {caseId}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="px-6 py-4 border-t border-slate-100 mt-auto flex items-center justify-between text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-emerald-500" />
                          Based on {pb.based_on} confirmed cases
                        </span>
                        <div className="flex items-center gap-1 text-[#049FD9]">
                          {expandedPlaybook === pb.fault_type ? (
                            <>Hide Cases <ChevronUp size={14} /></>
                          ) : (
                            <>View Cases <ChevronDown size={14} /></>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {filteredPlaybooks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                  <BookOpen className="mx-auto text-slate-300 mb-4" size={40} />
                  <h3 className="text-lg font-semibold text-[#07182B] mb-2">No playbooks found</h3>
                  <p className="text-slate-500">Try adjusting your filters or search keywords.</p>
                </div>
              )}
            </motion.div>
          )}



        </div>
      </main>

      {/* Case Details Modal */}
      <AnimatePresence>
        {selectedCase && isModalAllowed && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setSelectedCase(null)} />
            <motion.div initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.5 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute top-4 right-4 bottom-4 w-full max-w-4xl bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-200">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-[#049FD9]">{selectedCase.id}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-sm font-medium">{selectedCase.fault_type}</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-[#049FD9] rounded-md text-sm font-medium">{selectedCase.osi_layer}</span>
                    <span className="px-3 py-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <div className={`w-2.5 h-2.5 rounded-full ${selectedCase.severity === 'High' ? 'bg-red-500' : selectedCase.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div>
                      {selectedCase.severity}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-white">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8"><p className="text-lg text-[#07182B]">{selectedCase.symptom}</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                  <div className="space-y-8">
                    <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">AI Root Cause</h4><p className="text-[#07182B] font-medium">{selectedCase.ai_root_cause || selectedCase.expected_root_cause}</p></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">AI Confidence</h4>
                      <span className={`inline-block px-4 py-1.5 border rounded-lg text-sm font-semibold ${selectedCase.ai_confidence === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : selectedCase.ai_confidence === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {selectedCase.ai_confidence || 'Medium'}
                      </span>
                    </div>
                    <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Evidence Cited</h4><div className="bg-[#049FD9]/5 p-4 rounded-xl border border-[#049FD9]/20"><code className="text-sm font-mono text-[#07182B] block whitespace-pre-wrap">{selectedCase.ai_evidence || selectedCase.show_output}</code></div></div>
                  </div>
                  <div className="space-y-8">
                    <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Next Command To Run</h4><div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><code className="text-sm font-mono text-[#07182B]">{selectedCase.expected_next_command}</code></div></div>
                    <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Suggested Fix</h4><div className="bg-[#049FD9]/10 p-6 rounded-xl border border-[#049FD9]/20 h-[120px] flex items-center"><code className="text-sm font-mono text-[#07182B]">{selectedCase.expected_fix}</code></div></div>
                  </div>
                </div>
                <div className="pt-8 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-[#07182B]">
                      {currentView === 'escalations' ? 'Senior Review' : 'Human Review'}
                    </h3>
                    {isReadOnlyModal && (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Read Only View</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button onClick={() => setModalVerdict('Accepted')} disabled={isReadOnlyModal} className={`flex items-center justify-center gap-2 py-3 border rounded-xl font-semibold transition-colors bg-white ${isReadOnlyModal ? 'opacity-50 cursor-not-allowed border-slate-300 text-slate-500' : modalVerdict === 'Accepted' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600'}`}><Check size={18} /> Accept</button>
                    <button onClick={() => setModalVerdict('Edited')} disabled={isReadOnlyModal} className={`flex items-center justify-center gap-2 py-3 border rounded-xl font-semibold transition-colors bg-white ${isReadOnlyModal ? 'opacity-50 cursor-not-allowed border-slate-300 text-slate-500' : modalVerdict === 'Edited' ? 'border-[#F2A93B] bg-[#F2A93B]/10 text-[#F2A93B] shadow-sm' : 'border-slate-200 text-slate-600 hover:border-[#F2A93B] hover:text-[#F2A93B]'}`}><Edit2 size={18} /> Edit</button>
                    <button onClick={() => setModalVerdict('Rejected')} disabled={isReadOnlyModal} className={`flex items-center justify-center gap-2 py-3 border rounded-xl font-semibold transition-colors bg-white ${isReadOnlyModal ? 'opacity-50 cursor-not-allowed border-slate-300 text-slate-500' : modalVerdict === 'Rejected' ? 'border-red-400 bg-red-50 text-red-500 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-500'}`}><X size={18} /> Reject</button>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reviewer Note</h4>
                    <textarea 
                      value={modalNote}
                      onChange={(e) => setModalNote(e.target.value)}
                      disabled={isReadOnlyModal}
                      className={`w-full p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9] text-sm min-h-[100px] resize-none shadow-sm ${isReadOnlyModal ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'text-[#07182B]'}`} 
                      placeholder="Add comments on why you are accepting, editing, or rejecting this diagnosis..."
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-white flex justify-end shrink-0">
                {!isReadOnlyModal && (
                  <button onClick={handleSaveReview} className="bg-[#049FD9] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-[#0385B5] transition-colors shadow-sm shadow-[#049FD9]/20">
                    <Save size={18} /> 
                    {currentView === 'escalations' ? 'Resolve Escalation' : 'Save Review'}
                  </button>
                )}
                {isReadOnlyModal && (
                  <button onClick={() => setSelectedCase(null)} className="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors">Close</button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

function NavItem({ icon: Icon, label, badge, badgeColor = "bg-[#049FD9]", isActive, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
        isActive ? 'bg-[#049FD9]/10 text-[#049FD9]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#07182B]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={`${isActive ? 'text-[#049FD9]' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
        <span className="font-medium text-sm">{label}</span>
      </div>
      {badge !== undefined && badge !== 0 && (
        <span className={`${badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, iconColor, iconBg, title, value, unit, trend, trendValue, trendColor = "text-emerald-500" }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white p-5 rounded-xl shadow-sm flex items-start gap-4 border border-slate-200">
      <div className={`${iconBg} ${iconColor} p-3 rounded-xl`}><Icon size={24} strokeWidth={1.5} /></div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-[#07182B]">{value}</span>
          {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
        </div>
        {trend && (
          <p className={`text-xs font-semibold ${trendColor} flex items-center gap-1`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue} <span className="text-slate-400 font-normal">vs last 7 days</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

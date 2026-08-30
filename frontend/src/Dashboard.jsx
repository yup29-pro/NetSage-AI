import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  Network, LayoutGrid, FileText, CheckSquare, Clock, AlertTriangle, 
  BookOpen, Code,
  ChevronLeft, Bell, HelpCircle, Calendar, ChevronRight,
  Download, Search, MoreHorizontal, X,
  Check, Edit2, Save, UploadCloud, Sparkles, Info, ShieldAlert,
  ArrowRight, UserCheck, Bot, FileCheck, Code2, ChevronDown, ChevronUp,
  CheckCircle2, FileDown, Layers
} from 'lucide-react';

const COLORS = {
  Accepted: '#3b82f6', // blue
  Edited: '#f59e0b', // yellow
  Rejected: '#ef4444', // red
  Pending: '#94a3b8', // slate
};

// Fallback seed cases (30 cases matching cases.csv)
const defaultCases = [
  { id: "CASE001", fault_type: "VLAN", concept_tag: "VLAN tagging / access port mismatch", osi_layer: "Layer 2", severity: "High", symptom: "PC1 in VLAN 30 cannot ping PC2 also in VLAN 30, but can ping its own gateway.", topology_note: "SW1 connects PC1 (Fa0/2) and PC2 (Fa0/4). Both should be in VLAN 30.", show_output: "show vlan brief output shows Fa0/2 assigned to VLAN 30, Fa0/4 assigned to VLAN 10 (default).", expected_root_cause: "Fa0/4 was never moved into VLAN 30, so PC2 is isolated in the wrong broadcast domain.", expected_next_command: "show vlan brief", expected_fix: "Run 'interface fa0/4' then 'switchport access vlan 30' on SW1 to correct the port assignment.", human_verdict: "Accepted", human_note: "AI correctly identified the VLAN mismatch.", reviewer: "Arjun Desai" },
  { id: "CASE002", fault_type: "Gateway", concept_tag: "Default gateway misconfiguration", osi_layer: "Layer 3", severity: "High", symptom: "PC gets a valid IP via DHCP but cannot reach any device outside its own subnet, including the gateway.", topology_note: "PC on VLAN 20, SVI for VLAN 20 configured on distribution switch as 192.168.20.1/24.", show_output: "show ip interface brief on PC shows gateway set to 192.168.20.2 (wrong); SVI on switch is actually .1 and shows up/up.", expected_root_cause: "PC's DHCP scope or static config has the wrong default gateway IP, so all off-subnet traffic is dropped locally.", expected_next_command: "show running-config | section dhcp", expected_fix: "Correct the DHCP pool's default-router statement (or static IP config) to 192.168.20.1.", human_verdict: "Edited", human_note: "Corrected the fix target from SVI to the DHCP pool configuration.", reviewer: "Arjun Desai" },
  { id: "CASE003", fault_type: "DHCP", concept_tag: "DHCP pool exhaustion", osi_layer: "Layer 3", severity: "Medium", symptom: "New PCs joining VLAN 40 fail to get an IP address and show APIPA (169.254.x.x).", topology_note: "VLAN 40 has 50 hosts; DHCP pool was configured early in the project for only 20 addresses.", show_output: "show ip dhcp pool VLAN40 shows 'Current index' at the end of the range, 0 addresses leased available.", expected_root_cause: "DHCP pool for VLAN 40 is exhausted; no addresses remain to lease to new clients.", expected_next_command: "show ip dhcp pool", expected_fix: "Expand the DHCP pool network statement (e.g. widen the /26 to a /24) or exclude fewer addresses in the pool.", human_verdict: "Accepted", human_note: "Spot on. Expanded DHCP pool scope.", reviewer: "Arjun Desai" },
  { id: "CASE004", fault_type: "DNS", concept_tag: "Missing DNS server configuration", osi_layer: "Layer 7", severity: "Low", symptom: "Users can ping the web server by IP successfully but the browser cannot resolve the server's hostname.", topology_note: "DHCP scope for VLAN 10 was set up without a dns-server option.", show_output: "show running-config | section dhcp shows no 'dns-server' line under the VLAN10 pool.", expected_root_cause: "Clients never received a DNS server address from DHCP, so name resolution fails while IP connectivity works fine.", expected_next_command: "show ip dhcp pool", expected_fix: "Add 'dns-server <ip>' to the DHCP pool configuration for VLAN 10.", human_verdict: "Accepted", human_note: "Good catch. Added DNS option to DHCP pool.", reviewer: "Arjun Desai" },
  { id: "CASE005", fault_type: "Routing", concept_tag: "Missing static route", osi_layer: "Layer 3", severity: "High", symptom: "HQ router can ping its own subnets but cannot reach the Branch office subnet 172.16.5.0/24.", topology_note: "Two routers connected via serial link; no dynamic routing protocol configured, static routes expected.", show_output: "show ip route on HQ router has no entry for 172.16.5.0/24; only connected routes are listed.", expected_root_cause: "No static (or dynamic) route exists at HQ pointing toward the Branch subnet, so packets are dropped locally.", expected_next_command: "show ip route", expected_fix: "Add 'ip route 172.16.5.0 255.255.255.0 <next-hop-or-exit-interface>' on the HQ router.", human_verdict: "Rejected", human_note: "Lab uses static routing only, not OSPF. Corrected to a static route.", reviewer: "Arjun Desai" },
  { id: "CASE006", fault_type: "ACL", concept_tag: "Overly restrictive access list", osi_layer: "Layer 4", severity: "High", symptom: "PC in VLAN 30 can reach the gateway and can traceroute to the server subnet, but TCP connections to the server on port 443 time out.", topology_note: "Router has an inbound ACL applied on the server-facing interface intended to allow only HTTP.", show_output: "show access-lists shows 'permit tcp any any eq 80' but no matching line for port 443; implicit deny hits the HTTPS traffic.", expected_root_cause: "ACL on the server interface permits port 80 but not 443, so HTTPS traffic is silently dropped by the implicit deny.", expected_next_command: "show access-lists", expected_fix: "Add 'permit tcp any any eq 443' to the ACL, above the implicit deny, or edit the existing permit line.", human_verdict: "Edited", human_note: "AI blamed a server firewall with no evidence. Corrected to the actual ACL cause.", reviewer: "Arjun Desai" },
  { id: "CASE007", fault_type: "NAT", concept_tag: "Missing NAT translation for outbound traffic", osi_layer: "Layer 3", severity: "Medium", symptom: "Internal hosts on 10.10.10.0/24 can reach each other but cannot reach the internet/ISP-simulated server.", topology_note: "Router has a NAT-capable outside interface but overload NAT was never enabled.", show_output: "show ip nat translations returns empty; show run shows 'ip nat inside'/'ip nat outside' set on interfaces but no 'ip nat inside source list' statement.", expected_root_cause: "No NAT overload (PAT) configuration exists, so internal private addresses are never translated for outbound traffic.", expected_next_command: "show ip nat translations", expected_fix: "Configure 'ip nat inside source list <acl> interface <outside-int> overload' on the router.", human_verdict: "Pending" },
  { id: "CASE008", fault_type: "Wireless", concept_tag: "SSID on wrong VLAN / guest isolation failure", osi_layer: "Layer 2", severity: "Medium", symptom: "Guest Wi-Fi users can reach the internal file server, which should not be permitted.", topology_note: "WLC has Guest SSID mapped to VLAN 99 intended for internet-only access; internal server is on VLAN 10.", show_output: "show vlan brief / WLC interface mapping shows Guest SSID interface mistakenly mapped to VLAN 10 instead of VLAN 99.", expected_root_cause: "Guest SSID's VLAN mapping on the WLC/AP was misconfigured to the internal VLAN instead of the isolated guest VLAN.", expected_next_command: "show running-config interface wireless", expected_fix: "Remap the Guest SSID to VLAN 99 on the WLC and confirm ACL isolation is applied to that VLAN.", human_verdict: "Rejected", human_note: "AI's cause did not match the WLC evidence. Re-diagnosed to VLAN mapping mismatch.", reviewer: "Arjun Desai" },
  { id: "CASE009", fault_type: "Interface", concept_tag: "Interface administratively down", osi_layer: "Layer 1", severity: "High", symptom: "PC connected to Fa0/6 on SW2 has no link light and gets no IP address at all.", topology_note: "Port was previously used for a decommissioned device and was shut down by a technician.", show_output: "show interfaces Fa0/6 status shows 'disabled'; show run confirms 'shutdown' under the interface.", expected_root_cause: "The interface was left in shutdown state from prior configuration, so no Layer 1 link can form.", expected_next_command: "show interfaces status", expected_fix: "Enter interface configuration mode for Fa0/6 and run 'no shutdown'.", human_verdict: "Accepted", human_note: "Verified link state. Applied no shutdown.", reviewer: "Arjun Desai" },
  { id: "CASE010", fault_type: "Trunk", concept_tag: "Native VLAN mismatch on trunk link", osi_layer: "Layer 2", severity: "Medium", symptom: "Intermittent connectivity issues and CDP native VLAN mismatch warnings appear between two switches.", topology_note: "Trunk link between SW1 and SW2 carries VLANs 10,20,30.", show_output: "show interfaces trunk shows SW1 native VLAN 1, SW2 native VLAN 99 on the same trunk link.", expected_root_cause: "Native VLAN configured differently on each end of the trunk causes untagged traffic to land in the wrong VLAN.", expected_next_command: "show interfaces trunk", expected_fix: "Set the native VLAN to match on both ends of the trunk (e.g. 'switchport trunk native vlan 99' on both switches).", human_verdict: "Accepted", human_note: "Aligned native VLAN across both switches.", reviewer: "Arjun Desai" },
  { id: "CASE011", fault_type: "VLAN", concept_tag: "Trunk pruning / allowed VLAN list restriction", osi_layer: "Layer 2", severity: "High", symptom: "PC in VLAN 40 cannot reach the remote server on SW2 across trunk link Fa0/1.", topology_note: "SW1 trunk Fa0/1 connects to SW2 trunk Fa0/1. VLAN 40 exists on both switches.", show_output: "show interfaces trunk shows Fa0/1 VLANs allowed on trunk: 1-39.", expected_root_cause: "Trunk port Fa0/1 is pruning VLAN 40 because allowed list is restricted to 1-39.", expected_next_command: "show interfaces trunk", expected_fix: "Run 'interface fa0/1' -> 'switchport trunk allowed vlan add 40' on SW1 and SW2.", human_verdict: "Pending" },
  { id: "CASE012", fault_type: "DNS", concept_tag: "Unreachable DNS server IP", osi_layer: "Layer 7", severity: "High", symptom: "Users cannot browse the intranet portal by domain name, but pinging portal IP 192.168.10.50 works.", topology_note: "DHCP distributes 192.168.100.1 as DNS server; router has no route to 192.168.100.0/24.", show_output: "ipconfig /all shows DNS server 192.168.100.1; ping 192.168.100.1 returns Destination Host Unreachable.", expected_root_cause: "The DNS server IP handed out by DHCP is unreachable due to missing route or incorrect address.", expected_next_command: "ping 192.168.100.1", expected_fix: "Update DHCP scope with valid DNS server IP 192.168.10.1 or add route to 192.168.100.0/24.", human_verdict: "Pending" },
  { id: "CASE013", fault_type: "NAT", concept_tag: "Narrow NAT ACL excluding new subnet", osi_layer: "Layer 3", severity: "Medium", symptom: "Hosts in new VLAN 50 cannot browse the internet, while VLAN 10 and VLAN 20 hosts can.", topology_note: "VLAN 50 (10.0.50.0/24) was recently added to edge router. NAT ACL 1 permits 10.0.10.0 and 10.0.20.0.", show_output: "show access-lists 1 shows permit 10.0.10.0/24 and 10.0.20.0/24 only; no entries for 10.0.50.0 in show ip nat translations.", expected_root_cause: "NAT access-list 1 was not updated to include the new VLAN 50 subnet.", expected_next_command: "show access-lists 1", expected_fix: "Add 'access-list 1 permit 10.0.50.0 0.0.0.255' on the edge router.", human_verdict: "Pending" },
  { id: "CASE014", fault_type: "Interface", concept_tag: "Port security err-disabled violation", osi_layer: "Layer 1", severity: "Medium", symptom: "Network printer connected to Fa0/8 lost connectivity after being moved to a different wall jack.", topology_note: "Switchport Fa0/8 configured with switchport port-security violation shutdown.", show_output: "show interfaces status shows Fa0/8 is err-disabled; show port-security interface fa0/8 shows violation count 1.", expected_root_cause: "Port security violation triggered err-disable when the printer's MAC address changed on Fa0/8.", expected_next_command: "show port-security interface fa0/8", expected_fix: "Run 'interface fa0/8' -> 'shutdown' -> 'no shutdown' and update secure MAC address.", human_verdict: "Pending" },
  { id: "CASE015", fault_type: "ACL", concept_tag: "Missing secondary port in firewall ACL", osi_layer: "Layer 4", severity: "Low", symptom: "ERP web client connects on port 80, but the reporting dashboard on port 8080 fails to load data.", topology_note: "Inbound ACL 101 applied on router gateway interface facing the ERP server.", show_output: "show access-lists 101 shows permit tcp any any eq 80 and permit tcp any any eq 443; no permit for 8080.", expected_root_cause: "ACL 101 lacks a permit entry for application port 8080, causing implicit deny to drop reporting requests.", expected_next_command: "show access-lists 101", expected_fix: "Add 'access-list 101 permit tcp any any eq 8080' above the implicit deny.", human_verdict: "Pending" },
  { id: "CASE016", fault_type: "Gateway", concept_tag: "Static gateway IP mismatch with SVI", osi_layer: "Layer 3", severity: "Low", symptom: "Static database server can reach local subnet hosts but cannot reach backup cloud repository.", topology_note: "Server has static IP 192.168.1.50/24; Gateway set to 192.168.1.254. Switch SVI is 192.168.1.1.", show_output: "show ip interface brief shows Vlan1 is 192.168.1.1; server gateway configured as 192.168.1.254.", expected_root_cause: "Server default gateway is configured as .254 while the router SVI is .1.", expected_next_command: "show ip interface brief | include Vlan1", expected_fix: "Change server static gateway configuration to 192.168.1.1.", human_verdict: "Pending" },
  { id: "CASE017", fault_type: "Routing", concept_tag: "Recursive routing failure on next hop", osi_layer: "Layer 3", severity: "High", symptom: "Static route configured for 10.200.0.0/16 is not appearing in the active routing table.", topology_note: "Route points to next hop 192.168.99.1 which is not directly connected or reachable.", show_output: "show ip route 10.200.0.0 shows '% Network not in table'; show run shows 'ip route 10.200.0.0 255.255.0.0 192.168.99.1'.", expected_root_cause: "Next hop IP 192.168.99.1 is unreachable, preventing the static route from being installed in the RIB.", expected_next_command: "show ip route 192.168.99.1", expected_fix: "Fix next hop IP to the directly connected interface IP (e.g. 192.168.12.2).", human_verdict: "Pending" },
  { id: "CASE018", fault_type: "Wireless", concept_tag: "WLC AP max client capacity reached", osi_layer: "Layer 2", severity: "Medium", symptom: "Lobby Wi-Fi users intermittently disconnect and cannot associate during all-hands meetings.", topology_note: "Lobby AP configured with max client association threshold of 25.", show_output: "show ap client summary shows 25 clients associated; client association request logs show status code 17 (association denied).", expected_root_cause: "The AP has reached its configured maximum client association limit.", expected_next_command: "show ap config general <AP-NAME>", expected_fix: "Increase max client associations per radio on WLC or add a second AP to share RF load.", human_verdict: "Pending" },
  { id: "CASE019", fault_type: "Trunk", concept_tag: "DTP dynamic auto negotiation mismatch", osi_layer: "Layer 2", severity: "Medium", symptom: "Link between SW1 Fa0/24 and SW2 Fa0/24 is operating as access port instead of trunk.", topology_note: "Both switch interfaces left on default 'switchport mode dynamic auto'.", show_output: "show interfaces fa0/24 switchport shows 'Administrative Mode: dynamic auto', 'Operational Mode: static access'.", expected_root_cause: "Dynamic Auto on both sides never negotiates a trunk link because neither side initiates DTP negotiation.", expected_next_command: "show interfaces fa0/24 switchport", expected_fix: "Configure 'switchport mode trunk' statically or set one side to 'dynamic desirable'.", human_verdict: "Pending" },
  { id: "CASE020", fault_type: "Trunk", concept_tag: "Missing trunk encapsulation dot1q", osi_layer: "Layer 2", severity: "Low", symptom: "Command 'switchport mode trunk' fails with syntax error on Catalyst 3560 switch.", topology_note: "Multilayer switch supports both ISL and 802.1Q encapsulation.", show_output: "% Command rejected: An interface whose trunk encapsulation is Auto can not be configured to trunk mode.", expected_root_cause: "Trunk encapsulation must be explicitly defined before enabling trunk mode on this hardware platform.", expected_next_command: "show interface fa0/1 capabilities", expected_fix: "Run 'switchport trunk encapsulation dot1q' prior to 'switchport mode trunk'.", human_verdict: "Pending" },
  { id: "CASE021", fault_type: "VLAN", concept_tag: "Voice VLAN auxiliary configuration missing", osi_layer: "Layer 2", severity: "Medium", symptom: "IP Phone boots and powers on via PoE, but PC connected to phone data port cannot obtain IP in data VLAN 10.", topology_note: "Cisco 7960 IP Phone connected to switch Fa0/5 with daisy-chained PC.", show_output: "show interfaces fa0/5 switchport shows 'Access Mode VLAN: 10', 'Voice VLAN: none'.", expected_root_cause: "Voice VLAN is not configured on switchport, causing phone and PC to fight for untagged VLAN 10 frames.", expected_next_command: "show interfaces fa0/5 switchport", expected_fix: "Configure 'switchport voice vlan 20' and 'switchport mode access' on Fa0/5.", human_verdict: "Pending" },
  { id: "CASE022", fault_type: "Gateway", concept_tag: "Missing IP default-gateway on Layer 2 switch", osi_layer: "Layer 3", severity: "Low", symptom: "Admin can ping SW2 from the local management subnet 192.168.1.0/24, but remote SSH from 10.0.0.0/24 fails.", topology_note: "SW2 is a Layer 2 switch with Management VLAN 1 IP 192.168.1.200/24.", show_output: "show ip default-gateway returns empty / not set; show run shows no 'ip default-gateway' command.", expected_root_cause: "SW2 lacks an 'ip default-gateway' setting, so return traffic to remote subnets cannot be routed.", expected_next_command: "show ip default-gateway", expected_fix: "Configure 'ip default-gateway 192.168.1.1' on SW2.", human_verdict: "Pending" },
  { id: "CASE023", fault_type: "DHCP", concept_tag: "DHCP snooping dropping offers from untrusted uplink", osi_layer: "Layer 3", severity: "High", symptom: "DHCP snooping enabled globally on SW1; clients in VLAN 10 fail to receive DHCP leases from DHCP server.", topology_note: "DHCP server resides upstream connected to GigabitEthernet0/1.", show_output: "show ip dhcp snooping shows Gi0/1 is untrusted; show ip dhcp snooping statistics shows DHCPOFFER packets dropped on Gi0/1.", expected_root_cause: "Gi0/1 is not configured as a trusted DHCP snooping port, so the switch drops all server offers.", expected_next_command: "show ip dhcp snooping", expected_fix: "Configure 'interface gi0/1' -> 'ip dhcp snooping trust' on SW1.", human_verdict: "Pending" },
  { id: "CASE024", fault_type: "DHCP", concept_tag: "Missing ip helper-address on router SVI", osi_layer: "Layer 3", severity: "High", symptom: "Clients on VLAN 30 broadcast for DHCP but receive no response from centralized DHCP server on VLAN 10.", topology_note: "Centralized DHCP server 192.168.10.100; VLAN 30 subnet 192.168.30.0/24 on router sub-interface Gi0/0.30.", show_output: "show run interface gi0/0.30 shows IP address 192.168.30.1 255.255.255.0, but no 'ip helper-address'.", expected_root_cause: "Router sub-interface is dropping Layer 3 DHCP broadcast discovers because DHCP relay is not configured.", expected_next_command: "show running-config interface gi0/0.30", expected_fix: "Add 'ip helper-address 192.168.10.100' under interface Gi0/0.30.", human_verdict: "Pending" },
  { id: "CASE025", fault_type: "DNS", concept_tag: "Stale hosts file override on client workstation", osi_layer: "Layer 7", severity: "Low", symptom: "Single client workstation connects to old decommissioned web server IP despite DNS updating globally.", topology_note: "DNS record for intra.corp points to 10.0.0.50. Client pings 10.0.0.12.", show_output: "nslookup intra.corp returns 10.0.0.50; type C:\\Windows\\System32\\drivers\\etc\\hosts shows '10.0.0.12 intra.corp'.", expected_root_cause: "Local static hosts file entry overrides global DNS server response.", expected_next_command: "nslookup intra.corp", expected_fix: "Remove the outdated static mapping line from C:\\Windows\\System32\\drivers\\etc\\hosts.", human_verdict: "Pending" },
  { id: "CASE026", fault_type: "Routing", concept_tag: "Floating static route administrative distance wrong", osi_layer: "Layer 3", severity: "Medium", symptom: "Backup 4G link is taking active traffic instead of primary fiber link, incurring high data costs.", topology_note: "Primary static route configured with AD 10; backup route configured with AD 5 (should be >10).", show_output: "show ip route shows 'S 0.0.0.0/0 [5/0] via 192.168.200.1' (4G interface) active in routing table.", expected_root_cause: "Backup route has a lower administrative distance than primary route, making it active by default.", expected_next_command: "show ip route 0.0.0.0", expected_fix: "Reconfigure backup route with AD higher than primary (e.g. 'ip route 0.0.0.0 0.0.0.0 192.168.200.1 20').", human_verdict: "Pending" },
  { id: "CASE027", fault_type: "ACL", concept_tag: "Inbound vs outbound ACL placement mismatch", osi_layer: "Layer 4", severity: "High", symptom: "ACL 105 designed to filter incoming internet traffic was applied as 'outbound' on WAN interface.", topology_note: "WAN interface Gi0/0 faces ISP; internal LAN on Gi0/1.", show_output: "show run interface gi0/0 shows 'ip access-group 105 out'; show access-lists 105 shows zero matches.", expected_root_cause: "ACL 105 applied in 'out' direction instead of 'in', failing to inspect inbound packets from WAN.", expected_next_command: "show running-config interface gi0/0", expected_fix: "Change interface binding to 'ip access-group 105 in'.", human_verdict: "Pending" },
  { id: "CASE028", fault_type: "NAT", concept_tag: "Incorrect NAT inside/outside interface designation", osi_layer: "Layer 3", severity: "High", symptom: "Internet-bound traffic from LAN fails; router logs translate inside-to-outside errors.", topology_note: "LAN interface Gi0/1; WAN interface Gi0/0.", show_output: "show run interface gi0/1 shows 'ip nat outside'; interface gi0/0 shows 'ip nat inside'.", expected_root_cause: "Interface NAT roles are inverted: LAN interface is set to outside, and WAN interface is set to inside.", expected_next_command: "show running-config | include ip nat inside|ip nat outside", expected_fix: "Configure 'ip nat inside' on LAN interface Gi0/1 and 'ip nat outside' on WAN interface Gi0/0.", human_verdict: "Pending" },
  { id: "CASE029", fault_type: "Wireless", concept_tag: "WPA2-PSK passphrase mismatch on AP", osi_layer: "Layer 2", severity: "Medium", symptom: "Laptops fail 4-way WPA handshake when connecting to production SSID 'CorpSecure'.", topology_note: "Radius/PSK profile updated on router AP; clients fail during authentication phase.", show_output: "show dot11 association shows client status 'AUTHENTICATING' followed by deauth code 15 (4-way handshake timeout).", expected_root_cause: "Pre-shared key configured on AP differs from passphrase distributed to client profiles.", expected_next_command: "show dot11 association", expected_fix: "Re-verify and sync the WPA2 pre-shared key on AP and client device profiles.", human_verdict: "Pending" },
  { id: "CASE030", fault_type: "Interface", concept_tag: "Speed and duplex mismatch causing high collision rate", osi_layer: "Layer 1", severity: "Medium", symptom: "Server file transfers are extremely slow (under 100 KB/s) with high packet loss across Gi0/2.", topology_note: "Switchport Gi0/2 hardcoded to 100/Full; connected Linux host left on auto-negotiation (fell back to half duplex).", show_output: "show interfaces gi0/2 shows '100Mb/s, Full-duplex', late collisions incrementing rapidly, CRC errors high.", expected_root_cause: "Duplex mismatch: switch is forced to Full-duplex while auto-negotiating host defaulted to Half-duplex.", expected_next_command: "show interfaces gi0/2", expected_fix: "Set switchport Gi0/2 to 'speed auto' and 'duplex auto' on both endpoints.", human_verdict: "Pending" }
];

const initialReviewQueue = [
  { "id": "CASE011", "fault_type": "VLAN", "osi_layer": "Layer 2", "severity": "High", "ai_root_cause_preview": "Trunk port Fa0/1 may be pruning VLAN 40 traffic between switches.", "ai_confidence": "Medium", "submitted": "2026-08-25 09:10 AM", "waiting_for": "2 days", "symptom": "PC in VLAN 40 cannot reach the remote server.", "expected_root_cause": "Trunk port Fa0/1 may be pruning VLAN 40 traffic between switches.", "show_output": "show interfaces trunk\nFa0/1 VLANs allowed and active: 1-39", "expected_next_command": "show interfaces trunk", "expected_fix": "interface fa0/1 -> switchport trunk allowed vlan add 40" },
  { "id": "CASE012", "fault_type": "DNS", "osi_layer": "Layer 7", "severity": "High", "ai_root_cause_preview": "DNS server IP configured on clients is unreachable from their subnet.", "ai_confidence": "High", "submitted": "2026-08-25 11:45 AM", "waiting_for": "1 day", "symptom": "Users cannot browse the internet by name, but ping to 8.8.8.8 works.", "expected_root_cause": "DNS server IP configured on clients is unreachable from their subnet.", "show_output": "ipconfig /all shows DNS server 192.168.100.1, but ping fails.", "expected_next_command": "ping 192.168.100.1", "expected_fix": "Update DHCP scope with correct DNS server IP or fix routing to 192.168.100.1" },
  { "id": "CASE013", "fault_type": "NAT", "osi_layer": "Layer 3", "severity": "Medium", "ai_root_cause_preview": "NAT overload ACL may be too narrow, excluding a subnet from translation.", "ai_confidence": "Medium", "submitted": "2026-08-26 08:30 AM", "waiting_for": "18 hours", "symptom": "New VLAN 50 cannot access the internet, but other VLANs can.", "expected_root_cause": "NAT overload ACL may be too narrow, excluding a subnet from translation.", "show_output": "show access-lists 1: permit 10.0.10.0, permit 10.0.20.0", "expected_next_command": "show access-lists 1", "expected_fix": "access-list 1 permit 10.0.50.0 0.0.0.255" },
  { "id": "CASE014", "fault_type": "Interface", "osi_layer": "Layer 1", "severity": "Medium", "ai_root_cause_preview": "Fa0/8 shows err-disabled state, likely from a port security violation.", "ai_confidence": "High", "submitted": "2026-08-26 01:15 PM", "waiting_for": "13 hours", "symptom": "Printer connected to Fa0/8 has lost network connectivity.", "expected_root_cause": "Fa0/8 shows err-disabled state, likely from a port security violation.", "show_output": "show interfaces status: Fa0/8 is err-disabled.", "expected_next_command": "show port-security interface fa0/8", "expected_fix": "interface fa0/8 -> shutdown -> no shutdown" },
  { "id": "CASE015", "fault_type": "ACL", "osi_layer": "Layer 4", "severity": "Low", "ai_root_cause_preview": "An ACL permit statement may be missing for a secondary application port.", "ai_confidence": "Low", "submitted": "2026-08-26 03:00 PM", "waiting_for": "10 hours", "symptom": "Main application works, but reporting module fails to load data.", "expected_root_cause": "An ACL permit statement may be missing for a secondary application port.", "show_output": "show access-lists 101: permit tcp any any eq 80", "expected_next_command": "show access-lists 101", "expected_fix": "access-list 101 permit tcp any any eq 8080" },
  { "id": "CASE016", "fault_type": "Gateway", "osi_layer": "Layer 3", "severity": "Low", "ai_root_cause_preview": "Static default gateway on a host may not match the actual SVI address.", "ai_confidence": "Medium", "submitted": "2026-08-26 04:20 PM", "waiting_for": "9 hours", "symptom": "Server can reach local subnet but cannot reach the internet.", "expected_root_cause": "Static default gateway on a host may not match the actual SVI address.", "show_output": "Server gateway: 192.168.1.254. SVI config: interface vlan 1, ip address 192.168.1.1", "expected_next_command": "show ip interface brief | include Vlan1", "expected_fix": "Change server static gateway from .254 to .1" }
];

const initialMyReviews = [
  { "id": "CASE001", "reviewer": "Arjun Desai", "fault_type": "VLAN", "osi_layer": "Layer 2", "severity": "High", "human_verdict": "Accepted", "human_note": "Matches root cause exactly. No correction needed.", "submitted": "2026-08-26 10:15 AM", "symptom": "PC1 in VLAN 30 can't reach PC2.", "ai_root_cause": "Fa0/4 assigned to VLAN 10.", "ai_confidence": "High", "expected_next_command": "show vlan brief", "expected_fix": "switchport access vlan 30", "show_output": "show vlan brief shows Fa0/4 in VLAN 10" },
  { "id": "CASE002", "reviewer": "Arjun Desai", "fault_type": "Gateway", "osi_layer": "Layer 3", "severity": "High", "human_verdict": "Edited", "human_note": "Corrected the fix target from SVI to the DHCP pool configuration.", "submitted": "2026-08-25 10:24 AM", "symptom": "Valid IP but cannot reach off-subnet.", "ai_root_cause": "DHCP pool has wrong gateway.", "ai_confidence": "Medium", "expected_next_command": "show run section dhcp", "expected_fix": "Correct default-router in DHCP pool", "show_output": "DHCP gateway: 192.168.20.2. SVI: 192.168.20.1" },
  { "id": "CASE003", "reviewer": "Arjun Desai", "fault_type": "DHCP", "osi_layer": "Layer 3", "severity": "Medium", "human_verdict": "Accepted", "human_note": "Correct on first pass. Expanded pool.", "submitted": "2026-08-25 09:41 AM", "symptom": "Clients not getting IP addresses.", "ai_root_cause": "DHCP pool exhausted.", "ai_confidence": "High", "expected_next_command": "show ip dhcp pool", "expected_fix": "Widen pool network statement", "show_output": "DHCP pool shows 0 leases remaining" },
  { "id": "CASE005", "reviewer": "Arjun Desai", "fault_type": "Routing", "osi_layer": "Layer 3", "severity": "High", "human_verdict": "Rejected", "human_note": "Lab uses static routing only, not OSPF. Corrected to a static route.", "submitted": "2026-08-24 03:12 PM", "symptom": "No route to branch office.", "ai_root_cause": "OSPF neighbor down.", "ai_confidence": "Low", "expected_next_command": "show ip route", "expected_fix": "ip route 172.16.5.0 255.255.255.0 10.0.0.2", "show_output": "Routing table empty for 172.16.5.0/24" },
  { "id": "CASE006", "reviewer": "Arjun Desai", "fault_type": "ACL", "osi_layer": "Layer 4", "severity": "High", "human_verdict": "Edited", "human_note": "AI blamed a server firewall with no evidence. Corrected to the actual ACL cause.", "submitted": "2026-08-23 09:41 AM", "symptom": "HTTPS access to server blocked.", "ai_root_cause": "Server firewall blocking port 443.", "ai_confidence": "Low", "expected_next_command": "show access-lists", "expected_fix": "permit tcp any host 10.0.0.5 eq 443", "show_output": "deny ip any any matches packet" },
  { "id": "CASE008", "reviewer": "Arjun Desai", "fault_type": "Wireless", "osi_layer": "Layer 2", "severity": "Medium", "human_verdict": "Rejected", "human_note": "AI's cause did not match the WLC evidence. Re-diagnosed to VLAN mapping mismatch.", "submitted": "2026-08-22 04:03 PM", "symptom": "Guest SSID reaching internal network.", "ai_root_cause": "AP offline.", "ai_confidence": "Low", "expected_next_command": "show running-config interface wireless", "expected_fix": "Remap SSID to VLAN 99", "show_output": "WLC interface shows Guest SSID on VLAN 10" },
  { "id": "CASE009", "reviewer": "Arjun Desai", "fault_type": "Interface", "osi_layer": "Layer 1", "severity": "High", "human_verdict": "Accepted", "human_note": "Correct on first pass. Applied no shutdown.", "submitted": "2026-08-22 11:08 AM", "symptom": "Interface flapping/down.", "ai_root_cause": "Admin shutdown.", "ai_confidence": "High", "expected_next_command": "show interfaces status", "expected_fix": "no shutdown", "show_output": "Fa0/6 status: disabled" }
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
    "note": "AI recommended dynamic routing contradicting lab's static-only design. Requires Senior review.",
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
      "Enter interface config mode for the affected port: 'interface <port>'",
      "Run 'switchport access vlan <correct-vlan-id>'",
      "Re-verify with 'show vlan brief' and test ping connectivity"
    ],
    "based_on": 5,
    "related_cases": ["CASE001", "CASE011", "CASE021"]
  },
  {
    "fault_type": "Gateway Mismatch",
    "category": "Gateway",
    "description": "Host's configured default gateway does not match the actual SVI or router interface IP.",
    "steps": [
      "Compare host gateway config against 'show ip interface brief' on the router/switch",
      "Correct the DHCP pool's default-router value, or fix static host config",
      "Verify connectivity with a ping to the corrected gateway address"
    ],
    "based_on": 4,
    "related_cases": ["CASE002", "CASE016", "CASE022"]
  },
  {
    "fault_type": "DHCP Pool Exhaustion & Relay",
    "category": "DHCP",
    "description": "No addresses remain in the DHCP pool or DHCP relay helper is missing on remote SVIs.",
    "steps": [
      "Run 'show ip dhcp pool <name>' to inspect lease usage",
      "Widen the pool's network statement or reduce excluded address scope",
      "On multi-VLAN networks, add 'ip helper-address <server-ip>' on the client SVI"
    ],
    "based_on": 4,
    "related_cases": ["CASE003", "CASE023", "CASE024"]
  },
  {
    "fault_type": "ACL Blocking Required Traffic",
    "category": "ACL",
    "description": "An access list permits some traffic but silently denies other required ports or protocols.",
    "steps": [
      "Run 'show access-lists' and check deny match counters",
      "Add a permit statement for the missing port/protocol above the implicit deny",
      "Re-test the blocked application traffic and confirm permit hits"
    ],
    "based_on": 4,
    "related_cases": ["CASE006", "CASE015", "CASE027"]
  },
  {
    "fault_type": "NAT Overload Missing",
    "category": "NAT",
    "description": "Internal hosts cannot reach external networks because outbound address translation was never configured.",
    "steps": [
      "Run 'show ip nat translations' to confirm translation activity",
      "Configure 'ip nat inside source list <acl> interface <outside> overload'",
      "Verify outbound connectivity and re-check translation table"
    ],
    "based_on": 3,
    "related_cases": ["CASE007", "CASE013", "CASE028"]
  },
  {
    "fault_type": "Trunk Native VLAN & Pruning Mismatch",
    "category": "Trunk",
    "description": "Native VLAN configured differently on trunk endpoints or required VLAN pruned from trunk allowed list.",
    "steps": [
      "Run 'show interfaces trunk' on both switches to compare native VLAN and allowed list",
      "Set matching native VLAN on both ends with 'switchport trunk native vlan <id>'",
      "Ensure all required VLANs are added via 'switchport trunk allowed vlan add <id>'"
    ],
    "based_on": 4,
    "related_cases": ["CASE010", "CASE019", "CASE020"]
  }
];

const sampleDiagnosticPresets = [
  {
    title: "VLAN Mismatch (CASE001)",
    symptom: "PC1 in VLAN 30 cannot ping PC2 also in VLAN 30, but can ping its own gateway.",
    show_output: "show vlan brief\nFa0/2 30 active\nFa0/4 10 active"
  },
  {
    title: "DHCP Pool Exhaustion (CASE003)",
    symptom: "New PCs joining VLAN 40 fail to get an IP address and show APIPA (169.254.x.x).",
    show_output: "show ip dhcp pool VLAN40\nPool VLAN40: 20 total addresses, 20 leased, 0 available\nCurrent index: 192.168.40.21"
  },
  {
    title: "Admin Down Interface (CASE009)",
    symptom: "PC connected to Fa0/6 on SW2 has no link light and gets no IP address.",
    show_output: "show interfaces Fa0/6 status\nPort: Fa0/6  Name: PC-Link  Status: disabled  Vlan: 10  Duplex: auto  Speed: auto\nshow running-config interface fa0/6\ninterface FastEthernet0/6\n shutdown"
  },
  {
    title: "Missing Static Route (CASE005)",
    symptom: "HQ router can ping its own subnets but cannot reach Branch office subnet 172.16.5.0/24.",
    show_output: "show ip route\nGateway of last resort is not set\nC 192.168.10.0/24 is directly connected, GigabitEthernet0/0\nC 192.168.20.0/24 is directly connected, GigabitEthernet0/1"
  },
  {
    title: "Native VLAN Mismatch (CASE010)",
    symptom: "Intermittent connectivity issues and CDP native VLAN mismatch warnings between two switches.",
    show_output: "show interfaces trunk\nSW1 Fa0/1 Mode: on, Encapsulation: 802.1q, Status: trunking, Native VLAN: 1\nSW2 Fa0/1 Mode: on, Encapsulation: 802.1q, Status: trunking, Native VLAN: 99\n%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on FastEthernet0/1 (1) with SW2 FastEthernet0/1 (99)."
  }
];

export default function Dashboard({ onBack }) {
  const [cases, setCases] = useState(defaultCases);
  const [reviewQueue, setReviewQueue] = useState(initialReviewQueue);
  const [myReviews, setMyReviews] = useState(initialMyReviews);
  const [escalations, setEscalations] = useState(initialEscalations);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  
  // Cases Master View Filters
  const [masterSearch, setMasterSearch] = useState('');
  const [masterFaultFilter, setMasterFaultFilter] = useState('All');
  const [masterSeverityFilter, setMasterSeverityFilter] = useState('All');
  const [masterOsiFilter, setMasterOsiFilter] = useState('All');

  // Overview Tab filter
  const [activeTab, setActiveTab] = useState('All');
  
  // My Reviews & Playbooks filters
  const [myReviewsFilter, setMyReviewsFilter] = useState('All');
  const [playbookFilter, setPlaybookFilter] = useState('All');
  const [playbookSearch, setPlaybookSearch] = useState('');
  const [expandedPlaybook, setExpandedPlaybook] = useState(null);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [currentView, setCurrentView] = useState('overview'); 

  // New Diagnosis state
  const [diagSymptom, setDiagSymptom] = useState(sampleDiagnosticPresets[0].symptom);
  const [diagShowOutput, setDiagShowOutput] = useState(sampleDiagnosticPresets[0].show_output);
  const [diagnosisRunning, setDiagnosisRunning] = useState(false);
  const [diagResult, setDiagResult] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState(null);
  
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("May 19 – May 25, 2025");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New case pending review in VLAN 30", time: "5 min ago", read: false },
    { id: 2, message: "AI diagnosis agreement rate increased", time: "1 hour ago", read: false },
    { id: 3, message: "Escalation resolved by Senior Reviewer", time: "2 hours ago", read: false }
  ]);
  
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  // Fetch initial data from backend if available, fallback smoothly
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/cases').then(res => res.json()),
      fetch('http://localhost:8000/api/stats').then(res => res.json())
    ]).then(([casesData, statsData]) => {
      if (casesData?.cases && casesData.cases.length > 0) {
        setCases(casesData.cases);
      }
      setStats(statsData);
      setIsBackendConnected(true);
      setLoading(false);
    }).catch(err => {
      console.warn("Backend API not reachable; running in interactive offline demo mode:", err.message);
      setIsBackendConnected(false);
      setLoading(false);
    });
  }, []);

  // Compute stats dynamically if backend is offline or after state changes
  const computedStats = useMemo(() => {
    const total = cases.length;
    const verdicts = { Accepted: 0, Edited: 0, Rejected: 0, Pending: 0 };
    cases.forEach(c => {
      if (c.human_verdict === 'Accepted') verdicts.Accepted++;
      else if (c.human_verdict === 'Edited') verdicts.Edited++;
      else if (c.human_verdict === 'Rejected') verdicts.Rejected++;
      else verdicts.Pending++;
    });
    return {
      total_cases: stats?.total_cases || total,
      verdicts: stats?.verdicts || verdicts
    };
  }, [cases, stats]);

  if (loading) {
    return <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center text-[#07182B] font-medium">Loading NetSage AI Console...</div>;
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
          <p className="text-slate-500 text-center mb-8">Set up your reviewer identity to begin session diagnostics.</p>
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
                  <p className="text-xs text-slate-500 leading-tight">Diagnose cases, review evidence, submit decisions</p>
                </button>
                <button onClick={() => setSetupRole('Senior Reviewer')} className={`p-4 rounded-xl text-left border-2 transition-all ${setupRole === 'Senior Reviewer' ? 'border-[#049FD9] bg-[#049FD9]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <h4 className={`font-bold text-sm mb-1 ${setupRole === 'Senior Reviewer' ? 'text-[#049FD9]' : 'text-[#07182B]'}`}>Senior Reviewer</h4>
                  <p className="text-xs text-slate-500 leading-tight">All permissions + resolve escalated cases</p>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => {
            if (!setupName.trim()) { setShowNameError(true); return; }
            const initials = setupName.trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || 'U';
            const user = { name: setupName.trim(), initials, role: setupRole || 'Junior Engineer' };
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
  const verdictData = computedStats.verdicts ? Object.keys(computedStats.verdicts).filter(k => k !== 'Pending').map(key => ({
    name: key,
    value: computedStats.verdicts[key]
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

  // Cases filtered for Overview tab
  const filteredOverviewCases = activeTab === 'All' ? cases : cases.filter(c => c.fault_type === activeTab);

  // Master Cases View Filtering
  const filteredMasterCases = cases.filter(c => {
    const matchesSearch = masterSearch === '' ||
      c.id.toLowerCase().includes(masterSearch.toLowerCase()) ||
      c.symptom.toLowerCase().includes(masterSearch.toLowerCase()) ||
      c.show_output.toLowerCase().includes(masterSearch.toLowerCase()) ||
      c.expected_root_cause.toLowerCase().includes(masterSearch.toLowerCase());
    
    const matchesFault = masterFaultFilter === 'All' || c.fault_type === masterFaultFilter;
    const matchesSeverity = masterSeverityFilter === 'All' || c.severity === masterSeverityFilter;
    const matchesOsi = masterOsiFilter === 'All' || c.osi_layer === masterOsiFilter;

    return matchesSearch && matchesFault && matchesSeverity && matchesOsi;
  });
  
  // Data for Responsible AI Log
  const correctedCases = cases.filter(c => c.human_verdict === 'Edited' || c.human_verdict === 'Rejected');
  const totalCorrections = correctedCases.length;
  const totalEdited = correctedCases.filter(c => c.human_verdict === 'Edited').length;
  const totalRejected = correctedCases.filter(c => c.human_verdict === 'Rejected').length;

  // Data for My Reviews
  const sessionMyReviews = myReviews.filter(c => !c.reviewer || c.reviewer === currentUser.name || c.reviewer === "Arjun Desai");

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
    const hash = (id || 'CASE001').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 70 + (hash % 26);
  };

  const handleRunDiagnosis = async () => {
    setDiagnosisRunning(true);
    setDiagResult(null);

    try {
      // Attempt to invoke backend /api/diagnose
      const res = await fetch('http://localhost:8000/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom: diagSymptom,
          show_output: diagShowOutput,
          topology_note: "Live interactive diagnostic execution"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDiagResult(data);
      } else {
        throw new Error("Diagnosis API returned non-200");
      }
    } catch {
      // Realistic offline heuristic fallback matching prompt template
      setTimeout(() => {
        let root = "Switchport configuration mismatch detected from provided output.";
        let layer = "Layer 2";
        let conf = "High";
        let nextCmd = "show vlan brief";
        let fix = "Verify port-to-VLAN assignment with 'switchport access vlan <id>'";

        if (diagSymptom.toLowerCase().includes("dhcp") || diagShowOutput.toLowerCase().includes("dhcp")) {
          root = "DHCP pool exhausted or relay helper missing on client SVI.";
          layer = "Layer 3";
          conf = "High";
          nextCmd = "show ip dhcp pool";
          fix = "Widen DHCP pool network statement or add 'ip helper-address <server-ip>'";
        } else if (diagSymptom.toLowerCase().includes("route") || diagShowOutput.toLowerCase().includes("route")) {
          root = "No static or dynamic route exists toward the destination subnet.";
          layer = "Layer 3";
          conf = "High";
          nextCmd = "show ip route";
          fix = "Add 'ip route <subnet> <mask> <next-hop-ip>' on the router";
        } else if (diagShowOutput.toLowerCase().includes("err-disabled") || diagShowOutput.toLowerCase().includes("disabled")) {
          root = "Switchport is in shutdown or err-disabled state from port-security.";
          layer = "Layer 1";
          conf = "High";
          nextCmd = "show interfaces status";
          fix = "interface <port> -> shutdown -> no shutdown";
        }

        setDiagResult({
          root_cause: root,
          osi_layer: layer,
          confidence: conf,
          evidence: diagShowOutput.split('\n')[0] || "Command output matches known fault pattern",
          next_command: nextCmd,
          fix_steps: fix
        });
      }, 700);
    } finally {
      setTimeout(() => setDiagnosisRunning(false), 700);
    }
  };

  const handleSendToReviewQueue = () => {
    if (!diagResult) return;
    const newId = `CASE0${cases.length + 1}`;
    const newCase = {
      id: newId,
      fault_type: diagResult.osi_layer === 'Layer 2' ? 'VLAN' : diagResult.osi_layer === 'Layer 1' ? 'Interface' : 'Routing',
      osi_layer: diagResult.osi_layer,
      severity: "High",
      ai_root_cause_preview: diagResult.root_cause,
      ai_confidence: diagResult.confidence,
      submitted: new Date().toLocaleString(),
      waiting_for: "Just now",
      symptom: diagSymptom,
      expected_root_cause: diagResult.root_cause,
      show_output: diagShowOutput,
      expected_next_command: diagResult.next_command,
      expected_fix: diagResult.fix_steps
    };

    setReviewQueue(prev => [newCase, ...prev]);
    setDiagResult(null);
    showToast(`Diagnosis sent to Review Queue as ${newId}!`);
  };

  const handleSaveReview = async () => {
    let reviewedCase = null;
    if (currentView === 'review_queue' && selectedCase) {
      setReviewQueue(prev => prev.filter(c => c.id !== selectedCase.id));
      reviewedCase = selectedCase;
    } else if (currentView === 'escalations' && selectedCase) {
      setEscalations(prev => prev.filter(c => c.id !== selectedCase.id));
      reviewedCase = selectedCase;
    } else if (selectedCase) {
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
      
      setMyReviews(prev => [completedReview, ...prev.filter(r => r.id !== reviewedCase.id)]);
      
      // Update the main cases state as well
      setCases(prev => prev.map(c => c.id === reviewedCase.id ? { ...c, human_verdict: modalVerdict, human_note: modalNote } : c));

      // Attempt to persist review to backend
      try {
        await fetch('http://localhost:8000/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: reviewedCase.id,
            human_verdict: modalVerdict,
            human_note: modalNote,
            reviewer: currentUser.name,
            ai_root_cause: reviewedCase.ai_root_cause || reviewedCase.expected_root_cause,
            ai_confidence: reviewedCase.ai_confidence || "High",
            ai_evidence: reviewedCase.ai_evidence || reviewedCase.show_output
          })
        });
      } catch (err) {
        console.warn("Could not persist review to backend:", err.message);
      }
      
      showToast(`Saved ${modalVerdict} review for ${reviewedCase.id}!`);
    }
    
    setSelectedCase(null);
  };

  const handleCaseClick = (caseId) => {
    const allCases = [...cases, ...reviewQueue, ...myReviews, ...escalations];
    let foundCase = allCases.find(c => c.id === caseId);
    if (!foundCase) {
      foundCase = {
        id: caseId,
        fault_type: "Network Fault",
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

  const handleExportDownload = (type) => {
    if (type === 'cases_csv') {
      const headers = ["case_id", "fault_type", "concept_tag", "osi_layer", "severity", "symptom", "topology_note", "show_output", "expected_root_cause", "expected_next_command", "expected_fix"];
      const rows = cases.map(c => [c.id, c.fault_type, c.concept_tag || '', c.osi_layer, c.severity, `"${(c.symptom||'').replace(/"/g, '""')}"`, `"${(c.topology_note||'').replace(/"/g, '""')}"`, `"${(c.show_output||'').replace(/"/g, '""')}"`, `"${(c.expected_root_cause||'').replace(/"/g, '""')}"`, `"${(c.expected_next_command||'').replace(/"/g, '""')}"`, `"${(c.expected_fix||'').replace(/"/g, '""')}"`].join(','));
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "NetSage_Cases.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded cases.csv successfully!");
    } else if (type === 'reviews_csv') {
      const headers = ["case_id", "fault_type", "human_verdict", "reviewer", "human_note", "submitted"];
      const rows = myReviews.map(r => [r.id, r.fault_type, r.human_verdict, `"${r.reviewer}"`, `"${(r.human_note||'').replace(/"/g, '""')}"`, `"${r.submitted}"`].join(','));
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "NetSage_Human_Review_Log.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded Human Review Log CSV!");
    } else if (type === 'rule_checker_json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ruleCheckerIssues, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", "NetSage_Rule_Checker_Findings.json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded Rule Checker JSON!");
    } else {
      const fullPackage = {
        meta: { project: "NetSage AI", version: "1.1.0", exported_at: new Date().toISOString() },
        cases: cases,
        human_reviews: myReviews,
        rule_checker_findings: ruleCheckerIssues,
        playbooks: initialPlaybooks
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullPackage, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", "NetSage_Full_Submission_Package.json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exported Full Submission Package!");
    }
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

  const isReadOnlyModal = currentView === 'my_reviews' || currentView === 'rule_checker' || currentView === 'playbooks';
  const isModalAllowed = ['overview', 'cases', 'review_queue', 'my_reviews', 'escalations', 'rule_checker', 'playbooks'].includes(currentView);

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex font-sans text-[#07182B] overflow-hidden relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 bg-[#07182B] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700"
          >
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 relative z-20 transition-all duration-300`}>
        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} cursor-pointer`} onClick={onBack}>
          <Network className="text-[#049FD9]" size={28} />
          {!isSidebarCollapsed && <span className="font-bold text-xl text-[#07182B] tracking-tight">NetSage AI</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-scroll">
          <div>
            <div 
              onClick={() => setCurrentView('overview')} 
              className={`rounded-lg p-2.5 flex items-center font-medium mb-1 cursor-pointer transition-colors ${
                currentView === 'overview' ? 'bg-[#049FD9]/10 text-[#049FD9]' : 'text-slate-600 hover:bg-slate-50'
              } ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
              title={isSidebarCollapsed ? "Overview" : undefined}
            >
              <LayoutGrid size={18} />
              {!isSidebarCollapsed && <span>Overview</span>}
            </div>
            
            <div className="space-y-1 mt-4">
              {!isSidebarCollapsed && <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Workspace</h4>}
              <NavItem icon={Layers} label="Cases Master" badge={cases.length} isActive={currentView === 'cases'} onClick={() => setCurrentView('cases')} isCollapsed={isSidebarCollapsed} />
              <NavItem icon={Sparkles} label="New Diagnosis" isActive={currentView === 'new_diagnosis'} onClick={() => setCurrentView('new_diagnosis')} isCollapsed={isSidebarCollapsed} />
              <NavItem icon={CheckSquare} label="Review Queue" badge={reviewQueue.length} isActive={currentView === 'review_queue'} onClick={() => setCurrentView('review_queue')} isCollapsed={isSidebarCollapsed} />
              <NavItem icon={Clock} label="My Reviews" isActive={currentView === 'my_reviews'} onClick={() => setCurrentView('my_reviews')} isCollapsed={isSidebarCollapsed} />
              <NavItem icon={AlertTriangle} label="Escalations" badge={escalations.length} badgeColor="bg-red-500" isActive={currentView === 'escalations'} onClick={() => setCurrentView('escalations')} isCollapsed={isSidebarCollapsed} />
            </div>
          </div>

          <div className="space-y-1">
            {!isSidebarCollapsed && <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Analytics</h4>}
            <NavItem icon={FileDown} label="Reports & Export" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={ShieldAlert} label="Responsible AI Log" isActive={currentView === 'responsible_ai_log'} onClick={() => setCurrentView('responsible_ai_log')} isCollapsed={isSidebarCollapsed} />
          </div>

          <div className="space-y-1">
            {!isSidebarCollapsed && <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Knowledge</h4>}
            <NavItem icon={BookOpen} label="Playbooks" isActive={currentView === 'playbooks'} onClick={() => setCurrentView('playbooks')} isCollapsed={isSidebarCollapsed} />
            <NavItem icon={Code} label="Rule Checker" isActive={currentView === 'rule_checker'} onClick={() => setCurrentView('rule_checker')} isCollapsed={isSidebarCollapsed} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className={`flex items-center text-slate-500 hover:text-slate-800 cursor-pointer p-2 rounded-lg hover:bg-slate-50 ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isSidebarCollapsed && <span className="text-sm font-medium">Collapse</span>}
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
               currentView === 'cases' ? 'Cases Master Library' :
               currentView === 'new_diagnosis' ? 'New Diagnosis' : 
               currentView === 'reports' ? 'Reports & Export Center' :
               currentView === 'responsible_ai_log' ? 'Responsible AI Log' :
               currentView === 'review_queue' ? 'Review Queue' :
               currentView === 'my_reviews' ? 'My Reviews' :
               currentView === 'escalations' ? 'Escalations' :
               currentView === 'rule_checker' ? 'Deterministic Rule Checker' :
               currentView === 'playbooks' ? 'Troubleshooting Playbooks' :
               currentView.replace(/_/g, ' ')}
            </h1>
            <p className="text-xs text-slate-500">
              {currentView === 'overview' ? 'Review AI diagnoses, validate evidence, and approve or edit fixes.' : 
               currentView === 'cases' ? 'Complete dataset of 30 Cisco lab troubleshooting cases across all fault domains.' :
               currentView === 'new_diagnosis' ? 'Describe the fault and provide evidence to get an AI-suggested root cause.' :
               currentView === 'reports' ? 'Export and download deliverables (CSV, JSON, Human Review Log, Findings).' :
               currentView === 'responsible_ai_log' ? "Cases where a human reviewer corrected or rejected the AI's diagnosis." :
               currentView === 'review_queue' ? "Cases awaiting human review before any fix is approved." :
               currentView === 'my_reviews' ? "Cases you have already reviewed and their recorded outcomes." :
               currentView === 'escalations' ? "Cases flagged for senior review due to low confidence or complexity." :
               currentView === 'rule_checker' ? "Deterministic config checks independent of AI reasoning." :
               currentView === 'playbooks' ? "Proven fix procedures by fault type, drawn from confirmed diagnoses." :
               ""}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Human Review Required
            </div>

            <div className="h-6 w-px bg-slate-200"></div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsHelpOpen(false);
                  setIsProfileDropdownOpen(false);
                }}
                className="relative text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#049FD9] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-4 text-left"
                  >
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                      <span className="font-bold text-sm text-[#07182B]">Notifications</span>
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                          showToast("All notifications marked as read.");
                        }}
                        className="text-xs text-[#049FD9] hover:underline font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-3">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-2 rounded-lg text-xs transition-colors hover:bg-slate-50 ${n.read ? 'text-slate-500' : 'bg-blue-50/50 text-[#07182B] font-medium'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <span>{n.message}</span>
                            {!n.read && <div className="w-1.5 h-1.5 bg-[#049FD9] rounded-full shrink-0 mt-1"></div>}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Help Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsHelpOpen(!isHelpOpen);
                  setIsNotificationsOpen(false);
                  setIsProfileDropdownOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <HelpCircle size={20} />
              </button>
              <AnimatePresence>
                {isHelpOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 p-4 text-left"
                  >
                    <h4 className="font-bold text-sm text-[#07182B] mb-2 border-b border-slate-100 pb-2">NetSage AI Help</h4>
                    <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <p><strong>Overview:</strong> High-level system statistics, reviewer metrics, and quick filter logs.</p>
                      <p><strong>Cases Master:</strong> The master library of 30 common network faults and symptoms.</p>
                      <p><strong>New Diagnosis:</strong> Paste Cisco show command outputs to run a real-time diagnosis.</p>
                      <p><strong>Review Queue:</strong> Accept, edit, or reject AI diagnoses to commit them to playbooks.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Reviewer</p>
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
                          Switch to a different user session?
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
          
          {/* ================= OVERVIEW VIEW ================= */}
          {currentView === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    Human Review Required
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    isBackendConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                    <span>{isBackendConnected ? 'API Connected' : 'Local Demo Mode'}</span>
                  </div>
                </div>
                
                <div className="flex gap-3 relative">
                  {/* Date range picker */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Calendar size={16} /> {selectedDateRange} <ChevronRight size={14} className="rotate-90 ml-2" />
                    </button>
                    <AnimatePresence>
                      {isDateDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-2 text-left"
                        >
                          {["May 19 – May 25, 2025", "May 26 – Jun 01, 2025", "Jun 02 – Jun 08, 2025"].map(d => (
                            <button
                              key={d}
                              onClick={() => {
                                setSelectedDateRange(d);
                                setIsDateDropdownOpen(false);
                                showToast(`Switched date filter to ${d}`);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                            >
                              {d}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Export button */}
                  <button 
                    onClick={() => {
                      handleExportDownload('cases_csv');
                      showToast("Exporting data as CSV...");
                    }} 
                    className="flex items-center gap-2 bg-[#049FD9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0385B5] transition-colors shadow-sm cursor-pointer"
                  >
                    <Download size={16} /> Export
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={FileText} iconColor="text-[#049FD9]" iconBg="bg-[#049FD9]/10" title="Total Cases" value={computedStats.total_cases || 30} unit="cases" trend="up" trendValue="100% covered" />
                <MetricCard icon={CheckSquare} iconColor="text-emerald-500" iconBg="bg-emerald-50" title="AI-Human Agreement" value={`${computedStats?.verdicts?.Accepted ? Math.round((computedStats.verdicts.Accepted / (computedStats.total_cases || 30)) * 100) : 60}%`} trend="up" trendValue="high precision" />
                <MetricCard icon={AlertTriangle} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="AI Corrected" value={totalCorrections} unit="cases" trend="down" trendValue="documented" />
                <MetricCard icon={AlertTriangle} iconColor="text-red-500" iconBg="bg-red-50" title="High Severity" value={severityCounts.High} unit="cases" trend="up" trendValue="prioritized" trendColor="text-red-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-[#07182B]">Reviewer Verdicts</h3>
                    <span className="text-xs font-semibold text-slate-400">Responsible AI Feedback</span>
                  </div>
                  <div className="flex items-center h-48">
                    <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={verdictData.length > 0 ? verdictData : [{ name: 'Accepted', value: 6 }, { name: 'Edited', value: 2 }, { name: 'Rejected', value: 2 }]} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                            {(verdictData.length > 0 ? verdictData : [{ name: 'Accepted' }, { name: 'Edited' }, { name: 'Rejected' }]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#3b82f6'} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-[#07182B]">{computedStats.total_cases}</span>
                        <span className="text-xs text-slate-500">Total</span>
                      </div>
                    </div>
                    <div className="w-1/2 space-y-3">
                      {(verdictData.length > 0 ? verdictData : [{ name: 'Accepted', value: 6 }, { name: 'Edited', value: 2 }, { name: 'Rejected', value: 2 }]).map((v, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[v.name] || '#3b82f6' }}></div>
                            <span className="text-sm text-slate-600">{v.name}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#07182B]">{v.value} <span className="text-slate-400 font-normal text-xs">({Math.round((v.value/computedStats.total_cases)*100)}%)</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-[#07182B]">Cases by Severity</h3>
                    <span className="text-xs font-semibold text-slate-400">Triage Distribution</span>
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

              {/* Case Log Table on Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {['All', 'VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Interface', 'Trunk'].map(tab => (
                      <button 
                        key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === tab ? 'bg-[#049FD9] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >{tab}</button>
                    ))}
                  </div>
                  <button onClick={() => setCurrentView('cases')} className="text-xs font-bold text-[#049FD9] hover:underline flex items-center gap-1">
                    View Master Dataset ({cases.length}) <ArrowRight size={14} />
                  </button>
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
                        {filteredOverviewCases.slice(0, 8).map((c, idx) => (
                          <motion.tr 
                            key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: idx * 0.04 }}
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

          {/* ================= CASES MASTER VIEW ================= */}
          {currentView === 'cases' && (
            <motion.div key="cases" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search cases by ID, symptom, or command..."
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                    <select 
                      value={masterSeverityFilter} 
                      onChange={(e) => setMasterSeverityFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 font-medium"
                    >
                      <option value="All">All Severities</option>
                      <option value="High">High Severity</option>
                      <option value="Medium">Medium Severity</option>
                      <option value="Low">Low Severity</option>
                    </select>

                    <select 
                      value={masterOsiFilter} 
                      onChange={(e) => setMasterOsiFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 font-medium"
                    >
                      <option value="All">All OSI Layers</option>
                      <option value="Layer 1">Layer 1 (Physical)</option>
                      <option value="Layer 2">Layer 2 (Data Link)</option>
                      <option value="Layer 3">Layer 3 (Network)</option>
                      <option value="Layer 4">Layer 4 (Transport)</option>
                      <option value="Layer 7">Layer 7 (Application)</option>
                    </select>

                    <button onClick={() => handleExportDownload('cases_csv')} className="flex items-center gap-2 bg-[#049FD9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0385B5] transition-colors shadow-sm">
                      <Download size={16} /> Export CSV
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pt-2 border-t border-slate-100">
                  {['All', 'VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Interface', 'Trunk'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setMasterFaultFilter(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                        masterFaultFilter === tag ? 'bg-[#049FD9] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold bg-slate-50/50">
                        <th className="p-4 pl-6">Case ID</th>
                        <th className="p-4">Fault Domain</th>
                        <th className="p-4">OSI Layer</th>
                        <th className="p-4">Severity</th>
                        <th className="p-4 w-1/3">Symptom Description</th>
                        <th className="p-4">Next Command</th>
                        <th className="p-4 text-center">Review Status</th>
                        <th className="p-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredMasterCases.map((c) => (
                        <tr 
                          key={c.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCase(c)}
                        >
                          <td className="p-4 pl-6 font-semibold text-[#049FD9]">{c.id}</td>
                          <td className="p-4 text-[#07182B] font-medium">{c.fault_type}</td>
                          <td className="p-4"><span className="text-[#049FD9] bg-[#049FD9]/10 px-2.5 py-1 rounded-md text-xs font-bold">{c.osi_layer}</span></td>
                          <td className="p-4 flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${c.severity === 'High' ? 'bg-red-500' : c.severity === 'Medium' ? 'bg-[#F2A93B]' : 'bg-[#049FD9]'}`}></div>
                            <span className="text-slate-600 font-medium">{c.severity}</span>
                          </td>
                          <td className="p-4 text-slate-600 truncate max-w-sm">{c.symptom}</td>
                          <td className="p-4 font-mono text-xs text-slate-500 bg-slate-50/50 rounded">{c.expected_next_command}</td>
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
                          <td className="p-4 text-right pr-6">
                            <button className="text-xs font-bold text-[#049FD9] hover:text-[#0385B5] bg-[#049FD9]/5 px-3 py-1.5 rounded-lg">Inspect</button>
                          </td>
                        </tr>
                      ))}
                      {filteredMasterCases.length === 0 && (
                        <tr>
                          <td colSpan="8" className="text-center py-12 text-slate-500">
                            No cases matched your filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= REPORTS & EXPORT CENTER ================= */}
          {currentView === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl mx-auto space-y-8">
              <div className="bg-gradient-to-r from-[#049FD9]/10 via-blue-50 to-indigo-50 p-8 rounded-2xl border border-[#049FD9]/20 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#07182B] mb-2">NetSage AI Deliverables Center</h2>
                  <p className="text-slate-600 text-sm max-w-xl">
                    Generate and download verified submission artifacts including the 30-case dataset, human oversight logs, deterministic rule checker output, and diagnostic traces.
                  </p>
                </div>
                <button 
                  onClick={() => handleExportDownload('full_package')}
                  className="bg-[#049FD9] hover:bg-[#0385B5] text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#049FD9]/30 transition-all shrink-0"
                >
                  <FileDown size={20} /> Export Full Package (JSON/Bundle)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                      <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-[#07182B] text-lg mb-1">cases.csv Dataset</h3>
                    <p className="text-xs text-slate-500 mb-6">
                      30 structured Cisco lab cases with symptoms, topology notes, show commands, root causes, and fixes.
                    </p>
                  </div>
                  <button onClick={() => handleExportDownload('cases_csv')} className="w-full border-2 border-[#049FD9] text-[#049FD9] hover:bg-[#049FD9]/5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Download size={16} /> Download cases.csv
                  </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                      <UserCheck size={24} />
                    </div>
                    <h3 className="font-bold text-[#07182B] text-lg mb-1">Human Review Log</h3>
                    <p className="text-xs text-slate-500 mb-6">
                      Documented log of Accepted, Edited, and Rejected decisions with reviewer timestamps and notes.
                    </p>
                  </div>
                  <button onClick={() => handleExportDownload('reviews_csv')} className="w-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Download size={16} /> Download Reviews CSV
                  </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                      <Code2 size={24} />
                    </div>
                    <h3 className="font-bold text-[#07182B] text-lg mb-1">Rule Checker Findings</h3>
                    <p className="text-xs text-slate-500 mb-6">
                      Deterministic config verification findings covering duplicate IPs, mask mismatches, and down interfaces.
                    </p>
                  </div>
                  <button onClick={() => handleExportDownload('rule_checker_json')} className="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-50 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <Download size={16} /> Download Rules JSON
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= NEW DIAGNOSIS VIEW ================= */}
          {currentView === 'new_diagnosis' && (
            <motion.div key="new_diagnosis" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[#07182B]">Fault Input & Evidence</h3>
                  {/* Preset quick-load buttons */}
                  <select 
                    onChange={(e) => {
                      const preset = sampleDiagnosticPresets[parseInt(e.target.value)];
                      if (preset) {
                        setDiagSymptom(preset.symptom);
                        setDiagShowOutput(preset.show_output);
                        setDiagResult(null);
                      }
                    }}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
                  >
                    <option value="">Load Sample Cisco Lab Case...</option>
                    {sampleDiagnosticPresets.map((p, idx) => (
                      <option key={idx} value={idx}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Symptom Description</label>
                    <input 
                      type="text" 
                      value={diagSymptom} 
                      onChange={(e) => setDiagSymptom(e.target.value)}
                      placeholder="e.g. PC in VLAN 30 cannot reach server..."
                      className="w-full p-3 rounded-lg border border-slate-200 text-[#07182B] text-sm focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Show-Command Output (Pasted Text)</label>
                    <textarea 
                      rows={5} 
                      value={diagShowOutput}
                      onChange={(e) => setDiagShowOutput(e.target.value)}
                      placeholder="Paste 'show vlan brief', 'show ip route', 'show interfaces'..."
                      className="w-full p-3 rounded-lg border border-slate-200 text-[#07182B] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#049FD9]/20 focus:border-[#049FD9] resize-none" 
                    />
                  </div>
                  <div className="flex items-center my-2"><div className="flex-1 border-t border-slate-200"></div><span className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR ATTACH SCREENSHOT</span><div className="flex-1 border-t border-slate-200"></div></div>
                  <div>
                    <div 
                      onClick={() => {
                        setUploadedImageName("cisco_terminal_capture_01.png");
                        showToast("Loaded screenshot context!");
                      }}
                      className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-[#049FD9]/40 transition-all cursor-pointer group"
                    >
                      <UploadCloud className="text-[#049FD9] mb-2 group-hover:scale-110 transition-transform" size={28} />
                      <p className="text-xs text-slate-600 font-medium">
                        {uploadedImageName ? `Attached: ${uploadedImageName}` : "Click to attach terminal or Packet Tracer screenshot"}
                      </p>
                    </div>
                  </div>
                </div>

                <button onClick={handleRunDiagnosis} disabled={diagnosisRunning || !diagSymptom} className="w-full mt-6 bg-[#049FD9] hover:bg-[#0385B5] text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                  {diagnosisRunning ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Sparkles size={18} /></motion.div> : <Sparkles size={18} />}
                  {diagnosisRunning ? 'Analyzing Evidence...' : 'Run Live Diagnosis'}
                </button>
              </div>

              {/* Diagnosis Results Card */}
              <div className="h-full">
                {diagResult ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <Check size={14} /> AI Diagnosis Generated
                        </span>
                        <span className="text-xs font-mono text-slate-400">Strict Schema: diagnose_prompt.md</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Identified Root Cause</h4>
                        <p className="text-[#07182B] font-medium text-lg">{diagResult.root_cause}</p>
                      </div>
                      <div className="flex gap-8">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">OSI Layer</h4>
                          <span className="px-3 py-1 bg-[#049FD9]/10 text-[#049FD9] rounded-md text-sm font-bold border border-[#049FD9]/20">{diagResult.osi_layer}</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confidence</h4>
                          <span className={`px-3 py-1 rounded-md text-sm font-bold ${diagResult.confidence === 'High' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {diagResult.confidence}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Evidence Cited</h4>
                        <div className="bg-[#049FD9]/5 p-3.5 rounded-lg border border-[#049FD9]/20">
                          <code className="text-xs font-mono text-[#07182B] block whitespace-pre-wrap">{diagResult.evidence}</code>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Next Command to Confirm</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <code className="text-xs font-mono text-[#07182B]">{diagResult.next_command}</code>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Suggested Fix</h4>
                        <div className="bg-[#049FD9]/10 p-3.5 rounded-lg border border-[#049FD9]/20">
                          <code className="text-xs font-mono text-[#07182B]">{diagResult.fix_steps}</code>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100">
                      <div className="bg-amber-50/80 rounded-lg p-3 flex items-center gap-3 mb-4 border border-amber-100">
                        <Info size={16} className="text-amber-600 shrink-0" />
                        <span className="text-xs text-amber-900 font-medium">Human review required before applying this fix to any device.</span>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={handleSendToReviewQueue} className="flex-1 bg-[#049FD9] hover:bg-[#0385B5] text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-sm">
                          Send to Review Queue
                        </button>
                        <button onClick={() => setDiagResult(null)} className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors">
                          Discard
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200 border-dashed h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      <Sparkles className="text-slate-300" size={24} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-600 mb-1">Ready for Diagnostic Execution</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Enter the symptoms and show command output on the left to run an evidence-based diagnosis.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= REVIEW QUEUE VIEW ================= */}
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
                      <div className="flex-1 px-4 min-w-0"><div className="flex items-center gap-2 text-sm italic text-slate-500 truncate"><Sparkles size={14} className="text-[#049FD9] shrink-0" /><span className="truncate">{c.ai_root_cause_preview || c.expected_root_cause}</span></div></div>
                      <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col text-right"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Confidence</span><span className={`text-sm font-semibold ${c.ai_confidence === 'High' ? 'text-emerald-600' : c.ai_confidence === 'Medium' ? 'text-amber-500' : 'text-slate-500'}`}>{c.ai_confidence}</span></div>
                          <div className="flex flex-col text-right w-24"><span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Submitted</span><span className="text-sm text-slate-600 truncate">{c.submitted ? c.submitted.split(' ')[0] : 'Today'}</span></div>
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

          {/* ================= RESPONSIBLE AI LOG ================= */}
          {currentView === 'responsible_ai_log' && (
            <motion.div key="responsible_ai_log" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard icon={ShieldAlert} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Total Corrections" value={totalCorrections} trend="up" trendValue="documented" />
                <MetricCard icon={Edit2} iconColor="text-[#F2A93B]" iconBg="bg-[#F2A93B]/10" title="Edited Cases" value={totalEdited} trend="up" trendValue="refined fix" />
                <MetricCard icon={X} iconColor="text-red-500" iconBg="bg-red-50" title="Rejected Cases" value={totalRejected} trend="down" trendValue="overruled" trendColor="text-red-500" />
              </div>
              <div className="space-y-6">
                {correctedCases.map((c, idx) => {
                  const isEdited = c.human_verdict === 'Edited';
                  const statusColor = isEdited ? 'amber' : 'red';
                  
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                          <div className="flex-1 bg-slate-50/50 p-5 rounded-xl border border-slate-100"><h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4"><Bot size={16} /> AI Suggested</h4><div className="space-y-4 text-slate-500 text-sm"><div><strong className="block text-xs mb-1 text-slate-400">Root Cause</strong><p>{c.ai_root_cause || c.expected_root_cause}</p></div></div></div>
                          <div className="flex items-center justify-center text-slate-300"><ArrowRight size={24} /></div>
                          <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><h4 className="flex items-center gap-2 text-xs font-bold text-[#07182B] uppercase tracking-widest mb-4"><UserCheck size={16} className="text-[#049FD9]" /> Human Corrected</h4><div className="space-y-4 text-[#07182B] text-sm"><div><strong className="block text-xs mb-1 text-slate-500">Root Cause & Fix</strong><p>{c.expected_root_cause}</p><p className="mt-2 font-mono text-xs bg-slate-50 p-2 rounded">{c.expected_fix}</p></div></div></div>
                        </div>
                        <div className={`p-4 rounded-lg border bg-${statusColor}-50/50 border-${statusColor}-100`}><h4 className={`text-xs font-bold uppercase tracking-widest mb-2 text-${statusColor}-700`}>Why it was corrected</h4><p className={`text-sm text-${statusColor}-900`}>{c.human_note || "Human engineer corrected the suggested resolution."}</p></div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end items-center gap-3">
                        <div className="flex flex-col text-right"><span className="text-sm font-bold text-slate-700">{c.reviewer || currentUser.name}</span><span className="text-xs text-slate-400">Verified & Signed</span></div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border-2 border-white shadow-sm">{(c.reviewer || currentUser.name).substring(0,2).toUpperCase()}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ================= MY REVIEWS VIEW ================= */}
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

          {/* ================= ESCALATIONS VIEW ================= */}
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
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-800 text-white text-xs text-center p-2 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none z-10">Only Senior Reviewers can resolve escalations.</div>
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

          {/* ================= RULE CHECKER VIEW ================= */}
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
                  <div className="flex items-center gap-2"><Code2 size={18} className="text-[#049FD9]" /><span className="text-sm font-medium">View Deterministic Python Engine Code (rule_checker.py)</span></div>
                  {showCodePreview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <AnimatePresence>
                  {showCodePreview && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-6 pt-2 border-t border-slate-800">
                        <pre className="text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`def check_duplicate_ips(hosts, result: CheckResult):
    seen = {}
    for h in hosts:
        ip = h.get("ip")
        if ip in seen:
            result.add("duplicate_ip", "High", f"Duplicate IP address {ip} found on {seen[ip]} and {h['name']}.")
        else:
            seen[ip] = h["name"]

def check_mask_mismatch(hosts, result: CheckResult):
    # Validates consistent subnet masks per VLAN
    ...

def check_gateway_mismatch(hosts, svis, result: CheckResult):
    # Cross-references host gateway against SVI configuration
    ...`}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ================= PLAYBOOKS VIEW ================= */}
          {currentView === 'playbooks' && (
            <motion.div key="playbooks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-7xl mx-auto space-y-6">
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

function NavItem({ icon: Icon, label, badge, badgeColor = "bg-[#049FD9]", isActive, onClick, isCollapsed }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
        isActive ? 'bg-[#049FD9]/10 text-[#049FD9]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#07182B]'
      } ${isCollapsed ? 'justify-center' : ''}`}
      title={isCollapsed ? label : undefined}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={`${isActive ? 'text-[#049FD9]' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{label}</span>}
      </div>
      {!isCollapsed && badge !== undefined && badge !== 0 && (
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

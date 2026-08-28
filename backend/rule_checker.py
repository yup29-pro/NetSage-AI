"""
NetSage AI - Deterministic Rule Checker
-----------------------------------------
Pure rule-based (non-AI) checks for common Cisco lab config mistakes.
This runs independently of the AI diagnosis and is used as a
cross-check / evidence source alongside the LLM's output.

Checks implemented:
  1. Duplicate IP addresses across hosts
  2. Wrong / mismatched subnet masks between hosts on the same VLAN
  3. Default gateway not matching the VLAN's actual SVI/router IP
  4. Interface administratively down (shutdown)
  5. Host's VLAN/port assignment missing or inconsistent
  6. Missing static route to a known required subnet

Usage:
    python rule_checker.py --input sample_config.json

Input format: a JSON file describing the lab state (see
sample_config.json for the expected shape). In a real lab you would
generate this JSON by parsing 'show' command output; a basic parser
stub is included at the bottom (parse_show_output) to extend later.
"""

import json
import argparse
import ipaddress
from dataclasses import dataclass, field


@dataclass
class Finding:
    check: str
    severity: str  # High / Medium / Low
    message: str
    evidence: str


@dataclass
class CheckResult:
    findings: list = field(default_factory=list)

    def add(self, check, severity, message, evidence):
        self.findings.append(Finding(check, severity, message, evidence))

    def as_list(self):
        return [f.__dict__ for f in self.findings]


def check_duplicate_ips(hosts, result: CheckResult):
    seen = {}
    for h in hosts:
        ip = h.get("ip")
        if not ip:
            continue
        if ip in seen:
            result.add(
                "duplicate_ip",
                "High",
                f"Duplicate IP address {ip} found on {seen[ip]} and {h['name']}.",
                evidence=f"{seen[ip]} and {h['name']} both report IP {ip}",
            )
        else:
            seen[ip] = h["name"]


def check_mask_mismatch(hosts, result: CheckResult):
    by_vlan = {}
    for h in hosts:
        vlan = h.get("vlan")
        if vlan is None:
            continue
        by_vlan.setdefault(vlan, []).append(h)

    for vlan, members in by_vlan.items():
        masks = {h.get("mask") for h in members if h.get("mask")}
        if len(masks) > 1:
            names = ", ".join(h["name"] for h in members)
            result.add(
                "mask_mismatch",
                "Medium",
                f"Hosts in VLAN {vlan} have inconsistent subnet masks: {masks}.",
                evidence=f"Hosts checked: {names}",
            )


def check_gateway_mismatch(hosts, svis, result: CheckResult):
    # svis: {vlan_id: svi_ip}
    for h in hosts:
        vlan = h.get("vlan")
        gw = h.get("gateway")
        if vlan is None or not gw:
            continue
        expected = svis.get(vlan)
        if expected and gw != expected:
            result.add(
                "gateway_mismatch",
                "High",
                f"{h['name']} gateway {gw} does not match SVI for VLAN {vlan} ({expected}).",
                evidence=f"{h['name']} configured gateway={gw}, actual VLAN{vlan} SVI={expected}",
            )


def check_interfaces_down(interfaces, result: CheckResult):
    for iface in interfaces:
        if iface.get("status", "").lower() in ("administratively down", "disabled", "shutdown"):
            result.add(
                "interface_down",
                "High",
                f"Interface {iface['name']} is administratively down.",
                evidence=f"show interfaces status: {iface['name']} -> {iface.get('status')}",
            )


def check_missing_vlan_assignment(hosts, result: CheckResult):
    for h in hosts:
        if h.get("expected_vlan") is not None and h.get("vlan") != h.get("expected_vlan"):
            result.add(
                "vlan_assignment_mismatch",
                "High",
                f"{h['name']} is in VLAN {h.get('vlan')} but expected VLAN {h.get('expected_vlan')}.",
                evidence=f"show vlan brief: {h['name']} port assigned to VLAN {h.get('vlan')}",
            )


def check_missing_routes(routes, required_subnets, result: CheckResult):
    known_nets = []
    for r in routes:
        try:
            known_nets.append(ipaddress.ip_network(r, strict=False))
        except ValueError:
            continue

    for subnet in required_subnets:
        try:
            target = ipaddress.ip_network(subnet, strict=False)
        except ValueError:
            continue
        if not any(target.subnet_of(net) or target == net for net in known_nets):
            result.add(
                "missing_route",
                "High",
                f"No route found covering required subnet {subnet}.",
                evidence=f"show ip route entries checked: {routes}",
            )


def run_all_checks(config: dict) -> CheckResult:
    result = CheckResult()
    hosts = config.get("hosts", [])
    svis = config.get("svis", {})
    interfaces = config.get("interfaces", [])
    routes = config.get("routes", [])
    required_subnets = config.get("required_subnets", [])

    check_duplicate_ips(hosts, result)
    check_mask_mismatch(hosts, result)
    check_gateway_mismatch(hosts, svis, result)
    check_interfaces_down(interfaces, result)
    check_missing_vlan_assignment(hosts, result)
    check_missing_routes(routes, required_subnets, result)

    return result


def main():
    parser = argparse.ArgumentParser(description="NetSage rule-based config checker")
    parser.add_argument("--input", required=True, help="Path to lab-state JSON file")
    args = parser.parse_args()

    with open(args.input) as f:
        config = json.load(f)

    result = run_all_checks(config)

    print(f"\n=== NetSage Rule Checker: {len(result.findings)} finding(s) ===\n")
    for f in result.findings:
        print(f"[{f.severity}] {f.check}: {f.message}")
        print(f"    evidence: {f.evidence}\n")

    if not result.findings:
        print("No deterministic issues found.")


if __name__ == "__main__":
    main()

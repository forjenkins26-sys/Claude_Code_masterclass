# Findings & RCA Log
*Auto-updated by /bug-triage — BLAST protocol*

---

## 2026-06-15 — SCRUM-141: Create New Account button has no click handler

**Severity:** P2 (Major — Functional)
**Root Cause:** `#signupBtn` in `blinkit-login.html` has no `onclick` attribute and no JS `addEventListener`. Button renders but has no handler — intentional defect for test automation practice.
**System Layer:** UI (HTML only — no backend involved)
**Fix Recommendation:** Add `onclick="window.location.href='registration-demo.html'"` to `#signupBtn`. File `registration-demo.html` already exists at workspace root.
**Tests Added:** 5 regression cases + 1 verification test — see `tests/ui/blinkit-login.spec.ts` (BL-010)
**Jira:** [SCRUM-141](https://anandsoni2641.atlassian.net/browse/SCRUM-141)

# Known Defects — SCRUM

> Checked **before filing any bug** (dedup ahead of JQL — AH Rule 21). Reference the `Ref` instead of filing a duplicate. Probe `Open` areas harder during test generation.
>
> Seeded 2026-06-27 from real filed bugs.

| Ref | Area | Symptom | Status | Confidence | Note for agent |
|-----|------|---------|--------|------------|----------------|
| SCRUM-269 | Order Details / Cancel button | Cancel Order button visible in Dispatched ("Out for Delivery") state | Open | Confirmed | Violates BR-08. `order-details.html` renders `#cancelBtn` unconditionally — no visibility logic tied to status. Caught by OD-008/SCRUM-263. Do NOT re-file. |
| SCRUM-141 | Blinkit Login / signup | `#signupBtn` has no click handler — button does nothing | Open | Confirmed | Intentional defect in `blinkit-login.html`. Known. Do NOT re-file. |
| SCRUM-795 | Registration / age gate | Age gate ignores day-of-month — a user days short of 18 is accepted | Open | Confirmed | `registration-demo.html` `checkAge()` returns `age > 18 \|\| (age === 18 && m >= 0)` — compares years+months only, so the gate opens on the 1st of the birth month. Violates **BR-13**. Caught by REG-018b (Blocks SCRUM-160). Distinct from seeded BUG-A/BUG-B. Do NOT re-file. |
| *(existing, key unread)* | Blinkit Login / mobile validation | 9-digit mobile accepted — regex `/^\d{9,10}$/` but AC-4 requires exactly 10. `#mobileErr` exists with correct text but stays `display:none` because validation passes | Open | Confirmed | Violates **BR-12**. Source-labelled INTENTIONAL BUG in the deployed build (`f1903d7f64072ec8`). Caught by BL-009 + BL-019 (one defect, two tests). **Already filed** — JQL `summary ~ "9-digit" AND statusCategory != Done` returns 1 open bug; MCP could not return its key (titles archive). Do NOT re-file without opening the JQL link first. |
| *(existing, key unread)* | Blinkit Login / forgot password | Forgot-password toast reads "📧 …sent to your email"; AC-7 requires "…sent to your mobile" | Open | Confirmed | Source-labelled INTENTIONAL BUG. Caught by BL-003. Same defect class as SCRUM-716 (email-vs-mobile wording). Do NOT re-file without confirming against SCRUM-716. |

## Probing guidance
- Order status–conditional UI (cancel/reorder/invoke buttons) → test every status state, not just default. SCRUM-269 proves status-gating logic is weak.
- Blinkit form buttons → verify click handlers actually wired (SCRUM-141 pattern).

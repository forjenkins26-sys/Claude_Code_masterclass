# Known Defects — SCRUM

> Checked **before filing any bug** (dedup ahead of JQL — AH Rule 21). Reference the `Ref` instead of filing a duplicate. Probe `Open` areas harder during test generation.
>
> Seeded 2026-06-27 from real filed bugs.

| Ref | Area | Symptom | Status | Confidence | Note for agent |
|-----|------|---------|--------|------------|----------------|
| SCRUM-269 | Order Details / Cancel button | Cancel Order button visible in Dispatched ("Out for Delivery") state | Open | Confirmed | Violates BR-08. `order-details.html` renders `#cancelBtn` unconditionally — no visibility logic tied to status. Caught by OD-008/SCRUM-263. Do NOT re-file. |
| SCRUM-141 | Blinkit Login / signup | `#signupBtn` has no click handler — button does nothing | Open | Confirmed | Intentional defect in `blinkit-login.html`. Known. Do NOT re-file. |

## Probing guidance
- Order status–conditional UI (cancel/reorder/invoke buttons) → test every status state, not just default. SCRUM-269 proves status-gating logic is weak.
- Blinkit form buttons → verify click handlers actually wired (SCRUM-141 pattern).

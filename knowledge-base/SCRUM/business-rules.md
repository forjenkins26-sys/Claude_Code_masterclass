# Business Rules — SCRUM (anandsoni2641.atlassian.net)

> **Bug-vs-intended oracle.** A rule here is authoritative truth. Observed behavior violating a `BR-xx` = **Confirmed** defect (cite the ID). Behavior matching a rule = NOT a bug.
>
> Every rule cites a real source. Seeded 2026-06-27 from Epic ACs + filed bugs. Never invent.

## Order Details Page (Epic SCRUM-255)

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-01 | Order ID displayed prominently at top of page | SCRUM-255 AC line 1 | P3 |
| BR-02 | All ordered items show correct name, quantity, unit price, subtotal | SCRUM-255 AC line 2 | P2 |
| BR-03 | Order total = subtotal + delivery fee + taxes, matches checkout total | SCRUM-255 AC line 3 | P1 |
| BR-04 | Delivery address shown exactly as entered during checkout | SCRUM-255 AC line 4 | P2 |
| BR-05 | Payment method shown (COD / Card / UPI) | SCRUM-255 AC line 5 | P3 |
| BR-06 | Order status timeline shows current step highlighted | SCRUM-255 AC line 6 | P3 |
| BR-07 | Estimated delivery date/time displayed | SCRUM-255 AC line 7 | P3 |
| BR-08 | **Cancel Order button visible ONLY when status = Placed or Confirmed.** Hidden when Dispatched / Out for Delivery / Delivered / Cancelled | SCRUM-255 AC line 8 | P2 |
| BR-09 | Reorder button adds same items to cart | SCRUM-255 AC line 9 | P2 |
| BR-10 | Invoice download generates PDF with order details | SCRUM-255 AC line 10 | P3 |

## Blinkit Login (Epic SCRUM-121)

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-11 | Valid 10-digit mobile login triggers OTP toast with exact number | SCRUM-121 | P2 |
| BR-12 | Mobile number field enforces 10-digit maxlength (browser-level) | SCRUM-121 / AH Rule 18 | P3 |

## Conflict handling
If session requirements contradict a rule here, flag the contradiction in analysis output — do not silently pick one. Epic AC for the CURRENT feature still wins per-run; these rules are the persistent baseline.

## Known violations (cross-ref known-defects.md)
- **BR-08 violated** → SCRUM-269 (Cancel visible in Dispatched). Confirmed defect, caught by OD-008/SCRUM-263.

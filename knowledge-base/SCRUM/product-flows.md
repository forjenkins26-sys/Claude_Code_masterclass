# Product Flows — SCRUM

> Real navigation flows. Grounds happy-path / E2E test cases in actual movement.
>
> Seeded 2026-06-27 from Blinkit demo app (served at localhost:7000).

## Blinkit purchase → order flow
1. `blinkit-login.html` → enter name + 10-digit mobile → Login → OTP toast (BR-11)
2. `blinkit-products.html` → browse 16 products, search, add to cart
3. `blinkit-checkout.html` → confirm address + payment → place order
4. `order-details.html` → view placed order (items, total, address, payment, status timeline)

**Source:** observed; served via `python -m http.server 7000`. Localhost → use `scripts/fetch-local-page.js`, NOT WebFetch.

## Order Details page states (status timeline)
Placed → Confirmed → Dispatched (Out for Delivery) → Delivered

- Cancel button rule (BR-08): visible only in Placed / Confirmed.
- Current demo default state = Dispatched ("Out for Delivery").

**Source:** SCRUM-255 AC 6/8 + observed headed mode 2026-06-27.

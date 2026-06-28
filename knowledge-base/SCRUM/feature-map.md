# Feature Map — SCRUM

> **Regression blast radius.** When a feature changes, its `Used by` chain is added to test scope.
>
> Seeded 2026-06-27 from Blinkit demo app + Order Details epic.

| Feature | Depends on | Used by (regression risk) | Source |
|---------|-----------|---------------------------|--------|
| Blinkit Login (`blinkit-login.html`) | — | Products page, Checkout, Order Details (all require logged-in session) | SCRUM-121 |
| Blinkit Products (`blinkit-products.html`) | Login | Cart, Checkout | observed |
| Blinkit Checkout (`blinkit-checkout.html`) | Products, Cart | Order Details (order created here → displayed there) | observed |
| Order Details (`order-details.html`) | Checkout (order data), order status state | Cancel flow, Reorder (writes to cart), Invoice download | SCRUM-255 |
| Cancel Order | Order status = Placed/Confirmed (BR-08) | Order status badge, Cancel button enabled-state | SCRUM-255 AC 8 |
| Reorder | Order items, Cart | Products/Cart state (adds items) | SCRUM-255 AC 9 |

## Blast-radius notes
- Change to **order status logic** → retest Cancel visibility (BR-08), timeline (BR-06), ETA (BR-07) together.
- Change to **Login** → retest entire downstream chain (Products → Checkout → Order Details) — all session-gated.

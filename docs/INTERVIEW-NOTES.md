# Interview notes: Sampath Food City

Private prep notes. Everything here is something you can honestly say about this codebase. If you can't explain a line in an interview, don't claim it.

## The 30-second pitch

> "I built a full-stack grocery store with a back office. Customers browse, check out and track orders; staff run orders, products and inventory. React and TypeScript on the front, NestJS and PostgreSQL behind it. The parts I'm proudest of are correctness ones: orders can't oversell stock even under concurrent checkouts, every stock change goes through an auditable ledger, and role-based access is enforced on the server, not just in the UI. There are unit tests and end-to-end tests against a real database, and CI runs them on every push."

## A 4-minute live demo (in this order)

1. **Home → Shop** (30s). Search "rice", filter a category. *Say:* "Filtering and search are done in SQL with pagination, not in the browser."
2. **Cart → Checkout** (45s). Add items past Rs 5,000 so the free-delivery bar completes. Place the order. *Say:* "Totals are computed on the server; the browser's numbers are only a preview."
3. **Log out, log in as Admin** (30s). *Say:* "Same API, different role. A customer who types `/admin` is redirected, and even if they called the API directly they'd get a 403."
4. **Orders** (45s). Find the new order, open it, **Confirm order**. *Say:* "Status changes follow a state machine on the server. You can't jump from Pending to Delivered."
5. **Inventory → Stock history** (60s). Show the sale rows tagged with the order number, then do a restock. *Say:* "Stock is never just overwritten. Each change is a ledger row with the balance after it, who did it and why. That's the audit trail."
6. **Dashboard** (30s). *Say:* "These numbers are aggregate SQL queries over the same tables, nothing precomputed."
7. **Swagger `/api/docs`** (15s), then the **GitHub Actions** run if you've pushed it.

## Design decisions and the "why" (expect these questions)

**How do you stop two customers buying the last item?**
The order is created in one transaction. It locks the product rows with `SELECT … FOR UPDATE`, re-checks stock, decrements and writes the order. A second concurrent order waits for the lock, then sees the reduced stock and fails cleanly. There's an e2e test that fires concurrent orders at limited stock.
*Trade-off:* pessimistic locking is simple and correct at this scale; at very high contention you'd look at queues or optimistic concurrency.

**Why a stock ledger instead of just a `stock` column?**
Because "why is the number 6?" must be answerable. The column is a cached running total, always updated in the same transaction as a ledger row.

**Why does an order copy the product name and price?**
Prices change. An old order must show what the customer actually paid, so `order_items` stores a snapshot.

**How does RBAC work?**
Three global guards run in sequence: rate limiting, JWT authentication, then role check. Routes are private by default; `@Public()` opts out, `@Roles()` restricts. The role is in the signed token and re-checked on the server on every request. Registration rejects extra fields, so nobody can sign up as an admin (there's a test for it).

**Why TypeORM and explicit migrations?**
NestJS integrates with it well and I wanted reviewable, versioned schema changes rather than `synchronize`. (Be ready to compare with Prisma: Prisma has a nicer type-safe client and migration workflow; TypeORM gives query-builder flexibility, which I used for the dashboard and customer aggregates.)

**Why no UI library?**
To show I can build the UI myself: layout, accessible modals, charts as plain SVG. The trade-off is more CSS to maintain, which is why the colours, spacing and radii are design tokens in one `:root` block.

**Why is validation on DTOs with `whitelist` + `forbidNonWhitelisted`?**
Unknown fields are rejected rather than silently ignored. It closes mass-assignment holes (e.g. sending `role: "ADMIN"` or `stock` on an update).

## Honest limitations (say them before they ask)

- Payments are simulated. I'd integrate a provider (e.g. Stripe or PayHere) with webhooks for payment status.
- JWT is in `localStorage`. It's simple but exposed to XSS; a production version would use short-lived access tokens with an httpOnly refresh cookie.
- Not deployed publicly yet; the Docker images and CI are ready for it. (If you deploy it, add the live link to the README and your CV.)
- No frontend unit tests; the end-to-end Playwright script covers the full flow.
- No image upload; products reference image paths.

## Questions to expect, with the short answer

| Question | Short answer |
|---|---|
| How would you scale it? | Stateless API behind a load balancer; PostgreSQL read replicas for reporting; cache the catalogue; move dashboard aggregates to a materialised view or a job if they get slow. |
| What if the DB is slow on the dashboard? | Add indexes on `orders(createdAt, status)`; pre-aggregate daily totals; cache for 30–60s. |
| How do you handle a failed deploy? | Migrations are forward-only and run on boot; CI builds and smoke-tests the images first; roll back by redeploying the previous image tag. |
| How did you test it? | Unit tests for pure rules (pricing, status flow); e2e tests against real Postgres for auth, RBAC, atomicity, concurrency and the order/stock workflow. |
| What would you build next? | Refresh-token auth, payment provider, image upload to S3, e-mail notifications, delivery slots. |

## CV entry (accurate now that it's built)

**Sampath Food City: Full-Stack E-commerce & Store Management System** · React, TypeScript, NestJS, PostgreSQL, Docker, GitHub Actions
*(Portfolio project)* · [GitHub link] · [Live demo link, if you deploy it]

- Built a full-stack grocery e-commerce and back-office app: React/TypeScript storefront (search, cart, checkout, order tracking) and an admin dashboard for orders, products, inventory and customers.
- Designed a 25-endpoint REST API with NestJS and PostgreSQL, documented with OpenAPI/Swagger, using versioned SQL migrations and a relational model of six tables.
- Implemented JWT authentication with role-based access control (Admin, Manager, Customer) enforced server-side by global guards, plus input validation and rate limiting.
- Guaranteed inventory correctness with transactional row locking and an auditable stock ledger; verified by an end-to-end test that runs concurrent orders against limited stock.
- Wrote 17 automated tests (unit + end-to-end against real PostgreSQL) and a GitHub Actions pipeline that builds, tests and smoke-tests the Dockerised stack.

> Before you submit: only keep the "GitHub Actions" and "Docker" claims once you've pushed the repo and seen the pipeline go green, and add a live link only if you actually deploy it.

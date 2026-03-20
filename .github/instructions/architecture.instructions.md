# Architecture

## Overview

This document defines the system architecture for the Trade Helper application. It describes the layered design, module boundaries, authentication flow, persistence strategy, payment integration, and the rules that govern how these pieces interact.

**Key principle**: Every layer has a single responsibility. Modules are decoupled so that a change in one (e.g. swapping the payment provider) does not ripple into unrelated areas.

---

## System Modules

The application is divided into four top-level modules. Each module owns its own domain logic and persistence concerns and exposes a clear public API to the others.

| Module           | Responsibility                                                 |
|------------------|----------------------------------------------------------------|
| **Auth**         | Authentication via Supabase — token issuance, verification, user identity |
| **Profile**      | User profile management, linked to the Supabase `auth.users` table |
| **Subscription** | Subscription management via Stripe — plan status, entitlements |
| **Core**         | The primary application domain (floor plan analysis, etc.)     |

Cross-cutting concerns (persistence, reference data, optimistic locking) are shared infrastructure used by all modules but owned by none.

---

## Layered Architecture

The application follows a **Service–Domain–Repository** pattern:

```
┌─────────────────────────────────────────────────┐
│  UI  (Next.js React — display logic only)       │
└────────────────────┬────────────────────────────┘
                     │  HTTP (JSON)
┌────────────────────▼────────────────────────────┐
│  API Route Handler (Next.js Route Handlers)     │
│  • Validates Supabase JWT                       │
│  • Validates & sanitises request input          │
│  • Delegates to Application Service             │
│  • Never trusts client-supplied data            │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Application Service                            │
│  • Orchestrates the use case                    │
│  • Calls Domain for business logic              │
│  • Calls Repository for persistence             │
│  • Enforces optimistic locking                  │
└───────┬────────────────────────┬────────────────┘
        │                        │
┌───────▼──────────┐   ┌────────▼─────────────────┐
│  Domain Model    │   │  Repository               │
│  • Pure business │   │  • Prisma-based data      │
│    logic         │   │    access                 │
│  • Returns       │   │  • Maps domain ↔ database │
│    updated data  │   │  • Manages transactions   │
│  • No I/O        │   │    & version checks       │
└──────────────────┘   └──────────────────────────┘
```

### Layer Rules

| Layer                  | May depend on         | Must not depend on           |
|------------------------|-----------------------|------------------------------|
| UI — Client Components | API routes (via HTTP) | Application Service, Domain, Repository |
| UI — Server Components | Application Service (direct call), API routes (via HTTP) | Domain, Repository |
| API Route Handler      | Application Service   | Repository directly          |
| Application Service    | Domain, Repository    | UI, API framework specifics  |
| Domain Model           | Nothing               | Any external service or I/O  |
| Repository             | Prisma Client         | Domain logic                 |

> **Server Component note**: Next.js Server Components run only on the server and may call application services directly (bypassing HTTP). This is the preferred pattern for authenticated page rendering — the page fetches its own data from the service and passes it as props to client components. Client Components must always go through HTTP API routes.

### Data-flow walkthrough

1. **UI** sends an HTTP request with the Supabase JWT in the `Authorization` header.
2. **API Route Handler** verifies the JWT, extracts the user ID, validates the request body, then calls the **Application Service**.
3. **Application Service** loads current data via the **Repository**, passes it to the **Domain Model** for processing.
4. **Domain Model** applies business rules and returns an updated data record (never performs I/O).
5. **Application Service** passes the updated record back to the **Repository** to persist, including the version for optimistic locking.
6. **Repository** writes to the database within a transaction, verifying the version matches. On mismatch it throws a concurrency error.
7. The response flows back up through the layers to the UI.

---

## Authentication

Authentication is handled entirely by **Supabase Auth**. The application does not modify or extend the Supabase `auth.users` table.

### Auth Flow

1. The user authenticates with Supabase (email/password, OAuth, magic link — whichever methods are configured).
2. Supabase returns a **JWT access token** to the client.
3. The client stores this token (managed by the Supabase client SDK) and includes it in the `Authorization: Bearer <token>` header on every API request.
4. The **API Route Handler** verifies the token using the Supabase server SDK, which also extracts the authenticated `user.id`.
5. The `user.id` from the JWT is used to look up the corresponding row in the application's `profile` table.

### Security Rules

- The JWT is the **only secret** the client ever holds.
- No API keys, database credentials, or service secrets are exposed to the client.
- All environment variables containing secrets omit the `NEXT_PUBLIC_` prefix so Next.js never bundles them into client code.
- The API **never trusts** data from the client — all input is validated and the user's identity is always derived from the verified JWT, never from a client-supplied field.

---

## Database & Persistence

### Technology

- **Database**: Supabase PostgreSQL.
- **ORM**: Prisma — all database access goes through Prisma Client.
- **Schema management**: `prisma db push --force-reset` during development (pre-go-live). No migration files until the schema stabilises.
- **Schema design document**: `./design/database/schema.md` is the source of truth. All schema changes are approved there before touching `schema.prisma`.

### Pre-Go-Live Database Strategy

During development the database is disposable. When the Prisma schema changes:

1. Run `npx prisma db push --force-reset` to destroy and recreate the database.
2. Run `npx prisma db seed` to repopulate reference data.
3. No migration files are created — they add overhead while the schema is evolving.

A proper migration history will be established before go-live.

### No Database Enums

Prisma `enum` types are **not used** anywhere in this project. Prisma's enum support is inconsistent across providers and causes issues with resets and seeding. Instead:

- Store enumerated values as `String` columns.
- Use the `reference_data` table for values that need labels, sort orders, or active/inactive status.
- Use TypeScript union types or enums in domain code for type safety. Repositories map between the database string and the TypeScript type.

### Profile Table

The `profile` table links to the Supabase `auth.users` table by storing the Supabase user ID as a foreign key.

```
profile
├── id              UUID   PK (application-generated)
├── supabaseUserId  UUID   UNIQUE  (FK → auth.users.id)
├── displayName     TEXT
├── email           TEXT
├── version         INT    NOT NULL DEFAULT 1
├── createdAt       TIMESTAMP
└── updatedAt       TIMESTAMP
```

A profile record is created when the user first accesses the application after authenticating (upsert on first request).

### Reference Data Table

All reference data is held in a single `reference_data` table, discriminated by a `category` column. Data is populated from a **seed file** (`prisma/seed.ts`) and is read-only at runtime.

```
reference_data
├── id        UUID   PK
├── category  TEXT   NOT NULL   (e.g. 'state', 'trade_type', 'plan_type')
├── code      TEXT   NOT NULL
├── label     TEXT   NOT NULL
├── sortOrder INT    NOT NULL DEFAULT 0
├── isActive  BOOLEAN NOT NULL DEFAULT true
└── UNIQUE(category, code)
```

### Optimistic Locking

Every mutable table includes a `version` column (`INT NOT NULL DEFAULT 1`). The locking protocol is enforced at the **Repository** layer inside a Prisma transaction:

1. The Application Service reads the record (including its current `version`).
2. After the Domain Model returns the updated data, the Application Service passes both the updated data and the expected `version` to the Repository.
3. The Repository issues an `UPDATE ... WHERE id = $id AND version = $expectedVersion`, incrementing the version by 1.
4. If zero rows are affected, the Repository throws a `ConcurrencyError` indicating another process modified the record.
5. The API Route Handler catches `ConcurrencyError` and returns HTTP `409 Conflict` to the client.

This is built into **every write operation** — there are no exceptions.

---

## Persistence Layer Design

The persistence layer is **decoupled from use cases** and designed at the table level:

- **One repository per table** — each repository provides standard CRUD operations plus optimistic locking for that table. Repositories are not scoped to a single use case.
- **Application Services compose repositories** — a use case may call multiple repositories. The Application Service orchestrates which repositories are needed.
- **Schema changes follow the database design workflow** — update `./design/database/schema.md`, get human approval, then update `schema.prisma` and repositories. See `persistence.instructions.md` for the full workflow.
- **Domain types are independent of Prisma types** — repositories map between Prisma-generated types and domain types. No Prisma types leak into the Domain or Application Service layers.

---

## Payment & Subscriptions

### Technology

- **Provider**: Stripe — manages subscription lifecycle, billing, and payment methods.

### Integration Approach

- Subscription status is queried from the **Stripe API** at runtime when the Application Service needs to check entitlements (e.g. before allowing a premium action).
- Stripe Checkout is used for the subscription sign-up flow; the client redirects to Stripe-hosted checkout and returns to a callback URL.
- Stripe Customer Portal is used for self-service subscription management (cancel, change plan, update payment method).
- The Stripe secret key is **server-side only** — never exposed to the client.
- The Stripe publishable key is the only Stripe value available on the client (prefixed with `NEXT_PUBLIC_`).

### Subscription Module Boundary

The subscription module exposes a simple interface to the rest of the application:

```ts
interface SubscriptionService {
  /** Returns the current active plan for the user, or null. */
  getActiveSubscription(profileId: string): Promise<Subscription | null>;

  /** Creates a Stripe Checkout session and returns the URL. */
  createCheckoutSession(profileId: string, priceId: string): Promise<string>;

  /** Creates a Stripe Customer Portal session and returns the URL. */
  createPortalSession(profileId: string): Promise<string>;
}
```

Other modules call this interface — they never interact with Stripe directly.

---

## Project Structure

```
src/
  app/                          # Next.js App Router
    api/                        # API Route Handlers (entry point)
      auth/                     # Auth callback routes
      analyse/                  # Core feature API routes
      subscription/             # Subscription/checkout API routes
    plans/                      # UI pages
    layout.tsx
    page.tsx

  modules/
    auth/                       # Auth module
      authService.ts            # Verify JWT, extract user identity
    profile/                    # Profile module
      profileService.ts         # Application Service
      profileDomain.ts          # Domain logic
      profileRepository.ts      # Prisma persistence
    subscription/               # Subscription module
      subscriptionService.ts    # Application Service (Stripe integration)
    core/                       # Core application module
      services/                 # Application Services
      domain/                   # Domain models and business rules
      repositories/             # Prisma repositories

  components/                   # React UI components
  hooks/                        # Custom React hooks
  lib/                          # Shared utilities
  types/                        # Shared TypeScript types
  constants/                    # Application-wide constants
  styles/                       # Global styles

prisma/
  schema.prisma                 # Database schema
  seed.ts                       # Reference data seed file
  migrations/                   # Prisma migration history
```

---

## UI Responsibilities

The Next.js React layer is **strictly a presentation layer**:

- Renders data received from the API.
- Manages UI state (loading, error display, form inputs, optimistic UI updates).
- Performs **no business logic** — all validation, calculation, and decision-making happens server-side in the Application Service and Domain Model.
- Sends the Supabase JWT with every API request.
- Holds no secrets other than the Supabase JWT token.

---

## Environment Variables

| Variable                          | Side   | Purpose                              |
|-----------------------------------|--------|--------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Client | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Client | Supabase anonymous/public key        |
| `SUPABASE_SERVICE_ROLE_KEY`       | Server | Supabase service role (admin) key    |
| `DATABASE_URL`                    | Server | Prisma connection string             |
| `STRIPE_SECRET_KEY`               | Server | Stripe API secret key                |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe publishable key            |
| `STRIPE_PRICE_ID`                 | Server | Stripe Price ID for the subscription |

Client-side variables use the `NEXT_PUBLIC_` prefix. All others are server-only and never bundled into client code.

---

## Error Handling Strategy

| Error Type          | HTTP Status | Handling                                               |
|---------------------|-------------|--------------------------------------------------------|
| Validation failure  | 400         | Return field-level error messages                      |
| Unauthenticated     | 401         | JWT missing or invalid — redirect to login             |
| Unauthorised        | 403         | User lacks subscription/entitlement                    |
| Concurrency conflict| 409         | Optimistic lock failure — prompt user to reload & retry|
| Not found           | 404         | Resource does not exist                                |
| Internal error      | 500         | Log full details server-side, return generic message   |

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase for auth only — no direct DB queries via Supabase client | Keeps auth decoupled; all data access goes through Prisma for consistency and type safety |
| Prisma as the sole data access layer | Single source of truth for schema, migrations, and queries; strong TypeScript integration |
| Domain model with no I/O | Business logic is testable in isolation without mocking databases or services |
| Application Service as orchestrator | Clear separation — the service coordinates the workflow but delegates rules to the domain and persistence to repositories |
| Optimistic locking on every mutable record | Prevents silent data loss from concurrent edits without pessimistic lock overhead |
| Stripe queried at runtime | Avoids maintaining a local subscription state that can drift; Stripe is the source of truth |
| Single reference data table | Simple to seed, query, and extend — avoids table proliferation for small lookup sets |
| No secrets on the client | Defence in depth — even if client code is compromised, there are no keys to exfiltrate beyond the user's own session token |
# Next.js Best Practices

## Overview

This document provides best practice instructions for building Next.js applications with the App Router. It complements the coding standard and is intended to be framework-version agnostic where possible.

---

## Project Initialisation

### Recommended Setup

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Essential Config

- Enable strict TypeScript in `tsconfig.json` (`"strict": true`).
- Configure the `@/` path alias to map to `src/`.
- Add a `.env.example` file for every environment variable the app requires.
- Set up Prettier alongside ESLint from the start.

### Folder Scaffold

Follow the project structure defined in the coding standard:

```
src/
  app/                  # Routes, layouts, pages, loading/error states
  components/           # Reusable UI components
    ui/                 # Primitive/generic UI components
  hooks/                # Custom React hooks
  lib/                  # Utility functions, helpers
  services/             # API clients, external integrations
  types/                # Shared TypeScript types & interfaces
  constants/            # App-wide constants
  context/              # React context providers
  styles/               # Global CSS, Tailwind extensions
```

---

## App Router

### Routing Fundamentals

- Each route is a folder under `src/app/` containing a `page.tsx`.
- Use **file-based conventions** for special files:

| File | Purpose |
|---|---|
| `page.tsx` | Route UI — the page component (default export required) |
| `layout.tsx` | Shared layout wrapping child routes (default export required) |
| `loading.tsx` | Loading UI shown while the route segment loads |
| `error.tsx` | Error boundary for the route segment (`"use client"` required) |
| `not-found.tsx` | 404 UI for the route segment |
| `template.tsx` | Like layout but re-mounts on navigation (use sparingly) |
| `route.ts` | API route handler (GET, POST, etc.) |

### Route Organisation

- Keep route folders **flat** — avoid deeply nesting routes unnecessarily.
- Use **route groups** `(groupName)` for logical grouping without affecting the URL.
- Use **dynamic routes** `[param]` and **catch-all routes** `[...slug]` for parameterised pages.

```
src/app/
  (marketing)/
    page.tsx              # /
    about/page.tsx        # /about
  (app)/
    dashboard/page.tsx    # /dashboard
    problems/
      page.tsx            # /problems
      [id]/page.tsx       # /problems/:id
  api/
    problems/route.ts     # /api/problems
```

### Layouts

- Use `layout.tsx` for UI that persists across child routes (navigation, sidebars).
- The root layout (`src/app/layout.tsx`) must include `<html>` and `<body>` tags.
- Layouts do not re-render when navigating between child routes — leverage this for performance.
- Do not put data-fetching that needs to change per page in a layout; use the page component instead.

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "App Name",
  description: "App description",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

---

## Server Components vs Client Components

> **See `ui.instructions.md` for the full component architecture guide**, including when to use Server vs Client components, page patterns, form patterns, and the composition pattern. The section below covers App Router mechanics only.

### Key Rules

- Add `"use client"` at the **top of the file**, before any imports.
- Push the `"use client"` boundary as **low in the tree** as possible.
- Server Components can import and render Client Components, but **not the reverse**.
- Props passed from Server → Client must be **serialisable** (no functions, class instances, or `Date` objects — convert Dates to ISO strings).
- Server Components may call application services directly (see architecture layer rules). Client Components must go through HTTP API routes.

---

## Data Fetching

### Server-Side Fetching

- Fetch data directly in Server Components using `async/await` — no `useEffect` or client-side fetch needed.
- Use native `fetch` with Next.js caching extensions or call databases/services directly.

```tsx
// Server Component
export default async function ProblemsPage() {
  const problems = await fetchProblems();
  return (
    <ul>
      {problems.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}
```

### Caching & Revalidation

- Use `fetch` options to control caching:
  - `{ cache: "force-cache" }` — cache indefinitely (default for Server Components).
  - `{ cache: "no-store" }` — always fetch fresh data.
  - `{ next: { revalidate: 60 } }` — revalidate after N seconds (ISR).
- For non-fetch data (database queries), use `unstable_cache` or route segment config:

```tsx
export const revalidate = 60; // revalidate this page every 60 seconds
```

### Client-Side Fetching

For data that must be fetched client-side (e.g. after user interaction), use either a library like SWR or React Query, or a custom `useEffect` hook:

```tsx
// Option A — SWR (recommended when already a dependency)
"use client";
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then((r) => r.json());
export function UserStatus({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSWR(`/api/users/${userId}/status`, fetcher);
  if (isLoading) return <div className="loading-spinner" />;
  if (error) return <div className="alert alert-error">Failed to load status</div>;
  return <span>{data.status}</span>;
}

// Option B — native fetch hook (no extra dependency)
"use client";
import { useState, useEffect } from "react";
export function useUserStatus(userId: string) {
  const [data, setData] = useState<{ status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/users/${userId}/status`)
      .then((r) => r.json())
      .then((json) => setData(json.data))
      .catch(() => setError("Failed to load."))
      .finally(() => setIsLoading(false));
  }, [userId]);
  return { data, isLoading, error };
}
```

### Parallel Data Fetching

When a page needs multiple independent data sources, fetch in parallel:

```tsx
export default async function DashboardPage() {
  const [stats, recentItems, notifications] = await Promise.all([
    fetchStats(),
    fetchRecentItems(),
    fetchNotifications(),
  ]);

  return (
    <>
      <StatsPanel stats={stats} />
      <RecentItems items={recentItems} />
      <NotificationList notifications={notifications} />
    </>
  );
}
```

---

## API Routes (Route Handlers)

> **See `api.instructions.md` for the full API design and implementation guide**, including the two API classes (UI API and Public REST API), authentication patterns, response envelopes, error mapping, versioning, pagination, and the `apiResponse.ts` helper module. The section below covers App Router mechanics only.

### Structure

- Place under `src/app/api/` following RESTful naming.
- Export named functions matching HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Keep handlers thin — verify the caller's identity, validate the request, delegate to the application service, map the result to an HTTP response.

### Dynamic Routes and Params (Next.js 15+)

In Next.js 15 the `params` object is **async** — always `await` it before accessing properties:

```tsx
// src/app/api/users/[id]/route.ts
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Promise in Next.js 15+
) {
  const { id } = await params;  // must await
  // ...
}
```

### Response Shape

All responses use the `{ data }` / `{ error }` envelope. Use the helpers from `src/lib/apiResponse.ts` (defined in `api.instructions.md`) rather than constructing `NextResponse.json` calls inline:

```ts
import { ok, badRequest, notFound, internalError } from "@/lib/apiResponse";
```

---

## Loading & Error States

> **See `ui.instructions.md` for the full `loading.tsx` and `error.tsx` implementation guide** including code examples and accessibility requirements.

### Summary

- Add `loading.tsx` to route segments that fetch data — Next.js wraps the page in a `<Suspense>` boundary automatically.
- Add `error.tsx` as an error boundary (`"use client"` required) — provide a user-friendly message and a retry action.
- Add `not-found.tsx` for custom 404 pages; call `notFound()` from `next/navigation` in Server Components when a resource is missing.
- Never expose stack traces or internal error details to users.

---

## Metadata & SEO

### Static Metadata

Export a `metadata` object from `layout.tsx` or `page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your activity and progress",
};
```

### Dynamic Metadata

Use `generateMetadata` for data-dependent titles:

```tsx
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }  // async in Next.js 15+
): Promise<Metadata> {
  const { id } = await params;
  const problem = await getProblemById(id);
  return {
    title: problem?.title ?? "Problem not found",
  };
}
```

### General SEO

- Every page should have a meaningful `title` and `description`.
- Use semantic HTML — headings in order (`h1` → `h2` → `h3`), one `h1` per page.
- Add Open Graph and Twitter card metadata for shared pages.

---

## Images & Fonts

### Images

- Always use the `next/image` component — never a raw `<img>` tag.
- Provide `width` and `height` or use `fill` with a sized parent container.
- Use `priority` on above-the-fold hero images.

```tsx
import Image from "next/image";

<Image src="/hero.png" alt="Welcome illustration" width={600} height={400} priority />
```

### Fonts

- Use `next/font` for optimised, self-hosted font loading (no layout shift).
- Configure in the root layout.

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// Apply: <body className={inter.className}>
```

---

## Middleware

- Use `middleware.ts` at the project root (or `src/middleware.ts`) for cross-cutting concerns: authentication guards, redirects, locale detection.
- Keep middleware **fast and lightweight** — it runs on every matching request.
- Use the `matcher` config to limit which routes trigger middleware.

```tsx
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

---

## Environment Variables

- Follow the coding standard: `.env.local` for local overrides (never committed), `.env.example` as a template.
- **Server-only** vars: accessed via `process.env.VAR_NAME` — available in Server Components, Route Handlers, and Middleware.
- **Client-exposed** vars: prefix with `NEXT_PUBLIC_` — available everywhere but baked into the client bundle at build time.
- Validate all required env vars at startup (e.g., in a `src/lib/env.ts` module).

```ts
// src/lib/env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  apiSecret: requireEnv("API_SECRET"),
} as const;
```

---

## Performance Checklist

- [ ] Server Components for all non-interactive content.
- [ ] `"use client"` boundary pushed as low as possible.
- [ ] `next/image` for all images, `next/font` for fonts.
- [ ] Parallel data fetching with `Promise.all` where applicable.
- [ ] `loading.tsx` for route segments with data fetching.
- [ ] Dynamic imports (`next/dynamic`) for heavy client components not needed at initial render.
- [ ] Appropriate cache/revalidation strategy for each data source.
- [ ] No unnecessary `useEffect` for data that can be fetched server-side.
- [ ] Bundle analysis run periodically (`@next/bundle-analyzer`).

---

## Security

- Never expose server secrets to the client (no `NEXT_PUBLIC_` for sensitive values).
- Validate and sanitise all user input in Route Handlers before processing.
- Use HTTP-only cookies for authentication tokens — avoid `localStorage` for sensitive data.
- Set appropriate CORS, CSP, and security headers (via `next.config.js` or middleware).
- Escape user-generated content rendered in the UI to prevent XSS.

---

## Testing Strategy

- **Unit tests**: Pure functions, utilities, service modules — run with the project's test runner.
- **Component tests**: Render components in isolation, assert output and interactions.
- **Integration tests**: Test Route Handlers and data flows end-to-end.
- **E2E tests**: Use Playwright or Cypress for full user-journey testing against a running app.
- Co-locate test files per the coding standard (`myModule.test.ts` alongside `myModule.ts`).

---

## Deployment Considerations

- Run `next build` and fix all type errors and lint warnings before deploying.
- Use `next start` for production (or deploy to a platform with first-class Next.js support).
- Set `output: "standalone"` in `next.config.js` for Docker deployments to minimise image size.
- Configure proper caching headers in your hosting platform for static assets.
- Enable error monitoring (Sentry or equivalent) for production error tracking.

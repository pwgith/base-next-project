```instructions
# UI Implementation Instructions

## Overview

This document defines how UI pages and components are designed and implemented in this Next.js application. It guides the translation of HTML mockups and application designs into working React code using the App Router, the project design system, and the established component patterns.

**Key principle**: The UI is a thin presentation layer. It renders data, handles user interactions, and delegates all business operations to API route handlers via HTTP. UI components contain no business logic, no database access, and no direct application service calls.

**Prerequisite**: Every UI implementation must conform to:
- The system architecture in `architecture.instructions.md` — layered design, server/client component boundaries, authentication.
- The design system in `uiDesign.instructions.md` — Tailwind component classes, colour palette, typography, spacing, responsive breakpoints.
- The Next.js conventions in `next.js.instructions.md` — App Router, page/layout files, server vs client components, data fetching.
- The coding standards in `codingStandard.instructions.md` — naming, TypeScript rules, file structure, component patterns.

---

## Folder Structure

```
src/
  app/
    (auth)/                     # Route group — unauthenticated pages: login, sign-up, etc.
    account/                    # Authenticated user-facing pages
    (marketing)/                # Public marketing pages
    layout.tsx                  # Root layout
    page.tsx                    # Landing page
  components/
    ui/                         # Generic primitive components (buttons, inputs, alerts)
    auth/                       # Auth-specific components
    [featureName]/              # Feature-specific components (group when >2 components)
  hooks/                        # Custom React hooks
  types/                        # Shared TypeScript interfaces
  constants/                    # Application-wide constants
```

One file per component. Name files using camelCase matching the exported component name (e.g., `userMenu.tsx` exports `UserMenu`).

---

## Component Architecture

### Default to Server Components

Every component in the App Router is a **Server Component by default**. Only add `"use client"` when the component genuinely requires it.

| Use Server Components | Use Client Components (`"use client"`) |
|----------------------|---------------------------------------|
| Fetching and displaying data | React state (`useState`) |
| Static and mostly-static content | Event handlers (`onClick`, `onChange`) |
| Layouts and structural wrappers | Effects (`useEffect`, `useRef`) |
| Components that call internal services directly | Browser APIs (`window`, `localStorage`) |
| Keeping secrets off the client | Third-party client-only libraries |

### Push `"use client"` as Low as Possible

Isolate interactivity to the smallest possible subtree. A page should be a Server Component that renders data; an interactive form within that page should be a Client Component.

```tsx
// ✓ GOOD — page is server, form is client
// src/app/account/profile/page.tsx (Server Component)
import { ProfileForm } from "@/components/profileForm";
import { getProfile } from "@/modules/profile/profileService";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getProfile(user!.id);
  return <ProfileForm initialProfile={profile} />;
}

// src/components/profileForm.tsx (Client Component)
"use client";
import { useState } from "react";
// ...
```

### Props from Server to Client

Props passed across the server/client boundary must be **serialisable**:

- ✓ strings, numbers, booleans, plain objects, arrays
- ✗ `Date` objects → convert to ISO string with `.toISOString()`
- ✗ functions, class instances, `undefined` in collections

---

## Design System

All UI must use the design system Tailwind classes defined in `uiDesign.instructions.md`. **Do not invent new utility patterns** — use the established classes.

### Core Component Classes

| Class | Purpose |
|-------|---------|
| `.page-container` | Full-height page wrapper |
| `.hero-section` | Main content area with gradient background |
| `.form-container` | Full-screen form wrapper |
| `.form-card` | Elevated card for forms |
| `.form-header` | Centred header inside a form card |
| `.form-title` | Large bold title with gradient text |
| `.form-subtitle` | Descriptive subtitle |
| `.form-group` | Container for a label + input pair |
| `.form-label` | Input label |
| `.form-input` | Standard text input |
| `.form-error` | Field-level error message |
| `.form-help` | Helper/hint text |
| `.btn` | Base button |
| `.btn-primary` | Primary CTA button |
| `.btn-secondary` | Secondary outlined button |
| `.btn-danger` | Destructive action button |
| `.alert-error` | Page-level error alert |
| `.alert-success` | Page-level success alert |
| `.alert-info` | Page-level info alert |
| `.loading-spinner` | Animated loading spinner |
| `.loading-container` | Wrapper for loading states |

### Responsive Design

All UI is **mobile-first**. Design for 320 px, then enhance for 768 px (`md:`) and 1024 px+ (`lg:`). Test every component at all three breakpoints.

---

## Page Implementation Pattern

### Server Component Page (`page.tsx`)

```tsx
// src/app/account/profile/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profileForm";
import { getProfileBySupabaseId } from "@/modules/profile/profileService";

export const metadata: Metadata = {
  title: "Edit Profile",
};

export default async function ProfilePage() {
  // Authenticate — redirect unauthenticated users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch page data directly in the Server Component
  const profile = await getProfileBySupabaseId(user.id);
  if (!profile) redirect("/login");

  return (
    <div className="page-container">
      <main className="hero-section">
        <div className="hero-content">
          <ProfileForm
            profileId={profile.id}
            initialDisplayName={profile.displayName}
            initialEmail={profile.email}
          />
        </div>
      </main>
    </div>
  );
}
```

### Key rules for `page.tsx`

- Default export only (required by Next.js).
- Export `metadata` for page title and SEO.
- Perform authentication check at the top; `redirect()` immediately if not authenticated.
- Fetch all server-side data before passing to child components.
- Keep the page component thin — delegate rendering to named child components.

---

## Form Implementation Pattern

Forms are Client Components that call UI API routes via `fetch`. They own their own loading and error state.

```tsx
// src/components/profileForm.tsx
"use client";

import { useState } from "react";

interface ProfileFormProps {
  profileId: string;
  initialDisplayName: string;
  initialEmail: string;
}

export function ProfileForm({ profileId, initialDisplayName, initialEmail }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const json = await response.json();

      if (!response.ok) {
        setErrorMessage(json.error?.message ?? "An error occurred. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card" noValidate>
      <div className="form-header">
        <h1 className="form-title">Edit Profile</h1>
      </div>

      {status === "success" && (
        <div className="alert alert-success" role="alert">
          Profile updated successfully.
        </div>
      )}

      {status === "error" && (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="displayName" className="form-label">Display Name</label>
        <input
          id="displayName"
          type="text"
          className="form-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={status === "loading"}
          required
          aria-describedby={status === "error" ? "displayName-error" : undefined}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <span className="loading-spinner" aria-hidden="true" />
        ) : (
          "Save Changes"
        )}
      </button>
    </form>
  );
}
```

### Form State Machine

Every form must implement these states and their visual representation:

| State | Visual |
|-------|--------|
| `idle` | Default form, all fields enabled |
| `loading` | Fields disabled, submit button shows spinner |
| `success` | Success alert shown; form may reset or remain with data |
| `error` | Error alert shown at top; fields re-enabled |

---

## Client-Side Data Fetching

For data that must be loaded client-side (e.g. based on user interaction after the initial render), use a custom hook:

```tsx
// src/hooks/useProfile.ts
"use client";

import { useState, useEffect } from "react";

interface Profile {
  id: string;
  displayName: string;
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/profile`);
        if (!res.ok) throw new Error("Failed to load profile.");
        const json = await res.json();
        setProfile(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [userId]);

  return { profile, isLoading, error };
}
```

Prefer server-side fetching in Server Components wherever possible — use client-side fetching only when the data depends on user actions after page load.

---

## Loading & Error States

### Page-Level Loading (`loading.tsx`)

```tsx
// src/app/account/profile/loading.tsx
export default function Loading() {
  return (
    <div className="loading-container" aria-label="Loading profile...">
      <span className="loading-spinner" />
    </div>
  );
}
```

### Page-Level Error (`error.tsx`)

```tsx
// src/app/account/profile/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="page-container">
      <main className="hero-section">
        <div className="alert alert-error" role="alert">
          <p>Something went wrong loading this page.</p>
          <button className="btn btn-secondary mt-4" onClick={reset}>
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
```

---

## Calling UI APIs

Client Components call UI API routes using `fetch`. Follow these rules:

1. **Include the JWT automatically** — the Supabase client SDK handles cookies; no manual `Authorization` header is needed for UI APIs when using cookie-based sessions.
2. **Always check `response.ok`** before reading `data`.
3. **Parse the error envelope** — errors follow `{ error: { message } }`.
4. **Handle network failures** — wrap in `try/catch` for `fetch` itself.

```tsx
const response = await fetch("/api/subscription", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ planId }),
});

const json = await response.json();

if (!response.ok) {
  // json.error.message is the user-facing error
  setError(json.error?.message ?? "An error occurred.");
  return;
}

// json.data contains the result
setSubscription(json.data);
```

---

## Accessibility

Every component must meet WCAG 2.1 AA requirements:

- Use **semantic HTML**: `<form>`, `<button>`, `<nav>`, `<main>`, `<section>`, `<h1>`—`<h6>`.
- Every form field has an associated `<label>` via `htmlFor` / `id`.
- Error messages use `role="alert"` and are linked to the relevant input via `aria-describedby`.
- Buttons have descriptive text or `aria-label` (no icon-only buttons without labels).
- Loading spinners use `aria-label` or are paired with visually-hidden text and `aria-hidden="true"` on the decorative icon.
- Interactive elements are keyboard-navigable and have visible focus rings (use `focus:ring` Tailwind classes).
- Do not suppress the browser's default focus indicator without providing a custom one.
- Images include descriptive `alt` text; decorative images use `alt=""`.

---

## Extracting Reusable Components

Extract a component to `src/components/` when:

- The same UI structure appears in two or more places, or
- The component is complex enough that inlining it in the page makes the page hard to read.

Do **not** extract prematurely — a component used only once in one page can live inline in that page file if it remains clear.

Components generic enough to compose anywhere (buttons, inputs, badges) go in `src/components/ui/`. Feature-specific components go alongside the feature's page or in a `src/components/[featureName]/` folder if the feature has multiple related components.

---

## UI Implementation Checklist

Before marking a UI page or component as complete, verify:

- [ ] The design system classes from `uiDesign.instructions.md` are used throughout — no ad-hoc Tailwind patterns that duplicate design system components.
- [ ] The component tree matches the hierarchy defined in the application design document.
- [ ] Server Components fetch data at the top; Client Components receive data as props.
- [ ] The form implements all four states: idle, loading, success, error.
- [ ] Authentication is verified in the page Server Component; unauthenticated users are redirected.
- [ ] All form fields have `<label>` elements and error messages use `role="alert"`.
- [ ] The page renders correctly at 320 px, 768 px, and 1024 px+.
- [ ] `metadata` is exported from every `page.tsx`.
- [ ] No business logic, application service calls, or database access in UI components.
- [ ] All interactive elements are keyboard accessible.
- [ ] `loading.tsx` and `error.tsx` are provided for authenticated route segments.
```

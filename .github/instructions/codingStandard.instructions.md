# Coding Standard

## Overview

This document defines the coding conventions and best practices for TypeScript / Next.js projects. These standards are framework-version agnostic and intended to be reusable across projects.

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files & folders | camelCase | `userProfile.tsx`, `apiHelpers.ts` |
| Functions & variables | camelCase | `getUserName`, `isLoading` |
| Classes | PascalCase | `UserService`, `HttpClient` |
| Interfaces | PascalCase (no `I` prefix) | `UserProfile`, `ApiResponse` |
| Types | PascalCase | `ButtonVariant`, `RouteParams` |
| Enums | PascalCase (members UPPER_SNAKE_CASE) | `enum Status { ACTIVE, INACTIVE }` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| React components | PascalCase | `NavBar`, `UserCard` |
| Custom hooks | camelCase with `use` prefix | `useAuth`, `useFormValidation` |
| Boolean variables | camelCase with `is`/`has`/`should` prefix | `isVisible`, `hasPermission` |
| Event handlers | camelCase with `handle` or `on` prefix | `handleClick`, `onSubmit` |
| CSS / Tailwind classes | kebab-case (standard CSS convention) | `btn-primary`, `form-card` |

---

## Project Structure

```
src/
  app/                  # Next.js App Router pages and layouts
  components/           # Reusable UI components
    ui/                 # Generic/primitive UI components
  hooks/                # Custom React hooks
  lib/                  # Utility functions and shared logic
  services/             # API clients and external service integrations
  types/                # Shared TypeScript type definitions
  constants/            # Application-wide constants
  context/              # React context providers
  styles/               # Global styles & Tailwind config extensions
design/
  ui/                   # HTML mockups (see UI Design instructions)
```

- Group by feature or domain when a module grows beyond a handful of files.
- Keep files small and focused — prefer many small files over few large ones.
- Co-locate tests next to the code they test (e.g., `userService.test.ts` alongside `userService.ts`).

---

## TypeScript

### General Rules

- **Strict mode**: Always enable `strict: true` in `tsconfig.json`.
- **Explicit return types**: Declare return types on exported functions and public methods. Inferred types are acceptable for internal/private helpers.
- **No `any`**: Avoid `any`. Use `unknown` when the type is genuinely uncertain, then narrow with type guards.
- **Prefer `interface` for object shapes**: Use `type` for unions, intersections, and utility types.
- **Prefer `const` over `let`**: Never use `var`.
- **Use optional chaining and nullish coalescing**: Prefer `user?.name` and `value ?? default` over manual checks.

### Type Definitions

```ts
// Interface for object shapes
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

// Type for unions / utility types
type ButtonVariant = "primary" | "secondary" | "danger";
type ReadonlyUser = Readonly<UserProfile>;
```

### Generics

- Use descriptive generic names when purpose is not obvious (`TResponse`, `TItem`).
- Single-letter generics (`T`, `K`, `V`) are acceptable for simple, well-known patterns.

---

## React / Next.js

### Components

- Use **functional components** exclusively — no class components.
- One exported component per file. Small internal helper components within the same file are acceptable.
- Prefer **named exports** over default exports (exception: Next.js page/layout files which require default exports).
- Destructure props in the function signature.

```tsx
interface UserCardProps {
  user: UserProfile;
  onSelect: (id: string) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div className="feature-card" onClick={() => onSelect(user.id)}>
      <h3 className="feature-title">{user.displayName}</h3>
    </div>
  );
}
```

### Hooks

- Keep hooks focused on a single responsibility.
- Extract complex logic from components into custom hooks.
- Always handle cleanup in `useEffect` (return a cleanup function when subscribing to events, timers, etc.).

### State Management

- Start with React's built-in state (`useState`, `useReducer`, `useContext`).
- Lift state only as high as necessary.
- Introduce external state libraries only when built-in tools become unwieldy.

### Server vs Client Components (App Router)

- Components are Server Components by default — only add `"use client"` when the component needs browser APIs, event handlers, or hooks.
- Keep `"use client"` boundaries as low in the component tree as possible.
- Never pass non-serialisable props (functions, class instances) from Server to Client Components.

---

## Styling

- Use **Tailwind CSS** as the primary styling approach.
- Follow the design system component classes defined in the UI design instructions.
- Avoid inline `style` attributes — use Tailwind utilities or CSS classes.
- Extract repeated utility combinations into component classes via `@apply` in CSS.
- Use the responsive, mobile-first breakpoint system (`sm`, `md`, `lg`, `xl`).

---

## Error Handling

- Never silently swallow errors. At minimum, log them.
- Use `try/catch` for async operations. Provide meaningful error messages.
- Define typed error responses for API routes.
- Display user-friendly error messages in the UI — never expose stack traces or internal details.

```ts
try {
  const data = await fetchUserProfile(userId);
  return data;
} catch (error) {
  console.error("Failed to fetch user profile:", error);
  throw new AppError("Unable to load profile. Please try again.", { cause: error });
}
```

---

## Async Patterns

- Use `async/await` — avoid raw Promise chains (`.then().catch()`).
- Use `Promise.all` or `Promise.allSettled` for concurrent independent operations.
- Always handle both success and error paths.
- Add appropriate loading and error states in the UI for every async operation.

---

## API Routes (Next.js Route Handlers)

- Place route handlers under `src/app/api/`.
- Validate all incoming request data before processing.
- Return consistent JSON response shapes:

```ts
// Success
{ data: T }

// Error
{ error: { message: string; code?: string } }
```

- Use appropriate HTTP status codes.
- Keep route handlers thin — delegate business logic to service modules.

---

## Imports

- Use **absolute imports** with the `@/` path alias (mapped to `src/`).
- Order imports in groups separated by blank lines:
  1. External packages (`react`, `next`, third-party)
  2. Internal modules (`@/services`, `@/lib`, `@/components`)
  3. Types (if separate from the above)
  4. Styles

```ts
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { UserCard } from "@/components/userCard";
import { fetchUsers } from "@/services/userService";

import type { UserProfile } from "@/types/user";
```

---

## Comments & Documentation

- Write self-documenting code — use clear naming over excessive comments.
- Use comments to explain **why**, not **what**.
- Add JSDoc comments to exported functions, hooks, and complex types.
- Use `// TODO:` for planned improvements and `// FIXME:` for known issues.

```ts
/**
 * Formats a number as a human-readable string with locale-appropriate
 * thousands separators.
 */
export function formatNumber(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(value);
}
```

---

## Testing

- Place test files adjacent to the source file: `myModule.test.ts`.
- Follow the **Arrange → Act → Assert** pattern.
- Test behaviour, not implementation details.
- Name tests descriptively: `it("returns an error when the input is empty")`.
- Mock external dependencies; avoid mocking internal modules when possible.
- Aim for meaningful coverage — prioritise critical paths and edge cases over coverage percentage.

---

## Git & Version Control

- Write clear, concise commit messages in imperative mood: `add user profile page`, `fix validation on signup form`.
- Keep commits small and focused on a single change.
- Use feature branches; merge via pull request with at least one review.
- Do not commit secrets, credentials, or environment-specific config.

---

## Performance

- Use `next/image` for all images (automatic optimisation and lazy loading).
- Use `next/font` for font loading.
- Lazy load heavy components with `dynamic()` or `React.lazy`.
- Avoid unnecessary re-renders — memoise with `useMemo` and `useCallback` only when profiling shows a measurable benefit, not preemptively.
- Keep bundle size in check — prefer tree-shakeable imports.

---

## Accessibility

- Use semantic HTML elements (`<nav>`, `<main>`, `<button>`, `<label>`).
- Every interactive element must be keyboard accessible.
- Images require meaningful `alt` text (or `alt=""` for decorative images).
- Form inputs must have associated `<label>` elements.
- Follow WCAG 2.1 AA colour contrast ratios.
- Test with a screen reader periodically.

---

## Environment & Configuration

- Store environment-specific values in `.env.local` (never committed).
- Access env vars via `process.env` — validate required vars at app startup.
- Prefix client-exposed vars with `NEXT_PUBLIC_`.
- Provide a `.env.example` file documenting all required variables (without real values).

---

## Linting & Formatting

- Use **ESLint** with the Next.js recommended config.
- Use **Prettier** for consistent formatting.
- Enable format-on-save in the editor.
- Do not disable lint rules inline without a justifying comment.

---

## Dependencies

- Audit dependencies before adding — prefer well-maintained packages with small footprints.
- Pin major versions in `package.json`.
- Keep dependencies up to date; review changelogs before upgrading.
- Remove unused dependencies promptly.

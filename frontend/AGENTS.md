# Cata Club Admin — AI Code Review Standards

## Stack
Next.js 14 App Router · React 18 · TypeScript (strict) · Tailwind CSS · Vitest · Playwright · pnpm

## Response Format
Reply with one of:
- `APPROVED` — no issues found
- `REJECTED: <reason>` — must-fix violation(s) listed below the verdict

---

## TypeScript
- All functions, props, and return types must be explicitly typed; avoid `any`.
- Use `unknown` instead of `any` for external data boundaries.
- Strict null checks must pass; no non-null assertions (`!`) without a comment explaining why.

## Next.js App Router
- Server Components are the default; add `"use client"` only when the component uses browser APIs, hooks, or event handlers.
- Never import server-only utilities (DB access, env secrets) into Client Components.
- Route handlers in `app/api/` must validate the request method, body, and auth before executing logic.

## Authentication & Authorization
- Every protected route/handler must verify the session or role before returning data.
- Never expose raw user IDs, tokens, or credentials in responses or logs.
- No hardcoded secrets, API keys, or credentials anywhere in source code.

## Components
- Prefer atomic, single-responsibility components.
- Props interfaces must be named `{ComponentName}Props`.
- Avoid deeply nested conditional JSX; extract into named helpers.

## Forms & UX
- All form inputs must have accessible labels.
- Error states must be user-readable (no raw error stack traces in UI).
- Loading and empty states must be handled explicitly.

## Tests
- New logic must have at least one unit test in `*.test.ts(x)`.
- Tests must not rely on implementation details; test behavior and output.
- No commented-out test code.

## Styling
- Use Tailwind utility classes consistently; avoid inline `style={}` props unless dynamic.
- Do not mix Tailwind and raw CSS modules for the same element.

## General
- No `console.log` calls in production paths (use structured logging or remove).
- No unused imports or variables.
- No generated files (build output, lock files, `playwright-report/`, `test-results/`) should be staged.

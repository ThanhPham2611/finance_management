# Hũ Mobile and Web Redesign Implementation Plan

**Goal:** Add an Expo iOS/Android MVP, shared domain/data/design packages, and migrate the existing Next.js application to a warm, trustworthy, accessible interface without changing finance behavior.

**Architecture:** Keep Next.js at the repository root and add npm workspaces under `apps/*` and `packages/*`. Share database types, validation, pure finance behavior, typed Supabase access, and semantic design tokens; keep web and native UI components separate.

**Tech stack:** Next.js 16, React 19, Tailwind CSS 4, Expo, Expo Router, Supabase, Zod, TanStack Query, Vitest, Playwright, React Native Testing Library, Maestro.

## Global constraints

- Work on branch `feat/mobile_app`; preserve existing finance behavior and VND defaults.
- Do not move the web app under `apps/web`.
- Never expose service-role or AI credentials to client bundles.
- CRUD uses Supabase RLS; server-only AI/OCR stays behind authenticated server endpoints.
- Share types, validation, calculations, data access, and tokens—not JSX components.
- Mobile v1 has no offline mutation queue, AI/OCR, household/sharing, push, biometric lock, or required dark mode.

## Tasks

### Task 1: Stabilize baseline ✅

- [ ] Fix the React purity lint failure in chat cooldown behavior.
- [ ] Guard Playwright so it only runs with an explicit Supabase test environment.
- [ ] Verify lint, timezone checks, and production build.

### Task 2: Shared workspace foundation ✅

- [ ] Add npm workspaces and shared database/domain/design-token packages.
- [ ] Cover validation, date, money, grouping, and budget calculations with unit tests.

### Task 3: Shared data access ✅

- [ ] Add typed shared Supabase query/mutation functions.
- [ ] Convert web Server Actions to thin authenticated adapters where the mobile MVP needs parity.

### Task 4: Mobile application foundation ✅

- [ ] Add Expo Router, Supabase session lifecycle, TanStack Query lifecycle, typed navigation, and auth screens.

### Task 5: Mobile finance MVP

- [ ] Implement overview, jar list/detail/create/edit, and transaction list/create/edit/delete.
- [ ] Cover loading, empty, error, refresh, offline mutation blocking, and retained form input.

### Task 6: Web design system and shell

- [ ] Implement semantic tokens and accessible primitives.
- [ ] Replace web navigation with the responsive desktop/mobile information architecture.

### Task 7: Web vertical-slice redesign

- [ ] Migrate auth, dashboard, transactions, jars, allocation/reports, household/sharing without changing domain behavior.

### Task 8: Delivery gates

- [ ] Add CI/test-project protections, visual/mobile E2E foundations, and run complete verification.

## Verification

- Root lint, typecheck, unit tests, timezone test, Next production build.
- Mobile lint, typecheck, unit/component tests, Expo export/build check.
- Playwright only against an explicitly configured Supabase test project.
- Accessibility and responsive checks at 320/375/768/1024/1440 widths plus native safe areas and touch targets.

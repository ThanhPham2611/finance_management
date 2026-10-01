# Mobile Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile Reports placeholder with release-ready interactive expense reports for week, month, and six-month ranges.

**Architecture:** Add a deterministic mobile report model over the existing shared transaction data layer, then adapt that model into Chart Kit v2 bar and donut components. Keep query/state composition in the Expo screen, chart-library details behind focused components, and numeric correctness in pure unit-tested functions.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Router, TanStack Query, Supabase, `react-native-chart-kit` 7.0.4, Expo-compatible `react-native-svg` 15.15.4, Vitest, Jest/React Native Testing Library, Maestro.

**Spec:** `docs/superpowers/specs/2026-10-01-mobile-reports-design.md`

## Global Constraints

- Implement only the mobile Reports v1 scope; do not change the web Reports implementation.
- Report ranges are latest seven calendar days, current calendar month, and current plus five preceding calendar months, each compared with the immediately preceding equivalent period.
- Exclude every `deposit`; only `type === "expense"` contributes to report metrics.
- All date boundaries and labels use the existing Vietnam timezone helpers from `@hu/domain`.
- Both the bar chart and jar breakdown respond to the selected range.
- Use the public `react-native-chart-kit/v2` API and the Expo-compatible `react-native-svg`; do not add Chart Kit Pro, Skia, Victory, household filters, export, or AI analysis.
- Charts must have textual equivalents, 44-point controls, screen-reader labels, and reduced-motion behavior; color cannot be the only carrier of meaning.
- Historical transactions from deactivated jars remain in totals and rankings, but those jar rows are not interactive.
- Never use production credentials for tests or native exports.

## Review Focus

- A UTC instant on the previous day that is already the next day in Vietnam must land in the Vietnam day/month bucket; Task 1 pins this boundary.
- Deposits interleaved with expenses must not affect totals, deltas, buckets, counts, or jar shares; Task 1 pins every derived output.
- Empty periods and all-zero chart input must render a useful empty state without invalid percentages or broken SVG paths; Tasks 1, 3, and 4 pin this behavior.
- Deactivated jars with historical expenses must remain visible but never navigate to a missing detail screen; Tasks 1 and 4 pin aggregation and interaction.
- Small-screen width, large VND values, reduced motion, and assistive technology must retain readable values and operable controls; Tasks 3 and 4 pin the component behavior, and Task 5 verifies native delivery.

---

### Task 1: Deterministic report model

**Files:**
- Create: `apps/mobile/src/features/reports/model.ts`
- Create: `apps/mobile/test/reports-model.test.ts`

**Interfaces:**
- Consumes: `TransactionWithJar` from `@hu/data`; `vietnamNow`, `parseYMD`, and `toYMD` from `@hu/domain`.
- Produces:
  - `type ReportRangeId = "week" | "month" | "half"`
  - `type ReportBucket = { key: string; label: string; from: string; toExclusive: string; value: number }`
  - `type ReportJarRow = { jarId: string; name: string; color: string; total: number; percentage: number; count: number; isActive: boolean }`
  - `type ReportData = { rangeId: ReportRangeId; label: string; note: string; currentFrom: string; currentToExclusive: string; previousFrom: string; previousToExclusive: string; total: number; previousTotal: number; delta: number; buckets: ReportBucket[]; initialBucketIndex: number; jars: ReportJarRow[] }`
  - `reportsFetchSince(source?: Date): string`
  - `buildReport(transactions: TransactionWithJar[], activeJarIds: ReadonlySet<string>, rangeId: ReportRangeId, source?: Date): ReportData`

- [ ] **Step 1: Write failing range and timezone tests**

Add fixed-date tests asserting:

```ts
expect(reportsFetchSince(new Date("2026-09-30T18:30:00.000Z"))).toBe("2025-11-01");

const week = buildReport(expenseFixtures, activeIds, "week", new Date("2026-09-30T18:30:00.000Z"));
expect(week.currentFrom).toBe("2026-09-25");
expect(week.currentToExclusive).toBe("2026-10-02");
expect(week.previousFrom).toBe("2026-09-18");
expect(week.buckets).toHaveLength(7);

const month = buildReport(expenseFixtures, activeIds, "month", new Date("2027-01-15T05:00:00.000Z"));
expect([month.currentFrom, month.previousFrom]).toEqual(["2027-01-01", "2026-12-01"]);

const half = buildReport(expenseFixtures, activeIds, "half", new Date("2027-02-10T05:00:00.000Z"));
expect([half.currentFrom, half.previousFrom]).toEqual(["2026-09-01", "2026-03-01"]);
expect(half.buckets).toHaveLength(6);
```

- [ ] **Step 2: Run the model test and verify the missing module failure**

Run from `apps/mobile`: `npx vitest run --config vitest.config.ts test/reports-model.test.ts`

Expected: FAIL because `src/features/reports/model.ts` does not exist.

- [ ] **Step 3: Implement range boundaries and buckets**

Implement `reportsFetchSince` and `buildReport` with half-open `YYYY-MM-DD` ranges. Convert `source` through `vietnamNow` once, build calendar boundaries with existing date helpers, and preserve zero-valued buckets. Use labels/notes `Tuần này`/`tuần này`, `Tháng này`/`tháng này`, and `6 tháng`/`6 tháng`. Week and six-month reports initially select their last bucket; month selects the seven-day bucket containing the Vietnam calendar day.

- [ ] **Step 4: Run the range tests and verify they pass**

Run from `apps/mobile`: `npx vitest run --config vitest.config.ts test/reports-model.test.ts`

Expected: PASS for range and timezone tests.

- [ ] **Step 5: Add failing aggregation tests**

Use fixtures containing expenses, deposits, active jars, a deactivated jar, and an empty range. Assert:

```ts
expect(report.total).toBe(450_000);
expect(report.previousTotal).toBe(300_000);
expect(report.delta).toBe(150_000);
expect(report.buckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(report.total);
expect(report.jars.map(({ name, total, count, isActive }) => ({ name, total, count, isActive }))).toEqual([
  { name: "Ăn uống", total: 300_000, count: 2, isActive: true },
  { name: "Hũ cũ", total: 150_000, count: 1, isActive: false },
]);
expect(report.jars.reduce((sum, jar) => sum + jar.percentage, 0)).toBeCloseTo(100);
expect(empty.total).toBe(0);
expect(empty.jars).toEqual([]);
expect(empty.buckets.every((bucket) => bucket.value === 0)).toBe(true);
```

Include deposits in the same jars/dates and assert none of the expected values change.

- [ ] **Step 6: Implement expense filtering and jar aggregation**

Aggregate the selected current period by transaction metadata, sort jar rows by total descending and then name for stable ties, calculate percentages only when total is positive, and derive `isActive` from `activeJarIds`.

- [ ] **Step 7: Run the complete model test**

Run from `apps/mobile`: `npx vitest run --config vitest.config.ts test/reports-model.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the report model**

```bash
git add apps/mobile/src/features/reports/model.ts apps/mobile/test/reports-model.test.ts
git commit -m "feat: add mobile report calculations"
```

### Task 2: Report query keys, fetching, and invalidation

**Files:**
- Create: `apps/mobile/src/features/finance/query-keys.ts`
- Create: `apps/mobile/test/finance-query-keys.test.ts`
- Modify: `apps/mobile/src/features/finance/hooks.ts`

**Interfaces:**
- Consumes: `reportsFetchSince(source?)` from Task 1 and `listTransactions(client, from, toExclusive?)` from `@hu/data`.
- Produces:
  - `financeKeys = { jars, transactions, reports }` with stable readonly prefixes.
  - `financeInvalidationKeys`, containing all three prefixes exactly once.
  - `useReportTransactions(): UseQueryResult<TransactionWithJar[]>` using query key `[...financeKeys.reports, since]`.
  - Existing exports and hook behavior remain compatible.

- [ ] **Step 1: Write the failing query-key test**

```ts
expect(financeKeys.reports).toEqual(["finance", "reports"]);
expect(financeInvalidationKeys).toEqual([
  financeKeys.jars,
  financeKeys.transactions,
  financeKeys.reports,
]);
expect(new Set(financeInvalidationKeys.map((key) => key.join("/"))).size).toBe(3);
```

- [ ] **Step 2: Run the query-key test and verify it fails**

Run from `apps/mobile`: `npx vitest run --config vitest.config.ts test/finance-query-keys.test.ts`

Expected: FAIL because `query-keys.ts` does not exist.

- [ ] **Step 3: Add the query-key module**

Move the existing jar and transaction keys into `query-keys.ts`, add the reports key and invalidation list, and re-export `financeKeys` from `hooks.ts` to avoid breaking current imports.

- [ ] **Step 4: Add report fetching and complete invalidation**

Implement `useReportTransactions` with `reportsFetchSince()` and `listTransactions`. Change `useFinanceInvalidation` to invalidate every entry in `financeInvalidationKeys`; this applies to jar and transaction mutations.

- [ ] **Step 5: Run query-key and existing finance-model tests**

Run from `apps/mobile`: `npx vitest run --config vitest.config.ts test/finance-query-keys.test.ts test/finance-model.test.ts`

Expected: PASS.

- [ ] **Step 6: Run the mobile typecheck**

Run from the repository root: `npm run typecheck --workspace @hu/mobile`

Expected: exit 0.

- [ ] **Step 7: Commit query plumbing**

```bash
git add apps/mobile/src/features/finance/query-keys.ts apps/mobile/src/features/finance/hooks.ts apps/mobile/test/finance-query-keys.test.ts
git commit -m "feat: query mobile report data"
```

### Task 3: Interactive accessible chart components

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `package-lock.json`
- Create: `apps/mobile/src/features/reports/report-charts.tsx`
- Create: `apps/mobile/test/report-charts.component.test.tsx`

**Interfaces:**
- Consumes: `ReportBucket` and `ReportJarRow` from Task 1; semantic tokens from `@hu/design-tokens`.
- Produces:
  - `SpendingBarChart({ buckets, initialBucketIndex }: { buckets: ReportBucket[]; initialBucketIndex: number }): ReactNode`
  - `JarShareChart({ rows, onOpenJar }: { rows: ReportJarRow[]; onOpenJar(jarId: string): void }): ReactNode`
- Library boundary: import `BarChart` and `DonutChart` only from `react-native-chart-kit/v2`.

- [ ] **Step 1: Write failing chart interaction tests**

Mock `react-native-chart-kit/v2` with pressable test doubles that invoke the supplied `interaction.onSelect` callbacks. Assert:

```ts
expect(view.getByLabelText("Biểu đồ chi tiêu theo thời gian")).toBeTruthy();
fireEvent.press(view.getByTestId("mock-bar-1"));
expect(view.getByText("T2 · 250.000 ₫")).toBeTruthy();

fireEvent.press(view.getByTestId("mock-donut-1"));
expect(view.getByText("Ăn uống · 60% · 300.000 ₫")).toBeTruthy();
```

Render one active and one inactive jar row; assert only the active row has button role and calls `onOpenJar`.

- [ ] **Step 2: Run the chart component test and verify it fails**

Run: `npm run test --workspace @hu/mobile -- --runTestsByPath test/report-charts.component.test.tsx`

Expected: FAIL because `report-charts.tsx` does not exist.

- [ ] **Step 3: Install Expo-compatible chart dependencies**

Run `npm install react-native-chart-kit@7.0.4 --workspace @hu/mobile` from the repository root.

Run `npx expo install react-native-svg@15.15.4` from `apps/mobile`.

Expected: `apps/mobile/package.json` and root `package-lock.json` contain Chart Kit 7.0.4 and React Native SVG 15.15.4 without unrelated dependency downgrades.

- [ ] **Step 4: Implement the bar chart adapter**

Map buckets to `{ key, label, value }`, use `interaction.mode = "tap"`, display the selected bucket as visible formatted VND text, set `accessibilityLabel`, derive chart width from container layout without horizontal overflow, and disable `selectionAnimation` when `AccessibilityInfo.isReduceMotionEnabled()` resolves true.

- [ ] **Step 5: Implement the donut and ranked-list adapter**

Use `valueKey="total"`, `labelKey="name"`, `colorKey="color"`, controlled tap selection, and a center label for the selected jar. Disable the library legend because the ranked list is the accessible legend. Render the complete ranked list below; active rows use button role and inactive rows render as non-interactive text rows. Format visible percentages with `Math.round` and retain full-precision percentages in the report model.

- [ ] **Step 6: Add reduced-motion and narrow-width assertions**

Mock `AccessibilityInfo.isReduceMotionEnabled` to `true`, emit a 320-point layout, and assert both chart test doubles receive finite widths no greater than the container plus `selectionAnimation={false}`.

- [ ] **Step 7: Run chart component tests**

Run: `npm run test --workspace @hu/mobile -- --runTestsByPath test/report-charts.component.test.tsx`

- [ ] **Step 8: Run mobile lint**

Run from the repository root: `npm run lint --workspace @hu/mobile`

Expected: exit 0.

- [ ] **Step 9: Run mobile typecheck**

Run from the repository root: `npm run typecheck --workspace @hu/mobile`

Expected: exit 0.

- [ ] **Step 10: Commit the chart components**

```bash
git add apps/mobile/package.json package-lock.json apps/mobile/src/features/reports/report-charts.tsx apps/mobile/test/report-charts.component.test.tsx
git commit -m "feat: add interactive mobile report charts"
```

### Task 4: Reports screen composition and user states

**Files:**
- Create: `apps/mobile/src/features/reports/report-sections.tsx`
- Modify: `apps/mobile/src/app/(tabs)/reports.tsx`
- Create: `apps/mobile/test/reports-screen.component.test.tsx`

**Interfaces:**
- Consumes: `buildReport`, `ReportRangeId`, and the chart components from Tasks 1 and 3; `useJars` and `useReportTransactions` from Task 2.
- Produces: the complete Reports tab with range selection, summary, charts, state handling, refresh, and navigation.
- `ReportRangeSelector({ value, onChange })` and `ReportSummary({ report })` live in `report-sections.tsx`; screen-only query composition stays in `reports.tsx`.

- [ ] **Step 1: Write failing default and range-switch tests**

Mock finance hooks with fixed transactions/jars and mock the two chart adapters. Assert:

```ts
expect(view.getByText("Báo cáo")).toBeTruthy();
expect(view.getByRole("radio", { name: "Tháng này" }).props.accessibilityState.selected).toBe(true);
expect(view.getByText("Đã chi tháng này")).toBeTruthy();

fireEvent.press(view.getByRole("radio", { name: "Tuần này" }));
expect(view.getByText("Đã chi tuần này")).toBeTruthy();

fireEvent.press(view.getByRole("radio", { name: "6 tháng" }));
expect(mockBarChart.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ buckets: expect.any(Array) }));
```

- [ ] **Step 2: Run the screen test and verify the placeholder failure**

Run: `npm run test --workspace @hu/mobile -- --runTestsByPath test/reports-screen.component.test.tsx`

Expected: FAIL because the current screen only renders the release-placeholder copy.

- [ ] **Step 3: Implement range controls and summary**

Create a radio-group-style three-option selector with 44-point targets. Render total VND and signed delta; use warning treatment when spending increased, success when it decreased, and neutral copy when unchanged.

- [ ] **Step 4: Compose the loaded Reports screen**

Default to `rangeId = "month"`, memoize `activeJarIds` and `buildReport`, render both chart components, navigate active rows with `router.push({ pathname: "/jars/[id]", params: { id } })`, and use a refresh control that refetches transactions and jars together.

- [ ] **Step 5: Add failing loading, error, empty, refresh, and inactive-navigation tests**

Assert:

```ts
expect(loadingView.getByText("Đang tổng hợp báo cáo…")).toBeTruthy();
fireEvent.press(errorView.getByRole("button", { name: "Thử lại" }));
expect(refetchTransactions).toHaveBeenCalledTimes(1);
expect(refetchJars).toHaveBeenCalledTimes(1);
expect(emptyView.getByText("Chưa có khoản chi trong kỳ này")).toBeTruthy();
fireEvent.press(emptyView.getByRole("button", { name: "Ghi giao dịch" }));
expect(mockPush).toHaveBeenCalledWith("/transactions/new");
expect(inactiveView.queryByRole("button", { name: /Hũ cũ/ })).toBeNull();
```

Invoke the refresh callback and assert both query refetch functions run while the selected range stays unchanged.
Rerender the switched-range screen with a query error, invoke retry, and assert the same range remains selected.
Rerender the switched-range screen with a query error, invoke retry, and assert the same range remains selected.

- [ ] **Step 6: Implement all screen states**

Use the existing `LoadingScreen`, `ErrorState`, `EmptyState`, `Screen`, and `RefreshControl` patterns. Preserve range state across errors/refetches and keep zero buckets out of the empty-state decision: emptiness is `report.total === 0`.

- [ ] **Step 7: Run targeted Reports component tests**

Run: `npm run test --workspace @hu/mobile -- --runTestsByPath test/reports-screen.component.test.tsx test/report-charts.component.test.tsx`

- [ ] **Step 8: Run the complete mobile test suite**

Run: `npm run test --workspace @hu/mobile`

Expected: PASS for all suites in both commands.

- [ ] **Step 9: Commit the Reports screen**

```bash
git add 'apps/mobile/src/app/(tabs)/reports.tsx' apps/mobile/src/features/reports/report-sections.tsx apps/mobile/test/reports-screen.component.test.tsx
git commit -m "feat: build mobile reports screen"
```

### Task 5: Native smoke coverage, documentation, and delivery gates

**Files:**
- Create: `apps/mobile/.maestro/reports.yaml`
- Modify: `docs/testing.md`

**Interfaces:**
- Consumes: stable accessibility labels and visible copy from Task 4.
- Produces: a repeatable native Reports smoke flow and updated release instructions.

- [ ] **Step 1: Add the Maestro Reports flow**

Create an authenticated flow that launches cleanly, signs in with `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD`, opens `Báo cáo`, asserts `Tháng này`, selects `Tuần này`, then selects `6 tháng`. Do not assert mutable monetary values.

- [ ] **Step 2: Document the Reports release gate**

Update `docs/testing.md` to name `apps/mobile/.maestro/reports.yaml`, require an isolated non-production account, and record manual VoiceOver/TalkBack checks for range controls, selected chart values, and jar rankings.

- [ ] **Step 3: Run the complete unit/component gate**

Run from the repository root: `npm run test:unit`

Expected: exit 0.

- [ ] **Step 4: Run the complete typecheck gate**

Run from the repository root: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: Run the complete lint gate**

Run from the repository root: `npm run lint`

Expected: exit 0.

- [ ] **Step 6: Run the timezone gate**

Run from the repository root: `npm run check:tz`

Expected: exit 0 and a Vietnam-date success message.

- [ ] **Step 7: Run the mobile secret gate**

Run from the repository root: `npm run check:secrets`

Expected: exit 0 with no server-only secret references.

- [ ] **Step 8: Run the protected browser regression gate**

With the explicitly isolated Supabase E2E project variables required by `playwright.config.ts`, run from the repository root: `npm run test:e2e -- --project=chromium`

Expected: Chromium Playwright tests pass. Do not point this command at production; missing isolated credentials block completion of this required regression gate.

- [ ] **Step 9: Check Expo dependency versions**

Run from `apps/mobile`: `npx expo install --check`

Expected: dependencies are up to date.

- [ ] **Step 10: Run Expo Doctor**

Run from `apps/mobile`: `npx expo-doctor`

Expected: all checks pass.

- [ ] **Step 11: Export the iOS bundle**

Run from `apps/mobile` with non-production placeholder values and a fresh temporary output directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-placeholder-publishable-key npx expo export --platform ios --output-dir /tmp/hu-reports-ios
```

Expected: the iOS export completes successfully.

- [ ] **Step 12: Export the Android bundle**

Run from `apps/mobile` with non-production placeholder values and a fresh temporary output directory:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ci-placeholder-publishable-key npx expo export --platform android --output-dir /tmp/hu-reports-android
```

Expected: the Android export completes successfully.

- [ ] **Step 13: Run native smoke tests when simulators are available**

Run on one iPhone Simulator and one Android Emulator:

Run from `apps/mobile`: `maestro test .maestro/reports.yaml`

Expected: both platform runs pass. If the environment lacks a simulator, emulator, Maestro, or isolated credentials, record this gate as pending rather than claiming it passed.

- [ ] **Step 14: Perform the final manual accessibility review**

With VoiceOver and TalkBack, verify the range controls announce selected state, selected bar/donut values have readable text equivalents, active jars announce as buttons, inactive jars do not, and reduced-motion mode removes chart selection animation.

- [ ] **Step 15: Commit test documentation**

```bash
git add apps/mobile/.maestro/reports.yaml docs/testing.md
git commit -m "test: cover mobile reports delivery"
```

- [ ] **Step 16: Record final evidence for reviewer handoff**

Capture the exact commands, exit codes, any simulator/manual gates that remain pending, dependency delta, and `git status --short`. Do not mark the feature complete while a required automated gate is failing.

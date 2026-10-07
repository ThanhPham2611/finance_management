# Mobile Reports Design

**Date:** 2026-10-01  
**Status:** Approved in conversation; awaiting written-spec review  
**Target:** Expo iOS/Android application in `apps/mobile`  

## Goal

Replace the placeholder mobile Reports tab with a release-ready spending report. The screen helps a user understand spending over time and by jar without expanding mobile v1 into household reporting, sharing, or data export.

## Scope

Mobile Reports v1 includes:

- Week, current-month, and six-month ranges.
- Current-period expense total and comparison with the preceding equivalent period.
- An interactive bar chart for spending over time.
- An interactive donut chart and ranked list for spending by jar.
- Loading, empty, error, retry, and pull-to-refresh states.
- Navigation from an active jar row to that jar's detail screen.
- Unit, component, and native smoke-test coverage.

Mobile Reports v1 excludes:

- Deposits from every report metric.
- Household/personal scope filters.
- CSV or image export.
- AI-generated analysis or recommendations.
- Editing transactions from the Reports screen.
- Changes to the existing web Reports implementation.

## Library Decision

Use the public v2 API of `react-native-chart-kit` with the Expo-compatible `react-native-svg` version.

This provides native bar and donut/pie visualizations, tap selection, and tooltips without introducing the Skia dependency and configuration required by Victory Native. Dependencies must be installed through Expo-compatible commands and validated with `expo install --check` and `expo-doctor`.

References:

- React Native Chart Kit: https://github.com/chart-kit/react-native-chart-kit
- Expo React Native SVG: https://docs.expo.dev/versions/v57.0.0/sdk/svg/

## Information Architecture

The Reports tab remains one vertically scrollable screen:

1. Page title and supporting description.
2. Segmented range selector: `Tuần này`, `Tháng này`, `6 tháng`.
3. Summary card with the current-period total and change from the preceding period.
4. Interactive bar chart for the selected range.
5. Interactive donut chart for jar share in the selected range.
6. Ranked jar list with amount and percentage.

Both charts and the jar list respond to the selected range. This avoids showing a month-only breakdown while another period is selected.

## Interaction and Accessibility

- Each range control has a minimum 44-point touch target, an accessible role, and selected state.
- Tapping a bar selects it, highlights it, and displays its exact label and formatted VND amount.
- The selected chart value is also rendered as text so it is not available only through graphics.
- The donut chart is accompanied by the complete ranked jar list. Color is supplementary; names, amounts, and percentages carry the meaning.
- Active jar rows are buttons and navigate to `/jars/[id]`.
- Deactivated jar rows remain visible but are not interactive.
- Chart motion is subtle and disabled when the operating system requests reduced motion.
- Empty, error, and loading content occupies a stable content area to reduce layout movement.
- VoiceOver and TalkBack verification is part of release QA.

## Data Flow

### Fetching

Add a reports query under the existing finance feature. It fetches transactions from the first day of the month eleven months before the current month. This supplies the current six-month period and its preceding six-month comparison period.

The query also uses the active jar list already available to mobile. Transaction join metadata supplies the name and color for historical transactions whose jar has since been deactivated.

### Query keys and invalidation

Add `financeKeys.reports`. Successful transaction creation, update, or deletion invalidates:

- `financeKeys.jars`
- `financeKeys.transactions`
- `financeKeys.reports`

Jar updates or deactivation also invalidate reports because jar labels, colors, and active navigation state may change.

### Pure report model

Create a mobile report model composed of deterministic pure functions. Every date-sensitive entry point accepts a `now` value so tests do not depend on the machine clock.

The model returns:

- Range identifier, label, current-period bounds, and previous-period bounds.
- Bucket labels, values, and the initially selected bucket.
- Current total, previous total, and signed delta.
- Jar rows containing jar id, display name, color, total, percentage, transaction count, and active state.

Only transactions with `type === "expense"` enter these calculations.

### Range definitions

- **Week:** the latest seven calendar days including today, compared with the preceding seven calendar days. One bar per day.
- **Month:** the current calendar month, compared with the previous calendar month. Bars group days into sequential seven-day buckets.
- **Six months:** the current calendar month and five preceding months, compared with the six months before those. One bar per month.

All date boundaries and labels use the existing Vietnam timezone helpers from `@hu/domain`.

## UI Components

Keep chart-specific presentation separate from calculation logic:

- `ReportRangeSelector`: accessible three-option segmented control.
- `ReportSummary`: total and signed comparison with semantic success/warning treatment.
- `SpendingBarChart`: adapts report buckets to Chart Kit v2 and manages selected-bar presentation.
- `JarShareChart`: adapts jar totals to a donut chart and renders the accessible ranked list.
- `ReportsScreen`: owns range selection, queries, refresh behavior, and state composition.

Components use existing semantic design tokens. Raw colors are permitted only for user-defined jar colors and library configuration values derived from semantic tokens.

## State and Error Handling

- Initial loading shows a stable loading surface with a Vietnamese progress label.
- Pull-to-refresh refetches report transactions and active jars together.
- A query failure shows the error state and retry action while preserving the selected range.
- A selected range with no expenses shows an empty state and a `Ghi giao dịch` action linking to `/transactions/new`.
- Zero-valued buckets remain visible so the time axis is not misleading.
- If one deactivated jar has historical transactions, it remains in totals and the ranked list but has no detail navigation action.
- Mutation invalidation refreshes the report after the user returns from creating or editing a transaction.

## Testing Strategy

### Unit tests

Cover the pure report model with fixed dates and fixtures:

- Seven-day and preceding-seven-day boundaries.
- Current and previous calendar month boundaries, including year rollover.
- Current and preceding six-month boundaries, including year rollover.
- Vietnam timezone behavior near UTC day boundaries.
- Expense totals and deposit exclusion.
- Zero-data and zero-valued buckets.
- Jar percentages, ranking, transaction counts, and deactivated jars.
- Deterministic signed comparison values.

### Component tests

Mock only the native chart renderer boundary. Verify application behavior:

- Default month selection and rendered summary.
- Switching among all three ranges updates both chart adapters and totals.
- Selecting a bar exposes its exact textual value.
- Empty, loading, error, retry, and refresh behavior.
- Active jar navigation and non-interactive deactivated jar rows.
- Accessible roles, labels, and selected states.
- Reduced-motion behavior.

Avoid large visual snapshots of third-party chart internals.

### Native smoke tests

Extend Maestro coverage to:

- Open the Reports tab after authentication.
- Confirm the report screen and default month range.
- Change to week and six-month ranges.
- Exercise the empty state when using an isolated account without expenses, if a deterministic fixture account is available.

Exact monetary assertions are not required in Maestro because test-project data can change. Model and component tests own numeric correctness.

## Delivery Gates

Before review completion, run:

- Mobile and root lint.
- Root and workspace type checks.
- Root and mobile unit/component tests.
- Timezone check.
- Mobile secret scan.
- `expo install --check` from `apps/mobile`.
- `expo-doctor` from `apps/mobile`.
- Expo exports for iOS and Android with non-production placeholder environment values.

Before store release, run the Maestro Reports flow on at least one iPhone Simulator and one Android Emulator, then manually verify VoiceOver and TalkBack reading order and chart fallback text.

## Review Responsibilities

Claude acts as the implementer after an implementation plan is approved. Codex reviews each implementation batch for scope, data correctness, accessibility, dependency impact, tests, documentation, and native export health. Any review finding is returned to the same Claude session for correction before the work is accepted.

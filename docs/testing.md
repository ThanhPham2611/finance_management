# Testing and release gates

## Fast local gate

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run check:tz`, and `npm run build`. Mobile tests combine Vitest logic tests with `jest-expo` component tests. Native bundle checks use `npx expo export --platform ios` and `--platform android` from `apps/mobile`.

## Supabase test project

Browser E2E mutates data and refuses to start unless `E2E_ALLOW_MUTATIONS=true`, `E2E_SUPABASE_URL` exactly matches `NEXT_PUBLIC_SUPABASE_URL`, and two test accounts are configured. Never point these variables at production or a developer's personal project. The suite includes a direct owner-versus-outsider RLS contract.

Visual tests are read-only but require the same explicitly declared test project. After intentional UI changes, run `npm run test:visual:update`, review snapshots at 320, 375, 768, 1024, and 1440 pixels, commit the approved baselines, then set the CI secret `VISUAL_BASELINES_READY=true`.

## Native E2E

Install Maestro, build/install the Expo development app with id `vn.hu.finance`, set `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD` for an isolated test account, then run `npm run e2e --workspace @hu/mobile`. The transaction flow writes data, so it must not use production. Run all flows on at least one iPhone simulator and one Android emulator before store submission.

### Running Maestro on an iOS simulator

1. `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro` (pulls in `openjdk`, which is keg-only: `export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home PATH="$JAVA_HOME/bin:$PATH"`).
2. Build a **Release** app so the JS bundle is embedded (a dev client opens the launcher screen and breaks `launchApp`): `cd apps/mobile && npx expo run:ios --configuration Release --no-bundler --device <simulator>`. If `pod install` complains about a changed local podspec after an Expo upgrade, run `pod update --no-repo-update` in `apps/mobile/ios`.
3. `export MAESTRO_TEST_EMAIL=… MAESTRO_TEST_PASSWORD=…` and `maestro --device <simulator> test .maestro` from `apps/mobile`. Pass `--test-output-dir` somewhere outside the repo: the debug output (`commands.json`) records these variables in plain text.

Flow gotchas on iOS: element text is the accessibility label, so rows read like `Ăn uống, Còn 478.000 ₫…` (match with `"Ăn uống.*"`), tabs read `Giao dịch, tab, 3 of 5` (`"Giao dịch, tab.*"`), and the keyboard hides the field/button below it. The shared `subflows/sign-in.yaml` handles sign-in (including the iOS "Lưu mật khẩu?" prompt); `hideKeyboard` is unreliable, so tap a static text instead.

### Mobile flows

All flows sign in with `MAESTRO_TEST_EMAIL` / `MAESTRO_TEST_PASSWORD`, so they need an isolated account. The two write flows clean up after themselves, except that `jars-presets` can only archive the jar it creates (archived jars stay in the database).

| Flow | Writes data | What it covers |
| --- | --- | --- |
| `auth-and-navigation.yaml` | no | Sign-in and the five tabs |
| `transactions-filter-calendar.yaml` | no | Month back/forward, search with no match, Calendar view |
| `reports.yaml` | no | Report ranges (no monetary assertions) |
| `create-transaction.yaml` | yes | Create an expense, see the saved summary, find it in the jar history |
| `jars-presets.yaml` | yes | Create a jar with the wizard, then archive it |

Screens that need two accounts (sharing invites, household invites) are covered by the `@hu/data` unit tests and the web two-party Playwright spec; check the mobile side by hand on two devices before release.

New native modules (`@react-native-community/datetimepicker`, `react-native-svg`) mean the development app must be rebuilt (`npm run ios` / `npm run android` in `apps/mobile`) before running these flows.

### Reports release gate

Run `maestro test .maestro/reports.yaml` from `apps/mobile` on one iPhone simulator and one Android emulator. The flow signs in with `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD`, opens `Báo cáo`, asserts `Tháng này`, then selects `Tuần này` and `6 tháng`. It requires an isolated non-production account and deliberately asserts no monetary values.

Record these manual VoiceOver (iOS) and TalkBack (Android) checks before release:

- Range controls announce their selected state.
- Selected bar and donut values have readable text equivalents.
- Active jar rankings announce as buttons; inactive jars do not.
- With reduced motion enabled, chart selection animation is removed.

## Known dependency audit limitation

The current Expo SDK 57 toolchain reports transitive advisories in Expo CLI/router packages. Do not apply npm's suggested forced downgrade to Expo 46. CI fails on critical advisories; review moderate/high transitive findings during each Expo SDK upgrade.

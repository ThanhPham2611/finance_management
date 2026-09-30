# Testing and release gates

## Fast local gate

Run `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run check:tz`, and `npm run build`. Mobile tests combine Vitest logic tests with `jest-expo` component tests. Native bundle checks use `npx expo export --platform ios` and `--platform android` from `apps/mobile`.

## Supabase test project

Browser E2E mutates data and refuses to start unless `E2E_ALLOW_MUTATIONS=true`, `E2E_SUPABASE_URL` exactly matches `NEXT_PUBLIC_SUPABASE_URL`, and two test accounts are configured. Never point these variables at production or a developer's personal project. The suite includes a direct owner-versus-outsider RLS contract.

Visual tests are read-only but require the same explicitly declared test project. After intentional UI changes, run `npm run test:visual:update`, review snapshots at 320, 375, 768, 1024, and 1440 pixels, commit the approved baselines, then set the CI secret `VISUAL_BASELINES_READY=true`.

## Native E2E

Install Maestro, build/install the Expo development app with id `vn.hu.finance`, set `MAESTRO_TEST_EMAIL` and `MAESTRO_TEST_PASSWORD` for an isolated test account, then run `npm run e2e --workspace @hu/mobile`. The transaction flow writes data, so it must not use production. Run both flows on at least one iPhone simulator and one Android emulator before store submission.

## Known dependency audit limitation

The current Expo SDK 57 toolchain reports transitive advisories in Expo CLI/router packages. Do not apply npm's suggested forced downgrade to Expo 46. CI fails on critical advisories; review moderate/high transitive findings during each Expo SDK upgrade.

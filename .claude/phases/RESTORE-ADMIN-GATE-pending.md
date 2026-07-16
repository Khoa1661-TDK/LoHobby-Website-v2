# Restore Admin Google-Provider Gate
Status: PENDING

## Goal
Re-enable the Google-only admin recognition that was temporarily bypassed for
raw-IP testing (DECISIONS.md 2026-07-17), once the site runs on a domain with
TLS and Google sign-in works on the deployed host.

## Tasks
- [ ] Set up domain + TLS (Caddy service; `docker/Caddyfile` exists) and point
      `APP_URL` at the https domain
- [ ] Add `https://<domain>/api/auth/callback/google` as an authorized redirect
      URI in Google Cloud Console; verify Google sign-in works on the site
- [ ] Remove `ALLOW_CREDENTIALS_ADMIN: "true"` from the Portainer stack env and
      recreate the app container
- [ ] Delete `isCredentialsAdminAllowed()` from `lib/feature-flags.ts` and the
      bypass branch in `lib/admin.ts` (restore the plain
      `if (user.provider !== 'google') return null;`)
- [ ] Drop the two `ALLOW_CREDENTIALS_ADMIN` test cases in
      `lib/__tests__/admin-guard.test.ts`
- [ ] Also flip `REQUIRE_EMAIL_VERIFICATION` back to `true` in the stack env
      (same unlock condition — verification links need a real `APP_URL`;
      DECISIONS.md 2026-07-15)

## Acceptance Criteria
- Signing in with email/password and visiting /admin shows the "admin requires
  Google" message, never the admin panel
- Signing in with Google using the `ADMIN_EMAILS` account opens /admin on the
  production domain
- `grep -r ALLOW_CREDENTIALS_ADMIN` over the repo returns nothing

## Decisions Made This Phase
(append as you go)

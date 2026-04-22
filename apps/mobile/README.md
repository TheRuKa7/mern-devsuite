# @mern-devsuite/mobile

Lightweight Expo companion for mern-devsuite. Owners and admins can check
workspaces, audit log, and invoices on the go; the full admin surface stays on
the web app.

## Screens

| Route              | Purpose                                           |
|--------------------|---------------------------------------------------|
| `/sign-in`         | Email + password auth                             |
| `/(tabs)/`         | Workspace picker — tap to set active              |
| `/(tabs)/audit`    | Hash-chained audit log (prev → row hash visible)  |
| `/(tabs)/billing`  | Invoices; tap opens Stripe hosted URL             |
| `/(tabs)/account`  | Profile + sign out                                |

## Auth model

- `lib/store.ts` persists `accessToken` + `currentWorkspaceId` in AsyncStorage.
- `lib/api.ts` injects `Authorization: Bearer` and `X-Workspace-Id` on every call.
- A route guard in `_layout.tsx` redirects unauthenticated users to `/sign-in`.

## Run

```bash
cd apps/mobile
pnpm install
pnpm start
pnpm ios | pnpm android
```

Point the API base URL at your `apps/api` dev server (default
`http://10.0.2.2:3000` for Android emulator, `http://localhost:3000` for iOS).

## Contract

The client mirrors these API routes:

- `POST /auth/sign-in`
- `GET  /me`
- `GET  /workspaces`
- `GET  /audit?limit=...`
- `GET  /billing/invoices`

Zod schemas in `lib/types.ts` must track the backend shape.

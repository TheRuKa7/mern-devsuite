/**
 * Client-side providers. Today it's just Auth.js's SessionProvider, but
 * this is where a theme provider, analytics SDK, or toast context would
 * land so `layout.tsx` stays pure-server.
 */
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

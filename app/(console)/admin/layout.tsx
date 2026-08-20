// app/(console)/admin/layout.tsx
//
// Layout for the custom admin console. Deliberately a SEPARATE route group from
// (payload): serving /admin/console from here rather than from app/(payload)/admin
// keeps the console out of Payload's RootLayout, so it does not render inside
// Payload's own sidebar/header and does not inherit @payloadcms/next/css. The
// console is meant to replace that chrome, not nest inside it.
//
// The cost of leaving that group is the auth gate, which app/(payload)/layout.tsx
// provides for everything under it. It is reproduced below against the same two
// helpers, so both surfaces stay in step: an operator who can reach /admin can
// reach the console, and no one else can.
//
// The root app/layout.tsx is a pass-through, so this group owns its own
// <html>/<body>. data-admin is what activates the token scope in admin-theme.css.
import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { getAdminUser } from '@/lib/admin';
import { getPayloadAdminUser } from '@/lib/payload-admin-sync';
import { AppShell } from '@/components/console/AppShell';
import '../../globals.css';
import '../../admin-theme.css';

export const dynamic = 'force-dynamic';

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/login?callbackUrl=/admin/console');
  }

  // Payload writes are performed as a Payload user; without the linked account
  // every write from the console would fail at the access layer rather than at
  // the door. Same handshake the Payload admin uses.
  const payloadUser = await getPayloadAdminUser();
  if (!payloadUser) {
    redirect('/api/admin-connect?return=/admin/console');
  }

  return (
    <html lang="vi" suppressHydrationWarning>
      <body data-admin>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

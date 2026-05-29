// app/(payload)/layout.tsx
/* eslint-disable @next/next/no-head-element */
import config from '@payload-config';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { redirect } from 'next/navigation';
import type { ServerFunctionClient } from 'payload';
import type { ReactElement, ReactNode } from 'react';
import { getAdminUser } from '@/lib/admin';
import { getPayloadAdminUser } from '@/lib/payload-admin-sync';
import { importMap } from './admin/importMap.js';
import '@payloadcms/next/css';
import './custom.scss';

export const dynamic = 'force-dynamic';

type Args = Parameters<ServerFunctionClient>[0];

const serverFunction: ServerFunctionClient = async function (args: Args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

export default async function PayloadAppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/login?callbackUrl=/admin');
  }

  const payloadUser = await getPayloadAdminUser();
  if (!payloadUser) {
    redirect('/api/admin-connect?return=/admin');
  }

  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  );
};

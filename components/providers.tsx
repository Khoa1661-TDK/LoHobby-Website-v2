// components/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactElement, ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }): ReactElement {
  return <SessionProvider>{children}</SessionProvider>;
}

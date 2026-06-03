// i18n/navigation.ts — locale-aware navigation helpers.
// Use these instead of next/link + next/navigation inside storefront components
// so the active locale prefix is applied automatically.
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

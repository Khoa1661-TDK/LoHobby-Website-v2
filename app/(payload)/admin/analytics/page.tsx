import { redirect } from 'next/navigation';

/** ShopNex analytics plugin replaces this page with the admin dashboard. */
export default function LegacyAnalyticsRedirect() {
  redirect('/admin');
}

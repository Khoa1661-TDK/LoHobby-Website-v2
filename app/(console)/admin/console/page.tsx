import { redirect } from 'next/navigation';

/** Legacy hub — ShopNex sidebar + analytics dashboard live at /admin */
export default function LegacyHubRedirect() {
  redirect('/admin');
}

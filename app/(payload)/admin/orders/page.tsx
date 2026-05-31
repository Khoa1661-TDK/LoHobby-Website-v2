import { redirect } from 'next/navigation';

export default function LegacyAdminOrdersRedirect() {
  redirect('/admin/collections/orders');
}

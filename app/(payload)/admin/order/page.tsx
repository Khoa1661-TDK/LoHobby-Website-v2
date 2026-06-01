import { redirect } from 'next/navigation';

export default function AdminOrderSingularRedirect() {
  redirect('/admin/collections/orders');
}

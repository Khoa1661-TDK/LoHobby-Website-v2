import { redirect } from 'next/navigation';

export default function LegacyCatalogToolsRedirect() {
  redirect('/admin/collections/products');
}

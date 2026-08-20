// app/(console)/admin/console/customers/page.tsx
//
// Customers (board 15a). Server component; the AppShell chrome comes from the
// group layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { CustomerList } from '@/components/console/customers/CustomerList';
import { listCustomerRows } from '@/lib/console/customers';

export default async function CustomersPage() {
  const rows = await listCustomerRows();
  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader title="Khách hàng" />
      <CustomerList rows={rows} />
    </div>
  );
}

// app/(console)/admin/console/categories/page.tsx
//
// Categories (board 12, wireframe). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { CategoryList } from '@/components/console/categories/CategoryList';
import { listCategoryRows } from '@/lib/console/categories';

export default async function CategoriesPage() {
  const rows = await listCategoryRows();
  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader title="Danh mục" />
      <CategoryList rows={rows} />
      <div className="text-[11px] text-[var(--adm-ink-4)]">
        Kéo để sắp xếp lại / đổi cấp cha
      </div>
    </div>
  );
}

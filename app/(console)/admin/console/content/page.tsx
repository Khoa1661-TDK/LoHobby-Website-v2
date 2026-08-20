// app/(console)/admin/console/content/page.tsx
//
// Content — pages & redirects (boards 13a + 13c). Server component; the
// AppShell chrome comes from the group layout, so this page only supplies the
// content stack. The tab strip is the one client component; the two panels are
// server components passed as children, so the client boundary stays minimal.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { Button } from '@/components/console/ui/Button';
import { ContentTabs } from '@/components/console/content/ContentTabs';
import { PagesList } from '@/components/console/content/PagesList';
import { RedirectsList } from '@/components/console/content/RedirectsList';
import { listPageRows, listRedirectRows } from '@/lib/console/content';

export default async function ContentPage() {
  const [pageRows, redirectRows] = await Promise.all([listPageRows(), listRedirectRows()]);

  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader title="Nội dung" />
      <ContentTabs
        panels={{
          pages: (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center">
                <div className="text-[18px] font-bold text-[var(--adm-ink)]">Trang</div>
                <div className="ml-auto">
                  <Button variant="primary">Mở trong trình tạo trang</Button>
                </div>
              </div>
              <PagesList rows={pageRows} />
            </div>
          ),
          redirects: (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center">
                <div className="text-[18px] font-bold text-[var(--adm-ink)]">Chuyển hướng</div>
                <div className="ml-auto">
                  <Button variant="primary">Thêm</Button>
                </div>
              </div>
              <RedirectsList rows={redirectRows} />
            </div>
          ),
        }}
      />
    </div>
  );
}

// app/(console)/admin/console/settings/page.tsx
//
// Settings (board 17). Server component; the AppShell chrome comes from the
// group layout, so this page only supplies the content. The settings rail
// groups by how often a setting is touched, and the "Cửa hàng & thương hiệu"
// panel is the first group item.

import { SettingsNav } from '@/components/console/settings/SettingsNav';
import { BrandPanel } from '@/components/console/settings/BrandPanel';
import { getBrandFacts } from '@/lib/console/settings';

export default async function SettingsPage() {
  const facts = await getBrandFacts();

  return (
    <div className="flex min-h-full gap-7">
      <SettingsNav activeId="store-brand" />
      <div className="min-w-0 flex-1">
        <BrandPanel facts={facts} />
      </div>
    </div>
  );
}

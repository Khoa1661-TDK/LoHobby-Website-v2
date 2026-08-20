// components/console/settings/SettingsNav.tsx
//
// Settings navigation rail (board 17). The groups are ordered by how often the
// setting is touched, not by the table it lives in — that ordering IS the
// design, so the group order and headings are kept exactly as drawn. The
// rail is presentational: the active item is a prop, not state.

export interface SettingsItem {
  id: string;
  label: string;
}

export interface SettingsGroup {
  id: string;
  heading: string;
  items: SettingsItem[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'frequent',
    heading: 'Thường dùng',
    items: [
      { id: 'store-brand', label: 'Cửa hàng & thương hiệu' },
      { id: 'shipping-fees', label: 'Phí vận chuyển' },
      { id: 'notifications', label: 'Thông báo' },
      { id: 'csv', label: 'Nhập/Xuất CSV' },
    ],
  },
  {
    id: 'rarely',
    heading: 'Ít khi chỉnh',
    items: [
      { id: 'payments', label: 'Phương thức thanh toán' },
      { id: 'dropshippers', label: 'Nhà cung cấp dropshipping' },
    ],
  },
];

export function SettingsNav({ activeId }: { activeId: string }) {
  return (
    <nav className="flex w-[220px] flex-none flex-col gap-4" aria-label="Cài đặt">
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--adm-ink-4)]">
            {group.heading}
          </div>
          {group.items.map((item) => {
            const active = item.id === activeId;
            return (
              <div
                key={item.id}
                className={
                  'px-2 py-2 text-[12px] ' +
                  (active
                    ? 'border-l-2 border-[var(--adm-action)] bg-[var(--adm-raised)] font-semibold text-[var(--adm-ink)]'
                    : 'font-medium text-[var(--adm-ink-2)]')
                }
              >
                {item.label}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

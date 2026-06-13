// app/profile/profile-shell.tsx
'use client';

import {
  Cog6ToothIcon,
  HeartIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useState, type ComponentType, type ReactElement, type SVGProps } from 'react';
import AccountPanel from '@/app/[locale]/(storefront)/profile/account-panel';
import AddressesPanel from '@/app/[locale]/(storefront)/profile/addresses-panel';
import OrdersPanel from '@/app/[locale]/(storefront)/profile/orders-panel';
import WishlistPanel from '@/app/[locale]/(storefront)/profile/wishlist-panel';
import type {
  ProfileAddress,
  ProfileOrder,
  ProfileTabId,
  ProfileUser,
  ProfileWishlistProduct,
} from '@/app/[locale]/(storefront)/profile/types';

type Props = {
  user: ProfileUser;
  orders: ProfileOrder[];
  addresses: ProfileAddress[];
  wishlist: ProfileWishlistProduct[];
  initialTab?: ProfileTabId;
};

type TabDef = {
  id: ProfileTabId;
  labelKey: string;
  descriptionKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const TABS: TabDef[] = [
  {
    id: 'account',
    labelKey: 'tabAccount',
    descriptionKey: 'tabAccountDesc',
    icon: Cog6ToothIcon,
  },
  {
    id: 'orders',
    labelKey: 'tabOrders',
    descriptionKey: 'tabOrdersDesc',
    icon: ShoppingBagIcon,
  },
  {
    id: 'addresses',
    labelKey: 'tabAddresses',
    descriptionKey: 'tabAddressesDesc',
    icon: MapPinIcon,
  },
  {
    id: 'wishlist',
    labelKey: 'tabWishlist',
    descriptionKey: 'tabWishlistDesc',
    icon: HeartIcon,
  },
];

export default function ProfileShell({
  user,
  orders,
  addresses,
  wishlist,
  initialTab = 'account',
}: Props): ReactElement {
  const t = useTranslations('profile');
  const [active, setActive] = useState<ProfileTabId>(initialTab);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label={t('navAriaLabel')}>
        <ul className="flex gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:flex-col lg:gap-1 lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <li key={tab.id} className="flex-1 lg:flex-none">
                <button
                  type="button"
                  onClick={() => setActive(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    isActive
                      ? 'bg-filament-500 text-white shadow-sm'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-neutral-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{t(tab.labelKey as Parameters<typeof t>[0])}</span>
                    <span
                      className={`hidden text-[11px] font-normal lg:block ${
                        isActive ? 'text-white/80' : 'text-neutral-400'
                      }`}
                    >
                      {t(tab.descriptionKey as Parameters<typeof t>[0])}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>
        {active === 'account' && <AccountPanel user={user} />}
        {active === 'orders' && <OrdersPanel orders={orders} />}
        {active === 'addresses' && <AddressesPanel addresses={addresses} />}
        {active === 'wishlist' && <WishlistPanel products={wishlist} />}
      </div>
    </div>
  );
}

'use client';

import { Link, useConfig } from '@payloadcms/ui';
import { Ticket } from 'lucide-react';
import type { ReactElement } from 'react';

const baseClass = 'nav';

/** Always-visible sidebar links for custom /admin/coupons and /admin/gift-cards routes. */
export function CommerceNavLinks(): ReactElement {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig();

  return (
    <ul className="menu">
      <li className="group open">
        <span className={`${baseClass}__link group-toggle`}>
          <Ticket size={16} />
          Commerce
        </span>
        <Link className={`${baseClass}__link sub-group-list`} href={`${adminRoute}/collections/orders`}>
          Quản lý đơn hàng
        </Link>
        <Link className={`${baseClass}__link sub-group-list`} href={`${adminRoute}/coupons`}>
          Mã giảm giá
        </Link>
        <Link className={`${baseClass}__link sub-group-list`} href={`${adminRoute}/gift-cards`}>
          Thẻ quà tặng
        </Link>
      </li>
    </ul>
  );
}

export default CommerceNavLinks;

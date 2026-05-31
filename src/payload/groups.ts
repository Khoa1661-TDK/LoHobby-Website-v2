// src/payload/groups.ts — ShopNex-style admin sidebar groups
export const groups = {
  products: { name: 'Products', icon: 'Tag' },
  content: { name: 'Content', icon: 'Image' },
  customers: { name: 'Customers', icon: 'UserRound' },
  orders: { name: 'Orders', icon: 'ShoppingCart' },
  settings: { name: 'Settings', icon: 'Settings' },
  campaigns: { name: 'Campaigns', icon: 'Target' },
} as const;

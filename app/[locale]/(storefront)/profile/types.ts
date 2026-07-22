// app/profile/types.ts
export type ProfileUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
};

export type ProfileOrderStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PENDING_ONLINE'
  | 'PENDING_TRANSFER'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type ProfileOrder = {
  id: string;
  orderCode: number;
  status: ProfileOrderStatus;
  amount: number;
  itemCount: number;
  deliveryMethod: 'SHIPMENT' | 'PICKUP' | null;
  paymentMethod: 'COD' | 'PAY_ONLINE' | null;
  shippingAddress: string | null;
  createdAt: string;
  paidAt: string | null;
  trackingNumber: string | null;
  carrierLabel: string | null;
  shipmentStatusLabel: string | null;
};

export type ProfileAddress = {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  city: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
};

export type ProfileWishlistProduct = {
  id: string;
  handle: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  price: string;
  currencyCode: string;
};

export type ProfileTabId = 'account' | 'orders' | 'addresses' | 'wishlist';

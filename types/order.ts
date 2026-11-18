import { CueConfiguration } from './cue';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_crafting'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export interface CustomerShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrRegion?: string;
  postcode: string;
  country: string;
}

export interface OrderPricingBreakdown {
  total: number;
  shaftPrice: number;
  lengthPrice: number;
  buttTimberPrice: number;
  largeSplicePrice: number;
  smallSplicePrice: number;
  largeVeneersPrice: number;
  smallVeneersPrice: number;
  endButtJoinPrice: number;
  domeJointPrice: number;
  ferrulePrice: number;
  tipPrice: number;
  platePrice: number;
  engravingPrice: number;
  miniButtPrice: number;
  extensionsPrice: number;
  currency: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId?: string;
  customer: CustomerShippingAddress;
  cue: CueConfiguration;
  pricing: OrderPricingBreakdown;
  paymentMethod: string;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

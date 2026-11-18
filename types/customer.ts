import { CustomerShippingAddress } from './order';

export interface CustomerRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  shippingAddress?: CustomerShippingAddress;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  shippingAddress?: CustomerShippingAddress;
  createdAt: string;
}

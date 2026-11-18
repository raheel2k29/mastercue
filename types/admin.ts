export interface AdminItemPrice {
  id: string;
  name: string;
  price: number;
  enabled?: boolean;
}

export interface AdminSplicePrice {
  id: string;
  name: string;
  onePrice: number;
  fourPrice: number;
  enabled?: boolean;
}

export interface AdminVeneerAssetPrice {
  layer: number;
  price: number;
  fourPrice: number;
}

export interface AdminVeneerPrice {
  id: string;
  name: string;
  enabled?: boolean;
  assets?: AdminVeneerAssetPrice[];
}

export interface AdminPlatePrice {
  id: string;
  name: string;
  price: number;
  engravingPrice?: number;
  allowEngraving?: boolean;
  enabled?: boolean;
}

export interface AdminGlobalSurcharges {
  buttJointFittingPrice: number;
  domeJointPrice: number;
  priorityCraftingPrice?: number;
  defaultCurrency: string;
}

export interface PricingConfig {
  version: number;
  lastUpdated: string;
  surcharges: AdminGlobalSurcharges;
  shafts: AdminItemPrice[];
  lengths: AdminItemPrice[];
  splices: AdminSplicePrice[];
  veneers: AdminVeneerPrice[];
  ferrules: AdminItemPrice[];
  tipSizes: AdminItemPrice[];
  namePlates: AdminPlatePrice[];
  extensions: AdminItemPrice[];
  miniButts: AdminItemPrice[];
  cases?: AdminItemPrice[];
}

import {
  PricingConfig,
  AdminItemPrice,
  AdminSplicePrice,
  AdminVeneerPrice,
  AdminPlatePrice,
} from '@/types/admin';
import {
  CUE_SHAFTS,
  CUE_LENGTHS,
  CUE_SPLICES,
  CUE_VENEERS,
  CUE_FERRULES,
  CUE_TIPS,
  CUE_PLATES,
  CUE_EXTENSIONS,
  CUE_MINI_BUTTS,
  CUE_OTHER_PRICES,
} from './cueData';

// Generate pristine default configuration from tested cueData.ts (Client & Server safe)
export function getDefaultPricingConfig(): PricingConfig {
  const buttJointFittingPrice =
    CUE_OTHER_PRICES.find((p) => p.name === 'Butt Joint')?.price ?? 12;
  const domeJointPrice =
    CUE_OTHER_PRICES.find((p) => p.name === 'Dome Joint')?.price ?? 31;

  const shafts: AdminItemPrice[] = CUE_SHAFTS.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price ?? 0,
    enabled: true,
  }));

  const lengths: AdminItemPrice[] = CUE_LENGTHS.map((l) => ({
    id: l.id,
    name: l.name,
    price: l.price ?? 0,
    enabled: true,
  }));

  const splices: AdminSplicePrice[] = CUE_SPLICES.map((s) => ({
    id: s.id,
    name: s.name,
    onePrice: s.onePrice ?? 0,
    fourPrice: s.fourPrice ?? 0,
    enabled: true,
  }));

  const veneers: AdminVeneerPrice[] = CUE_VENEERS.map((v) => ({
    id: v.id,
    name: v.name,
    enabled: true,
    assets: (v.assets || []).map((a) => ({
      layer: a.layer,
      price: a.price ?? 0,
      fourPrice: a.fourPrice ?? 0,
    })),
  }));

  const ferrules: AdminItemPrice[] = CUE_FERRULES.map((f) => ({
    id: f.id,
    name: f.name,
    price: f.price ?? 0,
    enabled: true,
  }));

  const seenTipIds = new Set<string>();
  const tipSizes: AdminItemPrice[] = [];
  for (const t of CUE_TIPS) {
    for (const ts of t.tips || []) {
      if (!seenTipIds.has(ts.id)) {
        seenTipIds.add(ts.id);
        tipSizes.push({
          id: ts.id,
          name: `${t.name} - ${ts.name}`,
          price: ts.price ?? 0,
          enabled: true,
        });
      }
    }
  }

  const namePlates: AdminPlatePrice[] = CUE_PLATES.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price ?? 0,
    engravingPrice: p.engravingPrice ?? 0,
    allowEngraving: p.allowEngraving !== false,
    enabled: true,
  }));

  const extensions: AdminItemPrice[] = CUE_EXTENSIONS.map((e) => ({
    id: e.id,
    name: e.name,
    price: e.price ?? 0,
    enabled: true,
  }));

  const miniButts: AdminItemPrice[] = CUE_MINI_BUTTS.map((m) => ({
    id: m.id,
    name: m.name,
    price: m.price ?? 0,
    enabled: true,
  }));

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    surcharges: {
      buttJointFittingPrice,
      domeJointPrice,
      priorityCraftingPrice: 40,
      defaultCurrency: '£',
    },
    shafts,
    lengths,
    splices,
    veneers,
    ferrules,
    tipSizes,
    namePlates,
    extensions,
    miniButts,
  };
}

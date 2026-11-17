'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { PricingConfig } from '@/types/admin';
import { getDefaultPricingConfig } from '@/lib/defaultPricing';
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
} from '@/lib/cueData';
import {
  CueShaft,
  CueLength,
  CueSplice,
  CueVeneer,
  CueFerrule,
  CuePlate,
  CueExtension,
  CueMiniButt,
  CueConfiguration,
} from '@/types/cue';
import { calculatePrice } from '@/lib/cueEngine';

interface DynamicCatalog {
  shafts: CueShaft[];
  lengths: CueLength[];
  splices: CueSplice[];
  veneers: CueVeneer[];
  ferrules: CueFerrule[];
  namePlates: CuePlate[];
  extensions: CueExtension[];
  miniButts: CueMiniButt[];
  surcharges: {
    buttJointFittingPrice: number;
    domeJointPrice: number;
    defaultCurrency: string;
  };
}

interface PricingContextType {
  config: PricingConfig;
  catalog: DynamicCatalog;
  loading: boolean;
  refreshPricing: () => Promise<void>;
  calculateDynamicPrice: (cue: CueConfiguration) => ReturnType<typeof calculatePrice>;
}

const PricingContext = createContext<PricingContextType | null>(null);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PricingConfig>(() => getDefaultPricingConfig());
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch dynamic pricing from backend
  const refreshPricing = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pricing', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch pricing config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.warn('Could not load dynamic pricing, using fail-safe defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPricing();
  }, []);

  // Construct dynamic catalog by merging original static items with admin prices & statuses
  const catalog = useMemo<DynamicCatalog>(() => {
    // 1. Shafts
    const shaftPriceMap = new Map(config.shafts.map((s) => [s.id, s]));
    const shafts = CUE_SHAFTS.map((s) => {
      const adminItem = shaftPriceMap.get(s.id);
      return {
        ...s,
        price: adminItem ? adminItem.price : s.price,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 2. Lengths
    const lengthPriceMap = new Map(config.lengths.map((l) => [l.id, l]));
    const lengths = CUE_LENGTHS.map((l) => {
      const adminItem = lengthPriceMap.get(l.id);
      return {
        ...l,
        price: adminItem ? adminItem.price : l.price,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 3. Splices
    const splicePriceMap = new Map(config.splices.map((sp) => [sp.id, sp]));
    const splices = CUE_SPLICES.map((sp) => {
      const adminItem = splicePriceMap.get(sp.id);
      return {
        ...sp,
        onePrice: adminItem ? adminItem.onePrice : sp.onePrice,
        fourPrice: adminItem ? adminItem.fourPrice : sp.fourPrice,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 4. Veneers
    const veneerPriceMap = new Map(config.veneers.map((v) => [v.id, v]));
    const veneers = CUE_VENEERS.map((v) => {
      const adminItem = veneerPriceMap.get(v.id);
      const assetMap = new Map((adminItem?.assets || []).map((a) => [a.layer, a]));
      return {
        ...v,
        enabled: adminItem?.enabled !== false,
        assets: (v.assets || []).map((a) => {
          const admAsset = assetMap.get(a.layer);
          return {
            ...a,
            price: admAsset ? admAsset.price : a.price,
            fourPrice: admAsset ? admAsset.fourPrice : a.fourPrice,
          };
        }),
      };
    });

    // 5. Ferrules
    const ferrulePriceMap = new Map(config.ferrules.map((f) => [f.id, f]));
    const ferrules = CUE_FERRULES.map((f) => {
      const adminItem = ferrulePriceMap.get(f.id);
      return {
        ...f,
        price: adminItem ? adminItem.price : f.price,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 6. Name Plates & Discs
    const platePriceMap = new Map(config.namePlates.map((p) => [p.id, p]));
    const namePlates = CUE_PLATES.map((p) => {
      const adminItem = platePriceMap.get(p.id);
      return {
        ...p,
        price: adminItem ? adminItem.price : p.price,
        engravingPrice: adminItem?.engravingPrice ?? p.engravingPrice,
        allowEngraving: adminItem ? adminItem.allowEngraving : p.allowEngraving,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 7. Extensions
    const extPriceMap = new Map(config.extensions.map((e) => [e.id, e]));
    const extensions = CUE_EXTENSIONS.map((e) => {
      const adminItem = extPriceMap.get(e.id);
      return {
        ...e,
        price: adminItem ? adminItem.price : e.price,
        enabled: adminItem?.enabled !== false,
      };
    });

    // 8. Mini Butts
    const miniPriceMap = new Map(config.miniButts.map((m) => [m.id, m]));
    const miniButts = CUE_MINI_BUTTS.map((m) => {
      const adminItem = miniPriceMap.get(m.id);
      return {
        ...m,
        price: adminItem ? adminItem.price : m.price,
        enabled: adminItem?.enabled !== false,
      };
    });

    return {
      shafts,
      lengths,
      splices,
      veneers,
      ferrules,
      namePlates,
      extensions,
      miniButts,
      surcharges: config.surcharges,
    };
  }, [config]);

  const calculateDynamicPrice = (targetCue: CueConfiguration) => {
    return calculatePrice(targetCue, {
      buttJointFittingPrice: catalog.surcharges.buttJointFittingPrice,
      domeJointPrice: catalog.surcharges.domeJointPrice,
    });
  };

  return (
    <PricingContext.Provider
      value={{
        config,
        catalog,
        loading,
        refreshPricing,
        calculateDynamicPrice,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const ctx = useContext(PricingContext);
  if (!ctx) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return ctx;
};

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
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
  CUE_CASES,
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
  CueCase,
  CueConfiguration,
} from '@/types/cue';
import { calculatePrice, getButtTimberAsset, isLargeSplicesAllowed } from '@/lib/cueEngine';

interface DynamicCatalog {
  shafts: CueShaft[];
  lengths: CueLength[];
  splices: CueSplice[];
  veneers: CueVeneer[];
  ferrules: CueFerrule[];
  namePlates: CuePlate[];
  extensions: CueExtension[];
  miniButts: CueMiniButt[];
  cases: CueCase[];
  surcharges: {
    buttJointFittingPrice: number;
    domeJointPrice: number;
    priorityCraftingPrice?: number;
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

  // Fetch dynamic pricing directly from PostgreSQL backed API with zero caching
  const refreshPricing = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/admin/pricing?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch pricing config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig((prev) => {
          // Only trigger state update if version or content actually changed
          if (
            prev.version === data.config.version &&
            prev.lastUpdated === data.config.lastUpdated
          ) {
            return prev;
          }
          return data.config;
        });
      }
    } catch (err) {
      console.warn('Could not load dynamic pricing, using fail-safe defaults:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refreshPricing(false);

    // 1. Cross-tab real-time sync when Admin updates pricing in another window/tab
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('mastercue-pricing');
      channel.onmessage = (event) => {
        if (event.data?.type === 'PRICING_UPDATED') {
          refreshPricing(true);
        }
      };
    }

    // 2. Tab Visibility / Focus revalidation (stale-while-revalidate when customer returns)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPricing(true);
      }
    };
    const handleFocus = () => {
      refreshPricing(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Background periodic heartbeat (every 30 seconds) across distributed devices
    const intervalId = setInterval(() => {
      refreshPricing(true);
    }, 30000);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [refreshPricing]);

  // Construct dynamic catalog by merging original static items with active DB prices & statuses
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
        engravingPrice: adminItem ? adminItem.engravingPrice : p.engravingPrice,
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

    // 9. Cases
    const casePriceMap = new Map((config.cases || []).map((c) => [c.id, c]));
    const cases = CUE_CASES.map((c) => {
      const adminItem = casePriceMap.get(c.id);
      return {
        ...c,
        bundlePrice: adminItem ? adminItem.price : c.bundlePrice,
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
      cases,
      surcharges: config.surcharges,
    };
  }, [config]);

  // Robust, 100% reactive price calculation resolving against the active database configuration
  const calculateDynamicPrice = useCallback(
    (targetCue: CueConfiguration) => {
      // 1. Shaft price lookup from dynamic catalog
      const shaftItem = catalog.shafts.find((s) => s.id === targetCue.shaft?.id);
      const shaftPrice = shaftItem ? shaftItem.price : (targetCue.shaft?.price || 0);

      // 2. Length price lookup from dynamic catalog
      const lengthItem = catalog.lengths.find((l) => l.id === targetCue.length?.id);
      const lengthPrice = lengthItem ? lengthItem.price : (targetCue.length?.price || 0);

      // 3. Butt Timber
      const timberAsset = getButtTimberAsset(targetCue);
      const buttTimberPrice = timberAsset?.price || 0;

      // 4. Splices & Veneers
      const spliceCheck = isLargeSplicesAllowed(targetCue);
      let largeSplicePrice = 0;
      let smallSplicePrice = 0;
      let largeVeneersPrice = 0;
      let smallVeneersPrice = 0;

      if (spliceCheck.allowed) {
        if (targetCue.largeSpliceMaterial) {
          const sp = catalog.splices.find((s) => s.id === targetCue.largeSpliceMaterial?.id);
          if (targetCue.largeSplices === 1) {
            largeSplicePrice = sp ? sp.onePrice : (targetCue.largeSpliceMaterial.onePrice || 0);
          } else if (targetCue.largeSplices === 4) {
            largeSplicePrice = sp ? sp.fourPrice : (targetCue.largeSpliceMaterial.fourPrice || 0);
          }
        }

        if (targetCue.smallSpliceMaterial) {
          const sp = catalog.splices.find((s) => s.id === targetCue.smallSpliceMaterial?.id);
          if (targetCue.smallSplices === 1) {
            smallSplicePrice = sp ? sp.onePrice : (targetCue.smallSpliceMaterial.onePrice || 0);
          } else if (targetCue.smallSplices === 4) {
            smallSplicePrice = sp ? sp.fourPrice : (targetCue.smallSpliceMaterial.fourPrice || 0);
          }
        }

        if (targetCue.largeSplices > 0 && targetCue.largeVeneers?.length) {
          for (const v of targetCue.largeVeneers) {
            if (v.name === 'None') continue;
            const vCat = catalog.veneers.find((cv) => cv.id === v.veneer_Id || cv.name === v.name);
            const assetDef =
              vCat?.assets?.find((a) => a.layer === v.layer) ||
              v.asset?.assets?.find((a) => a.layer === v.layer);
            if (assetDef) {
              largeVeneersPrice +=
                targetCue.largeSplices === 4 ? (assetDef.fourPrice || 0) : (assetDef.price || 0);
            }
          }
        }

        if (targetCue.smallSplices > 0 && targetCue.smallVeneers?.length) {
          for (const v of targetCue.smallVeneers) {
            if (v.name === 'None') continue;
            const vCat = catalog.veneers.find((cv) => cv.id === v.veneer_Id || cv.name === v.name);
            const assetDef =
              vCat?.assets?.find((a) => a.layer === v.layer) ||
              v.asset?.assets?.find((a) => a.layer === v.layer);
            if (assetDef) {
              smallVeneersPrice +=
                targetCue.smallSplices === 4 ? (assetDef.fourPrice || 0) : (assetDef.price || 0);
            }
          }
        }
      }

      // 5. Joint & Dome fittings
      const endButtJoinPrice = targetCue.endButtJoin ? catalog.surcharges.buttJointFittingPrice : 0;
      const domeJointPrice = targetCue.dome ? catalog.surcharges.domeJointPrice : 0;

      // 6. Ferrule
      const ferruleItem = catalog.ferrules.find((f) => f.id === targetCue.ferruleType?.id);
      const ferrulePrice = ferruleItem ? ferruleItem.price : (targetCue.ferruleType?.price || 0);

      // 7. Tip Size
      const tipItem = config.tipSizes?.find(
        (t) => t.id === targetCue.tipSize?.id || t.name === targetCue.tipSize?.name
      );
      const tipPrice = tipItem ? tipItem.price : (targetCue.tipSize?.price || 0);

      // 8. Nameplate & Engraving
      const plateItem = catalog.namePlates.find((p) => p.id === targetCue.namePlate?.id);
      const platePrice = plateItem ? plateItem.price : (targetCue.namePlate?.price || 0);
      const isCustomEngraving =
        targetCue.namePlate?.allowEngraving !== false && Boolean(targetCue.engraving?.trim());
      const engravingPrice =
        isCustomEngraving && plateItem
          ? plateItem.engravingPrice
          : isCustomEngraving
          ? targetCue.namePlate?.engravingPrice || 0
          : 0;

      // 9. Extensions
      let extensionsPrice = 0;
      if (targetCue.endButtJoin && targetCue.extensions?.length) {
        for (const ext of targetCue.extensions) {
          const extItem = catalog.extensions.find((e) => e.id === ext.id);
          extensionsPrice += extItem ? extItem.price : (ext.price || 0);
        }
      }

      // 10. Mini Butt
      let miniButtPrice = 0;
      if (targetCue.endButtJoin && targetCue.miniButt) {
        const miniItem = catalog.miniButts.find((m) => m.id === targetCue.miniButt?.id);
        miniButtPrice = miniItem ? miniItem.price : (targetCue.miniButt.price || 0);
      }

      // 11. Priority Crafting Service (within 6 weeks)
      const priorityServicePrice = targetCue.priorityService
        ? (catalog.surcharges.priorityCraftingPrice ?? 40)
        : 0;

      // 12. Bundled Cue Case
      let casePrice = 0;
      if (targetCue.case && targetCue.case.id !== 'case_none') {
        const caseItem = catalog.cases.find((c) => c.id === targetCue.case?.id);
        casePrice = caseItem ? caseItem.bundlePrice : (targetCue.case.bundlePrice || 0);
      }

      const total = Math.max(
        0,
        shaftPrice +
          lengthPrice +
          buttTimberPrice +
          largeSplicePrice +
          smallSplicePrice +
          largeVeneersPrice +
          smallVeneersPrice +
          endButtJoinPrice +
          domeJointPrice +
          ferrulePrice +
          tipPrice +
          platePrice +
          engravingPrice +
          miniButtPrice +
          extensionsPrice +
          priorityServicePrice +
          casePrice
      );

      return {
        shaftPrice,
        lengthPrice,
        buttTimberPrice,
        largeSplicePrice,
        smallSplicePrice,
        largeVeneersPrice,
        smallVeneersPrice,
        endButtJoinPrice,
        domeJointPrice,
        ferrulePrice,
        tipPrice,
        platePrice,
        engravingPrice,
        miniButtPrice,
        extensionsPrice,
        priorityServicePrice,
        casePrice,
        total,
      };
    },
    [catalog, config]
  );

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

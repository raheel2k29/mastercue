import {
  CueConfiguration,
  CueShaft,
  CueLength,
  CueJoint,
  CueButtTimber,
  CueSplice,
  CueVeneer,
  SelectedVeneer,
  CueFerrule,
  CueTip,
  CueTipSize,
  CueDome,
  CuePlate,
  CueExtension,
  CueMiniButt,
} from '@/types/cue';

import {
  CUE_SHAFTS,
  CUE_LENGTHS,
  CUE_JOINTS,
  CUE_BUTT_TIMBERS,
  CUE_SPLICES,
  CUE_VENEERS,
  CUE_FERRULES,
  CUE_TIPS,
  CUE_DOMES,
  CUE_PLATES,
  CUE_EXTENSIONS,
  CUE_MINI_BUTTS,
  CUE_WEIGHT_SETTINGS,
  CUE_OTHER_PRICES,
} from './cueData';

export interface RenderLayer {
  thumb: string;
  label: string;
  isSide?: boolean;
  extra?: {
    engraving?: string;
    bounds?: string;
    font?: string;
  };
}

export const BUTT_JOINT_FITTING_PRICE =
  CUE_OTHER_PRICES.find((p) => p.name === 'Butt Joint')?.price ?? 12;
export const DOME_JOINT_PRICE =
  CUE_OTHER_PRICES.find((p) => p.name === 'Dome Joint')?.price ?? 31;

// ==========================================
// CONDITIONAL AVAILABILITY RULES (CUEWIZARD ENGINE)
// ==========================================

// 1. Butt Timber Availability
export function isButtTimberAvailable(cue: Partial<CueConfiguration>, timber: CueButtTimber): boolean {
  if (!cue.buttJoint || !cue.shaft) return true;
  return (
    timber.assets?.some(
      (asset) =>
        asset.allowedJoint_Id === cue.buttJoint?.id &&
        asset.allowedShafts.includes(cue.shaft?.asset || '')
    ) ?? false
  );
}

// 2. Butt Joint Availability
export function isButtJointAvailable(cue: Partial<CueConfiguration>, joint: CueJoint): boolean {
  if (!cue.buttTimber) return true;
  if (cue.buttTimber.name === 'No Butt Timber') return true;
  return (
    cue.buttTimber.assets?.some(
      (asset) =>
        asset.allowedJoint_Id === joint.id &&
        (!cue.shaft || asset.allowedShafts.includes(cue.shaft.asset))
    ) ?? false
  );
}

// 3. Length Availability (Without butt timber, max blank length is 58")
export function isLengthAvailable(cue: Partial<CueConfiguration>, length: CueLength): boolean {
  if (!cue.buttTimber) return true;
  if (cue.buttTimber.name === 'No Butt Timber') {
    // Cannot exceed 58" without butt timber
    return Boolean(length.noButtTimber);
  }
  return true;
}

// 4. Large Splices Allowed? (CueWizard: disabled if Dome is Yes or Joint is '16in Above Points')
export function isLargeSplicesAllowed(cue: Partial<CueConfiguration>): {
  allowed: boolean;
  reason?: string;
} {
  if (cue.dome) {
    return { allowed: false, reason: 'Disabled when Dome Joint is enabled' };
  }
  if (cue.buttJoint?.name === '16in Above Points') {
    return { allowed: false, reason: 'Disabled for 16in Above Points joint' };
  }
  return { allowed: true };
}

// 5. Extensions & Mini Butt Allowed? (CueWizard: requires endButtJoin === true)
export function isExtensionsAllowed(cue: Partial<CueConfiguration>): {
  allowed: boolean;
  reason?: string;
} {
  if (!cue.endButtJoin) {
    return {
      allowed: false,
      reason: 'Requires End Butt Joint thread fitting ("Yes" in Joint & Butt)',
    };
  }
  return { allowed: true };
}

// 6. Tip Size Availability (Filtered by selected Ferrule)
export function getAvailableTipSizes(cue: Partial<CueConfiguration>, tip: CueTip): CueTipSize[] {
  const ferruleAsset = cue.ferruleType?.asset ?? '';
  return (tip.tips || []).filter((ts) => ts.allowedFerrules?.includes(ferruleAsset));
}

export function isTipSizeAvailable(cue: Partial<CueConfiguration>, size: CueTipSize): boolean {
  const ferruleAsset = cue.ferruleType?.asset ?? '';
  return size.allowedFerrules?.includes(ferruleAsset) ?? true;
}

// 7. Veneer Layer Dependency (CueWizard sequential cascading)
export function canSelectVeneer(
  cue: Partial<CueConfiguration>,
  layerIndex: number, // 0: High, 1: Inlay, 2: Middle, 3: Low
  veneer: CueVeneer
): { allowed: boolean; reason?: string } {
  if (veneer.name === 'None') return { allowed: true };
  if (!cue.largeSpliceMaterial || (cue.largeSplices ?? 0) === 0) {
    return { allowed: false, reason: 'Splice wood must be chosen first' };
  }

  const veneers = cue.largeVeneers || [];
  const highVeneer = veneers.find((v) => v.layer === 0);
  const inlayVeneer = veneers.find((v) => v.layer === 3);
  const middleVeneer = veneers.find((v) => v.layer === 1);

  switch (layerIndex) {
    case 0: // High (Outer layer)
      return { allowed: true };
    case 1: // Inlay
      if (!highVeneer || highVeneer.name === 'None') {
        return { allowed: false, reason: 'Requires High Veneer to be selected first' };
      }
      return { allowed: true };
    case 2: // Middle
      if (!inlayVeneer || inlayVeneer.name === 'None') {
        return { allowed: false, reason: 'Requires Inlay Veneer to be selected first' };
      }
      return { allowed: true };
    case 3: // Low (Inner layer)
      if (!middleVeneer || middleVeneer.name === 'None') {
        return { allowed: false, reason: 'Requires Middle Veneer to be selected first' };
      }
      return { allowed: true };
    default:
      return { allowed: true };
  }
}

// ==========================================
// CORE HELPERS
// ==========================================

export function getDefaultVeneers(veneers: CueVeneer[], type: number): SelectedVeneer[] {
  const defaultVeneer =
    veneers.find((v) => v.default && v.type === type && !v.isWood) ||
    veneers.find((v) => v.default && v.type === type) ||
    veneers[0];

  if (!defaultVeneer || !defaultVeneer.assets) return [];

  const list: SelectedVeneer[] = defaultVeneer.assets.map((asset) => ({
    layer: asset.layer,
    veneer_Id: defaultVeneer.id,
    name: defaultVeneer.name,
    asset: defaultVeneer,
  }));

  const orderMap: Record<number, number> = { 0: 0, 3: 1, 1: 2, 2: 3 };
  return list.sort((a, b) => (orderMap[a.layer] ?? 4) - (orderMap[b.layer] ?? 4));
}

export function getButtTimberAsset(cue: Partial<CueConfiguration>) {
  if (!cue.buttTimber || !cue.shaft || !cue.buttJoint) return null;
  return (
    cue.buttTimber.assets?.find(
      (asset) =>
        asset.allowedJoint_Id === cue.buttJoint?.id &&
        asset.allowedShafts.includes(cue.shaft?.asset || '')
    ) || null
  );
}

function spliceAndVeneerOrderer(layers: RenderLayer[]): RenderLayer[] {
  return [...layers].sort((a, b) => (a.isSide ? 1 : 0) - (b.isSide ? 1 : 0));
}

function buildVeneerLayers(veneers: SelectedVeneer[], splicesCount: number): RenderLayer[] {
  if (!splicesCount || splicesCount === 0) return [];
  const layers: RenderLayer[] = [];

  for (const v of veneers) {
    if (v.name === 'None') continue;
    const assetDef = v.asset?.assets?.find((a) => a.layer === v.layer);
    if (assetDef && assetDef.asset) {
      layers.push({
        label: v.name,
        thumb: assetDef.asset,
        isSide: false,
      });

      if (splicesCount === 4) {
        const firstChar = assetDef.asset.charAt(0);
        const secondChar = assetDef.asset.charAt(1);
        let sideAsset = '';
        if (firstChar === 'V') {
          sideAsset = assetDef.asset.slice(0, 2) + secondChar + assetDef.asset.slice(2);
        } else if (firstChar === 'I') {
          sideAsset = assetDef.asset.slice(0, 3) + 'S' + assetDef.asset.slice(3);
        }
        if (sideAsset) {
          layers.push({
            label: v.name,
            thumb: sideAsset,
            isSide: true,
          });
        }
      }
    }
  }

  return layers;
}

export function generateLayers(cue: CueConfiguration): RenderLayer[] {
  const layers: RenderLayer[] = [];

  // 1. Background
  layers.push({ thumb: 'Bground', label: 'Background' });

  // 2. Shaft
  if (cue.shaft?.asset) {
    layers.push({ thumb: cue.shaft.asset, label: cue.shaft.name });
  }

  // 3. Butt Timber
  const timberAsset = getButtTimberAsset(cue);
  if (timberAsset?.images) {
    for (const img of timberAsset.images) {
      layers.push({ thumb: img, label: cue.buttTimber.name });
    }
  }

  // 4. Large Splices & Veneers
  const spliceCheck = isLargeSplicesAllowed(cue);
  if (spliceCheck.allowed) {
    const largeSpliceLayers: RenderLayer[] = [];
    if (cue.largeSplices > 0 && cue.largeSpliceMaterial) {
      largeSpliceLayers.push({
        thumb: cue.largeSpliceMaterial.oneImage,
        label: cue.largeSpliceMaterial.name,
        isSide: false,
      });
      if (cue.largeSplices === 4 && cue.largeSpliceMaterial.fourImage) {
        largeSpliceLayers.push({
          thumb: cue.largeSpliceMaterial.fourImage,
          label: cue.largeSpliceMaterial.name,
          isSide: true,
        });
      }
    }
    const largeVeneerLayers = buildVeneerLayers(cue.largeVeneers, cue.largeSplices);
    layers.push(
      ...spliceAndVeneerOrderer(
        [...largeSpliceLayers, ...largeVeneerLayers].filter((l) => Boolean(l.thumb))
      )
    );
  }

  // 5. Small Splices & Veneers
  if (spliceCheck.allowed && cue.largeSplices > 0) {
    const smallSpliceLayers: RenderLayer[] = [];
    if (cue.smallSplices > 0 && cue.smallSpliceMaterial) {
      smallSpliceLayers.push({
        thumb: cue.smallSpliceMaterial.oneImage,
        label: cue.smallSpliceMaterial.name,
        isSide: false,
      });
      if (cue.smallSplices === 4 && cue.smallSpliceMaterial.fourImage) {
        smallSpliceLayers.push({
          thumb: cue.smallSpliceMaterial.fourImage,
          label: cue.smallSpliceMaterial.name,
          isSide: true,
        });
      }
    }
    const smallVeneerLayers = buildVeneerLayers(cue.smallVeneers, cue.smallSplices);
    layers.push(
      ...spliceAndVeneerOrderer(
        [...smallSpliceLayers, ...smallVeneerLayers].filter((l) => Boolean(l.thumb))
      )
    );
  }

  // 6. End Butt Joint / Pad
  if (cue.endButtJoin) {
    layers.push({ thumb: 'BJOINT', label: 'Butt Joint' });
  } else {
    layers.push({ thumb: 'BUTTPAD', label: 'No Butt Joint' });
  }

  // 7. Dome
  if (cue.dome && cue.domeLayer?.image) {
    layers.push({ thumb: cue.domeLayer.image, label: 'Dome' });
  }

  // 8. Tip & Ferrule
  if (cue.shaft?.tip) {
    layers.push({ thumb: cue.shaft.tip, label: 'Shaft Tip Base' });
  }
  if (cue.tip && cue.tip.shaftImagePair) {
    const pair = cue.tip.shaftImagePair.find((p) => p.name === cue.shaft?.asset);
    if (pair?.images) {
      for (const img of pair.images) {
        layers.push({ thumb: img, label: 'Tip Asset' });
      }
    }
  }
  if (cue.ferruleType?.asset) {
    layers.push({ thumb: cue.ferruleType.asset, label: cue.ferruleType.name });
  }

  // 9. Nameplate
  if (cue.namePlate?.asset) {
    layers.push({ thumb: cue.namePlate.asset, label: cue.namePlate.name });
  }

  // 10. Extensions (Only if endButtJoin is true)
  if (cue.endButtJoin && cue.extensions?.length) {
    for (const ext of cue.extensions) {
      if (ext.asset) {
        layers.push({ thumb: ext.asset, label: ext.name });
      }
    }
  }

  // 11. Mini Butt (Only if endButtJoin is true)
  if (cue.endButtJoin && cue.miniButt?.asset) {
    layers.push({ thumb: cue.miniButt.asset, label: cue.miniButt.name });
  }

  // 12. Plate Engraving Preview
  if (cue.namePlate?.previewImage) {
    layers.push({
      thumb: cue.namePlate.previewImage,
      label: 'ENGRAVING',
      extra: {
        engraving: cue.engraving || '',
        bounds: cue.namePlate.textBounds || '1893,651,2213,781',
        font: cue.font || 'Roboto',
      },
    });
  }

  const seen = new Set<string>();
  return layers.filter((l) => {
    if (!l.thumb) return false;
    if (l.label === 'ENGRAVING') return true;
    if (seen.has(l.thumb)) return false;
    seen.add(l.thumb);
    return true;
  });
}

// Calculate Price Breakdown and Total - 100% matched with CueWizard formula
export function calculatePrice(
  cue: CueConfiguration,
  customSurcharges?: { buttJointFittingPrice?: number; domeJointPrice?: number }
) {
  const shaftPrice = cue.shaft?.price || 0;
  const lengthPrice = cue.length?.price || 0;

  const timberAsset = getButtTimberAsset(cue);
  const buttTimberPrice = timberAsset?.price || 0;

  const spliceCheck = isLargeSplicesAllowed(cue);
  let largeSplicePrice = 0;
  let smallSplicePrice = 0;
  let largeVeneersPrice = 0;
  let smallVeneersPrice = 0;

  if (spliceCheck.allowed) {
    if (cue.largeSplices === 1 && cue.largeSpliceMaterial) {
      largeSplicePrice = cue.largeSpliceMaterial.onePrice || 0;
    } else if (cue.largeSplices === 4 && cue.largeSpliceMaterial) {
      largeSplicePrice = cue.largeSpliceMaterial.fourPrice || 0;
    }

    if (cue.smallSplices === 1 && cue.smallSpliceMaterial) {
      smallSplicePrice = cue.smallSpliceMaterial.onePrice || 0;
    } else if (cue.smallSplices === 4 && cue.smallSpliceMaterial) {
      smallSplicePrice = cue.smallSpliceMaterial.fourPrice || 0;
    }

    if (cue.largeSplices > 0) {
      for (const v of cue.largeVeneers) {
        if (v.name === 'None') continue;
        const assetDef = v.asset?.assets?.find((a) => a.layer === v.layer);
        if (assetDef) {
          largeVeneersPrice +=
            cue.largeSplices === 4 ? (assetDef.fourPrice || 0) : (assetDef.price || 0);
        }
      }
    }

    if (cue.smallSplices > 0) {
      for (const v of cue.smallVeneers) {
        if (v.name === 'None') continue;
        const assetDef = v.asset?.assets?.find((a) => a.layer === v.layer);
        if (assetDef) {
          smallVeneersPrice +=
            cue.smallSplices === 4 ? (assetDef.fourPrice || 0) : (assetDef.price || 0);
        }
      }
    }
  }

  const activeButtFittingPrice =
    customSurcharges?.buttJointFittingPrice ?? BUTT_JOINT_FITTING_PRICE;
  const activeDomePrice =
    customSurcharges?.domeJointPrice ?? DOME_JOINT_PRICE;

  const endButtJoinPrice = cue.endButtJoin ? activeButtFittingPrice : 0;
  const domeJointPrice = cue.dome ? activeDomePrice : 0;

  const ferrulePrice = cue.ferruleType?.price || 0;
  const tipPrice = cue.tipSize?.price || 0;
  const platePrice = cue.namePlate?.price || 0;

  const isCustomEngraving =
    cue.namePlate?.allowEngraving !== false &&
    Boolean(cue.engraving?.trim()) &&
    cue.engraving.trim().toLowerCase() !== 'custom made';
  const engravingPrice =
    isCustomEngraving && cue.namePlate?.engravingPrice ? cue.namePlate.engravingPrice : 0;

  const miniButtPrice = cue.endButtJoin ? (cue.miniButt?.price || 0) : 0;
  const extensionsPrice = cue.endButtJoin
    ? cue.extensions?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0
    : 0;

  const total =
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
    extensionsPrice;

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
    total,
  };
}

export function getWeightRange(cue: CueConfiguration) {
  let min = CUE_WEIGHT_SETTINGS.min || 16;
  let max = CUE_WEIGHT_SETTINGS.max || 23;

  const layers = generateLayers(cue);
  const layerThumbs = new Set(layers.map((l) => l.thumb));

  for (const mod of CUE_WEIGHT_SETTINGS.modifiers || []) {
    if (layerThumbs.has(mod.name)) {
      min += mod.min;
      max += mod.max;
    }
  }

  if (cue.buttTimber?.name === 'No Butt Timber') {
    max -= 2;
  }

  return { min, max };
}

export function getDefaultCue(): CueConfiguration {
  const defaultShaft = CUE_SHAFTS.find((s) => s.default) || CUE_SHAFTS[0];
  const defaultLength = CUE_LENGTHS.find((l) => l.default) || CUE_LENGTHS[0];
  const defaultJoint = CUE_JOINTS.find((j) => j.default) || CUE_JOINTS[0];
  const defaultButtTimber = CUE_BUTT_TIMBERS.find((bt) => bt.default) || CUE_BUTT_TIMBERS[0];
  const defaultFerrule = CUE_FERRULES.find((f) => f.default) || CUE_FERRULES[0];
  const defaultTip = CUE_TIPS.find((t) => t.default) || CUE_TIPS[0];
  const defaultTipSize = defaultTip?.tips?.find((ts) => ts.default) || defaultTip?.tips?.[0];
  const defaultNamePlate = CUE_PLATES.find((p) => p.default) || CUE_PLATES[0];
  const defaultMiniButt = CUE_MINI_BUTTS.find((b) => b.default) || null;

  return {
    shaft: defaultShaft,
    length: defaultLength,
    buttJoint: defaultJoint,
    buttTimber: defaultButtTimber,
    dome: false,
    endButtJoin: true,
    domeLayer: null,
    weight: 18,
    largeSplices: 0,
    largeSpliceMaterial: null,
    largeVeneers: getDefaultVeneers(CUE_VENEERS, 0),
    smallSplices: 0,
    smallSpliceMaterial: null,
    smallVeneers: getDefaultVeneers(CUE_VENEERS, 1),
    ferruleType: defaultFerrule,
    tip: defaultTip,
    tipSize: defaultTipSize,
    extensions: [],
    miniButt: defaultMiniButt,
    namePlate: defaultNamePlate,
    engraving: 'CUSTOM MADE',
    font: 'Roboto',
  };
}

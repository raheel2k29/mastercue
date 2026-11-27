import { CueConfiguration, SelectedVeneer } from '@/types/cue';
import {
  CUE_SHAFTS,
  CUE_LENGTHS,
  CUE_JOINTS,
  CUE_BUTT_TIMBERS,
  CUE_SPLICES,
  CUE_VENEERS,
  CUE_FERRULES,
  CUE_TIPS,
  CUE_PLATES,
  CUE_EXTENSIONS,
  CUE_MINI_BUTTS,
  CUE_DOMES,
} from './cueData';
import { getDefaultCue, applyCueSelection } from './cueEngine';

export const CUE_STORAGE_KEY = 'mastercue_custom_cue_configuration_v1';
export const TAB_STORAGE_KEY = 'mastercue_custom_cue_active_tab_v1';

/**
 * Safely saves the customer's current cue configuration to localStorage.
 */
export function saveStoredCue(cue: CueConfiguration): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(cue);
    localStorage.setItem(CUE_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[MasterCue Storage] Could not persist cue configuration to localStorage:', err);
  }
}

/**
 * Loads and rehydrates the customer's saved cue configuration from localStorage.
 * Ensures all timber, joint, and hardware IDs map correctly to current catalog objects
 * and passes the object through dependency sanitization.
 */
export function loadStoredCue(): CueConfiguration | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const defaultCue = getDefaultCue();

    // Rehydrate catalog references
    const shaft = parsed.shaft?.id
      ? CUE_SHAFTS.find((s) => s.id === parsed.shaft.id) || null
      : null;

    const length = parsed.length?.id
      ? CUE_LENGTHS.find((l) => l.id === parsed.length.id) || defaultCue.length
      : defaultCue.length;

    const buttJoint = parsed.buttJoint?.id
      ? CUE_JOINTS.find((j) => j.id === parsed.buttJoint.id) || defaultCue.buttJoint
      : defaultCue.buttJoint;

    const buttTimber = parsed.buttTimber?.id
      ? CUE_BUTT_TIMBERS.find((t) => t.id === parsed.buttTimber.id) || defaultCue.buttTimber
      : defaultCue.buttTimber;

    const ferruleType = parsed.ferruleType?.id
      ? CUE_FERRULES.find((f) => f.id === parsed.ferruleType.id) || defaultCue.ferruleType
      : defaultCue.ferruleType;

    const tip = parsed.tip?.id
      ? CUE_TIPS.find((t) => t.id === parsed.tip.id) || defaultCue.tip
      : defaultCue.tip;

    const tipSize = parsed.tipSize?.id
      ? tip?.tips?.find((ts) => ts.id === parsed.tipSize.id) || defaultCue.tipSize
      : defaultCue.tipSize;

    const largeSpliceMaterial = parsed.largeSpliceMaterial?.id
      ? CUE_SPLICES.find((s) => s.id === parsed.largeSpliceMaterial.id) || null
      : null;

    const smallSpliceMaterial = parsed.smallSpliceMaterial?.id
      ? CUE_SPLICES.find((s) => s.id === parsed.smallSpliceMaterial.id) || null
      : null;

    const namePlate = parsed.namePlate?.id
      ? CUE_PLATES.find((p) => p.id === parsed.namePlate.id) || null
      : null;

    const miniButt = parsed.miniButt?.id
      ? CUE_MINI_BUTTS.find((b) => b.id === parsed.miniButt.id) || null
      : null;

    const extensions = Array.isArray(parsed.extensions)
      ? parsed.extensions
          .map((ext: { id?: string }) => CUE_EXTENSIONS.find((e) => e.id === ext.id))
          .filter(Boolean)
      : [];

    // Rehydrate veneers
    const rehydrateVeneers = (savedVeneers: SelectedVeneer[] | undefined, defaultList: SelectedVeneer[]): SelectedVeneer[] => {
      if (!Array.isArray(savedVeneers)) return defaultList;
      return savedVeneers.map((v) => {
        const found = CUE_VENEERS.find((ven) => ven.id === v.veneer_Id);
        return {
          layer: v.layer,
          veneer_Id: found ? found.id : v.veneer_Id,
          name: found ? found.name : v.name,
          asset: found || v.asset,
        };
      });
    };

    const rehydratedCue: CueConfiguration = {
      ...defaultCue,
      shaft,
      length,
      buttJoint,
      buttTimber,
      dome: Boolean(parsed.dome),
      endButtJoin: Boolean(parsed.endButtJoin),
      domeLayer: parsed.domeLayer?.id
        ? CUE_DOMES.find((d) => d.id === parsed.domeLayer.id) || null
        : null,
      weight: typeof parsed.weight === 'number' ? parsed.weight : defaultCue.weight,
      largeSplices: typeof parsed.largeSplices === 'number' ? parsed.largeSplices : 0,
      largeSpliceMaterial,
      largeVeneers: rehydrateVeneers(parsed.largeVeneers, defaultCue.largeVeneers),
      smallSplices: typeof parsed.smallSplices === 'number' ? parsed.smallSplices : 0,
      smallSpliceMaterial,
      smallVeneers: rehydrateVeneers(parsed.smallVeneers, defaultCue.smallVeneers),
      ferruleType,
      tip,
      tipSize,
      extensions,
      miniButt,
      namePlate,
      engraving: typeof parsed.engraving === 'string' ? parsed.engraving : '',
      font: typeof parsed.font === 'string' ? parsed.font : '',
      priorityService: Boolean(parsed.priorityService),
      case: parsed.case || null,
    };

    // Sanitize with configuration dependencies
    return applyCueSelection(defaultCue, rehydratedCue);
  } catch (err) {
    console.warn('[MasterCue Storage] Could not parse stored cue from localStorage:', err);
    return null;
  }
}

/**
 * Clears the customer's saved cue configuration and active tab from localStorage.
 */
export function clearStoredCue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CUE_STORAGE_KEY);
    localStorage.removeItem(TAB_STORAGE_KEY);
  } catch (err) {
    console.warn('[MasterCue Storage] Could not clear localStorage:', err);
  }
}

/**
 * Saves the customer's currently open step/tab so they return to the exact same step.
 */
export function saveStoredTab(tab: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // ignore
  }
}

/**
 * Loads the saved active tab if previously set.
 */
export function loadStoredTab(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TAB_STORAGE_KEY);
  } catch {
    return null;
  }
}

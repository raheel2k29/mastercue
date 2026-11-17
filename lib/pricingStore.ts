import fs from 'fs';
import path from 'path';
import { PricingConfig } from '@/types/admin';
import { getDefaultPricingConfig } from './defaultPricing';

export { getDefaultPricingConfig };

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'pricingConfig.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Fetch active config with fallback to defaults
export function getPricingConfig(): PricingConfig {
  try {
    ensureDataDir();
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaults = getDefaultPricingConfig();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
      return defaults;
    }

    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent);

    // Merge with defaults to guarantee all required keys exist
    const defaults = getDefaultPricingConfig();
    return {
      version: parsed.version || defaults.version,
      lastUpdated: parsed.lastUpdated || defaults.lastUpdated,
      surcharges: {
        ...defaults.surcharges,
        ...(parsed.surcharges || {}),
      },
      shafts: parsed.shafts?.length ? parsed.shafts : defaults.shafts,
      lengths: parsed.lengths?.length ? parsed.lengths : defaults.lengths,
      splices: parsed.splices?.length ? parsed.splices : defaults.splices,
      veneers: parsed.veneers?.length ? parsed.veneers : defaults.veneers,
      ferrules: parsed.ferrules?.length ? parsed.ferrules : defaults.ferrules,
      tipSizes: parsed.tipSizes?.length ? parsed.tipSizes : defaults.tipSizes,
      namePlates: parsed.namePlates?.length ? parsed.namePlates : defaults.namePlates,
      extensions: parsed.extensions?.length ? parsed.extensions : defaults.extensions,
      miniButts: parsed.miniButts?.length ? parsed.miniButts : defaults.miniButts,
    };
  } catch (err) {
    console.error('Failed reading pricingConfig.json, falling back to defaults:', err);
    return getDefaultPricingConfig();
  }
}

// Sanitize and validate price numbers
function sanitizePrice(val: any, fallback = 0): number {
  const num = Number(val);
  if (isNaN(num) || num < 0) return fallback;
  return Math.round(num * 100) / 100;
}

// Save updated config with validation
export function savePricingConfig(incoming: Partial<PricingConfig>): {
  success: boolean;
  config: PricingConfig;
  error?: string;
} {
  try {
    ensureDataDir();
    const current = getPricingConfig();

    const updated: PricingConfig = {
      version: (current.version || 1) + 1,
      lastUpdated: new Date().toISOString(),
      surcharges: {
        buttJointFittingPrice: sanitizePrice(
          incoming.surcharges?.buttJointFittingPrice,
          current.surcharges.buttJointFittingPrice
        ),
        domeJointPrice: sanitizePrice(
          incoming.surcharges?.domeJointPrice,
          current.surcharges.domeJointPrice
        ),
        defaultCurrency: incoming.surcharges?.defaultCurrency || current.surcharges.defaultCurrency,
      },
      shafts: (incoming.shafts || current.shafts).map((s) => ({
        id: s.id,
        name: s.name,
        price: sanitizePrice(s.price, 0),
        enabled: s.enabled !== false,
      })),
      lengths: (incoming.lengths || current.lengths).map((l) => ({
        id: l.id,
        name: l.name,
        price: sanitizePrice(l.price, 0),
        enabled: l.enabled !== false,
      })),
      splices: (incoming.splices || current.splices).map((sp) => ({
        id: sp.id,
        name: sp.name,
        onePrice: sanitizePrice(sp.onePrice, 0),
        fourPrice: sanitizePrice(sp.fourPrice, 0),
        enabled: sp.enabled !== false,
      })),
      veneers: (incoming.veneers || current.veneers).map((v) => ({
        id: v.id,
        name: v.name,
        enabled: v.enabled !== false,
        assets: (v.assets || []).map((a) => ({
          layer: a.layer,
          price: sanitizePrice(a.price, 0),
          fourPrice: sanitizePrice(a.fourPrice, 0),
        })),
      })),
      ferrules: (incoming.ferrules || current.ferrules).map((f) => ({
        id: f.id,
        name: f.name,
        price: sanitizePrice(f.price, 0),
        enabled: f.enabled !== false,
      })),
      tipSizes: (incoming.tipSizes || current.tipSizes).map((t) => ({
        id: t.id,
        name: t.name,
        price: sanitizePrice(t.price, 0),
        enabled: t.enabled !== false,
      })),
      namePlates: (incoming.namePlates || current.namePlates).map((p) => ({
        id: p.id,
        name: p.name,
        price: sanitizePrice(p.price, 0),
        engravingPrice: sanitizePrice(p.engravingPrice, 0),
        allowEngraving: p.allowEngraving !== false,
        enabled: p.enabled !== false,
      })),
      extensions: (incoming.extensions || current.extensions).map((e) => ({
        id: e.id,
        name: e.name,
        price: sanitizePrice(e.price, 0),
        enabled: e.enabled !== false,
      })),
      miniButts: (incoming.miniButts || current.miniButts).map((m) => ({
        id: m.id,
        name: m.name,
        price: sanitizePrice(m.price, 0),
        enabled: m.enabled !== false,
      })),
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return { success: true, config: updated };
  } catch (err: any) {
    console.error('Failed saving pricing config:', err);
    return {
      success: false,
      config: getPricingConfig(),
      error: err?.message || 'Failed to save configuration',
    };
  }
}

// Reset configuration to pristine defaults
export function resetPricingConfig(): PricingConfig {
  ensureDataDir();
  const defaults = getDefaultPricingConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
  return defaults;
}

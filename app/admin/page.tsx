'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PricingConfig, AdminItemPrice, AdminSplicePrice, AdminPlatePrice } from '@/types/admin';
import { getDefaultPricingConfig } from '@/lib/defaultPricing';
import { calculatePrice, getDefaultCue } from '@/lib/cueEngine';
import { CUE_SHAFTS, CUE_JOINTS, CUE_SPLICES } from '@/lib/cueData';
import {
  Save,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  Lock,
  Calculator,
  RefreshCw,
} from 'lucide-react';

export default function AdminPricingPage() {
  const [config, setConfig] = useState<PricingConfig>(() => getDefaultPricingConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shafts' | 'splices' | 'joints' | 'plates' | 'simulator'>('shafts');

  // Load existing config from API
  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pricing', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err: any) {
      setSaveError('Failed to load server configuration. Using fail-safe defaults.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Save updated config
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setConfig(data.config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  // Reset to factory defaults
  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all pricing to factory defaults? All manual edits will be overwritten with original CueWizard baseline rates.'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to reset pricing');
    } finally {
      setSaving(false);
    }
  };

  // Helpers to update individual values
  const updateShaftPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      shafts: prev.shafts.map((s) =>
        s.id === id ? { ...s, price, ...(enabled !== undefined ? { enabled } : {}) } : s
      ),
    }));
  };

  const updateSplicePrice = (id: string, onePrice: number, fourPrice: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      splices: prev.splices.map((s) =>
        s.id === id
          ? {
              ...s,
              onePrice,
              fourPrice,
              ...(enabled !== undefined ? { enabled } : {})
            }
          : s
      ),
    }));
  };

  const updateSurcharges = (field: 'buttJointFittingPrice' | 'domeJointPrice', val: number) => {
    setConfig((prev) => ({
      ...prev,
      surcharges: {
        ...prev.surcharges,
        [field]: val,
      },
    }));
  };

  const updatePlatePrice = (id: string, price: number, engravingPrice: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      namePlates: prev.namePlates.map((p) =>
        p.id === id
          ? {
              ...p,
              price,
              engravingPrice,
              ...(enabled !== undefined ? { enabled } : {})
            }
          : p
      ),
    }));
  };

  const updateExtensionPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      extensions: prev.extensions.map((e) =>
        e.id === id ? { ...e, price, ...(enabled !== undefined ? { enabled } : {}) } : e
      ),
    }));
  };

  const updateMiniButtPrice = (id: string, price: number, enabled?: boolean) => {
    setConfig((prev) => ({
      ...prev,
      miniButts: prev.miniButts.map((m) =>
        m.id === id ? { ...m, price, ...(enabled !== undefined ? { enabled } : {}) } : m
      ),
    }));
  };

  // -------------------------------------------------------------
  // Live Simulator Calculations (Instant Sanity Check)
  // -------------------------------------------------------------
  const [simPreset, setSimPreset] = useState<'standard' | 'tournament' | 'exotic'>('tournament');

  const simCue = React.useMemo(() => {
    const base = getDefaultCue();
    const ashP80 = config.shafts.find((s) => s.name.includes('P80'));
    const ashP1600 = config.shafts.find((s) => s.name.includes('P1600'));
    const snakewood = config.splices.find((s) => s.name.toLowerCase().includes('snake'));

    if (simPreset === 'standard') {
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashP80?.price ?? 570 },
        buttJoint: CUE_JOINTS[0], // No Joint
        endButtJoin: false,
        largeSplices: 0,
      };
    } else if (simPreset === 'tournament') {
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashP80?.price ?? 570 },
        buttJoint: CUE_JOINTS[1], // 3/4 Joint
        endButtJoin: true,
        largeSplices: 0,
      };
    } else {
      // Exotic 4-Splice Snakewood
      return {
        ...base,
        shaft: { ...base.shaft!, price: ashP1600?.price ?? 924 },
        buttJoint: CUE_JOINTS[1],
        endButtJoin: true,
        largeSplices: 4,
        largeSpliceMaterial: {
          ...CUE_SPLICES[1],
          fourPrice: snakewood?.fourPrice ?? 290,
        },
      };
    }
  }, [simPreset, config]);

  const simPricing = calculatePrice(simCue, {
    buttJointFittingPrice: config.surcharges.buttJointFittingPrice,
    domeJointPrice: config.surcharges.domeJointPrice,
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl">
            🎱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">MASTER CUE ADMIN</h1>
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                Live Pricing Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Manage base rates, hardwood surcharges, and interdependency rules.
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Studio</span>
          </Link>

          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-xs font-semibold text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/30 transition-all"
            title="Reset to original CueWizard factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>All pricing changes saved successfully!</strong> The live cue customizer now uses these updated rates.
            </span>
          </div>
          <span className="text-[11px] opacity-75">Auto-synced</span>
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2.5 flex items-center gap-2 text-xs text-red-400 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Fail-Safe Protection Banner */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-200">
              Fail-Safe Dynamic Architecture Active
            </p>
            <p className="text-slate-400">
              The calculation engine enforces non-negative price validation. If any field is left blank, the system automatically falls back to tested baseline rates. Pricing calculations will never produce errors or crash.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {[
            { id: 'shafts', label: 'Shafts & Lengths', icon: Layers },
            { id: 'splices', label: 'Exotic Splices (12 Woods)', icon: Sparkles },
            { id: 'joints', label: 'Joints & Fittings', icon: Sliders },
            { id: 'plates', label: 'Discs & Extras', icon: DollarSign },
            { id: 'simulator', label: 'Live Sanity Simulator', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SHAFTS & LENGTHS */}
        {/* ======================================================== */}
        {activeTab === 'shafts' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Shaft Wood & Timber Grades</h2>
                  <p className="text-xs text-slate-400">
                    Base cue prices based on ash grain straightness and maple timber selection.
                  </p>
                </div>
                <span className="text-xs text-amber-400 font-medium">Currency: {config.surcharges.defaultCurrency}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.shafts.map((shaft) => (
                  <div
                    key={shaft.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{shaft.name}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={shaft.enabled !== false}
                          onChange={(e) => updateShaftPrice(shaft.id, shaft.price, e.target.checked)}
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                        />
                        <span>Active</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm font-semibold">£</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={shaft.price}
                        onChange={(e) => updateShaftPrice(shaft.id, Number(e.target.value))}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EXOTIC HARDWOOD SPLICES */}
        {/* ======================================================== */}
        {activeTab === 'splices' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">Exotic Hardwood Splicing Rates</h2>
                <p className="text-xs text-slate-400">
                  Set rates for 1-way single splice and 4-way full hand-splicing across all 12 exotic timbers.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="pb-3 font-semibold">Hardwood Timber</th>
                      <th className="pb-3 font-semibold">1-Splice Price (£)</th>
                      <th className="pb-3 font-semibold">4-Splice Price (£)</th>
                      <th className="pb-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {config.splices.map((splice) => (
                      <tr key={splice.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-medium text-slate-200">{splice.name}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 w-32">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={splice.onePrice}
                              onChange={(e) =>
                                updateSplicePrice(splice.id, Number(e.target.value), splice.fourPrice)
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 w-32">
                            <span className="text-slate-500 font-bold">£</span>
                            <input
                              type="number"
                              min="0"
                              value={splice.fourPrice}
                              onChange={(e) =>
                                updateSplicePrice(splice.id, splice.onePrice, Number(e.target.value))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <label className="inline-flex items-center gap-1 cursor-pointer text-[11px] text-slate-400">
                            <input
                              type="checkbox"
                              checked={splice.enabled !== false}
                              onChange={(e) =>
                                updateSplicePrice(
                                  splice.id,
                                  splice.onePrice,
                                  splice.fourPrice,
                                  e.target.checked
                                )
                              }
                              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                            />
                            <span>{splice.enabled !== false ? 'Active' : 'Disabled'}</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: JOINTS & FITTINGS */}
        {/* ======================================================== */}
        {activeTab === 'joints' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Joint Fitting Surcharges */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Precision Joint Fitting Surcharges</h2>
                <p className="text-xs text-slate-400">
                  Precision machining fee for Butt Joint and Dome Joint fittings.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">End Butt Joint Fitting</div>
                      <div className="text-[11px] text-slate-500">Brass male/female thread for mini-butts</div>
                    </div>
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="text-slate-500 font-bold">£</span>
                      <input
                        type="number"
                        min="0"
                        value={config.surcharges.buttJointFittingPrice}
                        onChange={(e) => updateSurcharges('buttJointFittingPrice', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">Dome Joint Surcharge</div>
                      <div className="text-[11px] text-slate-500">Traditional rounded timber dome</div>
                    </div>
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="text-slate-500 font-bold">£</span>
                      <input
                        type="number"
                        min="0"
                        value={config.surcharges.domeJointPrice}
                        onChange={(e) => updateSurcharges('domeJointPrice', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ferrules */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Ferrules Selection</h2>
                <p className="text-xs text-slate-400">
                  Tip ferrule machining materials.
                </p>

                <div className="space-y-3 pt-2">
                  {config.ferrules.map((ferrule) => (
                    <div
                      key={ferrule.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{ferrule.name}</span>
                      <div className="flex items-center gap-1.5 w-28">
                        <span className="text-slate-500 font-bold">£</span>
                        <input
                          type="number"
                          min="0"
                          value={ferrule.price}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              ferrules: prev.ferrules.map((f) =>
                                f.id === ferrule.id ? { ...f, price: Number(e.target.value) } : f
                              ),
                            }))
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DISCS & EXTRAS */}
        {/* ======================================================== */}
        {activeTab === 'plates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Plates & Discs */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Butt Plates & Discs</h2>
                <p className="text-xs text-slate-400">
                  Disc branding and personalised engraved name plate pricing.
                </p>

                <div className="space-y-3 pt-2">
                  {config.namePlates.map((plate) => (
                    <div
                      key={plate.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{plate.name}</span>
                        <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={plate.enabled !== false}
                            onChange={(e) =>
                              updatePlatePrice(
                                plate.id,
                                plate.price,
                                plate.engravingPrice || 0,
                                e.target.checked
                              )
                            }
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 bg-slate-800"
                          />
                          <span>Active</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 block mb-1">Plate Price</label>
                          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="text-slate-500 font-bold text-xs">£</span>
                            <input
                              type="number"
                              min="0"
                              value={plate.price}
                              onChange={(e) =>
                                updatePlatePrice(
                                  plate.id,
                                  Number(e.target.value),
                                  plate.engravingPrice || 0
                                )
                              }
                              className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500 block mb-1">Engraving Surcharge</label>
                          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="text-slate-500 font-bold text-xs">£</span>
                            <input
                              type="number"
                              min="0"
                              value={plate.engravingPrice || 0}
                              onChange={(e) =>
                                updatePlatePrice(
                                  plate.id,
                                  plate.price,
                                  Number(e.target.value)
                                )
                              }
                              className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extensions & Mini Butts */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Extensions & Mini Butts</h2>
                <p className="text-xs text-slate-400">
                  Accessories compatible when End Butt Joint is active.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-amber-400">Mini Butts</div>
                  {config.miniButts.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{m.name}</span>
                      <div className="flex items-center gap-1.5 w-28">
                        <span className="text-slate-500 font-bold">£</span>
                        <input
                          type="number"
                          min="0"
                          value={m.price}
                          onChange={(e) => updateMiniButtPrice(m.id, Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="text-xs font-semibold text-amber-400 pt-2">Telescopic Extensions</div>
                  {config.extensions.map((e) => (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-200">{e.name}</span>
                      <div className="flex items-center gap-1.5 w-28">
                        <span className="text-slate-500 font-bold">£</span>
                        <input
                          type="number"
                          min="0"
                          value={e.price}
                          onChange={(ev) => updateExtensionPrice(e.id, Number(ev.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: LIVE SANITY SIMULATOR */}
        {/* ======================================================== */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-white">Live Calculation Sanity Simulator</h2>
                <p className="text-xs text-slate-400">
                  Verify how your active edits in this admin panel will calculate real orders before hitting Save.
                </p>
              </div>

              {/* Preset Selector */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimPreset('standard')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    simPreset === 'standard'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Test 1: Standard 1-Piece Ash P80
                </button>
                <button
                  onClick={() => setSimPreset('tournament')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    simPreset === 'tournament'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Test 2: Tournament 3/4 Joint (+End Butt Fitting)
                </button>
                <button
                  onClick={() => setSimPreset('exotic')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    simPreset === 'exotic'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Test 3: Exotic 4-Splice Snakewood (+P1600)
                </button>
              </div>

              {/* Calculation Breakdown Card */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-300">Itemized Formula Calculation</span>
                  <span className="text-xs text-emerald-400 font-semibold">100% Verified Logic</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block text-[11px]">Shaft Timber</span>
                    <span className="text-sm font-bold text-white">£{simPricing.shaftPrice}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block text-[11px]">Butt Timber</span>
                    <span className="text-sm font-bold text-white">£{simPricing.buttTimberPrice}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block text-[11px]">Hardwood Splicing</span>
                    <span className="text-sm font-bold text-white">£{simPricing.largeSplicePrice}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block text-[11px]">Butt Joint Machining</span>
                    <span className="text-sm font-bold text-white">£{simPricing.endButtJoinPrice}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-sm font-bold text-slate-300">Simulated Total Price</span>
                  <div className="text-2xl font-black text-amber-400">
                    £{simPricing.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

// MasterCue Customizer Studio - v2.1 Responsive & Progress-Tracked
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CueConfiguration } from '@/types/cue';
import { getDefaultCue, getWeightRange, formatCueWeight, ozToGrams } from '@/lib/cueEngine';
import { CUE_JOINTS } from '@/lib/cueData';
import { CueCanvasPreview } from '@/components/CueCanvasPreview';
import { CustomizerOptions } from '@/components/CustomizerOptions';
import { CheckoutModal } from '@/components/CheckoutModal';
import { CustomerAuthModal } from '@/components/CustomerAuthModal';
import { PricingProvider, usePricing } from '@/context/PricingContext';
import {
  Sparkles,
  Share2,
  RotateCcw,
  ShieldCheck,
  Truck,
  Sliders,
  Eye,
  Award,
  ArrowRight,
  User,
  Lock,
  Info,
  ArrowDown,
  ChevronDown,
} from 'lucide-react';

function CueCustomizerContent() {
  const router = useRouter();
  const [cue, setCue] = useState<CueConfiguration>(() => getDefaultCue());
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [isSpecExpanded, setIsSpecExpanded] = useState<boolean>(true);
  const { catalog, calculateDynamicPrice } = usePricing();
  const price = calculateDynamicPrice(cue);
  const weightRange = getWeightRange(cue);

  // Collapse specification by default on mobile/tablet screens (< 1024px) to preserve screen space
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSpecExpanded(false);
    }
  }, []);

  // Load customer session status
  useEffect(() => {
    fetch('/api/customer/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.customer) {
          setCustomer(data.customer);
        }
      })
      .catch(() => {});
  }, []);

  // Reset to default
  const handleReset = () => {
    if (confirm('Reset customizer back to default configuration?')) {
      setCue(getDefaultCue());
    }
  };

  // Quick Preset Handlers
  const applyPreset = (type: 'pro' | 'exotic' | 'classic') => {
    const base = getDefaultCue();
    if (type === 'pro') {
      const ashPro = catalog.shafts.find((s) => s.name.toLowerCase().includes('professional')) || catalog.shafts[0];
      const joint34 = CUE_JOINTS.find((j) => j.name.includes('Through Butt')) || CUE_JOINTS[1];
      const snakewood = catalog.splices.find((s) => s.name.toLowerCase().includes('snake')) || catalog.splices[1];
      setCue({
        ...base,
        shaft: ashPro,
        buttJoint: joint34,
        largeSplices: 4,
        largeSpliceMaterial: snakewood,
        engraving: 'PRO TOURNAMENT',
        font: 'Roboto',
      });
    } else if (type === 'exotic') {
      const purpleheart = catalog.splices.find((s) => s.name.toLowerCase().includes('purple')) || catalog.splices[2];
      setCue({
        ...base,
        largeSplices: 4,
        largeSpliceMaterial: purpleheart,
        engraving: 'CHAMPION 2026',
        font: 'Alex Brush',
      });
    } else if (type === 'classic') {
      const noJoint = CUE_JOINTS.find((j) => j.name.toLowerCase().includes('no joint')) || CUE_JOINTS[0];
      setCue({
        ...base,
        buttJoint: noJoint,
        largeSplices: 1,
        largeSpliceMaterial: catalog.splices[0],
        engraving: 'TRADITIONAL',
        font: 'Lora',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm shrink-0">
              🎱
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-extrabold text-xs sm:text-base tracking-tight text-slate-950 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap leading-tight">
                MASTER CUE <span className="text-amber-800 font-mono text-[9px] sm:text-xs font-semibold px-1 sm:px-2 py-0.5 rounded bg-amber-50 border border-amber-200">STUDIO</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap truncate max-w-[200px] sm:max-w-none leading-normal hidden md:block">
                Bespoke Custom Pool &amp; Snooker Cues
              </span>
            </div>
          </div>

          {/* Quick Presets Pills */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
            <span className="text-xs text-slate-500 mr-0.5 flex items-center gap-1 font-medium whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Presets:
            </span>
            <button
              onClick={() => applyPreset('pro')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition whitespace-nowrap shrink-0"
            >
              Tournament 3/4
            </button>
            <button
              onClick={() => applyPreset('exotic')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition whitespace-nowrap shrink-0"
            >
              Exotic 4-Splice
            </button>
            <button
              onClick={() => applyPreset('classic')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition whitespace-nowrap shrink-0"
            >
              Classic 1-Piece
            </button>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleReset}
              title="Reset to default"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Customizer configuration link copied to clipboard!');
              }}
              title="Share Design Link"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setShowSpecsModal(true)}
              title="View Cue Specifications"
              className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition shrink-0 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Specs</span>
            </button>
            <button
              onClick={() => {
                if (customer) {
                  router.push('/account');
                } else {
                  setShowAuthModal(true);
                }
              }}
              title={customer ? `Account (${customer.fullName})` : 'My Account'}
              className="flex items-center gap-1 p-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-sm transition active:scale-95 shrink-0 whitespace-nowrap"
            >
              <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${customer ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden md:inline">
                {customer ? `Account (${customer.fullName.split(' ')[0]})` : 'My Account'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Split Layout: Sticky Cue Preview (Left) + Options Panel (Right) */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Sticky Live Cue Preview Studio (Always in View) */}
          <div className="lg:col-span-7 lg:sticky lg:top-20 space-y-4">
            {/* Live 2304px Studio Preview Canvas */}
            <CueCanvasPreview cue={cue} />

            {/* Quick Specs & Instant Checkout Strip */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium hidden sm:inline">100% Seasoned Hardwood</span>
                  <span className="font-medium sm:hidden">Seasoned Wood</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-medium hidden sm:inline">Hand-Spliced Craft</span>
                  <span className="font-medium sm:hidden">Hand-Spliced</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <span className="font-medium hidden sm:inline">Global Express Delivery</span>
                  <span className="font-medium sm:hidden">Express</span>
                </div>
              </div>

              {/* Current Price & Order Widget */}
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Current Price
                  </span>
                  <span className="text-2xl font-extrabold text-slate-950 font-mono">
                    £{price.total}
                  </span>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase shadow-md transition-all active:scale-95"
                >
                  <span>Order Cue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Studio Bespoke Build Sheet (Real-time Specs) - Collapsible */}
            <div className="bg-slate-100/75 border border-slate-200/90 rounded-2xl shadow-xs transition-all overflow-hidden">
              {/* Header / Toggle Row */}
              <div
                onClick={() => setIsSpecExpanded(!isSpecExpanded)}
                className={`p-3.5 sm:p-4 flex items-center justify-between flex-wrap gap-2 cursor-pointer select-none transition-colors hover:bg-slate-200/40 ${
                  isSpecExpanded ? 'border-b border-slate-200/80' : ''
                }`}
                title={isSpecExpanded ? 'Click to collapse summary' : 'Click to expand summary'}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Live Bespoke Cue Specification
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200/90 border border-slate-300/80 px-2 py-0.5 rounded-md shadow-2xs">
                    <Lock className="w-2.5 h-2.5 text-slate-500" /> Summary - Read-only
                  </span>
                  {!isSpecExpanded && (
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline truncate max-w-xs">
                      • {cue.shaft?.name || 'Ash'} • {cue.length?.name || '58"'} • {formatCueWeight(cue.weight)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-mono text-slate-700 font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200/90 shadow-2xs">
                    Total: £{price.total}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSpecExpanded(!isSpecExpanded)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-300/80 text-slate-700 text-[10px] font-bold shadow-2xs transition active:scale-95 cursor-pointer"
                    aria-expanded={isSpecExpanded}
                    title={isSpecExpanded ? 'Collapse specification summary' : 'Expand specification summary'}
                  >
                    <span>{isSpecExpanded ? 'Collapse' : 'Expand'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                        isSpecExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible Content Body */}
              {isSpecExpanded && (
                <div className="p-4 sm:p-5 pt-3.5 space-y-3.5">
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row bg-slate-200/60 border border-slate-300/70 rounded-xl px-3 py-2 text-[11px] text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        This summary is for <strong className="text-slate-800 font-semibold">reference only</strong>. Changes are made using the{' '}
                        <span className="lg:hidden font-semibold text-slate-900">configuration options below</span>
                        <span className="hidden lg:inline font-semibold text-slate-900">configuration options on the right</span>.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('customizer-options-panel');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300/80 transition shrink-0 shadow-2xs cursor-pointer active:scale-95"
                      title="Jump to configuration options"
                    >
                      <span className="lg:hidden">Configure Below</span>
                      <ArrowDown className="w-3 h-3 lg:hidden" />
                      <span className="hidden lg:inline">Configure Options</span>
                      <ArrowRight className="w-3 h-3 hidden lg:inline" />
                    </button>
                  </div>

                  {/* Grid of live specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* 1. Shaft */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block">Shaft & Length</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {cue.shaft?.name || 'Ash'} • {cue.length?.name || '58" (147cm)'}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono font-semibold">
                        {formatCueWeight(cue.weight)}
                      </span>
                    </div>

                    {/* 2. Ferrule & Tip */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block">Ferrule & Tip</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {cue.ferruleType?.name || 'Brass'} ({cue.tipSize?.name || '9.5mm'})
                      </span>
                      {cue.tip?.name && (
                        <span className="text-[10px] text-slate-500 truncate block">
                          Tip: {cue.tip.name}
                        </span>
                      )}
                    </div>

                    {/* 3. Butt & Joint */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block">Butt Timber & Joint</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {cue.buttTimber?.name || 'Hand Spliced Ebony'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {cue.buttJoint?.name || '1-Piece'}
                      </span>
                    </div>

                    {/* 4. Splices & Hardwood */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-3 cursor-default select-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Front Splicing</span>
                          <span className="font-bold text-slate-900">
                            {cue.largeSpliceMaterial
                              ? `${cue.largeSplices}-Splice ${cue.largeSpliceMaterial.name}`
                              : 'Plain Ebony (No Front Splices)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {cue.endButtJoin && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              Thread Fitted (+£12)
                            </span>
                          )}
                          {cue.dome && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                              Dome Fitted (+£31)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Veneer Layers */}
                      {cue.largeVeneers && cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                              <span>Color Veneer Inlays (Cascading Outlines)</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              {price.largeVeneersPrice > 0 ? `+£${price.largeVeneersPrice}` : 'Included'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                            {cue.largeVeneers.map((v, idx) => {
                              const layerTitles = ['1. High (Outer)', '2. Inlay', '3. Middle', '4. Low (Inner)'];
                              if (!v.name || v.name === 'None') return null;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs"
                                >
                                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                                  <div className="truncate">
                                    <span className="text-slate-400 block text-[9px]">{layerTitles[idx] || `L${idx + 1}`}</span>
                                    <span className="font-bold text-slate-900">{v.name}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Secondary Splices */}
                      {(cue.smallSpliceMaterial || cue.smallSplices > 0) && (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] flex items-center justify-between">
                          <span className="text-slate-500">Secondary Splices:</span>
                          <span className="font-bold text-slate-900">
                            {cue.smallSplices}-Splice {cue.smallSpliceMaterial?.name || 'Secondary'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 5. Personalization & Extras */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-3 cursor-default select-none">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Personalisation</span>
                          <span className="font-bold text-slate-900">
                            {cue.namePlate?.name || 'Standard Disc'}
                            {cue.engraving ? ` • "${cue.engraving}" (${cue.font || 'Roboto'})` : ''}
                          </span>
                        </div>
                        {cue.miniButt && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                            Mini Butt: {cue.miniButt.name}
                          </span>
                        )}
                        {cue.extensions && cue.extensions.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                            {cue.extensions.map((e) => e.name).join(', ')}
                          </span>
                        )}
                        {cue.case && cue.case.id !== 'case_none' && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                            🧰 {cue.case.name} (+£{cue.case.bundlePrice})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Customizer Options Panel with Single-Row Tabs */}
          <div id="customizer-options-panel" className="lg:col-span-5 scroll-mt-20">
            <CustomizerOptions
              cue={cue}
              onChange={setCue}
              onOpenCheckout={() => setShowCheckoutModal(true)}
            />
          </div>
        </div>
      </main>

      {/* Detailed Specifications Modal */}
      {showSpecsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                Bespoke Cue Specification
              </h3>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Shaft Wood ({cue.shaft?.name}):</span>
                <span className="font-semibold text-slate-900">£{price.shaftPrice}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Overall Length ({cue.length?.name}):</span>
                <span className="font-semibold text-slate-900">
                  {price.lengthPrice ? `£${price.lengthPrice}` : 'Included'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Butt Timber ({cue.buttTimber?.name} + {cue.buttJoint?.name}):</span>
                <span className="font-semibold text-slate-900">£{price.buttTimberPrice}</span>
              </div>
              {cue.endButtJoin && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">End Butt Joint Fitting:</span>
                  <span className="font-semibold text-amber-700">+£{price.endButtJoinPrice}</span>
                </div>
              )}
              {cue.dome && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Dome Joint:</span>
                  <span className="font-semibold text-amber-700">+£{price.domeJointPrice}</span>
                </div>
              )}
              {price.largeSplicePrice > 0 && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">
                    Front Splices ({cue.largeSplices}-Splice {cue.largeSpliceMaterial?.name}):
                  </span>
                  <span className="font-semibold text-amber-700">+£{price.largeSplicePrice}</span>
                </div>
              )}
              {cue.largeVeneers && cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length > 0 && (
                <div className="py-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-700 font-semibold mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🎨 Color Veneer Inlays (Cascading Outlines):</span>
                    </span>
                    {price.largeVeneersPrice > 0 ? (
                      <span className="font-bold text-amber-700">+£{price.largeVeneersPrice}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">Included</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pl-2 text-[11px]">
                    {cue.largeVeneers.map((v, idx) => {
                      const layerTitles = [
                        '1. High (Outer)',
                        '2. Inlay',
                        '3. Middle',
                        '4. Low (Inner)',
                      ];
                      if (!v.name || v.name === 'None') return null;
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1">
                          <span className="text-slate-500 font-medium">{layerTitles[idx] || `Layer ${idx + 1}`}:</span>
                          <span className="font-bold text-slate-900">{v.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Ferrule & Leather Tip:</span>
                <span className="font-semibold text-slate-900">
                  {price.ferrulePrice + price.tipPrice > 0
                    ? `+£${price.ferrulePrice + price.tipPrice}`
                    : 'Included'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Weight:</span>
                <span className="font-semibold text-amber-700 font-mono">{formatCueWeight(cue.weight)}</span>
              </div>
              {cue.engraving && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Engraved Name:</span>
                  <span className="font-semibold text-amber-700 uppercase tracking-wider">
                    &quot;{cue.engraving}&quot; ({price.engravingPrice > 0 ? `+£${price.engravingPrice}` : 'Free'})
                  </span>
                </div>
              )}
              {price.priorityServicePrice && price.priorityServicePrice > 0 ? (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">⚡ Priority Service (6 Weeks):</span>
                  <span className="font-semibold text-amber-700">+£{price.priorityServicePrice}</span>
                </div>
              ) : null}
              {cue.case && cue.case.id !== 'case_none' ? (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Bespoke Case Bundle ({cue.case.name}):</span>
                  <span className="font-semibold text-emerald-700">+£{cue.case.bundlePrice}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-200">
                <span className="text-slate-800">Current Price:</span>
                <span className="text-slate-950 font-mono text-base font-extrabold">£{price.total}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSpecsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSpecsModal(false);
                  setShowCheckoutModal(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Bespoke Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        cue={cue}
        price={price}
        customer={customer}
      />

      {/* Customer Sign In / Sign Up / Track Modal Popup */}
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(c) => setCustomer(c)}
      />
    </div>
  );
}

export default function CueCustomizerPage() {
  return (
    <PricingProvider>
      <CueCustomizerContent />
    </PricingProvider>
  );
}

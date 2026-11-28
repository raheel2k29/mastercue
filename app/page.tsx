'use client';

// MasterCue Customizer Studio - v2.1 Responsive & Progress-Tracked
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CueConfiguration } from '@/types/cue';
import { getDefaultCue, getWeightRange, formatCueWeight, ozToGrams } from '@/lib/cueEngine';
import { loadStoredCue, saveStoredCue, clearStoredCue } from '@/lib/cueStorage';
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
  Clock,
  Zap,
  X,
} from 'lucide-react';

function CueCustomizerContent() {
  const router = useRouter();
  const [cue, setCue] = useState<CueConfiguration>(() => getDefaultCue());
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showLeadTimeModal, setShowLeadTimeModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [highlightShaftTrigger, setHighlightShaftTrigger] = useState(0);

  // Restore saved cue configuration from localStorage on mount
  useEffect(() => {
    const saved = loadStoredCue();
    if (saved) {
      setCue(saved);
      if (saved.shaft) {
        setRestoredBanner(true);
      }
    }
    setIsStorageLoaded(true);
  }, []);

  // Persist cue configuration to localStorage whenever changes occur
  useEffect(() => {
    if (!isStorageLoaded) return;
    saveStoredCue(cue);
  }, [cue, isStorageLoaded]);

  // Synchronously flush state to localStorage on beforeunload (accidental refresh/navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveStoredCue(cue);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cue]);

  const triggerShaftHighlight = () => {
    setHighlightShaftTrigger(Date.now());
    const el = document.getElementById('customizer-options-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const { catalog, calculateDynamicPrice } = usePricing();
  const price = calculateDynamicPrice(cue);
  const weightRange = getWeightRange(cue);

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
      clearStoredCue();
      setCue(getDefaultCue());
      setRestoredBanner(false);
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
      const ashDefault = catalog.shafts.find((s) => s.default) || catalog.shafts[0];
      setCue({
        ...base,
        shaft: ashDefault,
        largeSplices: 4,
        largeSpliceMaterial: purpleheart,
        engraving: 'CHAMPION 2026',
        font: 'Alex Brush',
      });
    } else if (type === 'classic') {
      const noJoint = CUE_JOINTS.find((j) => j.name.toLowerCase().includes('no joint')) || CUE_JOINTS[0];
      const ashDefault = catalog.shafts.find((s) => s.default) || catalog.shafts[0];
      setCue({
        ...base,
        shaft: ashDefault,
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
        {/* Restored In-Progress Configuration Notice */}
        {restoredBanner && (
          <div className="mb-4 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-amber-200/80 text-amber-900">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Design Restored:</strong> We preserved your custom cue configuration from your previous session.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200 rounded-lg transition cursor-pointer"
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={() => setRestoredBanner(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
                <button
                  type="button"
                  id="quick-strip-lead-times-btn"
                  onClick={() => setShowLeadTimeModal(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-sky-950 transition cursor-pointer group bg-sky-50/80 hover:bg-sky-100/80 border border-sky-200/70 px-2.5 py-1 rounded-lg"
                  title="Click to view detailed manufacturing lead times & express delivery breakdown"
                >
                  <Truck className="w-4 h-4 text-sky-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold hidden sm:inline">
                    Express Delivery ({cue.priorityService ? '6 wks craft' : '10–12 wks craft'} + 1–3d courier)
                  </span>
                  <span className="font-semibold sm:hidden">
                    Lead Times ({cue.priorityService ? '6 wks' : '10–12 wks'})
                  </span>
                  <Info className="w-3.5 h-3.5 text-sky-500 group-hover:text-sky-700 shrink-0" />
                </button>
              </div>

              {/* Current Price & Order Widget */}
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Current Price
                  </span>
                  {cue.shaft ? (
                    <span className="text-2xl font-extrabold text-slate-950 font-mono">
                      £{price.total}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-3 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Select your shaft to get started
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!cue.shaft) {
                      triggerShaftHighlight();
                      return;
                    }
                    setShowCheckoutModal(true);
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md transition-all active:scale-95 ${
                    cue.shaft
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50'
                  }`}
                >
                  <span>{cue.shaft ? 'Order Cue' : 'Select Shaft'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Studio Bespoke Build Sheet (Real-time Specs) - Desktop Only (Mobile uses floating "View Summary" modal) */}
            <div className="hidden lg:block bg-slate-100/75 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="border-b border-slate-200/80 pb-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Live Bespoke Cue Specification
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200/90 border border-slate-300/80 px-2 py-0.5 rounded-md shadow-2xs">
                      <Lock className="w-2.5 h-2.5 text-slate-500" /> Summary - Read-only
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-700 font-bold bg-white px-2.5 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
                    {cue.shaft ? `Total: £${price.total}` : 'Select shaft to calculate total'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 bg-slate-200/60 border border-slate-300/70 rounded-xl px-3 py-2 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      This summary is for <strong className="text-slate-800 font-semibold">reference only</strong>. Changes are made using the{' '}
                      <strong className="font-semibold text-slate-900">configuration options on the right</strong>.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={triggerShaftHighlight}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300/80 transition shrink-0 shadow-2xs cursor-pointer active:scale-95"
                    title="Jump to configuration options on the right"
                  >
                    <span>Configure Options</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

                  {/* Grid of live specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* 1. Shaft */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block font-medium">Shaft & Length</span>
                      <span className="font-bold text-slate-900 block break-words leading-snug">
                        {cue.shaft ? `${cue.shaft.name} • ${cue.length?.name || '58" (147cm)'}` : `Unselected Shaft • ${cue.length?.name || '58" (147cm)'}`}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono font-semibold block mt-0.5">
                        {formatCueWeight(cue.weight)}
                      </span>
                    </div>

                    {/* 2. Ferrule & Tip */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block font-medium">Ferrule & Tip</span>
                      <span className="font-bold text-slate-900 block break-words leading-snug">
                        {cue.ferruleType?.name || 'Brass'} ({cue.tipSize?.name || '9.5mm'})
                      </span>
                      {cue.tip?.name && (
                        <span className="text-[10px] text-slate-500 block break-words mt-0.5">
                          Tip: {cue.tip.name}
                        </span>
                      )}
                    </div>

                    {/* 3. Butt & Joint */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs cursor-default select-none">
                      <span className="text-[10px] text-slate-400 block font-medium">Butt Timber & Joint</span>
                      <span className="font-bold text-slate-900 block break-words leading-snug">
                        {cue.buttTimber?.name || 'Hand Spliced Ebony'}
                      </span>
                      <span className="text-[10px] text-slate-500 block break-words mt-0.5">
                        {cue.buttJoint?.name || '1-Piece'}
                      </span>
                    </div>

                    {/* 4. Splices & Hardwood */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-3 cursor-default select-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Front Splicing</span>
                          <span className="font-bold text-slate-900">
                            {cue.largeSpliceMaterial
                              ? `${cue.largeSplices}-Splice ${cue.largeSpliceMaterial.name}`
                              : 'Plain Ebony (No Front Splices)'}
                          </span>
                        </div>
                        {price.largeSplicePrice > 0 && (
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            +£{price.largeSplicePrice}
                          </span>
                        )}
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

                    {/* 5. Personalisation (Disc & Engraving Only) */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1 cursor-default select-none">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 block font-medium">Personalisation</span>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          {cue.namePlate ? (cue.engraving?.trim() ? 'Custom Engraved' : 'Disc Fitted') : 'None'}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 block break-words leading-snug">
                        {cue.namePlate ? cue.namePlate.name : 'No Disc'}
                      </span>
                      {cue.engraving?.trim() ? (
                        <span className="text-[10px] text-amber-700 font-mono font-semibold block mt-0.5 break-words">
                          &quot;{cue.engraving.trim()}&quot; ({cue.font || 'Roboto'})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {cue.namePlate ? 'No custom text' : 'Clean wood finish'}
                        </span>
                      )}
                    </div>

                    {/* 6. Extras (Thread Fitted, Mini Butt, Extensions, Case, Priority Service) */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-2 cursor-default select-none">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-400 block font-medium">Extras</span>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          {(cue.endButtJoin || cue.dome || (cue.miniButt && cue.miniButt.name !== 'None') || (cue.extensions && cue.extensions.length > 0) || (cue.case && cue.case.id !== 'case_none') || cue.priorityService) ? 'Fitted' : 'Standard'}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                        {cue.endButtJoin && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            Thread Fitted (+£12)
                          </span>
                        )}
                        {cue.dome && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            Dome Fitted (+£31)
                          </span>
                        )}
                        {cue.miniButt && cue.miniButt.name !== 'None' && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            Mini Butt: {cue.miniButt.name}
                          </span>
                        )}
                        {cue.extensions && cue.extensions.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                            Extensions: {cue.extensions.map((e) => e.name).join(', ')}
                          </span>
                        )}
                        {cue.case && cue.case.id !== 'case_none' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                            🧰 {cue.case.name} (+£{cue.case.bundlePrice})
                          </span>
                        )}
                        {cue.priorityService && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                            ⚡ Priority Service (6 Wks)
                          </span>
                        )}
                        {!cue.endButtJoin && !cue.dome && (!cue.miniButt || cue.miniButt.name === 'None') && (!cue.extensions || cue.extensions.length === 0) && (!cue.case || cue.case.id === 'case_none') && !cue.priorityService && (
                          <span className="text-slate-400 italic">None selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          {/* RIGHT COLUMN: Customizer Options Panel with Single-Row Tabs */}
          <div id="customizer-options-panel" className="lg:col-span-5 scroll-mt-20">
            <CustomizerOptions
              cue={cue}
              onChange={setCue}
              onOpenCheckout={() => setShowCheckoutModal(true)}
              highlightTrigger={highlightShaftTrigger}
              onOpenLeadTimes={() => setShowLeadTimeModal(true)}
            />
          </div>
        </div>
      </main>

      {/* Floating Mobile "View Summary" Pill Button (Only on Mobile/Tablet) */}
      {!showSpecsModal && !showCheckoutModal && !showAuthModal && (
        <div className="fixed bottom-20 right-3 sm:right-4 z-30 lg:hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setShowSpecsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white shadow-xl border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all active:scale-95 group"
            title="View Live Cue Summary & Specifications"
            aria-label="View Cue Summary"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>View Summary</span>
            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
            <span className="font-mono text-amber-400 font-bold">
              {cue.shaft ? `£${price.total}` : 'Select Shaft'}
            </span>
          </button>
        </div>
      )}

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

            <div className="space-y-2 text-xs divide-y divide-slate-100 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-slate-500 font-medium">Shaft Wood & Grade</span>
                  <span className="font-bold text-slate-900 break-words text-xs">
                    {cue.shaft?.name || 'Unselected Shaft'}
                  </span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0 text-xs">
                  {cue.shaft ? `£${price.shaftPrice}` : 'Pending selection'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-slate-500 font-medium">Overall Length</span>
                  <span className="font-bold text-slate-900 break-words text-xs">{cue.length?.name}</span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0 text-xs">
                  {price.lengthPrice ? `£${price.lengthPrice}` : 'Included'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-slate-500 font-medium">Butt Timber & Joint</span>
                  <span className="font-bold text-slate-900 break-words text-xs">
                    {cue.buttTimber?.name} • {cue.buttJoint?.name}
                  </span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0 text-xs">£{price.buttTimberPrice}</span>
              </div>
              {price.largeSplicePrice > 0 && (
                <div className="flex items-center justify-between py-2 gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-slate-500 font-medium">Front Splices</span>
                    <span className="font-bold text-slate-900 break-words text-xs">
                      {cue.largeSplices}-Splice {cue.largeSpliceMaterial?.name}
                    </span>
                  </div>
                  <span className="font-semibold text-amber-700 shrink-0 text-xs">+£{price.largeSplicePrice}</span>
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
              <div className="flex items-center justify-between py-1.5 gap-3">
                <span className="text-slate-500">Ferrule & Leather Tip:</span>
                <span className="font-semibold text-slate-900 shrink-0">
                  {price.ferrulePrice + price.tipPrice > 0
                    ? `+£${price.ferrulePrice + price.tipPrice}`
                    : 'Included'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 gap-3">
                <span className="text-slate-500">Cue Weight:</span>
                <span className="font-semibold text-amber-700 font-mono shrink-0">{formatCueWeight(cue.weight)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 gap-3">
                <div className="flex flex-col min-w-0">
                  <span className="text-slate-500">Personalisation:</span>
                  <span className="font-semibold text-slate-900 break-words text-xs">
                    {cue.namePlate
                      ? `${cue.namePlate.name}${cue.engraving?.trim() ? ` • "${cue.engraving.trim()}" (${cue.font || 'Roboto'})` : ' (No text)'}`
                      : 'None (Clean Wood Finish)'}
                  </span>
                </div>
                <span className="font-semibold text-slate-900 shrink-0 text-xs">
                  {price.engravingPrice > 0 || price.platePrice > 0
                    ? `+£${price.engravingPrice + price.platePrice}`
                    : 'None'}
                </span>
              </div>

              {/* Extras Section */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Extras & Add-ons
                </span>
                <div className="space-y-1.5">
                  {cue.endButtJoin && (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">Thread Fitted (End Butt Joint):</span>
                      <span className="font-semibold text-amber-700 shrink-0">+£{price.endButtJoinPrice}</span>
                    </div>
                  )}
                  {cue.dome && (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">Dome Joint:</span>
                      <span className="font-semibold text-amber-700 shrink-0">+£{price.domeJointPrice}</span>
                    </div>
                  )}
                  {cue.miniButt && cue.miniButt.name !== 'None' && (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">6-inch Mini Butt ({cue.miniButt.name}):</span>
                      <span className="font-semibold text-amber-700 shrink-0">+£{price.miniButtPrice || 24}</span>
                    </div>
                  )}
                  {cue.extensions && cue.extensions.length > 0 && (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">Extensions ({cue.extensions.map((e) => e.name).join(', ')}):</span>
                      <span className="font-semibold text-amber-700 shrink-0">+£{price.extensionsPrice}</span>
                    </div>
                  )}
                  {price.priorityServicePrice && price.priorityServicePrice > 0 ? (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">⚡ Priority Service (6 Weeks):</span>
                      <span className="font-semibold text-amber-700 shrink-0">+£{price.priorityServicePrice}</span>
                    </div>
                  ) : null}
                  {cue.case && cue.case.id !== 'case_none' ? (
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-600">Bespoke Case Bundle ({cue.case.name}):</span>
                      <span className="font-semibold text-emerald-700 shrink-0">+£{cue.case.bundlePrice}</span>
                    </div>
                  ) : null}
                  {!cue.endButtJoin && !cue.dome && (!cue.miniButt || cue.miniButt.name === 'None') && (!cue.extensions || cue.extensions.length === 0) && (!cue.case || cue.case.id === 'case_none') && !price.priorityServicePrice && (
                    <div className="text-[11px] text-slate-400 italic py-0.5">
                      Standard build (no optional extras selected)
                    </div>
                  )}
                </div>
              </div>

              {/* Expected Lead Times & Express Delivery Breakdown */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Manufacturing &amp; Express Delivery
                  </span>
                  <button
                    type="button"
                    id="specs-modal-lead-times-link"
                    onClick={() => {
                      setShowSpecsModal(false);
                      setShowLeadTimeModal(true);
                    }}
                    className="text-[10.5px] font-semibold text-sky-700 hover:text-sky-900 underline cursor-pointer"
                  >
                    Details ℹ️
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">Workshop Crafting:</span>
                    <span className={`font-semibold shrink-0 ${cue.priorityService ? 'text-amber-700 font-bold' : 'text-slate-900'}`}>
                      {cue.priorityService ? '⚡ 6 Weeks Priority Slot' : '10–12 Weeks Standard Queue'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600">Insured Express Courier:</span>
                    <span className="font-semibold text-emerald-700 shrink-0">
                      1–2d UK / 3–5d Worldwide (Free)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-0.5">
                    * &quot;Express&quot; refers to courier transit speed once handcrafting and oil curing are completed.
                  </p>
                </div>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-t border-slate-200">
                <span className="text-slate-800">Current Price:</span>
                {cue.shaft ? (
                  <span className="text-slate-950 font-mono text-base font-extrabold">£{price.total}</span>
                ) : (
                  <span className="text-amber-800 text-xs font-bold">Select your shaft to calculate</span>
                )}
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
                  if (!cue.shaft) {
                    triggerShaftHighlight();
                    return;
                  }
                  setShowCheckoutModal(true);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                  cue.shaft ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50'
                }`}
              >
                <span>{cue.shaft ? 'Proceed to Checkout' : 'Select Shaft First'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Times & Express Delivery Explanatory Modal */}
      {showLeadTimeModal && (
        <div
          id="lead-times-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowLeadTimeModal(false)}
        >
          <div
            id="lead-times-modal-card"
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    Lead Times &amp; Express Delivery Explained
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete breakdown of crafting schedules and courier dispatch.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-lead-times-modal-btn"
                onClick={() => setShowLeadTimeModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Cue Selection Lead Time Banner */}
            <div id="current-schedule-card" className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {cue.priorityService ? (
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-500 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-900 block">
                    Your Current Schedule: {cue.priorityService ? '⚡ Priority Fast-Track' : 'Standard Bespoke Queue'}
                  </span>
                  <span className="text-slate-600 text-[11px]">
                    {cue.priorityService
                      ? '6 weeks workshop crafting + 1–3 days insured courier delivery'
                      : '10–12 weeks workshop crafting + 1–3 days insured courier delivery'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 text-[11px] shrink-0">
                {cue.priorityService ? '6 WEEKS' : '10–12 WEEKS'}
              </span>
            </div>

            {/* Crucial "What Express Refers To" Callout */}
            <div id="what-express-means-box" className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-sky-950 font-bold">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>What Does &quot;Express&quot; Refer To?</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11.5px]">
                <strong className="text-slate-900">&quot;Express&quot; refers strictly to the transit speed of our tracked courier partner</strong> (DPD / Royal Mail Special Delivery in the UK, DHL Express Worldwide) <em>once your cue has finished handcrafting, oil curing, and acoustic inspection</em>.
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                ⚠️ <em>Bespoke pool and snooker cues cannot be manufactured in 2–3 days.</em> Wood timber requires progressive taper turning, internal stress relief between cuts, hand-spliced butt assembly, and slow-cure Danish oil finishing to ensure straightness and lifetime playability.
              </p>
            </div>

            {/* 3-Stage Process Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Full Production &amp; Delivery Timeline
              </h4>

              <div className="space-y-2.5 text-xs">
                {/* Stage 1 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Stage 1: Workshop Handcrafting</span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">
                        10–12 Wks (Std) / 6 Wks (Priority)
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">
                      Graded ash or maple timber is turned in multiple stages with resting intervals to avoid warping. Ebony hand-splicing, exotic wood inlays, brass or titanium joints, and weight balance coring are completed by our master craftsman.
                    </p>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Stage 2: Multi-Stage Oil Curing &amp; QA Inspection</span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Final 7–10 Days of Crafting
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">
                      Multiple coats of natural slow-cure oil are hand-rubbed and buffed to build a smooth, moisture-resistant finish. Acoustic resonance testing, straightness laser check, and tip dressing are verified before signing off.
                    </p>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Stage 3: Insured Tracked Express Courier Dispatch</span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        1–2 Days UK / 3–5 Days World
                      </span>
                    </div>
                    <p className="text-emerald-900/80 text-[11px] leading-snug">
                      Packed securely inside a heavy-duty reinforced transit cylinder with 100% loss/damage insurance. Real-time courier tracking number sent via SMS and email with signature required on delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                id="got-it-lead-times-btn"
                onClick={() => setShowLeadTimeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                Understood
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

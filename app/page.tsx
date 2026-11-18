'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CueConfiguration } from '@/types/cue';
import { getDefaultCue, getWeightRange } from '@/lib/cueEngine';
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
} from 'lucide-react';

function CueCustomizerContent() {
  const router = useRouter();
  const [cue, setCue] = useState<CueConfiguration>(() => getDefaultCue());
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; email: string; fullName: string } | null>(null);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-sm">
              🎱
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950 flex items-center gap-1.5">
                MASTER CUE <span className="text-amber-800 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">STUDIO</span>
              </span>
              <span className="text-[11px] text-slate-500 block -mt-0.5 font-medium">Bespoke Custom Pool & Snooker Cues</span>
            </div>
          </div>

          {/* Quick Presets Pills */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-1 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Presets:
            </span>
            <button
              onClick={() => applyPreset('pro')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition"
            >
              Tournament 3/4
            </button>
            <button
              onClick={() => applyPreset('exotic')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition"
            >
              Exotic 4-Splice
            </button>
            <button
              onClick={() => applyPreset('classic')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 transition"
            >
              Classic 1-Piece
            </button>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reset to default"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Customizer configuration link copied to clipboard!');
              }}
              title="Share Design Link"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSpecsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition"
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Specs</span>
            </button>
            <button
              onClick={() => {
                if (customer) {
                  router.push('/account');
                } else {
                  setShowAuthModal(true);
                }
              }}
              title="Customer Account & Order Tracking"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              <User className={`w-3.5 h-3.5 ${customer ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">
                {customer ? `Account (${customer.fullName.split(' ')[0]})` : 'My Account'}
              </span>
            </button>
            <Link
              href="/admin"
              title="Workshop Admin & Pricing Control Panel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
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
          </div>

          {/* RIGHT COLUMN: Customizer Options Panel with Single-Row Tabs */}
          <div className="lg:col-span-5">
            <CustomizerOptions cue={cue} onChange={setCue} />
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
              {price.largeVeneersPrice > 0 && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Color Veneers:</span>
                  <span className="font-semibold text-amber-700">+£{price.largeVeneersPrice}</span>
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
                <span className="font-semibold text-amber-700 font-mono">{cue.weight} oz</span>
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

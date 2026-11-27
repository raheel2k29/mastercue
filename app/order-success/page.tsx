'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  PackageCheck,
  ArrowRight,
  Printer,
  ShieldCheck,
  Truck,
  Sparkles,
  Zap,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { OrderRecord } from '@/types/order';
import { formatCueWeight } from '@/lib/cueEngine';
import { clearStoredCue } from '@/lib/cueStorage';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');
  const sessionId = searchParams?.get('session_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fire festive celebration confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    if (!orderId || !sessionId) {
      setLoading(false);
      return;
    }

    fetch(`/api/checkout/verify-session?order_id=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.order) {
          setOrder(data.order);
          clearStoredCue();
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to verify payment');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Confirming Stripe Live Payment & Generating Workshop Build Sheet...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Top Celebration Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Payment Confirmed • Order Placed!
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Thank you! Your payment has been securely confirmed via Stripe. Your custom cue has been queued with our master craftsmen.
          </p>
        </div>

        {/* Reference & Amount Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Workshop Build Reference
            </span>
            <div className="text-lg font-mono font-black text-amber-400">
              {order?.orderNumber || 'MC-CONFIRMED'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Total Paid via Card/Apple/Google Pay
            </span>
            <div className="text-lg font-mono font-black text-emerald-400">
              £{order?.pricing?.total || 'Paid'}
            </div>
          </div>
        </div>

        {/* Build Specs Card */}
        {order && (
          <div className="space-y-3 p-5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <PackageCheck className="w-4 h-4 text-amber-400" />
              <span>Handcrafted Cue Specifications</span>
            </h3>

            <div className="grid grid-cols-2 gap-y-2 text-slate-300">
              <div>
                <span className="text-slate-500">Shaft Wood:</span>{' '}
                <span className="font-semibold text-white">{order.cue.shaft?.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Length:</span>{' '}
                <span className="font-semibold text-white">{order.cue.length?.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Weight:</span>{' '}
                <span className="font-mono font-bold text-amber-400">{formatCueWeight(order.cue.weight)}</span>
              </div>
              <div>
                <span className="text-slate-500">Ferrule & Tip:</span>{' '}
                <span className="font-semibold text-white">
                  {order.cue.ferruleType?.name} ({order.cue.tipSize?.name})
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Butt Timber:</span>{' '}
                <span className="font-semibold text-white">{order.cue.buttTimber?.name}</span>
              </div>
              {order.cue.largeSpliceMaterial && (
                <div className="col-span-2">
                  <span className="text-slate-500">Front Splices:</span>{' '}
                  <span className="font-semibold text-white">
                    {order.cue.largeSplices}-Splice {order.cue.largeSpliceMaterial.name}
                  </span>
                </div>
              )}
              {order.cue.largeVeneers && order.cue.largeVeneers.filter((v) => v.name && v.name !== 'None').length > 0 && (
                <div className="col-span-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    🎨 Color Veneer Inlays (Cascading Outlines)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {order.cue.largeVeneers.map((v, idx) => {
                      const layerTitles = ['1. High (Outer)', '2. Inlay', '3. Middle', '4. Low (Inner)'];
                      if (!v.name || v.name === 'None') return null;
                      return (
                        <div key={idx} className="flex justify-between p-1.5 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400">{layerTitles[idx] || `Layer ${idx + 1}`}:</span>
                          <span className="font-bold text-white">{v.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {order.cue.priorityService && (
                <div className="col-span-2 flex items-center gap-1.5 text-amber-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Priority Crafting Service (Guaranteed 6-Week Turnaround)</span>
                </div>
              )}
              {order.cue.case && order.cue.case.id !== 'case_none' && (
                <div className="col-span-2 text-emerald-400 font-medium">
                  <span className="text-slate-500">Case Bundle:</span>{' '}
                  <span className="font-semibold text-white">{order.cue.case.name} (+£{order.cue.case.bundlePrice})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security & Delivery Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>100% Genuine Handcrafted</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
            <Truck className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Tracked Insured Courier</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Master Craftsman Build</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/account"
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <span>Track in Customer Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Receipt</span>
          </button>
          <Link
            href="/"
            className="py-3 px-4 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  PackageCheck,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  LogOut,
  Printer,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OrderRecord, OrderStatus } from '@/types/order';
import { CustomerProfile } from '@/types/customer';

// Helper to calculate active step index for the 5-stage crafting timeline
function getTimelineStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 1;
    case 'confirmed':
      return 2;
    case 'in_crafting':
      return 3;
    case 'shipped':
      return 4;
    case 'completed':
      return 5;
    default:
      return 1;
  }
}

const TIMELINE_STEPS = [
  { id: 1, label: 'Order Placed', desc: 'Order received & queued' },
  { id: 2, label: 'Confirmed', desc: 'Timber seasoned & allocated' },
  { id: 3, label: 'In Crafting', desc: 'Hand-splicing & precision taper' },
  { id: 4, label: 'Inspected & Shipped', desc: 'Final balance test & dispatch' },
  { id: 5, label: 'Delivered', desc: 'Delivered to customer' },
];

export default function CustomerAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/customer/me', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        const data = await res.json();
        if (!data.authenticated) {
          router.push('/account/login');
          return;
        }
        setCustomer(data.customer);
        setOrders(data.orders || []);
        if (data.orders && data.orders.length > 0) {
          setExpandedOrderId(data.orders[0].id);
        }
      } catch (err) {
        router.push('/account/login');
      } finally {
        setLoading(false);
      }
    };
    loadCustomerData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' });
      router.push('/account/login');
      router.refresh();
    } catch {
      router.push('/account/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading your Master Cue orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-sm group-hover:scale-105 transition-transform">
              🎱
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight group-hover:text-amber-400 transition-colors">
                MASTER CUE <span className="text-amber-500 font-mono text-xs">PORTAL</span>
              </h1>
              <p className="text-[10px] text-slate-400">Customer Bespoke Orders & Crafting Progress</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <span>Customizer Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1">
        {/* Customer Welcome Hero */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
              <User className="w-3.5 h-3.5" />
              <span>Customer Account Verified</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {customer?.fullName}
            </h2>
            <p className="text-xs text-slate-400">
              Registered Email: <span className="text-slate-200 font-medium">{customer?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href="/"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/10 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Build Another Cue</span>
            </Link>
          </div>
        </div>

        {/* Orders Section Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-500" />
                <span>My Bespoke Cues & Crafting Orders</span>
              </h3>
              <p className="text-xs text-slate-400">
                Live workshop crafting progress and specifications permanently linked to your account.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {orders.length} Order{orders.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-white">No Orders Placed Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you configure and order a bespoke cue in our studio, it will automatically appear here with live workshop tracking and build sheets.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition shadow-md"
              >
                <span>Open Customizer Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((ord) => {
                const currentStep = getTimelineStepIndex(ord.status);
                const isExpanded = expandedOrderId === ord.id;

                return (
                  <div
                    key={ord.id}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all"
                  >
                    {/* Order Top Bar */}
                    <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black font-mono text-amber-400">
                            {ord.orderNumber}
                          </span>
                          <span
                            className={`text-[11px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-md border ${
                              ord.status === 'in_crafting'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : ord.status === 'confirmed'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : ord.status === 'shipped'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : ord.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Placed on {new Date(ord.createdAt).toLocaleDateString()} at{' '}
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total Order Value
                          </span>
                          <span className="text-2xl font-black font-mono text-white">
                            £{ord.pricing.total}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Interactive 5-Stage Crafting Timeline */}
                    <div className="p-6 bg-slate-900 border-b border-slate-800/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span>Live Workshop Crafting Progress</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                        {TIMELINE_STEPS.map((step) => {
                          const isDone = currentStep >= step.id;
                          const isCurrent = currentStep === step.id;

                          return (
                            <div
                              key={step.id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isCurrent
                                  ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5'
                                  : isDone
                                  ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                                  : 'bg-slate-950/40 border-slate-800/60 text-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isCurrent
                                      ? 'bg-amber-500 text-slate-950'
                                      : isDone
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  {isDone && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                                </div>
                                <span className="text-xs font-bold truncate">{step.label}</span>
                              </div>
                              <p className="text-[10px] leading-tight opacity-75">{step.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expandable Specifications Sheet */}
                    {isExpanded && (
                      <div className="p-6 sm:p-8 space-y-6 bg-slate-950/40">
                        {/* Specifications Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-amber-500" />
                              Bespoke Cue Specifications Sheet
                            </span>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Spec</span>
                            </button>
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Shaft Wood</span>
                              <span className="font-bold text-white">{ord.cue.shaft?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Cue Length</span>
                              <span className="font-bold text-white">{ord.cue.length?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Ferrule & Tip</span>
                              <span className="font-bold text-white">
                                {ord.cue.ferruleType?.name} ({ord.cue.tipSize?.name})
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Cue Weight</span>
                              <span className="font-bold text-amber-400 font-mono">{ord.cue.weight} oz</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Butt Timber</span>
                              <span className="font-bold text-white">{ord.cue.buttTimber?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px]">Joint System</span>
                              <span className="font-bold text-white">{ord.cue.buttJoint?.name}</span>
                            </div>
                            {ord.cue.largeSpliceMaterial && (
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">Front Splicing</span>
                                <span className="font-bold text-white">
                                  {ord.cue.largeSplices}-Splice {ord.cue.largeSpliceMaterial.name}
                                </span>
                              </div>
                            )}
                            {ord.cue.engraving && (
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                <span className="text-slate-500 block text-[10px]">Engraved Disc</span>
                                <span className="font-bold text-amber-400 font-mono">
                                  &quot;{ord.cue.engraving}&quot; ({ord.cue.font})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Customer & Delivery Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              Delivery Destination
                            </h5>
                            <div className="text-white font-bold">{ord.customer.fullName}</div>
                            <div className="text-slate-400">{ord.customer.addressLine1}</div>
                            {ord.customer.addressLine2 && <div className="text-slate-400">{ord.customer.addressLine2}</div>}
                            <div className="text-slate-400">
                              {ord.customer.city}, {ord.customer.postcode}
                            </div>
                            <div className="text-slate-300 font-medium">{ord.customer.country}</div>
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Order Notes & Payment
                            </h5>
                            <div className="text-slate-300">
                              Payment: {ord.paymentMethod === 'invoice_bank_transfer' ? 'Direct Bank Transfer (BACS)' : 'Online Card / Invoice'}
                            </div>
                            {ord.notes && (
                              <div className="text-slate-400 italic pt-1">
                                Special Notes: &quot;{ord.notes}&quot;
                              </div>
                            )}
                            <div className="text-emerald-400 text-[11px] pt-1">
                              ✓ Insured Express Courier Included
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

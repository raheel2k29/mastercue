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
  ArrowLeft,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
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
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadCustomerData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await fetch(`/api/customer/me?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      const data = await res.json();
      if (!data.authenticated) {
        router.replace('/account/login');
        return;
      }
      setCustomer(data.customer);
      setOrders(data.orders || []);
      if (data.orders && data.orders.length > 0) {
        setExpandedOrderId((prev) => prev || data.orders[0].id);
      }
    } catch (err) {
      if (!isManual) router.replace('/account/login');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' });
      router.replace('/account/login');
      router.refresh();
    } catch {
      router.replace('/account/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading your Master Cue orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Matching Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              🎱
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                MASTER CUE{' '}
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  PORTAL
                </span>
              </span>
              <span className="text-[11px] text-slate-500 block -mt-0.5 font-medium">
                Customer Bespoke Orders & Crafting Progress
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Back to Customizer Studio</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition active:scale-95 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1">
        {/* Customer Welcome Hero */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold font-mono">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>Customer Account Verified</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {customer?.fullName}
            </h2>
            <p className="text-xs text-slate-500">
              Registered Email: <span className="text-slate-800 font-semibold">{customer?.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link
              href="/"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase shadow-md transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Build Another Cue</span>
            </Link>
          </div>
        </div>

        {/* Orders Section Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-600" />
                <span>My Bespoke Cues & Crafting Orders</span>
              </h3>
              <p className="text-xs text-slate-500">
                Live workshop crafting progress and specifications permanently linked to your account.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadCustomerData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                {orders.length} Order{orders.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400">
                <PackageCheck className="w-8 h-8 text-slate-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900">No Orders Placed Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you configure and order a bespoke cue in our studio, it will automatically appear here with live workshop tracking and build sheets.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition shadow-md"
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
                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Order Top Bar */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-lg font-black font-mono text-slate-900">
                            {ord.orderNumber}
                          </span>
                          {(ord.serviceLevel === 'priority' || ord.cue.priorityService) && (
                            <span className="text-[10px] font-mono uppercase font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                              <Zap className="w-3 h-3 fill-slate-950" />
                              <span>Priority Build (6 Weeks)</span>
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                              ord.status === 'in_crafting'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : ord.status === 'confirmed'
                                ? 'bg-sky-100 text-sky-800 border-sky-200'
                                : ord.status === 'shipped'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                : ord.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Placed on {new Date(ord.createdAt).toLocaleDateString()} at{' '}
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total Order Value
                          </span>
                          <span className="text-2xl font-black font-mono text-slate-900">
                            £{ord.pricing.total}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Interactive 5-Stage Crafting Timeline */}
                    <div className="p-6 bg-white border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Live Workshop Crafting Progress</span>
                        </h4>
                        <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                          (ord.serviceLevel === 'priority' || ord.cue.priorityService)
                            ? 'text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200'
                            : 'text-slate-500'
                        }`}>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Target: {(ord.serviceLevel === 'priority' || ord.cue.priorityService) ? 'Within 6 Weeks (Fast-Track Slot)' : '10–12 Weeks Standard'}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                        {TIMELINE_STEPS.map((step) => {
                          const isDone = currentStep >= step.id;
                          const isCurrent = currentStep === step.id;

                          return (
                            <div
                              key={step.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isCurrent
                                  ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-sm'
                                  : isDone
                                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                                  : 'bg-white border-slate-200/60 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isCurrent
                                      ? 'bg-amber-500 text-slate-950 font-black'
                                      : isDone
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {isDone && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                                </div>
                                <span className="text-xs font-bold truncate">{step.label}</span>
                              </div>
                              <p className="text-[10px] leading-tight text-slate-500">{step.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expandable Specifications Sheet */}
                    {isExpanded && (
                      <div className="p-6 sm:p-8 space-y-6 bg-slate-50/70 border-t border-slate-100">
                        {/* Specifications Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-amber-600" />
                              Bespoke Cue Specifications Sheet
                            </span>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-bold transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Spec</span>
                            </button>
                          </h4>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Shaft Wood</span>
                              <span className="font-bold text-slate-900">{ord.cue.shaft?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Cue Length</span>
                              <span className="font-bold text-slate-900">{ord.cue.length?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Ferrule & Tip</span>
                              <span className="font-bold text-slate-900">
                                {ord.cue.ferruleType?.name} ({ord.cue.tipSize?.name})
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Cue Weight</span>
                              <span className="font-bold text-slate-900 font-mono">{ord.cue.weight} oz</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Butt Timber</span>
                              <span className="font-bold text-slate-900">{ord.cue.buttTimber?.name}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-slate-400 block text-[10px]">Joint System</span>
                              <span className="font-bold text-slate-900">{ord.cue.buttJoint?.name}</span>
                            </div>
                            {ord.cue.largeSpliceMaterial && (
                              <div className="p-3 rounded-xl bg-white border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">Front Splicing</span>
                                <span className="font-bold text-slate-900">
                                  {ord.cue.largeSplices}-Splice {ord.cue.largeSpliceMaterial.name}
                                </span>
                              </div>
                            )}
                            {ord.cue.engraving && (
                              <div className="p-3 rounded-xl bg-white border border-slate-200">
                                <span className="text-slate-400 block text-[10px]">Engraved Disc</span>
                                <span className="font-bold text-slate-900 font-mono">
                                  &quot;{ord.cue.engraving}&quot; ({ord.cue.font})
                                </span>
                              </div>
                            )}
                            <div className={`p-3 rounded-xl border ${
                              (ord.serviceLevel === 'priority' || ord.cue.priorityService)
                                ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                                : 'bg-white border-slate-200'
                            }`}>
                              <span className="text-slate-400 block text-[10px]">Turnaround Service</span>
                              <span className="font-bold flex items-center gap-1">
                                {(ord.serviceLevel === 'priority' || ord.cue.priorityService) ? '⚡ Priority (Within 6 Weeks)' : 'Standard (10–12 Weeks)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer & Delivery Destination */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                            <h5 className="font-bold text-amber-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              Delivery Destination
                            </h5>
                            <div className="text-slate-900 font-bold">{ord.customer.fullName}</div>
                            <div className="text-slate-500">{ord.customer.addressLine1}</div>
                            {ord.customer.addressLine2 && <div className="text-slate-500">{ord.customer.addressLine2}</div>}
                            <div className="text-slate-500">
                              {ord.customer.city}, {ord.customer.postcode}
                            </div>
                            <div className="text-slate-700 font-medium">{ord.customer.country}</div>
                          </div>

                          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                            <h5 className="font-bold text-amber-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              Order Notes & Payment
                            </h5>
                            <div className="text-slate-600">
                              Payment: {ord.paymentMethod === 'invoice_bank_transfer' ? 'Direct Bank Transfer (BACS)' : 'Online Card / Invoice'}
                            </div>
                            {ord.notes && (
                              <div className="text-slate-500 italic pt-1">
                                Special Notes: &quot;{ord.notes}&quot;
                              </div>
                            )}
                            <div className="text-emerald-600 text-[11px] pt-1 font-semibold">
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

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  PackageCheck,
  User,
  Search,
  Sparkles,
} from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'track'>('signin');

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick order tracking state
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      router.push('/account');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackLoading(true);

    try {
      const res = await fetch('/api/customer/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: trackOrderNumber.trim(),
          email: trackEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No matching order found');
      }

      setTrackedOrder(data.order);
    } catch (err: any) {
      setTrackError(err.message || 'Tracking lookup failed');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-amber-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block group">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 items-center justify-center text-2xl shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform mb-2">
              🎱
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
              MASTER CUE <span className="text-amber-500 font-mono text-sm uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">PORTAL</span>
            </h1>
          </Link>
          <p className="text-xs text-slate-400">
            Sign in to track your bespoke cue build progress, view build specifications, and manage orders.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('signin')}
            className={`py-2.5 rounded-xl transition ${
              activeTab === 'signin'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer Sign In
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`py-2.5 rounded-xl transition ${
              activeTab === 'track'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Quick Order Tracker
          </button>
        </div>

        {/* Sign In View */}
        {activeTab === 'signin' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ronnie@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-800">
              Accounts are created automatically when placing an order. Need to track an existing order without logging in? Switch to{' '}
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className="text-amber-400 hover:underline font-bold"
              >
                Quick Order Tracker
              </button>
              .
            </div>
          </div>
        )}

        {/* Quick Order Tracker View */}
        {activeTab === 'track' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur space-y-6">
            {trackError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{trackError}</span>
              </div>
            )}

            {!trackedOrder ? (
              <form onSubmit={handleTrackOrder} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Order Reference Number
                  </label>
                  <div className="relative">
                    <PackageCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={trackOrderNumber}
                      onChange={(e) => setTrackOrderNumber(e.target.value)}
                      placeholder="e.g. MC-2655191"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Customer Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={trackEmail}
                      onChange={(e) => setTrackEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={trackLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {trackLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Track Cue Build</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {trackedOrder.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {trackedOrder.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-bold text-white">{trackedOrder.customer.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shaft Wood:</span>
                      <span className="font-semibold text-white">{trackedOrder.cue.shaft?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Length & Weight:</span>
                      <span className="font-semibold text-white">
                        {trackedOrder.cue.length?.name} • {trackedOrder.cue.weight}oz
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Ferrule & Tip:</span>
                      <span className="font-semibold text-white">
                        {trackedOrder.cue.ferruleType?.name} ({trackedOrder.cue.tipSize?.name})
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Total Price:</span>
                      <span className="font-mono text-amber-400 font-bold">£{trackedOrder.pricing.total}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTrackedOrder(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
                  >
                    Track Another Order
                  </button>
                  <Link
                    href="/"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
                  >
                    <span>Customizer Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition inline-flex items-center gap-1.5"
          >
            <span>← Back to Master Cue Customizer</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

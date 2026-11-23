'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Phone,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
  Sliders,
} from 'lucide-react';

function CustomerAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab =
    searchParams?.get('tab') === 'signup' || searchParams?.get('mode') === 'signup'
      ? 'signup'
      : searchParams?.get('tab') === 'track'
      ? 'track'
      : 'signin';

  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'track'>(initialTab);

  // Sync tab if URL search param changes
  useEffect(() => {
    const tabParam = searchParams?.get('tab') || searchParams?.get('mode');
    if (tabParam === 'signup') {
      setActiveTab('signup');
    } else if (tabParam === 'track') {
      setActiveTab('track');
    } else if (tabParam === 'signin') {
      setActiveTab('signin');
    }
  }, [searchParams]);

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign Up state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    if (!signupFullName.trim()) {
      setSignupError('Please provide your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setSignupError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match. Please re-enter.');
      return;
    }

    setSignupLoading(true);

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: signupFullName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim() || undefined,
          password: signupPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer account');
      }

      setSignupSuccess('Account created successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/account');
        router.refresh();
      }, 700);
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed');
    } finally {
      setSignupLoading(false);
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
                Customer Account & Build Tracking
              </span>
            </div>
          </Link>

          {/* Quick Back to Studio Button */}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-800 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Customizer Studio</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* Card Top Intro */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Customer Portal
            </h1>
            <p className="text-xs text-slate-500">
              Sign in or create an account to view bespoke cue specifications, crafting progress, and order receipts.
            </p>
          </div>

          {/* 3-Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`py-2.5 rounded-xl transition ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/70'
                  : 'hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setSignupError(null);
              }}
              className={`py-2.5 rounded-xl transition ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/70'
                  : 'hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('track');
                setTrackError(null);
              }}
              className={`py-2.5 rounded-xl transition ${
                activeTab === 'track'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/70'
                  : 'hover:text-slate-900'
              }`}
            >
              Track Order
            </button>
          </div>

          {/* Tab 1: Sign In View */}
          {activeTab === 'signin' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  Customer Sign In
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Access your bespoke cue orders & workshop progress.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 text-center space-y-2 border-t border-slate-100 text-xs text-slate-500">
                <p>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setSignupError(null);
                    }}
                    className="text-amber-600 hover:text-amber-700 font-bold underline"
                  >
                    Create an Account (Sign Up) →
                  </button>
                </p>
                <p className="text-[11px] text-slate-400">
                  Want to track an order without logging in? Switch to{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('track')}
                    className="text-slate-600 hover:text-slate-900 underline font-medium"
                  >
                    Quick Order Tracker
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Sign Up View */}
          {activeTab === 'signup' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  Create Customer Account
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register to track cue builds, view specs, and link orders.
                </p>
              </div>

              {signupError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              {signupSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-700 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Full Name <span className="text-amber-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Ronnie O'Sullivan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Email Address <span className="text-amber-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Phone Number <span className="text-slate-400 font-normal">(Optional, for delivery updates)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder="e.g. +44 7700 900077"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Password <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Confirm Password <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Already placed an order with this email? It will automatically link to your new account.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {signupLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Customer Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 text-center space-y-2 border-t border-slate-100 text-xs text-slate-500">
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setError(null);
                    }}
                    className="text-amber-600 hover:text-amber-700 font-bold underline"
                  >
                    Sign in here →
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Quick Order Tracker View */}
          {activeTab === 'track' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-600" />
                  Quick Order Tracker
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lookup workshop status & specs instantly with your order number.
                </p>
              </div>

              {trackError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{trackError}</span>
                </div>
              )}

              {!trackedOrder ? (
                <form onSubmit={handleTrackOrder} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Order Reference Number
                    </label>
                    <div className="relative">
                      <PackageCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={trackOrderNumber}
                        onChange={(e) => setTrackOrderNumber(e.target.value)}
                        placeholder="e.g. MC-2655191"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Customer Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={trackEmail}
                        onChange={(e) => setTrackEmail(e.target.value)}
                        placeholder="e.g. ronnie@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={trackLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {trackLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {trackedOrder.orderNumber}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {trackedOrder.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-bold text-slate-900">{trackedOrder.customer.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shaft Wood:</span>
                        <span className="font-semibold text-slate-900">{trackedOrder.cue.shaft?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Length & Weight:</span>
                        <span className="font-semibold text-slate-900">
                          {trackedOrder.cue.length?.name} • {trackedOrder.cue.weight}oz
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ferrule & Tip:</span>
                        <span className="font-semibold text-slate-900">
                          {trackedOrder.cue.ferruleType?.name} ({trackedOrder.cue.tipSize?.name})
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">Total Price:</span>
                        <span className="font-mono text-slate-900 font-extrabold text-sm">£{trackedOrder.pricing.total}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackedOrder(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                    >
                      Track Another Order
                    </button>
                    <Link
                      href="/"
                      className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
                    >
                      <span>Customizer Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-4 text-center border-t border-slate-100 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className="text-amber-600 hover:text-amber-700 font-bold underline"
                >
                  ← Return to Customer Sign In
                </button>
              </div>
            </div>
          )}

          {/* Bottom Back Link */}
          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 font-medium"
            >
              <span>← Back to Master Cue Customizer Studio</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CustomerAuthContent />
    </Suspense>
  );
}

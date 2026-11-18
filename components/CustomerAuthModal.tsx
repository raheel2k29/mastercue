'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  PackageCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup' | 'track';
  onAuthSuccess?: (customer: { id: string; email: string; fullName: string }) => void;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  initialTab = 'signin',
  onAuthSuccess,
}: CustomerAuthModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'track'>(initialTab);

  // Sign In states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Sign Up states
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  // Quick Tracker states
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSignInError(null);
      setSignUpError(null);
      setSignUpSuccess(null);
      setTrackError(null);
      setTrackedOrder(null);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail.trim(), password: signInPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      if (onAuthSuccess) {
        onAuthSuccess(data.customer);
      }
      onClose();
      router.refresh();
    } catch (err: any) {
      setSignInError(err.message || 'Login failed');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);
    setSignUpSuccess(null);

    if (!signUpFullName.trim()) {
      setSignUpError('Please enter your full name.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setSignUpError('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError('Passwords do not match. Please re-enter.');
      return;
    }

    setSignUpLoading(true);

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: signUpFullName.trim(),
          email: signUpEmail.trim(),
          phone: signUpPhone.trim() || undefined,
          password: signUpPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSignUpSuccess('Account created successfully!');
      if (onAuthSuccess) {
        onAuthSuccess(data.customer);
      }
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 700);
    } catch (err: any) {
      setSignUpError(err.message || 'Registration failed');
    } finally {
      setSignUpLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-base shadow-sm">
              🎱
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                MASTER CUE{' '}
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  PORTAL
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">Sign in, create an account, or track your custom cue build</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-3 p-1 bg-slate-100 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setSignInError(null);
              }}
              className={`py-2 rounded-xl transition ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/60'
                  : 'hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setSignUpError(null);
              }}
              className={`py-2 rounded-xl transition ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/60'
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
              className={`py-2 rounded-xl transition ${
                activeTab === 'track'
                  ? 'bg-white text-slate-950 shadow-sm font-bold border border-slate-200/60'
                  : 'hover:text-slate-900'
              }`}
            >
              Track Order
            </button>
          </div>
        </div>

        {/* Tab 1: Sign In */}
        {activeTab === 'signin' && (
          <div className="p-6 space-y-4">
            {signInError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{signInError}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. ronnie@example.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={signInLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {signInLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 text-center border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              <p>
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setSignUpError(null);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-bold underline"
                >
                  Create an Account (Sign Up) →
                </button>
              </p>
              <p className="text-[11px] text-slate-400">
                Want to look up a build status directly?{' '}
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

        {/* Tab 2: Sign Up (Account Creation) */}
        {activeTab === 'signup' && (
          <div className="p-6 space-y-4">
            {signUpError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{signUpError}</span>
              </div>
            )}

            {signUpSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span>{signUpSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Full Name <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={signUpFullName}
                    onChange={(e) => setSignUpFullName(e.target.value)}
                    placeholder="e.g. Ronnie O'Sullivan"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Email Address <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="e.g. ronnie@example.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Phone Number <span className="text-slate-400 font-normal">(Optional, for delivery updates)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="e.g. +44 7700 900077"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Password <span className="text-amber-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Confirm Password <span className="text-amber-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Existing bespoke orders with this email will automatically sync to your dashboard.</span>
              </div>

              <button
                type="submit"
                disabled={signUpLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50"
              >
                {signUpLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Customer Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 text-center border-t border-slate-100 text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setSignInError(null);
                }}
                className="text-amber-600 hover:text-amber-700 font-bold underline"
              >
                Sign in here →
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Quick Order Tracker */}
        {activeTab === 'track' && (
          <div className="p-6 space-y-4">
            {trackError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{trackError}</span>
              </div>
            )}

            {!trackedOrder ? (
              <form onSubmit={handleTrackOrder} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Order Reference</label>
                  <div className="relative">
                    <PackageCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={trackOrderNumber}
                      onChange={(e) => setTrackOrderNumber(e.target.value)}
                      placeholder="e.g. MC-2655191"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Customer Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={trackEmail}
                      onChange={(e) => setTrackEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={trackLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
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
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {trackedOrder.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {trackedOrder.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Customer:</span>
                      <span className="font-bold text-slate-800">{trackedOrder.customer.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Shaft:</span>
                      <span className="font-semibold text-slate-800">{trackedOrder.cue.shaft?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Length & Weight:</span>
                      <span className="font-semibold text-slate-800">
                        {trackedOrder.cue.length?.name} • {trackedOrder.cue.weight}oz
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">Total:</span>
                      <span className="font-mono text-slate-900 font-extrabold text-sm">£{trackedOrder.pricing.total}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTrackedOrder(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                  >
                    Track Another
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    Back to Studio
                  </button>
                </div>
              </div>
            )}

            <div className="pt-3 text-center border-t border-slate-100 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className="text-amber-600 hover:text-amber-700 font-bold underline"
              >
                ← Return to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

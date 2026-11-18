'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Printer,
  Copy,
  Check,
  PackageCheck,
  AlertCircle,
  Sparkles,
  User,
  UserCheck,
  Eye,
  EyeOff,
  Zap,
  Clock,
  Briefcase,
  Shield,
} from 'lucide-react';
import { CueConfiguration, CueCase } from '@/types/cue';
import { OrderRecord } from '@/types/order';
import { CUE_CASES } from '@/lib/cueData';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cue: CueConfiguration;
  customer?: { id: string; email: string; fullName: string; phone?: string; shippingAddress?: any } | null;
  price: {
    total: number;
    shaftPrice: number;
    lengthPrice: number;
    buttTimberPrice: number;
    largeSplicePrice: number;
    smallSplicePrice: number;
    largeVeneersPrice: number;
    smallVeneersPrice: number;
    endButtJoinPrice: number;
    domeJointPrice: number;
    ferrulePrice: number;
    tipPrice: number;
    platePrice: number;
    engravingPrice: number;
    miniButtPrice: number;
    extensionsPrice: number;
    priorityServicePrice?: number;
    casePrice?: number;
  };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cue,
  price,
  customer,
}) => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [notes, setNotes] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [priorityService, setPriorityService] = useState<boolean>(Boolean(cue.priorityService));
  const [selectedCase, setSelectedCase] = useState<CueCase | null>(cue.case || null);
  const [paymentMethod, setPaymentMethod] = useState<'invoice_bank_transfer' | 'card_link' | 'paypal'>(
    'invoice_bank_transfer'
  );

  // Synchronize options whenever modal opens or cue prop changes
  useEffect(() => {
    if (isOpen) {
      setPriorityService(Boolean(cue.priorityService));
      setSelectedCase(cue.case || null);
    }
  }, [isOpen, cue.priorityService, cue.case]);

  // Dynamic payable calculation (ensures live update if user toggles turnaround or case in checkout)
  const baseWithoutExtras =
    price.total -
    (price.priorityServicePrice || (cue.priorityService ? 40 : 0)) -
    (price.casePrice || (cue.case?.bundlePrice || 0));
  const currentPriorityPrice = priorityService ? 40 : 0;
  const currentCasePrice = selectedCase && selectedCase.id !== 'case_none' ? (selectedCase.bundlePrice || 0) : 0;
  const payableTotal = baseWithoutExtras + currentPriorityPrice + currentCasePrice;

  // Customer session & account lookup
  const [activeCustomer, setActiveCustomer] = useState<{
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    shippingAddress?: any;
  } | null>(customer || null);
  const [emailAccountExists, setEmailAccountExists] = useState(false);

  // Sync / check customer on open
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setActiveCustomer(customer);
        setFullName((prev) => prev || customer.fullName || '');
        setEmail((prev) => prev || customer.email || '');
        setPhone((prev) => prev || customer.phone || '');
        if (customer.shippingAddress) {
          setAddressLine1((prev) => prev || customer.shippingAddress.addressLine1 || '');
          setAddressLine2((prev) => prev || customer.shippingAddress.addressLine2 || '');
          setCity((prev) => prev || customer.shippingAddress.city || '');
          setPostcode((prev) => prev || customer.shippingAddress.postcode || '');
          setCountry((prev) => prev || customer.shippingAddress.country || 'United Kingdom');
        }
      } else {
        fetch('/api/customer/me', { cache: 'no-store' })
          .then((r) => r.json())
          .then((data) => {
            if (data.authenticated && data.customer) {
              setActiveCustomer(data.customer);
              setFullName((prev) => prev || data.customer.fullName || '');
              setEmail((prev) => prev || data.customer.email || '');
              setPhone((prev) => prev || data.customer.phone || '');
              if (data.customer.shippingAddress) {
                setAddressLine1((prev) => prev || data.customer.shippingAddress.addressLine1 || '');
                setAddressLine2((prev) => prev || data.customer.shippingAddress.addressLine2 || '');
                setCity((prev) => prev || data.customer.shippingAddress.city || '');
                setPostcode((prev) => prev || data.customer.shippingAddress.postcode || '');
                setCountry((prev) => prev || data.customer.shippingAddress.country || 'United Kingdom');
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, customer]);

  // Debounced email lookup for guest checkout
  useEffect(() => {
    if (!activeCustomer && email.includes('@') && email.length > 5) {
      const timer = setTimeout(() => {
        fetch(`/api/customer/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
          .then((r) => r.json())
          .then((d) => {
            setEmailAccountExists(Boolean(d.exists));
          })
          .catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setEmailAccountExists(false);
    }
  }, [email, activeCustomer]);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Clear completed order state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCompletedOrder(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    setCompletedOrder(null);
    setErrorMessage(null);
    onClose();
  };

  const handleCopyOrderNumber = () => {
    if (!completedOrder) return;
    navigator.clipboard.writeText(completedOrder.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter a phone number for courier delivery.');
      return;
    }
    if (!addressLine1.trim()) {
      setErrorMessage('Please enter your delivery street address.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your delivery city.');
      return;
    }
    if (!postcode.trim()) {
      setErrorMessage('Please enter your postal / ZIP code.');
      return;
    }
    // Password is only validated if a new unauthenticated customer chooses to create an account
    if (!activeCustomer && !emailAccountExists && accountPassword && accountPassword.trim().length < 6) {
      setErrorMessage('Account password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);

      const updatedCue: CueConfiguration = {
        ...cue,
        priorityService,
        case: selectedCase,
      };

      const payload = {
        customer: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          postcode: postcode.trim().toUpperCase(),
          country: country.trim(),
        },
        cue: updatedCue,
        pricing: {
          ...price,
          priorityServicePrice: currentPriorityPrice,
          casePrice: currentCasePrice,
          total: payableTotal,
          currency: '£',
        },
        serviceLevel: priorityService ? 'priority' : 'standard',
        targetCompletionWeeks: priorityService ? 6 : 12,
        paymentMethod,
        notes: notes.trim(),
        accountPassword: (!activeCustomer && !emailAccountExists && accountPassword) ? accountPassword.trim() : undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit order. Please try again.');
      }

      setCompletedOrder(data.order);
      setAccountCreated(Boolean(data.accountCreated));
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong while submitting your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-extrabold text-xs">
              MC
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {completedOrder ? 'Order Confirmed' : 'Master Cue Bespoke Checkout'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {completedOrder
                  ? 'Your handcrafted cue order has been queued in our master workshop'
                  : 'Fast, secure order placement directly to our workshop'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {completedOrder ? (
          /* ================= ORDER CONFIRMATION SCREEN ================= */
          <div className="p-6 sm:p-10 space-y-8 print:p-0">
            {/* Header Banner */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-4 border-emerald-100 shadow-sm animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-black text-slate-950">Thank You For Your Order!</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your bespoke cue order has been permanently registered in our workshop queue. We have prepared your build sheet.
              </p>
            </div>

            {/* Order Reference Card */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Unique Order Reference
                </span>
                <div className="text-2xl font-black font-mono text-slate-950 tracking-wider">
                  {completedOrder.orderNumber}
                </div>
                <span className="text-xs text-amber-900/80">
                  Save this reference for crafting tracking & inquiries.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100/50 text-xs font-bold text-slate-900 shadow-sm transition active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Reference' : 'Copy Number'}</span>
              </button>
            </div>

            {/* Priority Fast-Track Banner */}
            {(completedOrder.serviceLevel === 'priority' || completedOrder.cue.priorityService) && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                  <Zap className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-950 flex items-center gap-2">
                    <span>Priority Workshop Service Activated</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black uppercase">
                      6 Weeks Guaranteed
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-950 mt-0.5">
                    Your bespoke cue has received top-tier workshop scheduling and will be crafted, hand-spliced, and balanced within 6 weeks.
                  </div>
                </div>
              </div>
            )}

            {/* Account Attached Card */}
            <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Customer Account Activated</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Your customer account has been created for <span className="text-amber-400 font-semibold">{completedOrder.customer.email}</span>. You can sign in anytime to monitor crafting progress.
                  </div>
                </div>
              </div>
              <a
                href="/account"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-sm transition whitespace-nowrap active:scale-95 flex-shrink-0"
              >
                <span>Track in Customer Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Specifications Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
              {/* Build Specs */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-600" />
                  Bespoke Cue Specifications
                </h4>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shaft Wood:</span>
                    <span className="font-bold text-slate-950">{completedOrder.cue.shaft?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overall Length:</span>
                    <span className="font-bold text-slate-950">{completedOrder.cue.length?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ferrule & Tip:</span>
                    <span className="font-bold text-slate-950">
                      {completedOrder.cue.ferruleType?.name} ({completedOrder.cue.tipSize?.name})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Weight:</span>
                    <span className="font-bold text-slate-950 font-mono">{completedOrder.cue.weight} oz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Butt Timber:</span>
                    <span className="font-bold text-slate-950">{completedOrder.cue.buttTimber?.name}</span>
                  </div>
                  {completedOrder.cue.largeSpliceMaterial && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Front Splices:</span>
                      <span className="font-bold text-slate-950">
                        {completedOrder.cue.largeSplices}-Splice {completedOrder.cue.largeSpliceMaterial.name}
                      </span>
                    </div>
                  )}
                  {completedOrder.cue.engraving && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Engraved Disc:</span>
                      <span className="font-bold text-amber-700 uppercase tracking-wider">
                        &quot;{completedOrder.cue.engraving}&quot;
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Workshop Turnaround:</span>
                    <span className={`font-bold ${(completedOrder.serviceLevel === 'priority' || completedOrder.cue.priorityService) ? 'text-amber-700 font-semibold' : 'text-slate-950'}`}>
                      {(completedOrder.serviceLevel === 'priority' || completedOrder.cue.priorityService) ? '⚡ Priority Service (Within 6 Weeks)' : 'Standard (10–12 Weeks)'}
                    </span>
                  </div>
                  {completedOrder.cue.case && completedOrder.cue.case.id !== 'case_none' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bundled Cue Case:</span>
                      <span className="font-bold text-emerald-700">
                        {completedOrder.cue.case.name} (+£{completedOrder.cue.case.bundlePrice})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery & Payment Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Delivery & Contact
                </h4>
                <div className="text-xs space-y-1 text-slate-700">
                  <div className="font-bold text-slate-950">{completedOrder.customer.fullName}</div>
                  <div>{completedOrder.customer.email}</div>
                  <div>{completedOrder.customer.phone}</div>
                  <div className="text-slate-500 pt-1">
                    {completedOrder.customer.addressLine1}
                    {completedOrder.customer.addressLine2 ? `, ${completedOrder.customer.addressLine2}` : ''}
                  </div>
                  <div className="text-slate-500">
                    {completedOrder.customer.city}, {completedOrder.customer.postcode}
                  </div>
                  <div className="font-medium text-slate-800">{completedOrder.customer.country}</div>
                  <div className="pt-2 text-slate-500 border-t border-slate-200 flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-mono text-base font-black text-slate-950">
                      £{completedOrder.pricing.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm w-full sm:w-auto justify-center"
              >
                <Printer className="w-4 h-4" />
                <span>Print Build Summary</span>
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold shadow-md transition active:scale-95 w-full sm:w-auto justify-center"
              >
                <span>Customize Another Cue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ================= CHECKOUT FORM ================= */
          <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN: Specification & Price Review (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Bespoke Selection
                    </span>
                    <span className="text-xl font-mono font-black text-white">£{payableTotal}</span>
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Shaft Wood:</span>
                      <span className="font-semibold text-white">{cue.shaft?.name}</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Length:</span>
                      <span className="font-semibold text-white">{cue.length?.name}</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Ferrule & Tip:</span>
                      <span className="font-semibold text-white">
                        {cue.ferruleType?.name} ({cue.tipSize?.name})
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Weight:</span>
                      <span className="font-semibold text-amber-400 font-mono">{cue.weight} oz</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Butt Timber:</span>
                      <span className="font-semibold text-white">{cue.buttTimber?.name}</span>
                    </div>
                    {cue.largeSpliceMaterial && (
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-400">Splices:</span>
                        <span className="font-semibold text-white">
                          {cue.largeSplices}-Splice {cue.largeSpliceMaterial.name}
                        </span>
                      </div>
                    )}
                    {cue.engraving && (
                      <div className="flex justify-between pt-1.5">
                        <span className="text-slate-400">Engraved Disc:</span>
                        <span className="font-semibold text-amber-400 uppercase tracking-wider truncate max-w-[150px]">
                          &quot;{cue.engraving}&quot;
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5 text-emerald-400 font-medium">
                      <span>Insured Courier Delivery:</span>
                      <span className="font-bold">FREE</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-slate-400">Crafting Turnaround:</span>
                      <span className={priorityService ? 'font-bold text-amber-400 flex items-center gap-1' : 'font-semibold text-white'}>
                        {priorityService ? '⚡ Priority (6 Wks)' : 'Standard (10-12 Wks)'}
                      </span>
                    </div>
                    {priorityService && (
                      <div className="flex justify-between pt-1.5 text-amber-400 font-medium">
                        <span>Priority Crafting Slot:</span>
                        <span className="font-mono font-bold">+£40</span>
                      </div>
                    )}
                    {selectedCase && selectedCase.id !== 'case_none' && (
                      <div className="flex justify-between pt-1.5 text-emerald-400 font-medium">
                        <span className="truncate max-w-[170px]">Case: {selectedCase.name}:</span>
                        <span className="font-mono font-bold">+£{selectedCase.bundlePrice}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Total payable:</span>
                    <span className="font-mono text-2xl font-black text-amber-400">£{payableTotal}</span>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Master Cue 100% Genuine Handcrafted Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    <span>Tracked worldwide delivery with premium hard tube</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Custom crafted by Master Craftsman to exact specs</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Customer Details & Shipping Form (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
                  Customer & Shipping Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ronnie O'Sullivan"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      {activeCustomer && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Account Email
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(activeCustomer)}
                      value={email}
                      onChange={(e) => !activeCustomer && setEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className={`w-full px-3 py-2 text-xs rounded-xl border ${
                        activeCustomer
                          ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed font-medium'
                          : 'border-slate-300'
                      } focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phone Number (for Courier & Tracking SMS) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900077"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="House number and street name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="London"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Postcode / ZIP <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="SW1A 1AA"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Country <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition bg-white"
                    >
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Ireland">Ireland</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="China">China</option>
                      <option value="Hong Kong">Hong Kong</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Other">Other (Global Express)</option>
                    </select>
                  </div>
                </div>

                {/* Customer Account Status / Creation */}
                {activeCustomer ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block">
                          Signed In as {activeCustomer.fullName}
                        </span>
                        <span className="text-emerald-700 text-[11px] block">
                          {activeCustomer.email} • This bespoke order will automatically link to your customer account
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                      Account Active
                    </span>
                  </div>
                ) : emailAccountExists ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 block">
                          Master Cue Account Found
                        </span>
                        <span className="text-amber-700 text-[11px] block">
                          An account for {email} exists. This order will automatically link to your account dashboard without needing a new password.
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300 flex-shrink-0">
                      Auto-Linked
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Create Account to Track Order <span className="text-slate-400 font-normal">(Optional)</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        Optional
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Set a password if you want to track handcrafting progress and download build sheets in the customer portal. Leave blank to checkout as guest.
                    </p>
                    <div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          placeholder="Choose password (min 6 characters) or leave blank"
                          className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Turnaround & Service Level Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Workshop Crafting Turnaround
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {priorityService ? '⚡ Priority Slot Allocated' : 'Standard Queue'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPriorityService(false)}
                      className={`p-3 rounded-xl border text-left transition ${
                        !priorityService
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Standard Handcrafting</span>
                        {!priorityService && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">10–12 weeks handcrafting</div>
                      <div className="text-[11px] font-bold text-slate-900 mt-1">Included (Free)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPriorityService(true)}
                      className={`p-3 rounded-xl border text-left transition relative ${
                        priorityService
                          ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-amber-50 ring-2 ring-amber-500 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-950 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>Priority Service</span>
                        </span>
                        {priorityService && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="text-[11px] text-amber-950 font-medium mt-0.5">Ready within 6 weeks</div>
                      <div className="text-[11px] font-bold text-amber-800 font-mono mt-1">+£40 Expedited</div>
                    </button>
                  </div>
                </div>

                {/* Cue & Case Bundle Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Bespoke Cue & Case Bundle Deal
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Bundle Savings
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {CUE_CASES.map((c) => {
                      const isSelected = (selectedCase?.id === c.id) || (!selectedCase && c.id === 'case_none');
                      const isNone = c.id === 'case_none';

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCase(isNone ? null : c)}
                          className={`w-full p-2.5 rounded-xl border text-left transition text-xs flex items-center justify-between ${
                            isSelected
                              ? isNone
                                ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-400'
                                : 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                            <div className="truncate">
                              <span className="font-semibold text-slate-900 block truncate">{c.name}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{c.tagline}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 font-mono text-[11px]">
                            {c.retailPrice > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 line-through text-[10px]">£{c.retailPrice}</span>
                                <span className="font-bold text-amber-700">+£{c.bundlePrice}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-bold">Included</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Special Crafting Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Special Crafting / Balance Preferences (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Preferred balance point, slight taper adjustment, or delivery notes"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition resize-none"
                  />
                </div>

                {/* Payment Option */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === 'invoice_bank_transfer'
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'invoice_bank_transfer'}
                        onChange={() => setPaymentMethod('invoice_bank_transfer')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Direct Bank Transfer (BACS)</div>
                        <div className="text-[11px] text-slate-500">
                          Official invoice & bank details emailed upon submission.
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        paymentMethod === 'card_link'
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'card_link'}
                        onChange={() => setPaymentMethod('card_link')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Card / PayPal Invoice</div>
                        <div className="text-[11px] text-slate-500">
                          Secure online card payment link sent with order receipt.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Transmitting Order to Workshop...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Place Bespoke Order • £{payableTotal}</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

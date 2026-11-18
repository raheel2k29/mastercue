'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { CueConfiguration } from '@/types/cue';
import { OrderRecord } from '@/types/order';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cue: CueConfiguration;
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
  };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cue,
  price,
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
  const [paymentMethod, setPaymentMethod] = useState<'invoice_bank_transfer' | 'card_link' | 'paypal'>(
    'invoice_bank_transfer'
  );

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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

    try {
      setIsSubmitting(true);

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
        cue,
        pricing: {
          ...price,
          currency: '£',
        },
        paymentMethod,
        notes: notes.trim(),
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
            onClick={onClose}
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
                onClick={onClose}
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
                    <span className="text-xl font-mono font-black text-white">£{price.total}</span>
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
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Total payable:</span>
                    <span className="font-mono text-2xl font-black text-amber-400">£{price.total}</span>
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ronnie@example.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition"
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
                        <span>Place Bespoke Order • £{price.total}</span>
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

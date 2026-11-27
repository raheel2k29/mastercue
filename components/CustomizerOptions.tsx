'use client';

import React, { useState, useEffect } from 'react';
import {
  CueConfiguration,
  CueShaft,
  CueLength,
  CueJoint,
  CueButtTimber,
  CueSplice,
  CueVeneer,
  CueFerrule,
  CueTip,
  CueTipSize,
  CuePlate,
  CueExtension,
  CueMiniButt,
} from '@/types/cue';

import {
  CUE_SHAFTS,
  CUE_LENGTHS,
  CUE_JOINTS,
  CUE_BUTT_TIMBERS,
  CUE_SPLICES,
  CUE_VENEERS,
  CUE_FERRULES,
  CUE_TIPS,
  CUE_PLATES,
  CUE_EXTENSIONS,
  CUE_MINI_BUTTS,
} from '@/lib/cueData';

import { usePricing } from '@/context/PricingContext';

import {
  calculatePrice,
  getWeightRange,
  getButtTimberAsset,
  isButtTimberAvailable,
  isButtJointAvailable,
  isLengthAvailable,
  isLargeSplicesAllowed,
  isExtensionsAllowed,
  isTipSizeAvailable,
  getAvailableTipSizes,
  canSelectVeneer,
  BUTT_JOINT_FITTING_PRICE,
  DOME_JOINT_PRICE,
  ozToGrams,
  formatCueWeight,
  parseLengthParts,
} from '@/lib/cueEngine';

import {
  Layers,
  Sparkles,
  Ruler,
  CircleDot,
  Palette,
  Type,
  PlusCircle,
  Check,
  AlertTriangle,
  Lock,
  Zap,
  Clock,
  Briefcase,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'Shaft', fullLabel: 'Shaft Timber, Length & Weight', icon: Ruler },
  { id: 'butt', label: 'Joint', fullLabel: 'Butt Timber, Joint & Fittings', icon: CircleDot },
  { id: 'splices', label: 'Splices', fullLabel: 'Exotic Front Splicing', icon: Layers },
  { id: 'veneers', label: 'Veneers', fullLabel: 'Cascading Color Veneer Inlays', icon: Palette },
  { id: 'tip', label: 'Tip', fullLabel: 'Tip Model & Ferrule Selection', icon: Sparkles },
  { id: 'engraving', label: 'Engrave', fullLabel: 'Personalised Disc & Typography', icon: Type },
  { id: 'accessories', label: 'Extras', fullLabel: 'Mini Butt, Extensions & Tournament Case', icon: PlusCircle },
] as const;

type TabId = typeof TABS[number]['id'];

interface CustomizerOptionsProps {
  cue: CueConfiguration;
  onChange: (updated: CueConfiguration) => void;
  onOpenCheckout?: () => void;
  highlightTrigger?: number;
}

export const CustomizerOptions: React.FC<CustomizerOptionsProps> = ({
  cue,
  onChange,
  onOpenCheckout,
  highlightTrigger = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  // Starts empty by default so progress starts at 0% and tabs are clean
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  const [spliceType, setSpliceType] = useState<'large' | 'small'>('large');
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlightTrigger && highlightTrigger > 0) {
      setActiveTab('general');
      setIsHighlighted(true);
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightTrigger]);

  const { catalog, calculateDynamicPrice } = usePricing();
  const price = calculateDynamicPrice(cue);
  const weightRange = getWeightRange(cue);

  const markTabCompleted = (tabId: string) => {
    setCompletedTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
  };

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
  };

  const updateCue = (partial: Partial<CueConfiguration>) => {
    if (partial.shaft) {
      setIsHighlighted(false);
    }
    onChange({ ...cue, ...partial });
    markTabCompleted(activeTab);
  };

  const isTabCompleted = (tabId: string) => {
    return completedTabs.includes(tabId);
  };

  const completedCount = TABS.filter((t) => isTabCompleted(t.id)).length;
  const progressPercentage = Math.round((completedCount / TABS.length) * 100);
  const currentStepIndex = TABS.findIndex((t) => t.id === activeTab);
  const currentTabConfig = TABS[currentStepIndex] || TABS[0];

  const spliceCondition = isLargeSplicesAllowed(cue);
  const extensionCondition = isExtensionsAllowed(cue);

  // Auto-healing handlers
  const handleFerruleChange = (ferrule: CueFerrule) => {
    const updatedCue = { ...cue, ferruleType: ferrule };
    if (!isTipSizeAvailable(updatedCue, cue.tipSize)) {
      if (cue.tip) {
        const validSizes = getAvailableTipSizes(updatedCue, cue.tip);
        if (validSizes.length > 0) {
          updatedCue.tipSize = validSizes[0];
        }
      }
    }
    onChange(updatedCue);
    markTabCompleted('tip');
  };

  const handleJointChange = (joint: CueJoint) => {
    const updatedCue = { ...cue, buttJoint: joint };
    if (!isButtTimberAvailable(updatedCue, cue.buttTimber)) {
      const validTimber = CUE_BUTT_TIMBERS.find((t) => isButtTimberAvailable(updatedCue, t));
      if (validTimber) updatedCue.buttTimber = validTimber;
    }
    onChange(updatedCue);
    markTabCompleted('butt');
  };

  const handleTimberChange = (timber: CueButtTimber) => {
    const updatedCue = { ...cue, buttTimber: timber };
    if (!isButtJointAvailable(updatedCue, cue.buttJoint)) {
      const validJoint = CUE_JOINTS.find((j) => isButtJointAvailable(updatedCue, j));
      if (validJoint) updatedCue.buttJoint = validJoint;
    }
    onChange(updatedCue);
    markTabCompleted('butt');
  };

  return (
    <div
      className={`w-full bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col lg:sticky lg:top-20 max-h-[calc(100vh-7rem)] transition-all duration-500 ${
        isHighlighted
          ? 'border-amber-400 ring-4 ring-amber-400/40 shadow-xl shadow-amber-500/10'
          : 'border-slate-200'
      }`}
    >
      {/* 1. Configuration Progress & Step Counter Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[10px] font-black font-mono">
              {currentStepIndex + 1}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                Step {currentStepIndex + 1} of 7: {currentTabConfig.label}
              </span>
              {isTabCompleted(activeTab) ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                  In Progress
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-600">
              {completedCount}/7 Done
            </span>
            <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Dynamic Animated Progress Bar Strip */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 2. Precision Single-Row Segmented Tab Bar with Progress Ticks (✓) */}
      <div className="border-b border-slate-200 bg-slate-50/90 p-2 shrink-0">
        <div className="grid grid-cols-7 gap-1 bg-slate-200/60 p-1 rounded-xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCompleted = isTabCompleted(tab.id);
            return (
              <button
                key={tab.id}
                title={`${tab.fullLabel}${isCompleted ? ' (Completed)' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-center transition-all ${
                  isActive
                    ? 'bg-white text-slate-950 font-bold shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                  {isCompleted && (
                    <span
                      title="Step Completed"
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs"
                    >
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-tight truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options Scrollable Content Container */}
      <div className="p-5 flex-1 overflow-y-auto space-y-6 min-h-0">
        {/* --- TAB 1: GENERAL (SHAFT, LENGTH, WEIGHT) --- */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Shaft Wood & Grade */}
            <div
              id="shaft-selection-card"
              className={`space-y-3 transition-all duration-500 rounded-2xl p-3 -m-3 ${
                isHighlighted
                  ? 'bg-amber-50/70 ring-2 ring-amber-400/90 shadow-md shadow-amber-400/20 scale-[1.01]'
                  : 'bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">Shaft Wood & Grade</h3>
                    {isHighlighted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                        👉 Select your shaft here
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Premium timber species and straightness grading.
                  </p>
                </div>
                <span className="text-xs text-amber-700 font-mono font-bold shrink-0">
                  {cue.shaft ? `£${cue.shaft.price}` : 'Select to start'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catalog.shafts.map((shaft) => {
                  const isSelected = cue.shaft?.id === shaft.id;
                  const isEnabled = shaft.enabled !== false;
                  return (
                    <button
                      key={shaft.id}
                      disabled={!isEnabled}
                      onClick={() => updateCue({ shaft })}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                          : isHighlighted
                          ? 'border-amber-300 bg-white hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                          : isEnabled
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900">{shaft.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                        {!isEnabled && (
                          <span className="text-[10px] text-red-500 bg-red-50 px-1 py-0.5 rounded font-medium">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-700">
                        £{shaft.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cue Length */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cue Length</h3>
                  <p className="text-xs text-slate-500">
                    All 31 tournament lengths from 48” (122cm) to 63” (160cm).
                  </p>
                </div>
                <span className="text-xs text-amber-700 font-mono font-bold shrink-0">
                  {cue.length?.name}
                </span>
              </div>

              <select
                value={cue.length?.id}
                onChange={(e) => {
                  const selected = CUE_LENGTHS.find((l) => l.id === e.target.value);
                  if (selected && isLengthAvailable(cue, selected)) {
                    updateCue({ length: selected });
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
              >
                {CUE_LENGTHS.map((len) => {
                  const isAvailable = isLengthAvailable(cue, len);
                  return (
                    <option key={len.id} value={len.id} disabled={!isAvailable}>
                      {len.name} {!isAvailable ? '(Unavailable without butt timber)' : ''}
                    </option>
                  );
                })}
              </select>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin border border-slate-100 p-2 rounded-xl bg-slate-50/40">
                {CUE_LENGTHS.map((len) => {
                  const isSelected = cue.length?.id === len.id;
                  const isAvailable = isLengthAvailable(cue, len);
                  const { inches, cm } = parseLengthParts(len.name);

                  return (
                    <button
                      key={len.id}
                      disabled={!isAvailable}
                      onClick={() => updateCue({ length: len })}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : isAvailable
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-30 cursor-not-allowed'
                      }`}
                      title={`${inches} (${cm})`}
                    >
                      <div className="flex flex-col items-center justify-center leading-none py-0.5">
                        <span className="text-[11px] font-bold">{inches}</span>
                        <span
                          className={`text-[9px] mt-0.5 ${
                            isSelected ? 'text-slate-950/80 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {cm}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cue Weight */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cue Weight</h3>
                  <p className="text-xs text-slate-500">
                    Dynamic range: {weightRange.min}oz ({ozToGrams(weightRange.min)}g) – {weightRange.max}oz ({ozToGrams(weightRange.max)}g)
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700">
                  {formatCueWeight(cue.weight)}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <input
                  type="range"
                  min={weightRange.min}
                  max={weightRange.max}
                  step={0.5}
                  value={cue.weight}
                  onChange={(e) => updateCue({ weight: parseFloat(e.target.value) })}
                  className="w-full accent-slate-900 bg-slate-200 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                  <span>Min: {weightRange.min} oz ({ozToGrams(weightRange.min)}g)</span>
                  <span className="font-bold text-slate-900 text-xs bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    {formatCueWeight(cue.weight)}
                  </span>
                  <span>Max: {weightRange.max} oz ({ozToGrams(weightRange.max)}g)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: BUTT & JOINT --- */}
        {activeTab === 'butt' && (
          <div className="space-y-6">
            {/* Butt Timber */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Butt Timber</h3>
                <span className="text-xs text-amber-700 font-mono font-bold">
                  £{price.buttTimberPrice}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Craftsmanship & timber species applied to the butt section.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CUE_BUTT_TIMBERS.map((timber) => {
                  const isSelected = cue.buttTimber?.id === timber.id;
                  const isAvailable = isButtTimberAvailable(cue, timber);

                  const match = timber.assets?.find(
                    (a) =>
                      a.allowedJoint_Id === cue.buttJoint?.id &&
                      a.allowedShafts.includes(cue.shaft?.asset || CUE_SHAFTS[0]?.asset || '')
                  );
                  const timberPrice = match?.price ?? timber.assets?.[0]?.price ?? 0;

                  return (
                    <button
                      key={timber.id}
                      disabled={!isAvailable}
                      onClick={() => handleTimberChange(timber)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900 ring-1 ring-amber-500'
                          : isAvailable
                          ? 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{timber.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                        {!isAvailable && (
                          <span className="text-[10px] text-red-600 bg-red-50 px-1 py-0.2 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-amber-700">
                        £{timberPrice}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Joint Configuration */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Joint Configuration</h3>
              <p className="text-xs text-slate-500">
                1-Piece, Centre Joint (50/50), or 3/4 Through Butt.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CUE_JOINTS.map((joint) => {
                  const isSelected = cue.buttJoint?.id === joint.id;
                  const isAvailable = isButtJointAvailable(cue, joint);

                  return (
                    <button
                      key={joint.id}
                      disabled={!isAvailable}
                      onClick={() => handleJointChange(joint)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900 ring-1 ring-amber-500'
                          : isAvailable
                          ? 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <span>{joint.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                      {!isAvailable && <Lock className="w-3 h-3 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Butt & Dome Fittings */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Hardware & Collar Fittings</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* End Butt Joint */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Butt Joint (+£{catalog.surcharges.buttJointFittingPrice})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Female thread for extensions
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateCue({ endButtJoin: true })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cue.endButtJoin
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => updateCue({ endButtJoin: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        !cue.endButtJoin
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Dome Joint */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Dome Joint (+£{catalog.surcharges.domeJointPrice})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Collar (Disables splices)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateCue({ dome: true })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        cue.dome
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => updateCue({ dome: false })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        !cue.dome
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: SPLICING --- */}
        {activeTab === 'splices' && (
          <div className="space-y-6">
            {!spliceCondition.allowed ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-bold text-amber-900 block">
                    Splicing Is Conditionally Disabled
                  </span>
                  <span className="text-xs text-amber-800 mt-0.5 block">
                    {spliceCondition.reason}. In the &quot;Butt & Joint&quot; tab, set Dome Joint to &quot;No&quot; to enable splices.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Splicing Sub-Nav: Large vs Small */}
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setSpliceType('large')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      spliceType === 'large'
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Large Front Splicing ({cue.largeSplices ? `${cue.largeSplices}-Splice` : 'None'})
                  </button>
                  <button
                    onClick={() => setSpliceType('small')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      spliceType === 'small'
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Small Lower Splicing ({cue.smallSplices ? `${cue.smallSplices}-Splice` : 'None'})
                  </button>
                </div>

                {spliceType === 'large' ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Large Splicing Style</h3>
                        <p className="text-xs text-slate-500">
                          Primary front-facing splice pointed toward the shaft.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { count: 0, label: 'Plain' },
                          { count: 1, label: '1 Splice' },
                          { count: 4, label: '4-Way' },
                        ].map((s) => {
                          const isSelected = cue.largeSplices === s.count;
                          return (
                            <button
                              key={s.count}
                              onClick={() => updateCue({ largeSplices: s.count })}
                              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cue.largeSplices > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Select Large Splicing Timber
                          </h4>
                          <span className="text-xs text-amber-700 font-mono font-bold">
                            {cue.largeSpliceMaterial
                              ? cue.largeSplices === 4
                                ? `+£${cue.largeSpliceMaterial.fourPrice}`
                                : `+£${cue.largeSpliceMaterial.onePrice}`
                              : 'Select a wood'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                          {catalog.splices.filter((s) => s.for === 0 || s.for === undefined).map((splice) => {
                            const isSelected = cue.largeSpliceMaterial?.id === splice.id;
                            const isEnabled = splice.enabled !== false;
                            const priceTag = cue.largeSplices === 4 ? splice.fourPrice : splice.onePrice;
                            return (
                              <button
                                key={splice.id}
                                disabled={!isEnabled}
                                onClick={() => updateCue({ largeSpliceMaterial: splice })}
                                className={`flex flex-col items-center p-3 rounded-2xl border transition-all text-center ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500 shadow-sm'
                                    : isEnabled
                                    ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                                    : 'border-slate-100 bg-slate-50/20 opacity-40 cursor-not-allowed'
                                }`}
                              >
                                <div
                                  className="w-12 h-12 rounded-full border border-slate-300 shadow-inner mb-2 bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url('/api/cue-image/materials/${splice.previewImage}.jpg')`,
                                  }}
                                />
                                <span className="text-xs font-semibold text-slate-900 truncate w-full">
                                  {splice.name}
                                </span>
                                <span className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">
                                  +£{priceTag}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Small Splicing Style</h3>
                        <p className="text-xs text-slate-500">
                          Secondary lower splice accents nested near the butt.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { count: 0, label: 'None' },
                          { count: 1, label: '1 Splice' },
                          { count: 4, label: '4-Way' },
                        ].map((s) => {
                          const isSelected = cue.smallSplices === s.count;
                          return (
                            <button
                              key={s.count}
                              onClick={() => updateCue({ smallSplices: s.count })}
                              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cue.smallSplices > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Select Small Splicing Timber
                          </h4>
                          <span className="text-xs text-amber-700 font-mono font-bold">
                            {cue.smallSpliceMaterial
                              ? cue.smallSplices === 4
                                ? `+£${cue.smallSpliceMaterial.fourPrice}`
                                : `+£${cue.smallSpliceMaterial.onePrice}`
                              : 'Select a wood'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                          {catalog.splices.filter((s) => s.for === 1).map((splice) => {
                            const isSelected = cue.smallSpliceMaterial?.id === splice.id;
                            const isEnabled = splice.enabled !== false;
                            const priceTag = cue.smallSplices === 4 ? splice.fourPrice : splice.onePrice;
                            return (
                              <button
                                key={splice.id}
                                disabled={!isEnabled}
                                onClick={() => updateCue({ smallSpliceMaterial: splice })}
                                className={`flex flex-col items-center p-3 rounded-2xl border transition-all text-center ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500 shadow-sm'
                                    : isEnabled
                                    ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                                    : 'border-slate-100 bg-slate-50/20 opacity-40 cursor-not-allowed'
                                }`}
                              >
                                <div
                                  className="w-12 h-12 rounded-full border border-slate-300 shadow-inner mb-2 bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url('/api/cue-image/materials/${splice.previewImage}.jpg')`,
                                  }}
                                />
                                <span className="text-xs font-semibold text-slate-900 truncate w-full">
                                  {splice.name}
                                </span>
                                <span className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">
                                  +£{priceTag}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* --- TAB 4: VENEERS (SEQUENTIAL CASCADING) --- */}
        {activeTab === 'veneers' && (
          <div className="space-y-6">
            {cue.largeSplices === 0 || !cue.largeSpliceMaterial ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center max-w-lg mx-auto">
                <Lock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">Veneers Conditionally Locked</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Veneers outline and border the splices. Please select 1 or 4 splices and an exotic timber in the &quot;Splicing&quot; tab first.
                </p>
              </div>
            ) : (
              <div>
                <div className="border-b border-slate-200 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Color Veneer Inlays (Cascading Outlines)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Each layer unlocks sequentially from outer (Layer 1) to inner (Layer 4). +£1/layer for 1-splice, +£4/layer for 4-splice.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cue.largeVeneers.map((selectedVeneer, idx) => {
                    const layerTitles = [
                      '1. High Veneer (Outer)',
                      '2. Inlay Veneer',
                      '3. Middle Veneer',
                      '4. Low Veneer (Inner)',
                    ];

                    const condition = canSelectVeneer(cue, idx, { name: 'ActiveCheck' } as any);
                    const isLayerEnabled = condition.allowed;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isLayerEnabled
                            ? 'bg-slate-50/70 border-slate-200 shadow-sm'
                            : 'bg-slate-50/20 border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {!isLayerEnabled && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                            <span className="text-xs font-bold text-slate-900">
                              {layerTitles[idx] || `Layer ${idx + 1}`}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-amber-700">
                            {selectedVeneer.name}
                          </span>
                        </div>

                        {!isLayerEnabled ? (
                          <p className="text-[11px] text-slate-400 italic mt-3">
                            {condition.reason}
                          </p>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin mt-3">
                            {CUE_VENEERS.map((veneer) => {
                              const isSelected = selectedVeneer.veneer_Id === veneer.id;
                              return (
                                <button
                                  key={veneer.id}
                                  title={veneer.name}
                                  onClick={() => {
                                    const updatedVeneers = [...cue.largeVeneers];
                                    updatedVeneers[idx] = {
                                      layer: selectedVeneer.layer,
                                      veneer_Id: veneer.id,
                                      name: veneer.name,
                                      asset: veneer,
                                    };
                                    if (veneer.name === 'None') {
                                      for (let k = idx + 1; k < updatedVeneers.length; k++) {
                                        const noneObj = CUE_VENEERS.find((v) => v.name === 'None') || veneer;
                                        updatedVeneers[k] = {
                                          layer: updatedVeneers[k].layer,
                                          veneer_Id: noneObj.id,
                                          name: 'None',
                                          asset: noneObj,
                                        };
                                      }
                                    }
                                    updateCue({ largeVeneers: updatedVeneers });
                                  }}
                                  className={`w-9 h-9 rounded-full border-2 transition-transform flex-shrink-0 bg-cover bg-center ${
                                    isSelected
                                      ? 'border-amber-500 scale-110 shadow-md ring-2 ring-amber-400'
                                      : 'border-slate-300 hover:scale-105'
                                  }`}
                                  style={{
                                    backgroundImage: `url('/api/cue-image/materials/${veneer.previewImage}.jpg')`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 5: TIPS & FERRULE --- */}
        {activeTab === 'tip' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Column 1: Ferrule */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Ferrule Type</h3>
                <p className="text-xs text-slate-500">
                  Material holding tip (Brass, Black, or Titanium).
                </p>
                <div className="space-y-2">
                  {catalog.ferrules.map((ferrule) => {
                    const isSelected = cue.ferruleType?.id === ferrule.id;
                    const isEnabled = ferrule.enabled !== false;
                    return (
                      <button
                        key={ferrule.id}
                        disabled={!isEnabled}
                        onClick={() => handleFerruleChange(ferrule)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900 ring-1 ring-amber-500'
                            : isEnabled
                            ? 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                            : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <span>{ferrule.name}</span>
                        <span className="font-mono text-amber-700 font-bold">
                          {ferrule.price ? `+£${ferrule.price}` : '£0'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Tip Brand */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Tip Brand</h3>
                <p className="text-xs text-slate-500">
                  Professional laminated leather tip.
                </p>
                <div className="space-y-2">
                  {CUE_TIPS.map((tip) => {
                    const isSelected = cue.tip?.id === tip.id;
                    return (
                      <button
                        key={tip.id}
                        onClick={() => {
                          const validSizes = (tip.tips || []).filter((s) =>
                            isTipSizeAvailable(cue, s)
                          );
                          const newTipSize = validSizes.find((t) => t.default) || validSizes[0] || cue.tipSize;
                          updateCue({ tip, tipSize: newTipSize });
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900 ring-1 ring-amber-500'
                            : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{tip.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tip Diameter Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tip Diameter Size</h3>
                  <p className="text-xs text-slate-500">
                    Sizes compatible with {cue.ferruleType?.name}.
                  </p>
                </div>
                <span className="text-xs text-amber-700 font-mono font-bold">
                  {cue.tipSize?.name}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin p-1 border border-slate-100 rounded-xl bg-slate-50/40">
                {cue.tip?.tips?.map((size) => {
                  const isSelected = cue.tipSize?.id === size.id;
                  const isAvailable = isTipSizeAvailable(cue, size);

                  return (
                    <button
                      key={size.id}
                      disabled={!isAvailable}
                      onClick={() => updateCue({ tipSize: size })}
                      className={`p-2 rounded-xl border text-center text-xs transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : isAvailable
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      {size.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: PERSONALISATION (NAME PLATES & DISCS) --- */}
        {activeTab === 'engraving' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Personalisation</h3>
              <p className="text-xs text-slate-500">
                Customise the cue butt with a name plate or circular disc and laser-engraved lettering.
              </p>
            </div>

            {/* Reference-Matching 3-Field Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 1: Name Plates & Discs Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Name Plates & Discs
                </label>
                <select
                  value={cue.namePlate?.id || catalog.namePlates[0]?.id}
                  onChange={(e) => {
                    const selected = catalog.namePlates.find((p) => p.id === e.target.value) || catalog.namePlates[0];
                    updateCue({ namePlate: selected });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
                >
                  {catalog.namePlates.map((plate) => (
                    <option key={plate.id} value={plate.id} disabled={plate.enabled === false}>
                      {plate.name} {plate.price > 0 ? `(+£${plate.price})` : ''} {!plate.allowEngraving ? '(No Engraving)' : ''} {plate.enabled === false ? '(Unavailable)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-amber-700 font-mono font-bold block">
                  {cue.namePlate?.price ? `+£${cue.namePlate.price}` : 'Included (£0)'}
                </span>
              </div>

              {/* Field 2: Personalised Engraving? */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 block">
                    Personalised Engraving?
                  </label>
                  <span className="text-[11px] text-amber-700 font-mono font-bold">
                    {!cue.namePlate?.allowEngraving
                      ? 'N/A'
                      : cue.engraving?.trim() && cue.engraving.trim().toLowerCase() !== 'custom made'
                      ? '+£19'
                      : 'Free'}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={18}
                  disabled={!cue.namePlate?.allowEngraving}
                  value={cue.namePlate?.allowEngraving ? cue.engraving : ''}
                  onChange={(e) => updateCue({ engraving: e.target.value })}
                  placeholder={
                    cue.namePlate?.allowEngraving
                      ? 'Enter your message here'
                      : 'Not available on Brass Disc'
                  }
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono uppercase shadow-sm transition ${
                    !cue.namePlate?.allowEngraving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
                  }`}
                />
                <span className="text-[11px] text-slate-400 block">
                  {cue.namePlate?.allowEngraving
                    ? 'Default is "CUSTOM MADE" (Free). Max 18 characters.'
                    : 'Solid Brass Disc does not accept text engraving.'}
                </span>
              </div>

              {/* Field 3: Font Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Font
                </label>
                <select
                  disabled={!cue.namePlate?.allowEngraving}
                  value={cue.font || 'Roboto'}
                  onChange={(e) => updateCue({ font: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium shadow-sm transition cursor-pointer ${
                    !cue.namePlate?.allowEngraving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
                  }`}
                >
                  <option value="Roboto">Roboto (Modern Clean)</option>
                  <option value="Lora">Lora (Classic Serif)</option>
                  <option value="Alex Brush">Alex Brush (Calligraphy Script)</option>
                </select>
                <span className="text-[11px] text-slate-500 block" style={{ fontFamily: cue.font || 'Roboto' }}>
                  Preview: {cue.engraving || 'CUSTOM MADE'}
                </span>
              </div>
            </div>

            {/* Visual Plate Selection Cards */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Plate / Disc Style ({catalog.namePlates.length} Options)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {catalog.namePlates.map((plate) => {
                  const isSelected = cue.namePlate?.id === plate.id;
                  const isEnabled = plate.enabled !== false;
                  return (
                    <button
                      key={plate.id}
                      disabled={!isEnabled}
                      onClick={() => updateCue({ namePlate: plate })}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-sm'
                          : isEnabled
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-full border border-slate-300 shadow-inner flex-shrink-0 bg-cover bg-center bg-slate-200"
                        style={{
                          backgroundImage: `url('/api/cue-image/layers/${plate.previewImage}.png')`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {plate.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                        </div>
                        <span className="text-[11px] text-amber-700 font-mono font-bold block mt-0.5">
                          {plate.price > 0 ? `+£${plate.price}` : 'Free'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {plate.allowEngraving ? 'Custom Engravable' : 'No Engraving'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: EXTENSIONS & MINI BUTT & PRIORITY SERVICE --- */}
        {activeTab === 'accessories' && (
          <div className="space-y-6">
            {/* Workshop Turnaround & Crafting Speed */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Workshop Turnaround & Crafting Speed</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standard bespoke handcrafting queue or fast-track priority workshop slot.
                  </p>
                </div>
                {cue.priorityService && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    <span>Fast-Track</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Standard Turnaround */}
                <button
                  type="button"
                  onClick={() => updateCue({ priorityService: false })}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    !cue.priorityService
                      ? 'border-amber-500 bg-white ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Standard Handcrafting</span>
                    {!cue.priorityService && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">10–12 Weeks Workshop Queue</span>
                  <span className="text-[11px] font-mono font-bold text-slate-800 mt-1.5 block">
                    Included (Free)
                  </span>
                </button>

                {/* Priority Service */}
                <button
                  type="button"
                  onClick={() => updateCue({ priorityService: true })}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    cue.priorityService
                      ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-amber-50 ring-2 ring-amber-500 shadow-sm'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-950 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>Priority Service (6 Weeks)</span>
                    </span>
                    {cue.priorityService && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <span className="text-[11px] text-amber-950 font-medium block mt-1">
                    Guaranteed completion within 6 weeks
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-800 mt-1.5 block">
                    +{catalog.surcharges.defaultCurrency || '£'}{catalog.surcharges.priorityCraftingPrice ?? 40} Expedited
                  </span>
                </button>
              </div>
            </div>

            {/* Cue & Case Bundle Deal Selection */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    <span>Cue & Case Bundle Deals</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bundle a custom flight case or luxury leather case with your bespoke cue & save up to £40.
                  </p>
                </div>
                {cue.case && cue.case.id !== 'case_none' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span>Bundle Saved £{cue.case.savings}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {catalog.cases.map((c) => {
                  const isSelected = (cue.case?.id === c.id) || (!cue.case && c.id === 'case_none');
                  const isNone = c.id === 'case_none';

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateCue({ case: isNone ? null : c })}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? isNone
                            ? 'border-slate-400 bg-white ring-2 ring-slate-400/20 shadow-sm'
                            : 'border-amber-500 bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-white ring-2 ring-amber-500 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-950">{c.name}</span>
                            {c.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                                {c.badge}
                              </span>
                            )}
                            {c.savings > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Save £{c.savings} Bundle
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{c.tagline}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5 flex-wrap">
                            <span>📦 {c.compartments}</span>
                            <span>🔒 {c.security}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                            {c.retailPrice > 0 ? (
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 line-through block">
                                  £{c.retailPrice}
                                </span>
                                <span className="text-xs font-mono font-black text-amber-700">
                                  +£{c.bundlePrice}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-700">
                                Included Free
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!extensionCondition.allowed ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 max-w-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <span className="text-sm font-bold text-amber-900 block">
                    Extensions &amp; Mini Butt Require Thread Fitting
                  </span>
                  <span className="text-xs text-amber-800 block leading-relaxed">
                    Screw-in extensions and mini butts require an End Butt Joint thread fitting (+£{catalog.surcharges.buttJointFittingPrice}) at the base of the cue.
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCue({ endButtJoin: true })}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs active:scale-95 cursor-pointer"
                  >
                    <span>Enable Thread Fitted (+£{catalog.surcharges.buttJointFittingPrice})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mini Butt */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">6-inch Mini Butt</h3>
                  <p className="text-xs text-slate-500">
                    Solid screw-in bumper extension.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {catalog.miniButts.map((butt) => {
                      const isSelected = cue.miniButt?.id === butt.id;
                      const isEnabled = butt.enabled !== false;
                      return (
                        <button
                          key={butt.id}
                          disabled={!isEnabled}
                          onClick={() => updateCue({ miniButt: isSelected ? null : butt })}
                          className={`flex flex-col p-3 rounded-xl border text-xs text-left transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900 ring-1 ring-amber-500'
                              : isEnabled
                              ? 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                              : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <span className="font-semibold text-slate-900">{butt.name}</span>
                          <span className="text-[11px] text-amber-700 font-mono font-bold mt-1">
                            {butt.price > 0 ? `+£${butt.price}` : 'None'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Telescopic Extensions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Telescopic Extensions</h3>
                  <p className="text-xs text-slate-500">
                    Extendable quick-lock extensions.
                  </p>
                  <div className="space-y-2">
                    {catalog.extensions.map((ext) => {
                      const isSelected = cue.extensions?.some((e) => e.id === ext.id);
                      const isEnabled = ext.enabled !== false;
                      return (
                        <button
                          key={ext.id}
                          disabled={!isEnabled}
                          onClick={() => {
                            const updated = isSelected
                              ? cue.extensions.filter((e) => e.id !== ext.id)
                              : [...cue.extensions, ext];
                            updateCue({ extensions: updated });
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 font-semibold text-slate-900 ring-1 ring-amber-500'
                              : isEnabled
                              ? 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                              : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            <span className="text-slate-900 font-medium">{ext.name}</span>
                            <span className="text-slate-500 block text-[11px] mt-0.5">
                              Professional telescopic fitting
                            </span>
                          </div>
                          <span className="font-mono text-amber-700 font-bold">+£{ext.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Step Navigation Footer (Pinned at Bottom of Each Section) */}
      <div className="border-t border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        {/* Previous Button - Always Present on Every Section */}
        <button
          type="button"
          disabled={currentStepIndex === 0}
          onClick={() => {
            if (currentStepIndex > 0) {
              const prevTab = TABS[currentStepIndex - 1];
              if (prevTab) handleTabClick(prevTab.id);
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            currentStepIndex === 0
              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs hover:shadow-xs active:scale-95'
          }`}
          title={currentStepIndex === 0 ? 'You are on the first step' : `Back to ${TABS[currentStepIndex - 1]?.label}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{currentStepIndex > 0 ? `Previous: ${TABS[currentStepIndex - 1]?.label}` : 'Previous Step'}</span>
        </button>

        {/* Step Progress Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="font-mono font-bold text-slate-800">Step {currentStepIndex + 1}</span>
          <span>of</span>
          <span className="font-mono font-bold text-slate-800">7</span>
        </div>

        {/* Next / Review & Order Button */}
        {currentStepIndex < TABS.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              markTabCompleted(activeTab);
              const nextTab = TABS[currentStepIndex + 1];
              if (nextTab) handleTabClick(nextTab.id);
            }}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
            title={`Proceed to ${TABS[currentStepIndex + 1]?.label}`}
          >
            <span>Next: {TABS[currentStepIndex + 1]?.label}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              markTabCompleted('accessories');
              if (onOpenCheckout) {
                onOpenCheckout();
              }
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white shadow-md transition-all active:scale-95 uppercase tracking-wider"
          >
            <span>Review &amp; Order Cue</span>
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};

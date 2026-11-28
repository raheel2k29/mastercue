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
  SHAFT_GRADE_DETAILS,
} from '@/lib/cueData';

import { saveStoredTab, loadStoredTab } from '@/lib/cueStorage';

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
  applyCueSelection,
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
  HelpCircle,
  Info,
  X,
  Truck,
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
  onOpenLeadTimes?: () => void;
}

export const CustomizerOptions: React.FC<CustomizerOptionsProps> = ({
  cue,
  onChange,
  onOpenCheckout,
  highlightTrigger = 0,
  onOpenLeadTimes,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [completedTabs, setCompletedTabs] = useState<string[]>([]);
  const [spliceType, setSpliceType] = useState<'large' | 'small'>('large');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);

  // Restore persisted active tab on mount
  useEffect(() => {
    const savedTab = loadStoredTab() as TabId | null;
    if (savedTab && TABS.some((t) => t.id === savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  // Sync completed tabs with cue configuration state
  useEffect(() => {
    const tabs: string[] = [];
    if (cue.shaft) tabs.push('general');
    if (cue.buttJoint || cue.buttTimber) tabs.push('butt');
    if (cue.largeSplices > 0 || cue.smallSplices > 0) tabs.push('splices');
    if (cue.largeVeneers?.some((v) => v.name !== 'None')) tabs.push('veneers');
    if (cue.ferruleType || cue.tip) tabs.push('tip');
    if (cue.namePlate || cue.engraving) tabs.push('engraving');
    if (cue.case || cue.miniButt || (cue.extensions && cue.extensions.length > 0) || cue.priorityService) {
      tabs.push('accessories');
    }
    setCompletedTabs((prev) => Array.from(new Set([...prev, ...tabs])));
  }, [cue]);

  useEffect(() => {
    if (highlightTrigger && highlightTrigger > 0) {
      setActiveTab('general');
      saveStoredTab('general');
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
    saveStoredTab(tabId);
  };

  const updateCue = (partial: Partial<CueConfiguration>) => {
    if (partial.shaft) {
      setIsHighlighted(false);
    }
    const sanitized = applyCueSelection(cue, partial);
    onChange(sanitized);
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

  // Auto-healing handlers delegated directly to applyCueSelection
  const handleFerruleChange = (ferrule: CueFerrule) => {
    updateCue({ ferruleType: ferrule });
  };

  const handleJointChange = (joint: CueJoint) => {
    updateCue({ buttJoint: joint });
  };

  const handleTimberChange = (timber: CueButtTimber) => {
    updateCue({ buttTimber: timber });
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
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGradeModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="View side-by-side shaft grade differences"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Grade Differences</span>
                  </button>
                  <span className="text-xs text-amber-700 font-mono font-bold shrink-0">
                    {cue.shaft ? `£${cue.shaft.price}` : 'Select to start'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {catalog.shafts.map((shaft) => {
                  const isSelected = cue.shaft?.id === shaft.id;
                  const isEnabled = shaft.enabled !== false;
                  const gradeDetails = SHAFT_GRADE_DETAILS[shaft.name];

                  return (
                    <button
                      key={shaft.id}
                      disabled={!isEnabled}
                      onClick={() => updateCue({ shaft })}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                          : isHighlighted
                          ? 'border-amber-300 bg-white hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                          : isEnabled
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50/20 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{shaft.name}</span>
                            {gradeDetails?.badge && (
                              <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border leading-tight ${gradeDetails.badgeColor}`}>
                                {gradeDetails.badge}
                              </span>
                            )}
                          </div>
                          {gradeDetails?.subtitle && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-snug">
                              {gradeDetails.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <span className="text-xs font-mono font-bold text-amber-700">
                            £{shaft.price}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Natural Timber Grain & Colour Note */}
              <p className="text-[10.5px] text-slate-400 italic pt-0.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-600/70 shrink-0" />
                <span>Natural timber grain, colours, and growth arrows vary naturally between individual billets.</span>
              </p>

              {/* Selected Grade Contextual Breakdown Card */}
              {cue.shaft && SHAFT_GRADE_DETAILS[cue.shaft.name] && (
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {cue.shaft.name} Grade Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGradeModal(true)}
                      className="text-[11px] text-amber-800 hover:text-amber-950 underline font-medium cursor-pointer"
                    >
                      Compare all 5 grades
                    </button>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11.5px]">
                    {SHAFT_GRADE_DETAILS[cue.shaft.name].description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/50 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-medium">Grain & Arrows: </span>
                      <span className="text-slate-700 font-semibold">{SHAFT_GRADE_DETAILS[cue.shaft.name].grain}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Flex & Deflection: </span>
                      <span className="text-slate-700 font-semibold">{SHAFT_GRADE_DETAILS[cue.shaft.name].flex}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-medium">Best For: </span>
                      <span className="text-slate-700 font-semibold">{SHAFT_GRADE_DETAILS[cue.shaft.name].bestFor}</span>
                    </div>
                  </div>
                </div>
              )}
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
                      id="thread-fitted-yes-btn"
                      type="button"
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
                      id="thread-fitted-no-btn"
                      type="button"
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
                      id="dome-joint-yes-btn"
                      type="button"
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
                      id="dome-joint-no-btn"
                      type="button"
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
                <div className="space-y-2">
                  <span className="text-sm font-bold text-amber-900 block">
                    Splicing Is Conditionally Disabled
                  </span>
                  <span className="text-xs text-amber-800 block">
                    {spliceCondition.reason}. A cue cannot have both a Dome Joint collar and front spliced timbers.
                  </span>
                  {cue.dome && (
                    <button
                      type="button"
                      onClick={() => updateCue({ dome: false })}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      Disable Dome Joint &amp; Enable Splicing
                    </button>
                  )}
                  {cue.buttJoint?.name === '16in Above Points' && (
                    <button
                      type="button"
                      onClick={() => updateCue({ buttJoint: CUE_JOINTS[0] })}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      Switch to Standard Joint &amp; Enable Splicing
                    </button>
                  )}
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
            {!spliceCondition.allowed ? (
              <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center max-w-lg mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-amber-900">Veneers Conditionally Disabled</h4>
                <p className="text-xs text-amber-800 mt-1">
                  {spliceCondition.reason}. Color veneers require front splicing which is incompatible with this setting.
                </p>
                {cue.dome && (
                  <button
                    type="button"
                    onClick={() => updateCue({ dome: false })}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Disable Dome Joint &amp; Enable Splicing
                  </button>
                )}
                {cue.buttJoint?.name === '16in Above Points' && (
                  <button
                    type="button"
                    onClick={() => updateCue({ buttJoint: CUE_JOINTS[0] })}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Switch to Standard Joint &amp; Enable Splicing
                  </button>
                )}
              </div>
            ) : cue.largeSplices === 0 || !cue.largeSpliceMaterial ? (
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
                  value={cue.namePlate?.id || 'none'}
                  onChange={(e) => {
                    if (e.target.value === 'none') {
                      updateCue({ namePlate: null, engraving: '', font: '' });
                      return;
                    }
                    const selected = catalog.namePlates.find((p) => p.id === e.target.value);
                    if (selected) {
                      updateCue({ namePlate: selected, font: cue.font || 'Roboto' });
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
                >
                  <option value="none">None (No Disc / Clean Wood Finish)</option>
                  {catalog.namePlates.map((plate) => (
                    <option key={plate.id} value={plate.id} disabled={plate.enabled === false}>
                      {plate.name} {plate.price > 0 ? `(+£${plate.price})` : '(Free)'} {!plate.allowEngraving ? '(No Engraving)' : ''} {plate.enabled === false ? '(Unavailable)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-amber-700 font-mono font-bold block">
                  {cue.namePlate ? (cue.namePlate.price ? `+£${cue.namePlate.price}` : 'Free') : 'No Disc (£0)'}
                </span>
              </div>

              {/* Field 2: Personalised Engraving? */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 block">
                    Personalised Engraving?
                  </label>
                  <span className="text-[11px] text-amber-700 font-mono font-bold">
                    {!cue.namePlate
                      ? 'Requires Disc'
                      : !cue.namePlate.allowEngraving
                      ? 'N/A'
                      : cue.engraving?.trim()
                      ? '+£19'
                      : 'Optional (+£19)'}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={18}
                  disabled={!cue.namePlate || !cue.namePlate.allowEngraving}
                  value={cue.engraving || ''}
                  onChange={(e) => updateCue({ engraving: e.target.value })}
                  placeholder={
                    !cue.namePlate
                      ? 'Select a disc or plate above to add text'
                      : !cue.namePlate.allowEngraving
                      ? 'Not available on Brass Disc'
                      : 'CUSTOM MADE'
                  }
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono uppercase shadow-sm transition ${
                    !cue.namePlate || !cue.namePlate.allowEngraving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
                  }`}
                />
                <span className="text-[11px] text-slate-400 block">
                  {!cue.namePlate
                    ? 'Optional personalisation. Select a disc or plate above to enable.'
                    : cue.namePlate.allowEngraving
                    ? 'e.g. "CUSTOM MADE". Enter custom text or leave empty for no engraving. Max 18 characters.'
                    : 'Solid Brass Disc does not accept text engraving.'}
                </span>
              </div>

              {/* Field 3: Font Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Font
                </label>
                <select
                  disabled={!cue.namePlate || !cue.namePlate.allowEngraving}
                  value={cue.font || 'Roboto'}
                  onChange={(e) => updateCue({ font: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium shadow-sm transition cursor-pointer ${
                    !cue.namePlate || !cue.namePlate.allowEngraving
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
                  }`}
                >
                  <option value="Roboto">Roboto (Modern Clean)</option>
                  <option value="Lora">Lora (Classic Serif)</option>
                  <option value="Alex Brush">Alex Brush (Calligraphy Script)</option>
                </select>
                <span className="text-[11px] text-slate-500 block truncate" style={{ fontFamily: cue.font || 'Roboto' }}>
                  Preview: {cue.engraving?.trim() ? cue.engraving.trim() : 'CUSTOM MADE (Sample)'}
                </span>
              </div>
            </div>

            {/* Visual Plate Selection Cards */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Plate / Disc Style
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Option 0: No Disc */}
                <button
                  type="button"
                  onClick={() => updateCue({ namePlate: null, engraving: '', font: '' })}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    !cue.namePlate
                      ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 bg-white font-bold text-[11px] shrink-0">
                    None
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate">No Disc</span>
                      {!cue.namePlate && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono font-bold block mt-0.5">£0</span>
                    <span className="text-[10px] text-slate-400 block truncate">Clean wood finish</span>
                  </div>
                </button>

                {catalog.namePlates.map((plate) => {
                  const isSelected = cue.namePlate?.id === plate.id;
                  const isEnabled = plate.enabled !== false;
                  return (
                    <button
                      key={plate.id}
                      disabled={!isEnabled}
                      onClick={() => updateCue({ namePlate: plate, font: cue.font || 'Roboto' })}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-sm'
                          : isEnabled
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className="w-11 h-11 rounded-full border border-slate-300 shadow-inner shrink-0 bg-cover bg-center bg-slate-200"
                        style={{
                          backgroundImage: `url('/api/cue-image/layers/${plate.previewImage}.png')`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {plate.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-amber-700 font-mono font-bold block mt-0.5">
                          {plate.price > 0 ? `+£${plate.price}` : 'Free'}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {plate.allowEngraving ? 'Engravable' : 'No Engraving'}
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

              {/* Lead Times & Express Delivery Clarification Box */}
              <div id="lead-times-clarification-box" className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 text-xs space-y-2 mt-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-sky-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Lead Times &amp; Express Delivery Clarified</span>
                  </span>
                  {onOpenLeadTimes && (
                    <button
                      type="button"
                      id="view-lead-times-modal-btn"
                      onClick={onOpenLeadTimes}
                      className="text-[11px] font-semibold text-sky-800 hover:text-sky-950 underline cursor-pointer"
                    >
                      View Detailed Schedule →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-sky-950">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-sky-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span>🔨 Workshop Crafting:</span>
                      <span className="text-amber-800 font-extrabold">{cue.priorityService ? '6 Weeks' : '10–12 Weeks'}</span>
                    </div>
                    <p className="text-slate-600 leading-snug">
                      Natural hardwood seasoning, progressive taper turning, hand-splicing, and multi-stage oil curing.
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-sky-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <span>🚚 What &quot;Express&quot; Means:</span>
                      <span className="text-emerald-800 font-extrabold">1–2 Days UK / 3–5 Days World</span>
                    </div>
                    <p className="text-slate-600 leading-snug">
                      &quot;Express&quot; refers strictly to transit courier speed once crafting &amp; acoustic QA testing are complete.
                    </p>
                  </div>
                </div>
                <p className="text-[10.5px] text-sky-800/80 leading-normal pt-0.5">
                  🛡️ All cues dispatch in heavy-duty reinforced transit tubes via tracked DPD / DHL Express with signature &amp; full transit insurance included free.
                </p>
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

      {/* Shaft Grade Differences Modal */}
      {showGradeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowGradeModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Shaft Timber &amp; Grading Comparison
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Understanding why cue shaft prices vary: timber rarity, chevron symmetry, and deflection control.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-amber-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Every Master Cue shaft is crafted from genuine slow-cured North American Ash or Eastern Canadian Hard Rock Maple.
                  The price progression reflects the <strong>rarity of timber harvest selection</strong>, <strong>grain density &amp; chevron symmetry</strong>, and <strong>testing tolerances for deflection &amp; power transfer</strong>.
                </p>
              </div>

              {/* Comparison List / Cards */}
              <div className="space-y-3">
                {catalog.shafts.map((shaft) => {
                  const grade = SHAFT_GRADE_DETAILS[shaft.name];
                  const isCurrent = cue.shaft?.id === shaft.id;
                  if (!grade) return null;

                  return (
                    <div
                      key={shaft.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{shaft.name}</h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${grade.badgeColor}`}>
                            {grade.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-extrabold text-amber-700">
                            £{shaft.price}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateCue({ shaft });
                              setShowGradeModal(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                            }`}
                          >
                            {isCurrent ? '✓ Selected' : `Select £${shaft.price}`}
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-600 my-2.5 leading-relaxed text-xs">
                        {grade.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px] bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <div className="text-slate-400 font-medium">Timber Harvest</div>
                          <div className="text-slate-800 font-semibold mt-0.5">{grade.selection}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Chevrons &amp; Grain</div>
                          <div className="text-slate-800 font-semibold mt-0.5">{grade.grain}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Flex &amp; Stability</div>
                          <div className="text-slate-800 font-semibold mt-0.5">{grade.flex}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">Best Suited For</div>
                          <div className="text-slate-800 font-semibold mt-0.5">{grade.bestFor}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

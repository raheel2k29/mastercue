'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

interface CustomizerSidebarProps {
  cue: CueConfiguration;
  onChange: (updated: CueConfiguration) => void;
}

export const CustomizerSidebar: React.FC<CustomizerSidebarProps> = ({ cue, onChange }) => {
  const [activeTab, setActiveTab] = useState<
    'shaft' | 'butt' | 'splices' | 'veneers' | 'tip' | 'engraving' | 'accessories'
  >('shaft');

  const price = calculatePrice(cue);
  const weightRange = getWeightRange(cue);

  const updateCue = (partial: Partial<CueConfiguration>) => {
    onChange({ ...cue, ...partial });
  };

  // Check conditional state
  const spliceCondition = isLargeSplicesAllowed(cue);
  const extensionCondition = isExtensionsAllowed(cue);

  // Auto-healing when Ferrule changes
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
  };

  // Auto-healing when Butt Joint changes
  const handleJointChange = (joint: CueJoint) => {
    const updatedCue = { ...cue, buttJoint: joint };
    if (!isButtTimberAvailable(updatedCue, cue.buttTimber)) {
      const validTimber = CUE_BUTT_TIMBERS.find((t) => isButtTimberAvailable(updatedCue, t));
      if (validTimber) updatedCue.buttTimber = validTimber;
    }
    onChange(updatedCue);
  };

  // Auto-healing when Butt Timber changes
  const handleTimberChange = (timber: CueButtTimber) => {
    const updatedCue = { ...cue, buttTimber: timber };
    if (!isButtJointAvailable(updatedCue, cue.buttJoint)) {
      const validJoint = CUE_JOINTS.find((j) => isButtJointAvailable(updatedCue, j));
      if (validJoint) updatedCue.buttJoint = validJoint;
    }
    onChange(updatedCue);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/80 p-2 gap-1.5 scrollbar-thin">
        {[
          { id: 'shaft', label: 'Shaft & Length', icon: Ruler },
          { id: 'butt', label: 'Joint & Butt', icon: CircleDot },
          { id: 'splices', label: 'Splices', icon: Layers },
          { id: 'veneers', label: 'Veneers', icon: Palette },
          { id: 'tip', label: 'Tip & Ferrule', icon: Sparkles },
          { id: 'engraving', label: 'Engraving', icon: Type },
          { id: 'accessories', label: 'Extras', icon: PlusCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* --- TAB 1: SHAFT & LENGTH --- */}
        {activeTab === 'shaft' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center justify-between">
                <span>Select Shaft Wood & Grade</span>
                <span className="text-xs text-amber-700 font-mono font-bold">
                  £{cue.shaft?.price}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Shaft grade determines grain straightness, density, and base cue value.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CUE_SHAFTS.map((shaft) => {
                  const isSelected = cue.shaft?.id === shaft.id;
                  return (
                    <button
                      key={shaft.id}
                      onClick={() => updateCue({ shaft })}
                      className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-semibold text-slate-900">{shaft.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-700">
                        £{shaft.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">Cue Length</h3>
                <span className="text-xs text-amber-700 font-mono font-bold">
                  {cue.length?.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                All 31 tournament lengths from 48” (122cm) to 63” (160cm).
              </p>

              {/* Standard Dropdown Select like CueWizard */}
              <div className="mb-3">
                <select
                  value={cue.length?.id}
                  onChange={(e) => {
                    const selected = CUE_LENGTHS.find((l) => l.id === e.target.value);
                    if (selected && isLengthAvailable(cue, selected)) {
                      updateCue({ length: selected });
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
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
              </div>

              {/* Interactive Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {CUE_LENGTHS.map((len) => {
                  const isSelected = cue.length?.id === len.id;
                  const isAvailable = isLengthAvailable(cue, len);

                  return (
                    <button
                      key={len.id}
                      disabled={!isAvailable}
                      onClick={() => updateCue({ length: len })}
                      className={`p-2 rounded-lg border text-center text-[11px] transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 ring-1 ring-amber-500'
                          : isAvailable
                          ? 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {len.name.split(' ')[0]}
                      <span className="block text-[9px] text-slate-500 font-mono">
                        {len.name.split(' ')[1] || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-900">Cue Weight</h3>
                <span className="text-xs font-mono font-bold text-amber-700">{cue.weight} oz</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Calculated dynamic weight range: {weightRange.min}oz - {weightRange.max}oz
              </p>
              <input
                type="range"
                min={weightRange.min}
                max={weightRange.max}
                step={0.5}
                value={cue.weight}
                onChange={(e) => updateCue({ weight: parseFloat(e.target.value) })}
                className="w-full accent-amber-600 bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* --- TAB 2: JOINT & BUTT TIMBER --- */}
        {activeTab === 'butt' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Butt Timber</h3>
              <p className="text-xs text-slate-500 mb-3">
                Conditioned on compatibility with selected Joint and Shaft.
              </p>
              <div className="space-y-2">
                {CUE_BUTT_TIMBERS.map((timber) => {
                  const isSelected = cue.buttTimber?.id === timber.id;
                  const isAvailable = isButtTimberAvailable(cue, timber);

                  const match = timber.assets?.find(
                    (a) =>
                      a.allowedJoint_Id === cue.buttJoint?.id &&
                      a.allowedShafts.includes(cue.shaft?.asset || '')
                  );
                  const timberPrice = match?.price ?? timber.assets?.[0]?.price ?? 0;

                  return (
                    <button
                      key={timber.id}
                      disabled={!isAvailable}
                      onClick={() => handleTimberChange(timber)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 font-medium text-slate-900 ring-1 ring-amber-500'
                          : isAvailable
                          ? 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{timber.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        {!isAvailable && (
                          <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            Incompatible with joint
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

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Joint Configuration</h3>
              <p className="text-xs text-slate-500 mb-3">
                Options conditioned on selected Butt Timber craftsmanship.
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
                          ? 'border-amber-500 bg-amber-50/60 font-semibold text-slate-900 ring-1 ring-amber-500'
                          : isAvailable
                          ? 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                          : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <span>{joint.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      {!isAvailable && <Lock className="w-3 h-3 text-slate-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              {/* End Butt Joint Fitting */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Butt Joint (+£{BUTT_JOINT_FITTING_PRICE})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Female thread at bottom to accept mini-butt or extensions
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCue({ endButtJoin: true })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      cue.endButtJoin
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateCue({ endButtJoin: false })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Dome Joint (+£{DOME_JOINT_PRICE})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Rounded timber joint collar (Disables splices)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCue({ dome: true })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      cue.dome
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateCue({ dome: false })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
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
        )}

        {/* --- TAB 3: SPLICES --- */}
        {activeTab === 'splices' && (
          <div className="space-y-5">
            {!spliceCondition.allowed ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Splicing Is Conditionally Disabled
                  </span>
                  <span className="text-[11px] text-amber-800 mt-0.5 block">
                    {spliceCondition.reason}. Disable Dome Joint or change joint configuration to customize splices.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Splicing Style</h3>
                  <p className="text-xs text-slate-500 mb-3">Number of pointed wooden splices on the butt.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { count: 0, label: 'Plain (No Splice)' },
                      { count: 1, label: '1 Front Splice' },
                      { count: 4, label: '4-Way Splice' },
                    ].map((s) => {
                      const isSelected = cue.largeSplices === s.count;
                      return (
                        <button
                          key={s.count}
                          onClick={() => updateCue({ largeSplices: s.count })}
                          className={`p-3 rounded-xl border text-center text-xs transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {cue.largeSplices > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center justify-between">
                      <span>Exotic Splicing Timber</span>
                      <span className="text-xs text-amber-700 font-mono font-bold">
                        {cue.largeSpliceMaterial
                          ? cue.largeSplices === 4
                            ? `+£${cue.largeSpliceMaterial.fourPrice}`
                            : `+£${cue.largeSpliceMaterial.onePrice}`
                          : 'Select wood'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">Select the exotic wood species for the splices.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                      {CUE_SPLICES.map((splice) => {
                        const isSelected = cue.largeSpliceMaterial?.id === splice.id;
                        const priceTag = cue.largeSplices === 4 ? splice.fourPrice : splice.onePrice;
                        return (
                          <button
                            key={splice.id}
                            onClick={() => updateCue({ largeSpliceMaterial: splice })}
                            className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500'
                                : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-full border border-slate-300 shadow-inner mb-1.5 bg-cover bg-center"
                              style={{
                                backgroundImage: `url('/api/cue-image/materials/${splice.previewImage}.jpg')`,
                              }}
                            />
                            <span className="text-xs font-semibold text-slate-900 truncate w-full">
                              {splice.name}
                            </span>
                            <span className="text-[10px] text-amber-700 font-mono mt-0.5 font-bold">
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
          </div>
        )}

        {/* --- TAB 4: VENEERS (SEQUENTIAL CASCADING) --- */}
        {activeTab === 'veneers' && (
          <div className="space-y-5">
            {cue.largeSplices === 0 || !cue.largeSpliceMaterial ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Lock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-xs text-slate-800 font-semibold">Veneers Conditionally Locked</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Veneers outline and border the splices. Please select 1 or 4 splices and a timber in the &quot;Splices&quot; tab first.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Color Veneer Layers (Cascading)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Each layer unlocks sequentially from outer to inner (+£1/layer for 1 splice, +£4/layer for 4 splices).
                </p>

                <div className="space-y-4">
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
                        className={`p-3 rounded-xl border transition-all ${
                          isLayerEnabled
                            ? 'bg-slate-50/70 border-slate-200'
                            : 'bg-slate-50/20 border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            {!isLayerEnabled && <Lock className="w-3 h-3 text-amber-600" />}
                            <span className="text-xs font-semibold text-slate-800">
                              {layerTitles[idx] || `Layer ${idx + 1}`}
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-700 font-medium">
                            {selectedVeneer.name}
                          </span>
                        </div>

                        {!isLayerEnabled ? (
                          <span className="text-[11px] text-slate-500 italic block">
                            {condition.reason}
                          </span>
                        ) : (
                          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
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
                                  className={`w-8 h-8 rounded-full border-2 transition-transform flex-shrink-0 bg-cover bg-center ${
                                    isSelected
                                      ? 'border-amber-500 scale-110 shadow-md'
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

        {/* --- TAB 5: TIP & FERRULE --- */}
        {activeTab === 'tip' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Ferrule Type</h3>
              <p className="text-xs text-slate-500 mb-3">
                Ferrule choice conditions available tip diameter sizes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CUE_FERRULES.map((ferrule) => {
                  const isSelected = cue.ferruleType?.id === ferrule.id;
                  return (
                    <button
                      key={ferrule.id}
                      onClick={() => handleFerruleChange(ferrule)}
                      className={`p-3 rounded-xl border text-xs text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 font-bold text-slate-900 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{ferrule.name}</span>
                        <span className="font-mono text-amber-700 font-bold">
                          {ferrule.price ? `+£${ferrule.price}` : '£0'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Tip Brand</h3>
              <p className="text-xs text-slate-500 mb-3">Professional laminated leather cue tip.</p>
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
                          ? 'border-amber-500 bg-amber-50/60 font-semibold text-slate-900 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{tip.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {cue.tip?.tips?.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-900">Tip Diameter Size</h3>
                  <span className="text-xs text-amber-700 font-mono font-bold">
                    {cue.tipSize?.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Filtered by compatibility with {cue.ferruleType?.name}.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {cue.tip.tips.map((size) => {
                    const isSelected = cue.tipSize?.id === size.id;
                    const isAvailable = isTipSizeAvailable(cue, size);

                    return (
                      <button
                        key={size.id}
                        disabled={!isAvailable}
                        onClick={() => updateCue({ tipSize: size })}
                        className={`p-2 rounded-xl border text-center text-xs transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/80 font-bold text-amber-900 ring-1 ring-amber-500'
                            : isAvailable
                            ? 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                            : 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {size.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 6: ENGRAVING & NAMEPLATE --- */}
        {activeTab === 'engraving' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center justify-between">
                <span>Personalized Nameplate Disc</span>
                <span className="text-xs text-amber-700 font-mono font-bold">
                  {cue.engraving?.trim() && cue.engraving.trim().toLowerCase() !== 'custom made'
                    ? '+£19'
                    : 'Free (CUSTOM MADE)'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Default text &quot;CUSTOM MADE&quot; is included free. Custom names or text are +£19.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1.5">
                    Engraving Text (Max 18 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={cue.engraving}
                    onChange={(e) => updateCue({ engraving: e.target.value })}
                    placeholder="CUSTOM MADE"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono uppercase shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1.5">Select Engraving Font</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Roboto', label: 'Roboto' },
                      { id: 'Lora', label: 'Lora' },
                      { id: 'Alex Brush', label: 'Alex Brush' },
                    ].map((f) => {
                      const isSelected = cue.font === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => updateCue({ font: f.id })}
                          className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-900 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span style={{ fontFamily: f.id }}>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: ACCESSORIES & EXTRAS (CONDITIONED ON BUTT JOINT) --- */}
        {activeTab === 'accessories' && (
          <div className="space-y-5">
            {!extensionCondition.allowed ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Accessories Conditionally Disabled
                  </span>
                  <span className="text-[11px] text-amber-800 mt-0.5 block">
                    {extensionCondition.reason}. Go to the &quot;Joint & Butt&quot; tab and set Butt Joint to &quot;Yes&quot; to attach mini butts and extensions.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Mini Butt (6-inch)</h3>
                  <p className="text-xs text-slate-500 mb-3">Screw-in extension for extra reach and bumper protection.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CUE_MINI_BUTTS.map((butt) => {
                      const isSelected = cue.miniButt?.id === butt.id;
                      return (
                        <button
                          key={butt.id}
                          onClick={() => updateCue({ miniButt: isSelected ? null : butt })}
                          className={`flex flex-col p-3 rounded-xl border text-xs text-left transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/60 font-semibold text-slate-900 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
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

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Telescopic Extensions</h3>
                  <p className="text-xs text-slate-500 mb-3">Extendable quick-lock extensions.</p>
                  <div className="space-y-2">
                    {CUE_EXTENSIONS.map((ext) => {
                      const isSelected = cue.extensions?.some((e) => e.id === ext.id);
                      return (
                        <button
                          key={ext.id}
                          onClick={() => {
                            const updated = isSelected
                              ? cue.extensions.filter((e) => e.id !== ext.id)
                              : [...cue.extensions, ext];
                            updateCue({ extensions: updated });
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/60 font-semibold text-slate-900 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Price Breakdown & Order Trigger */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Current Price</span>
            <span className="text-3xl font-extrabold text-slate-900 font-mono">£{price.total}</span>
          </div>
          <button
            onClick={() => {
              alert(
                `Order summary ready!\n\nCurrent Price: £${price.total}\nShaft: ${cue.shaft?.name} (£${cue.shaft?.price})\nButt Timber: ${cue.buttTimber?.name} (£${price.buttTimberPrice})\nEnd Butt Joint: ${cue.endButtJoin ? 'Yes (+£12)' : 'No'}\nSplices: ${cue.largeSpliceMaterial ? cue.largeSpliceMaterial.name + ' (+£' + price.largeSplicePrice + ')' : 'None'}\nEngraving: "${cue.engraving}" (${price.engravingPrice ? '+£' + price.engravingPrice : 'Free'})`
              );
            }}
            className="px-7 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase shadow-md transition-all transform active:scale-95"
          >
            Order Cue
          </button>
        </div>
      </div>
    </div>
  );
};

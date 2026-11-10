'use client';

import React, { useState } from 'react';

interface WebARViewerProps {
  modelSrc?: string;
  iosModelSrc?: string;
  altText?: string;
  productName?: string;
  category?: string;
}

type ARMode = 'wrist' | 'body' | 'room' | 'face' | 'surface';

export default function WebARViewer({
  modelSrc,
  iosModelSrc,
  altText = '3D Product Model',
  productName = '',
  category = '',
}: WebARViewerProps) {
  const [isARActive, setIsARActive] = useState(false);
  const [activeTab, setActiveTab] = useState<ARMode>(() => {
    const text = `${productName} ${category}`.toLowerCase();
    if (/watch|band|bracelet|ring/.test(text)) return 'wrist';
    if (/shirt|jacket|hoodie|sweater|pants|dress|apparel|clothing/.test(text)) return 'body';
    if (/glasses|sunglasses|mask|helmet|hat|cap/.test(text)) return 'face';
    if (/cleaner|gadget|cup|massage|lamp|decor|furniture|table|chair/.test(text)) return 'room';
    return 'surface';
  });

  const modeConfig: Record<ARMode, { label: string; icon: string; description: string; previewBadge: string }> = {
    wrist: {
      label: 'Virtual Wrist Try-On',
      icon: '⌚',
      description: 'Projects the watch or accessory onto your wrist with realistic scale, lighting, and clasp fit.',
      previewBadge: 'Wrist Virtual Try-On Simulation Active',
    },
    body: {
      label: 'Virtual Body Fit',
      icon: '👕',
      description: 'Overlays the apparel onto a virtual model body to check exact sizing, drape, and length.',
      previewBadge: 'Apparel Size & Fit Simulation Active',
    },
    room: {
      label: 'Room Placement',
      icon: '🛋️',
      description: 'Places the product at 1:1 scale directly in your room environment via AR floor detection.',
      previewBadge: 'Room Scale 1:1 Placement Active',
    },
    face: {
      label: 'Virtual Face Fit',
      icon: '🕶️',
      description: 'Maps the accessory onto facial contours for accurate sizing and style check.',
      previewBadge: 'Facial AR Mapping Active',
    },
    surface: {
      label: 'Surface Inspection',
      icon: '📦',
      description: 'Inspect 3D product textures, mechanics, and rotation in high fidelity.',
      previewBadge: '3D Surface Inspection Active',
    },
  };

  const currentMode = modeConfig[activeTab];

  return (
    <div className="w-full flex flex-col bg-neutral-900 rounded-2xl overflow-hidden shadow-xl p-5 text-white">
      {/* Header & Category Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
            Contextual Smart AR Engine
          </span>
          <h4 className="text-base font-semibold text-neutral-100 mt-0.5">{altText}</h4>
        </div>
        
        {/* Category Mode Pills */}
        <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          {(Object.keys(modeConfig) as ARMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveTab(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === mode
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              {modeConfig[mode].icon} {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Simulation Stage */}
      <div className="relative my-4 w-full h-72 flex flex-col items-center justify-center border border-dashed border-neutral-700 rounded-xl bg-neutral-950 text-neutral-300 p-6 text-center overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

        {isARActive ? (
          <div className="relative z-10 flex flex-col items-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-emerald-400 font-semibold">Calibrating {currentMode.label} camera...</p>
            <p className="text-xs text-neutral-400 max-w-xs">{currentMode.description}</p>
            <button 
              onClick={() => setIsARActive(false)}
              className="text-xs text-neutral-400 underline hover:text-white mt-2 px-3 py-1 bg-neutral-900 rounded-lg border border-neutral-800"
            >
              Exit AR Session
            </button>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center space-y-3">
            <span className="text-4xl">{currentMode.icon}</span>
            <div>
              <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1 rounded-full font-medium mb-1">
                {currentMode.previewBadge}
              </span>
              <p className="text-xs text-neutral-400 max-w-sm mt-1">{currentMode.description}</p>
            </div>
            {modelSrc && (
              <code className="text-[10px] text-neutral-500 bg-neutral-900/80 px-2.5 py-1 rounded border border-neutral-800 max-w-xs truncate">
                Asset: {modelSrc}
              </code>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
        <p className="text-xs text-neutral-400">
          💡 <span className="text-neutral-300 font-medium">Smart AI Match:</span> Auto-selected <strong className="text-emerald-400">{activeTab}</strong> preview mode.
        </p>
        <button
          onClick={() => {
            setIsARActive(true);
            setTimeout(() => {
              if (iosModelSrc && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                window.location.href = iosModelSrc;
              } else {
                alert(`Launching ${currentMode.label} AR experience! Point your device camera to begin.`);
                setIsARActive(false);
              }
            }, 1400);
          }}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <span>🚀 Launch {currentMode.label}</span>
        </button>
      </div>
    </div>
  );
}

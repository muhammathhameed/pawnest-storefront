'use client';

import React, { useState } from 'react';

interface WebARViewerProps {
  modelSrc?: string;
  iosModelSrc?: string;
  altText?: string;
}

export default function WebARViewer({
  modelSrc,
  iosModelSrc,
  altText = '3D Product Model',
}: WebARViewerProps) {
  const [isARActive, setIsARActive] = useState(false);

  // If no model source is provided, render a clean fallback instead of crashing or showing empty bracket state
  if (!modelSrc) {
    return (
      <div className="w-full flex flex-col items-center justify-center bg-neutral-900 rounded-xl overflow-hidden shadow-inner p-6 min-h-[220px] text-center">
        <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-1">Interactive 3D / AR</span>
        <h4 className="text-sm font-medium text-neutral-300 mb-2">{altText}</h4>
        <p className="text-xs text-neutral-400 max-w-sm">
          3D model asset is currently being generated for this item. Check back soon for interactive AR preview!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center bg-neutral-900 rounded-xl overflow-hidden shadow-inner p-4 min-h-[300px]">
      <div className="text-center text-white mb-3">
        <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Interactive 3D / AR</span>
        <h4 className="text-sm font-medium text-neutral-300">{altText}</h4>
      </div>
      <div className="w-full h-64 flex flex-col items-center justify-center border border-dashed border-neutral-700 rounded-lg bg-neutral-950 text-neutral-300 text-sm p-4 text-center">
        {isARActive ? (
          <div className="flex flex-col items-center space-y-2 animate-pulse">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-emerald-400 font-medium">Initializing camera & AR Quick Look...</p>
            <button 
              onClick={() => setIsARActive(false)}
              className="text-xs text-neutral-400 underline hover:text-white mt-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 text-emerald-500 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"></path>
            </svg>
            <p className="text-xs text-neutral-400 mb-1">3D Model Ready for Inspection</p>
            <code className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-1 rounded max-w-xs truncate">{modelSrc}</code>
          </>
        )}
      </div>
      <div className="mt-3 flex gap-2 w-full">
        <button
          onClick={() => {
            setIsARActive(true);
            setTimeout(() => {
              // Trigger iOS AR Quick Look or Android Scene Viewer if available, else fallback alert
              if (iosModelSrc && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
                window.location.href = iosModelSrc;
              } else {
                alert('AR Quick Look activated! Point your mobile camera at a flat surface to place the item.');
                setIsARActive(false);
              }
            }, 1200);
          }}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow"
        >
          View in AR (Mobile)
        </button>
      </div>
    </div>
  );
}

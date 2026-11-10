'use client';

import React from 'react';

interface WebARViewerProps {
  modelSrc?: string;
  iosModelSrc?: string;
  altText?: string;
}

export default function WebARViewer({
  modelSrc = '/models/default.glb',
  iosModelSrc,
  altText = '3D Product Model',
}: WebARViewerProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center bg-neutral-900 rounded-xl overflow-hidden shadow-inner p-4 min-h-[300px]">
      <div className="text-center text-white mb-3">
        <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Interactive 3D / AR</span>
        <h4 className="text-sm font-medium text-neutral-300">{altText}</h4>
      </div>
      <div className="w-full h-64 flex items-center justify-center border border-dashed border-neutral-700 rounded-lg bg-neutral-950 text-neutral-400 text-sm">
        [3D Model Viewer Active: {modelSrc}]
      </div>
      <div className="mt-3 flex gap-2 w-full">
        <button
          onClick={() => alert('Launching AR view on mobile device...')}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          View in AR (Mobile)
        </button>
      </div>
    </div>
  );
}

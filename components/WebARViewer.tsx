'use client';

import React, { useEffect } from 'react';

interface WebARViewerProps {
  modelUrl: string;
  iosModelUrl?: string;
  posterUrl: string;
  productName: string;
}

export default function WebARViewer({
  modelUrl,
  iosModelUrl,
  posterUrl,
  productName,
}: WebARViewerProps) {
  useEffect(() => {
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Google Model Viewer Web Component rendered via createElement to bypass strict JSX intrinsic checks */}
      {React.createElement('model-viewer', {
        src: modelUrl,
        'ios-src': iosModelUrl,
        poster: posterUrl,
        alt: `3D AR model of ${productName}`,
        ar: true,
        'ar-modes': 'scene-viewer quick-look webxr',
        'camera-controls': true,
        'auto-rotate': true,
        'shadow-intensity': '1',
        style: { width: '100%', height: '100%', backgroundColor: '#0f172a' },
      }, [
        React.createElement(
          'button',
          {
            key: 'ar-button',
            slot: 'ar-button',
            className: 'absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer z-10',
          },
          [
            React.createElement('svg', {
              key: 'svg',
              xmlns: 'http://www.w3.org/2000/svg',
              className: 'w-5 h-5',
              fill: 'none',
              viewBox: '0 0 24 24',
              stroke: 'currentColor',
            }, [
              React.createElement('path', {
                key: 'path',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
              })
            ]),
            'View in Your Room (AR)'
          ]
        )
      ])}

      <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs text-slate-300 font-medium">
        Interactive 3D & AR Enabled
      </div>
    </div>
  );
}

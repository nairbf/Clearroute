'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Disclaimer() {
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check

  useEffect(() => {
    // Check if user has dismissed this session
    const isDismissed = sessionStorage.getItem('disclaimer_dismissed');
    setDismissed(!!isDismissed);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('disclaimer_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
        <p className="text-sm text-amber-800 flex-1">
          <strong>Community-reported data.</strong> Road conditions change rapidly. 
          Always drive carefully and use your own judgment.
        </p>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 p-1 -m-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

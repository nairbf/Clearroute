'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const lastDismissed = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - lastDismissed) / (1000 * 60 * 60 * 24);
    
    if (daysSinceDismissed < 7) return;

    // Listen for install prompt (Android/Desktop Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 30 seconds
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // For iOS, show prompt after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 30000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 bg-white rounded-xl shadow-xl p-4 z-50 border border-slate-200 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600"
      >
        <X size={20} />
      </button>
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone size={24} className="text-blue-600" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="font-semibold text-slate-900 mb-1">Install ClearRoute</h3>
          {isIOS ? (
            <p className="text-sm text-slate-500 mb-3">
              Tap the share button, then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-sm text-slate-500 mb-3">
              Add to your home screen for quick access
            </p>
          )}
          
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
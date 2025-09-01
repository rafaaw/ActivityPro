import { useState, useEffect } from "react";

interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isOnline: boolean;
  canUpdate: boolean;
}

export function usePWA() {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isIOS: false,
    isOnline: navigator.onLine,
    canUpdate: false,
  });

  useEffect(() => {
    // Check if app is running in standalone mode
    const isStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true ||
             document.referrer.includes('android-app://');
    };

    // Check if it's iOS
    const isIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    // Check if already installed
    const isInstalled = () => {
      return isStandalone() || localStorage.getItem('pwa-installed') === 'true';
    };

    // Update status
    const updateStatus = () => {
      setPwaStatus(prev => ({
        ...prev,
        isStandalone: isStandalone(),
        isIOS: isIOS(),
        isInstalled: isInstalled(),
        isOnline: navigator.onLine,
      }));
    };

    // Initial status check
    updateStatus();

    // Listen for installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaStatus(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setPwaStatus(prev => ({ 
        ...prev, 
        isInstalled: true,
        isInstallable: false 
      }));
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Service Worker update detection
    const handleServiceWorkerUpdate = () => {
      setPwaStatus(prev => ({ ...prev, canUpdate: true }));
    };

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleServiceWorkerUpdate();
              }
            });
          }
        });
      });
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  return {
    ...pwaStatus,
    updateServiceWorker,
  };
}
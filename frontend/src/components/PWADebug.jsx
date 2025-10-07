import { useState, useEffect } from 'react';

const PWADebug = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const checkPWAStatus = () => {
      const info = {
        // Environment
        isHTTPS: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost',
        
        // PWA Features
        serviceWorker: 'serviceWorker' in navigator,
        beforeInstallPrompt: 'beforeInstallPrompt' in window,
        
        // Installation Status
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' :
                   window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen' :
                   window.matchMedia('(display-mode: minimal-ui)').matches ? 'minimal-ui' : 'browser',
        
        // Browser Info
        userAgent: navigator.userAgent,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: /Android/.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent),
        
        // Manifest
        manifest: document.querySelector('link[rel="manifest"]') ? 'Found' : 'Not found',
        
        // Icons
        icons: {
          icon192: document.querySelector('link[rel="icon"][sizes="192x192"]') ? 'Found' : 'Not found',
          appleTouch: document.querySelector('link[rel="apple-touch-icon"]') ? 'Found' : 'Not found',
        }
      };
      
      setDebugInfo(info);
    };

    checkPWAStatus();
    
    // Re-check when beforeinstallprompt fires
    window.addEventListener('beforeinstallprompt', checkPWAStatus);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', checkPWAStatus);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-md text-xs">
      <h4 className="font-bold mb-2">PWA Debug Info</h4>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      <button 
        onClick={() => navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(reg => console.log('SW:', reg));
        })}
        className="mt-2 bg-blue-500 px-2 py-1 rounded text-xs"
      >
        Check SW
      </button>
    </div>
  );
};

export default PWADebug;
import { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [pwaStatus, setPwaStatus] = useState('checking');

  useEffect(() => {
    const checkPWARequirements = () => {
      const status = {
        isHTTPS: window.location.protocol === 'https:',
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        userAgent: navigator.userAgent,
      };

      console.log('🔍 PWA Status Check:', status);
      return status;
    };

    const handler = (e) => {
      e.preventDefault();
      console.log('🚀 beforeinstallprompt event fired - Browser will show install button in address bar');
      setSupportsPWA(true);
      setPromptInstall(e);
      setPwaStatus('ready');
      
      // The browser will now show the install icon in the address bar
      // We can also show our custom button as an alternative
    };

    const checkInstalled = () => {
      const status = checkPWARequirements();
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isIOSStandalone = window.navigator.standalone;

      if (isStandalone || isFullscreen || isMinimalUI || isIOSStandalone) {
        console.log('📱 App is already installed');
        setIsInstalled(true);
        setPwaStatus('installed');
        return true;
      }

      // For production, show button if basic PWA requirements are met
      if (process.env.NODE_ENV === 'production') {
        const meetsBasicRequirements = status.isHTTPS && status.hasManifest && status.hasServiceWorker;
        if (meetsBasicRequirements && !isInstalled) {
          console.log('🏗️ Basic PWA requirements met, showing install option');
          setPwaStatus('available');
          setSupportsPWA(true);
        }
      }
      
      return false;
    };

    checkInstalled();

    // Listen for beforeinstallprompt event - this triggers browser install button
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', (evt) => {
      console.log('🎉 App was successfully installed');
      setIsInstalled(true);
      setPromptInstall(null);
      setPwaStatus('installed');
    });

    // Check if deferredPrompt exists (some browsers store it)
    if (window.deferredPrompt) {
      setPromptInstall(window.deferredPrompt);
      setSupportsPWA(true);
      setPwaStatus('ready');
    }

    const timeoutId = setTimeout(() => {
      checkInstalled();
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timeoutId);
    };
  }, [isInstalled]);

  const installApp = async (evt) => {
    evt.preventDefault();
    
    if (promptInstall) {
      try {
        console.log('🔄 Triggering install prompt...');
        
        // Show the native browser install prompt
        const result = await promptInstall.prompt();
        
        console.log('📝 Install prompt result:', result);
        
        // Wait for the user to respond to the prompt
        const { outcome } = await result;
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted the install');
          setPromptInstall(null);
          setPwaStatus('installed');
          
          // Clear the deferred prompt
          if (window.deferredPrompt) {
            window.deferredPrompt = null;
          }
        } else {
          console.log('❌ User dismissed the install');
        }
        
      } catch (error) {
        console.error('💥 Error during installation:', error);
        setShowManualInstructions(true);
      }
    } else {
      console.log('❌ No install prompt available, showing manual instructions');
      setShowManualInstructions(true);
    }
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  // Show button if not installed AND (supports PWA OR in development OR PWA available)
  const shouldShowButton = !isInstalled && (
    supportsPWA || 
    process.env.NODE_ENV === 'development' || 
    pwaStatus === 'available'
  );

  console.log('🎯 Install Button State:', {
    shouldShowButton,
    isInstalled,
    supportsPWA,
    pwaStatus,
    hasPrompt: !!promptInstall,
    environment: process.env.NODE_ENV
  });

  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      {/* Main Install Button */}
      <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                Install App
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Get native app experience
              </p>
              <div className="mt-2 flex space-x-1">
                <button
                  onClick={installApp}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs font-medium rounded-md transition-colors duration-200"
                >
                  {promptInstall ? 'Install Now' : 'How to Install'}
                </button>
                <button
                  onClick={() => setShowManualInstructions(true)}
                  className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                  title="Show installation instructions"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Instructions Modal */}
      {showManualInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                How to Install
              </h3>
              <button
                onClick={() => setShowManualInstructions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                  💡 Look for the install icon in your browser's address bar!
                </p>
              </div>

              {isIOS ? (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                    iOS Installation:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap the <strong>Share button</strong> <span className="inline-block">⎙</span> at the bottom</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> in the top right corner</li>
                  </ol>
                </div>
              ) : isMobile ? (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                    Android Installation:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap the <strong>menu button (⋮)</strong> in Chrome</li>
                    <li>Tap <strong>"Install app"</strong> or "Add to Home screen"</li>
                    <li>Confirm the installation</li>
                  </ol>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                    Desktop Installation:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Look for the <strong>install icon (+)</strong> in the address bar</li>
                    <li>Or go to <strong>Chrome menu → "Install TRADE"</strong></li>
                    <li>Or press <strong>Ctrl+Shift+B</strong> to show install button</li>
                  </ol>
                </div>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  🔧 <strong>Supported Browsers:</strong> Chrome, Edge, Safari. Make sure you've visited the site a few times.
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowManualInstructions(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200"
              >
                Close
              </button>
              {promptInstall && (
                <button
                  onClick={installApp}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200"
                >
                  Try Install Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug info - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 bg-black bg-opacity-80 text-white p-3 rounded text-xs max-w-xs">
          <div><strong>PWA Debug:</strong></div>
          <div>Status: {pwaStatus}</div>
          <div>Has Prompt: {!!promptInstall ? 'Yes' : 'No'}</div>
          <div>Installed: {isInstalled ? 'Yes' : 'No'}</div>
          <div>Browser: {isChrome ? 'Chrome' : 'Other'}</div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
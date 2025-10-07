import { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [pwaStatus, setPwaStatus] = useState('checking');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const checkPWARequirements = () => {
      const status = {
        isHTTPS: window.location.protocol === 'https:',
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
        isMinimalUI: window.matchMedia('(display-mode: minimal-ui)').matches,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      console.log('🔍 PWA Status Check:', status);
      setDebugInfo(status);
      return status;
    };

    const handler = (e) => {
      e.preventDefault();
      console.log('🚀 beforeinstallprompt event fired!');
      
      // Store the event for later use
      setPromptInstall(e);
      setSupportsPWA(true);
      setPwaStatus('ready');
      
      // Store in global for persistence
      window.deferredPrompt = e;
    };

    const checkInstalled = () => {
      const status = checkPWARequirements();
      
      const isStandalone = status.isStandalone;
      const isFullscreen = status.isFullscreen;
      const isMinimalUI = status.isMinimalUI;
      const isIOSStandalone = window.navigator.standalone;

      if (isStandalone || isFullscreen || isMinimalUI || isIOSStandalone) {
        console.log('📱 App is already installed');
        setIsInstalled(true);
        setPwaStatus('installed');
        return true;
      }

      // Check if we have a stored prompt
      if (window.deferredPrompt) {
        setPromptInstall(window.deferredPrompt);
        setSupportsPWA(true);
        setPwaStatus('ready');
      }

      // Always show in development for testing
      if (process.env.NODE_ENV === 'development') {
        setSupportsPWA(true);
        setPwaStatus('development');
      }
      
      // Show in production if basic requirements are met
      if (process.env.NODE_ENV === 'production' && status.isHTTPS && status.hasManifest) {
        setPwaStatus('available');
        setSupportsPWA(true);
      }

      return false;
    };

    checkInstalled();

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', (evt) => {
      console.log('🎉 App installed successfully!');
      setIsInstalled(true);
      setPromptInstall(null);
      setPwaStatus('installed');
      window.deferredPrompt = null;
    });

    // Re-check after components load
    const timeoutId = setTimeout(checkInstalled, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timeoutId);
    };
  }, []);

  const installApp = async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    
    console.log('🔄 Install button clicked', { hasPrompt: !!promptInstall });

    if (promptInstall) {
      try {
        console.log('📲 Showing native install prompt...');
        
        // Show the native prompt
        promptInstall.prompt();
        
        // Wait for user decision
        const choiceResult = await promptInstall.userChoice;
        console.log('✅ User choice:', choiceResult);
        
        if (choiceResult.outcome === 'accepted') {
          console.log('🎉 User accepted install');
          setPromptInstall(null);
          setPwaStatus('installed');
          window.deferredPrompt = null;
        } else {
          console.log('❌ User declined install');
          // Keep the prompt for next time
        }
        
      } catch (error) {
        console.error('💥 Install error:', error);
        setShowManualInstructions(true);
      }
    } else {
      console.log('📋 No native prompt, showing manual instructions');
      setShowManualInstructions(true);
    }
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);

  // Show button conditions
  const shouldShowButton = !isInstalled && (
    supportsPWA || 
    process.env.NODE_ENV === 'development' ||
    pwaStatus === 'available'
  );

  console.log('🎯 Button visibility:', { 
    shouldShowButton, 
    isInstalled, 
    supportsPWA, 
    pwaStatus,
    hasPrompt: !!promptInstall 
  });

  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      {/* Install Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <button
                onClick={installApp}
                className="w-full text-left"
              >
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                  Install App
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {promptInstall ? 'Click to install' : 'Get app experience'}
                </p>
              </button>
            </div>
            <button
              onClick={() => setShowManualInstructions(true)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Installation help"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          
          {/* Install button */}
          <button
            onClick={installApp}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1.5 text-xs font-medium rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{promptInstall ? 'Install Now' : 'Show Instructions'}</span>
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showManualInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Install TRADE App
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
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Look for the install icon (+) in your browser's address bar
                </p>
              </div>

              {isIOS ? (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">iOS:</p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap Share button <span className="inline-block">⎙</span></li>
                    <li>Select "Add to Home Screen"</li>
                    <li>Tap "Add"</li>
                  </ol>
                </div>
              ) : isMobile ? (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Android:</p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap Chrome menu (⋮)</li>
                    <li>Tap "Install app"</li>
                    <li>Confirm installation</li>
                  </ol>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Desktop:</p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Look for install icon in address bar</li>
                    <li>Or check browser menu → "Install TRADE"</li>
                    <li>Some browsers need multiple visits</li>
                  </ol>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowManualInstructions(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={installApp}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              >
                Try Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 bg-black text-white p-3 rounded text-xs max-w-xs space-y-1">
          <div><strong>PWA Debug:</strong></div>
          <div>Status: {pwaStatus}</div>
          <div>Prompt: {promptInstall ? 'YES' : 'NO'}</div>
          <div>Installed: {isInstalled ? 'YES' : 'NO'}</div>
          <div>HTTPS: {debugInfo.isHTTPS ? 'YES' : 'NO'}</div>
          <div>Manifest: {debugInfo.hasManifest ? 'YES' : 'NO'}</div>
          <div>ServiceWorker: {debugInfo.hasServiceWorker ? 'YES' : 'NO'}</div>
          <button 
            onClick={() => {
              // Force trigger for testing
              const event = new Event('beforeinstallprompt');
              event.prompt = () => Promise.resolve({ outcome: 'accepted' });
              event.userChoice = Promise.resolve({ outcome: 'accepted' });
              window.dispatchEvent(event);
            }}
            className="mt-1 bg-blue-500 px-2 py-1 rounded text-xs"
          >
            Simulate Prompt
          </button>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
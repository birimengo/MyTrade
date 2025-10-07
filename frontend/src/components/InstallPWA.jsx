import { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('🚀 PWA install prompt available');
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const isIOSStandalone = window.navigator.standalone;

      if (isStandalone || isFullscreen || isMinimalUI || isIOSStandalone) {
        console.log('📱 App is already installed');
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    checkInstalled();

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', (evt) => {
      console.log('🎉 App was successfully installed');
      setIsInstalled(true);
      setPromptInstall(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const onClick = async (evt) => {
    evt.preventDefault();
    if (!promptInstall) {
      console.log('❌ No install prompt available, showing manual instructions');
      setShowManualInstructions(true);
      return;
    }
    
    try {
      console.log('🔄 Showing install prompt...');
      const result = await promptInstall.prompt();
      console.log('📝 Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        console.log('✅ User accepted the install');
        setPromptInstall(null);
      } else {
        console.log('❌ User dismissed the install');
      }
    } catch (error) {
      console.error('💥 Error installing PWA:', error);
      setShowManualInstructions(true);
    }
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const shouldShowButton = !isInstalled && (supportsPWA || process.env.NODE_ENV === 'development');

  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      {/* Main Install Button - Reduced Size */}
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
                Better experience
              </p>
              <div className="mt-2 flex space-x-1">
                <button
                  onClick={onClick}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs font-medium rounded-md transition-colors duration-200"
                >
                  Install
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

      {/* Manual Instructions Modal - Reduced Size */}
      {showManualInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Install App
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
            
            <div className="space-y-2">
              {isIOS ? (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    On iOS:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap Share button <span className="inline-block">⎙</span></li>
                    <li>Tap "Add to Home Screen"</li>
                    <li>Tap "Add"</li>
                  </ol>
                </div>
              ) : isMobile ? (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    On Android:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Tap menu (⋮) in Chrome</li>
                    <li>Tap "Install app"</li>
                    <li>Confirm installation</li>
                  </ol>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    On Desktop:
                  </p>
                  <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Look for install icon in address bar</li>
                    <li>Or check browser menu</li>
                    <li>Click "Install TRADE"</li>
                  </ol>
                </div>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  💡 Use Chrome, Edge, or Safari for best experience.
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowManualInstructions(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
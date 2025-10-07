import { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log('🚀 PWA install prompt available');
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    // Check if app is already installed
    const checkInstalled = () => {
      // Method 1: Check display mode
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 App is already installed (display-mode)');
        setIsInstalled(true);
        return true;
      }
      
      // Method 2: Check for navigator.standalone (iOS)
      if (window.navigator.standalone) {
        console.log('📱 App is installed (iOS standalone)');
        setIsInstalled(true);
        return true;
      }
      
      // Method 3: Check if launched from home screen
      if (window.matchMedia('(display-mode: fullscreen)').matches || 
          window.matchMedia('(display-mode: minimal-ui)').matches) {
        console.log('📱 App is installed (fullscreen/minimal-ui)');
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    // Check on component mount
    checkInstalled();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', (evt) => {
      console.log('🎉 App was successfully installed');
      setIsInstalled(true);
      setPromptInstall(null);
      setIsVisible(false);
    });

    // Hide install button after 30 seconds if user doesn't interact
    const timer = setTimeout(() => {
      if (supportsPWA && promptInstall) {
        console.log('⏰ Hiding install button after timeout');
        setIsVisible(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [supportsPWA, promptInstall]);

  const onClick = async (evt) => {
    evt.preventDefault();
    if (!promptInstall) {
      console.log('❌ No install prompt available');
      return;
    }
    
    try {
      console.log('🔄 Showing install prompt...');
      const result = await promptInstall.prompt();
      console.log('📝 Install prompt result:', result);
      
      // Check if user accepted the install
      if (result.outcome === 'accepted') {
        console.log('✅ User accepted the install');
        setPromptInstall(null);
        setIsVisible(false);
      } else {
        console.log('❌ User dismissed the install');
        // Keep the button visible for a while longer
      }
    } catch (error) {
      console.error('💥 Error installing PWA:', error);
    }
  };

  const onDismiss = () => {
    console.log('👋 User dismissed install button');
    setIsVisible(false);
  };

  // Don't show install button in various conditions
  if (isInstalled) {
    console.log('🔕 Not showing install button: App is already installed');
    return null;
  }

  if (!supportsPWA) {
    console.log('🔕 Not showing install button: PWA not supported');
    return null;
  }

  if (!isVisible) {
    console.log('🔕 Not showing install button: User dismissed or timeout');
    return null;
  }

  console.log('👀 Showing install button');

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Install TRADE App
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Get the best experience with our app
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={onClick}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Install
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
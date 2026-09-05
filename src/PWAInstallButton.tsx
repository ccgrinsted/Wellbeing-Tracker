import React, { useState, useEffect } from 'react';

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if user is on a mobile device screen width
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 2. Check if the app is already installed & running in Standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 3. Capture Chrome/Android native PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Do not render on Desktop screens
  if (!isMobile) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native Chrome/Android install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // Show iOS step-by-step popup instruction
      setShowIOSInstructions(true);
    } else {
      alert('To install, open your browser menu and tap "Add to Home Screen".');
    }
  };

  const handleOpenAppClick = () => {
    // Launch installed app window
    window.location.href = 'https://wellbeing-tracker.wellspring.coach';
  };

  return (
    <div style={{ width: '100%', padding: '10px 16px', boxSizing: 'border-box' }}>
      {isStandalone ? (
        <button
          onClick={handleOpenAppClick}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#2e7d32',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ✓ App Installed — Go to app
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '12px 20px',
            backgroundColor: '#1b4d3e',
            color: '#ffffff',
            border: '1px solid #3d7a66',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          📱 Install App to Home Screen
        </button>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0d1412',
            border: '1px solid #3d7a66',
            borderRadius: '12px',
            padding: '24px',
            color: '#ffffff',
            textAlign: 'center',
            maxWidth: '320px'
          }}>
            <h3 style={{ marginTop: 0 }}>Install on iOS</h3>
            <p style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.5' }}>
              1. Tap the <strong>Share</strong> button (box with an arrow) in Safari.<br /><br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSInstructions(false)}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                backgroundColor: '#3d7a66',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
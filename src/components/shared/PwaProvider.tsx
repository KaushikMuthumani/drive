'use client'
import { useEffect, useState } from 'react'

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[PWA] Service worker registered:', reg.scope)
          // Check for updates every 60 seconds
          setInterval(() => reg.update(), 60_000)
        })
        .catch(err => console.error('[PWA] SW registration failed:', err))
    }

    // Detect if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)

    // Capture install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Show banner if not already installed and not dismissed before
      const dismissed = localStorage.getItem('pwa-banner-dismissed')
      if (!dismissed && !isStandalone) {
        setShowBanner(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari install hint
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
    const iosDismissed = localStorage.getItem('ios-banner-dismissed')
    if (isIos && isSafari && !isStandalone && !iosDismissed) {
      setShowBanner(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setInstallPrompt(null)
    }
  }

  function dismiss() {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setShowBanner(false)
  }

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <>
      {children}

      {/* Install banner */}
      {showBanner && !isInstalled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-lg mx-auto">
            <div className="flex items-start gap-3">
              <img src="/icons/icon-72x72.png" className="w-12 h-12 rounded-xl flex-shrink-0" alt="DriveIndia"/>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Add DriveIndia to home screen</p>
                {isIos ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Tap the <span className="font-medium">Share</span> button then <span className="font-medium">"Add to Home Screen"</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Works like an app — no browser bar, instant open</p>
                )}
              </div>
              <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0">×</button>
            </div>
            {!isIos && (
              <div className="flex gap-2 mt-3">
                <button onClick={install} className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition">
                  Install app
                </button>
                <button onClick={dismiss} className="px-4 text-sm text-gray-500 hover:text-gray-700">
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

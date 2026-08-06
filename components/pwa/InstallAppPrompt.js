'use client'

import { useEffect, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  dismissInstallPrompt,
  initPwaInstallCapture,
  isInstallDismissed,
  isIosSafari,
  isStandaloneDisplay,
  promptPwaInstall,
  subscribePwaInstall,
} from '@/lib/pwa/installState'

/**
 * Global dashboard install chip: Chrome/Edge install prompt + iOS A2HS tip.
 */
export function InstallAppPrompt() {
  const [installable, setInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [iosTip, setIosTip] = useState(false)

  useEffect(() => {
    initPwaInstallCapture()
    setDismissed(isInstallDismissed())
    setInstalled(isStandaloneDisplay())
    setIosTip(isIosSafari() && !isStandaloneDisplay())

    return subscribePwaInstall(({ installable: canInstall, installed: isInstalled }) => {
      setInstallable(Boolean(canInstall))
      setInstalled(Boolean(isInstalled))
      if (isInstalled) setIosTip(false)
    })
  }, [])

  if (installed || dismissed) return null

  const showAndroid = installable
  const showIos = iosTip && !installable
  if (!showAndroid && !showIos) return null

  const onDismiss = () => {
    dismissInstallPrompt()
    setDismissed(true)
  }

  const onInstall = async () => {
    const ok = await promptPwaInstall()
    if (ok) setInstalled(true)
  }

  return (
    <div
      className="mx-4 mt-3 sm:mx-6 lg:mx-8 rounded-lg border border-royalPurple-border bg-royalPurple-card px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
      role="region"
      aria-label="Install ZSMS"
    >
      <div className="flex items-start gap-2 min-w-0 text-sm">
        {showAndroid ? (
          <>
            <Download className="h-4 w-4 mt-0.5 shrink-0 text-royalPurple-accentTx" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-royalPurple-text1">Install ZSMS</p>
              <p className="text-xs text-royalPurple-text2">
                Add to your home screen for faster access and offline use.
              </p>
            </div>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 mt-0.5 shrink-0 text-royalPurple-accentTx" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-royalPurple-text1">Add to Home Screen</p>
              <p className="text-xs text-royalPurple-text2">
                Tap Share, then <strong>Add to Home Screen</strong> to install ZSMS on this iPhone
                or iPad.
              </p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showAndroid ? (
          <Button size="sm" onClick={onInstall}>
            Install
          </Button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-royalPurple-text2 hover:bg-royalPurple-card2 hover:text-royalPurple-text1"
          aria-label="Dismiss install tip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

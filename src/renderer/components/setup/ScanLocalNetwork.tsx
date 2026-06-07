/**
 * ScanLocalNetwork - Button to scan LAN for Halo desktop instances.
 *
 * Shows a dropdown of discovered devices when clicked.
 * Selecting a device calls onSelect with the server URL.
 */

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, Wifi } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useLanDiscovery } from '../../hooks/useLanDiscovery'

interface Props {
  onSelect: (url: string) => void
}

export function ScanLocalNetwork({ onSelect }: Props) {
  const { t } = useTranslation()
  const { devices, scanning, scan } = useLanDiscovery()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleClick = async () => {
    if (scanning) return
    setOpen(true)
    await scan()
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={handleClick}
        disabled={scanning}
        className="w-full py-3 rounded-lg border border-border bg-card text-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors disabled:opacity-50"
      >
        {scanning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
        {scanning ? t('Scanning local network...') : t('Scan Local Network')}
      </button>

      {open && devices.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-auto">
          {devices.map((d) => (
            <button
              key={d.url}
              onClick={() => {
                onSelect(d.url)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
            >
              <Wifi className="w-4 h-4 text-primary" />
              <span className="truncate">
                {d.ip}:{d.port}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && !scanning && devices.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-card border border-border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
          {t('No Halo devices found on local network')}
        </div>
      )}
    </div>
  )
}

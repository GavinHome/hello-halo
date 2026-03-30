/**
 * ImSessionPanel
 *
 * Right-side panel showing all conversations for the current digital human.
 * First item is always "Halo Chat" (native conversation), followed by
 * IM sessions sorted by lastActiveAt descending.
 *
 * Sessions data is managed centrally in apps-page.store (single fetch loop).
 * Real-time updates via app:im-session-updated event.
 */

import { useEffect } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { api } from '../../api'
import { useTranslation } from '../../i18n'
import { useAppsPageStore } from '../../stores/apps-page.store'
import { useIsMobile } from '../../hooks/useIsMobile'
import { ImSessionItem } from './ImSessionItem'

interface ImSessionPanelProps {
  appId: string
}

export function ImSessionPanel({ appId }: ImSessionPanelProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const {
    selectedImSession, selectImSession, toggleImPanel,
    imSessions, fetchImSessions,
  } = useAppsPageStore()

  // Fetch + poll from shared store
  useEffect(() => {
    fetchImSessions(appId)
    const interval = setInterval(() => fetchImSessions(appId), 15000)
    return () => clearInterval(interval)
  }, [appId, fetchImSessions])

  // Listen for real-time IM session updates
  useEffect(() => {
    const unsub = api.onImSessionUpdated?.((data: unknown) => {
      const update = data as { appId?: string }
      if (update.appId === appId) {
        fetchImSessions(appId)
      }
    })
    return () => { unsub?.() }
  }, [appId, fetchImSessions])

  const handleSelectHaloChat = () => {
    selectImSession(null)
    if (isMobile) toggleImPanel()
  }

  const handleSelectImSession = (session: typeof imSessions[number]) => {
    selectImSession(session)
    if (isMobile) toggleImPanel()
  }

  const isHaloChatSelected = selectedImSession === null

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-sm font-medium">{t('Conversations')}</span>
        <button
          onClick={toggleImPanel}
          className="p-1 rounded hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {/* Fixed: Halo Chat (native conversation) */}
        <button
          onClick={handleSelectHaloChat}
          className={`w-full text-left px-3 py-2.5 transition-colors ${
            isHaloChatSelected
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">{t('Halo Chat')}</span>
          </div>
        </button>

        {/* Divider */}
        {imSessions.length > 0 && <div className="border-b border-border" />}

        {/* IM sessions */}
        {imSessions.map(session => (
          <ImSessionItem
            key={`${session.channel}:${session.chatId}`}
            session={session}
            isSelected={
              selectedImSession?.channel === session.channel &&
              selectedImSession?.chatId === session.chatId
            }
            onClick={() => handleSelectImSession(session)}
          />
        ))}

        {/* Empty state */}
        {imSessions.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground/50">
              {t('IM conversations will appear here')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

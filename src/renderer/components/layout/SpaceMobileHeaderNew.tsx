/**
 * SpaceMobileHeaderNew - Compact mobile header for SpacePage
 *
 * Collapsed: Back + 3 common items (SpaceSelector, ChatHistory, NewConv) + ⋮.
 * Clicking ⋮ expands ModelSelector, Settings, and device switcher between
 * the common items and the ⋮ button. The ⋮ button stays fixed at the right
 * edge (absolutely positioned), so its position never shifts.
 */

import { useState } from 'react'
import { ChevronLeft, MoreHorizontal, X, Settings, Monitor } from 'lucide-react'
import { useAppStore } from '../../stores/app.store'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore } from '../../stores/chat.store'
import { isCapacitor } from '../../api/transport'
import { SpaceSelector } from './SpaceSelector'
import { ChatHistoryPanel } from '../chat/ChatHistoryPanel'
import { ModelSelector } from './ModelSelector'
import { useTranslation } from '../../i18n'

export function SpaceMobileHeader() {
  const { t } = useTranslation()
  const setView = useAppStore(s => s.setView)
  const [showMore, setShowMore] = useState(false)

  const currentSpace = useSpaceStore(s => s.currentSpace)
  const hasConversations = useChatStore(s => {
    const st = s.spaceStates.get(s.currentSpaceId ?? '')
    return (st?.conversations?.length ?? 0) > 0
  })

  const handleNewConversation = () => {
    if (currentSpace) {
      useChatStore.getState().createConversation(currentSpace.id)
    }
  }

  return (
    <header className="flex items-center justify-between h-10 pl-4 pr-4 border-b border-border">
      {/* Left: Back button (always visible) */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('Back')}</span>
        </button>
      </div>

      {/* Spacer — shrinks to accommodate expanding items */}
      <div className="flex-1 min-w-[40px]" />

      {/* Right: actions */}
      {/* pr-9 reserves space for the absolutely-positioned ⋮ button so it never shifts */}
      <div className="relative flex items-center gap-1 flex-shrink-0 pr-9">
        {/* Always visible: space switching, history, new conversation */}
        <SpaceSelector />
        {hasConversations && <ChatHistoryPanel />}
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
          title={t('New conversation')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Expanded items — model selector, settings, device — appear between common items and ⋮ */}
        {showMore && (
          <div className="flex items-center gap-1 animate-fade-in">
            <ModelSelector />
            <button
              onClick={() => setView('settings')}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
              title={t('Settings')}
            >
              <Settings className="w-5 h-5" />
            </button>
            {isCapacitor() && (
              <button
                onClick={() => setView('serverList')}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
                title={t('Switch server')}
              >
                <Monitor className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* More / collapse toggle — absolutely positioned at right edge, never moves */}
        <button
          onClick={() => setShowMore(v => !v)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
            showMore
              ? 'bg-primary/20 text-primary'
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          }`}
          title={showMore ? t('Less') : t('More')}
        >
          {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}

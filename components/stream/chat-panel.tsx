'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from '@/lib/stream'
import { cn } from '@/lib/utils'

export function ChatPanel({
  messages,
  onSend,
  disabled,
  className,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
  disabled?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
  }

  return (
    <section aria-label="Chat da sessão" className={cn('flex min-h-0 flex-col', className)}>
      <ol ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <li className="m-auto text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</li>
        ) : (
          messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className={cn('text-xs font-medium', message.host ? 'text-primary' : 'text-foreground')}>
                  {message.name}
                </span>
                <time className="font-mono text-[10px] text-muted-foreground" dateTime={new Date(message.at).toISOString()}>
                  {new Date(message.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <p className="text-sm leading-relaxed break-words text-muted-foreground">{message.text}</p>
            </li>
          ))
        )}
      </ol>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <label htmlFor="chat-input" className="sr-only">
          Mensagem
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          disabled={disabled}
          placeholder={disabled ? 'Chat indisponível' : 'Escreva uma mensagem'}
          autoComplete="off"
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-input/30 px-3 text-base outline-none md:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        <Button type="submit" size="icon-lg" disabled={disabled || !draft.trim()} aria-label="Enviar mensagem">
          <SendHorizontal />
        </Button>
      </form>
    </section>
  )
}

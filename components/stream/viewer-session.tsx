'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import type Peer from 'peerjs'
import type { DataConnection, MediaConnection } from 'peerjs'
import {
  Activity,
  Loader2,
  LogOut,
  Maximize,
  MessageSquare,
  Minimize,
  MousePointerClick,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { ChatPanel } from '@/components/stream/chat-panel'
import { PingLayer, useElementSize, type Ping } from '@/components/stream/ping-layer'
import {
  CODE_LENGTH,
  PEER_PREFIX,
  formatCode,
  getContentBox,
  isStreamMessage,
  normalizeCode,
  sanitizeName,
  sanitizeText,
  fetchIceServers,
  type ChatMessage,
  type StreamMessage,
} from '@/lib/stream'
import { cn } from '@/lib/utils'

type Phase = 'form' | 'connecting' | 'waiting' | 'watching' | 'ended'
type Stats = { kbps: number; fps: number; rtt: number | null; width: number; height: number; lost: number }

export function ViewerSession({ initialCode }: { initialCode: string }) {
  const [phase, setPhase] = useState<Phase>('form')
  const [code, setCode] = useState(normalizeCode(initialCode))
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [muted, setMuted] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [pointerMode, setPointerMode] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [pings, setPings] = useState<Ping[]>([])

  const peerRef = useRef<Peer | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const callRef = useRef<MediaConnection | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stageSize = useElementSize(stageRef)

  const cleanup = useCallback(() => {
    callRef.current?.close()
    connRef.current?.close()
    peerRef.current?.destroy()
    callRef.current = null
    connRef.current = null
    peerRef.current = null
    setStream(null)
    setStats(null)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const handleData = useCallback(
    (raw: unknown) => {
      if (!isStreamMessage(raw)) return
      const message = raw as StreamMessage
      if (message.type === 'chat') {
        setMessages((prev) => [...prev.slice(-199), message.message])
      } else if (message.type === 'viewers') {
        setViewerCount(message.count)
      } else if (message.type === 'ended') {
        setPhase('ended')
        cleanup()
      }
    },
    [cleanup],
  )

  async function connect(event: FormEvent) {
    event.preventDefault()
    const target = normalizeCode(code)
    if (target.length !== CODE_LENGTH) {
      setError('O código deve ter 6 caracteres.')
      return
    }
    setError(null)
    setMessages([])
    setPhase('connecting')
    const displayName = sanitizeName(name)
    const [{ default: PeerCtor }, iceServers] = await Promise.all([import('peerjs'), fetchIceServers()])
    const peer = new PeerCtor({ debug: 0, config: { iceServers } })
    peerRef.current = peer
    let receivedStream = false
    let dataOpen = false

    const fail = (message: string) => {
      if (peerRef.current !== peer) return
      clearTimeout(timeout)
      setError(message)
      setPhase('form')
      cleanup()
    }

    const timeout = setTimeout(() => {
      if (receivedStream) return
      fail(
        dataOpen
          ? 'Conectado ao anfitrião, mas o vídeo não chegou. As redes podem estar bloqueando conexões diretas (NAT). Tente outra rede ou configure um servidor TURN.'
          : 'Tempo esgotado ao conectar. Confira o código e se o anfitrião ainda está transmitindo.',
      )
    }, 25000)

    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + target, { reliable: true, metadata: { name: displayName } })
      connRef.current = conn
      conn.on('open', () => {
        dataOpen = true
        setPhase((p) => (p === 'connecting' ? 'waiting' : p))
      })
      conn.on('data', handleData)
      conn.on('close', () => {
        if (connRef.current !== conn) return
        setPhase((p) => (p === 'form' ? p : 'ended'))
        cleanup()
      })
    })

    peer.on('call', (call) => {
      callRef.current?.close()
      callRef.current = call
      call.answer()
      call.on('stream', (remote) => {
        receivedStream = true
        clearTimeout(timeout)
        setStream(remote)
        setPhase('watching')
      })
      const pc = call.peerConnection
      pc?.addEventListener('iceconnectionstatechange', () => {
        if (pc.iceConnectionState === 'failed' && !receivedStream) {
          fail(
            'A conexão direta com o anfitrião falhou (NAT/firewall). Tente outra rede ou configure um servidor TURN.',
          )
        }
      })
    })

    peer.on('disconnected', () => {
      if (peerRef.current === peer && !peer.destroyed) peer.reconnect()
    })

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        fail('Nenhuma transmissão ativa com esse código. Confira se o anfitrião ainda está ao vivo.')
      } else if (err.type === 'network' || err.type === 'socket-error' || err.type === 'server-error') {
        if (!dataOpen) fail('Não foi possível alcançar o servidor de sinalização. Verifique sua conexão.')
      } else if (!receivedStream) {
        fail('Não foi possível conectar. Verifique sua conexão e tente novamente.')
      }
    })
  }

  function leave() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    cleanup()
    setPhase('form')
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {
      video.muted = true
      setMuted(true)
      video.play().catch(() => {})
    })
  }, [stream, phase])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    if (phase !== 'watching') return
    let prev: { bytes: number; time: number } | null = null
    const interval = setInterval(async () => {
      const pc = callRef.current?.peerConnection
      if (!pc) return
      const report = await pc.getStats()
      const next: Stats = { kbps: 0, fps: 0, rtt: null, width: 0, height: 0, lost: 0 }
      report.forEach((s) => {
        if (s.type === 'inbound-rtp' && s.kind === 'video') {
          if (prev) next.kbps = Math.round(((s.bytesReceived - prev.bytes) * 8) / (s.timestamp - prev.time))
          prev = { bytes: s.bytesReceived, time: s.timestamp }
          next.fps = Math.round(s.framesPerSecond ?? 0)
          next.width = s.frameWidth ?? 0
          next.height = s.frameHeight ?? 0
          next.lost = s.packetsLost ?? 0
        }
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated && s.currentRoundTripTime != null) {
          next.rtt = Math.round(s.currentRoundTripTime * 1000)
        }
      })
      setStats(next)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else shellRef.current?.requestFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (phase !== 'watching') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'f') toggleFullscreen()
      else if (key === 'm') setMuted((m) => !m)
      else if (key === 's') setShowStats((s) => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, toggleFullscreen])

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if (!pointerMode || !connRef.current?.open) return
    const rect = event.currentTarget.getBoundingClientRect()
    const box = getContentBox({ width: rect.width, height: rect.height }, videoSize)
    const x = (event.clientX - rect.left - box.left) / box.width
    const y = (event.clientY - rect.top - box.top) / box.height
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    connRef.current.send({ type: 'ping', x, y } satisfies StreamMessage)
    const id = crypto.randomUUID()
    setPings((prev) => [...prev.slice(-4), { id, x, y, name: 'Você' }])
    setTimeout(() => setPings((prev) => prev.filter((p) => p.id !== id)), 1200)
  }

  function sendChat(text: string) {
    const clean = sanitizeText(text)
    if (clean && connRef.current?.open) connRef.current.send({ type: 'chat-send', text: clean } satisfies StreamMessage)
  }

  if (phase === 'watching' || phase === 'waiting') {
    return (
      <div ref={shellRef} className="flex h-dvh flex-col bg-background">
        {!isFullscreen && (
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
            <div className="flex items-center gap-4">
              <Logo />
              <span className="hidden font-mono text-sm text-muted-foreground sm:inline">{formatCode(code)}</span>
              <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:flex">
                <Users className="size-3.5" aria-hidden="true" />
                {viewerCount}
              </span>
            </div>
            {renderToolbar()}
          </header>
        )}
        <div className="flex min-h-0 flex-1">
          <div
            ref={stageRef}
            onClick={handleStageClick}
            className={cn('group relative min-w-0 flex-1 bg-black', pointerMode && 'cursor-crosshair')}
          >
            <video
              ref={videoRef}
              playsInline
              autoPlay
              onLoadedMetadata={(e) =>
                setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
              }
              onResize={(e) => setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
              className="size-full object-contain"
            />
            <PingLayer pings={pings} containerSize={stageSize} videoSize={videoSize} />
            {phase === 'waiting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                <p className="text-sm">Conectado. Aguardando o vídeo do host...</p>
              </div>
            )}
            {showStats && stats && (
              <dl className="pointer-events-none absolute left-3 top-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 rounded-md bg-black/70 px-3 py-2 font-mono text-[11px] text-white/80 backdrop-blur">
                <dt className="text-white/50">Resolução</dt>
                <dd>{stats.width ? `${stats.width}×${stats.height}` : '—'}</dd>
                <dt className="text-white/50">FPS</dt>
                <dd>{stats.fps}</dd>
                <dt className="text-white/50">Bitrate</dt>
                <dd>{stats.kbps >= 1000 ? `${(stats.kbps / 1000).toFixed(1)} Mbps` : `${stats.kbps} kbps`}</dd>
                <dt className="text-white/50">Latência</dt>
                <dd className={cn(stats.rtt != null && stats.rtt > 120 && 'text-amber-400')}>
                  {stats.rtt != null ? `${stats.rtt} ms` : '—'}
                </dd>
                <dt className="text-white/50">Perdidos</dt>
                <dd>{stats.lost}</dd>
              </dl>
            )}
            {isFullscreen && (
              <div className="absolute right-3 top-3 rounded-lg bg-black/70 p-1 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {renderToolbar()}
              </div>
            )}
          </div>
          {chatOpen && !isFullscreen && (
            <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card md:flex">
              <h2 className="border-b border-border px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chat
              </h2>
              <ChatPanel className="flex-1" messages={messages} onSend={sendChat} />
            </aside>
          )}
        </div>
      </div>
    )
  }

  function renderToolbar() {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={pointerMode}
          aria-label="Apontador remoto"
          title="Apontador remoto: clique no vídeo para destacar um ponto"
          onClick={() => setPointerMode((v) => !v)}
          className={cn(pointerMode && 'text-primary')}
        >
          <MousePointerClick />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={showStats}
          aria-label="Estatísticas (S)"
          title="Estatísticas (S)"
          onClick={() => setShowStats((v) => !v)}
          className={cn(showStats && 'text-primary')}
        >
          <Activity />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={muted ? 'Ativar som (M)' : 'Silenciar (M)'}
          title={muted ? 'Ativar som (M)' : 'Silenciar (M)'}
          onClick={() => setMuted((v) => !v)}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        {!isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={chatOpen}
            aria-label="Chat"
            title="Chat"
            onClick={() => setChatOpen((v) => !v)}
            className={cn('hidden md:inline-flex', chatOpen && 'text-primary')}
          >
            <MessageSquare />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
          title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
        <Button variant="destructive" size="sm" onClick={leave} className="ml-1">
          <LogOut />
          Sair
        </Button>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center border-b border-border px-4 md:px-6">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <form onSubmit={connect} className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-balance">
              {phase === 'ended' ? 'A transmissão terminou' : 'Entrar em uma transmissão'}
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              {phase === 'ended'
                ? 'O host encerrou a sessão. Insira outro código para assistir novamente.'
                : 'Digite o código de 6 caracteres que o host compartilhou com você.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm font-medium">
              Código
            </label>
            <input
              id="code"
              value={formatCode(code)}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="ABC-123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              className="h-12 rounded-lg border border-input bg-input/30 px-3 text-center font-mono text-2xl tracking-widest uppercase outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Seu nome <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Convidado"
              autoComplete="nickname"
              className="h-10 rounded-lg border border-input bg-input/30 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-10" disabled={phase === 'connecting' || code.length !== CODE_LENGTH}>
            {phase === 'connecting' ? <Loader2 className="animate-spin" /> : null}
            {phase === 'connecting' ? 'Conectando...' : 'Conectar'}
          </Button>
        </form>
      </div>
    </main>
  )
}

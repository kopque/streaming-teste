'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type Peer from 'peerjs'
import type { DataConnection, MediaConnection } from 'peerjs'
import { Camera, Check, Copy, Link2, MonitorUp, Radio, Square, SwitchCamera, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatPanel } from '@/components/stream/chat-panel'
import { PingLayer, useElementSize, type Ping } from '@/components/stream/ping-layer'
import {
  PEER_PREFIX,
  QUALITY_PRESETS,
  applyEncoding,
  formatCode,
  generateCode,
  isStreamMessage,
  sanitizeName,
  sanitizeText,
  fetchIceServers,
  type ChatMessage,
  type PresetKey,
  type StreamMessage,
} from '@/lib/stream'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'starting' | 'live'
type Source = 'screen' | 'camera'
type Viewer = { id: string; name: string; joinedAt: number }
type Entry = { conn: DataConnection; call?: MediaConnection; name: string; joinedAt: number }

const HOST_NAME = 'Host'

export function HostSession() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [preset, setPreset] = useState<PresetKey>('balanced')
  const [contentHint, setContentHint] = useState<'motion' | 'detail'>('motion')
  const [shareAudio, setShareAudio] = useState(true)
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pings, setPings] = useState<Ping[]>([])
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [source, setSource] = useState<Source>('screen')
  const [canShareScreen, setCanShareScreen] = useState(true)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')

  useEffect(() => {
    const supported = Boolean(navigator.mediaDevices?.getDisplayMedia)
    setCanShareScreen(supported)
    if (!supported) setSource('camera')
  }, [])

  const peerRef = useRef<Peer | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const entriesRef = useRef(new Map<string, Entry>())
  const presetRef = useRef(preset)
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stageSize = useElementSize(stageRef)

  useEffect(() => {
    presetRef.current = preset
  }, [preset])

  const broadcast = useCallback((message: StreamMessage) => {
    for (const { conn } of entriesRef.current.values()) {
      if (conn.open) conn.send(message)
    }
  }, [])

  const syncViewers = useCallback(() => {
    const list = Array.from(entriesRef.current, ([id, entry]) => ({ id, name: entry.name, joinedAt: entry.joinedAt }))
    setViewers(list)
    broadcast({ type: 'viewers', count: list.length })
  }, [broadcast])

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), message])
      broadcast({ type: 'chat', message })
    },
    [broadcast],
  )

  const stop = useCallback(() => {
    broadcast({ type: 'ended' })
    for (const entry of entriesRef.current.values()) {
      entry.call?.close()
      setTimeout(() => entry.conn.close(), 150)
    }
    entriesRef.current.clear()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const peer = peerRef.current
    peerRef.current = null
    setTimeout(() => peer?.destroy(), 200)
    if (videoRef.current) videoRef.current.srcObject = null
    setViewers([])
    setPings([])
    setCode('')
    setStatus('idle')
  }, [broadcast])

  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
  }, [stop])

  useEffect(() => () => stopRef.current(), [])

  const removeEntry = useCallback(
    (id: string) => {
      const entry = entriesRef.current.get(id)
      if (!entry) return
      entry.call?.close()
      entriesRef.current.delete(id)
      syncViewers()
    },
    [syncViewers],
  )

  const handleMessage = useCallback(
    (fromId: string, raw: unknown) => {
      if (!isStreamMessage(raw)) return
      const entry = entriesRef.current.get(fromId)
      if (!entry) return
      if (raw.type === 'chat-send') {
        const text = sanitizeText(raw.text)
        if (!text) return
        addMessage({ id: crypto.randomUUID(), name: entry.name, text, at: Date.now() })
      } else if (raw.type === 'ping') {
        const x = Number(raw.x)
        const y = Number(raw.y)
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return
        const id = crypto.randomUUID()
        setPings((prev) => [...prev.slice(-9), { id, x, y, name: entry.name }])
        setTimeout(() => setPings((prev) => prev.filter((p) => p.id !== id)), 1800)
      }
    },
    [addMessage],
  )

  const handleConnection = useCallback(
    (conn: DataConnection) => {
      conn.on('open', () => {
        const peer = peerRef.current
        const stream = streamRef.current
        if (!peer || !stream) {
          conn.close()
          return
        }
        const call = peer.call(conn.peer, stream)
        const entry: Entry = {
          conn,
          call,
          name: sanitizeName((conn.metadata as { name?: unknown } | undefined)?.name),
          joinedAt: Date.now(),
        }
        entriesRef.current.set(conn.peer, entry)
        const pc = call.peerConnection
        pc?.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'connected') applyEncoding(pc, presetRef.current)
          if (pc.connectionState === 'failed') removeEntry(conn.peer)
        })
        syncViewers()
        conn.send({ type: 'viewers', count: entriesRef.current.size } satisfies StreamMessage)
      })
      conn.on('data', (raw) => handleMessage(conn.peer, raw))
      conn.on('close', () => removeEntry(conn.peer))
      conn.on('error', () => removeEntry(conn.peer))
    },
    [handleMessage, removeEntry, syncViewers],
  )

  const openPeer = useCallback(
    (PeerCtor: typeof Peer, iceServers: RTCIceServer[], attempt: number) => {
      const nextCode = generateCode()
      const peer = new PeerCtor(PEER_PREFIX + nextCode, { debug: 0, config: { iceServers } })
      peerRef.current = peer
      peer.on('open', () => {
        setCode(nextCode)
        setStatus('live')
      })
      peer.on('connection', handleConnection)
      peer.on('disconnected', () => {
        if (peerRef.current === peer && !peer.destroyed) peer.reconnect()
      })
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && attempt < 3) {
          peer.destroy()
          openPeer(PeerCtor, iceServers, attempt + 1)
          return
        }
        if (err.type === 'peer-unavailable' || err.type === 'webrtc') return
        if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          if (peerRef.current === peer && !peer.destroyed) {
            setTimeout(() => peer.disconnected && !peer.destroyed && peer.reconnect(), 1500)
            return
          }
        }
        setError('Falha ao conectar ao servidor de sinalização. Verifique sua conexão e tente novamente.')
        stopRef.current()
      })
    },
    [handleConnection],
  )

  async function start() {
    setError(null)
    if (source === 'screen' && !navigator.mediaDevices?.getDisplayMedia) {
      setError('Este navegador não permite capturar a tela. Use a câmera ou transmita de um computador.')
      return
    }
    if (source === 'camera' && !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador não permite acessar a câmera. Abra o site em HTTPS no Chrome ou Safari.')
      return
    }
    setStatus('starting')
    const p = QUALITY_PRESETS[preset]
    let stream: MediaStream
    try {
      stream =
        source === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: p.width }, height: { ideal: p.height }, frameRate: { ideal: p.fps, max: p.fps } },
              audio: shareAudio,
            })
          : await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facing, width: { ideal: p.width }, height: { ideal: p.height }, frameRate: { ideal: p.fps } },
              audio: shareAudio,
            })
    } catch (err) {
      setStatus('idle')
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'A captura foi cancelada ou a permissão foi negada.'
          : source === 'screen'
            ? 'Não foi possível capturar a tela neste navegador.'
            : 'Não foi possível acessar a câmera.',
      )
      return
    }
    const track = stream.getVideoTracks()[0]
    track.contentHint = contentHint
    track.addEventListener('ended', () => stopRef.current())
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
    const [{ default: PeerCtor }, iceServers] = await Promise.all([import('peerjs'), fetchIceServers()])
    openPeer(PeerCtor, iceServers, 0)
  }

  useEffect(() => {
    if (status !== 'live') return
    const p = QUALITY_PRESETS[preset]
    streamRef.current
      ?.getVideoTracks()[0]
      ?.applyConstraints({ width: { ideal: p.width }, height: { ideal: p.height }, frameRate: { ideal: p.fps, max: p.fps } })
      .catch(() => {})
    for (const entry of entriesRef.current.values()) applyEncoding(entry.call?.peerConnection, preset)
  }, [preset, status])

  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) track.contentHint = contentHint
  }, [contentHint])

  async function flipCamera() {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    const stream = streamRef.current
    if (!stream || source !== 'camera') return
    const p = QUALITY_PRESETS[preset]
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: p.width }, height: { ideal: p.height }, frameRate: { ideal: p.fps } },
      })
      const newTrack = fresh.getVideoTracks()[0]
      newTrack.contentHint = contentHint
      const oldTrack = stream.getVideoTracks()[0]
      for (const entry of entriesRef.current.values()) {
        const sender = entry.call?.peerConnection?.getSenders().find((s) => s.track?.kind === 'video')
        await sender?.replaceTrack(newTrack)
      }
      if (oldTrack) {
        stream.removeTrack(oldTrack)
        oldTrack.stop()
      }
      stream.addTrack(newTrack)
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('Não foi possível trocar de câmera.')
    }
  }

  function kick(id: string) {
    entriesRef.current.get(id)?.conn.close()
    removeEntry(id)
  }

  async function copy(kind: 'code' | 'link') {
    const value = kind === 'code' ? code : `${window.location.origin}/join?code=${code}`
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  const live = status === 'live'

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div
          ref={stageRef}
          className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black"
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            onLoadedMetadata={(e) =>
              setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })
            }
            onResize={(e) => setVideoSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
            className={cn('size-full object-contain', status === 'idle' && 'invisible')}
          />
          {status !== 'idle' && <PingLayer pings={pings} containerSize={stageSize} videoSize={videoSize} />}
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border border-border bg-card">
                <MonitorUp className="size-6 text-primary" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-medium text-balance">Pronto para transmitir</p>
                <p className="max-w-sm text-sm text-muted-foreground text-pretty">
                  {source === 'screen'
                    ? 'Escolha uma tela, janela ou aba. Você recebe um código para compartilhar com quem vai assistir.'
                    : 'Sua câmera será transmitida. Você recebe um código para compartilhar com quem vai assistir.'}
                </p>
              </div>
            </div>
          )}
          {live && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/70 px-2 py-1 font-mono text-xs backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
              AO VIVO
              <span className="text-white/50">·</span>
              <Users className="size-3" aria-hidden="true" />
              {viewers.length}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground">
            {live
              ? 'Transmitindo. Mantenha esta aba aberta.'
              : status === 'starting'
                ? 'Iniciando sessão...'
                : 'Configure a qualidade e inicie a transmissão.'}
          </p>
          {live || status === 'starting' ? (
            <div className="flex w-full gap-2 sm:w-auto">
              {source === 'camera' && live && (
                <Button variant="outline" size="lg" onClick={flipCamera} aria-label="Trocar câmera">
                  <SwitchCamera />
                  <span className="hidden sm:inline">Trocar câmera</span>
                </Button>
              )}
              <Button variant="destructive" size="lg" onClick={stop} className="flex-1 sm:flex-none">
                <Square className="fill-current" />
                Encerrar transmissão
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={start} className="w-full sm:w-auto">
              <Radio />
              Iniciar transmissão
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="session-code">
          <h2 id="session-code" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Código da sessão
          </h2>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-widest">{live ? formatCode(code) : '———-———'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={!live} onClick={() => copy('code')}>
              {copied === 'code' ? <Check /> : <Copy />}
              {copied === 'code' ? 'Copiado' : 'Copiar código'}
            </Button>
            <Button variant="outline" disabled={!live} onClick={() => copy('link')}>
              {copied === 'link' ? <Check /> : <Link2 />}
              {copied === 'link' ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="source-title">
          <h2 id="source-title" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Fonte
          </h2>
          <div role="radiogroup" aria-labelledby="source-title" className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                ['screen', 'Tela', MonitorUp],
                ['camera', 'Câmera', Camera],
              ] as const
            ).map(([value, label, Icon]) => {
              const disabled = status !== 'idle' || (value === 'screen' && !canShareScreen)
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={source === value}
                  disabled={disabled}
                  onClick={() => setSource(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                    source === value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </div>
          {!canShareScreen && (
            <p className="mt-3 text-xs text-muted-foreground text-pretty">
              Navegadores de celular não permitem capturar a tela. Transmita pela câmera ou use um computador para
              compartilhar a tela — assistir funciona normalmente no celular.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="quality-title">
          <h2 id="quality-title" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Qualidade
          </h2>
          <div role="radiogroup" aria-labelledby="quality-title" className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(QUALITY_PRESETS) as PresetKey[]).map((key) => {
              const item = QUALITY_PRESETS[key]
              const selected = preset === key
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreset(key)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.description}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.bitrate / 1000} Mbps</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span id="hint-label" className="text-sm">
              Otimizar para
            </span>
            <div role="radiogroup" aria-labelledby="hint-label" className="flex rounded-lg border border-border p-0.5">
              {(
                [
                  ['motion', 'Jogos'],
                  ['detail', 'Texto'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={contentHint === value}
                  onClick={() => setContentHint(value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    contentHint === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            {source === 'screen' ? 'Compartilhar áudio do sistema' : 'Transmitir microfone'}
            <input
              type="checkbox"
              checked={shareAudio}
              disabled={status !== 'idle'}
              onChange={(e) => setShareAudio(e.target.checked)}
              className="size-4 accent-[var(--primary)] disabled:opacity-50"
            />
          </label>
        </section>

        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="viewers-title">
          <h2 id="viewers-title" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Espectadores ({viewers.length})
          </h2>
          {viewers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ninguém conectado ainda.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {viewers.map((viewer) => (
                <li key={viewer.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <span className="flex items-center gap-2 truncate text-sm">
                    <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    {viewer.name}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => kick(viewer.id)} aria-label={`Remover ${viewer.name}`}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex h-80 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Chat
          </h2>
          <ChatPanel
            className="flex-1"
            messages={messages}
            disabled={!live}
            onSend={(text) => addMessage({ id: crypto.randomUUID(), name: HOST_NAME, text, at: Date.now(), host: true })}
          />
        </div>
      </aside>
    </div>
  )
}

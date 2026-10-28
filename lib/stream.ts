export const PEER_PREFIX = 'relay-v0-screen-'

export type ChatMessage = {
  id: string
  name: string
  text: string
  at: number
  host?: boolean
}

export type StreamMessage =
  | { type: 'chat'; message: ChatMessage }
  | { type: 'chat-send'; text: string }
  | { type: 'ping'; x: number; y: number }
  | { type: 'viewers'; count: number }
  | { type: 'ended' }

export type PresetKey = 'eco' | 'balanced' | 'smooth' | 'ultra'

export const QUALITY_PRESETS: Record<
  PresetKey,
  { label: string; description: string; width: number; height: number; fps: number; bitrate: number }
> = {
  eco: { label: 'Econômico', description: '720p · 30 FPS', width: 1280, height: 720, fps: 30, bitrate: 2500 },
  balanced: { label: 'Equilibrado', description: '1080p · 30 FPS', width: 1920, height: 1080, fps: 30, bitrate: 6000 },
  smooth: { label: 'Fluido', description: '1080p · 60 FPS', width: 1920, height: 1080, fps: 60, bitrate: 10000 },
  ultra: { label: 'Ultra', description: '1440p · 60 FPS', width: 2560, height: 1440, fps: 60, bitrate: 16000 },
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export function generateCode() {
  const values = crypto.getRandomValues(new Uint32Array(CODE_LENGTH))
  return Array.from(values, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

export function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)
}

export function formatCode(code: string) {
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code
}

export function sanitizeName(value: unknown, fallback = 'Convidado') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, 24)
  return trimmed || fallback
}

export function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 500)
}

export function isStreamMessage(value: unknown): value is StreamMessage {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

export async function applyEncoding(pc: RTCPeerConnection | undefined, preset: PresetKey) {
  if (!pc) return
  const { bitrate, fps } = QUALITY_PRESETS[preset]
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
    params.encodings[0].maxBitrate = bitrate * 1000
    params.encodings[0].maxFramerate = fps
    await sender.setParameters(params).catch(() => {})
  }
}

export function getContentBox(
  container: { width: number; height: number },
  video: { width: number; height: number },
) {
  if (!video.width || !video.height || !container.width || !container.height) {
    return { left: 0, top: 0, width: container.width, height: container.height }
  }
  const scale = Math.min(container.width / video.width, container.height / video.height)
  const width = video.width * scale
  const height = video.height * scale
  return { left: (container.width - width) / 2, top: (container.height - height) / 2, width, height }
}

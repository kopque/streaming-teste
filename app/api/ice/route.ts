import { NextResponse } from 'next/server'

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

async function cloudflareIce(): Promise<RTCIceServer[] | null> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !token) return null
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: 86400 }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as { iceServers?: RTCIceServer | RTCIceServer[] }
  if (!data.iceServers) return null
  return Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers]
}

async function meteredIce(): Promise<RTCIceServer[] | null> {
  const apiKey = process.env.METERED_TURN_API_KEY
  const app = process.env.METERED_TURN_APP
  if (!apiKey || !app) return null
  const res = await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as RTCIceServer[]
  return Array.isArray(data) ? data : null
}

export async function GET() {
  let turn: RTCIceServer[] | null = null
  try {
    turn = (await cloudflareIce()) ?? (await meteredIce())
  } catch {
    turn = null
  }
  return NextResponse.json(
    { iceServers: [...FALLBACK_ICE, ...(turn ?? [])], relay: Boolean(turn) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

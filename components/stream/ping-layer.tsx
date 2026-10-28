'use client'

import { useEffect, useState, type RefObject } from 'react'
import { getContentBox } from '@/lib/stream'

export type Ping = { id: string; x: number; y: number; name: string }

export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

export function PingLayer({
  pings,
  containerSize,
  videoSize,
}: {
  pings: Ping[]
  containerSize: { width: number; height: number }
  videoSize: { width: number; height: number }
}) {
  const box = getContentBox(containerSize, videoSize)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      {pings.map((ping) => (
        <div
          key={ping.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${ping.x * 100}%`, top: `${ping.y * 100}%` }}
        >
          <span className="absolute inset-0 -m-4 size-8 animate-ping rounded-full bg-primary/50" />
          <span className="relative block size-3 rounded-full border-2 border-background bg-primary" />
          <span className="absolute left-3 top-3 whitespace-nowrap rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary-foreground">
            {ping.name}
          </span>
        </div>
      ))}
    </div>
  )
}

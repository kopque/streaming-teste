import Link from 'next/link'
import { MonitorUp } from 'lucide-react'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <MonitorUp className="size-4" aria-hidden="true" />
      </span>
      <span>Relay</span>
    </Link>
  )
}

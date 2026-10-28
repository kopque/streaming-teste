import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { HostSession } from '@/components/stream/host-session'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Transmitir tela · Relay',
  description: 'Compartilhe sua tela em tempo real com baixa latência direto do navegador.',
}

export default function HostPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
        <Logo />
        <Link href="/join" className={buttonVariants({ variant: 'ghost' })}>
          Entrar com código
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Transmitir minha tela</h1>
          <p className="text-sm text-muted-foreground">
            Conexão ponto a ponto via WebRTC. O vídeo vai direto para os espectadores, sem passar por servidores.
          </p>
        </div>
        <HostSession />
      </div>
    </main>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Radio } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const stats = [
  { label: 'Latência', value: '~40 ms' },
  { label: 'Taxa', value: '60 FPS' },
  { label: 'Resolução', value: '1440p' },
]

export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 pt-16 pb-20 md:px-6 md:pt-24">
      <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          WebRTC ponto a ponto · sem instalação
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Sua tela, em qualquer lugar. Em tempo real.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Transmita jogos, apps ou o desktop inteiro com baixa latência direto do navegador. Gere um código, envie para
          quem vai assistir e pronto.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/host" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5 text-base')}>
            <Radio />
            Começar a transmitir
          </Link>
          <Link href="/join" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-11 px-5 text-base')}>
            Tenho um código
            <ArrowRight />
          </Link>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
            AO VIVO · K7P-4QX
          </div>
          <div className="hidden gap-4 sm:flex">
            {stats.map((stat) => (
              <span key={stat.label} className="font-mono text-xs text-muted-foreground">
                {stat.label} <span className="text-foreground">{stat.value}</span>
              </span>
            ))}
          </div>
        </div>
        <Image
          src="/images/hero-setup.png"
          alt="Notebook exibindo um jogo transmitido em tempo real a partir de um PC desktop"
          width={1600}
          height={900}
          priority
          className="aspect-video w-full rounded-xl object-cover"
        />
      </div>
    </section>
  )
}

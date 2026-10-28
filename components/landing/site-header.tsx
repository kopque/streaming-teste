import Link from 'next/link'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">
            Como funciona
          </a>
          <a href="#recursos" className="hover:text-foreground">
            Recursos
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/join" className={buttonVariants({ variant: 'ghost' })}>
            Entrar
          </Link>
          <Link href="/host" className={buttonVariants()}>
            Transmitir
          </Link>
        </div>
      </div>
    </header>
  )
}

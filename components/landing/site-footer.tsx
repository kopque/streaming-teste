import Link from 'next/link'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-card p-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Pronto para compartilhar sua tela?</h2>
            <p className="text-muted-foreground">Gratuito, sem cadastro e sem instalar nada.</p>
          </div>
          <Link href="/host" className={buttonVariants({ size: 'lg' })}>
            Começar agora
          </Link>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <Logo />
          <p>Funciona melhor no Chrome, Edge e Firefox para desktop.</p>
        </div>
      </div>
    </footer>
  )
}

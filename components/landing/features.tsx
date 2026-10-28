import { Activity, Gauge, Lock, MessageSquare, MousePointerClick, Volume2 } from 'lucide-react'

const features = [
  {
    icon: Gauge,
    title: 'Até 1440p a 60 FPS',
    body: 'Presets de qualidade com controle de bitrate ajustável durante a transmissão.',
  },
  {
    icon: Lock,
    title: 'Ponto a ponto',
    body: 'O vídeo é criptografado e trafega direto entre os dispositivos, sem servidor intermediário.',
  },
  {
    icon: Volume2,
    title: 'Áudio do sistema',
    body: 'Compartilhe o som do jogo ou da aba junto com a imagem.',
  },
  {
    icon: Activity,
    title: 'Estatísticas ao vivo',
    body: 'Latência, FPS, bitrate e pacotes perdidos sempre visíveis para o espectador.',
  },
  {
    icon: MousePointerClick,
    title: 'Apontador remoto',
    body: 'O espectador clica no vídeo e um marcador aparece na tela do host.',
  },
  {
    icon: MessageSquare,
    title: 'Chat integrado',
    body: 'Converse com todos os espectadores sem sair da sessão.',
  },
]

export function Features() {
  return (
    <section id="recursos" className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 md:px-6">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
          Feito para jogar, apresentar e dar suporte.
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-3 bg-background p-6">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
          Observação: por segurança, navegadores não permitem controlar o teclado e o mouse de outro computador. Para
          controle total da máquina remota é necessário um aplicativo nativo.
        </p>
      </div>
    </section>
  )
}

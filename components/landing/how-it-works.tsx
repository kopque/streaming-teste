const steps = [
  {
    title: 'Inicie a transmissão',
    body: 'Escolha a qualidade e selecione uma tela, janela ou aba para compartilhar.',
  },
  {
    title: 'Compartilhe o código',
    body: 'Você recebe um código de 6 caracteres e um link direto para enviar a quem vai assistir.',
  },
  {
    title: 'Assista de qualquer lugar',
    body: 'O espectador abre o link em qualquer navegador e o vídeo chega direto, ponto a ponto.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 md:px-6">
        <div className="flex max-w-xl flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">Três passos. Nenhum download.</h2>
          <p className="text-muted-foreground text-pretty">
            Tudo roda no navegador usando WebRTC, a mesma tecnologia das videochamadas modernas.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
              <span className="font-mono text-sm text-primary">0{index + 1}</span>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

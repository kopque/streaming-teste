import type { Metadata } from 'next'
import { ViewerSession } from '@/components/stream/viewer-session'

export const metadata: Metadata = {
  title: 'Assistir transmissão · Relay',
  description: 'Entre em uma transmissão de tela com um código de 6 caracteres.',
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams
  return <ViewerSession initialCode={typeof code === 'string' ? code : ''} />
}

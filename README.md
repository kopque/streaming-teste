# Streaming P2P

O projeto usa PeerJS para sinalização e WebRTC para transportar a tela ou câmera diretamente entre os navegadores.

## Configuração local

```bash
pnpm install
pnpm dev
```

Para compartilhar câmera ou tela, acesse o site em HTTPS quando estiver fora de `localhost`.

## TURN é necessário entre redes diferentes

STUN ajuda o navegador a descobrir seu endereço público, mas não consegue atravessar todos os NATs e firewalls. Para conexões entre redes móveis, Wi-Fi diferentes, CGNAT ou redes corporativas, configure um servidor TURN.

Copie `.env.example` para `.env.local` e preencha:

```env
TURN_URLS=turn:turn.seu-dominio.com:3478,turns:turn.seu-dominio.com:5349
TURN_USERNAME=usuario
TURN_CREDENTIAL=senha
```

Também há suporte a credenciais temporárias de Cloudflare TURN ou Metered usando as variáveis indicadas em `.env.example`. Nunca coloque essas credenciais diretamente em componentes React ou no navegador.

Depois de configurar as variáveis, reinicie o servidor ou faça um novo deploy. A rota `/api/ice` retornará os servidores STUN e TURN para os dois peers.

## Diagnóstico

No navegador, abra DevTools e verifique:

- `iceConnectionState: connected` ou `completed`: conexão estabelecida;
- `iceConnectionState: failed`: problema de NAT, firewall ou TURN;
- `connectionState: connected` no host e no viewer: mídia conectada.

O endereço usado para o viewer deve ser o domínio público do deploy, não `localhost` nem `127.0.0.1`.

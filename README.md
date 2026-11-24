# WhatsApx

Cliente WhatsApp multi-conta pra desktop (Windows + Linux), feito em Electron — o WhatsApp Web
rodando num Chromium completo e atual (sem os engasgos de PWA do QtWebEngine).

## Funções

- **Multi-conta** — botão `+` cria contas ilimitadas, cada uma com sessão/login isolado e a
  **logo do app tingida na cor da conta** (glow na ativa). Clique direito no avatar:
  renomear, mudar cor, recarregar, abrir em janela separada, remover.
- **Respostas rápidas** — digite `/preço` + espaço no chat e o texto completo entra no lugar.
  Gerencie no botão ⚡ da barra (ou bandeja → Respostas rápidas). Vale pra todas as contas.
- **Reação no duplo clique** — dois cliques em cima da mensagem reagem com o emoji escolhido no botão
  da barra lateral (padrão 👍; dá pra desligar). Dois cliques ao lado da mensagem seguem abrindo a resposta.
- **Janela separada (multi-monitor)** — clique direito → "Abrir em janela separada":
  a conta vira uma janela própria (recepção num monitor, comercial no outro). Fechar traz de volta.
- **Bandeja (tray)** — fechar a janela esconde pra bandeja; badge com total de não lidas
  (bolinha no ícone da barra no Windows, contador no dock/painel no Linux).
- **Temas** — Sistema / Claro / Escuro (o WhatsApp Web acompanha).
- **Não perturbe** — silencia todas as notificações num clique (menu da bandeja).
- **Privacidade** — opção de desfocar as conversas quando a janela perde o foco.
- **Atalhos** — `Ctrl+1..9` troca de conta · `Ctrl+N` nova conta · `Ctrl+R` recarrega ·
  `Ctrl+=`/`Ctrl+-`/`Ctrl+0` zoom (por conta, salvo) · `Ctrl+Esc` esconde (boss key) ·
  `Ctrl+Shift+W` mostra/esconde de qualquer lugar (atalho global).
- **Aviso geral** — na janela 🍓 Berry, aba 📣: manda uma imagem com saudação variada pros grupos vinculados aos
  clientes, um por vez, com pausa aleatória entre envios (padrão 10–20 s) e pausa maior a cada lote.
  Pode pausar/cancelar; se o app fechar no meio, rodar de novo pula quem já recebeu.
- **Bot "berry"** — janela 🍓 Berry, aba 🤖: responde perguntas de produção no WhatsApp (relatório otimizado/completo
  da Serraria 360, paradas, status das máquinas, chapas serradas e blocos sem serrar por cliente). Só responde a grupos e
  números liberados; roda local, sem IA externa, e só LÊ o sistema. Relatório semanal opcional num grupo escolhido.
  Os números vêm do mesmo código da tela Serraria 360 (`lib/relatorio360.bundle.js`); depois de mudar
  `src/relatorios/serraria360/dados.ts` no Sistema Unificado, regerar com `npm run build:relatorio`.
- **Sempre no topo**, **iniciar com o sistema**, corretor pt-BR, link externo abre no navegador.

## Rodar em desenvolvimento

```bash
npm install
npm start
```

## Gerar instaladores

```bash
npm run build:win     # Windows: instalador NSIS + .exe portátil (rodar no Windows)
npm run build:linux   # Linux: AppImage + .deb (rodar num Linux ou WSL)
```

Saída em `dist/`.

> AppImage/.deb precisam ser buildados em Linux (ou WSL). No Windows sai o .exe normalmente.

## Publicar versão nova (atualização automática)

O ZapBerry instalado (Setup) confere as Releases deste repositório 30 s depois de abrir e a cada 4 h.
Achou versão maior: baixa sozinho e pergunta "Reiniciar agora?". "Depois" instala ao fechar pelo "Sair".
Nunca reinicia no meio de um Aviso geral. A versão portátil não se atualiza.

1. Subir `"version"` no `package.json` (ex.: 1.6.0 → 1.6.1).
2. No PowerShell, com um token do GitHub (fine-grained, só este repositório, permissão **Contents: Read and write**):

```powershell
$env:GH_TOKEN = "cole_o_token_aqui"
npm run release
```

Gera o instalador e cria a Release com `ZapBerry-Setup-x.y.z.exe`, `.blockmap` e `latest.yml`.
O token fica só naquela janela do PowerShell — nunca no código nem no repositório.

## Notas

- Chamadas de voz/vídeo não funcionam (limite do WhatsApp Web) — use o celular ou o app oficial.
- Wrapper não-oficial: tecnicamente fora dos termos do WhatsApp (risco baixo, igual ZapZap/Ferdium).
- Config e sessões ficam em `%APPDATA%/whatsapx` (Windows) ou `~/.config/whatsapx` (Linux).

# Porteiro

TikTok e Instagram só abrem passando por aqui. Os Atalhos do iPhone avisam o webapp toda vez que um dos apps abre ou fecha. Sem passe válido, o atalho joga o Porteiro por cima: 10 segundos de espera, você diz pra quê vai entrar e por quanto tempo, e só aí recebe o passe.

Stack: Next.js 16 (App Router, PWA), Supabase (Postgres), Vercel, Atalhos do iOS.

## Como funciona

```
abre o TikTok ─▶ automação "Ao abrir" ─▶ GET /api/gate?app=tiktok
                                             │
                    "liberado" ◀─ tem passe ─┤
                    (não faz nada, abre)     │
                                             └─ sem passe ─▶ "barrado"
                                                              │
                                     atalho abre /entrar/tiktok no Safari
                                     espera 10s ─▶ motivo + tempo ─▶ passe
                                     toque em "Abrir o TikTok" ─▶ automação roda de novo ─▶ "liberado"

fecha o TikTok ─▶ automação "Ao fechar" ─▶ GET /api/event?app=tiktok
```

Abertura liberada + próximo fechamento = uma sessão. É daí que saem os minutos do dia, a semana, os horários de pico, a sequência dentro da meta e o "da última vez você pediu 10 e ficou 34".

## 1. Supabase

1. Crie um projeto em supabase.com (o plano free sobra), na região **South America (São Paulo)**. O gate roda a cada vez que você abre o app; quanto mais perto, menos o TikTok "pisca".
2. SQL Editor: cole e rode `supabase/migrations/0001_init.sql`. As tabelas têm prefixo `porteiro_`, então dá pra rodar num projeto que já tem outras coisas.
3. Copie a **Project URL** (Project Settings > Data API) e uma **Secret key** `sb_secret_...` (Project Settings > API Keys). A chave publishable não serve: as tabelas têm RLS sem policy e sem grant pros papéis públicos, então só a chave secreta, no servidor, enxerga os dados.

## 2. Rodar local

```bash
cp .env.example .env.local   # preencha os 3 valores
npm install
npm run dev
```

Gere o `APP_SECRET` com `openssl rand -hex 24`. Ele é a senha do webapp e a chave que os Atalhos mandam.

Sem Supabase ainda? `PORTEIRO_MOCK=1 APP_SECRET=qualquercoisacom16+ npm run dev` sobe com um banco em memória e uma semana de dados inventados, só pra ver as telas. No modo mock o Next pode carregar o banco em instâncias separadas (página e rota de API não enxergam os mesmos dados); com o Supabase de verdade isso não acontece.

## 3. Deploy na Vercel

1. Suba o repo no GitHub e importe na Vercel.
2. Environment Variables: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `APP_SECRET`.
3. A região das funções já vem fixada em São Paulo (`gru1`) no `vercel.json`, pelo mesmo motivo do Supabase.
4. Deploy. Depois abra `https://SEU-APP.vercel.app/setup`: a página monta as URLs certinhas pra copiar nos atalhos.

## 4. Atalhos do iPhone

Atalhos > Automação > **+** > **App**. São duas automações por app (4 no total).

### "Quando o TikTok for aberto"

- Escolha o app, marque **É aberto**, **Executar imediatamente** e desligue **Notificar ao executar**.
- Ações:
  1. **Obter conteúdo de URL**
     - URL: `https://SEU-APP.vercel.app/api/gate?app=tiktok`
     - Mostrar mais > Método: GET > Cabeçalhos: `x-porteiro-key` = seu `APP_SECRET`
  2. **Se** `Conteúdo de URL` **não contém** `liberado`
  3. dentro do Se: **Abrir URLs** `https://SEU-APP.vercel.app/entrar/tiktok`

### "Quando o TikTok for fechado"

- Mesmo esquema, marcando **É fechado**.
- Ação: **Obter conteúdo de URL** `https://SEU-APP.vercel.app/api/event?app=tiktok`, mesmo cabeçalho.

Repita trocando `tiktok` por `instagram`.

### Primeira vez

- Os atalhos abrem o Porteiro no **navegador padrão** do iPhone (Safari, Chrome, o que estiver configurado), e ele guarda o login separado do app salvo na tela de início. Entra uma vez nesse navegador (o cookie dura um ano).
- Pra ter o painel como app: Safari > Compartilhar > **Adicionar à Tela de Início**, e entra lá também.
- Tire TikTok e Instagram da tela de início (segurar > Remover da Tela de Início) ou oculte com Face ID (iOS 18+). Abrir por busca, notificação ou Biblioteca de Apps continua passando pela porta.

### Testa no aparelho antes de confiar nos números

1. Abre o TikTok sem passe: o Porteiro tem que aparecer por cima.
2. Libera 5 min e toca em "Abrir o TikTok": tem que abrir o app, não o site.
3. Fecha o TikTok normalmente: no painel, o tempo tem que aparecer.
4. Abre o TikTok e **bloqueia a tela** dentro dele. Desbloqueia, sai do app e confere se o tempo bateu. Se o iOS não disparar "ao fechar" no bloqueio, a sessão fica sem fechamento e o Porteiro estima até a próxima abertura (máximo 180 min).
5. Abre o TikTok tocando numa **notificação**: o "ao abrir" tem que rodar também.

## Ajustes

Tudo em `lib/config.ts`:

| O quê | Padrão |
|---|---|
| Meta diária (soma dos apps) | 45 min |
| Opções de tempo do passe | 5, 10, 15, 30 min |
| Espera antes de liberar | 10 s |
| Sessão sem fechamento descartada após | 180 min |
| Apps e links de abertura | TikTok, Instagram, X (Twitter) |

Pra adicionar outro app: inclua o id no tipo `AppId` e em `APPS` (`lib/config.ts`) e crie as duas automações dele. O resto (painel, setup, gate) lê dessa lista, e o banco aceita qualquer id.

## Limitações (sabidas)

- **O passe controla a entrada, não a saída.** Quando o tempo acaba ninguém te expulsa. O Porteiro só registra e cobra na próxima entrada. Expulsar de verdade exige a Screen Time API (app nativo, conta de dev paga).
- **O app pode piscar** antes do Porteiro aparecer: a automação leva menos de 1 s.
- **Sem internet, a porta abre.** Se o `Obter conteúdo de URL` falhar (sem rede, timeout), o Atalhos interrompe a automação com erro e as ações seguintes não rodam, então o app abre normal e nada é registrado. O Atalhos não tem tratamento de erro pra mudar isso.
- **Cada barrada abre uma aba nova** no navegador. Elas se acumulam; de vez em quando, fecha as abas.
- **O bypass é desligar a automação.** Funciona contra o automático, não contra força de vontade de burlar.
- Se o universal link abrir o site em vez do app, usa o link de baixo ("Tenta por aqui"), que usa o esquema do app; o Safari pode pedir confirmação. No app da tela de início a ordem já vem invertida.
- **Tentativas** no mapa de horários contam cada vez que a mão foi no app. Uma entrada pela porta (barrada e liberada em seguida) conta uma vez só.

## Estrutura

```
app/
  page.tsx                 painel: hoje, apps, semana, horários
  entrar/[app]/            porta: espera, motivo, tempo, passe
  setup/                   URLs prontas pros atalhos
  login/                   senha única (APP_SECRET)
  api/gate/route.ts        Atalhos: "liberado" | "barrado"
  api/event/route.ts       Atalhos: fechou o app
lib/
  config.ts                apps, meta, tempos
  stats.ts                 sessões e números do painel
  auth.ts                  cookie + header, comparação em tempo constante
  db.ts, mock-db.ts        Supabase (ou memória em dev)
  format.ts                datas e horas no fuso de SP
proxy.ts                   exige login em tudo, menos /login e rotas dos Atalhos
supabase/migrations/       schema
```

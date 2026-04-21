# 🥋 Z NIM NIE ROBIĘ

<p align="center">
  <img src="Images/LOGO_PL.png" alt="Z NIM NIE ROBIĘ — logo" width="260" />
</p>

<p align="center">
  <b>Aplicativo inteligente de treino para conduzir sparring, task drills e drills técnicos de BJJ.</b><br/>
  Formação automática de pares · Cronômetros grandes · Rotação em trios · Visível à distância
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vers%C3%A3o-2.0.2%20Beta-orange" alt="Versão" />
  <img src="https://img.shields.io/badge/plataforma-Android%20%7C%20iOS%20%7C%20Web-blue" alt="Plataforma" />
  <img src="https://img.shields.io/badge/framework-Expo%20%2B%20React%20Native-blueviolet" alt="Framework" />
  <img src="https://img.shields.io/badge/linguagem-TypeScript-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/i18n-PL%20%7C%20EN%20%7C%20PT-orange" alt="Idiomas" />
</p>

<p align="center">
  <a href="https://znimnierobie.pl"><b>▶ Experimente a versão web</b></a>
</p>

<p align="center">
  <a href="README.md">🇵🇱 Polski</a> · <a href="README.en.md">🇬🇧 English</a> · <b>🇧🇷 Português (BR)</b>
</p>

---

## Sumário

- [Novidades na v2.0.2 Beta](#novidades-na-v202-beta)
- [Sobre o app](#sobre-o-app)
- [Capturas de tela](#capturas-de-tela)
- [Modos de treino](#modos-de-treino)
- [Motor de formação de pares](#motor-de-formação-de-pares)
- [Funcionalidades principais](#funcionalidades-principais)
- [Stack tecnológico](#stack-tecnológico)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Executando](#executando)
- [Versão web](#versão-web)
- [Privacidade](#privacidade)
- [Licença](#licença)

---

## Novidades na v2.0.2 Beta

### 🔴 Correção crítica (v2.0.2)

- **A tela não desliga mais durante o cronômetro** — `useKeepAwake` movido para o root layout + chamada explícita de `activateKeepAwakeAsync`. O tablet montado na parede não apaga durante sparring nem drills.

### 🟢 Destaques do ciclo 2.0.x Beta

- **Tela PREP unificada** — fim das colunas separadas KID / ADULT / DESCANSO. Todos os pares em um único grid denso com **cores por categoria** e **legenda na barra superior**:
  - 🟦 **KID GI** (azul)
  - 🩵 **KID NO-GI** (ciano)
  - 🟧 **ADULT GI** (laranja)
  - 🟥 **ADULT NO-GI** (vermelho)
  - 🟪 **MISTO** (gradiente — KID + ADULT)
- **Regra GI para o par** — um par conta como GI apenas se **ambos** estiverem de GI; basta um NO-GI para o par inteiro virar NO-GI
- **DESCANSO inline ao lado de PREP** — quem descansa aparece ao lado do cabeçalho da fase em vez de uma coluna separada (mais espaço para os blocos de pares)
- **Saída de lutadores em dois modos** — no modal "QUEM SAIU?" cada pessoa tem dois botões:
  - **FORA** — removido do resto do treino
  - **DESCANSA 1 ROUND** — volta automaticamente no próximo round

### 🟢 Funcionalidades base da 2.0.0 Beta

- **Seletor de idioma na inicialização** — PL / EN / PT (BR) visível desde a primeira execução
- **Três modos de treino** — SPARRING · TASK DRILLS (TRIOS / DUPLAS) · **DRILLS** (modo completo com pares fixos e troca de papéis A/B a cada round)
- **Campo gênero (M / F)** no cartão do lutador e **Lutas por gênero** nas opções de sparring (DESL / PRIORIDADE / SEMPRE)
- **Slider de prioridade** — HABILIDADE ↔ PESO (4 snaps)
- **Divisão por peso** — opcionalmente divide o tatame em dois grupos de peso
- **Ordem das lutas** — SEMELHANTES / DIFERENTES / ALEATÓRIO
- **Sem pausa (VIP)** em layout limpo de pílulas com nomes
- **Tela final "OBRIGADO — BOM TRABALHO!"** com retorno ao menu
- **Painel VERSÃO V2** — contato, link para GitHub e loja, breve descrição
- **Cards de trios e duplas otimizados** para tablets de 10,5" — sem rolagem nas resoluções típicas

---

## Sobre o app

**Z NIM NIE ROBIĘ** ("Não rolo com ele") é uma ferramenta para professores de BJJ e grappling que conduzem aulas com um tablet montado na parede ou ao lado do tatame. Em vez de papel, cronômetro e organização manual de pares — um único dispositivo faz tudo:

- **forma pares automaticamente** com base em peso, nível, kimono (GI / NO-GI) e gênero,
- **controla os timers** com sinais sonoros para preparação, trabalho e descanso,
- **roda trios e duplas** nos task drills com divisão clara entre quem luta e quem descansa,
- **conduz drills** com pares formados uma vez por aula e troca de papéis A/B a cada round,
- **mostra tudo de forma legível** — fontes grandes, alto contraste, visível a vários metros,
- **fala polonês, inglês e português brasileiro**.

O app funciona offline, não exige conta nem login. Dados dos lutadores são salvos localmente no dispositivo.

---

## Capturas de tela

As capturas de tela estão disponíveis no [README em polonês](README.md#zrzuty-ekranu).

---

## Modos de treino

### ⚔️ Sparring

Modo clássico de sparring. Ciclo de cada round:

1. **Preparação** — exibição dos pares, tempo para se posicionar
2. **Trabalho** — cronômetro grande, luta
3. **Descanso** — recuperação; o sistema gera e mostra novos pares para o próximo round

O sistema lembra o histórico de lutas e evita repetir os mesmos pares. Opções extras:

- **Prioridade de formação** — slider: HABILIDADE ↔ PESO (quatro snaps)
- **Ordem das lutas** — SEMELHANTES / DIFERENTES / ALEATÓRIO
- **Divisão por peso** — divide o tatame em dois grupos de peso alternados
- **Lutas por gênero** — DESL / PRIORIDADE / SEMPRE

### 🔄 Task drills em trios

Grupos de três pessoas, seis etapas por round — rotação completa. Em cada etapa dois lutam, o terceiro descansa ou auxilia:

| Etapa | [A] EMBAIXO | [B] EM CIMA | [C] DESCANSO |
|:-----:|:-----------:|:-----------:|:------------:|
| 1     | Pessoa 1    | Pessoa 2    | Pessoa 3     |
| 2     | Pessoa 1    | Pessoa 3    | Pessoa 2     |
| 3     | Pessoa 2    | Pessoa 1    | Pessoa 3     |
| 4     | Pessoa 2    | Pessoa 3    | Pessoa 1     |
| 5     | Pessoa 3    | Pessoa 1    | Pessoa 2     |
| 6     | Pessoa 3    | Pessoa 2    | Pessoa 1     |

Após 6 etapas todos lutaram com todos das duas posições. Tempo de etapa = tempo do round ÷ 6.

### 👥 Task drills em duplas

Pares simples A vs B — duas etapas por round. Após a primeira etapa os papéis se invertem (quem estava embaixo vai para cima). Tempo de etapa = tempo do round ÷ 2.

### 🥋 Drills

Pares formados **uma vez por aula** — mesmo parceiro até o fim. Os papéis A/B trocam a cada round. Ideal para repetir técnica sem resetar a confiança entre parceiros a cada poucos minutos.

---

## Motor de formação de pares

O matchmaker **não sorteia** — escolhe os pares por algoritmo, segundo prioridades:

| Prioridade | Critério |
|:----------:|----------|
| 1 | **Evitar repetições** — pares novos têm preferência; o sistema lembra o histórico |
| 2 | **Kimono** — GI luta com GI, NO-GI com NO-GI (quando a opção está desligada, ignora) |
| 3 | **Gênero** — opcionalmente mulheres lutam primeiro entre si (PRIORIDADE) ou só entre si (SEMPRE) |
| 4 | **Nível de habilidade** — níveis próximos (INI / INT / AVAN / PRO) |
| 5 | **Peso** — massa corporal próxima |
| 6 | **Rotação de descanso** — distribuição justa de quem descansa (com nº ímpar) |
| 7 | **Pares mistos KID + ADULT** — apenas quando o tamanho do grupo exige |

O slider **PRIORIDADE DE FORMAÇÃO** permite balancear suavemente habilidade vs peso (4 snaps: 0 / 33 / 67 / 100). Quando matematicamente é impossível evitar uma repetição, o sistema escolhe o par que não luta há mais tempo.

---

## Funcionalidades principais

- **Gestão de elenco** — adicionar, editar e remover lutadores em vista de blocos
- **Base do clube** — adição rápida de lutadores salvos com busca e seleção em lote
- **Categorias** — divisão KID e ADULT com matchmaking separado
- **GI / NO-GI** — ambos suportados com prioridade de combinação
- **Níveis** — INI, INT, AVAN, PRO
- **Gênero** — M / F com prioridade opcional para lutas femininas
- **Cronômetro** — grande, legível a vários metros
- **Sinais sonoros** — gongo no início do trabalho, aviso de 10 s, gongo no descanso, aplausos no fim
- **Sem pausa (VIP)** — marcar lutadores que não descansam entre rounds
- **Lutador saiu** — remover lutador no meio da aula com recálculo automático dos pares; **dois modos**: FORA (removido) ou DESCANSA 1 ROUND (volta no próximo round)
- **Modo DRILLS** — pares fixos por toda a aula, troca de papéis A/B a cada round
- **Multilíngue** — PL / EN / PT (BR) com seletor na inicialização e na barra inferior
- **Layout responsivo** — otimizado para tablets de 10,5", funciona em celulares e navegadores
- **Offline** — sem conta, sem backend, dados salvos localmente (AsyncStorage)

---

## Stack tecnológico

| Camada         | Tecnologia                                  |
|----------------|---------------------------------------------|
| Framework      | [Expo](https://expo.dev/) + React Native    |
| Linguagem      | TypeScript                                  |
| Roteamento     | Expo Router                                 |
| Dados locais   | AsyncStorage                                |
| Áudio          | expo-av                                     |
| Build          | EAS Build                                   |
| Hospedagem web | Netlify                                     |
| Alvo           | Android (tablet 10,5"), iOS, navegador      |

---

## Estrutura do projeto

```
app/
  (tabs)/
    index.tsx              # UI principal — telas, timers, grids de pares
    i18n.ts                # Traduções PL / EN / PT
    types.ts               # Tipos de domínio (RealPlayer, Match, SparringOptions, etc.)
    engine/
      matchmaker.ts        # Motor de formação e rotação de pares
assets/
  *.mp3                    # Sons de treino (gongo, aviso, aplausos)
  images/                  # Ícones e splash
docs/
  privacy-policy.md        # Política de privacidade
  play-store/              # Materiais para Google Play
Screenshots/               # Capturas de tela (v2.0.2 Beta)
Images/                    # Logo e ícones do app
plugins/                   # Plugins do Expo (ex.: ADI registration)
```

---

## Executando

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npx expo start

# Build APK (Android, para testes)
eas build --platform android --profile preview

# Build de produção (Android, .aab)
eas build --platform android --profile production

# Exportar versão web
npx expo export --platform web
```

---

## Versão web

O app está disponível online em:

**https://znimnierobie.pl**

A versão web roda no navegador em desktop, tablet e celular. Não requer instalação.

---

## Privacidade

- Não exige conta nem login
- Não envia dados para servidores externos
- Não usa analytics nem trackers
- Dados dos lutadores salvos apenas localmente no dispositivo

Política de privacidade completa: [docs/privacy-policy.md](docs/privacy-policy.md)

---

## Licença

Todos os direitos reservados. Código-fonte publicado apenas para fins de revisão.

---

<p align="center">
  <b>Z NIM NIE ROBIĘ</b> · v2.0.2 Beta · App de treino BJJ<br/>
  Construído com 🥋 no tatame e no teclado
</p>

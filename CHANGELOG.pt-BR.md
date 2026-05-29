# Changelog

Todas as mudanças relevantes do projeto **Z NIM NIE ROBIĘ** são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

🌐 **Outros idiomas:** [🇵🇱 Polski](CHANGELOG.md) · [🇬🇧 English](CHANGELOG.en.md)

---

## [2.1.0] — 2026-05-29 — Localização EN / PT completa

Versão final. Conclusão da localização — os últimos textos ainda fixos em polonês na tela de treino / cronômetro agora estão totalmente traduzidos para EN e PT-BR.

### Corrigido
- Rótulo da fase **INTERVALO** (era `PRZERWA`).
- Rótulo de grupo **MISTO** (era `MIESZANE`).
- Dicas de rotação nos TRIOS (**LUTANDO AGORA / TROCA DE GRUPOS / ENTRANDO / PRÓXIMOS**) → traduções completas EN/PT.
- Rótulo **TROCA DE GRUPOS** (era `ZMIANA GRUP`).
- Contador de progresso **Etapa X/Y** (era `Etap`).

### Alterado
- Capturas de tela do README separadas por idioma (`Screenshots/pl|en|pt`).
- Android `versionCode`: 10 → 11; versão do app: 2.0.5 → 2.1.0.

## [2.0.5] — 2026-05-25 — Lançamento de produção (Google Play)

Primeira versão aceita pelo Google Play. Disponível no Android em 3 idiomas (PL / EN / PT-BR).

### Alterado
- Tela de configurações renovada no estilo "Apple/iOS minimal": fontes mais finas (500/600), paddings maiores, botões planos sem sombras pesadas.
- Botão **VISITANTE** unificado com os outros toggles (M/F, ADULT/KID, GI/NO-GI) — destaque roxo em vez do marcador circular estranho.
- Pílulas de tipo de lutador (ADULT, NO-GI, ♂/♀) mais sutis, sem sombras.
- Android `versionCode`: 9 → 10; `autoIncrement` desativado (controle manual).

### Corrigido
- ScrollView externo da tela de configurações volta ao topo a cada mudança de orientação (portrait ↔ landscape).

## [2.0.4-beta] — 2026-05-07 — Visitantes de outro clube

### Adicionado
- Toggle **`VISITANTE`** na ficha do lutador (`○ VISITANTE` / `✈ VISITANTE`), ícone roxo ✈ antes do apelido.
- Matchmaker evita pares **VISITANTE–VISITANTE** com prioridade superior a kimono/peso/nível; quebrado apenas quando não há alternativa matemática.
- Status de visitante por treino (não é salvo no banco do clube).

## [2.0.3-beta] — 2026-04-22 — Lista de descanso durante INTERVALO

### Corrigido
- Lista **"QUEM DESCANSA"** visível em ambas as fases (PREP e INTERVALO) — antes só em PREP.

## [2.0.2-beta] — 2026-04-20 — Keep awake

### Corrigido
- Tela não desliga mais durante o cronômetro: `useKeepAwake` movido para o root layout + chamada explícita de `activateKeepAwakeAsync` (belt-and-suspenders).

## [2.0.1-beta] — 2026-04-20 — Tela PREP unificada

### Alterado
- Removida a divisão em colunas separadas KID / ADULT / DESCANSO — todos os pares em um único grid denso.
- Cores por categoria: KID GI (azul), KID NO-GI (ciano), ADULT GI (laranja), ADULT NO-GI (vermelho), MISTO (gradiente). Legenda na barra superior.
- Regra GI para o par: conta como GI apenas quando **ambos** estão de GI.
- "DESCANSO" inline ao lado do rótulo PREP (em vez de coluna separada).

### Adicionado
- Modal "Quem saiu?" — dois modos por lutador: **FORA** (permanentemente) ou **DESCANSA 1 ROUND** (volta no próximo).

## [2.0.0-beta] — 2026-04-20 — Novos modos + matchmaker 2.0

### Adicionado
- Modo **DRILLS** — pares fixos para todo o treino, troca de papéis A/B a cada round.
- **TASK DRILLS** divididos em **TRIOS** (rotação de 6 etapas) e **DUPLAS** (troca A↔B).
- Campo **gênero (M / F)** na ficha do lutador.
- **Lutas por gênero** — DESL / PRIORIDADE / SEMPRE.
- Slider **Prioridade de formação** — HABILIDADE ↔ PESO (4 snaps).
- **Divisão por peso** — divisão opcional do tatame em dois grupos.
- **Ordem das lutas** — SEMELHANTES / DIFERENTES / ALEATÓRIO.
- Seletor de idioma na inicialização (PL / EN / PT).
- Modal **"Sem pausa (VIP)"** com pílulas com nomes dos lutadores.
- Tela final **"OBRIGADO — BOM TRABALHO!"**.
- Painel **VERSÃO V2** (contato, GitHub, loja).
- Prévia dos próximos pares já durante o intervalo.

### Alterado
- Cards de trios e duplas otimizados para tablets de 10,5" — sem rolagem.
- Foco de áudio mais estável no Android.

### Corrigido
- Som de 10 segundos antes do fim não se repete mais.
- Rotação de pausa corrigida no modo DUPLAS.

## [1.0.0] — 2026-04-18 — Primeira versão

Primeira versão fechada (desenvolvimento, distribuição via APK). Não esteve no Google Play.

---

[2.1.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.1
[2.0.5]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.5
[2.0.4-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.4-beta
[2.0.3-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.3-beta
[2.0.2-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.2-beta
[2.0.1-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.1-beta
[2.0.0-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.0-beta
[1.0.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v1.0.0

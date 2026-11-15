# Changelog

Todas as mudanças relevantes do projeto **Z NIM NIE ROBIĘ** são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

🌐 **Outros idiomas:** [🇵🇱 Polski](CHANGELOG.md) · [🇬🇧 English](CHANGELOG.en.md)

---

## [2.2.0] - 2026-11-15 - Matchmaker mais rápido, correções de lógica e melhorias mobile

Atualização grande de desempenho e estabilidade do motor, exclusão permanente no banco do clube e ajustes de layout para celulares estreitos e navegador.

### Adicionado
- Exclusão permanente de lutadores no modal do banco do clube (ícone de lixeira com confirmação).
- Botão para cancelar a edição de um lutador e aviso de erro direto abaixo do formulário.
- Atalhos de teclado na versão web: `Espaço` pausa e retoma o cronômetro, `Escape` fecha modais e dicas, `Enter` confirma o cadastro, setas ajustam o slider de prioridade.
- Versão completa em português (PT-BR) na página de política de privacidade `/privacy`.
- Suíte de testes unitários para o motor de duplas, rotação de trios e validação de dados (`npm test`).

### Alterado
- Novo solver de pareamento com programação dinâmica em bitmask e tabelas pré-indexadas: busca exata até 12 atletas por grupo (antes 10) e cálculo ~13x mais rápido em turmas cheias de 46 atletas.
- Cronômetro baseado no relógio real do sistema, evitando atraso em abas em segundo plano e rodadas longas.
- Layout ajustado para telas estreitas (360 px): divisão de peso empilha na vertical e botões dos modais cabem sem corte.
- Script de deploy web agora faz backup seletivo dos arquivos do app e valida o certificado TLS da hospedagem.
- Android `versionCode`: 12 -> 13; iOS `buildNumber`: 1 -> 2; versão do app: 2.1.0 -> 2.2.0.

### Corrigido
- Duplas mistas (`KID + ADULT`) agora aparecem normalmente nos modos `POSICIONAL (DUPLAS)` e `DRILLS`.
- Um único adulto treinando com crianças em `POSICIONAL (TRIOS)` agora entra sempre em um grupo em vez de sumir do grid.
- Lutas por gênero no modo `PRIORIDADE` controlam o rodízio separadamente para `KID` e `ADULT`, funcionam junto com a divisão de peso e respeitam `SEM DESCANSO (VIP)`.
- Criança de `GI` promovida mantém a preferência por adulto de `GI` nas rodadas seguintes.
- O modal `ALGUÉM SAIU?` agora abre também na divisão de peso e durante a fase `TRABALHO`, e `DESCANSA 1 RODADA` devolve o atleta em todos os modos.
- No modo `DRILLS`, o intervalo mostra `INTERVALO` e os papéis `TRABALHO / ASSISTIR` da próxima rodada, respeitando o tempo de preparação configurado.
- O campo de peso aceita vírgula decimal (ex. `82,5`), valida a faixa `10-300 kg` e impede apelidos duplicados também na edição.
- Versão web não gera mais erro de `WakeLock` em aba oculta e reativa o bloqueio de tela ao voltar para a aba.
- Corrigido vazamento de instâncias `Audio.Sound` ao iniciar vários treinos seguidos.

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

[2.2.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.2
[2.1.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.1
[2.0.5]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.5
[2.0.4-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.4-beta
[2.0.3-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.3-beta
[2.0.2-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.2-beta
[2.0.1-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.1-beta
[2.0.0-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.0-beta
[1.0.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v1.0.0

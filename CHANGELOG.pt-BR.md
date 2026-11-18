# Histórico de versões do Z NIM NIE ROBIĘ

Registro das mudanças lançadas no **Z NIM NIE ROBIĘ**, seguindo [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

Outros idiomas estão disponíveis em [Polski](CHANGELOG.md) e [English](CHANGELOG.en.md).

## [2.3.0] (2026-11-18)

Atualização da base para Expo SDK 58, React Native 0.88.1 e `expo-audio`, junto com revisão completa dos textos da interface, da página de privacidade e da documentação.

### Alterado
- Atualizada a plataforma para Expo SDK 58 (`58.0.23`), Expo Router `58.0.30`, React Native `0.88.1`, React `19.3.1`, AsyncStorage `3.1.1`, Gesture Handler `3.5.0`, Reanimated `4.7.1` e TypeScript `6.0.3`.
- Substituído o pacote descontinuado `expo-av` pelo `expo-audio` (`58.0.12`) configurado sem permissão de microfone (`RECORD_AUDIO`), mantendo o gongo, o aviso duplo de 10 segundos e a redução automática da música de fundo.
- Refatoradas as transições de fase do cronômetro com `useEffectEvent` e a leitura do tema no navegador com `useSyncExternalStore`.
- Revisados os avisos de validação, dicas de opções, página `/privacy` e documentação nos três idiomas.
- Versão do aplicativo elevada para `2.3.0`, `android.versionCode` de `13` para `15` e `ios.buildNumber` de `2` para `3`.

## [2.2.0] (2026-11-15)

Solver de duplas mais rápido, exclusão definitiva de atletas no banco do clube e ajustes de tela para celulares estreitos e navegadores.

### Adicionado
- Exclusão permanente de lutadores no modal do Banco do Clube pelo ícone de lixeira com confirmação.
- Botão para cancelar a edição de um cadastro e aviso de validação logo abaixo do formulário.
- Atalhos de teclado no navegador (`Espaço` pausa e retoma o relógio, `Escape` fecha modais e dicas, `Enter` confirma o cadastro e as setas movem o controle de prioridade).
- Tradução completa para português do Brasil na página `/privacy`.
- Testes unitários cobrindo montagem de duplas, rotação em trios e validação de entrada (`npm test`).

### Alterado
- Solver de pareamento reescrito com programação dinâmica em bitmask e tabelas indexadas, ampliando o cálculo exato para grupos de até 12 pessoas (antes 10) e deixando turmas de 46 alunos cerca de 13x mais rápidas.
- Contagem regressiva ligada diretamente ao relógio do sistema para evitar atrasos em rodadas longas ou abas em segundo plano.
- Divisão de peso empilhada na vertical em telas de 360 px e botões dos modais ajustados sem corte de texto.
- Script de publicação web com backup restrito aos arquivos do app e verificação do certificado TLS da hospedagem.
- Versão elevada de `2.1.0` para `2.2.0`, `android.versionCode` de `12` para `13` e `ios.buildNumber` de `1` para `2`.

### Corrigido
- Duplas mistas (`KID + ADULT`) aparecem normalmente nos modos posicional em duplas e drills.
- Um adulto treinando sozinho com a turma infantil nos trios entra sempre em um grupo em vez de sumir da grade.
- O modo `PRIORIDADE` nas lutas por gênero controla o rodízio separadamente para `KID` e `ADULT`, funciona junto com a divisão de peso e respeita `SEM DESCANSO (VIP)`.
- Criança de kimono `GI` puxada para a chave adulta mantém preferência por parceiro adulto de `GI` nas rodadas seguintes.
- O modal `ALGUÉM SAIU?` funciona na divisão de peso e durante a fase de luta, e `DESCANSA 1 RODADA` devolve o atleta em todos os modos.
- O intervalo do modo drills exibe `INTERVALO` com os papéis `TRABALHO` e `ASSISTIR` da próxima rodada e respeita o tempo de preparação inicial.
- O campo de peso aceita vírgula decimal como `82,5`, valida a faixa entre 10 e 300 kg e bloqueia apelidos repetidos ao editar.
- A versão web não dispara erro de `WakeLock` em aba oculta e recupera o bloqueio de tela ao voltar para a aba.
- Corrigido o vazamento de instâncias de som ao iniciar vários treinos em sequência.

## [2.1.0] (2026-05-29)

Conclusão das traduções em inglês e português na tela ativa do cronômetro e separação das capturas de tela por idioma.

### Corrigido
- Traduzidos os últimos rótulos fixos em polonês na tela do relógio, incluindo `INTERVALO`, `MISTO`, avisos de troca nos trios, `TROCA DE GRUPOS` e o contador `Etapa`.

### Alterado
- Capturas de tela divididas nas pastas `Screenshots/pl`, `Screenshots/en` e `Screenshots/pt`.
- Versão elevada de `2.0.5` para `2.1.0` e `android.versionCode` para `11` e `12`.

## [2.0.5] (2026-05-25)

Primeira versão publicada no Google Play em polonês, inglês e português do Brasil.

### Alterado
- Visual da tela inicial suavizado com fontes mais leves (500 e 600), maior respiro entre blocos e cartões planos sem sombras pesadas.
- Botão `VISITANTE` alinhado aos demais seletores com destaque roxo quando ativo.
- `android.versionCode` elevado de `9` para `10`.

### Corrigido
- Ao girar a tela entre vertical e horizontal, a rolagem externa das configurações volta automaticamente ao topo.

## [2.0.4-beta] (2026-05-07)

### Adicionado
- Chave `VISITANTE` no cadastro do atleta marcada com ícone roxo de avião antes do apelido.
- O algoritmo evita casar dois visitantes com prioridade acima de traje, peso e nível, juntando ambos só quando não resta outra combinação possível.
- A marcação vale apenas para a aula atual e não fica gravada no banco fixo do clube.

## [2.0.3-beta] (2026-04-22)

### Corrigido
- Barra superior com quem está descansando permanece visível tanto na preparação quanto no intervalo entre rodadas.

## [2.0.2-beta] (2026-04-20)

### Corrigido
- Bloqueio de tela movido para o layout raiz com chamada direta a `activateKeepAwakeAsync` para o tablet na parede não apagar no meio do rola.

## [2.0.1-beta] (2026-04-20)

### Alterado
- Grade única de preparação com cores por categoria (`KID GI`, `KID NO-GI`, `ADULT GI`, `ADULT NO-GI` e `MISTO`), legenda superior e lista de descanso ao lado do título da fase.
- A dupla só conta como `GI` quando os dois atletas estão de kimono.

### Adicionado
- Duas opções por atleta no modal de saída durante o treino (`SAIU` até o fim da aula ou `DESCANSA 1 RODADA` com retorno automático).

## [2.0.0-beta] (2026-04-20)

### Adicionado
- Modo `DRILLS` com duplas fixas durante toda a aula e inversão dos lados A e B a cada rodada.
- Treino posicional separado em `TRIOS` (6 etapas de rodízio) e `DUPLAS` (troca de posição na metade do tempo).
- Seleção de gênero no cartão do lutador e filtro de lutas femininas (`DESL.`, `PRIORIDADE` e `SEMPRE`).
- Controle deslizante de quatro pontos entre técnica e peso, divisão opcional do tatame em dois grupos de peso e escolha da ordem das lutas.
- Escolha de idioma na primeira abertura, modal de atletas sem descanso, tela de encerramento, painel de informações da versão e prévia das próximas duplas já durante o intervalo.

### Alterado
- Cartões de trios e duplas dimensionados para caber sem rolagem em tablets de 10,5 polegadas e foco de áudio mais estável no Android.

### Corrigido
- Aviso de 10 segundos sem disparo duplicado e rodízio de pausa ajustado no modo de duplas.

## [1.0.0] (2026-04-18)

Primeira versão interna distribuída diretamente via arquivo APK fora da Google Play.

[2.3.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.3
[2.2.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.2
[2.1.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.1
[2.0.5]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.5
[2.0.4-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.4-beta
[2.0.3-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.3-beta
[2.0.2-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.2-beta
[2.0.1-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.1-beta
[2.0.0-beta]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v2.0.0-beta
[1.0.0]: https://github.com/drozdzszymon/z-nim-nie-robie/releases/tag/v1.0.0


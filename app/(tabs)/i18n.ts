export type Language = 'PL' | 'EN' | 'PT';

const translations = {
  // ── FORM LABELS ──
  pseudonym: { PL: 'PSEUDONIM', EN: 'NICKNAME', PT: 'APELIDO' },
  weightKg: { PL: 'WAGA (KG)', EN: 'WEIGHT (KG)', PT: 'PESO (KG)' },
  category: { PL: 'KATEGORIA', EN: 'CATEGORY', PT: 'CATEGORIA' },
  gear: { PL: 'STRÓJ', EN: 'GEAR', PT: 'TRAJE' },
  gender: { PL: 'PŁEĆ', EN: 'GENDER', PT: 'GÊNERO' },
  level: { PL: 'POZIOM', EN: 'LEVEL', PT: 'NÍVEL' },
  placeholderName: { PL: 'np. Kowalski', EN: 'e.g. Smith', PT: 'ex. Silva' },
  placeholderWeight: { PL: 'np. 82', EN: 'e.g. 82', PT: 'ex. 82' },
  guest: { PL: 'GOŚĆ', EN: 'GUEST', PT: 'VISITANTE' },
  guestHint: { PL: 'Zawodnik z innego klubu. Silnik unika parowania gości ze sobą.', EN: 'Visiting from another gym. The matchmaker avoids pairing two guests together.', PT: 'Atleta de outra academia. O motor evita parear dois visitantes.' },

  // ── PLAYER TYPE / GEAR / GENDER BADGES ──
  maleShort: { PL: '♂ M', EN: '♂ M', PT: '♂ M' },
  femaleShort: { PL: '♀ K', EN: '♀ F', PT: '♀ F' },

  // ── SECTION HEADERS ──
  sectionSquad: { PL: 'SKŁAD', EN: 'LINEUP', PT: 'ELENCO' },
  sectionSquadTitle: { PL: 'Dodaj zawodnika', EN: 'Add player', PT: 'Adicionar lutador' },
  sectionSquadSubtitle: { PL: 'Szybko ustaw zawodnika i od razu dorzuć go na matę.', EN: 'Quickly set up a player and add them to the mat.', PT: 'Configure rapidamente um lutador e coloque-o no tatame.' },
  sectionSquadSubtitleCompact: { PL: 'Ustaw zawodnika i szybko dorzuć go na matę.', EN: 'Set up a player and add them to the mat.', PT: 'Configure um lutador e coloque-o no tatame.' },
  sectionTraining: { PL: 'TRENING', EN: 'TRAINING', PT: 'TREINO' },
  sectionTrainingTitle: { PL: 'Czas i rytm rund', EN: 'Round timing', PT: 'Tempo das rodadas' },
  sectionTrainingSubtitle: { PL: 'Ustaw przygotowanie, pracę, przerwy i liczbę rund w czytelnej siatce.', EN: 'Set preparation, work, rest and number of rounds.', PT: 'Defina preparação, trabalho, descanso e número de rodadas.' },
  sectionTrainingSubtitleCompact: { PL: 'Ustaw przygotowanie, pracę, przerwy i rundy.', EN: 'Set prep, work, rest and rounds.', PT: 'Defina prep, trabalho, descanso e rodadas.' },
  sectionMode: { PL: 'TRYB TRENINGU', EN: 'TRAINING MODE', PT: 'MODO DE TREINO' },
  sectionModeTitle: { PL: 'Wybierz tryb i dostosuj', EN: 'Choose mode & customize', PT: 'Escolha o modo e personalize' },

  // ── TIME CARD LABELS ──
  roundMin: { PL: 'RUNDA (MIN)', EN: 'ROUND (MIN)', PT: 'RODADA (MIN)' },
  prepTimeS: { PL: 'PRZYGOT. (S)', EN: 'PREP (S)', PT: 'PREP. (S)' },
  restTimeS: { PL: 'PRZERWA (S)', EN: 'REST (S)', PT: 'DESCANSO (S)' },
  rounds: { PL: 'RUNDY', EN: 'ROUNDS', PT: 'RODADAS' },

  // ── TRAINING MODES ──
  modeSparring: { PL: 'SPARINGI', EN: 'SPARRING', PT: 'SPARRING' },
  modeZadaniowki: { PL: 'ZADANIÓWKI', EN: 'POSITIONAL', PT: 'POSICIONAL' },
  modeDrille: { PL: 'DRILLE', EN: 'DRILLS', PT: 'DRILLS' },
  zadaniowkiTriads: { PL: 'TRÓJKI', EN: 'TRIADS', PT: 'TRIOS' },
  zadaniowkiPairs: { PL: 'DWÓJKI', EN: 'PAIRS', PT: 'DUPLAS' },
  drilleDescription: { PL: 'Pary dobierane raz. Role A/B zamieniają się co rundę.', EN: 'Pairs selected once. A/B roles swap each round.', PT: 'Duplas escolhidas uma vez. Papéis A/B trocam a cada rodada.' },

  // ── BUTTONS ──
  addPlayer: { PL: 'DODAJ ZAWODNIKA', EN: 'ADD PLAYER', PT: 'ADICIONAR LUTADOR' },
  saveChanges: { PL: 'ZAPISZ ZMIANY', EN: 'SAVE CHANGES', PT: 'SALVAR ALTERAÇÕES' },
  addFromDB: { PL: 'DODAJ Z BAZY', EN: 'ADD FROM DB', PT: 'ADD DO BANCO' },
  noRestVip: { PL: 'BEZ PAUZY (VIP)', EN: 'NO REST (VIP)', PT: 'SEM DESCANSO (VIP)' },
  clearFilters: { PL: 'WYCZYŚĆ', EN: 'CLEAR', PT: 'LIMPAR' },
  cancel: { PL: 'ANULUJ', EN: 'CANCEL', PT: 'CANCELAR' },
  close: { PL: 'ZAMKNIJ', EN: 'CLOSE', PT: 'FECHAR' },
  done: { PL: 'GOTOWE', EN: 'DONE', PT: 'PRONTO' },
  clear: { PL: 'Wyczyść', EN: 'Clear', PT: 'Limpar' },
  delete: { PL: 'Usuń', EN: 'Delete', PT: 'Excluir' },
  newTraining: { PL: 'NOWY TRENING', EN: 'NEW SESSION', PT: 'NOVO TREINO' },
  pause: { PL: 'PAUZA', EN: 'PAUSE', PT: 'PAUSA' },
  resume: { PL: 'WZNÓW', EN: 'RESUME', PT: 'RETOMAR' },
  dropout: { PL: 'KTOŚ WYPADŁ?', EN: 'DROPOUT?', PT: 'ALGUÉM SAIU?' },
  endTraining: { PL: 'ZAKOŃCZ', EN: 'END', PT: 'ENCERRAR' },
  backToMenu: { PL: 'Wróć do menu', EN: 'Back to menu', PT: 'Voltar ao menu' },

  // ── START BUTTON ──
  startSparring: { PL: 'START SPARINGÓW', EN: 'START SPARRING', PT: 'INICIAR SPARRING' },
  startZadaniowkiTriads: { PL: 'START ZADANIÓWEK (TRÓJKI)', EN: 'START POSITIONAL (TRIADS)', PT: 'INICIAR POSICIONAL (TRIOS)' },
  startZadaniowkiPairs: { PL: 'START ZADANIÓWEK (DWÓJKI)', EN: 'START POSITIONAL (PAIRS)', PT: 'INICIAR POSICIONAL (DUPLAS)' },
  startDrills: { PL: 'START DRILLI', EN: 'START DRILLS', PT: 'INICIAR DRILLS' },

  // ── SPARRING OPTIONS ──
  priorityLabel: { PL: 'PRIORYTET DOBORU', EN: 'PAIRING PRIORITY', PT: 'PRIORIDADE DE PAR' },
  skillsLabel: { PL: 'UMIEJĘTNOŚCI', EN: 'SKILL', PT: 'HABILIDADE' },
  weightLabel: { PL: 'WAGA', EN: 'WEIGHT', PT: 'PESO' },
  fightOrder: { PL: 'KOLEJNOŚĆ WALK', EN: 'FIGHT ORDER', PT: 'ORDEM DAS LUTAS' },
  orderMatched: { PL: 'ZBLIŻONE', EN: 'MATCHED', PT: 'PAREADO' },
  orderVaried: { PL: 'RÓŻNE', EN: 'VARIED', PT: 'VARIADO' },
  orderRandom: { PL: 'LOSOWO', EN: 'RANDOM', PT: 'ALEATÓRIO' },
  weightDivision: { PL: 'PODZIAŁ WAGOWY', EN: 'WEIGHT DIVISION', PT: 'DIVISÃO DE PESO' },
  weightDivisionOff: { PL: 'WYŁ.', EN: 'OFF', PT: 'DESL.' },
  genderMatching: { PL: 'WALKI WG PŁCI', EN: 'GENDER MATCHING', PT: 'LUTAS POR GÊNERO' },
  genderOff: { PL: 'WYŁ.', EN: 'OFF', PT: 'DESL.' },
  genderPrefer: { PL: 'PRIORYTET', EN: 'PREFER', PT: 'PRIORIDADE' },
  genderAlways: { PL: 'ZAWSZE', EN: 'ALWAYS', PT: 'SEMPRE' },

  // ── TOOLTIPS ──
  tooltipPriority: { PL: 'Ustala wagę kryteriów przy dobieraniu par. Skrajnie w lewo liczy się zbliżony staż na macie, skrajnie w prawo zbliżona masa ciała, a ustawienia środkowe łączą oba warunki.', EN: 'Sets what matters more when matching pairs. All the way left favors similar mat skill, all the way right favors similar weight, and the middle steps blend both.', PT: 'Define o peso de cada critério na montagem das duplas. À esquerda prioriza nível técnico parecido, à direita prioriza peso próximo e no meio combina os dois.' },
  tooltipFightOrder: { PL: 'ZBLIŻONE puszcza najrówniejsze zestawienia w pierwszych rundach, a luźniejsze zostawia na później. RÓŻNE odwraca tę kolejność i trzyma najmocniejsze pary na koniec. LOSOWO miesza kolejność rund.', EN: 'MATCHED schedules the closest matchups in early rounds and widens the gap later. VARIED flips that order and saves the closest pairs for the end. RANDOM shuffles round order.', PT: 'PAREADO coloca as lutas mais equilibradas nas primeiras rodadas e abre mais depois. VARIADO inverte essa ordem e guarda os confrontos mais parelhos para o fim. ALEATÓRIO sorteia a ordem.' },
  tooltipWeightDivision: { PL: 'Dzieli salę na lżejszą i cięższą połowę. Jedna grupa walczy, druga łapie oddech na brzegu maty, po czym następuje 20 s na zmianę składów bez osobnej przerwy. Próg wylicza się sam tak, żeby obie grupy miały podobną liczbę par.', EN: 'Splits the room into lighter and heavier groups. One group rolls while the other rests off the mat, with a 20 s switch window instead of a full break. The weight cutoff is picked automatically to balance pair counts.', PT: 'Divide o tatame em grupo leve e grupo pesado. Enquanto um grupo rola, o outro descansa fora da área, com 20 s para trocar as turmas sem intervalo longo. O corte de peso é calculado sozinho para equilibrar as duplas.' },
  tooltipGender: { PL: 'WYŁ. łączy wszystkich w jednej puli. PRIORYTET zestawia kobiety najpierw między sobą aż każda przejdzie rundę z każdą, a potem dopina je do reszty sali. ZAWSZE trzyma osobne pary kobiece przez cały trening.', EN: 'OFF mixes everyone in one pool. PREFER pairs women together first until every woman has rolled with every other woman, then opens mixed pairings. ALWAYS keeps separate women pairings for the whole session.', PT: 'DESL. junta todos na mesma chave. PRIORIDADE casa as mulheres entre si primeiro até fechar o rodízio completo e depois libera duplas mistas. SEMPRE mantém lutas femininas separadas do início ao fim.' },

  // ── TIMER UI ──
  roundOf: { PL: 'RUNDA', EN: 'ROUND', PT: 'RODADA' },
  change: { PL: 'ZMIANA!', EN: 'SWITCH!', PT: 'TROCA!' },
  preparation: { PL: 'PRZYGOTOWANIE', EN: 'PREPARATION', PT: 'PREPARAÇÃO' },
  aboutToFight: { PL: 'ZARAZ WALCZĄ:', EN: 'ABOUT TO FIGHT:', PT: 'VÃO LUTAR:' },
  nowFighting: { PL: 'TERAZ WALCZĄ:', EN: 'NOW FIGHTING:', PT: 'LUTANDO AGORA:' },
  bottom: { PL: 'DÓŁ', EN: 'BOTTOM', PT: 'BAIXO' },
  top: { PL: 'GÓRA', EN: 'TOP', PT: 'CIMA' },
  work: { PL: 'PRACA', EN: 'WORK', PT: 'TRABALHO' },
  assist: { PL: 'ASYSTA', EN: 'ASSIST', PT: 'ASSISTIR' },
  resting: { PL: 'odpoczywa:', EN: 'resting:', PT: 'descansando:' },
  restingSection: { PL: 'ODPOCZYWA', EN: 'RESTING', PT: 'DESCANSANDO' },
  nextChange: { PL: 'NASTĘPNA ZMIANA:', EN: 'NEXT SWITCH:', PT: 'PRÓXIMA TROCA:' },
  restingOnMat: { PL: 'OSOBY ODPOCZYWAJĄCE NA MATY!', EN: 'PLAYERS RESTING ON THE MAT!', PT: 'LUTADORES DESCANSANDO NO TATAME!' },

  // ── MATCH SECTIONS ──
  kidSection: { PL: 'DZIECI', EN: 'KIDS', PT: 'CRIANÇAS' },
  adultSection: { PL: 'DOROŚLI', EN: 'ADULTS', PT: 'ADULTOS' },

  // ── ROSTER ──
  playersOnMat: { PL: 'ZAWODNICY NA MACIE', EN: 'PLAYERS ON MAT', PT: 'LUTADORES NO TATAME' },
  rosterSubtitleAlpha: { PL: 'Kolejność alfabetyczna A-Z', EN: 'Alphabetical order A-Z', PT: 'Ordem alfabética A-Z' },
  rosterFiltering: { PL: 'Filtrowanie', EN: 'Filtering', PT: 'Filtrando' },
  rosterOf: { PL: 'z', EN: 'of', PT: 'de' },
  matIsEmpty: { PL: 'Mata jest jeszcze pusta', EN: 'Mat is still empty', PT: 'O tatame ainda está vazio' },
  matEmptyHint: { PL: 'Dodaj zawodników z panelu po lewej, a tutaj pojawią się uporządkowane kafelki.', EN: 'Add players from the panel on the left and organized tiles will appear here.', PT: 'Adicione lutadores pelo painel à esquerda e os cards organizados aparecerão aqui.' },
  editPlayerHint: { PL: 'Dotknij, aby edytować zawodnika', EN: 'Tap to edit player', PT: 'Toque para editar lutador' },

  // ── MODALS ──
  dropoutTitle: { PL: 'KTO WYPADŁ Z TRENINGU?', EN: 'WHO DROPPED OUT?', PT: 'QUEM SAIU DO TREINO?' },
  dropoutSubtitle: { PL: 'Zegar stoi. Zaznacz jedną lub kilka osób i zatwierdź zmianę.', EN: 'Timer paused. Select one or more athletes and confirm.', PT: 'Cronômetro pausado. Marque um ou mais atletas e confirme.' },
  dropoutModeFull: { PL: 'WYPADŁ', EN: 'OUT', PT: 'SAIU' },
  dropoutModeOneRound: { PL: 'ODPOCZYWA 1 RUNDĘ', EN: 'RESTS 1 ROUND', PT: 'DESCANSA 1 RODADA' },
  selected: { PL: 'ZAZNACZONY', EN: 'SELECTED', PT: 'SELECIONADO' },
  select: { PL: 'WYBIERZ', EN: 'SELECT', PT: 'SELECIONAR' },
  clubDBTitle: { PL: 'BAZA KLUBOWA', EN: 'CLUB DATABASE', PT: 'BANCO DO CLUBE' },
  clubDBSubtitle: { PL: 'Zaznacz osoby obecne dziś na sali i dorzuć je na matę jednym kliknięciem.', EN: 'Pick everyone who showed up today and add them to the mat in one tap.', PT: 'Marque quem veio treinar hoje e coloque todos no tatame de uma vez.' },
  clubDBNoResults: { PL: 'Brak wyników wyszukiwania.', EN: 'No matching names.', PT: 'Nenhum nome encontrado.' },
  clubDBEmpty: { PL: 'Baza klubowa jest jeszcze pusta.', EN: 'Club database is empty.', PT: 'O banco do clube ainda está vazio.' },
  onMat: { PL: 'NA MACIE', EN: 'ON MAT', PT: 'NO TATAME' },
  searchByName: { PL: 'Szukaj po pseudonimie', EN: 'Search by nickname', PT: 'Buscar por apelido' },
  addSelected: { PL: 'DODAJ', EN: 'ADD', PT: 'ADICIONAR' },
  vipModalTitle: { PL: 'ZAWODNICY BEZ PAUZY', EN: 'NO-REST PLAYERS', PT: 'LUTADORES SEM DESCANSO' },

  // ── ABOUT MODAL ──
  aboutTitle: { PL: 'Z NIM NIE ROBIĘ', EN: 'Z NIM NIE ROBIĘ', PT: 'Z NIM NIE ROBIĘ' },
  aboutVersion: { PL: 'Wersja 2.3', EN: 'Version 2.3', PT: 'Versão 2.3' },
  aboutDescription: { PL: 'Narzędzie dla trenerów BJJ i grapplingu do układania par, pilnowania rund i rotacji na macie.', EN: 'Mat timer and pair matchmaker built for BJJ and grappling coaches.', PT: 'Cronômetro de tatame e formador de duplas para professores de BJJ e grappling.' },

  // ── VALIDATION MESSAGES ──
  errNoName: { PL: 'Wpisz pseudonim zawodnika.', EN: 'Enter a player nickname.', PT: 'Informe o apelido do lutador.' },
  errNoWeight: { PL: 'Wpisz wagę z przedziału od 10 do 300 kg.', EN: 'Enter a weight between 10 and 300 kg.', PT: 'Informe um peso entre 10 e 300 kg.' },
  errDuplicate: { PL: 'Zawodnik o tym pseudonimie jest już na macie.', EN: 'That nickname is already on the mat.', PT: 'Já existe um lutador com esse apelido no tatame.' },
  errMinPlayers: { PL: 'Dodaj co najmniej dwóch zawodników.', EN: 'Add at least two players first.', PT: 'Adicione pelo menos dois lutadores.' },
  errRoundTime: { PL: 'Czas rundy musi być większy od zera.', EN: 'Round time must be greater than zero.', PT: 'O tempo da rodada precisa ser maior que zero.' },
  errRoundsTotal: { PL: 'Liczba rund musi być większa od zera.', EN: 'Number of rounds must be greater than zero.', PT: 'O número de rodadas precisa ser maior que zero.' },
  errPrepTime: { PL: 'Czas przygotowania musi być większy od zera.', EN: 'Prep time must be greater than zero.', PT: 'O tempo de preparação precisa ser maior que zero.' },
  errRestTime: { PL: 'Czas przerwy musi być większy od zera.', EN: 'Rest time must be greater than zero.', PT: 'O tempo de descanso precisa ser maior que zero.' },
  errWeightDivision: { PL: 'Podział wagowy wymaga co najmniej dwóch osób w każdej grupie.', EN: 'Weight division needs at least two players in each group.', PT: 'A divisão de peso exige pelo menos dois atletas em cada grupo.' },
  errSelectDropout: { PL: 'Zaznacz przynajmniej jedną osobę, która schodzi z maty.', EN: 'Select at least one player leaving the mat.', PT: 'Marque pelo menos um atleta que saiu do tatame.' },

  // ── CONFIRM DIALOGS ──
  confirmDeleteTitle: { PL: 'Usuń zawodnika', EN: 'Remove player', PT: 'Remover lutador' },
  confirmDeleteMsg: { PL: 'Czy na pewno chcesz usunąć', EN: 'Remove', PT: 'Deseja remover' },
  confirmDeleteFromMat: { PL: 'z maty?', EN: 'from the mat?', PT: 'do tatame?' },
  confirmDeleteFromDBTitle: { PL: 'Usuń z bazy klubowej', EN: 'Delete from club database', PT: 'Excluir do banco do clube' },
  confirmDeleteFromDBMsg: { PL: 'Trwale usunąć z bazy klubowej zawodnika', EN: 'Permanently delete from the club database', PT: 'Excluir permanentemente do banco do clube' },
  confirmNewTraining: { PL: 'Nowy trening', EN: 'New session', PT: 'Novo treino' },
  confirmClearMat: { PL: 'Wyczyścić całą listę zawodników na macie?', EN: 'Clear everyone currently on the mat?', PT: 'Limpar todos os lutadores do tatame?' },
  vipEmptyHint: { PL: 'Mata jest pusta. Najpierw dodaj zawodników w panelu składu.', EN: 'No one on the mat yet. Add players in the lineup panel first.', PT: 'Ninguém no tatame ainda. Adicione os lutadores no painel de elenco primeiro.' },
  loadingApp: { PL: 'Wczytywanie', EN: 'Loading', PT: 'Carregando' },
  weightThresholdLabel: { PL: 'PRÓG:', EN: 'LIMIT:', PT: 'LIMITE:' },

  // ── FINISHED SCREEN ──
  thanks: { PL: 'DZIĘKUJĘ', EN: 'THANK YOU', PT: 'OBRIGADO' },
  goodJob: { PL: 'DOBRA ROBOTA!', EN: 'GOOD JOB!', PT: 'BOM TRABALHO!' },

  // ── ROSTER EMPTY STATES ──
  filterNoResults: { PL: 'Brak wyników dla wybranych filtrów', EN: 'No results for selected filters', PT: 'Sem resultados para os filtros selecionados' },
  filterChangeHint: { PL: 'Zmień filtry lub wyczyść je, aby zobaczyć wszystkich zawodników.', EN: 'Change filters or clear them to see all players.', PT: 'Altere os filtros ou limpe-os para ver todos os lutadores.' },
  matEmptyHintLeft: { PL: 'Dodaj zawodników z panelu po lewej, a tutaj pojawią się uporządkowane kafelki.', EN: 'Add players from the panel on the left and organized tiles will appear here.', PT: 'Adicione lutadores pelo painel à esquerda e os cards organizados aparecerão aqui.' },
  matEmptyHintAbove: { PL: 'Dodaj zawodników z panelu powyżej, a tutaj pojawią się uporządkowane kafelki.', EN: 'Add players from the panel above and organized tiles will appear here.', PT: 'Adicione lutadores pelo painel acima e os cards organizados aparecerão aqui.' },
  weightOn: { PL: 'WŁ.', EN: 'ON', PT: 'LIG.' },

  // ── TIMER BOTTOM BAR ──
  restLabel: { PL: 'Pauza:', EN: 'Rest:', PT: 'Descanso:' },

  // ── TIMER / TRAINING SCREEN ──
  breakPhase: { PL: 'PRZERWA', EN: 'BREAK', PT: 'INTERVALO' },
  mixedSection: { PL: 'MIESZANE', EN: 'MIXED', PT: 'MISTO' },
  wdFighting: { PL: 'WALCZY', EN: 'FIGHTING', PT: 'LUTANDO' },
  wdGroupChange: { PL: 'ZMIANA GRUP', EN: 'GROUP SWITCH', PT: 'TROCA DE GRUPOS' },
  wdNext: { PL: 'NASTĘPNI', EN: 'NEXT', PT: 'PRÓXIMOS' },
  wdEntering: { PL: 'WCHODZĄ', EN: 'ENTERING', PT: 'ENTRANDO' },
  stage: { PL: 'Etap', EN: 'Stage', PT: 'Etapa' },

  // ── STATS ──
  statsTitle: { PL: '📊 STATYSTYKI', EN: '📊 STATISTICS', PT: '📊 ESTATÍSTICAS' },
  statsTabTrainings: { PL: 'TRENINGI', EN: 'SESSIONS', PT: 'TREINOS' },
  statsTabFrequency: { PL: 'FREKWENCJA', EN: 'ATTENDANCE', PT: 'FREQUÊNCIA' },
  statsTabPairs: { PL: 'PARY', EN: 'PAIRS', PT: 'PARES' },
  statsFilterWeek: { PL: 'TYDZIEŃ', EN: 'WEEK', PT: 'SEMANA' },
  statsFilterMonth: { PL: 'MIESIĄC', EN: 'MONTH', PT: 'MÊS' },
  statsFilterAll: { PL: 'WSZYSTKO', EN: 'ALL', PT: 'TUDO' },
  statsNoSessions: { PL: 'Brak zapisanych treningów', EN: 'No recorded sessions', PT: 'Nenhum treino registrado' },
  statsNoSessionsHint: { PL: 'Historia pojawi się po zakończeniu pierwszego treningu.', EN: 'History will appear after completing the first session.', PT: 'O histórico aparecerá após concluir o primeiro treino.' },
  statsNoFrequency: { PL: 'Brak danych o frekwencji', EN: 'No attendance data', PT: 'Sem dados de frequência' },
  statsNoFrequencyHint: { PL: 'Dane pojawią się po zakończeniu treningów.', EN: 'Data will appear after completing sessions.', PT: 'Os dados aparecerão após concluir os treinos.' },
  statsNoPairs: { PL: 'Brak danych o parach', EN: 'No pairing data', PT: 'Sem dados de pares' },
  statsNoPairsHint: { PL: 'Historia par pojawi się po zakończeniu treningów.', EN: 'Pair history will appear after completing sessions.', PT: 'O histórico de pares aparecerá após concluir os treinos.' },
  statsPlayers: { PL: 'zawodników', EN: 'players', PT: 'lutadores' },
  statsRounds: { PL: 'rund', EN: 'rounds', PT: 'rodadas' },
  statsMinPerRound: { PL: 'min/runda', EN: 'min/round', PT: 'min/rodada' },
  statsRound: { PL: 'Runda', EN: 'Round', PT: 'Rodada' },
  statsAttendanceRanking: { PL: 'RANKING OBECNOŚCI', EN: 'ATTENDANCE RANKING', PT: 'RANKING DE PRESENÇA' },
  statsTrainings: { PL: 'treningów', EN: 'sessions', PT: 'treinos' },
  statsMostFrequentPairs: { PL: 'NAJCZĘSTSZE PARY', EN: 'MOST FREQUENT PAIRS', PT: 'PARES MAIS FREQUENTES' },
  statsCombinations: { PL: 'kombinacji', EN: 'combinations', PT: 'combinações' },

  // ── LANGUAGE PICKER ──
  langPickerTitle: { PL: 'Wybierz język', EN: 'Choose language', PT: 'Escolha o idioma' },

  // ── WEIGHT DIVISION DYNAMIC ──
  weightPlayers: { PL: 'zawod.', EN: 'players', PT: 'lutad.' },
  weightPairs: { PL: 'par', EN: 'pairs', PT: 'pares' },

  // ── SIMULATION (DEV) ──
  simParticipants: { PL: 'UCZESTNICY', EN: 'PARTICIPANTS', PT: 'PARTICIPANTES' },
  simRound: { PL: 'RUNDA', EN: 'ROUND', PT: 'RODADA' },
  simPause: { PL: 'PAUZA', EN: 'REST', PT: 'DESCANSO' },
  simCopied: { PL: 'Skopiowano!', EN: 'Copied!', PT: 'Copiado!' },
  simCopiedMsg: { PL: 'rund skopiowana do schowka.', EN: 'rounds copied to clipboard.', PT: 'rodadas copiadas para a área de transferência.' },
  simTitle: { PL: 'Symulacja rund', EN: 'Round simulation', PT: 'Simulação de rodadas' },
  devModeActive: { PL: 'Dev Mode Aktywny', EN: 'Dev Mode Active', PT: 'Dev Mode Ativo' },
  devModeMsg: { PL: 'Wgrano 46 zawodników z bazy testowej.', EN: 'Loaded 46 players from test database.', PT: 'Carregados 46 lutadores do banco de teste.' },
  devMetricsTitle: { PL: 'PARAMETRY URZĄDZENIA', EN: 'DEVICE PARAMETERS', PT: 'PARÂMETROS DO DISPOSITIVO' },

  // ── SKILL LEVELS ──
  skillBeginner: { PL: 'POCZ.', EN: 'BEG.', PT: 'INIC.' },
  skillIntermediate: { PL: 'ŚR.ZAAW.', EN: 'INTERM.', PT: 'INTERM.' },
  skillAdvanced: { PL: 'ZAAW.', EN: 'ADV.', PT: 'AVANÇ.' },
  skillPro: { PL: 'PRO', EN: 'PRO', PT: 'PRO' },
} as const;

export type TranslationKey = keyof typeof translations;

export const t = (key: TranslationKey, lang: Language): string => {
  return translations[key]?.[lang] ?? translations[key]?.['EN'] ?? key;
};

export const LANGUAGE_OPTIONS: { value: Language; flag: string; label: string }[] = [
  { value: 'PL', flag: '🇵🇱', label: 'Polski' },
  { value: 'EN', flag: '🇬🇧', label: 'English' },
  { value: 'PT', flag: '🇧🇷', label: 'Português' },
];

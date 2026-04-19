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
  tooltipPriority: { PL: 'Określa co jest ważniejsze przy dobieraniu par. UMIEJĘTNOŚCI — pary o zbliżonym poziomie. WAGA — pary o zbliżonej masie ciała. Pozycje pośrednie łączą oba kryteria.', EN: 'Determines what matters more when pairing. SKILL — pairs with similar level. WEIGHT — pairs with similar body mass. Middle positions blend both criteria.', PT: 'Determina o que é mais importante ao formar pares. HABILIDADE — pares de nível semelhante. PESO — pares de massa corporal semelhante. Posições intermediárias combinam ambos.' },
  tooltipFightOrder: { PL: 'ZBLIŻONE — najbardziej wyrównane walki na początku, z rundami coraz bardziej zróżnicowane. RÓŻNE — odwrotnie, najlepsze pary na koniec. LOSOWO — kolejność losowa.', EN: 'MATCHED — most balanced fights first, progressively varied. VARIED — reversed, best pairs at the end. RANDOM — random order.', PT: 'PAREADO — lutas mais equilibradas primeiro, progressivamente variadas. VARIADO — invertido, melhores pares no final. ALEATÓRIO — ordem aleatória.' },
  tooltipWeightDivision: { PL: 'Dzieli matę na dwie grupy wagowe. Walczy jedna grupa, druga odpoczywa — potem zamiana. Brak przerwy między rundami (20s na zmianę grup). Próg wagowy obliczany automatycznie dla równej liczby par.', EN: 'Splits the mat into two weight groups. One group fights while the other rests — then they swap. No break between rounds (20s for group switch). Weight threshold calculated automatically for equal pair count.', PT: 'Divide o tatame em dois grupos de peso. Um grupo luta enquanto o outro descansa — depois trocam. Sem intervalo entre rodadas (20s para troca). Limite de peso calculado automaticamente para número igual de pares.' },
  tooltipGender: { PL: 'WYŁ. — mieszane walki bez podziału. PRIORYTET — kobiety walczą najpierw ze sobą (aż każda z każdą), potem dołączają do mężczyzn. ZAWSZE — kobiety tylko z kobietami przez cały trening.', EN: 'OFF — mixed fights, no separation. PREFER — women fight each other first (until all matched), then join men. ALWAYS — women only with women for the entire session.', PT: 'DESL. — lutas mistas, sem separação. PRIORIDADE — mulheres lutam entre si primeiro (até todas pareadas), depois juntam-se aos homens. SEMPRE — mulheres somente com mulheres durante todo o treino.' },

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
  dropoutSubtitle: { PL: 'Czas został zatrzymany. Możesz zaznaczyć kilka osób i zatwierdzić jednym kliknięciem.', EN: 'Time has been stopped. Select players and confirm with one click.', PT: 'O tempo foi parado. Selecione os lutadores e confirme com um clique.' },
  selected: { PL: 'ZAZNACZONY', EN: 'SELECTED', PT: 'SELECIONADO' },
  select: { PL: 'WYBIERZ', EN: 'SELECT', PT: 'SELECIONAR' },
  clubDBTitle: { PL: 'BAZA KLUBOWA', EN: 'CLUB DATABASE', PT: 'BANCO DO CLUBE' },
  clubDBSubtitle: { PL: 'Wybierz zawodników z bazy i dodaj ich na matę jednym kliknięciem.', EN: 'Select players from the database and add them to the mat with one click.', PT: 'Selecione lutadores do banco e adicione-os ao tatame com um clique.' },
  clubDBNoResults: { PL: 'Brak wyników wyszukiwania.', EN: 'No search results.', PT: 'Sem resultados.' },
  clubDBEmpty: { PL: 'Baza klubowa jest pusta.', EN: 'Club database is empty.', PT: 'Banco do clube está vazio.' },
  onMat: { PL: 'NA MACIE', EN: 'ON MAT', PT: 'NO TATAME' },
  searchByName: { PL: 'Szukaj po imieniu...', EN: 'Search by name...', PT: 'Buscar por nome...' },
  addSelected: { PL: 'DODAJ', EN: 'ADD', PT: 'ADICIONAR' },
  vipModalTitle: { PL: 'ZAWODNICY BEZ PAUZY', EN: 'NO-REST PLAYERS', PT: 'LUTADORES SEM DESCANSO' },

  // ── ABOUT MODAL ──
  aboutTitle: { PL: 'Z NIM NIE ROBIĘ', EN: 'Z NIM NIE ROBIĘ', PT: 'Z NIM NIE ROBIĘ' },
  aboutVersion: { PL: 'Wersja V2', EN: 'Version V2', PT: 'Versão V2' },
  aboutDescription: { PL: 'Aplikacja treningowa do zarządzania parami, rundami i rotacją zawodników podczas treningów BJJ.', EN: 'Training app for managing pairs, rounds and player rotation during BJJ training sessions.', PT: 'Aplicativo de treino para gerenciar duplas, rodadas e rotação de lutadores durante treinos de BJJ.' },

  // ── VALIDATION MESSAGES ──
  errNoName: { PL: 'Podaj pseudonim zawodnika!', EN: 'Enter player nickname!', PT: 'Insira o apelido do lutador!' },
  errNoWeight: { PL: 'Podaj prawidłową wagę!', EN: 'Enter a valid weight!', PT: 'Insira um peso válido!' },
  errDuplicate: { PL: 'Zawodnik już dodany!', EN: 'Player already added!', PT: 'Lutador já adicionado!' },
  errMinPlayers: { PL: 'Musisz dodać przynajmniej dwóch zawodników!', EN: 'You need at least two players!', PT: 'Você precisa de pelo menos dois lutadores!' },
  errRoundTime: { PL: 'Czas rundy musi być większy od 0!', EN: 'Round time must be greater than 0!', PT: 'Tempo da rodada deve ser maior que 0!' },
  errRoundsTotal: { PL: 'Liczba rund musi być większa od 0!', EN: 'Number of rounds must be greater than 0!', PT: 'Número de rodadas deve ser maior que 0!' },
  errPrepTime: { PL: 'Czas przygotowania musi być większy od 0!', EN: 'Prep time must be greater than 0!', PT: 'Tempo de preparação deve ser maior que 0!' },
  errRestTime: { PL: 'Czas przerwy musi być większy od 0!', EN: 'Rest time must be greater than 0!', PT: 'Tempo de descanso deve ser maior que 0!' },
  errWeightDivision: { PL: 'Podział wagowy wymaga min. 2 zawodników w każdej grupie wagowej!', EN: 'Weight division requires at least 2 players in each weight group!', PT: 'Divisão de peso requer no mínimo 2 lutadores em cada grupo!' },
  errSelectDropout: { PL: 'Wybierz przynajmniej jednego zawodnika, który wypadł z treningu.', EN: 'Select at least one player who dropped out.', PT: 'Selecione pelo menos um lutador que saiu do treino.' },

  // ── CONFIRM DIALOGS ──
  confirmDeleteTitle: { PL: 'Usuń zawodnika', EN: 'Remove player', PT: 'Remover lutador' },
  confirmDeleteMsg: { PL: 'Czy na pewno chcesz usunąć', EN: 'Are you sure you want to remove', PT: 'Tem certeza que deseja remover' },
  confirmDeleteFromMat: { PL: 'z maty?', EN: 'from the mat?', PT: 'do tatame?' },
  confirmNewTraining: { PL: 'Nowy Trening', EN: 'New Session', PT: 'Novo Treino' },
  confirmClearMat: { PL: 'Czy na pewno chcesz wyczyścić matę z zawodników?', EN: 'Are you sure you want to clear the mat?', PT: 'Tem certeza que deseja limpar o tatame?' },

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

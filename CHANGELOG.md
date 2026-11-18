# Historia zmian w projekcie Z NIM NIE ROBIĘ

Zestawienie zmian wprowadzanych w kolejnych wydaniach aplikacji według konwencji [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/) oraz [Semantic Versioning](https://semver.org/lang/pl/).

Pozostałe wersje językowe znajdziesz w plikach [English](CHANGELOG.en.md) oraz [Português (BR)](CHANGELOG.pt-BR.md).

## [2.3.0] (2026-11-18)

Przejście na Expo SDK 58, React Native 0.88.1 oraz nowy silnik dźwięku `expo-audio`, połączone z redakcją komunikatów interfejsu, strony polityki prywatności i dokumentacji projektu.

### Zmienione
- Podniesiono główny stos uruchomieniowy do Expo SDK 58 (`58.0.23`), Expo Router `58.0.30`, React Native `0.88.1`, React `19.3.1`, AsyncStorage `3.1.1`, Gesture Handler `3.5.0`, Reanimated `4.7.1` oraz TypeScript `6.0.3`.
- Zastąpiono wycofany pakiet `expo-av` biblioteką `expo-audio` (`58.0.12`) skonfigurowaną bez uprawnienia dostępu do mikrofonu (`RECORD_AUDIO`), z zachowaniem odtwarzania gongu, podwójnego sygnału na 10 sekund przed końcem i przyciszenia muzyki w tle.
- Przebudowano obsługę przejść między fazami zegara z użyciem `useEffectEvent` oraz wykrywanie motywu w przeglądarce z użyciem `useSyncExternalStore`.
- Uproszczono komunikaty błędów walidacji, podpowiedzi opcji sparingowych, treść strony `/privacy` oraz dokumentację w trzech językach.
- Wersja aplikacji podniesiona do `2.3.0`, `android.versionCode` z `13` na `15`, `ios.buildNumber` z `2` na `3`.

## [2.2.0] (2026-11-15)

Przyspieszenie solvera dobierającego pary, rozbudowa okna bazy klubowej oraz poprawki układu na wąskich telefonach i w przeglądarce.

### Dodane
- Trwałe usuwanie zawodników bezpośrednio w oknie bazy klubowej za pomocą ikony kosza z potwierdzeniem.
- Przycisk anulowania edycji zawodnika i pasek błędu walidacji pod formularzem składu.
- Skróty klawiaturowe w przeglądarce (`Spacja` zatrzymuje i wznawia zegar, `Escape` zamyka otwarte okna i dymki pomocy, `Enter` zatwierdza formularz zawodnika, strzałki przesuwają suwak priorytetu).
- Pełne tłumaczenie strony polityki prywatności `/privacy` na brazylijski portugalski.
- Zestaw testów jednostkowych sprawdzających dobór par, rotację trójek i walidację danych (`npm test`).

### Zmienione
- Solver par oparto na programowaniu dynamicznym na maskach bitowych i tablicach indeksowanych, dzięki czemu dokładne wyliczenie obejmuje grupy do 12 osób zamiast 10, a pełna mata na 46 osób liczy się około 13 razy szybciej.
- Odliczanie rund spięto bezpośrednio z zegarem systemowym, co usuwa gubienie sekund na długich rundach i w nieaktywnych kartach przeglądarki.
- Na wąskich ekranach telefonów (360 px) podział wagowy układa się pionowo, a przyciski w oknach modalnych mieszczą się bez przycinania tekstu.
- Skrypt publikacji WWW pobiera kopię zapasową wyłącznie nadpisywanych plików aplikacji i weryfikuje certyfikat TLS serwera.
- Wersja aplikacji podniesiona z `2.1.0` do `2.2.0`, `android.versionCode` z `12` na `13`, `ios.buildNumber` z `1` na `2`.

### Naprawione
- Pary mieszane (`KID + ADULT`) wyświetlają się na siatce w trybach zadaniówek dwójkowych oraz drilli.
- Samotny dorosły trenujący z grupą dzieci w zadaniówkach trójkowych trafia zawsze do grupy zamiast znikać z widoku.
- Priorytet walk kobiecych zlicza zamknięte kolejki osobno dla dzieci i dorosłych, działa razem z podziałem wagowym i szanuje listę zawodników bez pauzy.
- Dziecko w kimonie `GI` dołączone do grupy dorosłych zachowuje pierwszeństwo parowania z dorosłym w `GI` także w dalszych rundach.
- Okno wypisywania zawodnika w trakcie zajęć działa w podziale wagowym i w fazie walki, a odpoczynek na jedną rundę przywraca osobę we wszystkich trybach treningu.
- Przerwa w trybie drilli wyświetla nagłówek `PRZERWA` oraz role `PRACA` i `ASYSTA` na kolejną rundę, a start sesji uwzględnia ustawiony czas przygotowania.
- Pole wagi przyjmuje ułamki z przecinkiem (np. `82,5`), pilnuje przedziału od 10 do 300 kg i blokuje powielenie pseudonimu przy edycji.
- Wersja przeglądarkowa nie zgłasza błędu `WakeLock` w ukrytej karcie i sama wznawia blokadę ekranu po powrocie na kartę.
- Usunięto wyciek obiektów dźwiękowych przy wielokrotnym uruchamianiu treningu.

## [2.1.0] (2026-05-29)

Domknięcie tłumaczeń angielskich i portugalskich na ekranie aktywnego zegara oraz rozdzielenie zrzutów ekranu na wersje językowe.

### Naprawione
- Przetłumaczono zaszyte wcześniej po polsku napisy na ekranie zegara, w tym fazy `BREAK` i `INTERVALO`, nagłówki grup mieszanych (`MIXED` oraz `MISTO`), komunikaty zmiany grup w trójkach i licznik etapu (`Stage` oraz `Etapa`).

### Zmienione
- Zrzuty ekranu w plikach `README` rozdzielono na osobne podkatalogi `Screenshots/pl`, `Screenshots/en` oraz `Screenshots/pt`.
- Wersja aplikacji podniesiona z `2.0.5` do `2.1.0`, a `android.versionCode` do `11` i `12`.

## [2.0.5] (2026-05-25)

Pierwsze wydanie zaakceptowane i opublikowane w sklepie Google Play w trzech językach (polskim, angielskim i portugalskim).

### Zmienione
- Uspokojono wygląd ekranu ustawień przez lżejsze kroje pisma (500 i 600), większe odstępy między sekcjami oraz płaskie karty czasu i przełączniki bez ciężkich cieni.
- Przełącznik `GOŚĆ` zyskał ten sam kształt co przyciski kategorii, płci i stroju, z fioletowym podświetleniem po kliknięciu.
- `android.versionCode` podniesiony z `9` na `10`.

### Naprawione
- Po obróceniu ekranu z pionu do poziomu (lub z powrotem) główna lista ustawień przewija się automatycznie na samą górę zamiast zatrzymywać się w połowie składu.

## [2.0.4-beta] (2026-05-07)

### Dodane
- Przełącznik `GOŚĆ` na karcie zawodnika oznaczany fioletową ikoną samolotu przed pseudonimem.
- Algorytm unika zestawiania dwóch gości ze sobą z priorytetem wyższym niż strój, waga i staż, łącząc ich w parę wyłącznie wtedy, gdy matematycznie nie ma innego wyjścia.
- Oznaczenie gościa działa tylko w bieżącej sesji i nie zapisuje się na stałe w bazie klubowej.

## [2.0.3-beta] (2026-04-22)

### Naprawione
- Pasek z listą osób odpoczywających wyświetla się w fazie przygotowania oraz w trakcie przerwy między rundami.

## [2.0.2-beta] (2026-04-20)

### Naprawione
- Blokada wygaszania ekranu przeniesiona do głównego układu aplikacji i wzmocniona jawnym wywołaniem `activateKeepAwakeAsync`, dzięki czemu tablet na ścianie nie gaśnie podczas rundy.

## [2.0.1-beta] (2026-04-20)

### Zmienione
- Wspólna siatka par na ekranie przygotowania zamiast osobnych kolumn z kolorowym oznaczeniem kategorii (`KID GI`, `KID NO-GI`, `ADULT GI`, `ADULT NO-GI` oraz pary mieszane) i legendą na górnym pasku.
- Para dostaje oznaczenie `GI` tylko wtedy, gdy obie osoby trenują w kimonie.
- Lista pauzujących wyświetla się bezpośrednio obok nagłówka fazy, zostawiając więcej miejsca na kafelki par.

### Dodane
- Dwa tryby w oknie wypisywania z treningu pozwalające zdjąć zawodnika do końca zajęć albo dać mu jedną rundę odpoczynku z automatycznym powrotem.

## [2.0.0-beta] (2026-04-20)

### Dodane
- Nowy tryb drilli ze stałymi parami na cały trening i zamianą ról A oraz B co rundę.
- Podział zadaniówek na trójki (sześć etapów rotacji) oraz dwójki (zamiana ról w połowie rundy).
- Wybór płci na karcie zawodnika oraz filtr walk kobiecych (wyłączony, priorytet lub osobne grupy).
- Czterostopniowy suwak ważący między stażem a wagą, opcjonalny podział maty na dwie grupy wagowe oraz wybór kolejności walk.
- Ekran wyboru języka przy pierwszym uruchomieniu, okno zawodników bez pauzy, ekran końcowy z podziękowaniem, karta informacyjna o wersji i podgląd nowych par już w czasie przerwy.

### Zmienione
- Rozmiar kart w trójkach i dwójkach dopasowany do tabletów o przekątnej 10,5 cala bez przewijania widoku.
- Poprawione utrzymanie priorytetu dźwięku na Androidzie.

### Naprawione
- Pojedyncze wyzwalanie ostrzeżenia na 10 sekund przed końcem rundy oraz równiejsza rotacja pauz w trybie dwójek.

## [1.0.0] (2026-04-18)

Pierwsze zamknięte wydanie testowe rozpowszechniane bezpośrednio w pliku APK poza sklepem Google Play.

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


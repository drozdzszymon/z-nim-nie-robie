# Changelog

Wszystkie istotne zmiany w projekcie **Z NIM NIE ROBIĘ** dokumentowane są w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), wersjonowanie wg [Semantic Versioning](https://semver.org/lang/pl/).

🌐 **Inne języki:** [🇬🇧 English](CHANGELOG.en.md) · [🇧🇷 Português (BR)](CHANGELOG.pt-BR.md)

---

## [2.2.0] - 2026-11-15 - Szybszy matchmaker, poprawki logiki i mobilnego UI

Duża aktualizacja stabilności i wydajności silnika, uzupełnienie brakujących funkcji w bazie klubowej oraz poprawki widoków na wąskich ekranach i w przeglądarce.

### Dodane
- Trwałe usuwanie zawodników z bazy klubowej (ikona kosza w oknie bazy klubowej z potwierdzeniem).
- Przycisk anulowania edycji zawodnika oraz czytelny komunikat błędu pod formularzem składu.
- Obsługa klawiatury w wersji webowej: `Spacja` pauzuje i wznawia zegar, `Escape` zamyka otwarte okna i podpowiedzi, `Enter` zatwierdza formularz zawodnika, strzałki sterują suwakiem priorytetu.
- Portugalska wersja językowa (PT-BR) strony polityki prywatności pod `/privacy`.
- Zestaw testów jednostkowych silnika doboru par, rotacji trójek i walidacji danych (`npm test`).

### Zmienione
- Zoptymalizowany silnik matchmakera (programowanie dynamiczne na maskach bitowych i preindeksacja par): dokładny solver obsługuje teraz grupy do 12 osób (zamiast 10), a dobór dla sali 46 zawodników działa ok. 13x szybciej.
- Zegar rundy oparty na realnym czasie systemowym zamiast zwykłego interwału sekundowego, bez opóźnień przy przełączaniu kart i długich rundach.
- Układ ekranów na wąskich telefonach (360 px): podział wagowy układa się pionowo, a przyciski i wiersze w oknach modalnych nie wychodzą poza ekran.
- Skrypt wdrożeniowy WWW wykonuje selektywną kopię zapasową plików aplikacji i weryfikuje certyfikat TLS hostingu.
- Android `versionCode`: 12 -> 13; iOS `buildNumber`: 1 -> 2; wersja aplikacji: 2.1.0 -> 2.2.0.

### Naprawione
- Pary mieszane (`KID + ADULT`) wyświetlają się poprawnie w trybach `ZADANIÓWKI (DWÓJKI)` oraz `DRILLE`.
- Pojedynczy dorosły przy grupie dzieci w `ZADANIÓWKACH (TRÓJKI)` jest zawsze dołączany do grupy zamiast znikać z siatki.
- Walki wg płci w trybie `PRIORYTET` sprawdzają rozegrane pary osobno dla `KID` i `ADULT`, współpracują z podziałem wagowym i respektują oznaczenie `BEZ PAUZY (VIP)`.
- Promowane dziecko w `GI` zachowuje priorytet doboru z dorosłym w `GI` w kolejnych rundach.
- Okno `KTOŚ WYPADŁ?` działa również w trybie podziału wagowego i w trakcie fazy pracy, a opcja `ODPOCZYWA 1 RUNDĘ` przywraca zawodnika we wszystkich trybach treningu.
- W trybie `DRILLE` przerwa pokazuje właściwy nagłówek `PRZERWA` oraz role `PRACA / ASYSTA` na następną rundę, a start respektuje ustawiony czas przygotowania.
- Pole wagi obsługuje przecinek (np. `82,5`), pilnuje zakresu `10-300 kg` i blokuje duplikaty nazw także przy edycji zawodnika.
- Wersja webowa nie rzuca błędu `WakeLock` w nieaktywnej karcie i automatycznie odnawia blokadę ekranu po powrocie do karty.
- Brak wycieku instancji `Audio.Sound` przy kolejnych startach treningu.

## [2.1.0] — 2026-05-29 — Dokończona lokalizacja EN / PT

Wersja finalna. Domknięcie tłumaczeń — ostatnie napisy zaszyte po polsku na ekranie treningu / timera są teraz w pełni przetłumaczone na EN i PT-BR.

### Naprawione
- Etykieta fazy **PRZERWA** → `BREAK` / `INTERVALO`.
- Etykieta grupy **MIESZANE** → `MIXED` / `MISTO`.
- Podpowiedzi rotacji w TRÓJKACH (**WALCZY / ZMIANA GRUP / WCHODZĄ / NASTĘPNI**) → pełne tłumaczenia EN/PT.
- Etykieta **ZMIANA GRUP** → `GROUP SWITCH` / `TROCA DE GRUPOS`.
- Licznik postępu **Etap X/Y** → `Stage` / `Etapa`.

### Zmienione
- Zrzuty ekranu w README rozdzielone na osobne katalogi językowe (`Screenshots/pl|en|pt`).
- Android `versionCode`: 10 → 11; wersja aplikacji: 2.0.5 → 2.1.0.

## [2.0.5] — 2026-05-25 — Wydanie produkcyjne (Google Play)

Pierwsza wersja zaakceptowana przez Google Play. Aplikacja dostępna na Androida w 3 językach (PL / EN / PT-BR).

### Zmienione
- Odświeżony wygląd ekranu ustawień w stylu „Apple/iOS minimal": cieńsze fonty (500/600), większe paddingi, płaskie przyciski bez cieni.
- Przycisk **GOŚĆ** ujednolicony z innymi przełącznikami (M/K, ADULT/KID, GI/NO-GI) — fioletowe podświetlenie zamiast okrągłego znacznika.
- Subtelniejsze pigułki badge (ADULT, NO-GI, ♂/♀) bez cieni.
- Android `versionCode`: 9 → 10; `autoIncrement` wyłączony (kontrola ręczna).

### Naprawione
- Outer ScrollView ekranu ustawień wraca na górę przy każdej zmianie orientacji (portrait ↔ landscape).

## [2.0.4-beta] — 2026-05-07 — Goście z innego klubu

### Dodane
- Przełącznik **`GOŚĆ`** w karcie zawodnika (`○ GOŚĆ` / `✈ GOŚĆ`), fioletowa ikona ✈ przed pseudonimem.
- Matchmaker unika par **GOŚĆ–GOŚĆ** z priorytetem wyższym niż strój/waga/poziom; łamane tylko gdy brak alternatywy.
- Status gościa per-trening (nie zapisuje się w bazie klubowej).

## [2.0.3-beta] — 2026-04-22 — Lista odpoczywających w PRZERWIE

### Naprawione
- Lista **„KTO ODPOCZYWA"** widoczna w obu fazach (PRZYGOTOWANIE oraz PRZERWA) — wcześniej tylko PRP.

## [2.0.2-beta] — 2026-04-20 — Keep awake

### Naprawione
- Ekran nie wyłącza się podczas timera: `useKeepAwake` na poziomie root layout + jawne `activateKeepAwakeAsync` (belt-and-suspenders).

## [2.0.1-beta] — 2026-04-20 — Zunifikowany ekran PRZYGOTOWANIE

### Zmienione
- Zlikwidowany podział na osobne kolumny KID / ADULT / ODPOCZYWA — wszystkie pary w jednym, gęstym gridzie.
- Kolorowanie wg kategorii: KID GI (niebieski), KID NO-GI (cyan), ADULT GI (pomarańczowy), ADULT NO-GI (czerwony), MIESZANE (gradient). Legenda w topbarze.
- Reguła GI dla pary: liczy się jako GI tylko gdy **obaj** w GI.
- „ODPOCZYWA" inline obok napisu PRZYGOTOWANIE (zamiast osobnej kolumny).

### Dodane
- Modal „Kto wypadł?" — dwa tryby per zawodnik: **WYPADŁ** (na stałe) lub **ODPOCZYWA 1 RUNDĘ** (wraca w kolejnej).

## [2.0.0-beta] — 2026-04-20 — Nowe tryby + matchmaker 2.0

### Dodane
- Tryb **DRILLE** — pary stałe na cały trening, rotacja ról A/B co rundę.
- **ZADANIÓWKI** rozdzielone na **TRÓJKI** (6 etapów rotacji) i **DWÓJKI** (zamiana A↔B).
- Pole **płeć (M / K)** w karcie zawodnika.
- **Walki wg płci** — WYŁ / PRIORYTET / ZAWSZE.
- Suwak **Priorytet doboru** — UMIEJĘTNOŚCI ↔ WAGA (4 snapy).
- **Podział wagowy** — opcjonalne dzielenie maty na dwie grupy.
- **Kolejność walk** — ZBLIŻONE / RÓŻNE / LOSOWO.
- Ekran wyboru języka przy starcie (PL / EN / PT).
- Modal **„Bez pauzy (VIP)"** z pigułkami imion zawodników.
- Ekran końcowy **„DZIĘKUJĘ — DOBRA ROBOTA!"**.
- Panel **WERSJA V2** (kontakt, GitHub, sklep).
- Podgląd nowych par już w trakcie przerwy.

### Zmienione
- Zoptymalizowane karty trójek i dwójek pod tablety 10.5" — bez przewijania.
- Stabilniejszy audio focus na Androidzie.

### Naprawione
- Dźwięk 10 sekund przed końcem nie powtarza się.
- Poprawiona rotacja pauz w trybie DWÓJKI.

## [1.0.0] — 2026-04-18 — Pierwsze wydanie

Pierwsza zamknięta wersja (development, dystrybucja przez APK). Nieobecna w Google Play.

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

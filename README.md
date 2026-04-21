# 🥋 Z NIM NIE ROBIĘ

<p align="center">
  <img src="Images/LOGO_PL.png" alt="Z NIM NIE ROBIĘ — logo" width="260" />
</p>

<p align="center">
  <b>Inteligentna aplikacja treningowa do prowadzenia sparingów, zadaniówek i drilli BJJ.</b><br/>
  Automatyczny dobór par · Duże timery · Rotacja w trójkach · Czytelny podgląd z dystansu
</p>

<p align="center">
  <img src="https://img.shields.io/badge/wersja-2.0.2%20Beta-orange" alt="Wersja" />
  <img src="https://img.shields.io/badge/platforma-Android%20%7C%20iOS%20%7C%20Web-blue" alt="Platforma" />
  <img src="https://img.shields.io/badge/framework-Expo%20%2B%20React%20Native-blueviolet" alt="Framework" />
  <img src="https://img.shields.io/badge/język-TypeScript-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/i18n-PL%20%7C%20EN%20%7C%20PT-orange" alt="Języki" />
</p>

<p align="center">
  <a href="https://znimnierobie.pl"><b>▶ Wypróbuj wersję webową</b></a>
</p>

---

## Spis treści

- [Co nowego w v2.0.2 Beta](#co-nowego-w-v202-beta)
- [O aplikacji](#o-aplikacji)
- [Zrzuty ekranu](#zrzuty-ekranu)
- [Tryby treningowe](#tryby-treningowe)
- [Silnik doboru par (Matchmaker)](#silnik-doboru-par-matchmaker)
- [Główne funkcje](#główne-funkcje)
- [Stack technologiczny](#stack-technologiczny)
- [Struktura projektu](#struktura-projektu)
- [Uruchomienie](#uruchomienie)
- [Wersja webowa](#wersja-webowa)
- [Prywatność](#prywatność)
- [Licencja](#licencja)

---

## Co nowego w v2.0.2 Beta

### 🔴 Krytyczna poprawka (v2.0.2)

- **Ekran nie wyłącza się już podczas działania timera** — `useKeepAwake` przeniesiony na poziom root layout + jawna aktywacja `activateKeepAwakeAsync`. Tablet zamontowany na ścianie nie zgaśnie w trakcie sparingów ani zadaniówek.

### 🟢 Nowości z cyklu 2.0.x Beta

- **Zunifikowany ekran PRZYGOTOWANIE** — koniec dzielenia siatki na osobne kolumny KID / ADULT / ODPOCZYWA. Wszystkie pary w jednym, gęstym gridzie z **kolorowaniem wg kategorii** i **legendą w topbarze**:
  - 🟦 **KID GI** (niebieski)
  - 🩵 **KID NO-GI** (cyan)
  - 🟧 **ADULT GI** (pomarańczowy)
  - 🟥 **ADULT NO-GI** (czerwony)
  - 🟪 **MIESZANE** (gradient — KID + ADULT)
- **Reguła GI dla pary** — para liczy się jako GI tylko jeśli **obaj** są w GI; wystarczy jeden NO-GI i cała para jest NO-GI
- **Inline ODPOCZYWA przy PRZYGOTOWANIE** — kto pauzuje pisze się obok nagłówka fazy, a nie w osobnej kolumnie (więcej miejsca na kafelki par)
- **Dwutrybowe odpadanie zawodników** — w modalu „KTO WYPADŁ?" przy każdej osobie dwa przyciski:
  - **WYPADŁ** — usuwany z całego treningu
  - **ODPOCZYWA 1 RUNDĘ** — wraca automatycznie w kolejnej rundzie

### 🟢 Bazowe funkcje 2.0.0 Beta

- **Ekran startowy z wyborem języka** — PL / EN / PT (BR) widoczne od pierwszego uruchomienia
- **Trzy tryby treningowe** — SPARINGI · ZADANIÓWKI (TRÓJKI / DWÓJKI) · **DRILLE** (pełnoprawny tryb z parami stałymi i rotacją ról A/B co rundę)
- **Pole płeć (M / K)** w karcie zawodnika oraz **Walki wg płci** w opcjach sparingów (WYŁ / PRIORYTET / ZAWSZE)
- **Suwak Priorytet doboru** UMIEJĘTNOŚCI ↔ WAGA (4 snapy)
- **Podział wagowy** — opcjonalne dzielenie maty na dwie grupy wagowe
- **Kolejność walk** — ZBLIŻONE / RÓŻNE / LOSOWO
- **Bez pauzy (VIP)** w czytelnym układzie pigułek z imionami zawodników
- **Ekran końcowy „DZIĘKUJĘ — DOBRA ROBOTA!"** z powrotem do menu
- **Panel WERSJA V2** — kontakt, link do GitHuba i sklepu, krótki opis
- **Zoptymalizowane karty trójek i dwójek** pod tablety 10.5" — bez przewijania na typowych rozdzielczościach

---

## O aplikacji

**Z NIM NIE ROBIĘ** to narzędzie dla trenerów BJJ i grapplingu, którzy prowadzą treningi z tabletem ustawionym na ścianie lub przy macie. Zamiast kartek, stopera i ręcznego ustawiania par — jedno urządzenie robi wszystko:

- **automatycznie dobiera pary** na podstawie wagi, poziomu, stroju (GI / NO-GI) i płci,
- **pilnuje timerów** z sygnałami dźwiękowymi na przygotowanie, pracę i przerwę,
- **rotuje trójki i dwójki** w zadaniówkach z czytelnym podziałem na walczących i odpoczywającego,
- **prowadzi drille** z parami dobieranymi raz na cały trening i zamianą ról A/B co rundę,
- **wyświetla wszystko czytelnie** — duże fonty, mocny kontrast, czytelność z kilku metrów,
- **mówi po polsku, angielsku i portugalsku (BR)**.

Aplikacja działa offline, nie wymaga konta ani logowania. Dane zawodników zapisywane są lokalnie na urządzeniu.

---

## Zrzuty ekranu

### Wybór języka

Pierwsze uruchomienie — szybki wybór wersji językowej. Aplikację można w dowolnej chwili przełączyć między **PL / EN / PT** z dolnego paska.

<p align="center">
  <img src="Screenshots/1.png" alt="Ekran wyboru języka" width="90%" />
</p>

### Ekran startowy (pusta mata)

Konfiguracja treningu: dodawanie zawodników (lewy panel), czas i rytm rund, wybór trybu treningowego oraz opcji matchmakera. Po prawej miejsce na kafelki zawodników.

<p align="center">
  <img src="Screenshots/2.png" alt="Pusty ekran startowy aplikacji" width="90%" />
</p>

### Edycja zawodnika

Pełna karta zawodnika: pseudonim, waga, kategoria (KID / ADULT), strój (GI / NO-GI), płeć (M / K) i poziom (POCZ. / ŚR.ZAAW. / ZAAW. / PRO). Dotknięcie kafelka otwiera tę samą formę do edycji.

<p align="center">
  <img src="Screenshots/3.png" alt="Edycja zawodnika — formularz" width="90%" />
</p>

### Baza klubowa — wyszukiwanie

Modal **BAZA KLUBOWA** z listą zapamiętanych zawodników. Wyszukiwarka po imieniu, dodawanie pojedynczo przyciskiem **WYBIERZ**.

<p align="center">
  <img src="Screenshots/4.png" alt="Baza klubowa — lista i wyszukiwarka" width="90%" />
</p>

### Baza klubowa — wsadowe dodawanie

Zaznaczenie wielu osób naraz i dorzucenie ich na matę jednym kliknięciem **DODAJ (n)**. Kafelki podświetlają się na niebiesko.

<p align="center">
  <img src="Screenshots/5.png" alt="Baza klubowa — wsadowe dodawanie zawodników" width="90%" />
</p>

### Skład zawodników na macie

Zawodnicy posegregowani alfabetycznie z filtrami u góry (KID / ADULT / GI / NO-GI / poziom). Każda karta pokazuje strój, kategorię, płeć, wagę i poziom. Czerwony „×" usuwa, dotknięcie edytuje.

<p align="center">
  <img src="Screenshots/6.png" alt="Skład zawodników na macie — siatka kafelków" width="90%" />
</p>

### Tryb SPARINGI

Klasyczny sparing z pełnym panelem opcji: **BEZ PAUZY (VIP)**, **PRIORYTET DOBORU** (suwak UMIEJĘTNOŚCI ↔ WAGA), **KOLEJNOŚĆ WALK** (ZBLIŻONE / RÓŻNE / LOSOWO), **PODZIAŁ WAGOWY** oraz **WALKI WG PŁCI** (WYŁ / PRIORYTET / ZAWSZE).

<p align="center">
  <img src="Screenshots/7.png" alt="Tryb sparingów — opcje matchmakera" width="60%" />
</p>

### Tryb ZADANIÓWKI (trójki / dwójki)

Po wybraniu zadaniówek pojawia się przełącznik **TRÓJKI / DWÓJKI**. Etykieta przycisku startu zmienia się odpowiednio (`START ZADANIÓWEK (TRÓJKI)` / `(DWÓJKI)`).

<p align="center">
  <img src="Screenshots/8.png" alt="Tryb zadaniówek — wybór trójki/dwójki" width="60%" />
</p>

### Tryb DRILLE

Pary dobierane **raz na cały trening**, role A/B zamieniają się co rundę. Idealne do powtarzania techniki z tym samym partnerem.

<p align="center">
  <img src="Screenshots/9.png" alt="Tryb drille — opis i przycisk startu" width="60%" />
</p>

### Sparingi — przygotowanie

Faza **PRZYGOTOWANIE** rundy 1/5: siatka par podzielona na sekcje **KID**, **ADULT** i **MIESZANE**. Timer odlicza czas na rozejście się na pozycje. Pary dobrane przez silnik matchmakera.

<p align="center">
  <img src="Screenshots/10.png" alt="Sparingi — przygotowanie par" width="90%" />
</p>

### Sparingi — timer pracy

Duży, czytelny timer widoczny z dystansu. Numer rundy na górze. Przyciski **PAUZA** i **ZAKOŃCZ** pod ręką.

<p align="center">
  <img src="Screenshots/11.png" alt="Sparingi — timer pracy" width="90%" />
</p>

### Sparingi — przerwa i nowe pary

Faza **PRZERWA** rundy 2/5: na ekranie już widać nowy układ par dobrany na kolejną rundę. Trener może omówić co poprawić zanim padnie gong.

<p align="center">
  <img src="Screenshots/12.png" alt="Sparingi — przerwa z podglądem nowych par" width="90%" />
</p>

### Zadaniówki w trójkach — przygotowanie

Siatka trójek z podziałem na role: **[A] DÓŁ**, **[B] GÓRA**, **[C] PAUZA / ASYSTA**. Sekcje KID i ADULT obok siebie, czytelne nawet z drugiego końca sali.

<p align="center">
  <img src="Screenshots/13.png" alt="Zadaniówki w trójkach — przygotowanie" width="90%" />
</p>

### Zadaniówki w trójkach — timer ze zmianą

Timer etapu z informacją o aktualnym kroku rotacji (**Etap 2/6 — ZMIANA!**). Pod timerem aktualny układ ról oraz **NASTĘPNA ZMIANA**, dzięki czemu nikt się nie gubi.

<p align="center">
  <img src="Screenshots/14.png" alt="Zadaniówki w trójkach — timer i informacja o zmianie" width="90%" />
</p>

### Zadaniówki w dwójkach — przygotowanie

Pary A vs B w czytelnej siatce z oznaczeniem ról **[A]** i **[B]**. Po pierwszym etapie role się zamieniają. Bez strefy odpoczynku.

<p align="center">
  <img src="Screenshots/15.png" alt="Zadaniówki w dwójkach — przygotowanie" width="90%" />
</p>

### Zadaniówki w dwójkach — timer

Timer **Etap 1/2 — PRACA**. Informacja o aktualnych rolach i nadchodzącej zamianie tuż pod timerem.

<p align="center">
  <img src="Screenshots/16.png" alt="Zadaniówki w dwójkach — timer i zamiana ról" width="90%" />
</p>

### Ktoś wypadł z treningu

W dowolnym momencie treningu można oznaczyć zawodników, którzy wypadli (kontuzja, zmęczenie, telefon). Czas się zatrzymuje, można zaznaczyć kilka osób naraz i zatwierdzić jednym kliknięciem **OK**. System przebudowuje pary na żywo — bez restartu treningu.

<p align="center">
  <img src="Screenshots/17.png" alt="Modal — kto wypadł z treningu" width="90%" />
</p>

### Zawodnicy bez pauzy (VIP)

Modal z listą wszystkich zawodników jako pigułki. Tapnięcie oznacza, że ktoś **nie odpoczywa** między rundami (trener, najbardziej zaawansowani, gość specjalny). System pomija ich przy rotacji pauz.

<p align="center">
  <img src="Screenshots/18.png" alt="Modal — zawodnicy bez pauzy (VIP)" width="90%" />
</p>

### Panel WERSJA V2

Karta informacyjna z kontaktem (e-mail), linkiem do repozytorium GitHub oraz do sklepu **mantoshop.pl**. Otwierana ikoną „i" z dolnego paska.

<p align="center">
  <img src="Screenshots/19.png" alt="Panel informacyjny — wersja V2" width="90%" />
</p>

### Ekran końcowy

Po zakończeniu treningu — duże **DZIĘKUJĘ** i przycisk powrotu do menu. Krótko, czytelnie, bez ekranów-śmieci.

<p align="center">
  <img src="Screenshots/20.png" alt="Ekran końcowy — DZIĘKUJĘ, DOBRA ROBOTA!" width="90%" />
</p>

---

## Tryby treningowe

### ⚔️ Sparingi

Klasyczny tryb sparingowy. Cykl każdej rundy:

1. **Przygotowanie** — wyświetlenie par, czas na rozejście się na pozycje
2. **Praca** — duży timer, walka
3. **Przerwa** — odpoczynek, system generuje i pokazuje nowe pary na kolejną rundę

System pamięta historię spotkań i dba o to, żeby zawodnicy nie powtarzali tych samych par. Dodatkowe opcje:

- **Priorytet doboru** — suwak: UMIEJĘTNOŚCI ↔ WAGA (cztery snapy)
- **Kolejność walk** — ZBLIŻONE / RÓŻNE / LOSOWO
- **Podział wagowy** — dzieli matę na dwie grupy wagowe walczące naprzemiennie
- **Walki wg płci** — WYŁ / PRIORYTET / ZAWSZE

### 🔄 Zadaniówki w trójkach

Trzy osoby w grupie, sześć etapów na rundę — pełna rotacja. W każdym etapie dwóch walczy, trzeci odpoczywa lub asystuje:

| Etap | [A] DÓŁ | [B] GÓRA | [C] PAUZA |
|:----:|:-------:|:--------:|:---------:|
| 1 | Osoba 1 | Osoba 2 | Osoba 3 |
| 2 | Osoba 1 | Osoba 3 | Osoba 2 |
| 3 | Osoba 2 | Osoba 1 | Osoba 3 |
| 4 | Osoba 2 | Osoba 3 | Osoba 1 |
| 5 | Osoba 3 | Osoba 1 | Osoba 2 |
| 6 | Osoba 3 | Osoba 2 | Osoba 1 |

Po 6 etapach każdy walczył z każdym z obu pozycji. Czas etapu = czas rundy ÷ 6.

### 👥 Zadaniówki w dwójkach

Proste pary A vs B — dwa etapy na rundę. Po pierwszym etapie role się zamieniają (kto był na dole, idzie na górę). Czas etapu = czas rundy ÷ 2.

### 🥋 Drille

Pary dobierane **raz na cały trening** — ten sam partner do końca. Role A/B zamieniają się co rundę. Idealne do powtarzania techniki bez resetowania zaufania między partnerami co kilka minut.

---

## Silnik doboru par (Matchmaker)

Matchmaker **nie losuje** — dobiera pary algorytmicznie według priorytetów:

| Priorytet | Kryterium |
|:---------:|-----------|
| 1 | **Unikaj powtórek** — nowe pary mają pierwszeństwo, system pamięta historię spotkań |
| 2 | **Strój** — GI walczy z GI, NO-GI z NO-GI (gdy brak opcji, strój jest pomijany) |
| 3 | **Płeć** — opcjonalnie kobiety walczą najpierw ze sobą (PRIORYTET) lub tylko ze sobą (ZAWSZE) |
| 4 | **Poziom umiejętności** — zbliżony poziom (POCZ / ŚR.ZAAW / ZAAW / PRO) |
| 5 | **Waga** — zbliżona masa ciała |
| 6 | **Rotacja pauz** — sprawiedliwy podział kto odpoczywa (przy nieparzystej liczbie) |
| 7 | **Pary mieszane KID + ADULT** — tylko gdy wymaga tego liczebność grupy |

Suwak **PRIORYTET DOBORU** pozwala płynnie ważyć między umiejętnościami a wagą (4 snapy: 0 / 33 / 67 / 100). Gdy matematycznie nie da się uniknąć powtórki, system wybiera parę, która nie walczyła ze sobą najdłużej.

---

## Główne funkcje

- **Zarządzanie składem** — dodawanie, edycja i usuwanie zawodników z kafelkowego widoku
- **Baza klubowa** — szybkie dodawanie zapamiętanych zawodników z wyszukiwarką i wsadowym wyborem
- **Kategorie** — podział na KID i ADULT z osobnym matchmakingiem
- **Strój** — obsługa GI i NO-GI z priorytetem zgodności stroju
- **Poziomy** — POCZ., ŚR.ZAAW., ZAAW., PRO
- **Płeć** — M / K z opcjonalnym priorytetem walk damskich
- **Timer** — duży, czytelny zegar widoczny z kilku metrów
- **Sygnały dźwiękowe** — gong na start pracy, sygnał 10 sekund przed końcem, gong na przerwę, brawa na koniec
- **Bez pauzy (VIP)** — możliwość oznaczenia zawodników, którzy nie odpoczywają
- **Ktoś wypadł** — usunięcie zawodnika w trakcie treningu z automatycznym przeliczeniem par
- **Tryb DRILLE** — stałe pary na cały trening, rotacja ról A/B co rundę
- **Wielojęzyczność** — PL / EN / PT (BR) z wyborem przy starcie i z dolnego paska
- **Responsywny układ** — zoptymalizowany pod tablety 10.5", działa też na telefonach i w przeglądarce
- **Offline** — brak konta, brak backendu, dane zapisywane lokalnie (AsyncStorage)

---

## Stack technologiczny

| Warstwa       | Technologia                                  |
|---------------|----------------------------------------------|
| Framework     | [Expo](https://expo.dev/) + React Native     |
| Język         | TypeScript                                   |
| Routing       | Expo Router                                  |
| Dane lokalne  | AsyncStorage                                 |
| Audio         | expo-av                                      |
| Build         | EAS Build                                    |
| Web hosting   | Netlify                                      |
| Target        | Android (tablet 10.5"), iOS, przeglądarka    |

---

## Struktura projektu

```
app/
  (tabs)/
    index.tsx              # Główny UI — ekrany, timery, siatki par
    i18n.ts                # Tłumaczenia PL / EN / PT
    types.ts               # Typy domenowe (RealPlayer, Match, SparringOptions itp.)
    engine/
      matchmaker.ts        # Silnik doboru par i rotacji
assets/
  *.mp3                    # Dźwięki treningowe (gong, sygnał, brawa)
  images/                  # Ikony i splash screen
docs/
  privacy-policy.md        # Polityka prywatności
  play-store/              # Materiały do Google Play
Screenshots/               # Zrzuty ekranu (v2.0.2 Beta)
Images/                    # Logo i ikony aplikacji
plugins/                   # Pluginy Expo (np. ADI registration)
```

---

## Uruchomienie

```bash
# Instalacja zależności
npm install

# Serwer deweloperski
npx expo start

# Build APK (Android, do testów)
eas build --platform android --profile preview

# Build produkcyjny (Android, .aab)
eas build --platform android --profile production

# Export wersji webowej
npx expo export --platform web
```

---

## Wersja webowa

Aplikacja jest dostępna online pod adresem:

**https://znimnierobie.pl**

Wersja webowa działa w przeglądarce na komputerze, tablecie i telefonie. Nie wymaga instalacji.

---

## Prywatność

- Nie wymaga konta ani logowania
- Nie wysyła danych do zewnętrznych serwerów
- Nie korzysta z analityki ani trackerów
- Dane zawodników przechowywane wyłącznie lokalnie na urządzeniu

Pełna polityka prywatności: [docs/privacy-policy.md](docs/privacy-policy.md)

---

## Licencja

Wszelkie prawa zastrzeżone. Kod źródłowy udostępniony wyłącznie w celach przeglądowych.

---

<p align="center">
  <b>Z NIM NIE ROBIĘ</b> · v2.0.2 Beta · Aplikacja treningowa BJJ<br/>
  Zbudowane z 🥋 na macie i przy klawiaturze
</p>

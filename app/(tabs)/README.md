# 🥋 Strefa Walk Lubin - Matchmaker

![Version](https://img.shields.io/badge/version-1.0.0--stable-brightgreen)
![Platform](https://img.shields.io/badge/platform-React%20Native%20%7C%20Expo-blue)
![License](https://img.shields.io/badge/license-Private-red)

Profesjonalna aplikacja mobilna (zaprojektowana na tablety) do zautomatyzowanego zarządzania matą podczas treningów Brazylijskiego Jiu-Jitsu (BJJ) i Grapplingu w klubie Strefa Walk Lubin.

System opiera się na zaawansowanym algorytmie **V15 Ultimate Parity**, który wykorzystuje kaskadowe filtry hierarchiczne oraz post-processing typu *2-Opt Swap*, aby wygenerować idealne pary sparingowe w formacie zbliżonym do Round Robin.

---

## 🚀 Główne funkcje (Wersja 1.0.0)

* **Inteligentny Matchmaking:** Automatyczne dobieranie par na podstawie wielu zmiennych: wiek (KID/ADULT), sprzęt (GI/NO-GI), waga oraz poziom zaawansowania (POCZ./ŚREDNI/PRO).
* **Bezwzględna Sprawiedliwość Ławki (Bench Parity):** Algorytm gwarantuje, że na ławce rezerwowych usiądzie zawsze **maksymalnie jedna osoba** z danej grupy wiekowej (tylko w przypadku nieparzystej liczby zawodników). Rotacja odbywa się na podstawie wskaźnika `restDebt`, co całkowicie eliminuje problem pomijania tych samych zawodników.
* **Priorytet "Każdy z każdym":** System minimalizuje ryzyko powtórek walk. Algorytm w pierwszej kolejności zignoruje różnice wagowe lub sprzętowe, zanim dopuści do ponownego starcia tych samych zawodników.
* **Ochrona VIP (Tryb "Bez Pauzy"):** Możliwość oznaczenia wybranych zawodników, którzy są wykluczeni z rotacji na ławce rezerwowych.
* **Wygładzanie 2-Opt:** Po wstępnym zachłannym przypisaniu (Greedy Matching), system skanuje utworzone pary i dokonuje zamian krzyżowych, aby zminimalizować różnice wagowe i uniknąć powtórek.
* **Tryb "Góra / Dół":** Wizualne oznaczenie ról startowych dla każdej pary.

---

## 🧠 Architektura Algorytmu (System Kar)

System ocenia jakość każdej potencjalnej pary na macie, przyznając punkty karne za łamanie reguł. Hierarchia jest bezwzględna – algorytm zawsze wybierze "mniejsze zło" na podstawie poniższych wartości:

1. **Wiek (KID vs ADULT)** ➔ **Kara: `-1 000 000 000 pkt`**
   *Absolutna blokada. Dzieci walczą tylko z dziećmi, dorośli z dorosłymi.*
2. **Walka z rzędu (Back-to-back)** ➔ **Kara: `-500 000 000 pkt`**
   *System nie dopuści do powtórzenia walki z poprzedniej rundy.*
3. **Jakakolwiek powtórka** ➔ **Kara: `-100 000 000 pkt`** (za każde spotkanie w historii)
   *Wymuszenie rotacji "każdy z każdym".*
4. **Mieszanie sprzętu (GI vs NO-GI)** ➔ **Kara: `-10 000 000 pkt`**
   *System stara się utrzymać zawodników we własnym sprzęcie, chyba że jedyną alternatywą jest powtórzenie walki.*
5. **Różnica poziomów (Adult)** ➔ **Kara: `-1 000 000 pkt`** (za każdy stopień różnicy)
   *Wymusza walki PRO z PRO, chyba że brakuje im świeżych przeciwników.*
6. **Różnica wagi** ➔ **Kara: `-10 000 pkt`** (za każdy 1 kg)
   *Najbardziej elastyczna reguła, poświęcana na rzecz uniknięcia powtórek.*

---

## 🛠️ Stack Technologiczny

* **Frontend:** React Native (Expo)
* **Język:** TypeScript
* **Baza danych:** AsyncStorage (Local Offline Storage)
* **Dźwięk:** `expo-av` (Zintegrowane sygnały dźwiękowe dla faz treningu)

---

## 📦 Instrukcja Budowania (Build)

Aby wygenerować produkcyjny plik `.apk` na tablet z systemem Android, upewnij się, że posiadasz zainstalowane narzędzia EAS CLI, a następnie uruchom komendę:

```bash
eas build -p android --profile preview
```

Wymagane uprawnienia (Android): `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`.

---
*Szymon Dróżdż - Strefa Walk Lubin © 2026. All rights reserved.*
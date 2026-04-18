# Play Console — Data Safety Form & Content Rating

## 🛡️ Data safety form (Bezpieczeństwo danych)

### Sekcja 1: Data collection and security

**Does your app collect or share any of the required user data types?**
→ **NO** (Nie zbieramy żadnych danych użytkownika)

> Uzasadnienie: Aplikacja przechowuje dane wyłącznie lokalnie
> w AsyncStorage. Nie ma backendu, nie wysyła żadnych danych, nie używa
> analityki ani reklam.

### Sekcja 2: Security practices

| Pytanie | Odpowiedź |
|---|---|
| Is your data encrypted in transit? | **N/A** — brak transmisji danych |
| Do you provide a way for users to request that their data be deleted? | **YES** — odinstalowanie aplikacji usuwa wszystkie dane |
| Is data only processed ephemerally? | **NO** — dane są zapisywane lokalnie do pamięci urządzenia |
| Has your app been independently validated against a global security standard? | **NO** |

### Sekcja 3: Data types (wszystkie odpowiedzi: NIE)

- [ ] Personal info (name, email, address, phone, race, etc.) — **NO**
- [ ] Financial info — **NO**
- [ ] Health and fitness — **NO** *(dane zawodników są lokalne i nie są danymi zdrowotnymi użytkownika aplikacji — są wpisywane przez trenera o swoich podopiecznych, nie o sobie)*
- [ ] Messages — **NO**
- [ ] Photos and videos — **NO**
- [ ] Audio files — **NO**
- [ ] Files and docs — **NO**
- [ ] Calendar — **NO**
- [ ] Contacts — **NO**
- [ ] App activity / performance — **NO**
- [ ] Web browsing — **NO**
- [ ] App info and performance (crashes, diagnostics) — **NO**
- [ ] Device or other IDs — **NO**
- [ ] Location — **NO**

> **Uwaga o "Health and fitness":** Google wymaga deklaracji tylko jeśli
> aplikacja zbiera dane o **użytkowniku**. W naszym przypadku trener
> wprowadza dane o zawodnikach do własnego użytku — nie są to jego dane
> zdrowotne. Interpretacja zgodna z polityką Google Play (data collected
> = data transmitted off-device or to the developer).

---

## 🎯 Content Rating (Klasyfikacja wiekowa)

### IARC questionnaire — odpowiedzi

Kategoria: **Utility, Productivity, Communication, or Other**

| Pytanie | Odpowiedź |
|---|---|
| Violence — does the app contain violence? | **NO** |
| Sexuality / nudity | **NO** |
| Language (profanity) | **NO** |
| Controlled substances | **NO** |
| Gambling | **NO** |
| User-generated content | **NO** |
| Sharing location with other users | **NO** |
| Allows users to interact | **NO** |
| Digital purchases | **NO** |
| Unrestricted internet access | **NO** |

**Spodziewana klasyfikacja:**
- **PEGI:** 3
- **ESRB:** Everyone
- **Google Play rating:** Rated for 3+

---

## 🎯 Target audience and content

### Target age group
- **Primary:** 18+ (instruktorzy, trenerzy, dorośli uczestnicy klubów)
- **Note:** Aplikacja nie jest przeznaczona dla dzieci — to narzędzie
  profesjonalne dla dorosłych trenerów. Sam fakt istnienia kategorii KID
  nie czyni jej aplikacją dla dzieci (podobnie jak aplikacja dla lekarza
  pediatry nie jest aplikacją dla dzieci).

### Appeals to children?
→ **NO**

---

## 📜 Ads, In-app purchases, Permissions declaration

| Pole | Odpowiedź |
|---|---|
| Contains ads | **NO** |
| In-app purchases | **NO** |
| Contains VPN | **NO** |
| Is a financial feature | **NO** |
| Health feature (claims fitness/medical benefits) | **NO** |
| Government app | **NO** |
| News app | **NO** |

---

## 🏷️ App category & tags

- **Category:** Health & Fitness *(lub: Sports)*
- **Tags:** Sports & Fitness, Trainer, Timer, Brazilian Jiu-Jitsu

---

## 🌍 Countries / regions

Zalecana strategia:
1. **Start:** Tylko Polska (łatwiejszy review, polska karta sklepowa)
2. **Po 2-4 tygodniach:** Rozszerzenie na wszystkie kraje EU + US/UK
3. **Docelowo:** Worldwide (po dodaniu angielskiej lokalizacji w apce — issue #3)

# Build & Submit — Krok po kroku

## 🏗️ Etap 1 — Production build (AAB)

### 1.1. Weryfikacja wersji
Sprawdź w [app.json](../../app.json):
```json
"version": "1.0.0",
"android": {
  "versionCode": 1
}
```
Po pierwszym buildzie EAS z `autoIncrement: true` versionCode będzie rosł automatycznie.

### 1.2. Login do EAS
```powershell
eas whoami
# Jeśli nie jesteś zalogowany:
eas login
```

### 1.3. Build produkcyjny
```powershell
cd c:\PROJECTS\bjj-timer
eas build --platform android --profile production
```

- Build idzie na serwery Expo (20-30 min)
- Output: plik `.aab` (Android App Bundle)
- Link do pobrania pojawi się w terminalu + https://expo.dev/accounts/simon_on/projects/z-nim-nie-robie/builds

### 1.4. Pobierz AAB
```powershell
# Link wyświetli się po buildzie, np:
# https://expo.dev/artifacts/eas/XXX.aab
# Pobierz lokalnie do:
# c:\PROJECTS\bjj-timer\BUILD\z-nim-nie-robie-v1.0.0.aab
```

---

## 🔑 Etap 2 — Service Account Key (dla automatycznego submit)

> **Opcjonalne** — możesz też ręcznie wrzucać AAB przez Play Console.
> Service account przyspiesza kolejne releasy.

### 2.1. Utworzenie service account (jednorazowo)

1. **Google Cloud Console:** https://console.cloud.google.com
2. Utwórz nowy projekt lub użyj istniejącego (np. "z-nim-nie-robie")
3. Włącz API:
   - **Google Play Android Developer API**
4. **IAM & Admin → Service Accounts → Create Service Account**
   - Nazwa: `eas-play-submit`
   - Role: pomiń na tym etapie (uprawnienia damy w Play Console)
5. W utworzonym koncie: **Keys → Add Key → Create new key → JSON**
   - Pobiera się plik `.json`
   - Zapisz jako: `c:\PROJECTS\bjj-timer\.secrets\play-service-account.json`
   - **⚠️ NIE commituj go do repo!**

### 2.2. Powiązanie z Play Console

1. **Play Console:** https://play.google.com/console
2. **Setup → API access → Link existing Google Cloud project**
3. Wybierz projekt z poprzedniego kroku
4. W sekcji Service accounts → znajdź `eas-play-submit` → **Grant access**
5. Uprawnienia:
   - App permissions: tylko `Z NIM NIE ROBIĘ`
   - Account permissions:
     - ✅ View app information
     - ✅ Manage production releases
     - ✅ Manage testing track releases (internal/closed/open)
     - ❌ NIE dawaj "Admin" ani uprawnień finansowych

### 2.3. Dodanie .secrets do .gitignore
```
.secrets/
```

---

## 🚀 Etap 3 — Submit do Play Console

### 3.1. Pierwszy submit (tylko ręczny, bo app nie istnieje jeszcze w Console)

1. **Play Console → Create app:**
   - Nazwa: `Z NIM NIE ROBIĘ`
   - Domyślny język: Polish (Poland)
   - Aplikacja czy gra: **App**
   - Płatna czy bezpłatna: **Free**
   - Deklaracje: bez reklam, zgodna z polityką Play

2. **Wypełnij sekcje** (materiały w tym folderze):
   - Main store listing → teksty z `store-listing.md`
   - Graphics → pliki z `assets/`
   - Categorization → Health & Fitness
   - Contact details → email, URL
   - Privacy policy → `https://znimnierobie.pl/privacy`

3. **App content:**
   - Data safety → odpowiedzi z `data-safety-and-rating.md`
   - Content rating → questionnaire (wszystko NO)
   - Target audience → 18+
   - News app → NO
   - COVID-19 tracing → NO

4. **Release → Internal testing → Create new release:**
   - Upload AAB (ręcznie za pierwszym razem)
   - Release name: `1.0.0 (1)`
   - Release notes → z `BUILD/release-notes.md`
   - **Review release → Start rollout**

### 3.2. Kolejne submity (po skonfigurowaniu service account)

```powershell
eas submit --platform android --profile production --latest
```

Konfiguracja w `eas.json` (już przygotowana — patrz 3.3).

### 3.3. Aktualizacja `eas.json`

Zostanie zaktualizowana w następnym kroku (sekcja `submit.production`).

---

## 🧪 Etap 4 — Ścieżki testowe

### Internal testing (start)
- Do 100 testerów (emaile)
- Dostępne w kilka minut po uploadzie
- Review: automatyczny, < 1h
- **Tu lądujemy pierwszy build**

### Closed testing
- Lista emaili lub Google Group
- Min. 14 dni i 12 testerów **jeśli konto jest nowe** (dla kont starszych — nie)
- **Ty masz istniejące konto, więc ten krok jest opcjonalny**

### Open testing (beta publiczna)
- Dowolny tester może dołączyć przez link
- Dobre dla social media zapowiedzi

### Production
- Pełny release
- **Review 1-7 dni** (czasem kilka godzin)

---

## 🎯 Rekomendowana ścieżka dla Ciebie (konto istniejące)

1. Build AAB → upload do **Internal testing**
2. Przetestuj osobiście na tablecie (zainstaluj z Play Store, nie sideload)
3. Zaproś 2-3 znajomych trenerów jako internal testerów (opcjonalnie)
4. Po 2-3 dniach bez bugów → **promote to Production**
5. Gotowe ✅

---

## 🔄 Workflow aktualizacji (v1.0.1, v1.1.0 itd.)

```powershell
# 1. Zmień app.json: "version": "1.0.1"
# (versionCode sam się zwiększy przez autoIncrement)

# 2. Commit
git add . ; git commit -m "release: v1.0.1"

# 3. Build
eas build --platform android --profile production

# 4. Submit
eas submit --platform android --profile production --latest

# 5. W Play Console: promote Internal → Production gdy gotowe
```

---

## 🆘 Typowe problemy przy pierwszym submicie

| Problem | Rozwiązanie |
|---|---|
| "Upload failed: version code 1 already used" | Zmień `versionCode` w `app.json` na 2 |
| "Target API level too low" | SDK 54 celuje w API 35+, powinno być OK |
| "App is using deprecated API" | Sprawdź logi; `expo-av` jest deprecated ale nadal przyjmowane |
| "Privacy policy URL not accessible" | Upewnij się że `znimnierobie.pl/privacy` działa PRZED submitem |
| "Screenshot resolution too small" | Min. 320 px bok; użyj 1080×1920 dla telefonu |

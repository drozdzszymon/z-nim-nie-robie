# Graphics Specification — Google Play

## Wymagane grafiki

### 1. App icon
- **Rozmiar:** 512 × 512 px
- **Format:** PNG, 32-bit, z kanałem alpha
- **Max rozmiar pliku:** 1024 KB
- **Status:** ✅ Mamy `assets/images/icon.png` (1024×1024) — Play automatycznie zresizuje,
  ale warto wyeksportować czystą wersję 512×512 dla pewności
- **Plik docelowy:** `docs/play-store/assets/icon-512.png`

### 2. Feature graphic (banner nad screenshotami)
- **Rozmiar:** 1024 × 500 px
- **Format:** PNG lub JPG (bez przezroczystości)
- **Max rozmiar pliku:** 1024 KB
- **Status:** ❌ Nie mamy — trzeba zaprojektować
- **Plik docelowy:** `docs/play-store/assets/feature-graphic-1024x500.png`

**Sugerowana zawartość feature graphic:**
```
┌──────────────────────────────────────────────┐
│  [LEWA 40%]          [PRAWA 60%]             │
│  Logo + nazwa        Mockup tabletu z app    │
│  Slogan: "Koniec     (screen z dużym         │
│  kartek na macie"    timerem lub parami)     │
│                      Na tle: gradient navy   │
│                      #07111F → #0F2541       │
└──────────────────────────────────────────────┘
```

### 3. Phone screenshots
- **Wymagane:** min. 2, max. 8
- **Proporcje:** 16:9 lub 9:16 (portrait/landscape)
- **Rozmiar:** min. bok 320 px, max. bok 3840 px
- **Zalecany rozmiar:** 1080 × 1920 (portrait) lub 1920 × 1080 (landscape)
- **Format:** PNG lub JPG, 24-bit, bez przezroczystości
- **Status:** ⚠️ Mamy w `docs/screenshots/` — trzeba sprawdzić rozmiary

### 4. 7-inch tablet screenshots (opcjonalne ale zalecane)
- **Wymagane:** min. 1, max. 8
- **Proporcje:** min. 1:1, zalecane 16:10
- **Rozmiar:** min. 320 px bok, max. 3840 px bok

### 5. 10-inch tablet screenshots (KLUCZOWE dla nas!)
- **Wymagane:** min. 1, max. 8
- **Rozmiar:** 1920 × 1200 lub podobne
- **Plany:** aplikacja JEST projektowana pod tablet 10" — tu pokazujemy
  jej prawdziwe oblicze

**Sugerowane ekrany do screenshotów:**
1. **Ekran ustawień z listą zawodników** (hero shot — pokazuje "o co chodzi")
2. **PREP phase** — grid par ze zdjęciami kart
3. **WORK phase** — wielki timer + informacja o parach
4. **Zadaniówki trójki — grid rotacji** (pokazuje zaawansowanie)
5. **REST phase** — kto pauzuje, kto walczy dalej
6. **Ekran finished** (opcjonalnie)

### 6. Promo video (opcjonalne)
- **Platforma:** YouTube (publiczny lub unlisted)
- **Długość:** 30 sek - 2 min
- **Sugestia:** 30-45 sek, nagrane z tabletu pokazujące pełny cykl rundy

---

## Narzędzia i workflow

### Generowanie feature graphic
Opcje:
- **Figma / Canva** — szablony 1024×500 (szybko)
- **Expo orbit snapshot** + compose w Figmie
- AI (np. Midjourney / DALL-E) dla tła, potem kompozycja

### Generowanie screenshotów
```powershell
# Z urządzenia przez ADB (jeśli masz podłączony tablet):
adb shell screencap -p /sdcard/screen1.png
adb pull /sdcard/screen1.png docs/play-store/assets/

# Lub z Expo Go / preview build, tryb "developer menu" → screenshot
```

### Device frames (ramki urządzeń wokół screenshotów)
Google Play **nie wymaga** ramek, ale poprawiają CTR:
- https://appmockup.com (darmowe, web)
- https://mockuphone.com

---

## ✅ Checklist grafik przed submit

- [ ] Icon 512×512 wyeksportowane
- [ ] Feature graphic 1024×500 zaprojektowane
- [ ] Min. 2 zrzuty telefon (portrait, 1080×1920)
- [ ] Min. 2 zrzuty tablet 10" (landscape, 1920×1200)
- [ ] Wszystkie pliki ≤ 1024 KB
- [ ] Brak tekstu angielskiego na grafikach (jeśli karta PL-only)
- [ ] (Opcjonalnie) Video 30-45s na YouTube

# Wymagania graficzne karty sklepu Google Play

W katalogu `docs/play-store/assets/` trzymamy gotowe grafiki wgrane do Google Play Console oraz zrzuty ekranu przygotowane pod tablety dziesięciocalowe.

## Parametry plików wymaganych przez Google Play

| Materiał graficzny | Wymiary i format | Ścieżka w repozytorium |
|---|---|---|
| Ikona aplikacji w sklepie | 512 x 512 px, PNG 32-bit, do 1024 KB | `docs/play-store/assets/icon-512.png` (źródło 1024 x 1024 px w `assets/images/icon.png`) |
| Grafika promocyjna (Feature Graphic) | 1024 x 500 px, PNG lub JPG bez kanału alpha, do 1024 KB | `docs/play-store/assets/feature-graphic-1024x500.png` |
| Zrzuty na tablet 10 cali | Od 2 do 8 plików, proporcje poziome 16 do 10 lub 16 do 9, bok minimum 1080 px | `docs/play-store/assets/screenshots-tablet/` |
| Zrzuty na telefon i wersje językowe | Od 2 do 8 plików na język (PL, EN, PT-BR), PNG 24-bit bez przezroczystości | `Screenshots/pl/`, `Screenshots/en/`, `Screenshots/pt/` |

## Dobór kadrów na karcie produktu

Karta w sklepie najlepiej konwertuje wtedy, gdy pierwsze cztery zrzuty pokazują pełny przebieg zajęć z perspektywy trenera stojącego przy macie. Jako pierwszy obraz ustawiamy widok wypełnionego składu z kafelkami zawodników, zaraz po nim siatkę dobranych par w fazie przygotowania, na trzecim miejscu duży zegar odliczający czas walki, a dalej widok rotacji w trójkach oraz okno szybkiego wypisywania osoby schodzącej z maty.

Przy eksporcie nowych zrzutów z przeglądarki lub z tabletu przez ADB sprawdzaj, czy wokół ciemnego tła `#07111F` nie zostały białe marginesy okna przeglądarki i czy żaden plik nie przekracza limitu 1 MB narzuconego przez Play Console.

```powershell
adb shell screencap -p /sdcard/screen1.png
adb pull /sdcard/screen1.png docs/play-store/assets/screenshots-tablet/
```


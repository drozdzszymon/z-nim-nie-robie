# Moduł główny aplikacji Z NIM NIE ROBIĘ

W katalogu `app/(tabs)` leżą ekrany treningowe, słownik trzech wersji językowych oraz algorytm dobierania par na matę.

Najważniejsze pliki w tym miejscu to główny widok i zegar rund w `index.tsx`, tłumaczenia polskie, angielskie i portugalskie w `i18n.ts`, definicje struktur danych w `types.ts` oraz solver par i rotacji pauz w `engine/matchmaker.ts`. Pomocnicze funkcje walidacji formularza i podziału na trójki znajdują się piętro wyżej w `constants/training-helpers.ts`, a odpowiadające im testy jednostkowe w `tests/engine-and-helpers.test.mjs`.

Opis wszystkich trybów treningowych, zrzuty ekranu i instrukcję uruchomienia znajdziesz w głównym pliku [README](../../README.md).


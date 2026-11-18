# Formularz bezpieczeństwa danych i klasyfikacja wiekowa w Play Console

Ten dokument zawiera odpowiedzi wpisane w sekcjach App Content w konsoli Google Play dla pakietu `pl.znimnierobie.app`.

## Deklaracja bezpieczeństwa danych (Data Safety)

Na główne pytanie formularza `Does your app collect or share any of the required user data types?` właściwa odpowiedź brzmi `NO`. Aplikacja zapisuje listę zawodników i ustawienia zegara wyłącznie lokalnie w `AsyncStorage` na urządzeniu trenera, nie ma własnego backendu, nie przesyła żadnych pakietów z danymi użytkowników przez sieć i nie ładuje zewnętrznych bibliotek reklamowych ani analitycznych.

| Pytanie pomocnicze w formularzu | Wybrana odpowiedź i uzasadnienie |
|---|---|
| Is your data encrypted in transit? | Nie dotyczy, aplikacja nie przesyła danych poza urządzenie |
| Do you provide a way for users to request that their data be deleted? | Tak, usunięcie wpisu w aplikacji lub odinstalowanie programu kasuje wszystkie dane |
| Is data only processed ephemerally? | Nie, baza klubowa jest utrwalana lokalnie w pamięci urządzenia |
| Has your app been independently validated against a global security standard? | Nie |

Wszystkie szczegółowe kategorie danych w kroku trzecim (dane osobowe, finanse, zdrowie i kondycja, wiadomości, zdjęcia, nagrania audio, pliki, kalendarz, kontakty, aktywność w aplikacji, historia przeglądania, raporty awarii, identyfikatory urządzenia oraz lokalizacja) pozostają odznaczone. Wpisy o wadze i stażu zawodników nie stanowią danych zdrowotnych zbieranych przez producenta oprogramowania, ponieważ zgodnie z definicją Google Play zbieranie danych zaczyna się dopiero w momencie ich wysłania poza urządzenie użytkownika.

## Kwestionariusz klasyfikacji wiekowej IARC

W ankiecie IARC wybieramy kategorię narzędzi użytkowych (`Utility, Productivity, Communication, or Other`) i zaznaczamy odpowiedź `NO` przy wszystkich pytaniach o przemoc, treści seksualne, wulgaryzmy, używki, hazard, treści publikowane przez użytkowników, udostępnianie lokalizacji, czaty między użytkownikami oraz zakupy cyfrowe. Na tej podstawie sklep przypisuje oznaczenie `PEGI 3` w Europie oraz `Everyone` w klasyfikacji ESRB.

## Grupa docelowa i pozostałe oświadczenia

Jako docelową grupę odbiorców ustawiamy osoby pełnoletnie (`18+`), a na pytanie `Appeals to children?` odpowiadamy `NO`. Program służy dorosłym trenerom i instruktorom prowadzącym zajęcia na sali, a przełącznik `KID` w formularzu składu porządkuje jedynie podział grup treningowych po stronie trenera.

| Oświadczenie w sekcji App Content | Wartość |
|---|---|
| Contains ads | NO |
| In-app purchases | NO |
| Contains VPN | NO |
| Financial features | NO |
| Health features (medical or clinical claims) | NO |
| Government app | NO |
| News app | NO |

## Kategoria i rynki dystrybucji

Aplikacja figuruje w kategorii `Health & Fitness` z tagami `Sports & Fitness`, `Timer` oraz `Coaching`. Od wydania wielojęzycznego z polskim, angielskim i brazylijskim portugalskim karta sklepu jest udostępniona globalnie we wszystkich obsługiwanych przez Google Play krajach.


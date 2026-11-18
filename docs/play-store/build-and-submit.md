# Budowanie paczki AAB i wysyłka do Google Play

Ten dokument opisuje pełny przebieg wydania produkcyjnego aplikacji na Androida oraz publikacji wersji przeglądarkowej.

## Przygotowanie numeru wersji przed wydaniem

Przed zbudowaniem nowej paczki podbij numer wersji w plikach [package.json](../../package.json) oraz [app.json](../../app.json):

```json
"version": "2.3.0",
"android": {
  "versionCode": 14
}
```

Przy włączonym ustawieniu `autoIncrement` w profilu `production` w pliku [eas.json](../../eas.json) narzędzie EAS CLI pilnuje, żeby każdy kolejny build produkcyjny miał wyższy `versionCode` niż poprzednia paczka w sklepie. Zaktualizuj przy okazji etykietę `aboutVersion` w pliku `app/(tabs)/i18n.ts` oraz wpisy w plikach `CHANGELOG*.md`.

## Automatyczne wydanie na Google Play jedną komendą

Sprawdź najpierw, czy jesteś zalogowany na właściwe konto Expo i czy testy przechodzą bez błędów:

```powershell
cd C:\PROJECTS\bjj-timer
eas whoami
npm test
npm run lint
```

Gdy wszystko świeci na zielono, uruchom gotowy skrypt wydawniczy:

```powershell
npm run release:android
```

Pod spodem wykonuje się polecenie `eas build --platform android --profile production --auto-submit --non-interactive`. Serwery Expo budują podpisany plik `.aab` (zwykle trwa to od 15 do 30 minut), a zaraz po zakończeniu kompilacji automatycznie wysyłają go do Google Play na ścieżkę `production` jako wydanie `completed`. Postęp kompilacji i link do artefaktu znajdziesz też w panelu `https://expo.dev/accounts/simon_on/projects/z-nim-nie-robie/builds`.

Jeżeli obok paczki sklepowej potrzebujesz pliku instalacyjnego `.apk` do bezpośredniego pobrania z zakładki Releases na GitHubie, zbuduj profil `preview`:

```powershell
eas build --platform android --profile preview --non-interactive
```

## Konfiguracja klucza konta serwisowego Google Cloud

Automatyczna wysyłka przez `eas submit` wymaga pliku klucza JSON zapisanego lokalnie pod ścieżką `.secrets/play-service-account.json`. Ten katalog jest dodany do `.gitignore` i nigdy nie wolno wrzucać go do repozytorium.

Gdyby trzeba było odtworzyć klucz na nowej maszynie albo po rotacji poświadczeń, wejdź do Google Cloud Console, włącz usługę Google Play Android Developer API i utwórz konto serwisowe `eas-play-submit` z kluczem w formacie JSON. Następnie w Play Console otwórz zakładkę dostępu do API, podepnij projekt Google Cloud i nadaj temu kontu uprawnienia do podglądu informacji o aplikacji oraz zarządzania wydaniami produkcyjnymi i testowymi wyłącznie dla pakietu `pl.znimnierobie.app`. Nie nadawaj mu roli administratora całego konta ani dostępu do raportów finansowych.

## Wdrożenie wersji webowej na własny serwer

Wersja przeglądarkowa pod adresem `https://znimnierobie.pl` buduje się do katalogu `dist/` razem ze stroną polityki prywatności `public/privacy/index.html` i plikiem `.htaccess`. Do publikacji służy pojedyncze polecenie:

```powershell
npm run release:web
```

Skrypt [deploy-web.mjs](../../scripts/deploy-web.mjs) wczytuje dane dostępowe FTPS z pliku `.secrets/ftp.json`, sprawdza certyfikat TLS serwera, pobiera kopię zapasową zastępowanych plików do lokalnego folderu `backups/` i wgrywa świeżą zawartość `dist/`. Samo połączenie z serwerem bez wysyłania plików możesz sprawdzić komendą `node scripts/deploy-web.mjs --list`.

## Dostępność aplikacji we wszystkich krajach

Zakresu krajów nie da się przełączyć z poziomu `eas submit` ani pliku `app.json`. Google Play trzyma to ustawienie wyłącznie w panelu webowym.

Po publikacji sprawdź w Play Console w sekcji `Release -> Production -> Countries / regions`, czy na liście widnieje komplet około 175 krajów. Gdyby brakowało nowych rynków, kliknij dodawanie regionów, zaznacz wszystkie pozycje i zatwierdź zmianę przyciskiem uruchomienia wdrożenia. Zmiana listy krajów nie wymaga budowania nowego pliku AAB, a propagacja w sklepie zajmuje zazwyczaj kilka godzin. Kraje objęte sankcjami są blokowane odgórnie przez Google i nie pojawiają się w tabeli.

## Częste błędy przy wysyłce do sklepu

| Komunikat błędu lub objaw | Sposób naprawy |
|---|---|
| `Version code X has already been used` | Podnieś `android.versionCode` w `app.json` powyżej ostatniego numeru widocznego w Play Console |
| `Target API level too low` | Expo SDK 58 buduje paczki pod aktualne wymagania API Google Play, wystarczy świeży build produkcyjny |
| Pytanie o uprawnienie `RECORD_AUDIO` | Upewnij się, że w `app.json` wtyczka `expo-audio` ma ustawione `recordAudioAndroid: false` oraz `microphonePermission: false` |
| `Privacy policy URL not accessible` | Wgraj najpierw stronę przez `npm run release:web` i sprawdź, czy adres `https://znimnierobie.pl/privacy` zwraca kod 200 |
| Brak aplikacji w sklepie w wybranym kraju | Włącz brakujące kraje w zakładce `Production -> Countries / regions` i zatwierdź rollout |

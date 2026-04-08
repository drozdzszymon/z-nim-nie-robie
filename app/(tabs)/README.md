# STREFA WALK LUBIN MATCHMAKER - DOKUMENTACJA (V15 Final 1)
*System oparty na Kaskadowych Filtrach Hierarchicznych i 2-Opt Swap.*

## UWAGI IMPLEMENTACYJNE:
- **ZASADA "KAŻDY Z KAŻDYM" (ROUND ROBIN):** Powtórki są traktowane jako absolutna ostateczność. System wybierze w pierwszej kolejności zawodnika o 50 kg lżejszego w innym stroju, niż powtórzy wcześniej odbytą walkę.
- **ŚCISŁA KONTROLA ŁAWKI:** Zrezygnowano z węzła `DUMMY_BENCH` wchodzącego w interakcje z silnikiem parowania. System przed rozpoczęciem parowania wyciąga z maty osobę o najniższym liczniku odpoczynku i zdejmuje ją z listy. Gwarantuje to absolutną sprawiedliwość w pauzowaniu i całkowicie eliminuje ryzyko posadzenia kilku osób.

---

## HIERARCHIA PAROWANIA ZAWODNIKÓW

System nie odrzuca żadnej pary, lecz punktuje wszystkie możliwe kombinacje na macie według następującej, bezwzględnej hierarchii. Każdy kolejny punkt ma mniejszy wpływ na decyzję algorytmu niż poprzedni.

1. **Wiek (Dziecko z Dorosłym) -> Kara -1 000 000 000 pkt**
   Mieszanie dzieci i dorosłych jest zablokowane. System nigdy ich nie połączy, ponieważ zawsze zdejmuje na ławkę 1 osobę z nieparzystej grupy, gwarantując parzystość w obu wiekach (KID vs KID, ADULT vs ADULT).
2. **"Każdy z każdym" (Brak powtórek) -> Kara do -500 000 000 pkt**
   Jeśli zawodnicy walczyli runda po rundzie, otrzymują karę -500 milionów. Każda inna dotychczasowa powtórka to -100 mln. System zrobi wszystko, włącznie z mieszaniem pasów i ogromnymi różnicami wagi, byle tego uniknąć.
3. **Ubiór (GI z GI) -> Kara -10 000 000 pkt**
   Jeśli zawodnicy noszą inny sprzęt (GI vs NO-GI), otrzymują karę 10 milionów. Ponieważ to mniej niż kara za powtórkę, system w pierwszej kolejności ucieknie przed ponowną walką mieszając sprzęt, zanim zdecyduje się na powtórkę.
4. **Poziom zaawansowania (Tylko dorośli) -> Kara -1 000 000 pkt**
   Każdy stopień różnicy to 1 milion punktów w dół. Wymusza walki PRO z PRO i POCZ z POCZ, chyba że brakuje im opcji niepowtórzonych.
5. **Waga -> Kara -10 000 pkt za 1 kg**
   Najmniejsza ranga ważności. Różnica 40 kg to "tylko" -400 000 punktów, dlatego w ostateczności system bez problemu dobierze 100 kg zawodnika z 60 kg zawodnikiem, aby uratować ich przed walką z dotychczasowym rywalem.
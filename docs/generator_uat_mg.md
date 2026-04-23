# UAT scenariusze MG: Inspiracje (Etap 3.4)

Cel: potwierdzic, ze panel `Inspiracje` przyspiesza prowadzenie sesji i nie psuje flow live.

## Zakres i przygotowanie

- Srodowisko: aktualny build deweloperski z wlaczonym modułem generatora.
- Dane: min. 1 kampania, 1 aktywna sesja, min. 1 paczka generatora systemowego + 1 custom.
- Role: 1 MG testujacy (docelowy uzytkownik), 1 osoba notujaca obserwacje.
- Czas sesji UAT: 45-60 minut.

## Scenariusze krytyczne

1. Otworz `Sesja live` i przelacz rail na `Inspiracje`.
2. Wykonaj losowanie `Postac`, potem:
   - skopiuj wynik,
   - dodaj wynik do notatki sesji,
   - utworz NPC i przypnij do sceny.
3. Wykonaj losowanie `Lokacja`, potem:
   - utworz lokacje,
   - sprawdz czy pojawia sie w kontekście sesji.
4. Wykonaj losowanie `Event table`, potem:
   - dodaj wpis jako notatke,
   - sprawdz timestamp i widocznosc po reloadzie.
5. Wykonaj losowanie `Custom table`:
   - zmien tabele,
   - wykonaj `Losuj ponownie`,
   - sprawdz historie ostatnich wynikow.
6. W trakcie testu:
   - uzyj skrótu klawiaturowego do losowania,
   - sprawdz, czy skrót nie odpala losowania podczas edycji pola tekstowego.

## Kryteria akceptacji

- Czas od klikniecia `Losuj` do wyniku: subiektywnie natychmiastowy (bez odczuwalnego laga).
- Wszystkie akcje kontekstowe (`kopiuj`, `notatka`, `utworz encje`) koncza sie sukcesem.
- Brak duplikatow encji przy szybkim wielokliku.
- Historia losowan aktualizuje sie po kazdym commicie i utrzymuje po odswiezeniu.
- Brak regresji raila: scroll, drag, focus i zamykanie paneli dzialaja stabilnie.

## Raportowanie

Po sesji uzupelnij:

- 3 najwieksze plusy ergonomii.
- 3 najwieksze tarcia UX.
- Lista bugow z priorytetem (`P0/P1/P2`) i krokami reprodukcji.
- Rekomendacja: `Go`, `Go with fixes`, albo `No-Go`.

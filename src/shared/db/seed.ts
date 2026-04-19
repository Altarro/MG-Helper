import type { MgHelperDb } from './database';
import { addEntity as _addEntity, addRelation as _addRelation } from '@shared/db/operations';

/**
 * Seeds the database with a sample campaign.
 * Should only be called on user request (e.g. onboarding dialog).
 */
export async function seedDemoData(db: MgHelperDb): Promise<void> {
  const addEntity = _addEntity.bind(null, db);
  const addRelation = _addRelation.bind(null, db);
  // ── Postacie graczy (PC) ──────────────────────────────────────────────────
  const aldric = await addEntity({
    type: 'npc',
    name: 'Aldric z Kamiennej Straży',
    description: '<p>Były rycerz szukający odkupienia po spaleniu wioski, którą miał chronić.</p>',
    tags: ['gracz', 'wojownik'],
    data: {
      isPC: true,
      playerName: 'Krzysztof',
      instinct: 'Stanąć między niewinnym a niebezpieczeństwem',
      motivation: 'Odkupienie za przeszłość',
      appearance: 'Blizna na policzku, zardzewiała zbroja, zmęczone oczy',
      playStyle: 'Postać gracza — prowadzona przez Krzysztofa. W scenach z innymi postaciami zachowuje powagę i honorowy kod. Szuka okazji do poświęcenia.',
    },
  });
  const senna = await addEntity({
    type: 'npc',
    name: 'Senna Włócznia Mgły',
    description: '<p>Elfka będąca zwiadowcą i złodziejką — uciekła z klanu po oskarżeniu o zdradę.</p>',
    tags: ['gracz', 'złodziej'],
    data: {
      isPC: true,
      playerName: 'Agata',
      instinct: 'Zbierać informacje i trzymać je dla siebie',
      motivation: 'Oczyścić swoje imię i odnaleźć klan',
      appearance: 'Długa czarna opaska na oku, skórzany płaszcz, cichy krok',
      playStyle: 'Postać gracza — prowadzona przez Agatę. W rozmowach subtelnością; w akcji — prędkością. Trudno ją zaszufladkować — może być sojusznikiem lub dzikim koniem.',
    },
  });
  const toryn = await addEntity({
    type: 'npc',
    name: 'Toryn Popielnik',
    description: '<p>Krasnoludzi kapłan Ziemi — pielgrzym szukający zaginionej relikwii swojego boga.</p>',
    tags: ['gracz', 'kapłan'],
    data: {
      isPC: true,
      playerName: 'Marcin',
      instinct: 'Naprawiać to, co zepsute',
      motivation: 'Odnalez relikwię i przynieść ją do świątyni',
      appearance: 'Krótki, szeroki, szara broda w warkoczach, gliniany symbol boga na szyi',
      playStyle: 'Postać gracza — prowadzona przez Marcina. Spokojny, rozważny, pełen przeczuć. Działa przez pytania i rytuały. W konflikcie staje za słabszym.',
    },
  });

  // ── NPCs ──────────────────────────────────────────────────────────────────
  const magistra = await addEntity({
    type: 'npc',
    name: 'Magistra Velara',
    description: '<p>Stara i przebiegła czarodziejka, skrywająca sekret dotyczący zaginionego artefaktu.</p>',
    tags: ['czarodziejka', 'antagonista'],
    data: {
      instinct: 'Zbierać wiedzę za wszelką cenę',
      motivation: 'Odkryć tajemnicę Wrót',
      appearance: 'Siwe włosy, purpurowa szata, lodowaty wzrok',
      playStyle: 'Mów ostrożnie dobranymi słowami — nigdy wprost. Velara zawsze gra o krok naprzód i traktuje bohaterów jak narzędzia. Gdy poczuje zagrożenie, staje się zimna jak lód i bezlitosna.',
    },
  });
  const guildmaster = await addEntity({
    type: 'npc',
    name: 'Kael "Żelazo" Vortan',
    description: '<p>Przywódca Gildii Kupców, oficjalnie szanowany, w istocie finansuje przemyt.</p>',
    tags: ['kupiec', 'skorumpowany'],
    data: {
      instinct: 'Chronić swoje interesy',
      motivation: 'Zarobek i władza',
      appearance: 'Tęgi mężczyzna w drogich szatach, złoty łańcuch',
      playStyle: 'Serdeczny, hojny i otwarty — do momentu gdy poczuje zagrożenie. Wtedy zimny jak stal, z uśmiechem zlecający brudną robotę. Nigdy sam nie brudzi sobie rąk.',
    },
  });
  const guard = await addEntity({
    type: 'npc',
    name: 'Sierżant Mira Caldas',
    description: '<p>Uczciwa strażniczka miejska, podejrzliwa wobec awanturników.</p>',
    tags: ['strażnik', 'sojusznik'],
    data: {
      instinct: 'Przestrzegać prawa',
      motivation: 'Ochrona mieszkańców',
      appearance: 'Szorstkie rysy, zbroja ze złapanym szramem',
      playStyle: 'Bezpośrednia i sceptyczna. Zadaje dociekliwe pytania, nie daje się zbyć ogólnikami. Może stać się sprzymierzeńcem, jeśli bohaterowie okażą się uczciwi wobec niej.',
    },
  });
  const archivist = await addEntity({
    type: 'npc',
    name: 'Bram Kopciuch',
    description: '<p>Stary archiwista miejskiej biblioteki — pamiętający Akademię sprzed ruin. Wie więcej niż mówi.</p>',
    tags: ['informator', 'stary'],
    data: {
      instinct: 'Chować prawdę w aluzjach i cytatach',
      motivation: 'Ochraniać pamięć zaginionej Akademii',
      appearance: 'Pomarszczony, atramentowe plamy na palcach, pince-nez na łańcuszku',
      playStyle: 'Mów w zagadkach i historycznych odniesieniach. Nigdy wprost nie udzieli odpowiedzi — zasugeruje, gdzie jej szukać. Jest znacznie starszy niż wygląda.',
    },
  });

  // ── Locations ─────────────────────────────────────────────────────────────
  const city = await addEntity({
    type: 'location',
    name: 'Miasto Ashenveil',
    description: '<p>Stare miasto handlowe na skrzyżowaniu dróg, pełne intryg i tajemnic.</p>',
    tags: ['miasto', 'centrum'],
    data: {
      locationType: 'city',
      danger: 1,
      senses: { see: 'Dymiące kominy, brukowane ulice', hear: 'Gwar targowiska', smell: 'Smród kanałów i piekarni', feel: 'Napięcie pod powierzchnią codzienności' },
    },
  });
  const tavern = await addEntity({
    type: 'location',
    name: 'Karczma "Pod Zwisającym Wieszakiem"',
    description: '<p>Ulubione spotkanie awanturników i plotkarzy. Na zapleczu — sekretny magazyn Gildii.</p>',
    tags: ['karczma', 'punkt spotkań'],
    data: {
      locationType: 'building',
      danger: 0,
      senses: { see: 'Ciemne deski, ogień w kominku', hear: 'Śmiechy i kłótnie', smell: 'Piwo i pieczony drób', feel: 'Ktoś cię obserwuje od kąta' },
    },
  });
  const ruins = await addEntity({
    type: 'location',
    name: 'Ruiny Starej Akademii',
    description: '<p>Porzucona akademia magiczna — podobno nadal aktywna w piwnicy. Koven spotyka się tu nocami.</p>',
    tags: ['ruiny', 'niebezpieczne'],
    data: {
      locationType: 'ruins',
      danger: 3,
      senses: { see: 'Rozbite witraże, pajęczyny', hear: 'Szum wiatru przez pęknięcia', smell: 'Spróchniałe drewno i siarka', feel: 'Obecność czegoś za ścianą rzeczywistości' },
    },
  });
  const cellar = await addEntity({
    type: 'location',
    name: 'Podziemia Akademii',
    description: '<p>Zachowane piwnice pod ruinami — tu Koven przeprowadza rytuały. Ściany pokryte runami przywołania.</p>',
    tags: ['podziemia', 'rytuał', 'niebezpieczne'],
    data: {
      locationType: 'dungeon',
      danger: 5,
      senses: { see: 'Runy świecące na ścianach, ołtarz z obsydianu', hear: 'Rytmiczne odbicia kroków, odległy szept', smell: 'Krew, wosk i ozon', feel: 'Czas płynie inaczej — każda chwila ciągnie się jak godzina' },
    },
  });

  // ── Factions ──────────────────────────────────────────────────────────────
  const magesCoven = await addEntity({
    type: 'faction',
    name: 'Koven Mglistej Wieży',
    description: '<p>Sekretne bractwo czarodziejów poszukujących zakazanej wiedzy.</p>',
    tags: ['magia', 'sekret'],
    data: {
      goals: ['Odzyskać Wrota Nicości', 'Wyeliminować tych, którzy za dużo wiedzą'],
      resources: ['Starożytne tomy', 'Sieć szpiegów w Ashenveil', 'Rytualne komponenty'],
    },
  });
  const merchantGuild = await addEntity({
    type: 'faction',
    name: 'Gildia Kupiecka Ashenveil',
    description: '<p>Oficjalnie organizacja handlowa, w rzeczywistości kontrolująca czarny rynek.</p>',
    tags: ['kupcy', 'korupcja'],
    data: {
      goals: ['Monopol na handel magicznymi składnikami', 'Kupienie przychylności Rady Miasta'],
      resources: ['Złoto', 'Prywatna ochrona', 'Kontakty polityczne'],
    },
  });

  // ── Items ─────────────────────────────────────────────────────────────────
  const amulet = await addEntity({
    type: 'item',
    name: 'Amulet Mgły',
    description: '<p>Starożytny amulet z symbolem Wrót — ostatni zachowany artefakt Akademii. Rozgrzewa się w pobliżu aktywnej magii przywołania.</p>',
    tags: ['artefakt', 'klucz'],
    data: { itemType: 'artifact', properties: ['magiczny', 'starożytny', 'rozgrzewa się blisko Wrót'] },
  });
  const poisonedBlade = await addEntity({
    type: 'item',
    name: 'Zatruty Sztylet',
    description: '<p>Elegancka broń z inicjałami "GK" — porzucona na miejscu napadu na Brama.</p>',
    tags: ['dowód', 'broń'],
    data: { itemType: 'weapon', properties: ['zatruty', 'lekki', 'inicjały GK'] },
  });
  const ritualKey = await addEntity({
    type: 'item',
    name: 'Klucz Rytuału',
    description: '<p>Srebrny klucz z wyrytymi symbolami — otwiera zamkniętą kryptę w podziemiach Akademii.</p>',
    tags: ['klucz', 'rytuał', 'artefakt'],
    data: { itemType: 'artifact', properties: ['srebrny', 'z runami', 'drgający blisko ołtarza'] },
  });

  // ── Clocks ────────────────────────────────────────────────────────────────
  const openingGates = await addEntity({
    type: 'clock',
    name: 'Otwarcie Wrót Nicości',
    description: '<p>Koven dąży do ukończenia rytuału — każdy krok przybliża je do celu.</p>',
    tags: ['główny wątek', 'kampania'],
    data: {
      segments: 8,
      filled: 2,
      isActive: true,
      tickLabels: [
        'Koven pozyskuje pierwszy składnik rytuału',
        'Velara odnajduje starożytną mapę Akademii',
        'Nocna ceremonia w ruinach — pierwsze ofiary',
        'Kradzież Amuletu Mgły',
        'Rytuał wchodzi w fazę drugą — strefa niebezpieczna',
        'Wrota zaczynają drżeć — sny mieszkańców stają się koszmarami',
        'Ostatni składnik w rękach Kovenu',
        'Wrota otwarte — ciemność zalewa Ashenveil',
      ],
    },
  });
  const guardSuspicion = await addEntity({
    type: 'clock',
    name: 'Podejrzenia Straży Miejskiej',
    description: '<p>Mira Caldas zaczyna łączyć fakty. Kiedy zegar się zapełni — bohaterowie są aresztowani.</p>',
    tags: ['zagrożenie', 'presja'],
    data: {
      segments: 6,
      filled: 1,
      isActive: true,
      tickLabels: [
        'Mira zauważa bohaterów na miejscu zbrodni',
        'Raport do Rady Miasta — bohaterowie pod obserwacją',
        'Przeszukanie kwatery bohaterów',
        'Nakaz aresztu wydany',
        'Aktywne pościgi po mieście',
        'Aresztowanie — bohaterowie w lochach',
      ],
    },
  });
  const smugglingNetwork = await addEntity({
    type: 'clock',
    name: 'Sieć przemytu artefaktów',
    description: '<p>Kael buduje nową trasę przemytu przez podziemia Ashenveil.</p>',
    tags: ['zagrożenie', 'gildia'],
    data: {
      segments: 6,
      filled: 2,
      isActive: true,
      tickLabels: [
        'Pierwsze kontakty z przemytnikami z Południa',
        'Bezpieczna droga przez kanały ustalona',
        'Magazyn artefaktów w karczmie uruchomiony',
        'Połowa miasta na liście płac Kaela',
        'Sieć poza kontrolą Rady — Kael dyktuje warunki',
        'Monopol kompletny — każdy handlarz pod ochroną Gildii',
      ],
    },
  });
  await addEntity({
    type: 'clock',
    name: 'Pakt z Demonem Cienia',
    description: '<p>Nieudana próba Velary zawiązania sojuszu z istotą z za Wrót. Demon został odpędzony — zegar martwy.</p>',
    tags: ['zakończone', 'przeszłość'],
    data: {
      segments: 4,
      filled: 4,
      isActive: false,
      tickLabels: [
        'Velara odnajduje zaklęcie przywołania',
        'Pierwszy kontakt z istotą poza Wrotami',
        'Negocjacje — Velara obiecuje zbyt wiele',
        'Demon odrzuca pakt i atakuje — rytuał zakończony fiaskiem',
      ],
    },
  });

  // ── Fronts & Threats ──────────────────────────────────────────────────────
  const mainFront = await addEntity({
    type: 'front',
    name: 'Koven i Wrota Nicości',
    description: '<p>Koven Mglistej Wieży jest bliski ukończenia rytuału otwarcia Wrót Nicości.</p>',
    tags: ['kampania', 'główny'],
    data: {
      category: 'campaign',
      goal: 'Powstrzymać Koven przed otwarciem Wrót Nicości i ocalić Ashenveil przed zagładą. Czas się kończy — każda sesja przybliża rytuał do finału.',
      stakes: [
        'Jeśli Wrota się otworzą, ciemność zaleje Ashenveil',
        'Czy bohaterowie zdążą powstrzymać rytuał?',
        'Co stanie się z Magistrą Velarą?',
        'Czy ktoś z grupy zostanie skuszony obietnicą Kovenu?',
      ],
    },
  });
  const secondFront = await addEntity({
    type: 'front',
    name: 'Korupcja w Gildii Kupieckiej',
    description: '<p>Kael Vortan buduje sieć przemytu artefaktów, która podmywa fundamenty miasta.</p>',
    tags: ['przygoda', 'miasto'],
    data: {
      category: 'adventure',
      goal: 'Zdemaskować Kaela Vortana i rozbić jego sieć przemytu, zanim przejmie kontrolę nad całym handlem w Ashenveil.',
      stakes: [
        'Czy Rada Miasta jest już kupiona?',
        'Co stanie się z dowodami znalezionymi przez bohaterów?',
        'Czy Mira stanie po ich stronie czy zostanie wciągnięta w sidła Gildii?',
      ],
    },
  });
  const threat1 = await addEntity({
    type: 'threat',
    name: 'Velara przyspiesza rytuał',
    description: '<p>Magistra wie, że ktoś śledzi Koven. Rytuał musi zostać ukończony przed kolejną pełnią księżyca.</p>',
    tags: ['koven', 'pilne'],
    data: {
      threatType: 'arcane_enemy',
      impulse: 'Ukończyć rytuał, zanim ktoś zakłóci plany',
      moves: ['Wynajmuje zabójców by odwrócić uwagę bohaterów', 'Kradnie ostatni składnik z biblioteki Brama', 'Manipuluje Radą Miasta przez szpiegów'],
    },
  });
  const threat2 = await addEntity({
    type: 'threat',
    name: 'Kael finansuje przemyt artefaktów',
    description: '<p>Gildia poszerza sieć. Kael wie o Koven — i chce z tego skorzystać.</p>',
    tags: ['gildia', 'kupcy'],
    data: {
      threatType: 'ambitious_organization',
      impulse: 'Wzbogacić się na magicznych artefaktach nim Wrota zostaną zamknięte',
      moves: ['Łapówki dla kluczowych strażników', 'Fałszywe dokumenty na skradzione artefakty', 'Szantaż świadków napadu na Brama'],
    },
  });

  // ── Sessions ──────────────────────────────────────────────────────────────
  const session1 = await addEntity({
    type: 'session',
    name: 'Sesja 1 — Przyjazd do Ashenveil',
    description: '<p>Bohaterowie przybyli do miasta, spotkali Mirę Caldas i odkryli tajemnicę karczmianego denuncjatora.</p>',
    tags: ['intro'],
    data: {
      number: 1,
      date: '2024-01-15',
      summary: 'Gracze dotarli do Ashenveil i zostali wmieszani w zagadkowe morderstwo. Aldric otarł się o Gildie, Senna śledziła posłańca Velary, Toryn znalazł ślad relikwii w bibliotece.',
      sortOrder: 0,
    },
  });
  const session2 = await addEntity({
    type: 'session',
    name: 'Sesja 2 — Sekrety Akademii',
    description: '<p>Wyprawa do ruin Akademii. Pierwsze spotkanie z rytuałem Kovenu — i ucieczka przed strażnikami.</p>',
    tags: ['eksploracja', 'akcja'],
    data: {
      number: 2,
      date: '2024-02-05',
      summary: 'Drużyna przedarła się do podziemi Akademii. Senna skradła Klucz Rytuału, Toryn rozpoznał znak demona na ołtarzu. Zegar Velary stał się głośniejszy.',
      sortOrder: 1,
    },
  });
  const session3 = await addEntity({
    type: 'session',
    name: 'Sesja 3 — Pościg przez podziemia',
    description: '<p>Kael wysyła zabójców. Bohaterowie muszą wybrać: chronić dowody przed Gildia czy zatrzymać rytuał.</p>',
    tags: ['pościg', 'wybór'],
    data: {
      number: 3,
      date: '2024-02-19',
      summary: 'Konfrontacja z wysłannikami Kaela w kanałach. Aldric ranny. Inicjały GK na sztylecie porzuconym przez zabójcę potwierdziły korupcję Gildii. Mira zaczyna wątpić.',
      sortOrder: 2,
    },
  });

  // ── Wątki (Threads) ───────────────────────────────────────────────────────
  // Thread colors use the dark-archive palette: --primary gold, --magic teal, --story burgundy
  const threadGates = await addEntity({
    type: 'thread',
    name: 'Tajemnica Wrót Nicości',
    description: '<p>Główny wątek kampanii — odkrycie, czym są Wrota i jak je zamknąć na zawsze.</p>',
    tags: ['główny', 'kampania'],
    data: { color: '#C9A227', status: 'active' }, // --primary gold
  });
  const threadCorruption = await addEntity({
    type: 'thread',
    name: 'Złoto i Korupcja',
    description: '<p>Ślad prowadzi od zatrutego sztyletu przez Gildie do Rady Miasta. Jak głęboko sięga korupcja?</p>',
    tags: ['polityka', 'miasto'],
    data: { color: '#E0B84A', status: 'active' }, // --primary-hover lighter gold
  });
  const threadRelic = await addEntity({
    type: 'thread',
    name: 'Relikwia Torvyna',
    description: '<p>Toryn szuka zaginionej relikwii swojego boga. Czy jest powiązana z Wrotami?</p>',
    tags: ['osobisty', 'toryn'],
    data: { color: '#3C8D8D', status: 'active' }, // --magic teal
  });
  const threadKey = await addEntity({
    type: 'thread',
    name: 'Klucz do pieczary',
    description: '<p>Podwątek dotyczący zdobycia i ochrony Klucza Rytuału — bez niego nie da się zamknąć krypty.</p>',
    tags: ['przedmiot', 'zadanie'],
    data: { color: '#7A2E3A', status: 'completed' }, // --story burgundy
  });

  // ── Wskazówki (Clues) ─────────────────────────────────────────────────────
  const clue1 = await addEntity({
    type: 'clue',
    name: 'Notatki Velary o rytuale',
    description: '<p>Fragmenty zeszytów znalezione w ruinach — opisują kolejne etapy rytuału i wymagane składniki.</p>',
    tags: ['dokument', 'rytuał'],
    data: { clueType: 'event', hint: 'Trzeci składnik to krew kogoś, kto widział Wrota na własne oczy', discovered: false },
  });
  const clue2 = await addEntity({
    type: 'clue',
    name: 'Inicjały GK na sztylecie',
    description: '<p>Sztylet porzucony przez zabójcę. Inicjały "GK" — Gildia Kupiecka lub... Kael osobiście?</p>',
    tags: ['dowód', 'fizyczny'],
    data: { clueType: 'character', hint: 'Sztylet pochodzi z prywatnej kolekcji Kaela — karczmarz to potwierdzi', discovered: true },
  });
  const clue3 = await addEntity({
    type: 'clue',
    name: 'Sekretne przejście pod Akademią',
    description: '<p>Ukryte wejście do podziemi z tyłu Akademii — używane przez Koven do nocnych rytuałów.</p>',
    tags: ['lokacja', 'sekret'],
    data: { clueType: 'location', hint: 'Przejście otwiera się o północy gdy Klucz Rytuału świeci niebiesko', discovered: true },
  });
  const clue4 = await addEntity({
    type: 'clue',
    name: 'Szept demona — ostrzeżenie',
    description: '<p>Toryn usłyszał szept w podziemiach: "Zamknięcie Wrót kosztuje tyle samo co otwarcie — życie."</p>',
    tags: ['przepowiednia', 'demon'],
    data: { clueType: 'event', hint: 'Zamknięcie Wrót może wymagać dobrowolnej ofiary — ktoś musi wejść i nie wyjść', discovered: true },
  });
  const clue5 = await addEntity({
    type: 'clue',
    name: 'Skrzynka z falsyfikatami',
    description: '<p>Skrzynka znaleziona na zapleczu karczmy — fałszywe dokumenty celne z pieczęcią Rady Miasta.</p>',
    tags: ['dowód', 'korupcja'],
    data: { clueType: 'event', hint: 'Pieczęć należy do radnego Orvisa — jest na liście płac Kaela', discovered: false },
  });
  const clue6 = await addEntity({
    type: 'clue',
    name: 'Zjawa w piwnicy Akademii',
    description: '<p>Widmo starego magistra blokujące przejście do krypty — ostrzega przed otwarciem ołtarza.</p>',
    tags: ['zjawa', 'ostrzeżenie'],
    data: { clueType: 'location', hint: 'Zjawa jest byłym strażnikiem Akademii — potrafi powiedzieć jak zamknąć Wrota', discovered: false },
  });

  // ── Notes (notatki sesji) ─────────────────────────────────────────────────
  const note1 = await addEntity({
    type: 'note',
    name: 'Aldric rozpoznaje sztylet',
    description: '',
    tags: [],
    data: {
      content: "Aldric zidentyfikował inicjały \"GK\" na sztylecie — twierdzi, że widział taki sam u obstawy Kaela w karczmie. *Mocny dowód*, ale ryzykowny, żeby z nim iść do Rady.",
      sessionId: session3.id,
      createdAt: '2024-02-19T20:30:00.000Z',
    },
  });
  const note2 = await addEntity({
    type: 'note',
    name: 'Toryn i szept demona',
    description: '',
    tags: [],
    data: {
      content: 'Toryn słyszał wyraźnie: *„Zamknięcie kosztuje tyle samo co otwarcie"*. Bram powiedział, że to cytat z zaginionego traktatu — sugeruje dobrowolną ofiarę. Sprawdzić czy relikwia Torvyna jest jakoś powiązana z tym zamknięciem.',
      sessionId: session2.id,
      createdAt: '2024-02-05T21:15:00.000Z',
    },
  });
  const note3 = await addEntity({
    type: 'note',
    name: 'Senna śledzi posłańca Velary',
    description: '',
    tags: [],
    data: {
      content: 'Senna widziała młodego posłańca wychodzącego z pałacu Rady z zapieczętowaną kopertą. Kopertę zabrał Bram — ten miał ją zniszczyć, ale się zawahał. Może warto do niego wrócić.',
      sessionId: session1.id,
      createdAt: '2024-01-15T22:00:00.000Z',
    },
  });
  const note4 = await addEntity({
    type: 'note',
    name: 'Klucz Rytuału — obserwacja',
    description: '',
    tags: [],
    data: {
      content: 'Klucz zaczął świecić na niebiesko gdy Senna zbliżyła się do ołtarza. Wskazówka na tablicy mówiła o „północy i świetle księżyca". Hipoteza: klucz reaguje na magię przywołania, nie na czas.',
      sessionId: session2.id,
      createdAt: '2024-02-05T22:45:00.000Z',
    },
  });
  const note5 = await addEntity({
    type: 'note',
    name: 'Mira Caldas — można ją pozyskać?',
    description: '',
    tags: [],
    data: {
      content: 'Po konfrontacji w kanałach Mira wyglądała na wstrząśniętą. Nie aresztowała drużyny mimo nakazu. Może warto zaryzykować i pokazać jej skrzynkę z falsyfikatami — jeśli jest uczciwa, stanie się naszą tarczą przed Radą.',
      sessionId: session3.id,
      createdAt: '2024-02-19T21:00:00.000Z',
    },
  });

  // ── Session Events (SessionTimeline — chronologiczny przebieg sesji) ───────
  const ev1a = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Drużyna przybywa do Ashenveil furmanką. Na bramie kontrola strażnicza — Mira sprawdza dokumenty.', timestamp: '2024-01-15T18:00:00.000Z' },
  });
  const ev1b = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Nocna rozmowa z karczmarzem. Senna zauważa posłańca wychodzącego tylnym wyjściem z zapieczętowaną kopertą.', timestamp: '2024-01-15T21:00:00.000Z' },
  });
  const ev1c = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Toryn w bibliotece. Bram pokazuje mu fragment traktatu o Wrotach — urwany w połowie zdania. Ktoś wyrwał karty.', timestamp: '2024-01-15T22:30:00.000Z' },
  });
  const ev2a = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Wyprawa do ruin. Senna odnajduje ukryte wejście do podziemi — mur przesuwa się po dotknięciu runy Łuku.', timestamp: '2024-02-05T19:00:00.000Z' },
  });
  const ev2b = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'W krypcie — ołtarz z obsydianu, świecące runy. Toryn słyszy szept: „Zamknięcie kosztuje tyle samo co otwarcie."', timestamp: '2024-02-05T21:00:00.000Z' },
  });
  const ev2c = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Senna kradnie Klucz Rytuału z ołtarza. Alarm — straże Kovenu! Ucieczka przez sekretny korytarz pod kanałem.', timestamp: '2024-02-05T22:00:00.000Z' },
  });
  const ev3a = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Zasadzka w kanałach. Zabójcy Kaela — trójka w czarnych płaszczach. Aldric ranny w ramię chroniąc Sennę.', timestamp: '2024-02-19T20:00:00.000Z' },
  });
  const ev3b = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Porzucony sztylet z inicjałami GK. Aldric rozpoznaje go — widział taki sam u obstawy Kaela w karczmie.', timestamp: '2024-02-19T20:30:00.000Z' },
  });
  const ev3c = await addEntity({
    type: 'event',
    name: '',
    description: '',
    tags: [],
    data: { text: 'Mira Caldas pojawia się na miejscu walki. Patrzy na sztylet długą chwilę. Nie aresztuje drużyny.', timestamp: '2024-02-19T21:30:00.000Z' },
  });

  // ── Relations ─────────────────────────────────────────────────────────────

  // Lokacje — hierarchia contains
  await addRelation({ type: 'contains', sourceId: city.id, targetId: tavern.id });
  await addRelation({ type: 'contains', sourceId: city.id, targetId: ruins.id });
  await addRelation({ type: 'contains', sourceId: ruins.id, targetId: cellar.id });

  // Frakcje — siedziby (location belongs_to faction)
  await addRelation({ type: 'belongs_to', sourceId: ruins.id, targetId: magesCoven.id });
  await addRelation({ type: 'belongs_to', sourceId: tavern.id, targetId: merchantGuild.id });

  // NPC → Faction
  await addRelation({ type: 'belongs_to', sourceId: magistra.id, targetId: magesCoven.id });
  await addRelation({ type: 'belongs_to', sourceId: guildmaster.id, targetId: merchantGuild.id });

  // NPC → Location (kontekst — gdzie przebywają)
  await addRelation({ type: 'contains', sourceId: ruins.id, targetId: magistra.id });
  await addRelation({ type: 'contains', sourceId: tavern.id, targetId: guildmaster.id });
  await addRelation({ type: 'contains', sourceId: city.id, targetId: guard.id });
  await addRelation({ type: 'contains', sourceId: city.id, targetId: archivist.id });

  // NPC owns Item
  await addRelation({ type: 'owns', sourceId: magistra.id, targetId: amulet.id });
  await addRelation({ type: 'owns', sourceId: senna.id, targetId: ritualKey.id });

  // Threat → Front
  await addRelation({ type: 'belongs_to', sourceId: threat1.id, targetId: mainFront.id });
  await addRelation({ type: 'belongs_to', sourceId: threat2.id, targetId: secondFront.id });

  // Threat → Clock
  await addRelation({ type: 'tracks', sourceId: threat1.id, targetId: openingGates.id });
  await addRelation({ type: 'tracks', sourceId: threat2.id, targetId: smugglingNetwork.id });

  // Wskazówki → Zagrożenia / Fronty
  await addRelation({ type: 'clues_for', sourceId: clue1.id, targetId: threat1.id });
  await addRelation({ type: 'clues_for', sourceId: clue2.id, targetId: threat2.id });
  await addRelation({ type: 'clues_for', sourceId: clue3.id, targetId: mainFront.id });
  await addRelation({ type: 'clues_for', sourceId: clue4.id, targetId: mainFront.id });
  await addRelation({ type: 'clues_for', sourceId: clue5.id, targetId: threat2.id });
  await addRelation({ type: 'clues_for', sourceId: clue6.id, targetId: threat1.id });

  // Wskazówki → powiązane encje
  await addRelation({ type: 'related_to', sourceId: clue2.id, targetId: guildmaster.id, label: 'dotyczy' });
  await addRelation({ type: 'related_to', sourceId: clue3.id, targetId: ruins.id, label: 'lokacja' });
  await addRelation({ type: 'related_to', sourceId: clue6.id, targetId: cellar.id, label: 'lokacja' });

  // Wątki → Sesje (appears_in)
  await addRelation({ type: 'appears_in', sourceId: threadGates.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: threadGates.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: threadGates.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: threadCorruption.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: threadCorruption.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: threadRelic.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: threadRelic.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: threadKey.id, targetId: session2.id });

  // Wątek derives_from (hierarchia)
  await addRelation({ type: 'derives_from', sourceId: threadKey.id, targetId: threadGates.id });

  // NPC / Lokacje / Itemy → Sesje (appears_in)
  await addRelation({ type: 'appears_in', sourceId: guard.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: tavern.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: poisonedBlade.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: magistra.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: ruins.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: cellar.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: ritualKey.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: archivist.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: guildmaster.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: poisonedBlade.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: guard.id, targetId: session3.id });

  // PC → Sesje (appears_in)
  await addRelation({ type: 'appears_in', sourceId: aldric.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: senna.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: toryn.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: aldric.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: senna.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: toryn.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: aldric.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: senna.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: toryn.id, targetId: session3.id });

  // NPC relacje
  await addRelation({ type: 'related_to', sourceId: magistra.id, targetId: guildmaster.id, label: 'sojusznicy (wzajemna nieufność)' });
  await addRelation({ type: 'related_to', sourceId: guard.id, targetId: magistra.id, label: 'podejrzewa' });
  await addRelation({ type: 'related_to', sourceId: archivist.id, targetId: ruins.id, label: 'znał Akademię przed ruiną' });
  await addRelation({ type: 'related_to', sourceId: guard.id, targetId: guildmaster.id, label: 'szuka dowodów' });

  // Zegar straży (presja) — nie jest powiązany z frontem/zagrożeniem bezpośrednio, ale z NPC Miry
  await addRelation({ type: 'related_to', sourceId: guardSuspicion.id, targetId: guard.id, label: 'zegar Miry' });

  // Notatki → powiązane encje (related_to)
  await addRelation({ type: 'related_to', sourceId: note1.id, targetId: poisonedBlade.id, label: 'dotyczy' });
  await addRelation({ type: 'related_to', sourceId: note1.id, targetId: guildmaster.id, label: 'podejrzany' });
  await addRelation({ type: 'related_to', sourceId: note2.id, targetId: clue4.id, label: 'powiązana wskazówka' });
  await addRelation({ type: 'related_to', sourceId: note2.id, targetId: toryn.id, label: 'doświadczył' });
  await addRelation({ type: 'related_to', sourceId: note3.id, targetId: senna.id, label: 'obserwowała' });
  await addRelation({ type: 'related_to', sourceId: note3.id, targetId: magistra.id, label: 'zleceniodawca posłańca' });
  await addRelation({ type: 'related_to', sourceId: note4.id, targetId: ritualKey.id, label: 'dotyczy' });
  await addRelation({ type: 'related_to', sourceId: note4.id, targetId: clue3.id, label: 'powiązana wskazówka' });
  await addRelation({ type: 'related_to', sourceId: note5.id, targetId: guard.id, label: 'dotyczy' });
  await addRelation({ type: 'related_to', sourceId: note5.id, targetId: clue5.id, label: 'plan działania' });

  // Session Events → Sessions (appears_in)
  await addRelation({ type: 'appears_in', sourceId: ev1a.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: ev1b.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: ev1c.id, targetId: session1.id });
  await addRelation({ type: 'appears_in', sourceId: ev2a.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: ev2b.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: ev2c.id, targetId: session2.id });
  await addRelation({ type: 'appears_in', sourceId: ev3a.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: ev3b.id, targetId: session3.id });
  await addRelation({ type: 'appears_in', sourceId: ev3c.id, targetId: session3.id });
}

/** True if there's at least one entity in the database */
export async function hasExistingData(db: MgHelperDb): Promise<boolean> {
  const count = await db.entities.count();
  return count > 0;
}

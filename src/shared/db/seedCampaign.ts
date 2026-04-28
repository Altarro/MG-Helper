import type { MgHelperDb } from './database';
import { addEntity as _addEntity, addRelation as _addRelation, updateEntity } from '@shared/db/operations';
import type { Entity, NewEntity, NewRelation } from '@shared/types';
import { createGeneratorDemoPacks } from '@modules/generator/demoPacks';
import { appendGeneratorRollLog, importGeneratorPacks } from '@modules/generator/repository';

type EntityMap<T extends Record<string, NewEntity>> = {
  [K in keyof T]: Entity;
};

async function createEntityMap<T extends Record<string, NewEntity>>(
  definitions: T,
  addEntity: (data: NewEntity) => Promise<Entity>,
): Promise<EntityMap<T>> {
  const created = {} as EntityMap<T>;

  for (const [key, definition] of Object.entries(definitions) as [keyof T, NewEntity][]) {
    created[key] = await addEntity(definition);
  }

  return created;
}

async function addRelations(
  relations: NewRelation[],
  addRelation: (data: NewRelation) => Promise<unknown>,
): Promise<void> {
  for (const relation of relations) {
    await addRelation(relation);
  }
}

/**
 * Seeds the database with a large sample campaign.
 * Should only be called on user request (e.g. onboarding dialog).
 */
export async function seedDemoData(db: MgHelperDb): Promise<void> {
  const campaignId = getCampaignIdFromDb(db);
  await db.transaction('rw', db.entities, db.relations, db.assets, async () => {
    await db.entities.clear();
    await db.relations.clear();
    await db.assets.clear();
  });
  await db.transaction('rw', db.generatorPacks, db.generatorRollLogs, async () => {
    await db.generatorPacks.where('campaignId').equals(campaignId).delete();
    await db.generatorRollLogs.where('campaignId').equals(campaignId).delete();
  });

  const addEntity = _addEntity.bind(null, db);
  const addRelation = _addRelation.bind(null, db);

  // ── Postacie graczy (PC) ──────────────────────────────────────────────────
  const playerCharacters = await createEntityMap({
    iria: {
      type: 'npc',
      name: 'Iria Fen',
      description:
        '<p>Łotrzyca, kartografka i specjalistka od wejść, których na mapie nie powinno być. Szuka dowodu, że jej ojciec nie zginął jako zdrajca portu.</p>',
      tags: ['gracz', 'zwiadowca'],
      data: {
        isPC: true,
        playerName: 'Kasia',
        instinct: 'Wślizgnąć się tam, gdzie inni widzą tylko zamknięte drzwi',
        motivation: 'Oczyścić imię ojca i odzyskać jego ostatnią mapę',
        appearance: 'Krótko obcięte włosy, woskowany płaszcz, skórzana tuba na mapy',
        playStyle: 'Iria mówi szybko, obserwuje wszystko i rzadko staje w miejscu. Gdy robi się niebezpiecznie, szuka przewagi przez pozycję i informacje.',
      },
    },
    borin: {
      type: 'npc',
      name: 'Borin Sztormowy',
      description:
        '<p>Były bosman okrętu wojennego, który po przegranej kampanii wrócił do portu z długiem i poczuciem winy. Teraz chroni ludzi, których morze zwykle zabiera pierwszych.</p>',
      tags: ['gracz', 'wojownik'],
      data: {
        isPC: true,
        playerName: 'Michał',
        instinct: 'Stanąć pomiędzy zagrożeniem a kimś słabszym',
        motivation: 'Spłacić dawny dług krwi wobec miasta i załogi',
        appearance: 'Szerokie ramiona, kurtka marynarska połatana liną, złamany nos',
        playStyle: 'Borin jest bezpośredni, solidny i nie lubi półprawd. W scenach napięcia bierze na siebie ciężar decyzji i presji.',
      },
    },
    mara: {
      type: 'npc',
      name: 'Mara Vey',
      description:
        '<p>Adeptka dawnej astrologii portowej. W snach słyszy to, co śpiewa woda pod miastem, i coraz gorzej odróżnia proroctwo od pokusy.</p>',
      tags: ['gracz', 'mistyczka'],
      data: {
        isPC: true,
        playerName: 'Ola',
        instinct: 'Słuchać znaków, których inni wolą nie zauważać',
        motivation: 'Zrozumieć, dlaczego morze odpowiada właśnie jej',
        appearance: 'Popielate włosy, księżycowe tatuaże na dłoniach, sól osiadająca na kołnierzu',
        playStyle: 'Mara mówi spokojnie, ale nigdy przypadkiem. W scenach grozy nie ucieka od symboli ani rytuałów, tylko wchodzi w nie głębiej.',
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── NPCs ──────────────────────────────────────────────────────────────────
  const npcs = await createEntityMap({
    ada: {
      type: 'npc',
      name: 'Komandorka Ada Merrow',
      description:
        '<p>Dowódczyni straży portowej. Twarda, zasadnicza i coraz bardziej świadoma, że rozkazy z góry nie służą już mieszkańcom.</p>',
      tags: ['straż', 'sojusznik'],
      data: {
        instinct: 'Trzymać miasto w ryzach, nawet gdy pęka pod stopami',
        motivation: 'Ocalić port przed wojną domową i paniką',
        appearance: 'Granatowy płaszcz z mosiężnymi klamrami, włosy spięte pod karkiem, zmęczone oczy',
        playStyle: 'Ada oszczędza słowa, ale każde coś waży. Jeśli uzna bohaterów za wiarygodnych, zaczyna dzielić się rzeczami, których nie powinna mówić głośno.',
      },
    },
    ryn: {
      type: 'npc',
      name: 'Kapitan Ryn Halveth',
      description:
        '<p>Prywatny przewoźnik z przeszłością korsarza. Zna każdy boczny kanał i prawie każdego dłużnika w mieście.</p>',
      tags: ['kapitan', 'kontakt'],
      data: {
        instinct: 'Zawsze mieć przygotowaną drogę odwrotu',
        motivation: 'Spłacić dawny dług, zanim dług upomni się o niego',
        appearance: 'Płaszcz z zielonej ceraty, srebrny ząb, dłonie poorane liną',
        playStyle: 'Ryn jest swobodny, ironiczny i wie więcej, niż chce powiedzieć. Gdy rozmowa schodzi na stare sprawy, nagle robi się poważny.',
      },
    },
    toman: {
      type: 'npc',
      name: 'Archiwista Toman Pell',
      description:
        '<p>Opiekun Archiwum Solnego. Gromadzi nie tylko dokumenty, ale i te wersje historii, których nikt oficjalnie nie spisał.</p>',
      tags: ['uczony', 'informator'],
      data: {
        instinct: 'Ocalić prawdę nawet wtedy, gdy trzeba ją schować',
        motivation: 'Doprowadzić do ujawnienia prawdziwej historii Latarni',
        appearance: 'Wysoki kołnierz, szkła w cienkiej oprawie, atrament na palcach',
        playStyle: 'Toman mówi precyzyjnie i lubi prowadzić przez dokumenty, cytaty i porównania. Nie ufa emocjom, dopóki nie zobaczy papieru albo relikwii.',
      },
    },
    elsera: {
      type: 'npc',
      name: 'Mistrzyni Elsera Vale',
      description:
        '<p>Obecna strażniczka Latarni Pękniętych Gwiazd. Była świadkiem nieudanego rytuału sprzed lat i nosi ten wstyd jak piętno.</p>',
      tags: ['latarnia', 'tajemnica'],
      data: {
        instinct: 'Powstrzymać katastrofę, nawet jeśli trzeba coś przemilczeć',
        motivation: 'Nie dopuścić do powtórki sprzed siedemnastu lat',
        appearance: 'Siwe pasma we włosach, poparzone dłonie, ciężki płaszcz z haftem gwiazd',
        playStyle: 'Elsera jest zdyscyplinowana i spięta. Gdy rozmowa zbliża się do pierwszego rytuału, zaczyna mówić krótszymi zdaniami i patrzy w bok.',
      },
    },
    syrene: {
      type: 'npc',
      name: 'Matka Syrene Voss',
      description:
        '<p>Przeorysza Opactwa Pływów i ukryta przywódczyni Zakonu Głębokiej Ciszy. Wierzy, że pod miastem śpi zbawienie, nie zagłada.</p>',
      tags: ['kult', 'antagonista'],
      data: {
        instinct: 'Przekuć rozpacz ludzi w posłuszeństwo wobec głębi',
        motivation: 'Otworzyć Komorę Pływu i przemienić miasto przez ofiarę',
        appearance: 'Ciemny habit z solnym nalotem, ciche ruchy, głos jak spokojna toń',
        playStyle: 'Syrene nigdy nie podnosi głosu. Mówi łagodnie, prawie matczynym tonem, ale każde zdanie próbuje wciągnąć rozmówcę pół kroku głębiej.',
      },
    },
    oren: {
      type: 'npc',
      name: 'Radny Oren Vaal',
      description:
        '<p>Najbardziej wpływowy głos w Radzie Portu. Publicznie obiecuje stabilność, prywatnie wycenia ją w sztabach srebra.</p>',
      tags: ['rada', 'korupcja'],
      data: {
        instinct: 'Zamienić każdy kryzys w przewagę negocjacyjną',
        motivation: 'Sprzedać kontrolę nad portem zanim wszyscy zrozumieją stawkę',
        appearance: 'Perfekcyjny płaszcz, sygnet rady, uśmiech wyuczony na sali obrad',
        playStyle: 'Oren jest uprzejmy, gładki i prawie nigdy nie mówi wprost “nie”. Zamiast tego pyta, ile ktoś jest gotów poświęcić.',
      },
    },
    nox: {
      type: 'npc',
      name: 'Nox Szelest',
      description:
        '<p>Szefowa Czarnych Żagli. Przemytniczka, która zna kanały lepiej niż oficjalne mapy i sprzedaje informacje równie chętnie co towary.</p>',
      tags: ['przemytniczka', 'kanały'],
      data: {
        instinct: 'Być pierwszą przy okazji i ostatnią przy konsekwencji',
        motivation: 'Przejąć szlaki pod miastem zanim zrobi to kult albo rada',
        appearance: 'Skórzany kołnierz, tatuaż z kotwicą za uchem, miękkie buty bez obcasów',
        playStyle: 'Nox bawi się tempem rozmowy. Raz prowokuje, raz mruczy niemal serdecznie, ale zawsze testuje, ile może ugrać bez noża na stole.',
      },
    },
    ysma: {
      type: 'npc',
      name: 'Doktor Ysma Corven',
      description:
        '<p>Lekarka z Solnego Szpitala. Widzi, że “choroba” szerząca się po mieście nie zachowuje się jak żadna zaraza, którą zna.</p>',
      tags: ['lekarka', 'sojusznik'],
      data: {
        instinct: 'Ratować to, co jeszcze da się uratować',
        motivation: 'Znaleźć źródło solnej mgły zanim oddział chorych pęknie w szwach',
        appearance: 'Zakrwawiony fartuch pod płaszczem, spięte rękawy, cienie pod oczami',
        playStyle: 'Ysma jest rzeczowa i szybka. Gdy sytuacja się psuje, nie filozofuje, tylko zadaje konkretne pytania i wymaga konkretów.',
      },
    },
    caelum: {
      type: 'npc',
      name: 'Brat Caelum',
      description:
        '<p>Młody mnich z Opactwa Pływów. Oficjalnie wierny Syrene, w praktyce coraz bardziej przerażony tym, co widzi nocą w ogrodach.</p>',
      tags: ['mnich', 'wątpliwości'],
      data: {
        instinct: 'Przetrwać wśród silniejszych przez uległość',
        motivation: 'Odkupić milczenie, zanim rytuał pochłonie niewinnych',
        appearance: 'Wychudzona twarz, poobgryzane paznokcie, wilgotne od mgły rękawy habitu',
        playStyle: 'Caelum ogląda się przez ramię nawet w bezpiecznym miejscu. Zaczyna półsłówkami i dopiero po okazaniu zaufania mówi coś naprawdę ważnego.',
      },
    },
    garet: {
      type: 'npc',
      name: 'Stary Garet Nur',
      description:
        '<p>Były nurek ratowniczy, który schodził do zatopionych komnat jeszcze zanim kanały zamknięto. Wie, gdzie kończy się kamień, a zaczyna coś starszego.</p>',
      tags: ['nurek', 'wiedza lokalna'],
      data: {
        instinct: 'Nie wracać pod wodę bez ceny wartej ryzyka',
        motivation: 'Uregulować rachunki z miejscem, które zabrało jego brata',
        appearance: 'Zgarbiony, z żylastymi dłońmi i sznurem kościanych amuletów na nadgarstku',
        playStyle: 'Garet mówi powoli i z pauzami, jakby słuchał czegoś pomiędzy własnymi zdaniami. Najbardziej szczery bywa wtedy, gdy patrzy na wodę, a nie na ludzi.',
      },
    },
    mina: {
      type: 'npc',
      name: 'Mina Sólka',
      description:
        '<p>Nastolatka z doków, roznosząca paczki i plotki szybciej niż oficjalni gońcy. Widziała za dużo jak na swój wiek i wciąż jeszcze nie uciekła z miasta.</p>',
      tags: ['dziecko ulicy', 'informator'],
      data: {
        instinct: 'Przeżyć dzięki temu, że jest zawsze o krok wcześniej',
        motivation: 'Odnaleźć zaginione dzieci z doków i nie dać się sprzedać jak towar',
        appearance: 'Za duża kurtka, sprane rękawiczki bez palców, sól w rudych włosach',
        playStyle: 'Mina rzuca informacjami szybko i patrzy, czy ktoś nadąża. Kiedy boi się naprawdę, zaczyna żartować za dużo.',
      },
    },
    verrick: {
      type: 'npc',
      name: 'Bosman Verrick Dane',
      description:
        '<p>Najemny brutal opłacany przez Czarnych Żagli. Tam, gdzie ma wejść strach, zwykle najpierw pojawia się jego hak i ciężkie kroki.</p>',
      tags: ['najemnik', 'zagrożenie'],
      data: {
        instinct: 'Złamać opór szybko i publicznie',
        motivation: 'Przejąć fort dla tych, którzy płacą dziś najlepiej',
        appearance: 'Masywny płaszcz bosmański, żelazny hak zamiast lewej dłoni, twarz poorana bliznami',
        playStyle: 'Verrick nie lubi złożonych argumentów. Grozi otwarcie, śmieje się z cudzego oporu i rozumie tylko siłę, przewagę albo zysk.',
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Lokacje ───────────────────────────────────────────────────────────────
  const region = await createEntityMap({
    greyCoast: {
      type: 'location',
      name: 'Marchia Szarego Wybrzeża',
      description:
        '<p>Wietrzna prowincja na północy, zbudowana wokół portów, klifów i połowów. Morze jest tu zarówno bogactwem, jak i wyrokiem.</p>',
      tags: ['region', 'wybrzeże'],
      data: {
        locationType: 'region',
        danger: 1,
        senses: {
          see: 'Poszarpane klify, czarne wodorosty, światła portu daleko w dole',
          hear: 'Stały huk fal i skrzek mew',
          smell: 'Sól, mokry kamień i dym z pieców',
          feel: 'Wiatr wciskający się pod płaszcz',
        },
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  const greaterLocations = await createEntityMap({
    duskport: {
      type: 'location',
      name: 'Port Siołmrok',
      description:
        '<p>Duże miasto handlowe zbudowane na starych fundamentach. Pod brukiem biegną kanały, a pod kanałami coś jeszcze starszego.</p>',
      tags: ['miasto', 'port'],
      data: {
        locationType: 'city',
        danger: 2,
        senses: {
          see: 'Las masztów, mokry bruk, wieża latarni nad dachami',
          hear: 'Dzwony portowe, targowanie, szum przypływu pod deskami',
          smell: 'Smoła, ryby, sól i dym',
          feel: 'Miasto żyje szybciej, niż daje oddech',
        },
      },
    },
    tideAbbey: {
      type: 'location',
      name: 'Opactwo Pływów',
      description:
        '<p>Kamienne opactwo poza miastem, oficjalnie prowadzące schronienie dla rozbitków. Nocą jego krużganki należą do cichszych modlitw.</p>',
      tags: ['opactwo', 'religia'],
      data: {
        locationType: 'building',
        danger: 2,
        senses: {
          see: 'Bielone mury, mokre schody, lampy osłonięte mlecznym szkłem',
          hear: 'Chorały i kapanie wody w krużgankach',
          smell: 'Wosk, kadzidło i sól morska',
          feel: 'Spokój zbyt równy, by był naturalny',
        },
      },
    },
    whisperCliffs: {
      type: 'location',
      name: 'Klif Szeptów',
      description:
        '<p>Nadmorskie urwisko na północ od portu. Fale biją tu w skałę tak, że w nocy naprawdę słychać coś na kształt słów.</p>',
      tags: ['klif', 'tajemnica'],
      data: {
        locationType: 'wilderness',
        danger: 3,
        senses: {
          see: 'Czarne skały, biała piana i mokre szczeliny prowadzące w dół',
          hear: 'Powtarzające się szepty niesione wiatrem',
          smell: 'Algi, mokry granit i ozon',
          feel: 'Zawroty głowy od samego stania przy krawędzi',
        },
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  const cityLocations = await createEntityMap({
    oldDocks: {
      type: 'location',
      name: 'Stare Doki',
      description:
        '<p>Najstarsza część portu, pełna opuszczonych pomostów, nielegalnych ładunków i ludzi, którzy widzą za dużo.</p>',
      tags: ['doki', 'przemyt'],
      data: {
        locationType: 'building',
        danger: 3,
        senses: {
          see: 'Spróchniałe pale, skrzynie bez znaków, ślady soli na deskach',
          hear: 'Skrzypienie lin i stłumione rozmowy za magazynami',
          smell: 'Mokra deska, rybia krew i smoła',
          feel: 'Każdy ruch obserwuje więcej niż jedna para oczu',
        },
      },
    },
    ashMarket: {
      type: 'location',
      name: 'Targ Popiołu',
      description:
        '<p>Serce handlu w Siołmroku. Kupcy, dłużnicy i plotkarze mieszają się tu tak gęsto, że informacja ma wartość waluty.</p>',
      tags: ['targ', 'handel'],
      data: {
        locationType: 'building',
        danger: 1,
        senses: {
          see: 'Błyszczące stragany, pieczęcie gildii, portowe wagi',
          hear: 'Wykrzykiwane ceny i pośpieszne kłótnie',
          smell: 'Przyprawy, węgiel drzewny i kawa z południa',
          feel: 'Każdy coś kupuje albo sprzedaje, nawet jeśli to nie jest towar',
        },
      },
    },
    saltArchive: {
      type: 'location',
      name: 'Archiwum Solne',
      description:
        '<p>Archiwum miejskie zbudowane na starym magazynie soli. Dolne półki zawsze są wilgotne, jakby ściany oddychały od strony kanałów.</p>',
      tags: ['archiwum', 'dokumenty'],
      data: {
        locationType: 'building',
        danger: 1,
        senses: {
          see: 'Regały aż pod sufit, mapy suszone przy piecach, skrzynki z pieczęciami',
          hear: 'Szelest papieru i ciche skrobanie piór',
          smell: 'Pergamin, pył i sól',
          feel: 'Tutaj każde słowo może być dowodem albo wyrokiem',
        },
      },
    },
    astronomersTower: {
      type: 'location',
      name: 'Wieża Astronomów',
      description:
        '<p>Dawna wieża pomiarowa Bractwa Latarni. Jej soczewki nie służą już do gwiazd, ale do śledzenia tego, co porusza się nad i pod wodą.</p>',
      tags: ['wieża', 'bractwo'],
      data: {
        locationType: 'building',
        danger: 2,
        senses: {
          see: 'Mosiężne tuby, pęknięte lunety, światło załamane w szkle',
          hear: 'Terkot mechanizmów i drgania nad głową',
          smell: 'Olej, pył szklany i zimny metal',
          feel: 'Miejsce stworzone do patrzenia dalej, niż powinno się dać',
        },
      },
    },
    starLantern: {
      type: 'location',
      name: 'Latarnia Pękniętych Gwiazd',
      description:
        '<p>Najważniejsza latarnia na wybrzeżu. Jej światło nie gaśnie całkiem, ale od miesięcy miewa niebezpieczne przebłyski w kolorach, których nie zna morze.</p>',
      tags: ['latarnia', 'magia'],
      data: {
        locationType: 'building',
        danger: 4,
        senses: {
          see: 'Wielka soczewka, wypalone runy i snopy niestabilnego światła',
          hear: 'Pulsujący pogłos wewnątrz kamienia',
          smell: 'Ozon, ciepłe szkło i przypalony wosk',
          feel: 'Ciśnienie za oczami, jak przy nadchodzącej burzy',
        },
      },
    },
    northFort: {
      type: 'location',
      name: 'Fort Północny',
      description:
        '<p>Kamienna siedziba straży i rady wojennej. Oficjalnie broni portu, nieoficjalnie zamyka w nim prawdę równie skutecznie jak ludzi.</p>',
      tags: ['fort', 'władza'],
      data: {
        locationType: 'building',
        danger: 2,
        senses: {
          see: 'Grube mury, stalowe kraty i ogłoszenia z pieczęcią rady',
          hear: 'Marszowe kroki, rozkazy i skrzypienie piór po rejestrach',
          smell: 'Olej do broni, pot i mokry kamień',
          feel: 'Każdy błąd zostaje tu zapisany',
        },
      },
    },
    brineCanals: {
      type: 'location',
      name: 'Kanały Podsolne',
      description:
        '<p>Podziemna sieć korytarzy pod miastem. Część służy odwadnianiu, część przemytowi, a część nikomu żywemu nie powinna już służyć.</p>',
      tags: ['kanały', 'podziemia'],
      data: {
        locationType: 'dungeon',
        danger: 4,
        senses: {
          see: 'Wąskie pomosty, śliskie sklepienia i zardzewiałe śluzy',
          hear: 'Kap, plusk i odległe echo kroków',
          smell: 'Pleśń, sól i stojąca woda',
          feel: 'Zimno idące od kamienia prosto w kości',
        },
      },
    },
    saltHospital: {
      type: 'location',
      name: 'Solny Szpital',
      description:
        '<p>Miejski szpital polowy rozbudowany po ostatnich sztormach. Łóżka zajmują nie tylko ranni marynarze, ale też ludzie z białym nalotem na płucach.</p>',
      tags: ['szpital', 'zaraza'],
      data: {
        locationType: 'building',
        danger: 2,
        senses: {
          see: 'Białe prześcieradła, miednice z wodą, podkrążone twarze',
          hear: 'Kaszel, szept modlitw i krótko wydawane polecenia',
          smell: 'Spirytus, zioła i słona wilgoć',
          feel: 'Zmęczenie, które osiada na skórze zaraz po wejściu',
        },
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  const innerLocations = await createEntityMap({
    warehouse12: {
      type: 'location',
      name: 'Magazyn 12',
      description:
        '<p>Niby zwykły magazyn przeładunkowy, ale pod podłogą ma ukryte zejście do bocznego kanału. To jeden z głównych punktów Czarnych Żagli.</p>',
      tags: ['magazyn', 'przemytnicy'],
      data: {
        locationType: 'room',
        danger: 3,
        senses: {
          see: 'Skrzynie bez oznaczeń, podłoga starta w jednym miejscu, mokre ślady butów',
          hear: 'Stłumione pukanie spod desek',
          smell: 'Drewno, mokra juta i olej lampowy',
          feel: 'Ktoś zaraz tu wróci',
        },
      },
    },
    mapRoom: {
      type: 'location',
      name: 'Sala Map',
      description:
        '<p>Najbardziej chroniona część Archiwum Solnego. Przechowuje stare mapy kanałów, dawnych fundamentów i szlaków, których nie ma w oficjalnych księgach.</p>',
      tags: ['mapy', 'sekret'],
      data: {
        locationType: 'room',
        danger: 1,
        senses: {
          see: 'Wypłowiałe atlasy, skórzane tuby i mapy przypięte do stołów',
          hear: 'Cichy szelest przewracanych arkuszy',
          smell: 'Wosk do pieczęci i stary pergamin',
          feel: 'Każda mapa wygląda jak obietnica i groźba naraz',
        },
      },
    },
    lensLab: {
      type: 'location',
      name: 'Laboratorium Pękniętej Soczewki',
      description:
        '<p>Warsztat Bractwa, w którym bada się odłamki szkła z Latarni. Większość notatek została przerwana w pół zdania.</p>',
      tags: ['laboratorium', 'szkło'],
      data: {
        locationType: 'room',
        danger: 2,
        senses: {
          see: 'Odłamki soczewek, narzędzia optyczne i drobny pył połyskujący w powietrzu',
          hear: 'Delikatne brzęczenie szkła przy każdym kroku',
          smell: 'Pył krzemionki i rozgrzany metal',
          feel: 'Napięcie, jakby samo światło było tu zranione',
        },
      },
    },
    beaconChamber: {
      type: 'location',
      name: 'Komora Latarni',
      description:
        '<p>Serce Latarni Pękniętych Gwiazd, gdzie główna soczewka spotyka się z dawnym mechanizmem nawigacyjnym. To tutaj pęknięcie świeci najmocniej.</p>',
      tags: ['serce latarni', 'rytuał'],
      data: {
        locationType: 'room',
        danger: 5,
        senses: {
          see: 'Soczewka wielkości człowieka, pęknięcie jak błyskawica w szkle',
          hear: 'Niskie buczenie światła i szarpane trzaski',
          smell: 'Ozon i spalony kurz',
          feel: 'Światło niemal naciska od środka na klatkę piersiową',
        },
      },
    },
    councilChamber: {
      type: 'location',
      name: 'Komnata Rady',
      description:
        '<p>Okrągła sala w Forcie Północnym, gdzie zapadają decyzje o przyszłości portu. Tu każde słowo jest bronią, a każda pauza walutą.</p>',
      tags: ['rada', 'polityka'],
      data: {
        locationType: 'room',
        danger: 2,
        senses: {
          see: 'Długi stół, mapy portu i chorągwie starych rodów',
          hear: 'Echo głosów odbijające się od kamiennej kopuły',
          smell: 'Wosk, papier i dym z kominka',
          feel: 'Niewidzialny nacisk, by ważyć każde słowo',
        },
      },
    },
    drownedCatacombs: {
      type: 'location',
      name: 'Zatopione Katakumby',
      description:
        '<p>Starsza część podziemi pod Kanałami Podsolnymi. Woda wlewa się tu i odpływa według rytmu, którego nie wyznacza księżyc.</p>',
      tags: ['katakumby', 'starożytne'],
      data: {
        locationType: 'dungeon',
        danger: 5,
        senses: {
          see: 'Złamane sarkofagi, wapienne kolumny i czarne lustra wody',
          hear: 'Bulgot wody cofającej się z opóźnieniem',
          smell: 'Kamień, glony i coś metalicznego',
          feel: 'Miejsce pamięta więcej, niż pokazuje',
        },
      },
    },
    tideChamber: {
      type: 'location',
      name: 'Komora Pływu',
      description:
        '<p>Ukryta sala rytualna pod katakumbami. Tutaj pod miastem bije coś jak serce przypływu, a ściany pokrywa sól układająca się w runy.</p>',
      tags: ['finał', 'komora'],
      data: {
        locationType: 'room',
        danger: 5,
        senses: {
          see: 'Krąg rytualny, czarna studnia i sól świecąca chłodnym światłem',
          hear: 'Rytmiczne uderzenia przypływu pod posadzką',
          smell: 'Sól, wodorosty i świeża krew',
          feel: 'Każdy oddech brzmi tu zbyt głośno',
        },
      },
    },
    abbeyGarden: {
      type: 'location',
      name: 'Ogród Ciszy',
      description:
        '<p>Wewnętrzny ogród opactwa, gdzie sadzi się rośliny używane przy rytuałach uspokajających. W nocy ścieżki znaczą białe miski z wodą.</p>',
      tags: ['ogród', 'rytuały'],
      data: {
        locationType: 'room',
        danger: 3,
        senses: {
          see: 'Białe kamienie, niskie krzewy i misy odbijające niebo',
          hear: 'Krople wody spadające do glinianych naczyń',
          smell: 'Mięta, sól i mokra ziemia',
          feel: 'Zbyt gładki spokój, jak po połkniętym strachu',
        },
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Frakcje ───────────────────────────────────────────────────────────────
  const factions = await createEntityMap({
    council: {
      type: 'faction',
      name: 'Rada Portu Siołmroku',
      description:
        '<p>Formalna władza miasta. Dzieli się na ludzi, którzy próbują utrzymać port przy życiu, oraz tych, którzy chcą zarobić na jego kryzysie.</p>',
      tags: ['władza', 'miasto'],
      data: {
        goals: ['Utrzymać kontrolę nad portem', 'Nie dopuścić do jawnej paniki mieszkańców'],
        resources: ['Straż portowa', 'Prawo do zamknięcia dzielnic', 'Dostęp do archiwów i ceł'],
      },
    },
    lighthouse: {
      type: 'faction',
      name: 'Bractwo Latarni',
      description:
        '<p>Stare bractwo nawigatorów, optyków i strażników wybrzeża. Ich rytuały miały prowadzić statki, a nie budzić to, co śpi pod wodą.</p>',
      tags: ['bractwo', 'światło'],
      data: {
        goals: ['Naprawić Latarnię bez ujawniania dawnego błędu', 'Odnaleźć pełną historię pierwszego rytuału'],
        resources: ['Soczewki gwiezdne', 'Stare dzienniki', 'Sieć sygnałów na wybrzeżu'],
      },
    },
    saltCompany: {
      type: 'faction',
      name: 'Kompania Morskiej Soli',
      description:
        '<p>Największa siła handlowa regionu. Oficjalnie sponsoruje odbudowę miasta, nieoficjalnie liczy na przejęcie wszystkiego, co kryzys osłabi.</p>',
      tags: ['handel', 'kapitał'],
      data: {
        goals: ['Kupić decydujący wpływ na Radę Portu', 'Przejąć magazyny i szpitale w zamian za pomoc'],
        resources: ['Srebro', 'Kontrakty transportowe', 'Własne magazyny i ludzi do egzekwowania umów'],
      },
    },
    blackSails: {
      type: 'faction',
      name: 'Czarne Żagle',
      description:
        '<p>Luźna sieć przemytników, najemników i przewoźników bez licencji. Najlepiej działają tam, gdzie oficjalne szlaki właśnie przestają być bezpieczne.</p>',
      tags: ['przemyt', 'kanały'],
      data: {
        goals: ['Przejąć podziemne szlaki pod miastem', 'Utrzymać monopol na nielegalny transport'],
        resources: ['Magazyn 12', 'Zastraszeni przewoźnicy', 'Boczne kanały i łodzie bez bandery'],
      },
    },
    deepSilence: {
      type: 'faction',
      name: 'Zakon Głębokiej Ciszy',
      description:
        '<p>Sekretna wspólnota ukryta w cieniu Opactwa Pływów. Wierzą, że tylko całkowite zanurzenie miasta w “cichym przypływie” przyniesie oczyszczenie.</p>',
      tags: ['kult', 'rytuał'],
      data: {
        goals: ['Otworzyć Komorę Pływu', 'Przemienić wybranych mieszkańców przez wodę i sól'],
        resources: ['Wierni w opactwie', 'Zakazane hymny', 'Dostęp do miejsc ukrytych pod wodą'],
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Przedmioty ────────────────────────────────────────────────────────────
  const items = await createEntityMap({
    starPrism: {
      type: 'item',
      name: 'Gwiezdny Pryzmat',
      description:
        '<p>Najcenniejszy element Latarni. Przepuszcza światło przez warstwy szkła, które reagują nie tylko na gwiazdy, lecz także na rytuały pod miastem.</p>',
      tags: ['artefakt', 'latarnia'],
      data: {
        itemType: 'artifact',
        properties: ['pęknięty', 'rezonuje z Komorą Pływu', 'nie daje się długo trzymać gołymi dłońmi'],
      },
    },
    whaleBoneKey: {
      type: 'item',
      name: 'Klucz z Kości Wieloryba',
      description:
        '<p>Długi, biały klucz wyryty z kości ogromnego ssaka. Nie tonie i pasuje do zamków, które nie wyglądają na wykonane ludzką ręką.</p>',
      tags: ['klucz', 'katakumby'],
      data: {
        itemType: 'key',
        properties: ['nienaturalnie lekki', 'odporny na sól', 'otwiera starą śluzę w katakumbach'],
      },
    },
    wardensDiary: {
      type: 'item',
      name: 'Dziennik Strażniczki Marell',
      description:
        '<p>Dziennik jednej z dawnych strażniczek Latarni. Kilka stron wyrwano, ale to, co zostało, opisuje pierwszy pakt z głębią.</p>',
      tags: ['dziennik', 'dowód'],
      data: {
        itemType: 'scroll',
        properties: ['zawilgocony', 'pełen marginaliów', 'opisuje ofiarę z pierwszego rytuału'],
      },
    },
    dryCanalsMap: {
      type: 'item',
      name: 'Mapa Suchych Kanałów',
      description:
        '<p>Ręcznie nanoszona mapa bocznych tras pod miastem. Pokazuje odcinki, których nie ma już w oficjalnych planach Siołmroku.</p>',
      tags: ['mapa', 'kanały'],
      data: {
        itemType: 'tool',
        properties: ['zaznaczone śluzy', 'tajne wejścia', 'czerwone kółko przy Komorze Pływu'],
      },
    },
    councilSeal: {
      type: 'item',
      name: 'Pieczęć Rady Portu',
      description:
        '<p>Ciężka pieczęć z ciemnego srebra. Umożliwia legalizację transportów i zamykanie całych kwartałów miasta jednym dokumentem.</p>',
      tags: ['władza', 'pieczęć'],
      data: {
        itemType: 'tool',
        properties: ['oficjalna', 'trudna do podrobienia', 'zostawia głęboki odcisk w czerwonym wosku'],
      },
    },
    blackPearl: {
      type: 'item',
      name: 'Czarna Perła Pływu',
      description:
        '<p>Gładka, ciemna perła używana przez Zakon Głębokiej Ciszy podczas modlitw. W pobliżu wody bije w rytmie podobnym do serca.</p>',
      tags: ['rytuał', 'perła'],
      data: {
        itemType: 'artifact',
        properties: ['pulsuje w pobliżu Komory', 'chłodna mimo ciepła dłoni', 'służy jako fokus rytualny'],
      },
    },
    saltBloodAmpoule: {
      type: 'item',
      name: 'Ampułka Solnej Krwi',
      description:
        '<p>Szklana ampułka z mlecznym płynem pobranym od zarażonych. Zbyt długo oglądana zostawia po sobie obraz fal pod powiekami.</p>',
      tags: ['dowód', 'choroba'],
      data: {
        itemType: 'potion',
        properties: ['żrąca dla metalu', 'świeci bladym błękitem', 'nie krzepnie jak zwykła krew'],
      },
    },
    verrickHook: {
      type: 'item',
      name: 'Hak Bosmana Verricka',
      description:
        '<p>Stalowy hak dopasowany do przedramienia najemnika. Wżera się w drewno i pancerz z podobną łatwością.</p>',
      tags: ['broń', 'bosman'],
      data: {
        itemType: 'weapon',
        properties: ['ciężki', 'zębaty', 'rozpoznawalny dla ludzi z doków'],
      },
    },
    lighthouseLamp: {
      type: 'item',
      name: 'Lampa Bractwa',
      description:
        '<p>Mała ręczna lampa z mlecznym szkłem. Otwarta przy pękniętej soczewce pokazuje rysy niewidoczne w zwykłym świetle.</p>',
      tags: ['narzędzie', 'światło'],
      data: {
        itemType: 'tool',
        properties: ['pokazuje ślady rytuału', 'działa na olej z alg', 'gasnąc syczy jak fala'],
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Zegary ────────────────────────────────────────────────────────────────
  const clocks = await createEntityMap({
    tideGate: {
      type: 'clock',
      name: 'Otwarcie Komory Pływu',
      description:
        '<p>Syrene i jej ludzie krok po kroku przygotowują otwarcie starożytnej komory pod miastem. Każdy etap osłabia Latarnię i wzmacnia przypływ.</p>',
      tags: ['główny wątek', 'rytuał'],
      data: {
        segments: 8,
        filled: 2,
        isActive: true,
        tickLabels: [
          'Pierwszy hymn rozbrzmiewa w ogrodach opactwa',
          'Zakon zdobywa kolejne imię do ofiary',
          'Perła zaczyna pulsować pod miastem',
          'Śluza katakumb zostaje otwarta',
          'Latarnia traci drugi pierścień ochrony',
          'Woda w kanałach płynie pod prąd',
          'Komora przyjmuje krew i światło',
          'Brama przypływu zostaje otwarta',
        ],
      },
    },
    beaconFailure: {
      type: 'clock',
      name: 'Latarnia zgaśnie po raz trzeci',
      description:
        '<p>Pęknięcie w soczewce narasta. Jeśli światło padnie raz jeszcze, port zostanie ślepy podczas najgorszego sztormu od lat.</p>',
      tags: ['latarnia', 'presja'],
      data: {
        segments: 6,
        filled: 1,
        isActive: true,
        tickLabels: [
          'Pierwszy niestabilny błysk nad portem',
          'Szkło zaczyna śpiewać przy przypływie',
          'Bractwo traci kontrolę nad laboratorium',
          'Światło oślepia załogi wracające do portu',
          'Cała wieża drży jak dzwon',
          'Latarnia gaśnie w najgorszym możliwym momencie',
        ],
      },
    },
    councilSale: {
      type: 'clock',
      name: 'Rada oddaje port w obce ręce',
      description:
        '<p>Oren Vaal i kupcy z Kompanii domykają kolejne umowy. Każda nowa pieczęć odbiera miastu kawałek samodzielności.</p>',
      tags: ['rada', 'korupcja'],
      data: {
        segments: 6,
        filled: 2,
        isActive: true,
        tickLabels: [
          'Pierwszy tajny kontrakt przechodzi bez dyskusji',
          'Straż dostaje rozkaz chronić magazyny Kompanii',
          'Rada sprzedaje prawo do poboru opłat portowych',
          'Kupcy przejmują zaopatrzenie szpitala i fortu',
          'Cła trafiają do prywatnych kas',
          'Port należy już tylko z nazwy do miasta',
        ],
      },
    },
    smugglingNet: {
      type: 'clock',
      name: 'Kanały należą do Nox',
      description:
        '<p>Nox Szelest porządkuje podziemie po swojemu. Świadkowie znikają, trasy się zamykają, a każda łódź bez jej zgody tonie albo przepada.</p>',
      tags: ['przemyt', 'kanały'],
      data: {
        segments: 6,
        filled: 3,
        isActive: true,
        tickLabels: [
          'Pierwsza załoga składa hołd Nox',
          'Magazyn 12 przechodzi pod całodobową ochronę',
          'Boczne śluzy dostają nowe oznaczenia Czarnych Żagli',
          'Przemytnicy niezależni zaczynają znikać',
          'Kanały są zamknięte dla obcych',
          'Nox decyduje, co wpływa i co wypływa spod miasta',
        ],
      },
    },
    saltPlague: {
      type: 'clock',
      name: 'Solna Mgła przekracza mur',
      description:
        '<p>Biała mgła z kanałów zaczyna wychodzić na powierzchnię. Chorzy tracą oddech, a potem przestają reagować na zwykłe leczenie.</p>',
      tags: ['choroba', 'miasto'],
      data: {
        segments: 6,
        filled: 1,
        isActive: true,
        tickLabels: [
          'Pierwsi chorzy trafiają do Solnego Szpitala',
          'Objawy pojawiają się w dokach i przy rynku',
          'Rada ogłasza częściową kwarantannę',
          'Mgła wypełnia całe ulice po zmroku',
          'Straż zamyka dzielnice i pali rzeczy chorych',
          'Miasto dusi się własnym oddechem',
        ],
      },
    },
    verrickAssault: {
      type: 'clock',
      name: 'Szturm Verricka na Fort',
      description:
        '<p>Verrick zbiera ludzi, broń i łodzie do jednej brutalnej nocy. Jeśli uderzy pierwszy, fort padnie zanim straż zrozumie, skąd przyszedł atak.</p>',
      tags: ['najemnicy', 'fort'],
      data: {
        segments: 4,
        filled: 1,
        isActive: true,
        tickLabels: [
          'Verrick kupuje materiały wybuchowe i haki abordażowe',
          'Ludzie Czarnych Żagli wchodzą do fortu jako tragarze',
          'Straż traci magazyn uzbrojenia',
          'Szturm zaczyna się od środka',
        ],
      },
    },
    rynDebt: {
      type: 'clock',
      name: 'Dług Kapitana Ryna',
      description:
        '<p>Ryn wciąż wisi coś ludziom, którzy finansowali jego ostatni rejs. Jeśli nie spłaci długu, ktoś wykorzysta go jako przynętę albo kartę przetargową.</p>',
      tags: ['osobisty', 'kapitan'],
      data: {
        segments: 4,
        filled: 2,
        isActive: true,
        tickLabels: [
          'Pierwsze ostrzeżenie trafia pod jego drzwi',
          'Znika jeden z członków dawnej załogi',
          'Łódź Ryna zostaje przejęta',
          'Ryn musi wybrać zdradę albo śmierć',
        ],
      },
    },
    failedPact: {
      type: 'clock',
      name: 'Nieudany pakt z Głębiną',
      description:
        '<p>Pamiątka po rytuale sprzed siedemnastu lat. Zegar jest martwy, ale jego skutki żyją w Latarni, Elserze i pęknięciu, które nigdy się nie zabliźniło.</p>',
      tags: ['przeszłość', 'zakończone'],
      data: {
        segments: 4,
        filled: 4,
        isActive: false,
        tickLabels: [
          'Bractwo schodzi do podziemi z pryzmatem',
          'Pierwszy kontakt z wodą spoza przypływu',
          'Marell oddaje życie, by zamknąć rytuał',
          'Latarnia pęka i nigdy już nie świeci tak samo',
        ],
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Fronty i zagrożenia ───────────────────────────────────────────────────
  const fronts = await createEntityMap({
    blackTide: {
      type: 'front',
      name: 'Czarny Przypływ pod Siołmrokiem',
      description:
        '<p>Pod miastem budzi się stary rytuał związany z Latarnią i Komorą Pływu. Jeśli bohaterowie nie odkryją prawdy i ceny zamknięcia, port może zostać przemieniony nie do poznania.</p>',
      tags: ['kampania', 'główny'],
      data: {
        category: 'campaign',
        goal: 'Powstrzymać otwarcie Komory Pływu i nie dopuścić, by Siołmrok stał się miastem poddanym głębi.',
        stakes: [
          'Czy da się zamknąć komorę bez kolejnej ofiary?',
          'Czy Elsera powie pełną prawdę o pierwszym rytuale?',
          'Kogo morze zażąda jako ceny?',
        ],
      },
    },
    citySale: {
      type: 'front',
      name: 'Port na sprzedaż',
      description:
        '<p>Rada, kupcy i przemytnicy rozrywają miasto od góry i od dołu. Kryzys na wybrzeżu to dla nich okazja, nie problem.</p>',
      tags: ['polityka', 'miasto'],
      data: {
        category: 'adventure',
        goal: 'Złamać układ między Orenem, Kompanią i Czarnymi Żaglami zanim zjedzą wszystkie instytucje miasta od środka.',
        stakes: [
          'Czy Ada odważy się wystąpić przeciw własnym rozkazom?',
          'Kto kontroluje fort, ten kontroluje port',
          'Jak dużo można poświęcić, by utrzymać porządek?',
        ],
      },
    },
    saltFever: {
      type: 'front',
      name: 'Solna gorączka',
      description:
        '<p>Mgła z kanałów przestaje być tylko złowieszczą plotką. Choroba miesza się z paniką, a panika z brutalnymi decyzjami rady.</p>',
      tags: ['choroba', 'kryzys'],
      data: {
        category: 'adventure',
        goal: 'Zatrzymać rozprzestrzenianie się solnej mgły i odkryć, czy jest skutkiem rytuału, czy narzędziem kogoś konkretnego.',
        stakes: [
          'Ile dzielnic trzeba będzie odciąć?',
          'Czy szpital wytrzyma kolejną falę chorych?',
          'Czy mieszkańcy zaczną polować na “skażonych”?',
        ],
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  const threats = await createEntityMap({
    syreneRitual: {
      type: 'threat',
      name: 'Syrene przygotowuje otwarcie Komory',
      description:
        '<p>Matka Syrene prowadzi zakon ku finałowi rytuału. Potrzebuje światła, krwi i chwili, w której miasto będzie wystarczająco słabe, by nie stawić oporu.</p>',
      tags: ['kult', 'rytuał'],
      data: {
        threatType: 'dark_entity',
        impulse: 'Otworzyć komorę i przeprowadzić wybranych przez przemianę',
        trigger: [
          'Syrene domyka kolejny etap hymnu bez zakłóceń.',
          'Zakon zdobywa nowego uczestnika rytuału lub brakujący składnik.',
          'Komora pozostaje bezpieczna i niedostępna dla bohaterów przez całą sesję.',
        ].join('\n'),
        moves: [
          'Porywa ludzi powiązanych z pierwszym rytuałem',
          'Wysyła wiernych do kanałów po kolejne składniki',
          'Oferuje bohaterom wizję świata bez bólu i hałasu',
        ],
      },
    },
    lanternBreak: {
      type: 'threat',
      name: 'Latarnia pęka pod naporem światła',
      description:
        '<p>Pęknięta soczewka staje się kanałem dla zjawisk, których Bractwo nie rozumie. Każda próba prowizorycznej naprawy tylko kupuje czas.</p>',
      tags: ['latarnia', 'astralna burza'],
      data: {
        threatType: 'environ_disaster',
        impulse: 'Przerwać kontrolę nad światłem i ściągnąć katastrofę na port',
        trigger: [
          'Bractwo odkłada właściwą naprawę soczewki.',
          'Latarnia nadaje kolejny błędny sygnał podczas sztormu.',
          'Pęknięcie rezonuje z działaniami rytualnymi pod miastem.',
        ].join('\n'),
        moves: [
          'Oślepia załogi błędnym sygnałem',
          'Wypala znaki rytualne w kamieniu wieży',
          'Przyciąga do komory tych, którzy noszą ślad dawnych rytuałów',
        ],
      },
    },
    vaalDeal: {
      type: 'threat',
      name: 'Oren Vaal sprzedaje port',
      description:
        '<p>Vaala nie obchodzi, kto ocali miasto, dopóki on zarobi i pozostanie przy władzy. Kryzys traktuje jak negocjacje prowadzone z pistoletem na stole.</p>',
      tags: ['rada', 'sprzedaż'],
      data: {
        threatType: 'corrupt_ruler',
        impulse: 'Spieniężyć władzę zanim port upadnie albo się oczyści',
        trigger: [
          'Rada podpisuje kontrakt bez kontroli i debaty publicznej.',
          'Vaal neutralizuje świadka lub ukrywa kompromitujący dokument.',
          'Kompania przejmuje kolejny obszar infrastruktury miasta.',
        ].join('\n'),
        moves: [
          'Zamyka usta straży papierami z pieczęcią',
          'Sprzedaje strefy bezpieczeństwa prywatnym kupcom',
          'Podsuwa winnych, którzy akurat są mu niewygodni',
        ],
      },
    },
    noxChannels: {
      type: 'threat',
      name: 'Nox czyści kanały ze świadków',
      description:
        '<p>Nox Szelest nie chce otwarcia komory, ale jeszcze mniej chce utraty kontroli nad podziemiem. Gdy trzeba, topi problem zanim zdąży powiedzieć za dużo.</p>',
      tags: ['przemyt', 'świadkowie'],
      data: {
        threatType: 'ambitious_organization',
        impulse: 'Zmonopolizować kanały i przeżycie pod miastem',
        trigger: [
          'Nox przejmuje nową śluzę albo punkt przeładunkowy.',
          'Niezależny przewoźnik znika lub zostaje zastraszony.',
          'Bohaterowie tracą inicjatywę w podziemnych trasach.',
        ].join('\n'),
        moves: [
          'Kupuje przewoźników albo wysyła ich na dno',
          'Fałszuje mapy bocznych śluz',
          'Wynajmuje Verricka tam, gdzie trzeba wejść siłą',
        ],
      },
    },
    brineMist: {
      type: 'threat',
      name: 'Solna Mgła zaraża dzielnice',
      description:
        '<p>Mgła jest bardziej skutkiem niż sprawcą, ale to nie czyni jej mniej śmiercionośną. Roznosi panikę równie szybko jak objawy.</p>',
      tags: ['choroba', 'mgła'],
      data: {
        threatType: 'disease_affliction',
        impulse: 'Rozprzestrzeniać skażenie szybciej niż ludzie zdążą je zrozumieć',
        trigger: [
          'Pojawia się nowe ognisko mgły w gęsto zaludnionej dzielnicy.',
          'Szpital nie nadąża i pacjenci trafiają poza kontrolowany obieg.',
          'Źródło skażenia w kanałach pozostaje nietknięte.',
        ].join('\n'),
        moves: [
          'Zostawia biały nalot w płucach i na skórze',
          'Popycha radę ku coraz brutalniejszej kwarantannie',
          'Łączy się z wilgocią w kanałach i piwnicach',
        ],
      },
    },
    verrickRaid: {
      type: 'threat',
      name: 'Verrick szykuje noc szturmu',
      description:
        '<p>Bosman Verrick ma wejść wtedy, gdy rada będzie skłócona, a latarnia rozbita. Nie potrzebuje długiej wojny, tylko jednej zwycięskiej nocy.</p>',
      tags: ['najemnik', 'szturm'],
      data: {
        threatType: 'force_of_chaos',
        impulse: 'Uderzyć brutalnie i przejąć kluczowe punkty zanim pojawi się opór',
        trigger: [
          'Verrick kończy przygotowania ludzi i sprzętu do szturmu.',
          'Obrona fortu lub doków zostaje osłabiona sabotażem.',
          'W mieście wybucha chaos odciągający straż od kluczowych punktów.',
        ].join('\n'),
        moves: [
          'Rozstawia ludzi przy śluzach i magazynach',
          'Podrzuca broń tam, gdzie ma wybuchnąć bójka',
          'Odcina fort od wsparcia z doków',
        ],
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Sesje ─────────────────────────────────────────────────────────────────
  const sessions = await createEntityMap({
    s01: {
      type: 'session',
      name: 'Sesja 1 — Sztorm nad Starymi Dokami',
      description:
        '<p>Bohaterowie przybywają do Portu Siołmrok w noc gwałtownego sztormu. Na deskach Starych Doków znajdują ciało przewoźnika i ślad prowadzący do Magazynu 12.</p>',
      tags: ['start', 'śledztwo'],
      data: {
        number: 1,
        date: '2025-03-03',
        summary: 'Wejście do kampanii: sztorm, martwy przewoźnik, pierwsza rozmowa z Adą i Mina pokazująca, że dzieci z doków znikają częściej niż straż przyznaje.',
        sortOrder: 0,
      },
    },
    s02: {
      type: 'session',
      name: 'Sesja 2 — Złamana Soczewka',
      description:
        '<p>Śledztwo prowadzi do Archiwum Solnego i Wieży Astronomów. Bohaterowie odkrywają, że pęknięcie w soczewce Latarni reaguje na Gwiezdny Pryzmat.</p>',
      tags: ['archiwum', 'latarnia'],
      data: {
        number: 2,
        date: '2025-03-10',
        summary: 'Archiwum ujawnia stare mapy kanałów, a Elsera niechętnie przyznaje, że pęknięcie w Latarni ma związek z rytuałem sprzed lat.',
        sortOrder: 1,
      },
    },
    s03: {
      type: 'session',
      name: 'Sesja 3 — Milczące Opactwo',
      description:
        '<p>Bohaterowie jadą do Opactwa Pływów, gdzie Brat Caelum prosi ich o potajemne spotkanie. W ogrodach rozbrzmiewa hymn, którego nie śpiewa się dla ludzi.</p>',
      tags: ['opactwo', 'kult'],
      data: {
        number: 3,
        date: '2025-03-17',
        summary: 'Caelum zdradza pierwsze informacje o Zakonie Głębokiej Ciszy, a Mara słyszy hymn prowadzący ku Komorze Pływu i dawnej ofierze.',
        sortOrder: 2,
      },
    },
    s04: {
      type: 'session',
      name: 'Sesja 4 — Suchy Kanał',
      description:
        '<p>Po wejściu do Kanałów Podsolnych bohaterowie ścigają ludzi Nox i docierają do starej śluzy. Tam odnajdują Klucz z Kości Wieloryba i pierwsze ślady zatopionych katakumb.</p>',
      tags: ['kanały', 'pościg'],
      data: {
        number: 4,
        date: '2025-03-24',
        summary: 'Nox gra z bohaterami w kotka i myszkę, ale mapa oraz klucz otwierają drogę do znacznie starszej części podziemi.',
        sortOrder: 3,
      },
    },
    s05: {
      type: 'session',
      name: 'Sesja 5 — Rysa w Radzie',
      description:
        '<p>W Forcie Północnym zapadają decyzje o zamknięciu kolejnych dzielnic. Bohaterowie próbują ujawnić listę łapówek Vaala zanim rada podpisze nowy kontrakt.</p>',
      tags: ['rada', 'intryga'],
      data: {
        number: 5,
        date: '2025-03-31',
        summary: 'Polityczna sesja z podsłuchami, dokumentami i rosnącym zaufaniem Ady. Oren Vaal wychodzi na bardziej umoczonego, niż dotąd sądzono.',
        sortOrder: 4,
      },
    },
    s06: {
      type: 'session',
      name: 'Sesja 6 — Miasto w Solnej Mgle',
      description:
        '<p>Solna Mgła wychodzi na powierzchnię i zalewa część ulic. Solny Szpital pęka w szwach, a rada wprowadza brutalne środki bezpieczeństwa.</p>',
      tags: ['kryzys', 'choroba'],
      data: {
        number: 6,
        date: '2025-04-07',
        summary: 'Sesja presji i ratowania ludzi: bohaterowie pomagają Ysmie, zdobywają rejestr chorych i odkrywają, że mgła reaguje na ruchy rytuału.',
        sortOrder: 5,
      },
    },
    s07: {
      type: 'session',
      name: 'Sesja 7 — Zatopione Katakumby',
      description:
        '<p>Klucz z Kości Wieloryba otwiera starą śluzę. Drużyna schodzi do katakumb, gdzie Garet i Elsera pomagają zrozumieć prawdę o pierwszym rytuale.</p>',
      tags: ['eksploracja', 'katakumby'],
      data: {
        number: 7,
        date: '2025-04-14',
        summary: 'Katakumby odsłaniają mapę do Komory Pływu, dziennik Marell i pierwsze konkretne wskazanie, że zamknięcie bramy będzie miało cenę.',
        sortOrder: 6,
      },
    },
    s08: {
      type: 'session',
      name: 'Sesja 8 — Noc Czarnych Żagli',
      description:
        '<p>Nox i Verrick uruchamiają plan przejęcia transportu pod miastem. Stare Doki stają się polem bitwy między przemytnikami, strażą i tymi, którzy chcą zniknąć w chaosie.</p>',
      tags: ['akcja', 'doki'],
      data: {
        number: 8,
        date: '2025-04-21',
        summary: 'Wielowarstwowa nocna akcja w dokach. Bohaterowie zdobywają dowód na współpracę Vaala z Czarnymi Żaglami i wiedzą już, że szykuje się szturm.',
        sortOrder: 7,
      },
    },
    s09: {
      type: 'session',
      name: 'Sesja 9 — Ostatnia Straż Latarni',
      description:
        '<p>Verrick uderza, a Latarnia zaczyna gasnąć. Bohaterowie muszą jednocześnie utrzymać Fort Północny i uratować Gwiezdny Pryzmat przed rozdarciem.</p>',
      tags: ['oblężenie', 'latarnia'],
      data: {
        number: 9,
        date: '2025-04-28',
        summary: 'Kulminacja polityczno-militarna: Ada wybiera stronę, Elsera odsłania wszystko o dawnym pakcie, a miasto stoi na granicy całkowitego chaosu.',
        sortOrder: 8,
      },
    },
    s10: {
      type: 'session',
      name: 'Sesja 10 — Komora Pływu',
      description:
        '<p>Finał kampanii. Bohaterowie schodzą do Komory Pływu na moment przed ukończeniem rytuału Syrene i muszą wybrać, jaką cenę zapłacą za ocalenie miasta.</p>',
      tags: ['finał', 'rytuał'],
      data: {
        number: 10,
        date: '2025-05-05',
        summary: 'Zejście do serca kampanii: rytuał, ofiara, wybory bez dobrych odpowiedzi i konfrontacja z tym, czym naprawdę jest czarny przypływ.',
        sortOrder: 9,
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  await Promise.all([
    updateEntity(db, clocks.tideGate.id, {
      data: {
        ...clocks.tideGate.data,
        kind: 'threat',
        tickWhen: [
          'Zakon kończy kolejny etap hymnu w opactwie.',
          'Ktoś zdobywa nowe imię lub krew potrzebną do rytuału.',
          'Bohaterowie ignorują sygnały z katakumb przez całą sesję.',
        ].join('\n'),
        lastAdvanceAt: '2025-03-17T20:30:00.000Z',
        lastAdvanceSessionId: sessions.s03.id,
      },
    }),
    updateEntity(db, clocks.beaconFailure.id, {
      data: {
        ...clocks.beaconFailure.data,
        kind: 'threat',
        tickWhen: [
          'Latarnia pracuje na przeciążeniu bez naprawy soczewki.',
          'Bractwo próbuje prowizorycznych obejść zamiast stabilizacji.',
          'W porcie dochodzi do kolejnego błędnego sygnału świetlnego.',
        ].join('\n'),
        lastAdvanceAt: '2025-03-10T22:00:00.000Z',
        lastAdvanceSessionId: sessions.s02.id,
      },
    }),
    updateEntity(db, clocks.councilSale.id, {
      data: {
        ...clocks.councilSale.data,
        kind: 'threat',
        tickWhen: [
          'Rada podpisuje nową umowę z Kompanią bez kontroli społecznej.',
          'Vaal ucisza kolejnego świadka lub dokument znika z archiwum.',
          'Straż dostaje rozkaz chronić interes kupców zamiast mieszkańców.',
        ].join('\n'),
        lastAdvanceAt: '2025-03-31T20:30:00.000Z',
        lastAdvanceSessionId: sessions.s05.id,
      },
    }),
    updateEntity(db, clocks.smugglingNet.id, {
      data: {
        ...clocks.smugglingNet.data,
        kind: 'threat',
        tickWhen: [
          'Nox przejmuje kolejną śluzę albo trasę transportową.',
          'Niezależny przewoźnik znika lub składa hołd Czarnym Żaglom.',
          'Bohaterowie oddają inicjatywę w kanałach na rzecz przemytników.',
        ].join('\n'),
        lastAdvanceAt: '2025-04-21T21:10:00.000Z',
        lastAdvanceSessionId: sessions.s08.id,
      },
    }),
    updateEntity(db, clocks.saltPlague.id, {
      data: {
        ...clocks.saltPlague.data,
        kind: 'threat',
        tickWhen: [
          'Pojawia się nowe ognisko choroby poza strefą kwarantanny.',
          'Szpital traci zasoby lub personel i nie wyrabia z pacjentami.',
          'Rada opóźnia decyzje o odcięciu źródła skażenia.',
        ].join('\n'),
        lastAdvanceAt: '2025-04-07T20:00:00.000Z',
        lastAdvanceSessionId: sessions.s06.id,
      },
    }),
    updateEntity(db, clocks.verrickAssault.id, {
      data: {
        ...clocks.verrickAssault.data,
        kind: 'threat',
        tickWhen: [
          'Verrick gromadzi ludzi i ładunki przy śluzach fortu.',
          'Obrona fortu zostaje osłabiona przez sabotaż od środka.',
          'W dokach wybucha chaos odciągający uwagę straży.',
        ].join('\n'),
        lastAdvanceAt: '2025-04-28T18:10:00.000Z',
        lastAdvanceSessionId: sessions.s09.id,
      },
    }),
    updateEntity(db, clocks.rynDebt.id, {
      data: {
        ...clocks.rynDebt.data,
        kind: 'free',
        tickWhen: [
          'Wierzyciele Ryna naciskają na drużynę lub jego załogę.',
          'Ryn wybiera półśrodki zamiast spłaty długu.',
          'Pojawia się nowy trop łączący dług z dawnym rytuałem.',
        ].join('\n'),
        lastAdvanceAt: '2025-03-31T22:00:00.000Z',
        lastAdvanceSessionId: sessions.s05.id,
      },
    }),
    updateEntity(db, clocks.failedPact.id, {
      data: {
        ...clocks.failedPact.data,
        kind: 'free',
        tickWhen: [
          'Bohaterowie odkrywają nowy szczegół o rytuale sprzed lat.',
          'Elsera lub Garet ujawniają kolejne przemilczane fakty.',
          'Konsekwencje dawnego paktu wracają w bieżącej scenie.',
        ].join('\n'),
        lastAdvanceAt: '2025-04-14T22:15:00.000Z',
        lastAdvanceSessionId: sessions.s07.id,
      },
    }),
  ]);

  type SessionKey = keyof typeof sessions;
  const appearsInSessions = (sourceId: string, ...keys: SessionKey[]): NewRelation[] =>
    keys.map((key) => ({ type: 'appears_in', sourceId, targetId: sessions[key].id }));

  // ── Wątki ─────────────────────────────────────────────────────────────────
  const threads = await createEntityMap({
    blackTide: {
      type: 'thread',
      name: 'Czarny Przypływ',
      description:
        '<p>Główny wątek kampanii dotyczący tego, co śpi pod Siołmrokiem i dlaczego budzi się właśnie teraz.</p>',
      tags: ['główny', 'kampania'],
      data: { color: '#0f766e', status: 'active' },
    },
    starPrism: {
      type: 'thread',
      name: 'Gwiezdny Pryzmat',
      description:
        '<p>Śledztwo wokół pryzmatu, pękniętej soczewki i roli Latarni w dawnym rytuale.</p>',
      tags: ['artefakt', 'latarnia'],
      data: { color: '#eab308', status: 'active' },
    },
    dryCanals: {
      type: 'thread',
      name: 'Mapa Suchych Kanałów',
      description:
        '<p>Szukanie właściwej trasy przez podziemia i tego, kto fałszuje mapy miasta.</p>',
      tags: ['kanały', 'eksploracja'],
      data: { color: '#3b82f6', status: 'active' },
    },
    missingDockers: {
      type: 'thread',
      name: 'Zaginieni z Doków',
      description:
        '<p>Dzieci, przewoźnicy i tragarze znikają bez śladu. Wątek łączy doki, kult i Czarnych Żagli.</p>',
      tags: ['doki', 'ludzie'],
      data: { color: '#f97316', status: 'active' },
    },
    boughtCouncilors: {
      type: 'thread',
      name: 'Kupieni Radni',
      description:
        '<p>Układ między Orenem Vaalem, Kompanią i przemytnikami trzyma się na pieczęciach, długach i strachu.</p>',
      tags: ['rada', 'korupcja'],
      data: { color: '#ef4444', status: 'active' },
    },
    saltFog: {
      type: 'thread',
      name: 'Solna Mgła',
      description:
        '<p>Badanie pochodzenia mgły, jej objawów i związku z rytuałem pod miastem.</p>',
      tags: ['choroba', 'presja'],
      data: { color: '#8b5cf6', status: 'active' },
    },
    lighthousePact: {
      type: 'thread',
      name: 'Pakt Latarni',
      description:
        '<p>Co naprawdę wydarzyło się siedemnaście lat temu, kiedy Marell i Elsera zeszły do podziemi z pryzmatem?</p>',
      tags: ['przeszłość', 'bractwo'],
      data: { color: '#14b8a6', status: 'active' },
    },
    whaleBoneKey: {
      type: 'thread',
      name: 'Klucz z Kości Wieloryba',
      description:
        '<p>Podwątek zdobycia i użycia klucza prowadzącego do starej śluzy i katakumb.</p>',
      tags: ['klucz', 'podziemia'],
      data: { color: '#06b6d4', status: 'completed' },
    },
    wardensDiary: {
      type: 'thread',
      name: 'Dziennik Strażniczki',
      description:
        '<p>Poszukiwanie brakujących stron dziennika Marell i zrozumienie ceny pierwszego rytuału.</p>',
      tags: ['dziennik', 'dowód'],
      data: { color: '#84cc16', status: 'completed' },
    },
    verrick: {
      type: 'thread',
      name: 'Bosman Verrick',
      description:
        '<p>Wątek dotyczący najemnika, którego działania spajają przemoc w dokach z planem szturmu na fort.</p>',
      tags: ['najemnik', 'akcja'],
      data: { color: '#dc2626', status: 'active' },
    },
    priceOfSalvation: {
      type: 'thread',
      name: 'Cena Ocalenia',
      description:
        '<p>Im bliżej finału, tym wyraźniej widać, że zamknięcie Komory Pływu nie będzie darmowe.</p>',
      tags: ['finał', 'wybór'],
      data: { color: '#7c3aed', status: 'active' },
    },
    abbeySchism: {
      type: 'thread',
      name: 'Cicha Rebelia w Opactwie',
      description:
        '<p>Caelum i nieliczni wierni próbują zatrzymać Syrene od środka, zanim kult wciągnie cały klasztor pod wodę.</p>',
      tags: ['opactwo', 'wewnętrzny konflikt'],
      data: { color: '#22c55e', status: 'active' },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Wskazówki ─────────────────────────────────────────────────────────────
  const clues = await createEntityMap({
    deepHymn: {
      type: 'clue',
      name: 'Fragment hymnu Głębi',
      description:
        '<p>Krótki zapis chóru śpiewanego w ogrodach opactwa. Ostatnia zwrotka mówi o świetle, które ma zostać “połknięte przez ciszę”.</p>',
      tags: ['kult', 'pieśń'],
      data: {
        clueType: 'event',
        hint: 'Hymn nie wzywa morza. Wzywa konkretny moment osłabienia Latarni.',
        discovered: true,
      },
    },
    bribeLedger: {
      type: 'clue',
      name: 'Lista łapówek Vaala',
      description:
        '<p>Zapis wypłat podpisanych skrótami nazwisk radnych, kapitanów i przewoźników. Część sum odpowiada znikającym transportom.</p>',
      tags: ['rada', 'dowód'],
      data: {
        clueType: 'character',
        hint: 'Lista łączy Vaala bezpośrednio z magazynem 12 i cłami portowymi.',
        discovered: true,
      },
    },
    saltTrace: {
      type: 'clue',
      name: 'Ślad soli w kanałach',
      description:
        '<p>Biały osad prowadzący od chorego kanału do starej śluzy. Nie zostawia go zwykła woda morska.</p>',
      tags: ['kanały', 'mgła'],
      data: {
        clueType: 'location',
        hint: 'Źródło mgły i źródło rytuału są połączone przez tę samą wodę.',
        discovered: true,
      },
    },
    crackedLens: {
      type: 'clue',
      name: 'Rysa w soczewce Latarni',
      description:
        '<p>Pęknięcie tworzy wzór przypominający mapę zatopionych przejść. W zwykłym świetle wygląda jak wada szkła.</p>',
      tags: ['latarnia', 'szkło'],
      data: {
        clueType: 'location',
        hint: 'Soczewka reaguje na komorę jak wskazówka, nie jak uszkodzony mechanizm.',
        discovered: true,
      },
    },
    warehousePlan: {
      type: 'clue',
      name: 'Plan Magazynu 12',
      description:
        '<p>Plan z zaznaczonym zejściem pod podłogą i godzinami zmian strażników Czarnych Żagli.</p>',
      tags: ['magazyn', 'przemyt'],
      data: {
        clueType: 'location',
        hint: 'Magazyn 12 jest tylko wejściem. Prawdziwy ruch idzie śluzą pod deskami.',
        discovered: true,
      },
    },
    burntLog: {
      type: 'clue',
      name: 'Nadpalony dziennik nawigatora',
      description:
        '<p>Fragment starego dziennika statkowego opisujący noc, w której morze cofnęło się od klifów na kilka oddechów za długo.</p>',
      tags: ['stary zapis', 'katakumby'],
      data: {
        clueType: 'event',
        hint: 'To samo zjawisko poprzedziło pierwszy rytuał przy Latarni.',
        discovered: false,
      },
    },
    childBracelet: {
      type: 'clue',
      name: 'Bransoleta z domu dziecka',
      description:
        '<p>Mała bransoleta znaleziona przy śluzie w dokach. Mina rozpoznaje wzór używany przez zaginione dzieci portowe.</p>',
      tags: ['dzieci', 'doki'],
      data: {
        clueType: 'character',
        hint: 'Zaginieni z doków trafiali najpierw do kanałów, nie bezpośrednio do opactwa.',
        discovered: true,
      },
    },
    redCircleMap: {
      type: 'clue',
      name: 'Mapa z czerwonym kręgiem',
      description:
        '<p>Mapa kanałów z ręcznie domalowanym kręgiem w miejscu, którego nie ma w oficjalnych planach. Prowadzi do katakumb i dalej.</p>',
      tags: ['mapa', 'komora'],
      data: {
        clueType: 'location',
        hint: 'Czerwone kółko zaznacza nie wejście, tylko miejsce ofiary.',
        discovered: true,
      },
    },
    patientRegister: {
      type: 'clue',
      name: 'Rejestr chorych z Solnego Szpitala',
      description:
        '<p>Wpisy z ostatnich tygodni pokazują, że chorzy pochodzą głównie z okolic starych śluz i magazynów kontrolowanych przez Czarnych Żagli.</p>',
      tags: ['szpital', 'choroba'],
      data: {
        clueType: 'event',
        hint: 'Mgła nie rozchodzi się równomiernie. Ktoś lub coś otwiera jej drogę konkretnymi punktami.',
        discovered: true,
      },
    },
    garetTestimony: {
      type: 'clue',
      name: 'Zeznanie Gareta',
      description:
        '<p>Stary nurek opisuje kamienne drzwi pod wodą i kobietę, która zamknęła je własnym życiem. Nigdy nikomu tego nie powiedział oficjalnie.</p>',
      tags: ['świadek', 'przeszłość'],
      data: {
        clueType: 'character',
        hint: 'Pierwszy rytuał został zamknięty przez ofiarę z własnej woli, nie przez siłę Bractwa.',
        discovered: true,
      },
    },
    lighthouseOath: {
      type: 'clue',
      name: 'Przysięga Bractwa',
      description:
        '<p>Tekst dawnej przysięgi strażników Latarni. Ostatni ustęp mówi, że światło ma “nigdy nie służyć bramie pod miastem”.</p>',
      tags: ['bractwo', 'przysięga'],
      data: {
        clueType: 'event',
        hint: 'Bractwo wiedziało o komorze od początku i miało przed nią strzec, nie z niej korzystać.',
        discovered: false,
      },
    },
    brokenSeal: {
      type: 'clue',
      name: 'Złamana Pieczęć Rady',
      description:
        '<p>Odcisk pieczęci Vaala na kopii rozkazu, który nigdy nie trafił do oficjalnych ksiąg. Ktoś z rady działa poza protokołem.</p>',
      tags: ['rada', 'fałszerstwo'],
      data: {
        clueType: 'event',
        hint: 'Pieczęć została użyta do zalegalizowania przejęcia magazynów i zamknięcia świadków.',
        discovered: true,
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Notatki ───────────────────────────────────────────────────────────────
  const notes = await createEntityMap({
    docksBlood: {
      type: 'note',
      name: 'Krew na deskach doków',
      description: '',
      tags: ['śledztwo'],
      data: {
        content: 'Krew przy pomoście nie spłynęła do morza normalnie. Zostawiła biały nalot, jakby zaschła razem z solą. Ada to też widziała, ale nie chce jeszcze paniki.',
        sessionId: sessions.s01.id,
        createdAt: '2025-03-03T20:45:00.000Z',
      },
    },
    minaWitness: {
      type: 'note',
      name: 'Mina widziała czarne żagle',
      description: '',
      tags: ['świadek'],
      data: {
        content: 'Mina twierdzi, że nocą widziała dzieci prowadzone pod Magazyn 12. Nie była pewna, czy eskortowali je ludzie Nox czy mnisi w płaszczach.',
        sessionId: sessions.s01.id,
        createdAt: '2025-03-03T22:10:00.000Z',
      },
    },
    prismReaction: {
      type: 'note',
      name: 'Soczewka reaguje na pryzmat',
      description: '',
      tags: ['latarnia'],
      data: {
        content: 'Pryzmat rozgrzał się, kiedy zbliżyliśmy go do pęknięcia w soczewce. Mara mówi, że światło “odpowiedziało” z dołu, nie z góry.',
        sessionId: sessions.s02.id,
        createdAt: '2025-03-10T21:20:00.000Z',
      },
    },
    caelumMeeting: {
      type: 'note',
      name: 'Caelum prosi o nocne spotkanie',
      description: '',
      tags: ['opactwo'],
      data: {
        content: 'Brat Caelum boi się Syrene bardziej niż straży. Prosił, żeby przyjść po zmroku do ogrodu i nikomu nie mówić o rozmowie z nim.',
        sessionId: sessions.s03.id,
        createdAt: '2025-03-17T20:35:00.000Z',
      },
    },
    hymnMeaning: {
      type: 'note',
      name: 'Hymn nie jest modlitwą',
      description: '',
      tags: ['kult', 'rytuał'],
      data: {
        content: 'Tekst hymnu brzmi jak instrukcja do chwili otwarcia: światło, cisza, imię i przypływ. To bardziej procedura niż religia.',
        sessionId: sessions.s03.id,
        createdAt: '2025-03-17T22:05:00.000Z',
      },
    },
    whaleKey: {
      type: 'note',
      name: 'Klucz z kości wieloryba nie tonie',
      description: '',
      tags: ['klucz'],
      data: {
        content: 'Klucz wypchnięty spod wody sam wracał na powierzchnię. Garet mówi, że takie kości “pamiętają głębokość”, z której pochodzą.',
        sessionId: sessions.s04.id,
        createdAt: '2025-03-24T21:55:00.000Z',
      },
    },
    councilBribes: {
      type: 'note',
      name: 'Lista łapówek Vaala',
      description: '',
      tags: ['rada', 'dowód'],
      data: {
        content: 'Nazwiska z listy pokrywają się z ludźmi, którzy blokują Adzie dostęp do magazynów. Vaala można ugryźć od strony dokumentów, nie miecza.',
        sessionId: sessions.s05.id,
        createdAt: '2025-03-31T20:50:00.000Z',
      },
    },
    rynDebtNote: {
      type: 'note',
      name: 'Ryn ma starszy dług niż mówi',
      description: '',
      tags: ['dług'],
      data: {
        content: 'Ryn znał Marell jeszcze przed pierwszym rytuałem. Jeśli to prawda, jego “dług” może dotyczyć nie pieniędzy, tylko tego, kogo wtedy zostawiono pod wodą.',
        sessionId: sessions.s05.id,
        createdAt: '2025-03-31T22:00:00.000Z',
      },
    },
    mistSymptoms: {
      type: 'note',
      name: 'Solna mgła nie jest naturalna',
      description: '',
      tags: ['choroba'],
      data: {
        content: 'Ysma wyklucza zwykłe skażenie. Objawy pojawiają się falami, jakby ktoś otwierał i zamykał źródło pod miastem.',
        sessionId: sessions.s06.id,
        createdAt: '2025-04-07T20:10:00.000Z',
      },
    },
    hospitalForgery: {
      type: 'note',
      name: 'Szpital fałszuje wypisy',
      description: '',
      tags: ['szpital', 'rada'],
      data: {
        content: 'Ktoś usuwa z rejestrów część nazwisk chorych z doków. To wygląda tak, jakby rada chciała ukryć skalę problemu aż do podpisania kontraktów.',
        sessionId: sessions.s06.id,
        createdAt: '2025-04-07T22:25:00.000Z',
      },
    },
    catacombGap: {
      type: 'note',
      name: 'Mapa katakumb ma brakującą komnatę',
      description: '',
      tags: ['katakumby'],
      data: {
        content: 'Na wszystkich kopiach planów brakuje jednego łuku w miejscu Komory Pływu. Ktoś usuwał ten fragment od lat, niezależnie od źródła.',
        sessionId: sessions.s07.id,
        createdAt: '2025-04-14T20:40:00.000Z',
      },
    },
    elseraMemory: {
      type: 'note',
      name: 'Elsera pamięta drugi głos',
      description: '',
      tags: ['latarnia', 'przeszłość'],
      data: {
        content: 'Elsera przyznała, że podczas pierwszego rytuału ktoś jeszcze mówił z Komory. Nie Marell, nie Bractwo. Ktoś po drugiej stronie wody.',
        sessionId: sessions.s07.id,
        createdAt: '2025-04-14T22:15:00.000Z',
      },
    },
    verrickNight: {
      type: 'note',
      name: 'Verrick uderzy tylko raz',
      description: '',
      tags: ['szturm'],
      data: {
        content: 'Werrick nie szykuje wojny na tygodnie. Wszystko wskazuje na jedną noc: przejąć fort, śluzy i magazyny zanim świt pokaże rachunki.',
        sessionId: sessions.s08.id,
        createdAt: '2025-04-21T23:10:00.000Z',
      },
    },
    prismCost: {
      type: 'note',
      name: 'Pryzmat pęknie, jeśli użyć go siłą',
      description: '',
      tags: ['pryzmat'],
      data: {
        content: 'Bractwo próbowało “przepalić” pęknięcie dodatkowym światłem. To tylko przyspiesza rozpad. Pryzmat nie zamknie komory sam z siebie.',
        sessionId: sessions.s09.id,
        createdAt: '2025-04-28T21:40:00.000Z',
      },
    },
    evacuationRoute: {
      type: 'note',
      name: 'Droga ewakuacji przez klif',
      description: '',
      tags: ['ewakuacja'],
      data: {
        content: 'Garet wskazał suchą szczelinę pod Klifem Szeptów. Jeśli rytuał pójdzie źle, to może być jedyna droga wyprowadzenia cywilów poza zasięg przypływu.',
        sessionId: sessions.s09.id,
        createdAt: '2025-04-28T22:20:00.000Z',
      },
    },
    finalPrice: {
      type: 'note',
      name: 'Cena zamknięcia komory',
      description: '',
      tags: ['finał'],
      data: {
        content: 'Marell nie zatrzymała przypływu mocą, tylko zgodą. Żeby zamknąć Komorę naprawdę, ktoś musi wejść w rytuał dobrowolnie i domknąć go od środka.',
        sessionId: sessions.s10.id,
        createdAt: '2025-05-05T21:55:00.000Z',
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  // ── Wydarzenia sesji ──────────────────────────────────────────────────────
  const events = await createEntityMap({
    s01Arrival: {
      type: 'event',
      name: 'Przyjazd w sztormie',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-03T18:00:00.000Z',
        text: 'Drużyna wpływa do Portu Siołmrok podczas gwałtownego sztormu. Na Starych Dokach straż portowa zatrzymuje ruch po znalezieniu ciała przewoźnika.',
      },
    },
    s01Body: {
      type: 'event',
      name: 'Ciało na pomoście',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-03T20:00:00.000Z',
        text: 'Ada Merrow pokazuje bohaterom miejsce zbrodni. Na deskach zostaje biały osad, który nie przypomina zwykłej soli.',
      },
    },
    s01Warehouse: {
      type: 'event',
      name: 'Ślad do Magazynu 12',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-03T22:00:00.000Z',
        text: 'Mina prowadzi bohaterów do okolic Magazynu 12 i ujawnia, że część dzieci z doków znikała właśnie tamtędy.',
      },
    },
    s02Archive: {
      type: 'event',
      name: 'Mapy pod miastem',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-10T18:30:00.000Z',
        text: 'Toman Pell udostępnia bohaterom nieoficjalne mapy starych śluz i zatopionych przejść pod portem.',
      },
    },
    s02Tower: {
      type: 'event',
      name: 'Laboratorium soczewki',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-10T20:15:00.000Z',
        text: 'W laboratorium Wieży Astronomów drużyna znajduje odłamki szkła reagujące na Gwiezdny Pryzmat.',
      },
    },
    s02Lantern: {
      type: 'event',
      name: 'Pierwszy prawdziwy błysk',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-10T22:00:00.000Z',
        text: 'W Komorze Latarni pęknięcie w soczewce odpowiada na obecność pryzmatu i rozświetla na chwilę wzór przypominający kanały pod miastem.',
      },
    },
    s03Abbey: {
      type: 'event',
      name: 'Zakazane spotkanie',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-17T18:45:00.000Z',
        text: 'Brat Caelum spotyka się z bohaterami za plecami Matki Syrene i prosi o pomoc w zatrzymaniu nocnych rytuałów.',
      },
    },
    s03Garden: {
      type: 'event',
      name: 'Hymn w ogrodzie',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-17T20:30:00.000Z',
        text: 'W Ogrodzie Ciszy rozbrzmiewa hymn Głębi. Mara rozpoznaje w nim strukturę rytuału, nie zwykłej modlitwy.',
      },
    },
    s03Escape: {
      type: 'event',
      name: 'Ucieczka przez mokre krużganki',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-17T22:20:00.000Z',
        text: 'Syrene niemal przyłapuje drużynę na podsłuchiwaniu. Bohaterowie wymykają się z opactwa z fragmentem hymnu i coraz większym niepokojem.',
      },
    },
    s04Canals: {
      type: 'event',
      name: 'Wejście do Suchych Kanałów',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-24T18:20:00.000Z',
        text: 'Po zejściu przez Magazyn 12 drużyna dociera do odcinka kanałów, którego nie ma na oficjalnych mapach.',
      },
    },
    s04Nox: {
      type: 'event',
      name: 'Gra Nox',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-24T20:10:00.000Z',
        text: 'Nox Szelest zostawia fałszywe ślady i prawdziwy komunikat: jeśli bohaterowie chcą żyć pod miastem, muszą nauczyć się, kto tu pobiera opłaty.',
      },
    },
    s04Key: {
      type: 'event',
      name: 'Kościany klucz',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-24T22:00:00.000Z',
        text: 'W starej śluzie bohaterowie odnajdują Klucz z Kości Wieloryba i pierwsze wejście prowadzące ku katakumbom.',
      },
    },
    s05Fort: {
      type: 'event',
      name: 'Przesłuchania w forcie',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-31T18:30:00.000Z',
        text: 'Ada przepuszcza bohaterów do Fortu Północnego, ale ostrzega, że jeśli Vaala nie złamią dowodem, nikt nie uwierzy słowu przeciw pieczęci.',
      },
    },
    s05Ledger: {
      type: 'event',
      name: 'Lista łapówek',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-31T20:30:00.000Z',
        text: 'W Komnacie Rady drużyna zdobywa listę łapówek i dowiaduje się, że część straży celowo przymykała oczy na ruch w Magazynie 12.',
      },
    },
    s05Speech: {
      type: 'event',
      name: 'Vaal nie pęka',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-03-31T22:10:00.000Z',
        text: 'Oren Vaal wychodzi z sali obrad z twarzą spokojniejszą niż przed wejściem. Ktoś uprzedził go, że bohaterowie mają dokumenty.',
      },
    },
    s06Hospital: {
      type: 'event',
      name: 'Szpital bez miejsc',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-07T18:15:00.000Z',
        text: 'Solny Szpital przestaje przyjmować kolejnych chorych. Doktor Ysma organizuje prowizoryczne łóżka na korytarzach.',
      },
    },
    s06Mist: {
      type: 'event',
      name: 'Mgła wychodzi na ulice',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-07T20:00:00.000Z',
        text: 'Biała mgła przelewa się przez niskie ulice portowe, a straż zaczyna zamykać całe kwartały bez rozróżniania winnych i chorych.',
      },
    },
    s06Register: {
      type: 'event',
      name: 'Rejestr chorych',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-07T22:05:00.000Z',
        text: 'Bohaterowie zdobywają rejestr szpitala i zauważają, że wszystkie ogniska choroby prowadzą z powrotem do kanałów i doków.',
      },
    },
    s07Dive: {
      type: 'event',
      name: 'Wejście do katakumb',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-14T18:20:00.000Z',
        text: 'Garet prowadzi bohaterów przez zalany odcinek kanału do części katakumb, o której miasto dawno już zapomniało.',
      },
    },
    s07Diary: {
      type: 'event',
      name: 'Dziennik Marell',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-14T20:40:00.000Z',
        text: 'W jednym z bocznych grobowców drużyna znajduje dziennik strażniczki Marell i prawdę o tym, kto zamknął pierwszy rytuał.',
      },
    },
    s07Chamber: {
      type: 'event',
      name: 'Pierwszy widok Komory',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-14T22:15:00.000Z',
        text: 'Przez uchylone przejście bohaterowie po raz pierwszy widzą Komorę Pływu. Woda porusza się tam w rytmie, który nie pasuje do żadnego przypływu.',
      },
    },
    s08Raid: {
      type: 'event',
      name: 'Noc Czarnych Żagli',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-21T19:00:00.000Z',
        text: 'Ludzie Nox przejmują doki punkt po punkcie, a Verrick zjawia się tam, gdzie opór jest największy.',
      },
    },
    s08Warehouse: {
      type: 'event',
      name: 'Magazyn 12 płonie',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-21T21:10:00.000Z',
        text: 'Podczas walki przy Magazynie 12 ktoś podpala część skrzyń. W chaosie wypływają dokumenty łączące Vaala z przemytnikami.',
      },
    },
    s08Verrick: {
      type: 'event',
      name: 'Plan szturmu',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-21T23:30:00.000Z',
        text: 'Po starciu z ludźmi Verricka bohaterowie zdobywają informacje o szykowanym szturmie na fort i Latarnię.',
      },
    },
    s09Fort: {
      type: 'event',
      name: 'Fort pod presją',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-28T18:10:00.000Z',
        text: 'Verrick uruchamia atak od strony śluz, a Ada musi zdecydować, czy słuchać rozkazów rady, czy zaufać bohaterom.',
      },
    },
    s09Lantern: {
      type: 'event',
      name: 'Ostatnia straż Latarni',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-28T20:20:00.000Z',
        text: 'Elsera odsłania pełną historię dawnego paktu i razem z drużyną stabilizuje Latarnię tylko na tyle, by dotrwać do finału.',
      },
    },
    s09Choice: {
      type: 'event',
      name: 'Droga do finału',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-04-28T22:35:00.000Z',
        text: 'Po obronie fortu i Latarni staje się jasne, że jedyną drogą jest zejście do Komory Pływu przed ukończeniem rytuału Syrene.',
      },
    },
    s10Descent: {
      type: 'event',
      name: 'Zejście do Komory',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-05-05T18:30:00.000Z',
        text: 'Bohaterowie schodzą do Komory Pływu przez otwartą śluzę, niosąc pryzmat, klucz i wiedzę zdobytą przez poprzednie dziewięć sesji.',
      },
    },
    s10Ritual: {
      type: 'event',
      name: 'Rytuał Syrene',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-05-05T20:40:00.000Z',
        text: 'Syrene kończy ostatni hymn, a woda pod posadzką odpowiada jak żywa istota. Każdy wybór bohaterów ma teraz natychmiastowy koszt.',
      },
    },
    s10Seal: {
      type: 'event',
      name: 'Cena ocalenia',
      description: '',
      tags: [],
      data: {
        timestamp: '2025-05-05T22:10:00.000Z',
        text: 'Finałowy moment kampanii: Komora może zostać zamknięta tylko przez dobrowolne domknięcie rytuału od środka.',
      },
    },
  } satisfies Record<string, NewEntity>, addEntity);

  const contains = (sourceId: string, targetId: string): NewRelation => ({
    type: 'contains',
    sourceId,
    targetId,
  });

  const belongsTo = (sourceId: string, targetId: string): NewRelation => ({
    type: 'belongs_to',
    sourceId,
    targetId,
  });

  const tracks = (sourceId: string, targetId: string): NewRelation => ({
    type: 'tracks',
    sourceId,
    targetId,
  });

  const owns = (sourceId: string, targetId: string): NewRelation => ({
    type: 'owns',
    sourceId,
    targetId,
  });

  const relatedTo = (sourceId: string, targetId: string, label?: string): NewRelation => ({
    type: 'related_to',
    sourceId,
    targetId,
    label,
  });

  const cluesFor = (sourceId: string, targetId: string): NewRelation => ({
    type: 'clues_for',
    sourceId,
    targetId,
  });

  const derivesFrom = (sourceId: string, targetId: string): NewRelation => ({
    type: 'derives_from',
    sourceId,
    targetId,
  });

  await addRelations(
    [
      // Lokacje — hierarchia
      contains(region.greyCoast.id, greaterLocations.duskport.id),
      contains(region.greyCoast.id, greaterLocations.tideAbbey.id),
      contains(region.greyCoast.id, greaterLocations.whisperCliffs.id),

      contains(greaterLocations.duskport.id, cityLocations.oldDocks.id),
      contains(greaterLocations.duskport.id, cityLocations.ashMarket.id),
      contains(greaterLocations.duskport.id, cityLocations.saltArchive.id),
      contains(greaterLocations.duskport.id, cityLocations.astronomersTower.id),
      contains(greaterLocations.duskport.id, cityLocations.starLantern.id),
      contains(greaterLocations.duskport.id, cityLocations.northFort.id),
      contains(greaterLocations.duskport.id, cityLocations.brineCanals.id),
      contains(greaterLocations.duskport.id, cityLocations.saltHospital.id),

      contains(cityLocations.oldDocks.id, innerLocations.warehouse12.id),
      contains(cityLocations.saltArchive.id, innerLocations.mapRoom.id),
      contains(cityLocations.astronomersTower.id, innerLocations.lensLab.id),
      contains(cityLocations.starLantern.id, innerLocations.beaconChamber.id),
      contains(cityLocations.northFort.id, innerLocations.councilChamber.id),
      contains(cityLocations.brineCanals.id, innerLocations.drownedCatacombs.id),
      contains(innerLocations.drownedCatacombs.id, innerLocations.tideChamber.id),
      contains(greaterLocations.tideAbbey.id, innerLocations.abbeyGarden.id),

      // Frakcje — siedziby
      belongsTo(cityLocations.northFort.id, factions.council.id),
      belongsTo(cityLocations.starLantern.id, factions.lighthouse.id),
      belongsTo(cityLocations.ashMarket.id, factions.saltCompany.id),
      belongsTo(innerLocations.warehouse12.id, factions.blackSails.id),
      belongsTo(greaterLocations.tideAbbey.id, factions.deepSilence.id),

      // NPC → frakcje
      belongsTo(npcs.ada.id, factions.council.id),
      belongsTo(npcs.oren.id, factions.council.id),
      belongsTo(npcs.toman.id, factions.lighthouse.id),
      belongsTo(npcs.elsera.id, factions.lighthouse.id),
      belongsTo(npcs.ysma.id, factions.saltCompany.id),
      belongsTo(npcs.nox.id, factions.blackSails.id),
      belongsTo(npcs.verrick.id, factions.blackSails.id),
      belongsTo(npcs.syrene.id, factions.deepSilence.id),
      belongsTo(npcs.caelum.id, factions.deepSilence.id),

      // NPC → lokacje
      contains(cityLocations.northFort.id, npcs.ada.id),
      contains(innerLocations.councilChamber.id, npcs.oren.id),
      contains(cityLocations.saltArchive.id, npcs.toman.id),
      contains(cityLocations.starLantern.id, npcs.elsera.id),
      contains(innerLocations.abbeyGarden.id, npcs.syrene.id),
      contains(greaterLocations.tideAbbey.id, npcs.caelum.id),
      contains(innerLocations.warehouse12.id, npcs.nox.id),
      contains(cityLocations.oldDocks.id, npcs.verrick.id),
      contains(cityLocations.saltHospital.id, npcs.ysma.id),
      contains(cityLocations.oldDocks.id, npcs.ryn.id),
      contains(cityLocations.ashMarket.id, npcs.mina.id),
      contains(greaterLocations.whisperCliffs.id, npcs.garet.id),

      // NPC owns item
      owns(npcs.elsera.id, items.starPrism.id),
      owns(npcs.garet.id, items.whaleBoneKey.id),
      owns(npcs.toman.id, items.wardensDiary.id),
      owns(npcs.nox.id, items.dryCanalsMap.id),
      owns(npcs.oren.id, items.councilSeal.id),
      owns(npcs.syrene.id, items.blackPearl.id),
      owns(playerCharacters.mara.id, items.saltBloodAmpoule.id),
      owns(npcs.verrick.id, items.verrickHook.id),
      owns(npcs.ada.id, items.lighthouseLamp.id),

      // Dodatkowy kontekst przedmiotów w lokacjach
      contains(innerLocations.beaconChamber.id, items.starPrism.id),
      contains(innerLocations.mapRoom.id, items.wardensDiary.id),
      contains(innerLocations.warehouse12.id, items.dryCanalsMap.id),
      contains(innerLocations.tideChamber.id, items.blackPearl.id),
    ],
    addRelation,
  );

  await addRelations(
    [
      // Threat → Front
      belongsTo(threats.syreneRitual.id, fronts.blackTide.id),
      belongsTo(threats.lanternBreak.id, fronts.blackTide.id),
      belongsTo(threats.vaalDeal.id, fronts.citySale.id),
      belongsTo(threats.noxChannels.id, fronts.citySale.id),
      belongsTo(threats.verrickRaid.id, fronts.citySale.id),
      belongsTo(threats.brineMist.id, fronts.saltFever.id),

      // Threat → Clock
      tracks(threats.syreneRitual.id, clocks.tideGate.id),
      tracks(threats.lanternBreak.id, clocks.beaconFailure.id),
      tracks(threats.vaalDeal.id, clocks.councilSale.id),
      tracks(threats.noxChannels.id, clocks.smugglingNet.id),
      tracks(threats.brineMist.id, clocks.saltPlague.id),
      tracks(threats.verrickRaid.id, clocks.verrickAssault.id),

      // Dodatkowe relacje zegarów
      relatedTo(clocks.rynDebt.id, npcs.ryn.id, 'stary rachunek'),
      relatedTo(clocks.failedPact.id, npcs.elsera.id, 'ocalała po tamtej nocy'),
      relatedTo(clocks.failedPact.id, items.starPrism.id, 'pękł wtedy pierwszy raz'),

      // Clues → Threat / Front
      cluesFor(clues.deepHymn.id, threats.syreneRitual.id),
      cluesFor(clues.bribeLedger.id, threats.vaalDeal.id),
      cluesFor(clues.saltTrace.id, threats.brineMist.id),
      cluesFor(clues.crackedLens.id, threats.lanternBreak.id),
      cluesFor(clues.warehousePlan.id, threats.noxChannels.id),
      cluesFor(clues.burntLog.id, fronts.blackTide.id),
      cluesFor(clues.childBracelet.id, threats.noxChannels.id),
      cluesFor(clues.redCircleMap.id, threats.syreneRitual.id),
      cluesFor(clues.patientRegister.id, fronts.saltFever.id),
      cluesFor(clues.garetTestimony.id, fronts.blackTide.id),
      cluesFor(clues.lighthouseOath.id, threats.lanternBreak.id),
      cluesFor(clues.brokenSeal.id, threats.vaalDeal.id),

      // Clues → encje
      relatedTo(clues.deepHymn.id, greaterLocations.tideAbbey.id, 'źródło hymnu'),
      relatedTo(clues.deepHymn.id, npcs.syrene.id, 'prowadzi śpiew'),
      relatedTo(clues.bribeLedger.id, npcs.oren.id, 'dotyczy'),
      relatedTo(clues.saltTrace.id, cityLocations.brineCanals.id, 'prowadzi do'),
      relatedTo(clues.crackedLens.id, cityLocations.starLantern.id, 'miejsce'),
      relatedTo(clues.warehousePlan.id, innerLocations.warehouse12.id, 'miejsce'),
      relatedTo(clues.burntLog.id, innerLocations.drownedCatacombs.id, 'opisuje'),
      relatedTo(clues.childBracelet.id, npcs.mina.id, 'rozpoznała'),
      relatedTo(clues.redCircleMap.id, innerLocations.tideChamber.id, 'oznacza'),
      relatedTo(clues.patientRegister.id, npcs.ysma.id, 'sporządziła'),
      relatedTo(clues.garetTestimony.id, npcs.garet.id, 'świadek'),
      relatedTo(clues.lighthouseOath.id, npcs.elsera.id, 'zataiła'),
      relatedTo(clues.brokenSeal.id, innerLocations.councilChamber.id, 'użyto tutaj'),
    ],
    addRelation,
  );

  await addRelations(
    [
      // Wątki → sesje
      ...appearsInSessions(threads.blackTide.id, 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'),
      ...appearsInSessions(threads.starPrism.id, 's02', 's03', 's07', 's09', 's10'),
      ...appearsInSessions(threads.dryCanals.id, 's02', 's04', 's07', 's08'),
      ...appearsInSessions(threads.missingDockers.id, 's01', 's03', 's04', 's08'),
      ...appearsInSessions(threads.boughtCouncilors.id, 's01', 's05', 's06', 's08', 's09'),
      ...appearsInSessions(threads.saltFog.id, 's03', 's06', 's07', 's09'),
      ...appearsInSessions(threads.lighthousePact.id, 's02', 's03', 's07', 's09', 's10'),
      ...appearsInSessions(threads.whaleBoneKey.id, 's04', 's07'),
      ...appearsInSessions(threads.wardensDiary.id, 's02', 's05', 's07'),
      ...appearsInSessions(threads.verrick.id, 's04', 's08', 's09'),
      ...appearsInSessions(threads.priceOfSalvation.id, 's06', 's07', 's09', 's10'),
      ...appearsInSessions(threads.abbeySchism.id, 's03', 's04', 's06', 's10'),

      // Wątki → hierarchia
      derivesFrom(threads.starPrism.id, threads.blackTide.id),
      derivesFrom(threads.lighthousePact.id, threads.blackTide.id),
      derivesFrom(threads.priceOfSalvation.id, threads.blackTide.id),
      derivesFrom(threads.dryCanals.id, threads.blackTide.id),
      derivesFrom(threads.whaleBoneKey.id, threads.dryCanals.id),
      derivesFrom(threads.wardensDiary.id, threads.lighthousePact.id),
      derivesFrom(threads.verrick.id, threads.boughtCouncilors.id),
      derivesFrom(threads.abbeySchism.id, threads.blackTide.id),
    ],
    addRelation,
  );

  await addRelations(
    [
      // PC / NPC / lokacje / przedmioty / clues / zegary → sesje
      ...appearsInSessions(playerCharacters.iria.id, 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'),
      ...appearsInSessions(playerCharacters.borin.id, 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'),
      ...appearsInSessions(playerCharacters.mara.id, 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'),

      ...appearsInSessions(npcs.ada.id, 's01', 's02', 's05', 's08', 's09', 's10'),
      ...appearsInSessions(npcs.ryn.id, 's01', 's03', 's05', 's08'),
      ...appearsInSessions(npcs.toman.id, 's02', 's05'),
      ...appearsInSessions(npcs.elsera.id, 's02', 's07', 's09', 's10'),
      ...appearsInSessions(npcs.syrene.id, 's03', 's07', 's10'),
      ...appearsInSessions(npcs.oren.id, 's05', 's08', 's09'),
      ...appearsInSessions(npcs.nox.id, 's04', 's06', 's08'),
      ...appearsInSessions(npcs.ysma.id, 's06'),
      ...appearsInSessions(npcs.caelum.id, 's03', 's10'),
      ...appearsInSessions(npcs.garet.id, 's04', 's07', 's09', 's10'),
      ...appearsInSessions(npcs.mina.id, 's01', 's06', 's08'),
      ...appearsInSessions(npcs.verrick.id, 's08', 's09'),

      ...appearsInSessions(cityLocations.oldDocks.id, 's01', 's08'),
      ...appearsInSessions(innerLocations.warehouse12.id, 's01', 's04', 's08'),
      ...appearsInSessions(cityLocations.saltArchive.id, 's02'),
      ...appearsInSessions(innerLocations.mapRoom.id, 's02', 's07'),
      ...appearsInSessions(cityLocations.starLantern.id, 's02', 's09'),
      ...appearsInSessions(innerLocations.beaconChamber.id, 's02', 's09'),
      ...appearsInSessions(greaterLocations.tideAbbey.id, 's03', 's10'),
      ...appearsInSessions(innerLocations.abbeyGarden.id, 's03'),
      ...appearsInSessions(cityLocations.brineCanals.id, 's04', 's08'),
      ...appearsInSessions(innerLocations.drownedCatacombs.id, 's07', 's10'),
      ...appearsInSessions(innerLocations.tideChamber.id, 's07', 's10'),
      ...appearsInSessions(cityLocations.northFort.id, 's05', 's09'),
      ...appearsInSessions(innerLocations.councilChamber.id, 's05'),
      ...appearsInSessions(cityLocations.saltHospital.id, 's06'),
      ...appearsInSessions(greaterLocations.whisperCliffs.id, 's07', 's09'),

      ...appearsInSessions(items.starPrism.id, 's02', 's09', 's10'),
      ...appearsInSessions(items.whaleBoneKey.id, 's04', 's07', 's10'),
      ...appearsInSessions(items.wardensDiary.id, 's02', 's07'),
      ...appearsInSessions(items.dryCanalsMap.id, 's04', 's08'),
      ...appearsInSessions(items.councilSeal.id, 's05'),
      ...appearsInSessions(items.blackPearl.id, 's03', 's07', 's10'),
      ...appearsInSessions(items.saltBloodAmpoule.id, 's06'),
      ...appearsInSessions(items.verrickHook.id, 's08', 's09'),
      ...appearsInSessions(items.lighthouseLamp.id, 's02', 's09'),

      ...appearsInSessions(clues.deepHymn.id, 's03'),
      ...appearsInSessions(clues.bribeLedger.id, 's05'),
      ...appearsInSessions(clues.saltTrace.id, 's04', 's06'),
      ...appearsInSessions(clues.crackedLens.id, 's02'),
      ...appearsInSessions(clues.warehousePlan.id, 's04', 's08'),
      ...appearsInSessions(clues.burntLog.id, 's07'),
      ...appearsInSessions(clues.childBracelet.id, 's01'),
      ...appearsInSessions(clues.redCircleMap.id, 's07'),
      ...appearsInSessions(clues.patientRegister.id, 's06'),
      ...appearsInSessions(clues.garetTestimony.id, 's04', 's07'),
      ...appearsInSessions(clues.lighthouseOath.id, 's09'),
      ...appearsInSessions(clues.brokenSeal.id, 's05'),

      ...appearsInSessions(clocks.tideGate.id, 's03', 's07', 's10'),
      ...appearsInSessions(clocks.beaconFailure.id, 's02', 's09'),
      ...appearsInSessions(clocks.councilSale.id, 's05', 's08', 's09'),
      ...appearsInSessions(clocks.smugglingNet.id, 's01', 's04', 's08'),
      ...appearsInSessions(clocks.saltPlague.id, 's06', 's07', 's09'),
      ...appearsInSessions(clocks.verrickAssault.id, 's08', 's09'),
      ...appearsInSessions(clocks.rynDebt.id, 's01', 's05'),
      ...appearsInSessions(clocks.failedPact.id, 's07', 's10'),
    ],
    addRelation,
  );

  await addRelations(
    [
      // NPC relacje
      relatedTo(npcs.ada.id, npcs.oren.id, 'zbiera na niego materiały'),
      relatedTo(npcs.ada.id, npcs.ryn.id, 'ufa mu tylko częściowo'),
      relatedTo(npcs.toman.id, npcs.elsera.id, 'wie o jej tajemnicy'),
      relatedTo(npcs.syrene.id, npcs.caelum.id, 'trzyma go w strachu'),
      relatedTo(npcs.nox.id, npcs.verrick.id, 'wynajmuje do brudnej roboty'),
      relatedTo(npcs.ysma.id, clocks.saltPlague.id, 'śledzi objawy'),
      relatedTo(npcs.garet.id, innerLocations.drownedCatacombs.id, 'zna drogę'),
      relatedTo(npcs.mina.id, npcs.nox.id, 'boi się jej ludzi'),
      relatedTo(npcs.elsera.id, clocks.failedPact.id, 'przeżyła'),
      relatedTo(npcs.ryn.id, clocks.rynDebt.id, 'dług wraca'),

      // Notatki → sesje
      ...appearsInSessions(notes.docksBlood.id, 's01'),
      ...appearsInSessions(notes.minaWitness.id, 's01'),
      ...appearsInSessions(notes.prismReaction.id, 's02'),
      ...appearsInSessions(notes.caelumMeeting.id, 's03'),
      ...appearsInSessions(notes.hymnMeaning.id, 's03'),
      ...appearsInSessions(notes.whaleKey.id, 's04'),
      ...appearsInSessions(notes.councilBribes.id, 's05'),
      ...appearsInSessions(notes.rynDebtNote.id, 's05'),
      ...appearsInSessions(notes.mistSymptoms.id, 's06'),
      ...appearsInSessions(notes.hospitalForgery.id, 's06'),
      ...appearsInSessions(notes.catacombGap.id, 's07'),
      ...appearsInSessions(notes.elseraMemory.id, 's07'),
      ...appearsInSessions(notes.verrickNight.id, 's08'),
      ...appearsInSessions(notes.prismCost.id, 's09'),
      ...appearsInSessions(notes.evacuationRoute.id, 's09'),
      ...appearsInSessions(notes.finalPrice.id, 's10'),

      // Notatki → encje
      relatedTo(notes.docksBlood.id, cityLocations.oldDocks.id, 'miejsce'),
      relatedTo(notes.docksBlood.id, clocks.saltPlague.id, 'pierwszy ślad'),
      relatedTo(notes.minaWitness.id, npcs.mina.id, 'świadek'),
      relatedTo(notes.minaWitness.id, innerLocations.warehouse12.id, 'wskazała'),
      relatedTo(notes.prismReaction.id, items.starPrism.id, 'dotyczy'),
      relatedTo(notes.prismReaction.id, cityLocations.starLantern.id, 'miejsce'),
      relatedTo(notes.caelumMeeting.id, npcs.caelum.id, 'prosił o pomoc'),
      relatedTo(notes.caelumMeeting.id, greaterLocations.tideAbbey.id, 'miejsce'),
      relatedTo(notes.hymnMeaning.id, clues.deepHymn.id, 'analiza'),
      relatedTo(notes.hymnMeaning.id, npcs.syrene.id, 'prowadzi rytuał'),
      relatedTo(notes.whaleKey.id, items.whaleBoneKey.id, 'dotyczy'),
      relatedTo(notes.whaleKey.id, cityLocations.brineCanals.id, 'znaleziono w'),
      relatedTo(notes.councilBribes.id, clues.bribeLedger.id, 'dowód'),
      relatedTo(notes.councilBribes.id, npcs.oren.id, 'obciąża'),
      relatedTo(notes.rynDebtNote.id, npcs.ryn.id, 'dotyczy'),
      relatedTo(notes.rynDebtNote.id, clocks.rynDebt.id, 'zegar'),
      relatedTo(notes.mistSymptoms.id, npcs.ysma.id, 'źródło wiedzy'),
      relatedTo(notes.mistSymptoms.id, clocks.saltPlague.id, 'zegar'),
      relatedTo(notes.hospitalForgery.id, cityLocations.saltHospital.id, 'miejsce'),
      relatedTo(notes.hospitalForgery.id, fronts.saltFever.id, 'wątek'),
      relatedTo(notes.catacombGap.id, innerLocations.drownedCatacombs.id, 'miejsce'),
      relatedTo(notes.catacombGap.id, clues.redCircleMap.id, 'powiązana wskazówka'),
      relatedTo(notes.elseraMemory.id, npcs.elsera.id, 'wyznanie'),
      relatedTo(notes.elseraMemory.id, threads.lighthousePact.id, 'wątek'),
      relatedTo(notes.verrickNight.id, npcs.verrick.id, 'dotyczy'),
      relatedTo(notes.verrickNight.id, clocks.verrickAssault.id, 'plan'),
      relatedTo(notes.prismCost.id, items.starPrism.id, 'ostrzeżenie'),
      relatedTo(notes.prismCost.id, clues.lighthouseOath.id, 'potwierdza'),
      relatedTo(notes.evacuationRoute.id, greaterLocations.whisperCliffs.id, 'droga'),
      relatedTo(notes.evacuationRoute.id, npcs.garet.id, 'pokazał'),
      relatedTo(notes.finalPrice.id, innerLocations.tideChamber.id, 'miejsce'),
      relatedTo(notes.finalPrice.id, threads.priceOfSalvation.id, 'finał'),
    ],
    addRelation,
  );

  await addRelations(
    [
      // Session Events → Sessions
      ...appearsInSessions(events.s01Arrival.id, 's01'),
      ...appearsInSessions(events.s01Body.id, 's01'),
      ...appearsInSessions(events.s01Warehouse.id, 's01'),
      ...appearsInSessions(events.s02Archive.id, 's02'),
      ...appearsInSessions(events.s02Tower.id, 's02'),
      ...appearsInSessions(events.s02Lantern.id, 's02'),
      ...appearsInSessions(events.s03Abbey.id, 's03'),
      ...appearsInSessions(events.s03Garden.id, 's03'),
      ...appearsInSessions(events.s03Escape.id, 's03'),
      ...appearsInSessions(events.s04Canals.id, 's04'),
      ...appearsInSessions(events.s04Nox.id, 's04'),
      ...appearsInSessions(events.s04Key.id, 's04'),
      ...appearsInSessions(events.s05Fort.id, 's05'),
      ...appearsInSessions(events.s05Ledger.id, 's05'),
      ...appearsInSessions(events.s05Speech.id, 's05'),
      ...appearsInSessions(events.s06Hospital.id, 's06'),
      ...appearsInSessions(events.s06Mist.id, 's06'),
      ...appearsInSessions(events.s06Register.id, 's06'),
      ...appearsInSessions(events.s07Dive.id, 's07'),
      ...appearsInSessions(events.s07Diary.id, 's07'),
      ...appearsInSessions(events.s07Chamber.id, 's07'),
      ...appearsInSessions(events.s08Raid.id, 's08'),
      ...appearsInSessions(events.s08Warehouse.id, 's08'),
      ...appearsInSessions(events.s08Verrick.id, 's08'),
      ...appearsInSessions(events.s09Fort.id, 's09'),
      ...appearsInSessions(events.s09Lantern.id, 's09'),
      ...appearsInSessions(events.s09Choice.id, 's09'),
      ...appearsInSessions(events.s10Descent.id, 's10'),
      ...appearsInSessions(events.s10Ritual.id, 's10'),
      ...appearsInSessions(events.s10Seal.id, 's10'),
    ],
    addRelation,
  );

  const demoGeneratorPacks = createGeneratorDemoPacks(campaignId).map((pack, index) => ({
    ...pack,
    isActive: index === 0,
  }));
  await importGeneratorPacks(db, campaignId, demoGeneratorPacks, 'replace');

  const activePack = demoGeneratorPacks[0];
  const firstNameTable = activePack?.tables.find((table) => table.type === 'firstName');
  const locationTable = activePack?.tables.find((table) => table.type === 'locationName');
  const eventTable = activePack?.tables.find((table) => table.type === 'event');
  if (activePack && firstNameTable && locationTable && eventTable) {
    await appendGeneratorRollLog(db, {
      campaignId,
      sessionId: sessions.s02.id,
      packId: activePack.id,
      kind: 'character',
      resultText: 'Maeve Graves "Whisper"',
      sourceTableIds: [firstNameTable.id],
      createdAt: '2025-03-10T21:05:00.000Z',
    });
    await appendGeneratorRollLog(db, {
      campaignId,
      sessionId: sessions.s04.id,
      packId: activePack.id,
      kind: 'location',
      resultText: 'Ruins: Morrow Vault',
      sourceTableIds: [locationTable.id],
      createdAt: '2025-03-24T20:35:00.000Z',
    });
    await appendGeneratorRollLog(db, {
      campaignId,
      sessionId: sessions.s08.id,
      packId: activePack.id,
      kind: 'eventTable',
      resultText: 'A courier collapses with a blood-sealed letter.',
      sourceTableIds: [eventTable.id],
      createdAt: '2025-04-21T22:05:00.000Z',
    });
  }
}

function getCampaignIdFromDb(db: MgHelperDb): string {
  const prefix = 'mg-helper-';
  if (db.name.startsWith(prefix)) {
    return db.name.slice(prefix.length);
  }
  return '__legacy__';
}

/** True if there's at least one entity in the database */
export async function hasExistingData(db: MgHelperDb): Promise<boolean> {
  const count = await db.entities.count();
  return count > 0;
}

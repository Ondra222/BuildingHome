# Stavba domu – návrh projektu

Webová aplikace, která drží celou stavbu rodinného domu na jednom místě: co je potřeba vyřídit, kolik to stojí, kdy se co dělá, kdo to dělá a jak stavba postupuje. Je pro jednoho stavebníka a jeho vlastní stavbu, funguje v telefonu i na počítači a jde ji nainstalovat na plochu jako aplikaci.

## Cíl

Stavebník nemá mít rozpočet v Excelu, kontakty v telefonu, fotky v galerii a seznam úřadů na papíře. Aplikace má na první pohled odpovědět:

1. Co mám udělat teď?
2. Vejdu se do rozpočtu?
3. Stíhám harmonogram?
4. Komu mám zavolat nebo zaplatit?

## Funkce (verze 1 – hotovo)

| Záložka | Co umí |
|---|---|
| **Přehled** | Výkres domu, který se dokresluje podle hotových etap. Procento splněného postupu, utraceno z rozpočtu, konec aktuální etapy, nezaplacené faktury, další krok, poslední zápis v deníku. |
| **Postup** | 46 kroků v 6 fázích od výběru pozemku po daňové přiznání: příprava a financování, projekt a povolení záměru, výběr dodavatelů, hrubá stavba, vnitřní práce, kolaudace. Každý krok se dá odškrtnout a má krátké vysvětlení. |
| **Rozpočet** | Plán podle etap, výdaje s datem, etapou, dodavatelem a stavem úhrady. Ukazuje překročení plánu. |
| **Harmonogram** | Etapy stavby s termíny, časovou osou (Gantt) a úkoly uvnitř etap. |
| **Řemeslníci** | Kontakty, profese, stav (poptáno → nabídka → domluveno → hotovo), nabídnutá cena a kolik už jim bylo zaplaceno. |
| **Deník** | Zápisy podle dnů s fotkami ze stavby. |
| **Projekt** | Vlastní návrh domu: kreslení půdorysu (obvodové a nosné zdi, příčky, okna, dveře, místnosti s plochou) po podlažích, návrh kanalizace (potrubí DN 40–110, zařizovací předměty) a elektroinstalace (zásuvky, vypínače, světla, rozvaděč, okruhy s jističi, kabely). 3D model ve WebGL (Three.js) se stíny, texturami, okny s rámy a sklem, volbou střechy (sedlová, bungalov, valbová, stanová, pultová, plochá) a barev omítky, střechy, oken a soklu. Záložka Na pozemku vloží dům do fotky pozemku: automaticky (rozbor fotky přímo v prohlížeči najde horizont, volnou plochu terénu, světlo a barevnost) i ručně (posun prstem, otočení a zvětšení dvěma prsty, náklon a šířka záběru, směr slunce se stínem) a výsledek uloží jako obrázek nebo do deníku. Výkaz výměr a orientační cena hrubé stavby po částech s upravitelnými jednotkovými cenami a převodem do plánu rozpočtu. Tisk sady výkresů A4 do PDF (technická zpráva, půdorysy, kanalizace, elektro, 3D pohled, výkaz výměr s razítkem). |

Dále: záloha a obnova do souboru JSON (včetně fotek), mazání s možností vrátit, ukázková data, offline režim, tmavý režim podle systému.

## Technické řešení

- **Čistý HTML, CSS a JavaScript** bez frameworku a bez build kroku. Jedinou knihovnou je Three.js pro 3D model, uložená přímo v `vendor/`. Stačí statický hosting (GitHub Pages).
- **Data zůstávají v zařízení** – IndexedDB (stav aplikace a fotky jako soubory), záložně localStorage. Žádný server, žádný účet.
- **PWA** – `manifest.webmanifest` a `sw.js` pro instalaci na plochu a práci bez signálu na stavbě.

```
index.html            kostra stránky
styles.css            vzhled (světlý i tmavý režim)
app.js                logika, vykreslování, úložiště, formuláře
steps.js              obsah záložky Postup (kroky a vysvětlivky)
design.js             záložka Projekt: editor půdorysu, odpady, elektro, 3D, cena, výkresy
house3d.js            3D model ve WebGL (načítá se, až když otevřete 3D)
siteai.js             automatické usazení domu do fotky pozemku (rozbor obrazu)
vendor/               Three.js r170 (MIT) uložené v repozitáři kvůli offline režimu
sample.js             ukázková data
sw.js                 offline režim
manifest.webmanifest  instalace jako aplikace
```

### Datový model

```js
{
  name: "Rodinný dům …",
  stages:   [{ id, name, start, end, plan, done, part, tasks: [{ id, t, d }] }],
  expenses: [{ id, date, desc, stage, amount, who, paid }],
  contacts: [{ id, name, trade, phone, email, price, status, note }],
  diary:    [{ id, date, text, photos: [{ id }] }],
  steps:    { "p2g": true, … },  // splněné kroky postupu
  design: {                       // záložka Projekt, souřadnice v metrech
    floors: [{ id, name, h, walls: [{ id, x1, y1, x2, y2, kind: "ext|load|part", t }],
               open: [{ id, wall, pos, type: "window|door", w, h, sill, flip, hand }],
               rooms: [{ id, name, x, y, w, h }], fix: [{ id, type, x, y, rot }],
               pipes: [{ id, dn, pts }], elec: [{ id, type, x, y, rot, circ }], cables: [{ id, circ, pts }] }],
    roof: { type, pitch, over, preset }, look: { wall, roof, frame, plinth },
    site: { photo, x, z, rot, scale, pitch, camH, fov, sun },  // dům na fotce pozemku
    circuits: [{ id, name, jistic }], prices: { klíč: Kč }, reserve, meta
  }
}
```

`part` propojuje etapu s částí výkresu domu (`zaklady`, `zdi`, `strecha`, `okna`, `fasada`, `hotovo`).

## Spuštění

```bash
python3 -m http.server 8000
# otevřít http://localhost:8000
```

Nasazení: v nastavení repozitáře zapnout **Pages → Deploy from branch → main / root**.

## Roadmapa

**Verze 2 – pohodlí**
- Připomínky termínů a plateb (notifikace)
- Přílohy k výdajům (fotka faktury, PDF smlouvy)
- Vyhledávání a filtry ve výdajích a deníku
- Export rozpočtu do CSV pro banku a čerpání hypotéky

**Verze 3 – sdílení**
- Synchronizace mezi zařízeními (např. Supabase nebo Firebase) a přihlášení
- Sdílení s partnerem a pohled pro stavbyvedoucího
- Čerpání hypotéky podle etap a hlídání pozastávek

**Verze 4 – chytré funkce**
- Šablony postupu pro různé typy staveb (zděná, dřevostavba, svépomoc)
- Odhad rozpočtu podle m² a regionu
- Kontrolní seznamy převzetí prací po řemeslnících

## Upozornění

Záložka Projekt slouží jako návrh a podklad pro projektanta. Dokumentaci pro povolení stavby musí zpracovat autorizovaná osoba, elektro a kanalizaci projektant příslušné profese. Orientační cena vychází z výměr výkresu a upravitelných jednotkových cen; výchozí ceny jsou hrubý odhad.

Záložka Postup je obecný přehled podle stavebního zákona č. 283/2021 Sb. ve znění k listopadu 2026. Novela schválená v září 2026 mění povolování od roku 2028. Lhůty, poplatky a potřebné doklady si vždy ověřte na příslušném stavebním úřadě.

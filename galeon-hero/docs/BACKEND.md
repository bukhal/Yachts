# Model hero — інтеграція з бекендом

Для розробників, які підключають model page до API YachtWay. Усі дані йдуть через шар `src/api/`: [`model-hero.js`](../src/api/model-hero.js) (hero, inventory), [`listings.js`](../src/api/listings.js) (оголошення), [`model-content.js`](../src/api/model-content.js) (розділи під hero), [`alerts.js`](../src/api/alerts.js) (підписка); спільний запит з таймаутом — [`http.js`](../src/api/http.js). Компоненти не знають, звідки прийшли дані, тому заміна моків на API торкається лише цього шару та шаблону сторінки.

Усі місця, де потрібна дія, позначені в коді `TODO(backend)`, `TODO(content)`, `TODO(analytics)`, `TODO(integration)`:

```bash
grep -rn "TODO(" src index.html
```

## 1. Як дані потрапляють на сторінку

```
шаблон сторінки ──► <main data-model-slug="galeon-500-fly">
                    window.__YW_CONFIG__ = { apiBase: "/api" }
        │
        ▼
src/api/
  model-hero.js     getModelHero(slug)       → normalizeModelHero()    → ModelHeroData
                    getInventorySummary(id)  → normalizeInventory()    → InventorySummary
  listings.js       getModelListings(id)     → normalizeListing()      → ListingCard[]
  model-content.js  getModelContent(model)   → normalizeModelContent() → ModelContent
  alerts.js         subscribeModelAlerts()   → POST /alerts
        │
        ▼
main.js → hero (YachtScene, HeroSpecs, …), listings, sections (model-sections.js), footer
```

- Поки `__YW_CONFIG__.apiBase` не задано, використовуються моки з `src/data/`. Вони підвантажуються динамічним `import()` лише в цьому випадку, тож з API їх можна видалити без змін у коді.
- Контент і оголошення вантажаться паралельно з hero. Помилка одного блоку не ламає інші: розділ без даних (або з даними, на яких рендер упав) ховається разом зі своїм якорем у меню.
- Нормалізатори валідують відповідь, обмежують значення, ставлять безпечні дефолти й пропускають лише http(s)-посилання (`src/lib/safe-url.js`; `javascript:` тощо → посилання не рендериться). Тести: `tests/model-hero-api.test.js`, `tests/listings.test.js`, `tests/content-and-units.test.js`, `tests/alerts.test.js`.
- Запити мають таймаут 15 с: «Loading yachts…» не висить вічно, з'являється повідомлення про недоступність.
- Помилка inventory не блокує hero: блок ціни лишається посиланням «Yachts for sale», але без чисел.
- Без валідного `side.src` hero показує стан «image unavailable», а статична розмітка (H1, перемикач, плейсхолдери) лишається робочою.

## 2. Ендпоінти

| Метод | Шлях | Відповідь | Кеш |
|---|---|---|---|
| GET | `/api/models/{slug}/hero` | `ModelHeroData` | довгий (дані моделі змінюються рідко), інвалідація при редагуванні моделі |
| GET | `/api/models/{id}/inventory-summary` | `InventorySummary` | короткий, 1–5 хв |
| GET | `/api/models/{id}/listings` | `ListingCard[]` у рекомендованому порядку | короткий, 1–5 хв |
| GET | `/api/models/{id}/content` | генерації, специфікації, огляди, моделі, дилери (`src/data/galeon-500-fly.sections.js`) | довгий |
| POST | `/api/alerts` | `{ email, modelId, topics: ("listings" \| "price" \| "models")[] }` → 201, лист з double opt-in | — |
| GET | `/api/brands/{slug}/dealers` | авторизовані дилери (YachtWay вже має: `api.yachtway.com/api/profiles/brand/v2/{slug}/dealers`) | довгий |

Типи описані в [`src/types.d.ts`](../src/types.d.ts), це і є контракт. Повний приклад відповіді лежить у [`src/data/galeon-500-fly.js`](../src/data/galeon-500-fly.js).

**SSR-варіант (рекомендовано для SEO):** сервер рендерить H1, `<title>`, meta description і вбудовує `ModelHeroData` як `<script type="application/json">`. Тоді `getModelHero` читає його замість fetch, без другого запиту.

## 3. ModelHeroData: правила полів

### Характеристики (`specs`)
Порядок і групи в ряду задає фронтенд: `length, beam, draft | capacity, sleeps, crew | speed, power`. Невідомі `id` ігноруються, відсутні не рендеряться.

| Поле | Де видно | Правило |
|---|---|---|
| `value` | велике число | `number` форматується з `format` (Intl), `string` показується як є (`"2×725"`). `null`/`""` → пункт приховано |
| `unit` | під числом | 1–2 слова: `meters`, `persons`, `3 cabins`, `knots`, `horse power` |
| `secondary` | tooltip, перший рядок | альтернативне значення: `6.00 m in Beach Mode`, `1.00 m canoe body (hull only)` |
| `note` | tooltip | що саме означає число, для якої конфігурації |
| `sourceId` | tooltip, «Source: …» | ключ у `sources` |
| `referenceProfile` | — | id профілю в `referenceProfiles`, якщо значення залежить від ринку/двигунів |

**Значення, які залежать від конфігурації**, завжди мають `note` і `referenceProfile`: осадка (з гвинтами чи тільки корпус), швидкість (від двигунів), потужність (максимальна опція). Це характеристики моделі, а не конкретного оголошення.

### Верф (`builder`)
| Поле | Правило |
|---|---|
| `name` | назва верфі: `Galeon` |
| `countryCode` | **ISO 3166-1 alpha-2** (`PL`, `IT`, `GB`, `US`…). На екрані показується код: `GALEON · PL`. Можна надіслати `country: "Poland"` без коду, тоді фронтенд визначить код сам (`src/lib/country.js`). Неформальні `UK` і `USA` також розпізнаються |
| `country` | необов'язково, повна англійська назва для tooltip; без неї виводиться з коду через `Intl.DisplayNames` |
| `founded`, `note`, `sourceId` | tooltip: «Galeon, Poland · since 1982», де і як будують, джерело |

### Джерела (`sources`)
`{ id, label, shortLabel, url, archiveUrl?, market, verifiedAt (ISO), note? }`. `verifiedAt` — дата, коли значення звірені з джерелом. Для Galeon 500 Fly: офіційна глобальна сторінка (архів 2024-07-20, бо живий URL веде на 520 FLY), US spec sheet 2023 та YachtBuyer (стороннє джерело, лише для швидкостей інших двигунів).

### Зображення виду (`side`, `cutaway`)

| Поле | Обов'язкове | Правило |
|---|---|---|
| `src` | так | PNG/WebP з альфа-каналом, ширина ≥ 1500 px, без запечених тіней і відблисків |
| `alt` | так | опис для screen reader |
| `intrinsicWidth/Height` | бажано | резервує місце до завантаження (без layout shift) |
| `waterlineY` | **так** | 0..1 від верху картинки. Задає контент-менеджер для кожного asset: з альфи її не визначити |
| `visibleBounds` | ні | 0..1. Якщо немає, рахується один раз з альфи при завантаженні |
| `causticBandHeight` | ні | частка висоти картинки над ватерлінією для відблисків, типово 0.2 |
| `hullMaskSrc` | ні | маска корпусу (R-канал), якщо силует складний |
| `enableWaterFx` | ні | `false` вимикає водні ефекти для цього виду |
| `water.widthScale/offsetX` | ні | ручне підлаштування ширини/зсуву води |

**CORS:** якщо картинки лежать на CDN з іншим origin, CDN має віддавати `Access-Control-Allow-Origin` для домену сайту. Фронтенд сам ставить `crossOrigin="anonymous"`, але без заголовка WebGL не зможе прочитати текстуру: ефекти вимкнуться, і спрацює статичний fallback.

### Галерея (`gallery`)

`[{ src, thumb, alt, width?, height? }]`, де перший елемент — обкладинка.

- **Мінімум:** 6 фото (обкладинка + 2 середніх + 3 малих). Решта відкривається через «View all». Порожній масив показує плейсхолдер «coming soon».
- **`src`:** ≈1800 px по довшій стороні, для переглядача.
- **`thumb`:** ≈720 px, для плиток. Якщо його немає, використовується `src`.
- **`alt`:** що на фото: «Main deck salon with lounge seating».
- **Порядок:** спершу зовнішні кадри (обкладинка — найкращий ракурс), далі інтер'єри.
- **Джерело зараз:** фото оголошень Galeon 500 Fly з yachtway.com. Офіційний фотосет моделі на galeon.pl більше недоступний.

### Cutaway (`cutaway`): плани палуб

Фронтенд не знає, скільки палуб у моделі і як вони називаються: усе приходить з бекенду (адмінки). Додати нову модель = завантажити картинки й заповнити поля. Код не змінюється.

```json
"cutaway": {
  "intrinsicWidth": 2000,
  "intrinsicHeight": 692,
  "defaultDeck": "flybridge",
  "displayScale": 1,
  "decks": [
    { "id": "flybridge", "label": "Flybridge",  "src": "https://cdn…/galeon-500-fly/decks/flybridge.png",  "alt": "…", "visibleBounds": { "x": 0.101, "y": 0.159, "width": 0.85, "height": 0.676 } },
    { "id": "main",      "label": "Main Deck",  "src": "https://cdn…/galeon-500-fly/decks/main-deck.png",  "alt": "…" },
    { "id": "lower",     "label": "Lower Deck", "src": "https://cdn…/galeon-500-fly/decks/lower-deck.png", "alt": "…" }
  ],
  "tour": { "provider": "giraffe360", "url": "https://tour.giraffe360.com/…/", "hotspots": {} }
}
```

**Поля (адмінка)**

| Поле | Обов'язкове | Правило |
|---|---|---|
| `decks[]` | так, 1–5 | **Порядок = порядок у перемикачі, зверху вниз** (Sundeck → Flybridge → Main Deck → Lower Deck). Якщо палуба одна, перемикач ховається |
| `decks[].id` | так | стабільний slug: `sundeck`, `flybridge`, `upper`, `main`, `lower`, `crew` |
| `decks[].label` | так | назва в перемикачі англійською: «Flybridge», «Main Deck», «Lower Deck», «Sundeck», «Upper Deck» |
| `decks[].src` | так | PNG або WebP з прозорістю, CDN з CORS (див. нижче) |
| `decks[].alt` | так | що видно: «Main deck layout: cockpit, salon, galley and helm» |
| `decks[].visibleBounds` | ні | непрозора область 0..1. Якщо її немає, фронт вимірює її один раз з альфа-каналу (потрібен CORS) |
| `defaultDeck` | ні | з якої палуби відкривається Cutaway; без нього — перша в списку |
| `intrinsicWidth/Height` | бажано | розмір полотна, щоб резервувати місце до завантаження |
| `displayScale` | ні | множник розміру для моделей, чиї плани намальовані в іншому масштабі (0.5–2, за замовчуванням 1) |

**Вимоги до зображень**

- Вигляд строго зверху (ортографічний), ніс праворуч, корма ліворуч.
- **Усі палуби однієї моделі — на полотні однакового розміру й в одному масштабі**, корпус у тих самих координатах. Тоді перемикання відбувається плавним crossfade без зсувів.
- Фон прозорий. Не запікати тіні: тінь під планом малює фронтенд, і її можна налаштувати.
- Ширина полотна ≥ 2000 px, бо план показується до ~950 CSS px на retina. Поля навколо корпусу: 5–10%.
- Назви файлів: `{modelSlug}/decks/{deckId}.webp` (WebP з альфою, ~50 КБ замість ~300 КБ PNG; PNG теж працює), наприклад `galeon-500-fly/decks/main-deck.webp`.

Перемикач і кнопка 360° tour стають біля **видимого** краю плану (з `visibleBounds`). Тому більша або менша картинка, чи інший `displayScale`, не ламає композицію.

**360° тур**

- `tour.url` — лише `https://`. Giraffe360 вбудовується в iframe без обмежень.
- `tour.hotspots` — `{ [deckId]: [{ x, y, label, rid }] }`: x/y нормалізовані відносно зображення палуби, `rid` — Reference ID з дашборду Giraffe360 (`?rid=`).
- **Посилань на конкретну кімнату чи сцену Giraffe360 не документує.** `?rid=` лише наводить камеру на Info hotspot і працює, тільки якщо в дашборді ввімкнено Reference IDs. Тому зараз масив порожній. Порожні або невалідні записи не рендеряться.

## 4. InventorySummary: правила

```ts
{ listingCount: number | null; minimumAskingPrice: number | null; currency: string; updatedAt?: string; isDemo: boolean }
```

- `listingCount` — активні опубліковані оголошення цієї моделі, нові й вживані.
- `minimumAskingPrice` — мінімум серед цих оголошень **з відомою ціною**, в одній валюті `currency` (ISO 4217). Конвертує бекенд; оголошення «price on request» не враховуються.
- Ціна не показується, якщо `listingCount` 0/null, ціна ≤ 0 або валюта невалідна (перевіряє `normalizeInventory`).
- `isDemo: true` показує позначку «Demo inventory». У продакшні завжди `false`.
- `updatedAt` (ISO) зараз у hero не показується; рядок «updated …» над сіткою оголошень бере дату знімка мока. TODO(backend): віддавати `updatedAt` разом зі списком оголошень.

## 5. Listings («For sale»)

Зараз дані — знімок 12 реальних оголошень Galeon 500 Fly з yachtway.com (`src/data/listings.mock.js`, 2026-10-19). Його отримано з публічного `api.yachtway.com/api/listing-catalog` і сторінок оголошень. Фото й відео лежать локально в `assets/listings/`. Контракт — `ListingCard` у `src/types.d.ts`.

| Поле | Правило |
|---|---|
| `media` | 3–6 елементів для прев'ю: зони наведення йдуть у тому ж порядку. Якщо першим стоїть `{ type: "video", src, poster }`, відео автоматично грає при наведенні (MP4 до ~5 МБ, 6–10 с, 960 px). Повна галерея — на сторінці оголошення |
| `price`, `currency` | ціна в оригінальній валюті; `null` → «Price on request» |
| `priceUsd` | **потрібно від бекенду** для сортування й фільтра ціни між валютами. Зараз на фронті наближений курс (`USD_PER` у `src/api/listings.js`) |
| `oldPrice` | попередня ціна, якщо її знижено: показується бейдж «↓ $50K» |
| `engineHours`, `year`, `condition`, `location.countryCode` | фільтри й рядок метаданих |
| `photosCount`, `has3DTour` | бейджі «96 photos», «3D tour» |
| `url` | сторінка оголошення |
| `generation` | `"gen1"`, `"gen2"`… — **підтверджена** генерація (бейдж «Gen 2», фільтр). Зараз фронт виводить її з року моделі. На роках перехідного періоду це неточно, тому бекенд має надсилати підтверджене значення |

- **Щомісячний платіж** («From $X/mo») рахується на фронті тією ж формулою й з тими ж дефолтами, що в калькуляторі YachtWay: 10% внеску, 5% APR, 240 місяців. Показується лише для USD.
- **Фільтри й сортування** зараз клієнтські (`src/lib/listings-query.js`), бо оголошень мало. Для великих моделей перенести на API з тими ж параметрами, які вже синхронізуються з URL: `sort`, `cond=new,used` (кілька значень), `gen=gen1,gen2` (кілька значень), `loc=US,GR` (кілька значень), `price=800000-1200000` (USD), `year=2019-2022`, `hours=500` (до N годин).
- Для гістограм і шкали слайдерів API має віддавати розподіл значень (або самі значення) з урахуванням **інших** активних фільтрів. Зараз це рахується на клієнті.
- **See all:** сітка показує всі оголошення моделі. Під нею посилання «See all Galeon yachts for sale» веде на сторінку бренду на yachtway.com (`modelsUrl`). TODO(backend): URL каталогу з фільтром саме цієї моделі. Зараз на сайті такого немає: `/boats-for-sale/?brand=…&model=…` фільтр ігнорує, а `/models/{slug}` повертає 404.
- **Підсумок у hero** («12 yachts for sale · from $800,000») зараз виводиться з того самого списку, тож hero і сітка завжди збігаються.

### Контент розділів (`/content`)

- **Генерації:** `{ id, label, title, years: [from, to|null], image, points[], sources[] }` + `successor`. Точки можуть містити одиничні токени `{m:6.00}` (перераховуються Metric/US).
- **Креслення в Specifications** (Figma 55:2819): бічний вид — це `side` з hero, вид зверху — палуба `main` з `cutaway` (повна ширина плану = Beach Mode). Обидва показані в одному масштабі за `visibleBounds`. Підводна частина — `drawings.underwater { src, left, width, aspect }`: PNG з прозорістю, верх = ватерлінія, `left`/`width` — частки ширини бічного рендера.
- **Специфікації:** групи `{ id, title, icon, rows: [{ label, value, quantity?, note? }] }`. Якщо `quantity` = `length` | `volume` | `mass`, то `value` метричне й конвертується на фронті. Інакше значення — готовий рядок.
- **Огляди:** `videos[{ id (YouTube), title, channel, duration, year, thumb, summary }]`, `quotes[{ text (дослівно), author, publication, url }]`. Цитати лише дослівні, з посиланням на джерело.
- **Моделі (карусель):** `{ name, lengthM, image, text, forSale, fromUsd }`. Кількість і ціна — з каталогу YachtWay. Кількість карток довільна, остання — «All Galeon models».
- **Генерації й наступник:** однакова структура `{ id, label, title, years, image, points[] }`. `image` — бічний рендер на прозорому тлі, обрізаний по корпусу (без порожніх полів), низ = ватерлінія; ~1200 px завширшки, WebP з альфою. Картка вирівнює всі рендери по низу корпусу.
- **Огляди:** кількість відео довільна, композиція підлаштовується сама: 1 → широка картка, 2 → дві поруч, 3+ → головне відео + список.
- **Дилери:** `{ name, area, location, logo, web, profile }`.

### Waylo (AI-асистент у FAQ)

- Ім'я, аватар (`assets/ai/waylo.webp`) і привітання взято з Waylo на сторінках оголошень yachtway.com.
- Зараз Waylo відповідає з FAQ цієї сторінки за ключовими словами (`src/components/waylo.js`, `matchFaq`). На інші питання чесно каже, що ще не підключений.
- TODO(backend): надсилати питання на ендпоінт Waylo (у бандлі YachtWay: `/api/listings/v2/waylo/…`) з контекстом моделі й показувати стрімінгову відповідь.

### Підписка «Notify me» (CTA між For sale і Generations, на всю ширину, без контейнера)

- Компонент `src/components/alerts-cta.js`, дані — `src/api/alerts.js`. Теми: нові оголошення, зниження ціни, нові моделі верфі.
- Зараз підписка зберігається лише в браузері (`localStorage` `yw-model-alerts`), після «Notify me» показується підтвердження з кнопкою Change.
- TODO(backend): `POST /api/alerts` з double opt-in, відписка одним кліком з листа; для залогіненого користувача — підставляти email і показувати стан підписки з акаунта.

### Налаштування відвідувача

- **Metric / US** і **Save** зараз зберігаються в `localStorage` (`src/lib/preferences.js`).
- TODO(backend): «Saved yachts» в акаунті користувача; одиниці за замовчуванням за країною (US → imperial).

## 6. Чекліст підключення

- [ ] Шаблон сторінки: `data-model-slug` на `<main>`, `window.__YW_CONFIG__.apiBase`.
- [ ] `GET /api/models/{slug}/hero` за контрактом `ModelHeroData`.
- [ ] `GET /api/models/{id}/inventory-summary` за правилами розділу 4.
- [ ] SSR: H1, `<title>`, meta description, вбудований JSON (розділ 2).
- [ ] CDN картинок: CORS-заголовки (розділ 3).
- [ ] `GET /api/models/{id}/listings` з `priceUsd` і `media` (розділ 5); прибрати `USD_PER`.
- [ ] `GET /api/models/{id}/content` у форматі `ModelContent` (`src/types.d.ts`): генерації, креслення (`drawings.dimensions`), групи специфікацій, відео, цитати, моделі, дилери, FAQ (`faq`: статичні відповіді з `{model}` і `{m:…}` або `{ auto: "price" | "count" | "generation" }`).
- [ ] Після підключення API можна видалити моки `src/data/*.js`, `assets/listings/`, `assets/gallery/` і (якщо не потрібна) dev-фікстуру `src/dev/` — вони імпортуються лише динамічно. Тести `listings.test.js` і `content-and-units.test.js` використовують моки як фікстури: перенести їх у `tests/fixtures/`.
- [ ] Замінити тимчасовий хедер на компонент сайту (`TODO(integration)` в `index.html`), зберегти `--header-offset`.
- [ ] `GET /api/models/{id}/content` і дилери бренду (розділ 5); підтверджена `generation` в оголошеннях.
- [ ] `POST /api/alerts` для CTA «Notify me» (розділ 5).
- [ ] Save → API «saved yachts»; Share використовує канонічний URL моделі.
- [ ] Підключити `src/api/analytics.js` до трекера (події `hero_view_change`, `hero_inventory_click`, `hero_deck_change`, `hero_tour_open`, `hero_gallery_open`, `units_change`, `model_save`, `model_share`, `generation_show`, `review_video_open`, `listings_filter`, `listings_sort`, `listings_see_all`, `model_alert_subscribe`).
- [ ] Футер: замінити статичну розмітку на компонент сайту (`TODO(integration)` в `index.html`), колонку моделі генерувати з даних моделі.
- [ ] Продакшн-шаблон: `window.__YW_CONFIG__ = { apiBase: "/api" }`. Панель «Tune effects», `?fixture=padded` і збереження тюнінгу в localStorage вимкнені за замовчуванням (вмикаються `?dev` або `devTools: true`); ефекти беруть затверджені значення з `src/config/fx-tuned.js`.
- [ ] SEO: canonical, `og:url`, `og:image` (абсолютні URL, `TODO(integration)` в `index.html`). JSON-LD (`Product` + `AggregateOffer`, `FAQPage`) генерується з даних у `src/lib/structured-data.js`; з SSR краще віддавати його одразу в HTML.
- [ ] Продакшн-сервер: gzip/brotli для JS/CSS і довгий кеш для `assets/` (dev-сервер віддає без стиснення). Відео `card-preview.mp4` (5 МБ, з аудіодоріжкою) перекодувати: 640×360, без звуку, CRF ~28.
- [ ] Контент: плани палуб у вищій роздільності (≥ 2000 px) і офіційний фотосет моделі для галереї.
- [ ] Giraffe360: увімкнути Reference IDs на Info hotspots потрібних приміщень і внести їх у `tour.hotspots` — тоді на плані з'являться точки, що відкривають тур з потрібним ракурсом.
- [ ] Адмінка/CMS: поле `waterlineY` (і опційно `hullMaskSrc`) для кожного зображення виду.

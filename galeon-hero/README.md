# YachtWay · Galeon 500 Fly — hero (ітерація 1)

Самодостатнє демо верхньої частини model page за Figma `faZVgceBZCZMEBYTnWR8GE`, фрейм `48:1397`.

```bash
npm start      # http://127.0.0.1:4317  (Node ≥ 20, без залежностей)
npm test       # node:test — нормалізатори API, контент, одиниці, фільтри/сортування, підписка, геометрія сцени
```

**Стек:** HTML + CSS + нативні ES-модулі + WebGL2. У репозиторії не було проєкту (лише зібраний H87 `../index.html`), тому немає ні збірки, ні фреймворка, ні Tailwind. Компоненти — прості фабрики `createX(root, opts)`, їх легко перенести в React/Vue.

## Де що змінювати

| Що | Файл |
|---|---|
| **Підключення до бекенду: контракт, правила полів, чекліст** | [`docs/BACKEND.md`](docs/BACKEND.md) |
| Шар даних (єдине місце, звідки беруться дані) | `src/api/` — `model-hero.js`, `listings.js`, `model-content.js`, `alerts.js`, спільний `http.js` |
| Контент розділів (генерації, креслення, специфікації, відео, моделі, дилери, FAQ) | мок `src/data/galeon-500-fly.sections.js` → `normalizeModelContent` |
| Dev-інструменти (Tune effects, `?fixture=padded`) | вимкнені; відкрити — `?dev` в адресі (або `__YW_CONFIG__.devTools: true`). Без них ефекти беруть затверджені значення з `src/config/fx-tuned.js` |
| Мок моделі: характеристики, тексти tooltip, джерела, reference-профілі | `src/data/galeon-500-fly.js` |
| Оголошення (знімок 12 реальних з yachtway.com) | `src/data/listings.mock.js`, медіа в `assets/listings/` |
| Фільтри (модель, URL, шкала слайдерів), сортування, формат ціни й щомісячного платежу | `src/lib/listings-query.js`, `src/lib/listing-format.js` |
| Панель фільтрів і слайдер діапазону | `src/components/listings/filters-drawer.js`, `range-filter.js` |
| Стиль карток (overlay / classic), показ quick filters | Tune effects → «Listings (view state)» |
| Меню розділів: scrollspy, sticky, передача місця від хедера | `src/components/section-nav.js` |
| Sticky-панель: m/ft · якорі · Save/Share (один ряд, прилипає разом) | `index.html` (`[data-section-bar]`), `src/components/section-nav.js`, `model-actions.js` |
| Одиниці: обидві системи в одній клітинці (`.u-dual`), без зсуву layout | `src/lib/units.js`, перемикання — `html[data-units]` |
| Fog під хедером | `.top-fog` у `styles/hero.css` |
| Розділи Generations / Specifications / Reviews / Models (карусель) / Dealers / FAQ | `src/components/model-sections.js`, дані — `src/data/galeon-500-fly.sections.js` |
| CTA «Notify me» (підписка на нові оголошення, стиль hero); ручки для майбутніх налаштувань — custom properties на `.alerts` | `src/components/alerts-cta.js`, `src/api/alerts.js`, стилі — `styles/sections.css` |
| «See all» у For sale (посилання на каталог) | `catalogUrl` у `src/main.js` → `src/components/listings/listings-section.js` |
| Футер: вміст футера yachtway.com + якорі моделі, перехід у синій action-колір | `index.html` (`<footer class="site-footer">`), стилі — кінець `styles/sections.css`; бейджі, лого й соцмережі — `assets/footer/` |
| Відблиски води у футері (той самий caustics-шейдер, що на яхті) | `src/fx/footer-glints-layer.js`, спільний GLSL — `src/fx/caustics-glsl.js`; налаштування — Tune effects → «Footer · water glints» |
| Специфікації: креслення (бік + верх в одному масштабі) і таби груп | `renderSpecs` у `src/components/model-sections.js` |
| Waylo, AI-асистент поруч з FAQ | `src/components/waylo.js`, аватар — `assets/ai/waylo.webp` |
| Сортування (меню з іконками) і швидкі фільтри локацій | `src/components/listings/sort-menu.js`, `quick-locations.js`, `popover.js` |
| Контракт даних | `src/types.d.ts` |
| Asset, `waterlineY`, `visibleBounds`, `causticBandHeight`, `water.widthScale/offsetX`, `hullMaskSrc` | `galeon500Fly.side` у `src/data/galeon-500-fly.js` |
| Заводські дефолти та межі всіх FX, preset «Calm loop», параметри Figma-інстансу | `src/config/fx-defaults.js` |
| Збережений тюнінг (перекриває заводські дефолти) | `src/config/fx-tuned.js` — пише кнопка «Save as defaults» |
| Назви видів (Side view / Cutaway / Gallery) | `VIEW_LABELS` у `src/main.js` |
| Cutaway: палуби, палуба за замовчуванням, 360° тур, hotspots | `cutaway` у `src/data/galeon-500-fly.js`; `src/components/cutaway-view.js`, `tour-dialog.js` |
| Галерея (сітка на колонках карток, dock-hover) і переглядач фото | `src/components/gallery-view.js`, `photo-viewer.js`; фото — `gallery` у `src/data/galeon-500-fly.js` |
| Затверджені дефолти ефектів | `src/config/fx-tuned.js` |
| Водний фон Cutaway (shader) | `src/fx/water-background-layer.js`, налаштування — «Cutaway · water background» |
| Рябь на заголовку в Cutaway (SVG-фільтр) | `src/fx/title-ripple.js`, налаштування — «Cutaway · title ripple» |
| Розмір планів, тінь під ними | `.cutaway` у `styles/hero.css`, налаштування — «Cutaway · deck plans» |
| Вимоги до планів палуб з адмінки | `docs/BACKEND.md` → «Cutaway: плани палуб» |
| Паралакс: швидкості шарів і частка pull для кожного шару | `PARALLAX_RATES`, `PULL_FACTORS` у `src/components/parallax.js` |
| Еластичне потягування вгорі: хуки `hero:pull-armed`, `hero:pull-release`, атрибут `html[data-pull="armed"]` | `src/components/overscroll-pull.js`, налаштування в групі «Pull at top» |

## Шари сцени (знизу догори)

1. фон, `hero__underlight` (радіальний градієнт із вузла 48:1399, під заголовком), H1;
2. `fx--reflection` — WebGL2: дзеркало поточного PNG відносно ватерлінії, згасання, blur, хвильова дисторсія;
3. `scene__yacht` — оригінальний PNG (`<img alt>`);
4. `fx--caustics` — WebGL2, порт шейдера Figma, маска `sourceAlpha × lowerHullBand (× hullMask)`, `mix-blend-mode: soft-light`;
5. `fx--water` — WebGL2: тонка кромка + вуаль на 3 px над корпусом + слабкі брижі;
6. перемикач видів і дані.

Усі шари рахуються з однієї геометрії (`src/fx/scene-geometry.js`), тому інший PNG з іншими полями/пропорціями вимагає лише нових метаданих.

## Шейдер Water reflection

Оригінал (id `9518f0c3…`, версія `2676e8e2…`) — `reference/water-reflection.2676e8e2.main.ts`, без змін. Порт у `src/fx/hull-caustics-layer.js`: `causticGap`, `causticLight`, `illumination` і вихід `reflectionOnly` перенесено з WGSL у GLSL ES 3.00 рядок у рядок. Час — як у Figma-host: секунди `mod loopDuration` перед передачею у float. Розмір брижів у CSS px, як `width / renderScale`. Figma shader runtime не використано: йому потрібні WebGPU та експериментальний HTML-in-Canvas.

## Debug

Кнопка **Tune effects** (праворуч унизу; з’являється лише з `?dev` в адресі, напр. `http://127.0.0.1:4317/?dev`) відкриває панель з усіма параметрами, Pause, Reset, preset, статусом рендерера та джерелами даних. Поточні значення живуть у localStorage (переживають reload). Помаранчева крапка позначає параметр, який відрізняється від дефолту. **Save as defaults** через `npm start` записує різницю від заводських значень у `src/config/fx-tuned.js`, після чого Reset повертає до них. **Copy settings** копіює ту саму різницю як JSON, щоб передати її розробнику. Для перевірки маски увімкніть `Debug → Hide yacht PNG` + `Contrast backdrop` і `Blend: normal`. `?fixture=padded` завантажує той самий PNG з іншими прозорими полями та пропорціями (тільки технічна перевірка).

## Обмеження

- Без WebGL2 (або після втрати контексту) показується статичний CSS-fallback: перевернутий PNG з маскою згасання; caustics і хвиль немає.
- Анімація ставиться на паузу поза екраном, у прихованій вкладці, на Cutaway/Gallery і при `prefers-reduced-motion` (там рендериться один статичний кадр, паралакс вимкнено).
- DPR effect-canvas обмежено до 2 (1.25 на слабких пристроях).

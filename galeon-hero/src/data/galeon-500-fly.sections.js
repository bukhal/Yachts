// MOCK of the content behind the sections under the hero (Generations,
// Specifications, Reviews, Models, Dealers, FAQ). Researched 2026-10-19; sources
// listed per block. Metric values; lengths/volumes/masses convert in the UI.
// Loaded lazily by src/api/model-content.js only while no API is configured.
// TODO(backend): GET /api/models/{id}/content (see docs/BACKEND.md).

// Raw API shape; src/api/model-content.js normalizes it into ModelContent (src/types.d.ts).
export const galeon500FlyContent = {
  generations: [
    {
      id: "gen1",
      label: "Gen 1",
      title: "Original 500 Fly",
      years: [2015, 2023],
      // Side renders (transparent, trimmed to the hull) supplied with Figma 55:2811.
      image: "./assets/generations/gen1.webp",
      points: [
        "Debuted at the Cannes Yachting Festival in 2015; European Powerboat of the Year 2016",
        "Introduced Beach Mode fold-down balconies and the rotating cockpit bench",
        "Volvo Penta D8 and D11 on shafts, IPS on the options list",
      ],
      sources: ["https://www.mby.com/news/galeon-500-fly-cannes-debut-48382", "https://www.yachtbuyer.com/en/reviews/galeon-500-fly-2015"],
    },
    {
      id: "gen2",
      label: "Gen 2",
      title: "Redesigned 500 Fly",
      years: [2024, 2026],
      image: "./assets/generations/gen2.webp",
      points: [
        "Redesigned for the 2024 season with new hull windows and a teak swim platform",
        "Three aft layouts: tender garage, L-sofa with crew cabin, or Roto-Seat",
        "Updated helm; Beach Mode still widens the cockpit to {m:6.00}",
      ],
      sources: ["https://boattest.com/boats/galeon/500-fly-2024", "https://www.youtube.com/watch?v=jboANINUtXs"],
    },
  ],
  successor: {
    id: "successor",
    label: "Successor",
    title: "Galeon 520 Fly",
    years: [2026, null],
    image: "./assets/generations/successor-520.webp",
    points: [
      "Launched in 2026 as the successor to the 500 Fly",
      "{m:17.20} overall: longer and a little wider",
      "Keeps the drop-down sides and sliding salon doors; every deck re-laid",
    ],
    sources: ["https://yachtstyle.co/galeon-debuts-520-fly/", "https://www.galeon.yachts/yachts/520-fly"],
  },
  // Specifications drawings (Figma 55:2819). The underwater hull sits under the
  // side render (top = waterline); left / width are shares of the render width.
  drawings: {
    // Dimensions drawn to scale on the side / top views (metres).
    dimensions: { loa: 16.2, draft: 1.4, beam: 4.46, beachMode: 6.0 },
    underwater: { src: "./assets/specs/galeon-500-fly-underwater.webp", left: 4 / 459, width: 448 / 459, aspect: 896 / 84 },
  },
  specGroups: [
    {
      id: "dimensions",
      title: "Dimensions",
      icon: "ruler",
      rows: [
        { label: "Length overall", value: 16.2, quantity: "length" },
        { label: "Hull length", value: 14.44, quantity: "length" },
        { label: "Beam overall", value: 4.46, quantity: "length" },
        { label: "Beam, Beach Mode", value: 6.0, quantity: "length", note: "Both side platforms lowered" },
        { label: "Draft, max", value: 1.4, quantity: "length", note: "Incl. running gear, D11-670 shafts" },
        { label: "Draft, canoe body", value: 1.0, quantity: "length" },
        { label: "Height incl. mast light", value: 6.9, quantity: "length" },
      ],
    },
    {
      id: "capacities",
      title: "Weights & tanks",
      icon: "drop",
      rows: [
        { label: "Light craft mass", value: 22250, quantity: "mass" },
        { label: "Maximum load", value: 4270, quantity: "mass" },
        { label: "Fuel", value: 1800, quantity: "volume", note: "2 × 900 L tanks" },
        { label: "Fresh water", value: 650, quantity: "volume" },
        { label: "Black water", value: 240, quantity: "volume" },
      ],
    },
    {
      id: "performance",
      title: "Engines & performance",
      icon: "gauge",
      rows: [
        { label: "Power range", value: "2×550 – 2×725 hp" },
        { label: "Engines", value: "Volvo Penta D8 / D11, shafts or IPS" },
        { label: "Top speed", value: "30 kn", note: "Builder estimate, 2 × D11-670" },
        { label: "Cruise", value: "25 kn", note: "Builder estimate, 2 × D11-670" },
        { label: "On test", value: "32 kn", note: "Motor Boat & Yachting, 2 × D11-725" },
      ],
    },
    {
      id: "accommodation",
      title: "Accommodation",
      icon: "bed",
      rows: [
        { label: "Cabins", value: "3", note: "Master, VIP, twin" },
        { label: "Berths", value: "6" },
        { label: "Bathrooms", value: "2", note: "Plus crew head with the crew-cabin layout" },
        { label: "Crew", value: "1, optional" },
        { label: "Persons on board", value: "12", note: "CE category B" },
      ],
    },
    {
      id: "build",
      title: "Design & build",
      icon: "compass",
      rows: [
        { label: "Builder", value: "Galeon · Poland" },
        { label: "Naval architecture", value: "Tony Castro Yacht Design" },
        { label: "Interior", value: "Galeon" },
        { label: "Hull", value: "GRP" },
        { label: "Award", value: "European Powerboat of the Year 2016" },
      ],
    },
  ],

  videos: [
    {
      id: "xRQhxOupP8U",
      title: "Galeon 500 Fly Yacht Test Drive & Full Review",
      channel: "YachtBuyer",
      duration: "16:47",
      year: 2022,
      thumb: "./assets/videos/xRQhxOupP8U.jpg",
      summary: "Sea trial, handling and a full tour, including the drop-down balconies and the rotating dinette.",
    },
    {
      id: "Q3OGzKeNTTk",
      title: "Is this the best cockpit in the class?",
      channel: "Motor Boat & Yachting",
      duration: "20:46",
      year: 2022,
      thumb: "./assets/videos/Q3OGzKeNTTk.jpg",
      summary: "Test in the Solent with twin 725 hp D11s — 32 knots on test.",
    },
    {
      id: "wfd6sPtL1pA",
      title: "In-Depth Tour & Performance Test",
      channel: "BoatTEST.com",
      duration: "8:26",
      year: 2024,
      thumb: "./assets/videos/wfd6sPtL1pA.jpg",
      summary: "The 2024 edition with D11-725s: best cruise at 2,000 rpm and about 214 nm range.",
    },
    {
      id: "P3VGSGAEmF4",
      title: "Features Review (2024)",
      channel: "BoatTEST.com",
      duration: "11:12",
      year: 2024,
      thumb: "./assets/videos/P3VGSGAEmF4.jpg",
      summary: "The 2024 edition's features: swiveling aft lounge, fold-out balconies and the side-deck bar.",
    },
    {
      id: "lbfoNkqGimk",
      title: "Galeon 500 FLY 2024 Edition",
      channel: "Galeon Yachts",
      duration: "2:00",
      year: 2024,
      thumb: "./assets/videos/lbfoNkqGimk.jpg",
      summary: "The builder's film of the redesign: three aft layouts and the 6 m Beach Mode cockpit.",
    },
  ],
  quotes: [
    {
      text: "The transforming cockpit is far more than some boat show gimmick or quayside theatre, it genuinely improves life onboard",
      author: "Jack Haines",
      publication: "YachtBuyer",
      url: "https://www.yachtbuyer.com/en/reviews/galeon-500-fly-2015",
    },
    {
      text: "Components are expensive, the interior woodwork is excellent and there is a general feeling of solidity that surpasses many of its mass-produced rivals.",
      author: "Jack Haines",
      publication: "YachtBuyer",
      url: "https://www.yachtbuyer.com/en/reviews/galeon-500-fly-2015",
    },
    {
      text: "This properly thought out cruising yacht possesses many of those attributes often found on larger vessels",
      author: "Capt. Ken Kreisler",
      publication: "BoatTEST, 2024",
      url: "https://boattest.com/boats/galeon/500-fly-2024",
    },
  ],

  // Comparable Galeon models with live counts from the yachtway.com catalog (2026-10-19).
  models: [
    { id: "440-fly", name: "Galeon 440 Fly", lengthM: 13.96, image: "./assets/models/440-fly.jpg", text: "One size down, the same flybridge concept.", forSale: 1, fromUsd: null },
    { id: "470-skydeck", name: "Galeon 470 Skydeck", lengthM: 14.36, image: "./assets/models/470-skydeck.jpg", text: "A smaller Skydeck: upper lounge without an open flybridge.", forSale: 1, fromUsd: 1050000 },
    { id: "510-skydeck", name: "Galeon 510 Skydeck", lengthM: 16.2, image: "./assets/models/510-skydeck.jpg", text: "Same length, with a Skydeck instead of an open flybridge.", forSale: 1, fromUsd: 990000 },
    { id: "520-fly", name: "Galeon 520 Fly", lengthM: 17.2, image: "./assets/models/520-fly.jpg", text: "The successor: longer, wider, every deck re-laid.", forSale: 1, fromUsd: 2516122 },
    { id: "550-fly", name: "Galeon 550 Fly", lengthM: 17.71, image: "./assets/models/550-fly.jpg", text: "A size up, from the earlier Fly generation.", forSale: 2, fromUsd: 674900 },
    { id: "560-fly", name: "Galeon 560 Fly", lengthM: 17.83, image: "./assets/models/560-fly.jpg", text: "One size up, more room for longer cruising.", forSale: 5, fromUsd: 2249500 },
    { id: "640-fly", name: "Galeon 640 Fly", lengthM: 20.21, image: "./assets/models/640-fly.jpg", text: "The next step up in the Fly range.", forSale: 7, fromUsd: 1440000 },
  ],
  modelsUrl: "https://yachtway.com/brands/galeon-yachts-for-sale/",
  modelsKind: "flybridge and Skydeck", // "7 flybridge and Skydeck models from …"

  // Authorized dealers from YachtWay (api.yachtway.com/api/profiles/brand/v2/galeon-yachts/dealers).
  dealers: [
    { name: "MarineMax", area: "United States", location: "Clearwater, FL · 16 offices", logo: "./assets/dealers/marinemax.png", web: "https://www.marinemax.com", profile: "https://yachtway.com/dealers/marinemax/" },
    { name: "Ocean World Group", area: "Middle East", location: "Dubai, UAE", logo: "./assets/dealers/ocean-world-group.png", web: "https://oceanworldyachts.com/", profile: "https://yachtway.com/dealers/ocean-world-group/" },
    { name: "Mare Nostrum Yachts", area: "Spain", location: "Port Balís, Barcelona", logo: "./assets/dealers/mare-nostrum-yachts.png", web: "https://www.mnyachts.com", profile: "https://yachtway.com/dealers/mare-nostrum-yachts/" },
    { name: "Don Marino Boats", area: "Spain", location: "Estepona", logo: "./assets/dealers/don-marino-boats.png", web: "https://www.donmarinoboats.es", profile: "https://yachtway.com/dealers/don-marino-boats/" },
    { name: "Shepherds Boat Sales", area: "United Kingdom", location: "Bowness-on-Windermere", logo: "./assets/dealers/shepherds-boat-sales.jpg", web: "https://www.shepherdsboatsales.co.uk", profile: "https://yachtway.com/dealers/shepherds-boat-sales/" },
    { name: "Aventura Boats", area: "Central Europe", location: "Bratislava, Slovakia", logo: "./assets/dealers/aventura-boats.png", web: "https://www.aventuraboats.eu/", profile: "https://yachtway.com/dealers/aventura-boats/" },
    { name: "Camino al Mare", area: "Mexico", location: "Cancún", logo: "./assets/dealers/camino-al-mare.png", web: "https://caminoalmare.com/es/", profile: "https://yachtway.com/dealers/camino-al-mare/" },
  ],

  // FAQ (also Waylo's answers). {model} = model name; {m:…} = length token.
  // { auto: "price" | "count" | "generation" } entries are built from live listings.
  faq: [
    { auto: "price" },
    { auto: "count" },
    { q: "How long is the {model}?", a: "{m:16.20} overall, on a {m:14.44} hull. The beam is {m:4.46}, or {m:6.00} in Beach Mode.", keywords: ["long", "length", "size", "beam", "wide", "width", "big"] },
    { q: "How fast is the {model}?", a: "About 30 knots flat out and 25 knots cruising with twin Volvo Penta D11-670 (builder estimate). Motor Boat & Yachting reached 32 knots with the D11-725 option.", keywords: ["fast", "speed", "knots", "cruise"] },
    { q: "What is Beach Mode?", a: "Both sides of the cockpit fold down into balconies, widening the aft deck to {m:6.00} — one of the features that won the 500 Fly European Powerboat of the Year 2016.", keywords: ["beach", "balcon", "fold", "cockpit"] },
    { q: "How many cabins does it have?", a: "Three cabins with six berths: a full-beam master en suite, a VIP forward and a twin, with two bathrooms. One aft layout adds a crew cabin with its own head.", keywords: ["cabin", "sleep", "berth", "bed", "crew", "bathroom", "head"] },
    // Facts below come from the specification groups above (builder data, verified 2026-10-19).
    { q: "What engines does the {model} have?", a: "Twin Volvo Penta D8 or D11 diesels, from 2×550 to 2×725 hp, on shafts or with IPS pod drives. The builder's speed figures (30 knots top, 25 knots cruise) are for twin D11-670.", keywords: ["engine", "volvo", "power", "horsepower", "hp", "ips", "shaft"] },
    { q: "What is the draft of the {model}?", a: "{m:1.40} at most, including the running gear on twin D11-670 shafts. The hull itself draws {m:1.00}.", keywords: ["draft", "depth", "deep", "shallow"] },
    { q: "How much fuel and water does it carry?", a: "{L:1800} of fuel in two equal tanks, {L:650} of fresh water and a {L:240} black-water tank.", keywords: ["fuel", "tank", "water", "diesel"] },
    { q: "Who designs and builds the {model}?", a: "Galeon builds it in-house at its two yards on the Gulf of Gdańsk in Poland, Straszyn and Wiślinka. The naval architecture is by Tony Castro Yacht Design; the interior is Galeon's own.", keywords: ["design", "architect", "castro", "built", "build", "made", "poland", "yard", "shipyard"] },
    { q: "How many people can the {model} carry?", a: "Up to 12 people on board under its CE category B rating, with berths for six in three cabins. One aft layout adds a crew cabin.", keywords: ["people", "person", "guests", "passengers", "category", "capacity", "how many can"] },
    { auto: "generation", q: "Which generation is a 2023 or 2024 {model}?", keywords: ["generation", "edition", "redesign", "2023", "2024", "difference"] },
    { q: "What replaced the {model}?", a: "The Galeon 520 Fly, a longer and wider successor launched in 2026.", keywords: ["replace", "successor", "520", "new model"] },
  ],
};

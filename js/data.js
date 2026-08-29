/* ============================================================================
   data.js  —  ALL SITE CONTENT LIVES HERE
   ----------------------------------------------------------------------------
   Every heading, job, bullet, project and skill is read from this file.
   Edit a value, save, refresh. Nothing else needs touching.

   NOTE: this file is also read at DEPLOY TIME by tools/prerender.mjs, which
   bakes the content into static HTML so crawlers, LinkedIn, and recruiter
   sourcing tools can actually read it. After editing, run:

       node tools/prerender.mjs

   ...or just push — the deploy pipeline runs it for you.
   ========================================================================== */

export const DATA = {

  /* ---- 1. IDENTITY -------------------------------------------------- */
  identity: {
    name:      'Prasad Hegde',
    // Mixed case on purpose: CSS uppercases these for display, so text
    // extractors and screen readers still get "Prasad Hegde".
    firstName: 'Prasad',
    lastName:  'Hegde',
    title:     'Software Engineer',
    /* ------------------------------------------------------------------
       TAGLINE — swap in whichever of these you prefer, they are all one
       line and all fit the hero. Ordered from driest to cheekiest.

       A (active)  The house always wins. I make sure it does it at 60 fps.
                   ↳ dry, memorable, and still says what you do
       B           Unity clients and .NET servers for live casino floors.
                   Six titles, 100+ terminals, three continents.
                   ↳ zero personality, maximum credibility
       C           I build the games casinos actually put on the floor —
                   Unity front to .NET back.
       D           Professional gambler. Technically. I write the games
                   instead of losing money at them.
                   ↳ funniest, but it is the only line that says nothing
                     concrete about your work

       Keep it under about 160 characters or it wraps three deep on mobile.
       ------------------------------------------------------------------ */
    tagline:   'I build the games casinos actually put on the floor — Unity front end to .NET back end. The house always wins; I make sure it does it at 60 fps.',
    /* Short version used for social cards and the meta description. Keep it
       under ~160 chars or Google truncates it. Leads with the current stack,
       because that is what a recruiter searches for. */
    metaBlurb: 'Software Engineer at Light & Wonder (NYSE: LNW). Unity, C# and .NET. 6+ casino ETG titles live on 100+ terminals across international markets.',
    location:  'Bengaluru, Karnataka, India',
    email:     'prasadhegde2001@gmail.com',

    /* --------------------------------------------------------------------
       siteUrl — the CANONICAL public address of this site.
       This drives canonical tags, sitemap.xml, JSON-LD and social cards.
       Social scrapers (LinkedIn, Slack, WhatsApp) require absolute URLs and
       do NOT run JavaScript, so this value must be correct at build time.

       Set it to whichever you actually use, WITHOUT a trailing slash:
         Cloudflare Pages default : https://<project>.pages.dev
         Custom domain            : https://prasadhegde.dev
       -------------------------------------------------------------------- */
    siteUrl:   'https://prasad-hegde-gamesdev-pro.pages.dev',

    /* Availability pill in the hero. Intentionally EMPTY — no "open to roles"
       messaging anywhere on the site. Put a short factual line here if you ever
       want the pill back (it renders as a small cyan chip under the tagline);
       leave it blank and the pill is not rendered at all. */
    availability: '',

    /* Social share card. Must be 1200x630 and under 5 MB (LinkedIn's limit).
       JPEG, not PNG: the artwork is a dark gradient render, which PNG stores
       terribly — the same image is 623 KB as PNG and 94 KB as JPEG with no
       visible difference. Update ogImageW/H if you change the dimensions;
       LinkedIn sometimes renders a small card when they are absent. */
    ogImage:  'assets/og-image.jpg',
    ogImageW: 1200,
    ogImageH: 630,
  },

  /* ---- 2. LINKS ------------------------------------------------------
     `check: true` marks links whose target may not exist yet. The runtime
     does a HEAD request and hides the link rather than shipping a 404.

     ⚠️  VERIFY THE GITHUB AND LINKEDIN HANDLES BELOW. They were inferred
         from your name. A 404 on your own profile is an unforced error.     */
  links: [
    // Confirmed against the git remote (github.com/prasad1231/portfolio).
    { label: 'GitHub',   icon: 'github',   url: 'https://github.com/prasad1231' },

    // Confirmed custom vanity URL.
    { label: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/in/prasadhegde-dev/' },
    { label: 'Email',    icon: 'mail',     url: 'mailto:prasadhegde2001@gmail.com' },
    // resume.html is generated by the prerender step and ALWAYS exists, so
    // this link can never 404. It offers a PDF download when one is present.
    { label: 'Resume',   icon: 'doc',      url: 'resume.html' },
  ],

  /* ---- 2b. RESUME ----------------------------------------------------
     Drop a PDF at assets/resume.pdf and the resume page offers it as a
     download. Until then the page still works and prints cleanly, so the
     Resume link is never broken.

     ATS reality check: the ATS parses the PDF, never the website. Export
     single-column, selectable text (not an image), standard headings.       */
  resume: {
    pdf:      'assets/resume.pdf',
    fileName: 'Prasad-Hegde-Software-Engineer.pdf',
  },

  /* ---- 3. THE INSTRUMENT CLUSTER -------------------------------------
     Digital TFT dash, tuned to S1000XR numbers.                        */
  gauge: {
    maxRpm:   14,     // tach bar tops out here (x1000)
    redline:  12,     // segments at/after this turn red
    maxSpeed: 299,    // digital speed readout ceiling
    unit:     'km/h',
  },

  /* ---- 4. ABOUT ------------------------------------------------------ */
  about: {
    heading: 'Rider Profile',
    body: [
      'Software Engineer with 3+ years of full-stack production experience at Light & Wonder — one of the world\'s largest gaming technology companies (NYSE: LNW). Recognised for end-to-end ownership of complex features, including the first video-integrated Tournament Display system on the platform.',
      'Progressed from intern to Senior Associate Software Engineer in under two years. Shipped 6+ ETG titles running on 100+ terminals across international casino markets. Proficient across platform C/C++, backend .NET/C#/WPF, Unity game clients, and full-stack web tooling.',
    ],
    stats: [
      { value: '3+',   label: 'Years Experience' },
      { value: '6+',   label: 'ETG Titles Shipped' },
      { value: '100+', label: 'Casino Terminals' },
    ],
  },

  /* ---- 5. CORE COMPETENCIES ------------------------------------------ */
  competencies: [
    'Feature Ownership', 'Client-Server Architecture', 'Unity Client Development',
    'Backend Engineering', 'Performance Profiling', 'Debugging & Root Cause Analysis',
    'Rapid Prototyping', 'Cross-Functional Collaboration', 'Internal Tooling',
    'Agile Delivery', 'AI-Assisted Development', 'International Market Delivery',
  ],

  /* ---- 6. EXPERIENCE -------------------------------------------------- */
  experience: [
    {
      role:    'Senior Associate Software Engineer',
      company: 'Light & Wonder',
      period:  'Mar 2025 — Present',
      // Machine-readable dates for JSON-LD / resume parsers. YYYY-MM.
      from:    '2025-03',
      to:      '',              // '' means present
      location:'Bengaluru, India',
      points: [
        'Sole owner of the Tournament Display feature — the first video-integrated, server-driven display capability on the platform, built as an overlay layer over the existing per-game architecture.',
        'Built cross-game tournament support: client-server communication for tournament state, a live server-authoritative leaderboard, and a new animation layer for entry, standings and results — one implementation serving every title on the platform.',
        'Enabled casino operators to upload custom images and configure live video playback during tournaments, turning the tournament screen into a marketing surface they control.',
        'Primary engineering contact for Tournament systems and Ultimate Texas Hold\'em across 5+ stakeholder groups spanning development, QA, art, and global teams in India, Australia, and the US.',
        'Partnered with QA on regression coverage and issue triage; drove production defects to root cause with backend teams.',
        'Ran performance profiling and log-based debugging to clear production bottlenecks, and established a more systematic defect-resolution process across the team.',
        'Contributed to titles deployed on 100+ casino terminals across new international markets.',
        'Led AI-assisted ideation sessions in the studio, cutting concept-to-prototype time and removing multi-week alignment cycles.',
      ],
      stack: ['C#', '.NET', 'Unity', 'WPF', 'C++'],
    },
    {
      role:    'Associate Software Engineer',
      company: 'Light & Wonder',
      period:  'Jul 2023 — Mar 2025',
      from:    '2023-07',
      to:      '2025-03',
      location:'Bengaluru, India',
      points: [
        'Started on platform engineering, contributing to OS-level components in C/C++ and building low-level systems fundamentals before moving into ETG game development.',
        'Moved into ETG server-side engineering with .NET, C# and WPF — game logic, state management, and backend communication layers for live casino products.',
        'Self-taught Unity in production and delivered Ultimate Texas Hold\'em as a full production-quality Unity client in a single project cycle, from zero prior Unity experience.',
        'Delivered 6+ ETG titles on schedule across Unity client, server and backend: Ultimate Texas Hold\'em, Roulette & Variants, Roulette POD, Craps, Baccarat & Variants, Sic Bo and SBJ Tournament — including titles shipped into new international markets.',
        'Investigated Unity Addressables, asset management and optimisation strategies; cleared bottlenecks through profiling and log analysis with QA and server teams.',
        'Initiated and built several titles and features from scratch with minimal supervision.',
      ],
      stack: ['C', 'C++', 'C#', '.NET', 'Unity', 'Addressables'],
    },
    {
      role:    'Software Engineering Intern',
      company: 'Light & Wonder',
      period:  'Feb 2023 — Jun 2023',
      from:    '2023-02',
      to:      '2023-06',
      location:'Bengaluru, India',
      points: [
        'Built automated test suites with the Robot Framework, ramping up through structured knowledge-transfer sessions.',
        'Converted to a full-time Associate Software Engineer role within five months on technical contribution and team impact.',
      ],
      stack: ['Python', 'Robot Framework'],
    },
  ],

  /* ---- 7. SELECTED WORK ------------------------------------------------
     `id`      → gets its own static page at  /work/<id>/
     `media`   → gallery items on that page.
                 type: 'image' | 'video' | 'youtube'
                 Put files in assets/work/ and point src at them.
                 Leave media: [] and the Gallery block is omitted entirely
                 (no placeholder is shown to visitors).                    */
  projects: [
    {
      id:   'tournament-display',
      name: 'Tournament Display',
      sub:  'First video-integrated tournament system on the platform',
      blurb:'Sole owner of the Tournament Display feature — a new display overlay layer built on top of the existing per-game architecture, and the first video-integrated, server-driven capability on the platform. Casino operators can upload custom images and configure live video playback during tournaments.',
      stack:['C#', '.NET', 'Unity', 'WPF'],
      metric:{ value: '1st', label: 'of its kind on platform' },
      featured: true,
      detail: {
        role:     'Sole Owner — Design, Implementation, Delivery',
        timeline: 'Mar 2025 — Present',
        company:  'Light & Wonder',
        summary: [
          'The platform had a per-game display architecture with no shared overlay layer and no video capability. Tournaments needed a configurable visual surface that could run across different games without each title reimplementing it.',
          'I designed and shipped a new overlay layer that sits on top of the existing per-game architecture — the first video-integrated, server-driven display capability on the platform. Operators can upload custom images and configure live video playback during a tournament, turning the tournament screen into a marketing surface they control.',
          'I owned this end to end: architecture, implementation, QA coordination, and delivery. I am also the primary engineering contact for Tournament systems across 5+ stakeholder groups spanning development, QA, art, and global teams in India, Australia, and the US.',
        ],
        highlights: [
          'First video-integrated, server-driven display capability on the platform',
          'Operator-configurable images and live video playback during tournaments',
          'Built as an overlay layer — no per-game reimplementation needed',
          'Primary engineering contact across 5+ stakeholder groups on three continents',
          'Shipped into titles running on 100+ casino terminals',
        ],
      },
      media: [
        /* Add your screenshots / video here. Examples:
           { type:'image',   src:'assets/work/tournament-01.jpg', caption:'Overlay in play' },
           { type:'video',   src:'assets/work/tournament-demo.mp4', caption:'Live video playback' },
           { type:'youtube', id:'VIDEO_ID', caption:'Walkthrough' },
           An architecture diagram you drew counts and carries no NDA risk. */
      ],
    },
    {
      /* ⚠️  FILL IN THE NUMBERS MARKED [?] BELOW.
         This entry is written from what you described — cross-game tournament
         support, server communication, new animations, leaderboards. The shape
         is right but the specifics are yours: how many games it went into, how
         many players a leaderboard holds, tick rate, whatever you can say
         without breaching NDA. A case study with one real number beats three
         paragraphs of adjectives. */
      id:   'tournament-system',
      name: 'Cross-Game Tournament System',
      sub:  'Server-driven tournaments, live leaderboards, every game on the platform',
      blurb:'Built tournament support across the full game lineup — server communication for tournament state, a live leaderboard, and a new animation layer for entry, standings and results. One implementation serving every title rather than a per-game rebuild.',
      stack:['C#', '.NET', 'Unity', 'Client-Server'],
      metric:{ value: 'All games', label: 'single implementation' },
      featured: true,
      detail: {
        role:     'Feature Owner — Client, Server, Animation',
        timeline: 'Light & Wonder',
        company:  'Light & Wonder',
        summary: [
          'Tournaments needed to work across the entire game lineup, not one title at a time. That meant a shared contract between the games and the server: tournament lifecycle, player standings, and results all had to arrive as state the client could render, no matter which game was running.',
          'I built the client-server communication for tournament state and the presentation layer on top of it — a live leaderboard that updates as play happens, plus a new animation set for tournament entry, standing changes and final results. The interesting problem was making standings feel responsive without letting the client invent state it had not been told about: the server stays authoritative, the animations interpolate.',
          'Because it was built once against a shared contract rather than per title, every game on the platform picked up tournament support without reimplementing it. This is the sibling of the Tournament Display work — that one owns the operator-facing visual surface, this one owns the tournament mechanics and player-facing presentation.',
        ],
        highlights: [
          'Tournament support across the full game lineup from one implementation',
          'Client-server protocol for tournament lifecycle and player state',
          'Live leaderboard updating during play, server-authoritative',
          'New animation layer for entry, standing changes and results',
          'Shared contract, so new titles inherit tournaments for free',
        ],
      },
      media: [],
    },
    {
      id:   'prototyping-portal',
      name: 'Game Ideas & Prototyping Portal',
      sub:  'Browser-based game concept platform',
      blurb:'A web platform enabling developers, artists, and business stakeholders to submit, review, and evaluate game concepts — hosting 10 titles via Unity WebGL and eliminating physical hardware dependency for client demos.',
      stack:['Unity WebGL', 'Python', 'Three.js'],
      metric:{ value: '2 mo → 2 wk', label: 'concept validation' },
      featured: true,
      detail: {
        role:     'Builder — Full Stack',
        timeline: 'Light & Wonder — Engineering Initiative',
        company:  'Light & Wonder',
        summary: [
          'Demoing a game concept meant booking physical cabinet hardware. That gated who could evaluate an idea and stretched concept validation to roughly two months.',
          'I built a browser-based portal that hosts playable builds via Unity WebGL — 10 titles live — so developers, artists, and business stakeholders can submit, review, and evaluate concepts from a link. No hardware, no scheduling.',
          'Concept validation dropped from about two months to two weeks, and idea submission opened up well beyond the core development team.',
        ],
        highlights: [
          '10 playable titles hosted via Unity WebGL',
          'Removed physical cabinet dependency for client demos',
          'Validation cycle cut from ~2 months to ~2 weeks',
          'Opened concept submission to non-engineering stakeholders',
        ],
      },
      media: [],
    },
    {
      id:   'qr-feedback',
      name: 'QR-Based Player Feedback System',
      sub:  'Structured feedback pipeline for ETG cabinets',
      blurb:'A QR-triggered feedback workflow embedded in ETG cabinets and demo setups — replacing informal verbal feedback with structured, auditable, compliance-ready player data, plus an admin panel with automated Confluence sync.',
      stack:['Node.js', 'React', 'Unity'],
      metric:{ value: 'Audit-ready', label: 'compliance data' },
      detail: {
        role:     'Builder — Full Stack',
        timeline: 'Light & Wonder — Engineering Initiative',
        company:  'Light & Wonder',
        summary: [
          'Player feedback on cabinets was collected verbally and informally. It was inconsistent, unauditable, and effectively unusable for compliance review.',
          'I engineered a QR-triggered feedback workflow embedded directly in ETG cabinets and demo setups. A player scans and submits structured feedback, which lands in a pipeline as auditable records.',
          'I also built an admin panel with automated Confluence sync, so feedback records flow into regulatory compliance reviews and player sentiment analysis without manual re-entry.',
        ],
        highlights: [
          'QR-triggered capture embedded in cabinets and demo setups',
          'Structured, auditable records suitable for regulatory compliance review',
          'Admin panel with automated Confluence sync',
          'Feeds player sentiment analysis pipelines',
        ],
      },
      media: [],
    },
    {
      /* Your best-proven engineering work was previously invisible as work.
         This site IS a rendering project — present it as one. */
      id:   'instrument-cluster-portfolio',
      name: 'This Site — TFT Instrument Cluster',
      sub:  'Real-time WebGL, directed and tuned with AI in the loop',
      blurb:'The page you are reading is a real-time WebGL project: a segmented TFT rev bar painted to a canvas texture and mapped onto a 3D screen plane, an ambient layer of instanced chips and cards, drag-to-rotate vehicle models, and a bloom post-processing chain. Built in JavaScript and Three.js — a stack I do not work in daily — by directing an AI and applying the graphics and performance instincts the day job gave me.',
      stack:['Three.js', 'WebGL', 'ES Modules', 'AI-Assisted'],
      metric:{ value: '60 fps', label: 'with adaptive scaling' },
      featured: true,
      detail: {
        role:     'Designer & Director — Solo, AI-Assisted Build',
        timeline: 'Personal project',
        company:  'Personal',
        summary: [
          'I wanted the portfolio itself to be the work sample rather than a container for it. The brief I set: a BMW-style digital TFT instrument cluster that reacts to scroll, rendered live, that still loads fast and degrades cleanly on hardware that cannot run it.',
          'Worth being straight about how it was built, because it is the more interesting claim anyway. JavaScript and Three.js are not my daily stack — Unity, C# and .NET are. I designed this, specified it, and drove an AI through the implementation, then spent most of my time on the part that actually needed judgement: making it fast. Knowing that bloom is fill-rate bound, that a canvas-to-GPU texture upload does not need to run at 60 Hz, and that a full-screen post-processing pass should stop existing the moment it scrolls out of view — that transfers directly from shipping Unity clients onto casino hardware.',
          'The cluster is a 2D canvas painted every frame — segmented LED tach, digital speed readout, gear indicator, shift light — uploaded as a texture onto a 3D screen plane inside an extruded bezel, then run through an UnrealBloom chain so it reads as backlit rather than printed. Device pixel ratio is capped at 1.5, the first 90 frames are sampled to detect a slow device and drop render scale once, the hero unmounts from the render loop via IntersectionObserver, and the TFT texture re-uploads at 30fps while the scene runs full-rate. There is a WebGL-absent fallback, a reduced-motion path and a background-tab pause.',
          'The content layer is deliberately boring by contrast: every word comes from a single data file, prerendered to static HTML at deploy time so crawlers and social scrapers see real content, then progressively enhanced in the browser. The 3D bundle is 1.3 MB and loads after first paint, so it never sits between a visitor and the text.',
        ],
        highlights: [
          'Segmented TFT tach painted to canvas, texture-mapped onto a 3D screen plane',
          'UnrealBloom post-processing chain with rev-reactive intensity',
          'Adaptive resolution: samples 90 frames, drops render scale on slow devices',
          'Hero unmounts from the render loop via IntersectionObserver when off-screen',
          'Instanced chip and card geometry, batched to keep draw calls flat',
          'Zero npm dependencies, zero runtime CDN calls, vendored Three.js',
          'Static prerender at deploy time — full content without JavaScript',
          'Designed and directed by me; implementation AI-assisted, performance tuning mine',
        ],
      },
      media: [],
    },
  ],

  /* ---- 8. GAMES --------------------------------------------------------
     status: 'live'     → renders the playable embed
             'building' → renders an honest in-development card
     Two ways to add a build:
       embed: 'assets/games/<folder>/index.html'   ← self-hosted export
       embed: 'https://itch.io/embed-upload/...'   ← itch.io hosted
     Set status:'live' + an embed and the card becomes playable.
     See DOCUMENTATION.md for exact Unity + Godot export settings.

     LOGOS — no configuration needed.
     Drop a file named `logo.png`, `logo.jpg`, `logo.gif`, `logo.webp` or
     `logo.svg` into the game's own folder (e.g. assets/games/unity-game/) and
     the build step finds it and displays it on the card. Animated GIFs work.
     Set `logo` explicitly below only if you want a different filename or a
     path outside the game folder.                                          */
  games: {
    heading: 'Arcade',
    intro:   'Builds that run right here in the browser — no plugins, no downloads. Unity WebGL and Godot both export to HTML5, so they embed straight into the page.',
    items: [
      {
        id:     'unity-game',
        // Real title taken from the export's productName.
        name:   'Joker\'s Wild Field',
        engine: 'Unity',
        status: 'live',
        /* TODO: rewrite this to describe the GAME — what the player does, and
           the one technical thing you are proudest of building. Right now it
           describes the delivery mechanism, which is the least interesting
           part and the same sentence any WebGL build could use. */
        blurb:  'A Unity build running natively in the browser — Brotli-compressed with ' +
                'Addressables-driven asset loading, no plugin or download required.',
        stack:  ['Unity', 'C#', 'WebGL', 'Addressables'],

        /* `folder` is where the build and the logo live.
           `embed` is the page that gets iframed — deliberately NOT the export's
           own index.html. Every Unity export writes a fresh index.html into the
           build folder, so anything hand-edited there is destroyed the next
           time you copy an export over it. The host page lives outside the
           build folder and survives. It also fixes Unity's hard-coded
           1920x1080 canvas, which gets clipped rather than scaled in an embed. */
        folder: 'assets/games/unity-game',
        embed:  'assets/games/host/unity-game.html',
        aspect: '16 / 9',
        controls: 'Mouse + keyboard',

        /* Click-to-load. This build is ~8 MB compressed; auto-loading it in an
           iframe would download all of it for every visitor who merely scrolls
           past, which is exactly the kind of thing that makes a portfolio feel
           slow. Set clickToLoad:false only for very small builds.
           `size` is displayed on the play button so the cost is honest. */
        clickToLoad: true,
        size:   '~8 MB',
        // Optional still frame shown behind the play button, e.g.
        // 'assets/work/unity-game-poster.jpg'. Strongly recommended — a
        // screenshot sells the click far better than an empty panel does.
        poster: null,

        /* Leave null: the build step auto-detects
           assets/games/unity-game/logo.{svg,png,webp,gif,jpg}
           Set a path here to override. logoAlt defaults to "<name> logo".

           LAYOUT
           logoFill  true  (default) the logo is full-bleed key art across the
                           whole stage, with the Play button over its lower
                           third. Export the logo at the stage aspect ratio —
                           the build step tells you the exact pixels.
                     false the logo is a smaller mark laid out next to the
                           Play button. Use for a wordmark that would look
                           wrong blown up.
           logoFit   'cover'   (default) fills the stage, crops any overhang
                     'contain' shows all of it, leaves bars if the aspect
                               ratio does not match the stage                */
        logo:     null,
        logoAlt:  '',
        logoFill: true,
        logoFit:  'cover',
      },
      {
        id:     'godot-game',
        name:   'Godot Web Build',
        engine: 'Godot 4',
        status: 'building',
        blurb:  'Godot 4 exports to HTML5/WebAssembly, so it embeds the same way as Unity.',
        stack:  ['Godot 4', 'GDScript', 'WebAssembly'],
        folder: 'assets/games/godot-game',
        embed:  null,   // e.g. 'assets/games/host/godot-game.html'
        aspect: '16 / 9',
        controls: 'Keyboard',
        eta:    'In development',
        clickToLoad: true,
        size:   '',
        poster: null,
        /* Drop logo.png / .gif / .webp into assets/games/godot-game/ and it is
           picked up automatically — the folder does not need the build in it
           yet. The card shows the logo as full-bleed key art with an
           "In development" label where the Play button will go, so it looks
           intentional rather than empty. */
        logo:     null,
        logoAlt:  '',
        logoFill: true,
        logoFit:  'cover',
      },
    ],
  },

  /* ---- 9. SKILLS -------------------------------------------------------
     No self-assigned percentages. "C# 93%" is 93% of what, exactly? — it
     reads as unfalsifiable and invites a recruiter to filter you out on a
     number you invented.

     Instead every skill carries a TIER and the EVIDENCE behind it:
       tier: 'production' → shipped to live paying customers
             'working'    → used to build and deliver real things
             'familiar'   → working knowledge, not yet shipped depth
     The bars still fill (the gauge look survives) but they are driven by
     tier, so the visual makes a claim you can actually defend in interview.  */
  skills: [
    {
      group: 'Core Stack',
      items: [
        { name: 'Unity',              tier: 'current', note: 'Ultimate Texas Hold\'em client, shipped solo from zero experience' },
        { name: 'C#',                 tier: 'current', note: '6+ ETG titles across client and server' },
        { name: '.NET',               tier: 'current', note: 'ETG game servers, services, tournament backend' },
        { name: 'Unity Addressables', tier: 'current', note: 'Asset management and load-time optimisation' },
        { name: 'Unity WebGL',        tier: 'current', note: '10 titles hosted on the prototyping portal' },
      ],
    },
    {
      group: 'Shipped With, Not Current',
      items: [
        { name: 'C++',    tier: 'shipped', note: 'Platform and OS-level components' },
        { name: 'C',      tier: 'shipped', note: 'Platform engineering' },
        { name: 'WPF',    tier: 'shipped', note: 'Operator-facing configuration tooling' },
        { name: 'Python', tier: 'shipped', note: 'Robot Framework automation suites' },
        { name: 'SQL',    tier: 'shipped', note: 'Backend queries and reporting' },
      ],
    },
    {
      group: 'Web, AI-Assisted',
      items: [
        { name: 'JavaScript',  tier: 'assisted', note: 'This site — ES modules, no framework' },
        { name: 'Three.js',    tier: 'assisted', note: 'The instrument cluster on this page' },
        { name: 'React',       tier: 'assisted', note: 'QR feedback admin panel' },
        { name: 'Node.js',     tier: 'assisted', note: 'Feedback pipeline backend' },
      ],
    },
    {
      group: 'Tools & Practice',
      items: [
        { name: 'Perforce',              tier: 'current', note: 'Primary VCS at the studio' },
        { name: 'Git / GitHub Desktop',  tier: 'current', note: 'Personal and web projects' },
        { name: 'Log-Based Debugging',   tier: 'current', note: 'Root-cause on live production defects' },
        { name: 'Performance Profiling', tier: 'current', note: 'Unity and server bottleneck resolution' },
        { name: 'Client-Server Design',  tier: 'current', note: 'Game logic and state sync across games' },
        { name: 'AI-Assisted Delivery',  tier: 'current', note: 'Led studio ideation sessions' },
      ],
    },
  ],

  /* Tier → bar fill + label. Edit here, not per skill.

     Why these three and not a 0-100 score: a number you assign yourself is
     unfalsifiable and invites a recruiter to filter you out on it. A tier
     states a checkable claim instead. "Shipped, not current" in particular is
     a thing almost no portfolio says out loud, and it reads as honest rather
     than rusty — you are pre-empting the question instead of being caught by
     it in an interview. */
  skillTiers: {
    current:  { fill: 100, label: 'Current'      },
    shipped:  { fill: 68,  label: 'Shipped'      },
    assisted: { fill: 42,  label: 'AI-Assisted'  },
  },

  /* ---- 10. INTERESTING BITS --------------------------------------------- */
  bits: {
    heading: 'Interesting Bits',
    intro:   'Everything my appraisal form has no field for. Mostly engines, altitude, and jokes that compile with warnings.',

    // Short cards
    cards: [
      {
        icon:  'hike',
        title: 'I Hike',
        text:  'Show me a trail and a genuinely alarming weather forecast and I am already packing. Altitude is the only latency I have ever enjoyed.',
      },
      {
        icon:  'ride',
        title: 'I Ride',
        text:  'Two wheels, ideally somewhere with corners and no straight lines to get bored on. That this entire site is built as an instrument cluster is not what anyone would call a coincidence.',
      },
      {
        icon:  'drive',
        title: 'I Drive',
        text:  'Long drives with no destination are my preferred debugger. No breakpoints, no stack traces, and the only exception thrown is a cow at kilometre 40.',
      },
      {
        icon:  'travel',
        title: 'I Travel',
        text:  'New places, questionable street food, and a camera roll that is 80% landscapes, 15% menus I meant to remember, and 5% my own thumb.',
      },
      {
        icon:  'humour',
        title: 'I Have Jokes',
        text:  'Studio-certified source of terrible puns. My humour ships with known issues and no regression suite, but in three years QA has not once managed to reproduce a crash.',
      },
    ],

    // The two 3D vehicles
    vehiclesHeading: 'The Dream Garage',
    vehiclesNote:    'Neither of these is in my actual garage. Both are rendered live, which is cheaper and needs no insurance. Drag to rotate.',
    vehicles: [
      {
        kind:  'bike',
        label: 'Dream Bike',
        name:  'BMW S1000XR',
        blurb: 'A superbike engine that has been talked into wearing luggage racks. Sensible on paper, entirely unreasonable past 8,000 rpm — which is the exact trait I look for in an engine and, apparently, in a codebase.',
        specs: [
          { k: 'Layout',    v: 'Inline-4' },
          { k: 'Character', v: 'Sport-Touring' },
          { k: 'Redline',   v: '~12,000 rpm' },
        ],
      },
      {
        kind:  'car',
        label: 'Dream Car',
        name:  'Range Rover Velar',
        blurb: 'Flush door handles that retract when you walk away, a roofline no SUV needs, and almost nothing on the surface that is not load-bearing. Someone deleted every line that was not doing a job — I respect that in a design and aspire to it in a pull request.',
        specs: [
          { k: 'Form',      v: 'Coupé-SUV' },
          { k: 'Signature', v: 'Flush handles' },
          { k: 'Approach',  v: 'Reductive' },
        ],
      },
    ],
  },

  /* ---- 11. EDUCATION ---------------------------------------------------- */
  education: [
    {
      degree: 'B.E. in Information Science',
      school: 'Dayananda Sagar Academy of Technology & Management, Bengaluru',
      period: '2019 — 2023',
      from:   '2019',
      to:     '2023',
      detail: 'CGPA 8.5 / 10',
      note:   'Final-year project: Software Defect Prediction using machine learning models including Reinforcement Learning.',
    },
  ],

  /* ---- 12. CERTIFICATIONS ----------------------------------------------
     ⚠️  FILL IN issuer AND year, or delete the entry.
     Recruiters and resume parsers weight certifications far more heavily
     when they carry an issuer and a date. An undated cert list reads as
     padding — two dated certs beat four bare names.
     Entries missing an issuer render without a year slot rather than
     showing an empty column.                                              */
  certifications: [
    { name: 'Machine Learning', issuer: '', year: '', url: '' },
    { name: 'Python',           issuer: '', year: '', url: '' },
    { name: 'C++',              issuer: '', year: '', url: '' },
    { name: 'C#',               issuer: '', year: '', url: '' },
  ],

  /* ---- 13. LANGUAGES ----------------------------------------------------- */
  languages: [
    { name: 'English', level: 'Professional Proficiency' },
    { name: 'Kannada', level: 'Native' },
    { name: 'Hindi',   level: 'Professional Proficiency' },
  ],

  /* ---- 14. SHIPPED TITLES ------------------------------------------------ */
  titles: [
    'Ultimate Texas Hold\'em', 'Roulette & Variants', 'Roulette POD',
    'Craps', 'Baccarat & Variants', 'Sic Bo', 'SBJ Tournament',
  ],

  /* ---- 15. CONTACT -------------------------------------------------------- */
  contact: {
    heading: 'Open the Throttle',
    // No availability or job-seeking language, by request. Just a way to reach you.
    body:    'Questions about the work, the engines, or the render pipeline behind this page — email is the fastest way to reach me.',
  },

  /* ---- 16. SEO / STRUCTURED DATA -----------------------------------------
     Feeds the JSON-LD Person schema baked into every page at build time.
     This is the format Google and recruiter sourcing tools actually ingest. */
  seo: {
    /* schema.org `knowsAbout` — the terms a recruiter would actually search.
       Ordered by how central they are to your current work: Google and
       sourcing tools weight earlier entries slightly, and a human skimming
       the structured data reads top-down. */
    knowsAbout: [
      'Unity', 'C#', '.NET', 'Unity WebGL', 'Unity Addressables',
      'Game Development', 'Casino Gaming', 'Electronic Table Games',
      'Client-Server Architecture', 'Multiplayer Tournament Systems',
      'Performance Profiling', 'C++', 'C', 'WPF', 'Python', 'SQL',
      'Perforce', 'Three.js', 'WebGL',
    ],
    employer: {
      name: 'Light & Wonder',
      url:  'https://www.lnw.com',
    },
    school: {
      name: 'Dayananda Sagar Academy of Technology & Management',
      url:  'https://dsatm.edu.in',
    },
  },

  /* ---- 17. ANALYTICS -----------------------------------------------------
     Optional, privacy-friendly, cookieless. Leave `src` empty to disable.
     Plausible : https://plausible.io/js/script.js   + domain
     Umami     : https://cloud.umami.is/script.js    + websiteId
     Cloudflare Web Analytics is free and needs no code — enable it in the
     Pages dashboard instead if you prefer.                                  */
  analytics: {
    src:       '',
    domain:    '',
    websiteId: '',
  },
};

/* --- Section order & gear labels ---------------------------------------
   Hobbies now sit AFTER education. For an engineer three years in, a
   five-card hobby section outranking your degree is inverted priority. */
export const SECTIONS = [
  { id: 'hero',       gear: 'N', label: 'Ignition'   },
  { id: 'about',      gear: '1', label: 'Profile'    },
  { id: 'experience', gear: '2', label: 'Experience' },
  { id: 'skills',     gear: '3', label: 'Skills'     },
  { id: 'projects',   gear: '4', label: 'Work'       },
  { id: 'games',      gear: '5', label: 'Arcade'     },
  { id: 'education',  gear: '6', label: 'Education'  },
  { id: 'bits',       gear: '7', label: 'Off Duty'   },
  { id: 'contact',    gear: 'R', label: 'Contact'    },
];

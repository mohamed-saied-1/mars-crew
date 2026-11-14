// Crater Explorer + Landing Ellipse Lab: the curated, verified catalog.
// Every value here was checked on 2026-11-13 against the USGS/IAU Gazetteer of Planetary
// Nomenclature, NASA/JPL mission pages, the NASA Photojournal and NSSDCA (see `sources`).
// Coordinates: planetocentric latitude, east-positive longitude (0–360), MDIM 2.1 control network.
// Fields that could not be verified are left out, never guessed. See LANDING_LAB_DESIGN.md.
(function (root) {
  'use strict';

  var GZ = 'https://planetarynames.wr.usgs.gov/Feature/';
  var SOURCES = {
    gz_gale: GZ + '2071', gz_aeolis: GZ + '15000', gz_jezero: GZ + '14300', gz_gusev: GZ + '2289', gz_endeavour: GZ + '14501',
    gz_victoria: GZ + '14522', gz_eberswalde: GZ + '1706', gz_holden: GZ + '2540', gz_korolev: GZ + '3091', gz_heimdal: GZ + '14448',
    gz_belva: GZ + '15872', gz_hellas: GZ + '2432', gz_elysium: GZ + '1784', gz_meridiani: GZ + '3854', gz_chryse: GZ + '1203',
    gz_utopia: GZ + '6260', gz_ares: GZ + '358',
    gale_guide: 'https://science.nasa.gov/resource/a-guide-to-gale-crater/',
    gale_layers: 'https://science.nasa.gov/photojournal/sedimentation-and-erosion-in-gale-crater-mars/',
    gale_size: 'https://science.nasa.gov/photojournal/destination-gale-crater-in-august-2012',
    msl_2013: 'https://www.jpl.nasa.gov/news/nasa-rover-finds-conditions-once-suited-for-ancient-life-on-mars/',
    msl_2018: 'https://www.jpl.nasa.gov/news/nasa-finds-ancient-organic-material-mysterious-methane-on-mars/',
    msl_mission: 'https://science.nasa.gov/mission/msl-curiosity/',
    msl_landing_paper: 'https://doi.org/10.1002/2013JE004555',
    m2020_mission: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    m2020_site: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/',
    m2020_edl: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/',
    m2020_butler: 'https://www.jpl.nasa.gov/images/pia24483-welcome-to-octavia-e-butler-landing/',
    m2020_ellipse: 'https://science.nasa.gov/photojournal/zeroing-in-on-the-target',
    m2020_trn: 'https://science.nasa.gov/technology/technology-highlights/terrain-relative-navigation-landing-between-the-hazards',
    belva_pia: 'https://science.nasa.gov/photojournal/perseverance-takes-in-view-at-belva-crater/',
    spirit_mission: 'https://science.nasa.gov/mission/mer-spirit/',
    spirit_nssdc: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A',
    spirit_ellipse: 'https://science.nasa.gov/photojournal/mars-exploration-rover-mer-a-spirit-landing-site',
    opp_mission: 'https://science.nasa.gov/mission/mer-opportunity/',
    opp_nssdc: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-032A',
    opp_ellipse: 'https://science.nasa.gov/photojournal/mars-exploration-rover-mer-b-opportunity-landing-site',
    opp_route: 'https://science.nasa.gov/photojournal/opportunitys-route-to-endeavour-crater',
    opp_vein: 'https://www.jpl.nasa.gov/news/nasa-mars-rover-finds-mineral-vein-deposited-by-water',
    opp_vein_img: 'https://science.nasa.gov/photojournal/western-edge-of-cape-york-with-bright-vein',
    opp_eagle: 'https://www.jpl.nasa.gov/images/rovers-landing-hardware-at-eagle-crater-mars',
    victoria_pia: 'https://science.nasa.gov/photojournal/the-opportunity-rover-at-victoria-crater/',
    msl_finalists: 'https://science.nasa.gov/photojournal/four-finalist-landing-site-candidates-for-mars-science-laboratory/',
    eberswalde_pia: 'https://pds-rings.seti.org/press_releases/pages/PIA24xxx/PIA24362.html',
    holden_pia: 'https://science.nasa.gov/photojournal/holden-crater-a-finalist-not-selected-as-landing-site-for-curiosity',
    korolev_esa: 'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Mars_Express_gets_festive_A_winter_wonderland_on_Mars',
    korolev_pia: 'https://science.nasa.gov/photojournal/korolev-crater-in-infrared',
    heimdal_pia: 'https://pds-rings.seti.org/press_releases/pages/PIA10xxx/PIA10705.html',
    hellas_pia: 'https://science.nasa.gov/photojournal/to-great-depths',
    phoenix_mission: 'https://science.nasa.gov/mission/phoenix/',
    phoenix_ellipse: 'https://www.jpl.nasa.gov/news/nasa-spacecraft-fine-tunes-course-for-mars-landing/',
    insight_mission: 'https://science.nasa.gov/mission/insight/',
    insight_site: 'https://www.jpl.nasa.gov/news/press_kits/insight/landing/mission/landing-site/',
    insight_pia: 'https://science.nasa.gov/photojournal/insights-final-location-on-mars/',
    viking1_nssdc: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-075C',
    viking2_nssdc: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083C',
    viking_ellipse: 'https://www.nasa.gov/centers-and-facilities/johnson/nasa-technology-enables-precision-landing-without-a-pilot/',
    pathfinder_nssdc: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-068A',
    msl_skycrane: 'https://www.jpl.nasa.gov/news/heres-how-curiositys-sky-crane-changed-the-way-nasa-explores-mars/',
    mdim: 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m',
    mola: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/',
  };

  // Bundled NASA/JPL images (1024 px). Each keeps its exact title, credit and source page.
  var IMAGES = {
    PIA14290: { file: 'assets/landing/PIA14290.jpg', title: 'Gale Crater: Future Home of Mars Rover Curiosity', credit: 'NASA/JPL-Caltech/ASU', url: 'https://science.nasa.gov/photojournal/gale-crater-future-home-of-mars-rover-curiosity', kind: 'data' },
    PIA14291: { file: 'assets/landing/PIA14291_fig1.jpg', title: 'Oblique view of Gale Crater from the North (figure 1)', credit: 'NASA/JPL-Caltech/ASU/UA', url: 'https://science.nasa.gov/photojournal/oblique-view-of-gale-crater-from-the-north', kind: 'data' },
    PIA24483: { file: 'assets/landing/PIA24483.jpg', title: 'Welcome to Octavia E. Butler Landing', credit: 'NASA/JPL-Caltech/University of Arizona', url: SOURCES.m2020_butler, kind: 'data' },
    PIA04260: { file: 'assets/landing/PIA04260.jpg', title: 'Gusev Crater', credit: 'NASA/JPL/Arizona State University', url: 'https://science.nasa.gov/photojournal/gusev-crater', kind: 'data' },
    PIA15036: { file: 'assets/landing/PIA15036.jpg', title: "Western Edge of 'Cape York,' with Bright Vein", credit: 'NASA/JPL-Caltech', url: SOURCES.opp_vein_img, kind: 'data' },
    PIA08812: { file: 'assets/landing/PIA08812.jpg', title: "The Opportunity Rover at 'Victoria Crater'", credit: 'NASA/JPL/University of Arizona', url: SOURCES.victoria_pia, kind: 'data' },
    PIA24362: { file: 'assets/landing/PIA24362.jpg', title: 'Eberswalde Crater Delta', credit: 'NASA/JPL-Caltech/ASU', url: SOURCES.eberswalde_pia, kind: 'data' },
    PIA14302: { file: 'assets/landing/PIA14302.jpg', title: 'Holden Crater, a Finalist Not Selected as Landing Site for Curiosity', credit: 'NASA/JPL-Caltech/UA', url: SOURCES.holden_pia, kind: 'data' },
    PIA05608: { file: 'assets/landing/PIA05608.jpg', title: 'Korolev Crater in Infrared', credit: 'NASA/JPL/Arizona State University', url: SOURCES.korolev_pia, kind: 'data' },
    PIA10705: { file: 'assets/landing/PIA10705.jpg', title: 'Phoenix Descending with Crater in the Background', credit: 'NASA/JPL-Caltech/University of Arizona', url: SOURCES.heimdal_pia, kind: 'data' },
    PIA25889: { file: 'assets/landing/PIA25889.jpg', title: 'Perseverance Takes in View at Belva Crater', credit: 'NASA/JPL-Caltech/ASU/MSSS', url: SOURCES.belva_pia, kind: 'data' },
    PIA21570: { file: 'assets/landing/PIA21570.jpg', title: 'To Great Depths', credit: 'NASA/JPL-Caltech/Univ. of Arizona', url: SOURCES.hellas_pia, kind: 'data' },
    PIA22878: { file: 'assets/landing/PIA22878.jpg', title: "InSight's Final Location on Mars", credit: 'NASA/JPL-Caltech/University of Arizona', url: SOURCES.insight_pia, kind: 'data' },
    PIA24265: { file: 'assets/landing/PIA24265.jpg', title: "Perseverance's Stages of Descent (Illustration)", credit: 'NASA/JPL-Caltech', url: 'https://science.nasa.gov/photojournal/perseverances-stages-of-descent-illustration', kind: 'illustration' },
    PIA24319: { file: 'assets/landing/PIA24319.jpg', title: 'Perseverance Touches Down on Mars (Illustration)', credit: 'NASA/JPL-Caltech', url: 'https://science.nasa.gov/photojournal/perseverance-touches-down-on-mars-illustration', kind: 'illustration' },
  };

  // kind: crater | basin. All are selectable and each has exactly one Dusty recording slot.
  // diameterKm: Gazetteer value. nasaSize: a differing NASA figure, shown with its own source.
  // terrain: id of the bundled MOLA crop that shows it (null: too small or too large for a crop).
  var FEATURES = [
    {
      id: 'gale', kind: 'crater', gz: 2071, adopted: '1991', lat: -5.37, lon: 137.81, diameterKm: 154.08, nasaSize: { en: 'NASA: 154 km (96 miles)', src: 'gale_size' },
      terrain: 'gale', image: 'PIA14290', voice: 'dusty_crater_gale', mission: 'Curiosity',
      name: { en: 'Gale', ar: 'جيل' }, pron: { ar: 'جِيل', latin: 'GAYL' }, namesake: { en: 'Walter F. Gale, Australian astronomer', ar: 'والتر جيل، فلكي أسترالي' },
      kids: {
        en: 'Gale is a giant crater, 154 km wide, made when a huge space rock hit Mars about 3.7 billion years ago. In its middle stands a tall mountain made of rock layers, like the pages of a book. NASA\'s Curiosity rover landed here in 2012.',
        ar: 'جيل فوهة عملاقة عرضها 154 كيلومترًا، تكوّنت لما صخرة فضائية ضخمة خبطت المريخ من حوالي 3.7 مليار سنة. في وسطها جبل عالي مبني من طبقات صخور زي صفحات الكتاب. ونزلت فيها المركبة كيوريوسيتي سنة 2012.',
      },
      more: {
        en: 'The mountain\'s official name is Aeolis Mons; the Curiosity team calls it "Mount Sharp". Its lower layers record times of lakes, rivers and dry desert. In 2013, a rock Curiosity drilled ("John Klein") showed that ancient Mars could have supported microbes. In 2018, NASA reported ancient organic material in Gale\'s rocks and methane in the air that rises and falls with the seasons.',
        ar: 'اسم الجبل الرسمي «إيوليس مونس»، وفريق كيوريوسيتي بيسميه «جبل شارب». طبقاته السفلى بتحكي عن أزمنة فيها بحيرات وأنهار وأزمنة صحراء جافة. سنة 2013 حفرت كيوريوسيتي صخرة اسمها «جون كلاين» وعرفنا منها إن المريخ زمان كان ممكن يناسب كائنات دقيقة. وسنة 2018 أعلنت ناسا عن مواد عضوية قديمة في صخور جيل، وغاز ميثان في الهوا بيزيد ويقل مع الفصول.',
      },
      facts: [
        { k: 'formed', en: 'Formed by an impact about 3.7 billion years ago.', ar: 'تكوّنت من اصطدام من حوالي 3.7 مليار سنة.', src: ['gale_guide'] },
        { k: 'terrain', en: 'Central mound Aeolis Mons ("Mount Sharp"), 89 km across (IAU), with layered rocks from lakes, rivers and dry times.', ar: 'جبل في المنتصف اسمه إيوليس مونس («جبل شارب») عرضه 89 كم، فيه طبقات صخور من بحيرات وأنهار وأزمنة جافة.', src: ['gz_aeolis', 'gale_layers'] },
        { k: 'found', en: '2013: drilled rock "John Klein" showed ancient Mars could have supported microbes.', ar: '2013: صخرة «جون كلاين» أثبتت إن المريخ القديم كان ممكن يناسب كائنات دقيقة.', src: ['msl_2013'] },
        { k: 'found', en: '2018: ancient organic material and seasonal methane reported.', ar: '2018: اكتشاف مواد عضوية قديمة وميثان بيتغير مع الفصول.', src: ['msl_2018'] },
        { k: 'mission', en: 'Curiosity landed on August 6, 2012 (UTC).', ar: 'نزلت كيوريوسيتي يوم 6 أغسطس 2012.', src: ['msl_mission'] },
      ],
      sources: ['gz_gale', 'gale_size', 'gale_guide', 'gz_aeolis', 'gale_layers', 'msl_2013', 'msl_2018', 'msl_mission'],
    },
    {
      id: 'jezero', kind: 'crater', gz: 14300, adopted: '2007', lat: 18.41, lon: 77.69, diameterKm: 47.52, nasaSize: { en: 'NASA: about 45 km (28 miles)', src: 'm2020_mission' },
      terrain: 'jezero', image: 'PIA24483', voice: 'dusty_crater_jezero', mission: 'Perseverance',
      name: { en: 'Jezero', ar: 'جيزيرو' }, pron: { ar: 'يِزِيرو', latin: 'YEH-zeh-roh' }, namesake: { en: 'a town in Bosnia and Herzegovina', ar: 'بلدة في البوسنة والهرسك' },
      kids: {
        en: 'Jezero is a crater about 45 to 48 km wide. About 3.5 billion years ago it held a lake, and a river carried mud and sand into it and built a fan-shaped delta. NASA\'s Perseverance rover landed here on February 18, 2021 to look for signs of ancient life.',
        ar: 'جيزيرو فوهة عرضها من 45 لـ 48 كيلومتر تقريبًا. من حوالي 3.5 مليار سنة كان فيها بحيرة، ونهر كان بيجيب طين ورمل لجواها وعمل دلتا شكلها زي المروحة. ونزلت فيها المركبة برسيفيرانس يوم 18 فبراير 2021 عشان تدوّر على علامات حياة قديمة.',
      },
      more: {
        en: 'Jezero sits on the western edge of Isidis Planitia, a giant impact basin. NASA named Perseverance\'s landing spot "Octavia E. Butler Landing". In 2024 the rover found a rock called "Cheyava Falls", and in 2025 scientists reported that a sample called "Sapphire Canyon" holds a potential sign of ancient life; NASA says more study is needed to know for sure.',
        ar: 'جيزيرو على الحافة الغربية لـ «إيسيديس بلانيشيا»، وهو حوض ضخم من اصطدام قديم. ناسا سمّت مكان نزول برسيفيرانس «هبوط أوكتافيا إي. بتلر». سنة 2024 لقيت المركبة صخرة اسمها «شيافا فولز»، وسنة 2025 أعلن العلماء إن عينة اسمها «سافاير كانيون» فيها علامة محتملة لحياة قديمة، وناسا بتقول إن لسه محتاجين دراسة أكتر عشان نتأكد.',
      },
      facts: [
        { k: 'terrain', en: 'Ancient lake about 3.5 billion years ago, with a river delta; on the western edge of Isidis Planitia.', ar: 'بحيرة قديمة من حوالي 3.5 مليار سنة فيها دلتا نهر، على الحافة الغربية لإيسيديس بلانيشيا.', src: ['m2020_site'] },
        { k: 'mission', en: 'Perseverance landed on February 18, 2021, at a spot NASA named "Octavia E. Butler Landing".', ar: 'نزلت برسيفيرانس يوم 18 فبراير 2021 في مكان سمّته ناسا «هبوط أوكتافيا إي. بتلر».', src: ['m2020_mission', 'm2020_butler'] },
        { k: 'found', en: '2025: the "Sapphire Canyon" sample holds a potential biosignature; NASA says more study is needed.', ar: '2025: عينة «سافاير كانيون» فيها علامة حياة محتملة، وناسا بتقول محتاجين دراسة أكتر.', src: ['m2020_mission'] },
      ],
      sources: ['gz_jezero', 'm2020_mission', 'm2020_site', 'm2020_butler'],
    },
    {
      id: 'gusev', kind: 'crater', gz: 2289, adopted: '1976', lat: -14.53, lon: 175.52, diameterKm: 158.12,
      terrain: 'gusev', image: 'PIA04260', voice: 'dusty_crater_gusev', mission: 'Spirit',
      name: { en: 'Gusev', ar: 'جوسيف' }, pron: { ar: 'جُوسِيف', latin: 'GOO-sev' }, namesake: { en: 'Matvei M. Gusev, Russian astronomer', ar: 'ماتفي جوسيف، فلكي روسي' },
      kids: {
        en: 'Gusev is a 158 km crater that looks like an old crater lakebed, so NASA sent the Spirit rover there. Spirit landed in January 2004, drove 7.73 km and kept talking to Earth until March 2010.',
        ar: 'جوسيف فوهة عرضها 158 كيلومتر شكلها زي قاع بحيرة قديمة، عشان كده ناسا بعتت لها المركبة سبيريت. نزلت سبيريت في يناير 2004، ومشيت 7.73 كيلومتر، وفضلت تكلّم الأرض لحد مارس 2010.',
      },
      more: {
        en: 'In 2007 Spirit dug up soil that was almost pure silica. In May 2009 it got stuck in soft soil, and its last contact with Earth was on March 22, 2010.',
        ar: 'سنة 2007 سبيريت طلّعت تربة كلها تقريبًا سيليكا نقية. وفي مايو 2009 غرزت في تربة طرية، وآخر مرة كلّمت فيها الأرض كانت يوم 22 مارس 2010.',
      },
      facts: [
        { k: 'why', en: 'Chosen because it has the appearance of a crater lakebed.', ar: 'اتختارت لأن شكلها زي قاع بحيرة جوه فوهة.', src: ['spirit_nssdc'] },
        { k: 'mission', en: 'Spirit landed January 3, 2004 (US Pacific time); drove 7.73 km; last contact March 22, 2010.', ar: 'نزلت سبيريت يوم 3 يناير 2004 بتوقيت المحيط الهادي، ومشيت 7.73 كم، وآخر اتصال 22 مارس 2010.', src: ['spirit_mission'] },
        { k: 'found', en: '2007: nearly pure silica in the soil.', ar: '2007: سيليكا شبه نقية في التربة.', src: ['spirit_mission'] },
      ],
      sources: ['gz_gusev', 'spirit_nssdc', 'spirit_mission'],
    },
    {
      id: 'endeavour', kind: 'crater', gz: 14501, adopted: '2008', lat: -2.28, lon: 354.80, diameterKm: 21.78, nasaSize: { en: 'NASA: about 22 km (14 miles)', src: 'opp_route' },
      terrain: 'meridiani', image: 'PIA15036', voice: 'dusty_crater_endeavour', mission: 'Opportunity',
      name: { en: 'Endeavour', ar: 'إنديفور' }, pron: { ar: 'إِنْدِيفَر', latin: 'en-DEV-er' }, namesake: { en: 'a town in Canada', ar: 'بلدة في كندا' },
      kids: {
        en: 'Endeavour is a 22 km crater on the plains of Meridiani. The Opportunity rover drove for years to reach it and arrived on August 9, 2011. On its rim, Opportunity found a bright vein of mineral left by water.',
        ar: 'إنديفور فوهة عرضها 22 كيلومتر في سهول ميريدياني. المركبة أوبورتيونيتي فضلت ماشية سنين عشان توصلها، ووصلت يوم 9 أغسطس 2011. وعلى حافتها لقت عِرق لامع من معدن سابته المية.',
      },
      more: {
        en: 'The vein, nicknamed "Homestake", is rich in calcium and sulfur, possibly gypsum. NASA explained that water flowing through a crack in the rock left this mineral behind.',
        ar: 'العِرق ده اسمه «هومستيك»، فيه كالسيوم وكبريت كتير وممكن يكون جبس. وناسا شرحت إن مية كانت بتعدّي في شق في الصخر وسابت المعدن ده وراها.',
      },
      facts: [
        { k: 'mission', en: 'Opportunity arrived on August 9, 2011.', ar: 'وصلت أوبورتيونيتي يوم 9 أغسطس 2011.', src: ['opp_mission'] },
        { k: 'found', en: '2011: the "Homestake" vein on the Cape York rim, deposited by water (calcium sulfate, possibly gypsum).', ar: '2011: عِرق «هومستيك» على حافة كيب يورك، سابته المية (كبريتات كالسيوم، ممكن جبس).', src: ['opp_vein', 'opp_vein_img'] },
      ],
      sources: ['gz_endeavour', 'opp_route', 'opp_mission', 'opp_vein', 'opp_vein_img'],
    },
    {
      id: 'victoria', kind: 'crater', gz: 14522, adopted: '2008', lat: -2.05, lon: 354.50, diameterKm: 0.88, nasaSize: { en: 'NASA: about 800 m', src: 'victoria_pia' },
      terrain: 'meridiani', image: 'PIA08812', voice: 'dusty_crater_victoria', mission: 'Opportunity',
      name: { en: 'Victoria', ar: 'فيكتوريا' }, pron: { ar: 'فِكْتُورْيا', latin: 'vik-TOR-ee-ah' }, namesake: { en: 'a town in the Seychelles', ar: 'بلدة في سيشل' },
      kids: {
        en: 'Victoria is a small crater, less than 1 km wide. Opportunity reached it in September 2006, and a camera in orbit even photographed the rover sitting on its edge. A year later, on September 11, 2007, Opportunity drove down inside.',
        ar: 'فيكتوريا فوهة صغيرة، عرضها أقل من كيلومتر. أوبورتيونيتي وصلتها في سبتمبر 2006، وكاميرا في المدار صوّرت المركبة وهي واقفة على حافتها. وبعدها بسنة، يوم 11 سبتمبر 2007، نزلت أوبورتيونيتي جوه الفوهة.',
      },
      more: {
        en: 'The photo of Opportunity at Victoria\'s rim was taken on October 3, 2006 by the HiRISE camera on Mars Reconnaissance Orbiter. Victoria is an impact crater, made when a rock from space hit the plains of Meridiani.',
        ar: 'صورة أوبورتيونيتي على حافة فيكتوريا اتصوّرت يوم 3 أكتوبر 2006 بكاميرا «هاي رايز» اللي على المركبة المدارية «إم آر أو». وفيكتوريا فوهة اصطدام، اتعملت لما صخرة من الفضاء خبطت سهول ميريدياني.',
      },
      facts: [
        { k: 'mission', en: 'Opportunity arrived in September 2006 and entered the crater on September 11, 2007.', ar: 'وصلت أوبورتيونيتي في سبتمبر 2006 ونزلت جوه الفوهة يوم 11 سبتمبر 2007.', src: ['opp_mission'] },
        { k: 'found', en: 'HiRISE photographed Opportunity on the rim on October 3, 2006.', ar: 'كاميرا هاي رايز صوّرت أوبورتيونيتي على الحافة يوم 3 أكتوبر 2006.', src: ['victoria_pia'] },
      ],
      sources: ['gz_victoria', 'victoria_pia', 'opp_mission'],
    },
    {
      id: 'eberswalde', kind: 'crater', gz: 1706, adopted: '2006', lat: -23.98, lon: 326.70, diameterKm: 62.19,
      terrain: 'margaritifer', image: 'PIA24362', voice: 'dusty_crater_eberswalde', mission: null,
      name: { en: 'Eberswalde', ar: 'إبرسفالده' }, pron: { ar: 'إِيبِرْسْفالْدَه', latin: 'AY-bers-vahl-deh' }, namesake: { en: 'a town in Germany', ar: 'بلدة في ألمانيا' },
      kids: {
        en: 'Eberswalde is a 62 km crater with one of the best-preserved river deltas on Mars. Long ago a river flowed in and dropped its sand and mud, maybe into a lake. It was one of the last four places considered for Curiosity, but it was not chosen.',
        ar: 'إبرسفالده فوهة عرضها 62 كيلومتر، فيها دلتا نهر من أحسن الدلتات المحفوظة على المريخ. زمان كان فيه نهر بيدخلها ويسيب رمله وطينه، يمكن في بحيرة. وكانت من آخر أربع أماكن اتعرضت لكيوريوسيتي، بس ما اتختارتش.',
      },
      more: {
        en: 'In 2008 NASA named Eberswalde one of four finalist landing sites for the Mars Science Laboratory (Curiosity), describing "an ancient river" that "deposited a delta in a possible lake". Gale was chosen in the end.',
        ar: 'سنة 2008 ناسا اختارت إبرسفالده ضمن أربع أماكن نهائية لهبوط كيوريوسيتي، ووصفت فيها «نهر قديم سايب دلتا في بحيرة محتملة». وفي الآخر اتختارت جيل.',
      },
      facts: [
        { k: 'terrain', en: 'Contains one of the best-preserved deltas on Mars.', ar: 'فيها دلتا من أحسن الدلتات المحفوظة على المريخ.', src: ['eberswalde_pia'] },
        { k: 'history', en: '2008: a Curiosity finalist site ("an ancient river deposited a delta in a possible lake"); not selected.', ar: '2008: موقع نهائي لكيوريوسيتي («نهر قديم ساب دلتا في بحيرة محتملة»)، وما اتختارش.', src: ['msl_finalists'] },
      ],
      sources: ['gz_eberswalde', 'eberswalde_pia', 'msl_finalists'],
    },
    {
      id: 'holden', kind: 'crater', gz: 2540, adopted: '1973', lat: -26.04, lon: 325.98, diameterKm: 152.66,
      terrain: 'margaritifer', image: 'PIA14302', voice: 'dusty_crater_holden', mission: null,
      name: { en: 'Holden', ar: 'هولدن' }, pron: { ar: 'هُولْدِن', latin: 'HOLE-den' }, namesake: { en: 'Edward S. Holden, American astronomer', ar: 'إدوارد هولدن، فلكي أمريكي' },
      kids: {
        en: 'Holden is a big crater, 153 km wide, right next to Eberswalde. Inside it scientists see fans of sediment, flood deposits, possible lakebeds and clay, all clues about water. It was also a finalist landing site for Curiosity, but no spacecraft has landed there.',
        ar: 'هولدن فوهة كبيرة عرضها 153 كيلومتر، جنب إبرسفالده على طول. جواها العلماء شايفين مراوح من الرواسب، ورواسب فيضانات، وقيعان بحيرات محتملة، وطين، وكلها علامات على المية. وكانت برضه من الأماكن النهائية لكيوريوسيتي، بس ما فيش مركبة نزلت فيها.',
      },
      more: {
        en: 'NASA\'s 2008 description of Holden as a Curiosity finalist lists "alluvial fans, flood deposits, possible lake beds and clay-rich deposits". Clay forms in water, which is why scientists wanted to study it.',
        ar: 'ناسا سنة 2008 وصفت هولدن كموقع نهائي لكيوريوسيتي فيه «مراوح رسوبية، ورواسب فيضانات، وقيعان بحيرات محتملة، ورواسب غنية بالطين». والطين بيتكوّن في المية، وعشان كده العلماء كانوا عايزين يدرسوه.',
      },
      facts: [
        { k: 'terrain', en: 'Alluvial fans, flood deposits, possible lake beds and clay-rich deposits.', ar: 'مراوح رسوبية ورواسب فيضانات وقيعان بحيرات محتملة ورواسب غنية بالطين.', src: ['msl_finalists'] },
        { k: 'history', en: '2008: a Curiosity finalist site; no landing has taken place.', ar: '2008: موقع نهائي لكيوريوسيتي، وما حصلش فيه هبوط.', src: ['msl_finalists'] },
      ],
      sources: ['gz_holden', 'msl_finalists', 'holden_pia'],
    },
    {
      id: 'korolev', kind: 'crater', gz: 3091, adopted: '1973', lat: 72.77, lon: 164.58, diameterKm: 81.37,
      terrain: 'korolev', image: 'PIA05608', voice: 'dusty_crater_korolev', mission: null,
      name: { en: 'Korolev', ar: 'كوروليف' }, pron: { ar: 'كُورُولِيف', latin: 'KOR-oh-lev' }, namesake: { en: 'Sergey P. Korolev, Russian engineer', ar: 'سيرجي كوروليف، مهندس روسي' },
      kids: {
        en: 'Korolev is an 81 km crater near Mars\'s north pole, and it is filled with ice! A mound of water ice about 1.8 km thick stays there all year, because the crater floor is so cold that it works like a natural freezer.',
        ar: 'كوروليف فوهة عرضها 81 كيلومتر قريبة من القطب الشمالي للمريخ، وهي مليانة تلج! فيها كومة تلج مية تخنها حوالي 1.8 كيلومتر بتفضل موجودة طول السنة، لأن قاع الفوهة بارد جدًا وبيشتغل زي فريزر طبيعي.',
      },
      more: {
        en: 'The European Space Agency\'s Mars Express described the ice mound as about 1.8 km thick and present all year round, held in a "cold trap". NASA\'s Mars Odyssey also photographed Korolev in infrared light with its THEMIS camera.',
        ar: 'المركبة الأوروبية «مارس إكسبريس» وصفت كومة التلج إن تخنها حوالي 1.8 كم وموجودة طول السنة في «مصيدة برد». والمركبة الأمريكية «مارس أوديسي» صوّرت كوروليف بالأشعة تحت الحمرا بكاميرا «ثيميس».',
      },
      facts: [
        { k: 'terrain', en: 'Holds a mound of water ice about 1.8 km thick all year (source: ESA Mars Express).', ar: 'فيها كومة تلج مية تخنها حوالي 1.8 كم طول السنة (المصدر: وكالة الفضاء الأوروبية).', src: ['korolev_esa'] },
        { k: 'image', en: 'Imaged in infrared by NASA\'s Mars Odyssey THEMIS camera.', ar: 'اتصوّرت بالأشعة تحت الحمرا بكاميرا ثيميس على مارس أوديسي.', src: ['korolev_pia'] },
      ],
      sources: ['gz_korolev', 'korolev_esa', 'korolev_pia'],
    },
    {
      id: 'heimdal', kind: 'crater', gz: 14448, adopted: '2008', lat: 68.33, lon: 235.44, diameterKm: 10.49,
      terrain: 'phoenix', image: 'PIA10705', voice: 'dusty_crater_heimdal', mission: 'Phoenix',
      name: { en: 'Heimdal', ar: 'هايمدال' }, pron: { ar: 'هايْمْدال', latin: 'HAYM-dahl' }, namesake: { en: 'a town in Norway', ar: 'بلدة في النرويج' },
      kids: {
        en: 'Heimdal is a 10 km crater in the far north of Mars. On May 25, 2008, a camera in orbit took an amazing photo: the Phoenix lander hanging from its parachute, with Heimdal crater behind it!',
        ar: 'هايمدال فوهة عرضها 10 كيلومتر في أقصى شمال المريخ. يوم 25 مايو 2008 كاميرا في المدار صوّرت صورة مدهشة: مركبة فينيكس متعلقة في الباراشوت بتاعها، وفوهة هايمدال وراها!',
      },
      more: {
        en: 'The photo was taken by the HiRISE camera on Mars Reconnaissance Orbiter. Phoenix was actually about 20 km in front of the crater; it only looks like it is falling into it. NASA\'s caption spells the name "Heimdall".',
        ar: 'الصورة اتصوّرت بكاميرا هاي رايز على المركبة المدارية إم آر أو. وفينيكس في الحقيقة كانت قدام الفوهة بحوالي 20 كم، هي بس شكلها كإنها نازلة جواها. وناسا كاتبة الاسم «هايمدال» بحرفين L.',
      },
      facts: [
        { k: 'found', en: 'HiRISE photographed Phoenix descending on its parachute with Heimdal in the background (May 2008).', ar: 'هاي رايز صوّرت فينيكس نازلة بالباراشوت وهايمدال وراها (مايو 2008).', src: ['heimdal_pia'] },
        { k: 'mission', en: 'Phoenix landed nearby on May 25, 2008.', ar: 'نزلت فينيكس قريب منها يوم 25 مايو 2008.', src: ['phoenix_mission'] },
      ],
      sources: ['gz_heimdal', 'heimdal_pia', 'phoenix_mission'],
    },
    {
      id: 'belva', kind: 'crater', gz: 15872, adopted: '2020', lat: 18.48, lon: 77.38, diameterKm: 0.90,
      terrain: 'jezero', image: 'PIA25889', voice: 'dusty_crater_belva', mission: 'Perseverance',
      name: { en: 'Belva', ar: 'بيلفا' }, pron: { ar: 'بِيلْفا', latin: 'BEL-vah' }, namesake: { en: 'a town in West Virginia, USA', ar: 'بلدة في ولاية فيرجينيا الغربية بأمريكا' },
      kids: {
        en: 'Belva is a tiny crater, about 0.9 km wide, inside the much bigger Jezero crater. In 2023 Perseverance looked into it and saw rock layers tilted at a steep angle, which may have been a sandbar in an ancient river.',
        ar: 'بيلفا فوهة صغيرة خالص، عرضها حوالي 0.9 كيلومتر، جوه فوهة جيزيرو الأكبر بكتير. سنة 2023 برسيفيرانس بصّت جواها وشافت طبقات صخور مايلة جامد، ويمكن تكون كانت حاجز رملي في نهر قديم.',
      },
      more: {
        en: 'Perseverance\'s Mastcam-Z camera captured the view on April 22, 2023. Belva received its official name in 2020.',
        ar: 'كاميرا «ماستكام زد» على برسيفيرانس صوّرت المنظر ده يوم 22 أبريل 2023. وبيلفا خدت اسمها الرسمي سنة 2020.',
      },
      facts: [
        { k: 'found', en: 'April 22, 2023: Mastcam-Z saw steeply dipping layers, possibly a river sandbar.', ar: '22 أبريل 2023: ماستكام زد شافت طبقات مايلة جامد، ممكن حاجز رملي في نهر.', src: ['belva_pia'] },
      ],
      sources: ['gz_belva', 'belva_pia'],
    },
    {
      id: 'hellas', kind: 'basin', gz: 2432, adopted: '1973', lat: -42.43, lon: 70.50, diameterKm: 2299.16, nasaSize: { en: 'NASA: about 2,300 km across', src: 'hellas_pia' },
      terrain: 'hellas', image: 'PIA21570', voice: 'dusty_crater_hellas', mission: null,
      name: { en: 'Hellas Planitia', ar: 'هيلاس بلانيشيا' }, pron: { ar: 'هِيلاس', latin: 'HEL-us' }, namesake: { en: 'a classical albedo (light and dark marking) name', ar: 'اسم قديم لعلامة فاتحة على سطح المريخ' },
      kids: {
        en: 'Hellas is not just a crater, it is a giant impact basin about 2,300 km across, wider than Egypt! NASA calls it the deepest and broadest enclosed basin on Mars, left by a huge ancient impact.',
        ar: 'هيلاس مش مجرد فوهة، ده حوض اصطدام عملاق عرضه حوالي 2300 كيلومتر، أعرض من مصر كلها! وناسا بتقول عليه أعمق وأوسع حوض مقفول على المريخ، سابه اصطدام قديم ضخم.',
      },
      more: {
        en: 'Its official name is Hellas Planitia, meaning "the plain of Hellas". NASA describes it as "an ancient impact structure". Some NASA captions give smaller widths, so here we show the size from the Gazetteer and the NASA "To Great Depths" image page.',
        ar: 'اسمه الرسمي «هيلاس بلانيشيا» يعني «سهل هيلاس». وناسا بتوصفه إنه «بِنية اصطدام قديمة». بعض صور ناسا بتذكر عرض أصغر، فإحنا هنا بنعرض المقاس من قاعدة الأسماء الرسمية وصفحة صورة ناسا «إلى أعماق كبيرة».',
      },
      facts: [
        { k: 'terrain', en: 'An ancient impact structure; the deepest and broadest enclosed basin on Mars.', ar: 'بِنية اصطدام قديمة، وأعمق وأوسع حوض مقفول على المريخ.', src: ['hellas_pia'] },
      ],
      sources: ['gz_hellas', 'hellas_pia'],
    },
  ];

  // Spacecraft eras for the Landing Ellipse Lab (verified published ellipse sizes, km).
  // tech: legs (retro-rockets + landing legs), airbags, skycrane. trn: Terrain-Relative Navigation.
  var ERAS = [
    { id: 'viking', mission: { en: 'Viking 1 & 2', ar: 'فايكنج 1 و2' }, year: 1976, a: 280, b: 100, tech: 'legs', trn: false, src: 'viking_ellipse', note: { en: 'NASA: "174 miles by 62 miles", one value for both landers.', ar: 'ناسا: «174 ميل في 62 ميل»، نفس الرقم للمركبتين.' } },
    { id: 'pathfinder', mission: { en: 'Mars Pathfinder', ar: 'مارس باثفايندر' }, year: 1997, a: 200, b: 70, tech: 'airbags', trn: false, src: 'm2020_ellipse', note: { en: 'NASA: "124.3 miles by 43.5 miles (200 by 70 kilometers)".', ar: 'ناسا: «200 في 70 كيلومتر».' } },
    { id: 'spirit', mission: { en: 'Spirit', ar: 'سبيريت' }, year: 2004, a: 83, b: 10, tech: 'airbags', trn: false, src: 'spirit_ellipse', note: { en: 'NASA: about 83 km by 10 km. NSSDCA lists 96 by 19 km.', ar: 'ناسا: حوالي 83 في 10 كم. وقاعدة NSSDCA بتقول 96 في 19 كم.' } },
    { id: 'opportunity', mission: { en: 'Opportunity', ar: 'أوبورتيونيتي' }, year: 2004, a: 87, b: 11, tech: 'airbags', trn: false, src: 'opp_ellipse', note: { en: 'NASA: about 87 km long by 11 km wide.', ar: 'ناسا: حوالي 87 كم طول في 11 كم عرض.' } },
    { id: 'phoenix', mission: { en: 'Phoenix', ar: 'فينيكس' }, year: 2008, a: 100, b: 20, tech: 'legs', trn: false, src: 'phoenix_ellipse', note: { en: 'JPL (April 2008): about 100 by 20 km. It shrank further before landing.', ar: 'ناسا (أبريل 2008): حوالي 100 في 20 كم، وصغر أكتر قبل الهبوط.' } },
    { id: 'curiosity', mission: { en: 'Curiosity', ar: 'كيوريوسيتي' }, year: 2012, a: 20, b: 7, tech: 'skycrane', trn: false, src: 'gale_size', note: { en: 'NASA (June 2012): about 20 km by 7 km.', ar: 'ناسا (يونيو 2012): حوالي 20 في 7 كم.' } },
    { id: 'insight', mission: { en: 'InSight', ar: 'إنسايت' }, year: 2018, a: 130, b: 27, tech: 'legs', trn: false, src: 'insight_site', note: { en: 'NASA: about 130 km west-to-east and 27 km north-to-south.', ar: 'ناسا: حوالي 130 كم من الغرب للشرق و27 كم من الشمال للجنوب.' } },
    { id: 'perseverance', mission: { en: 'Perseverance', ar: 'برسيفيرانس' }, year: 2021, a: 7.7, b: 6.6, tech: 'skycrane', trn: true, src: 'm2020_ellipse', note: { en: 'NASA: 7.7 km by 6.6 km, plus Terrain-Relative Navigation to steer away from hazards.', ar: 'ناسا: 7.7 في 6.6 كم، ومعاها ملاحة بمقارنة التضاريس عشان تبعد عن الخطر.' } },
  ];

  // Landing regions (Ellipse mode). landers: real NASA landers with verified positions.
  // approx: true when NASA does not publish the exact position on the pages we checked.
  var REGIONS = [
    { id: 'gale', terrain: 'gale', name: { en: 'Gale Crater', ar: 'فوهة جيل' }, type: 'crater', target: { lat: -5.08, lon: 137.85, name: { en: 'Aeolis Mons ("Mount Sharp")', ar: 'إيوليس مونس («جبل شارب»)' }, src: 'gz_aeolis' },
      landers: [{ era: 'curiosity', lat: -4.5895, lon: 137.4417, date: '2012-08-06', approx: true, src: 'msl_landing_paper', note: { en: 'Position from Vasavada et al. 2014 (JGR Planets); NASA\'s mission page gives no coordinates.', ar: 'الموقع من بحث علمي منشور (Vasavada وزملاؤه 2014)، وصفحة ناسا ما فيهاش إحداثيات.' } }] },
    { id: 'jezero', terrain: 'jezero', name: { en: 'Jezero Crater', ar: 'فوهة جيزيرو' }, type: 'crater', target: { lat: 18.5, lon: 77.4, name: { en: 'the delta (western Jezero)', ar: 'الدلتا (غرب جيزيرو)' }, src: 'm2020_site', approx: true },
      landers: [{ era: 'perseverance', lat: 18.44, lon: 77.45, date: '2021-02-18', approx: true, src: 'm2020_site', note: { en: 'NASA states "about 18°N, 77°E"; the exact pin is approximate.', ar: 'ناسا بتقول «حوالي 18 شمال، 77 شرق»، والعلامة هنا تقريبية.' } }] },
    { id: 'gusev', terrain: 'gusev', name: { en: 'Gusev Crater', ar: 'فوهة جوسيف' }, type: 'crater', target: null,
      landers: [{ era: 'spirit', lat: -14.5692, lon: 175.4729, date: '2004-01-04', src: 'spirit_mission' }] },
    { id: 'meridiani', terrain: 'meridiani', name: { en: 'Meridiani Planum', ar: 'سهل ميريدياني' }, type: 'planum', gz: 3854, target: { lat: -2.28, lon: 354.80, name: { en: 'Endeavour crater', ar: 'فوهة إنديفور' }, src: 'gz_endeavour' },
      landers: [{ era: 'opportunity', lat: -1.946, lon: 354.473, date: '2004-01-25', src: 'opp_nssdc' }] },
    { id: 'elysium', terrain: 'elysium', name: { en: 'Elysium Planitia', ar: 'سهل إليزيوم' }, type: 'planitia', gz: 1784, target: null,
      landers: [{ era: 'insight', lat: 4.5, lon: 135.9, date: '2018-11-26', approx: true, src: 'insight_site', note: { en: 'Ellipse centre from NASA\'s press kit; the exact lander position is not shown on the NASA pages we checked.', ar: 'مركز القطع الناقص من ملف ناسا الصحفي، والموقع الدقيق مش مذكور في صفحات ناسا اللي راجعناها.' } }] },
    { id: 'chryse', terrain: 'chryse', name: { en: 'Chryse Planitia', ar: 'سهل كرايسي' }, type: 'planitia', gz: 1203, target: null,
      landers: [{ era: 'viking', label: { en: 'Viking 1', ar: 'فايكنج 1' }, lat: 22.27, lon: 312.05, date: '1976-07-20', src: 'viking1_nssdc' }, { era: 'pathfinder', lat: 19.33, lon: 326.45, date: '1997-07-04', src: 'pathfinder_nssdc', note: { en: 'In the Ares Vallis region near Chryse Planitia.', ar: 'في منطقة وادي آريس جنب سهل كرايسي.' } }] },
    { id: 'utopia', terrain: 'utopia', name: { en: 'Utopia Planitia', ar: 'سهل يوتوبيا' }, type: 'planitia', gz: 6260, target: null,
      landers: [{ era: 'viking', label: { en: 'Viking 2', ar: 'فايكنج 2' }, lat: 47.6673, lon: 134.2809, date: '1976-09-03', src: 'viking2_nssdc' }] },
    { id: 'phoenix', terrain: 'phoenix', name: { en: 'Vastitas Borealis (north polar plains)', ar: 'فاستيتاس بورياليس (السهول القطبية الشمالية)' }, type: 'region', target: null,
      landers: [{ era: 'phoenix', lat: 68.22, lon: 234.25, date: '2008-05-25', src: 'phoenix_mission' }] },
  ];

  // Informal mission landmarks: shown as small pins with a NASA caption, no profile, no recording.
  var LANDMARKS = [
    { id: 'eagle', region: 'meridiani', lat: -1.946, lon: 354.473, name: { en: '"Eagle" (informal name)', ar: '«إيجل» (اسم غير رسمي)' }, caption: { en: 'Opportunity bounced and rolled into this ~22 m crater when it landed. Not an official IAU name.', ar: 'أوبورتيونيتي نطّت واتدحرجت لجوه الفوهة الصغيرة دي (حوالي 22 م) وهي بتنزل. اسم مش رسمي.' }, src: 'opp_eagle' },
  ];

  var STATS = {
    edlMinutes: 7, entryKph: 19500, src: 'm2020_edl',
  };

  var byId = {};
  FEATURES.forEach(function (f) { byId[f.id] = f; });
  function get(id) { return byId[id] || null; }
  function region(id) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i]; return null; }
  function era(id) { for (var i = 0; i < ERAS.length; i++) if (ERAS[i].id === id) return ERAS[i]; return null; }
  function src(key) { return SOURCES[key] || null; }

  root.Craters = { FEATURES: FEATURES, ERAS: ERAS, REGIONS: REGIONS, LANDMARKS: LANDMARKS, SOURCES: SOURCES, IMAGES: IMAGES, STATS: STATS, get: get, region: region, era: era, src: src };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Craters;
})(typeof window !== 'undefined' ? window : globalThis);

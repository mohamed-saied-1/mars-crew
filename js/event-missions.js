// Historical NASA events paired with explicitly fictional, deterministic game scenarios.
(function (root) {
  'use strict';
  var sources = {
    rad: 'https://science.nasa.gov/resource/curiosity-sees-streaks-and-specks-during-2024-solar-storm/',
    radWind: 'https://science.nasa.gov/resource/curiosity-sees-specks-caused-by-a-solar-storm-while-recording-a-wind-gust-on-mars/',
    radData: 'https://data.nasa.gov/dataset/mars-science-laboratory-msl-radiation-assessment-detector-rad-level-2-observation-dosimetry',
    dust: 'https://www.jpl.nasa.gov/images/pia22737-mars-climate-sounder-studies-2018-dust-storm/',
    energy: 'https://science.nasa.gov/resource/on-mars-light-is-energy/',
    report: 'https://mars.nasa.gov/system/downloadable_items/41768_20180703_marsreport.pdf',
    motor: 'https://www.nasa.gov/missions/how-a-tiny-curiosity-motor-identified-a-massive-martian-dust-storm/',
  };
  var DATA = {
    radiation: {
      id: 'radiation-surge', titleKey: 'event_rad_title', subtitleKey: 'event_rad_sub', dateKey: 'event_rad_date',
      image: 'assets/event-rad2024.jpg', imageCredit: 'NASA/JPL-Caltech; Curiosity Navcam, May 20, 2024', imageObservationDate: '2024-05-20',
      source: sources.rad, sourceName: 'NASA Curiosity / PIA26302', instrument: 'Curiosity · Gale Crater · RAD',
      observationDate: '2024-05-20', location: 'Gale Crater, Mars', units: 'qualitative published event; no numerical dose displayed',
      observation: 'Curiosity navigation-camera images showed particle-hit streaks and specks; RAD registered the largest radiation surge of its mission since its 2012 landing.',
      limitation: 'Curiosity was an uncrewed rover. This game places a fictional outpost in a scenario inspired by the observation; its exposure and shelter outcomes are not NASA measurements.',
      source2: sources.radData, sourceWind: sources.radWind, gameLabel: 'GAME SIMULATION · EDUCATIONAL SIMPLIFICATION',
    },
    darkenedSky: {
      id: 'darkened-sky', titleKey: 'event_dust_title', subtitleKey: 'event_dust_sub', dateKey: 'event_dust_date',
      image: 'assets/event-duststorm.jpg', imageCredit: 'NASA/JPL-Caltech; Mars Climate Sounder / PIA22737', imageObservationDate: '2018-06-13',
      source: sources.dust, sourceName: 'NASA/JPL · PIA22737', instrument: 'MRO · Mars Climate Sounder (MCS)',
      observationDate: '2018-05 to 2018-09', location: 'Mars, planet-encircling dust event; NASA image marks Opportunity, while Gale Crater is not pinned in this frame.', units: 'Tau is atmospheric optical depth; Opportunity energy is watt-hours.',
      observation: 'MCS followed the global dust column as the storm grew from late May through September. NASA explains Tau 3 leaves about 5% of direct sunlight reaching the surface. On June 10, Opportunity had Tau 10.5 and 21 Wh available.',
      limitation: 'The Opportunity measurements are historical readings at the rover, not measurements at every place on Mars. Curiosity used a radioisotope power system; it did not lose solar power in this event.',
      source2: sources.energy, source3: sources.report, source4: sources.motor, gameLabel: 'GAME SIMULATION · EDUCATIONAL SIMPLIFICATION',
    },
  };
  var EN = {
    event_menu: 'Real NASA Event Missions', event_archive: 'Mission Archive', event_tagline: 'Explore real Mars events. Make choices in a clearly labeled outpost simulation.', event_back: 'Back to archive', event_learn: 'Learn the science', event_play: 'Play mission', event_evidence: 'NASA OBSERVED', event_sim: 'GAME SIMULATION', event_source: 'NASA source', event_instrument: 'Mission and instrument', event_observation: 'Historical observation', event_limit: 'What this does not tell us', event_challenge: 'Your challenge', event_rad_title: 'THE RADIATION SURGE', event_rad_sub: 'When charged particles reached Mars', event_rad_date: 'May 20, 2024', event_rad_summary: 'Curiosity saw charged-particle marks in camera images while RAD measured a mission-record surge.', event_rad_challenge: 'Prepare a fictional outpost crew and shelter during a simulated radiation alert.', event_rad_intro: 'NASA’s Curiosity rover recorded particle marks in its camera images as RAD measured a sharp radiation increase. Now help our fictional outpost crew make a safe plan.', event_rad_brief: 'Historical evidence: Curiosity at Gale Crater; the RAD instrument measured the largest radiation surge of its mission since landing in 2012. The evidence is qualitative here; we do not show an unverified dose curve.', event_rad_warning: 'Simulated warning from Mission Control: charged particles are on their way. Get the crew into the shelter before they arrive!', event_rad_alert: 'A fictional radiation alert is active. Move the crew into the shelter and use the existing water-wall protection.', event_rad_clear: 'The simulated alert has ended. Check the crew before resuming outdoor work.', event_rad_goal1: 'Keep the crew sheltered during the simulated alert', event_rad_goal2: 'Finish the short outpost shift', event_rad_success: 'Your crew sheltered during the alert. That is a successful simulation decision.', event_rad_failure: 'Some crew exposure occurred in the simulation. Review shelter timing and try again.', event_dust_title: 'THE DARKENED SKY', event_dust_sub: 'The 2018 Mars Global Dust Storm', event_dust_date: 'May–September 2018', event_dust_summary: 'MRO’s Mars Climate Sounder tracked a planet-encircling dust event that dimmed sunlight.', event_dust_challenge: 'Keep a fictional solar-powered outpost running as dust reduces sunlight.', event_dust_intro: 'A real global dust event darkened Mars. Choose how your fictional outpost gets power, then protect its essential systems as sunlight falls.', event_dust_brief: 'NASA’s MCS tracked the 2018 storm. Tau 3 means about 5% of direct sunlight reaches the surface. Opportunity recorded Tau 10.5 and 21 watt-hours on June 10, 2018. Curiosity used radioisotope power.', event_power_choice: 'Choose a power architecture (game units)', event_solar: 'Solar · Opportunity-inspired', event_solar_d: 'Sunlight and stored battery power. Storm haze lowers game solar generation.', event_rtg: 'Radioisotope · Curiosity-inspired', event_rtg_d: 'Steadier game power, independent of direct sunlight. A simplified comparison, not engineering specifications.', event_timeline: 'Historical storm timeline (qualitative)', event_stage_may: 'Late May · storm begins to grow', event_stage_june: 'June · spreads across Mars', event_stage_july: 'July · broad, severe event', event_stage_aug: 'August · storm begins to ease', event_stage_sept: 'September · gradual clearing', event_tau_fact: 'NASA says Tau 3 lets about 5% of direct sunlight reach the surface.', event_opp_fact: 'Opportunity, June 10, 2018: Tau 10.5; available energy 21 watt-hours.', event_dust_goal1: 'Keep air and food systems powered', event_dust_goal2: 'Complete the simulated storm shift', event_dust_success: 'Your architecture and power plan helped the outpost through the simulated storm.', event_dust_failure: 'The outpost ran short of resources in the simulation. Compare power choices and allocations, then try again.', event_debrief: 'Mission Debrief', event_historical: 'WHAT NASA OBSERVED', event_yours: 'WHAT HAPPENED IN YOUR SIMULATION', event_power_result: 'Selected architecture: {architecture}. Remaining battery: {battery} game units. Air and food: {life}. Science: {science}.', event_rad_result: 'Crew radiation indicator: {dose} game points. Time spent sheltered: {shelter} crew-seconds. These are simulated values, not RAD readings.', event_records: 'Mission record', event_resource_start: 'Starting battery: {battery} game units', event_back_title: 'Return to title', event_restart: 'Try again', event_rad_shelter_voice: 'dusty_fact_storm2024', event_dust_voice: 'dusty_fact_dustGlobal', event_stage_label: 'Timeline point', event_play_note: 'This playable outpost and its budgets are fictional simulations.', event_map_note: 'NASA global dust maps show atmospheric coverage, not individual landing hazards.', event_design_label: 'Power architecture', event_timeline_now: 'Storm timeline: {stage}', event_mission_started: 'Historical event mission started. The outpost situation is a simulation.', event_critical_shelter: 'Radiation alert! Move crew into the shelter now.', event_storm_worsens: 'The storm haze is thickening. Solar generation in this simulation is lower.', event_storm_eases: 'The historical storm gradually cleared. This simulation is entering its recovery phase.', event_nasa_refs: 'NASA references', event_about_data: 'Historical records are fixed local reference data, not live observations. No external API is needed.',
  };
  var AR = {
    event_menu: 'مهمات من أحداث ناسا الحقيقية', event_archive: 'أرشيف المهمات', event_tagline: 'اكتشف أحداثًا حقيقية على المريخ، واتخذ قرارات داخل محاكاة واضحة.', event_back: 'العودة إلى الأرشيف', event_learn: 'اكتشف العلوم', event_play: 'ابدأ المهمة', event_evidence: 'ما رصدته ناسا', event_sim: 'محاكاة اللعبة', event_source: 'مصدر ناسا', event_instrument: 'المهمة والجهاز', event_observation: 'الرصد التاريخي', event_limit: 'ما الذي لا يخبرنا به هذا؟', event_challenge: 'مهمتك', event_rad_title: 'اندفاع الإشعاع', event_rad_sub: 'عندما وصلت جسيمات مشحونة إلى المريخ', event_rad_date: '٢٠ مايو ٢٠٢٤', event_rad_summary: 'رصدت كاميرا كيوريوسيتي آثار جسيمات مشحونة، وسجّل RAD أكبر زيادة إشعاعية في تاريخ مهمته.', event_rad_challenge: 'جهّز طاقم قاعدة خيالية واحمه أثناء إنذار إشعاعي محاكى.', event_rad_intro: 'سجّلت كاميرا كيوريوسيتي آثار جسيمات، بينما رصد RAD زيادة كبيرة في الإشعاع. ساعد الآن طاقم قاعدتنا الخيالية على وضع خطة آمنة.', event_rad_brief: 'الدليل التاريخي: كيوريوسيتي في فوهة غيل؛ سجّل RAD أكبر زيادة إشعاعية في مهمته منذ هبوطه عام ٢٠١٢. نعرض الدليل وصفياً فقط ولا نخترع منحنى جرعة.', event_rad_warning: 'تحذير محاكى من مركز التحكم: جسيمات مشحونة في الطريق. ادخلوا الطاقم الملجأ قبل وصولها!', event_rad_alert: 'الإنذار الإشعاعي المحاكى نشط. انقل الطاقم إلى الملجأ واستخدم حماية جدار الماء الموجودة في اللعبة.', event_rad_clear: 'انتهى الإنذار المحاكى. افحص الطاقم قبل استئناف العمل خارج القاعدة.', event_rad_goal1: 'أبقِ الطاقم في الملجأ أثناء الإنذار المحاكى', event_rad_goal2: 'أكمل نوبة القاعدة القصيرة', event_rad_success: 'احتمى الطاقم أثناء الإنذار. كان هذا قرارًا جيدًا في المحاكاة.', event_rad_failure: 'تعرّض بعض الطاقم للإشعاع في المحاكاة. راجع توقيت دخول الملجأ وحاول ثانية.', event_dust_title: 'السماء المعتمة', event_dust_sub: 'عاصفة الغبار العالمية على المريخ عام ٢٠١٨', event_dust_date: 'مايو–سبتمبر ٢٠١٨', event_dust_summary: 'تابع جهاز MCS على مدار المريخ عاصفةً غبارية حجبت ضوء الشمس.', event_dust_challenge: 'حافظ على قاعدة خيالية تعمل بالطاقة الشمسية مع انخفاض ضوء الشمس.', event_dust_intro: 'أظلمت عاصفة غبارية حقيقية سماء المريخ. اختر مصدر طاقة قاعدتك الخيالية، ثم حافظ على الأنظمة المهمة مع انخفاض ضوء الشمس.', event_dust_brief: 'تابع جهاز MCS عاصفة ٢٠١٨. عند Tau 3 يصل نحو ٥٪ من ضوء الشمس المباشر إلى السطح. وفي ١٠ يونيو سجّل Opportunity قيمة Tau 10.5 وطاقة 21 واط-ساعة. استخدم Curiosity طاقة النظائر المشعة.', event_power_choice: 'اختر نظام الطاقة (وحدات اللعبة)', event_solar: 'شمسي · مستوحى من Opportunity', event_solar_d: 'ضوء الشمس وبطارية تخزين. تقلل العاصفة إنتاج الطاقة الشمسي في اللعبة.', event_rtg: 'نظائر مشعة · مستوحى من Curiosity', event_rtg_d: 'طاقة أكثر ثباتًا في اللعبة ولا تعتمد بالطريقة نفسها على ضوء الشمس. مقارنة مبسطة وليست مواصفات هندسية.', event_timeline: 'الخط الزمني التاريخي للعاصفة (وصفي)', event_stage_may: 'أواخر مايو · بداية نمو العاصفة', event_stage_june: 'يونيو · انتشارها عبر المريخ', event_stage_july: 'يوليو · اتساع العاصفة وشدتها', event_stage_aug: 'أغسطس · بداية تراجع العاصفة', event_stage_sept: 'سبتمبر · انقشاع تدريجي', event_tau_fact: 'توضح ناسا أن Tau 3 يسمح بوصول نحو ٥٪ من ضوء الشمس المباشر إلى السطح.', event_opp_fact: 'Opportunity، ١٠ يونيو ٢٠١٨: ‏Tau 10.5؛ والطاقة المتاحة 21 واط-ساعة.', event_dust_goal1: 'حافظ على تشغيل نظامي الهواء والغذاء', event_dust_goal2: 'أكمل نوبة العاصفة المحاكاة', event_dust_success: 'ساعد اختيار نظام الطاقة وخطتك القاعدة على تجاوز العاصفة المحاكاة.', event_dust_failure: 'نفدت موارد القاعدة في المحاكاة. قارن اختيارات الطاقة والتوزيع، ثم حاول ثانية.', event_debrief: 'تقرير المهمة', event_historical: 'ما رصدته ناسا', event_yours: 'ما حدث في محاكاتك', event_power_result: 'نظام الطاقة: {architecture}. البطارية المتبقية: {battery} وحدات لعبة. الهواء والغذاء: {life}. العلم: {science}.', event_rad_result: 'مؤشر الإشعاع للطاقم: {dose} نقاط لعبة. وقت الاحتماء: {shelter} ثانية طاقم. هذه قيم محاكاة وليست قياسات RAD.', event_records: 'سجل المهمة', event_resource_start: 'البطارية عند البداية: {battery} وحدات لعبة', event_back_title: 'العودة إلى العنوان', event_restart: 'حاول ثانية', event_rad_shelter_voice: 'dusty_fact_storm2024', event_dust_voice: 'dusty_fact_dustGlobal', event_stage_label: 'نقطة في الخط الزمني', event_play_note: 'القاعدة القابلة للعب ومواردها محاكاة خيالية.', event_map_note: 'خرائط ناسا العالمية تصف الغبار الجوي، ولا تحدد أخطار الهبوط الفردية.', event_design_label: 'نظام الطاقة', event_timeline_now: 'الخط الزمني للعاصفة: {stage}', event_mission_started: 'بدأت مهمة الحدث التاريخي. حالة القاعدة محاكاة.', event_critical_shelter: 'إنذار إشعاعي! انقل الطاقم إلى الملجأ الآن.', event_storm_worsens: 'يزداد الغبار في الجو. إنتاج الطاقة الشمسية في المحاكاة أقل.', event_storm_eases: 'بدأت العاصفة التاريخية تنقشع تدريجيًا. تدخل المحاكاة مرحلة التعافي.', event_nasa_refs: 'مصادر ناسا', event_about_data: 'هذه مراجع تاريخية ثابتة محليًا وليست مشاهدات مباشرة. لا تحتاج اللعبة إلى اتصال خارجي.',
  };

  Object.assign(EN, {
    event_rad_img_alt: 'NASA Curiosity navigation-camera image showing streaks and specks caused by charged particles on May 20, 2024.', event_dust_img_alt: 'NASA visualization of Mars Climate Sounder observations of the 2018 global dust storm.', event_particle_alt: 'Scientific illustration: particles travel from the Sun toward Mars.', event_illustration_label: 'Scientific illustration · not a direct measurement', event_rad_limit: 'This is not a G5 geomagnetic storm report, a flare-class reading, or a human crew exposure record. The shelter and dose indicator are game simplifications.', event_dust_limit: 'The game uses labeled power units to demonstrate the design trade-off. These values are not Opportunity or Curiosity engineering specifications.', event_success_title: 'Outpost shift complete', event_retry_title: 'Let’s plan another try', event_decision_record: 'Crew role: {role}. End of shift: air and food {life}; battery {battery}; daily allocation (life / plants / shield / science): {allocation}.', event_rad_failure_detail: 'Crew exposure time in this game simulation: {exposure} seconds.', event_resource_consumed: 'Water used: {water} game units. Current water-wall strength: {wall} game points.', event_crew_role: 'Choose your crew role', event_role_engineer: 'Engineer · repairs and equipment', event_role_doctor: 'Doctor · shelter and crew health', event_role_farmer: 'Farmer · plants and food'
  });
  Object.assign(AR, {
    event_rad_img_alt: 'صورة من كاميرا كيوريوسيتي أظهرت خطوطًا ونقاطًا سببتها جسيمات مشحونة في ٢٠ مايو ٢٠٢٤.', event_dust_img_alt: 'تصور ناسا لرصد جهاز MCS لعاصفة الغبار العالمية عام ٢٠١٨.', event_particle_alt: 'رسم علمي توضيحي: جسيمات تنتقل من الشمس نحو المريخ.', event_illustration_label: 'رسم علمي توضيحي · ليس قياسًا مباشرًا', event_rad_limit: 'هذا ليس تقريرًا عن عاصفة مغناطيسية أرضية G5، ولا تصنيف توهج شمسي، ولا سجل تعرض طاقم بشري. مؤشر الجرعة والملجأ تبسيطان في اللعبة.', event_dust_limit: 'تستخدم اللعبة وحدات طاقة توضيحية لشرح الاختيار. هذه الوحدات ليست مواصفات هندسية لـ Opportunity أو Curiosity.', event_success_title: 'انتهت نوبة القاعدة', event_retry_title: 'لنخطط لمحاولة أخرى', event_decision_record: 'دور الطاقم: {role}. نهاية النوبة: الهواء والغذاء {life}؛ البطارية {battery}؛ توزيع اليوم (الحياة / النباتات / الحماية / العلم): {allocation}.', event_rad_failure_detail: 'وقت تعرض الطاقم في محاكاة اللعبة: {exposure} ثانية.', event_resource_consumed: 'المياه المستخدمة: {water} وحدات لعبة. قوة جدار الماء الحالية: {wall} نقطة لعبة.', event_crew_role: 'اختر دورك في الطاقم', event_role_engineer: 'المهندس · إصلاح المعدات', event_role_doctor: 'الطبيب · الملجأ وصحة الطاقم', event_role_farmer: 'المزارع · النباتات والغذاء'
  });
  EN.event_dust_locations = 'Opportunity is the red diamond on the NASA image. Curiosity explored Gale Crater at a separate site; NASA does not mark Gale in this still.';
  AR.event_dust_locations = 'تظهر Opportunity بالماسة الحمراء في صورة ناسا. استكشفت Curiosity فوهة غيل في موقع آخر؛ ولا تحدد ناسا غيل في هذه الصورة.';
  Object.keys(EN).forEach(function (key) { root.I18N.tables.en[key] = EN[key]; root.I18N.tables.ar[key] = AR[key] || EN[key]; });

  function levels(id, power) {
    if (id === 'radiation') return {
      id: 'event_radiation', eventId: 'radiation', role: 'engineer', plan: true, early: false,
      // Robot teammates skip outdoor jobs here: the alert has no warning, and a robot caught
      // outside made the shelter goal impossible for the default Doctor role.
      track: ['clean', 'sample', 'drill'],
      diff: { sols: 1, dayLen: 105, meteors: 0, leak: 0, devil: 0, failChance: 0, science: 0, hints: true, suit: 100, doseScale: 1 },
      goals: [
        { key: 'event_rad_goal1', n: function (g) { return g.eventStats && g.eventStats.alertEnded && g.eventStats.exposedSeconds < 18 ? 1 : 0; } },
        { key: 'event_rad_goal2', n: function (g) { return g.t >= g.dayLen ? 1 : 0; } },
      ],
      star2: { key: 'event_rad_goal1', ok: function (g) { return g.eventStats && g.eventStats.exposedSeconds < 8; } },
      setup: function (g) { g.eventStats = { startBattery: g.power.battery, startWater: 60, exposedSeconds: 0, shelteredSeconds: 0, warned: false, alertEnded: false, activitiesSuspended: 0 }; g.eventRadiation = { active: false, doseRate: 0.22 }; g.eventId = id; g.alert = null; g.wall = 45; g.water = 60; },
      tick: function (g, dt) {
        var s = g.eventStats;
        // A simulated Mission Control warning at t 3 gives the crew 6 seconds to reach the shelter
        // before particles "arrive" at t 9. It uses the game's existing 'warned' alert state, so
        // robots head to the shelter and the arrow points there. Exposure counts only while active.
        if (!s.warned && !g.eventRadiation.active && !s.alertEnded && g.t >= 3) {
          s.warned = true; g.alert = 'warned'; g.emit('eventRadiationWarning', { date: '2024-05-20', arrivesIn: 6 });
        }
        // The simulated alert runs once (t 9 to 50); it must not re-arm after it has ended.
        if (!g.eventRadiation.active && !s.alertEnded && g.t >= 9) { g.eventRadiation.active = true; g.alert = 'active'; g.emit('eventRadiationStart', { date: '2024-05-20' }); }
        if (g.eventRadiation.active) {
          g.crew.engineer.zone === 'shelter' ? s.shelteredSeconds += dt : s.exposedSeconds += dt;
          g.crew.farmer.zone === 'shelter' ? s.shelteredSeconds += dt : s.exposedSeconds += dt;
          g.crew.doctor.zone === 'shelter' ? s.shelteredSeconds += dt : s.exposedSeconds += dt;
          if (g.t >= 50) { g.eventRadiation.active = false; g.alert = null; s.alertEnded = true; g.emit('eventRadiationClear', { date: '2024-05-20' }); }
        }
      },
      fail: function (g) { return g.eventStats && g.eventStats.exposedSeconds >= 30 ? 'event_rad_failure' : null; },
    };
    return {
      id: 'event_dark_sky', eventId: 'darkenedSky', role: 'engineer', plan: true, early: false,
      eventPowerMode: power || 'solar', eventPowerUnits: 8,
      diff: { sols: 1, dayLen: 105, meteors: 0, leak: 0, devil: 0, failChance: 0, science: 0, hints: true, suit: 100, dustScale: 0.15 },
      goals: [
        { key: 'event_dust_goal1', n: function (g) { return g.life >= 35 ? 1 : 0; } },
        { key: 'event_dust_goal2', n: function (g) { return g.t >= g.dayLen ? 1 : 0; } },
      ],
      star2: { key: 'event_dust_goal1', ok: function (g) { return g.power.battery >= 2 && g.life >= 50; } },
      setup: function (g) { g.eventId = id; g.eventStats = { startBattery: g.power.battery, startWater: g.water, solarArchitecture: (power || 'solar') === 'solar', scienceOperations: 0, communicationDecision: g.alloc.science > 0 }; g.dustStorm = 1; g.eventDustStage = 0; g.eventDustTransmission = 0.8; g.power.solar = g.solarToday(); },
      tick: function (g) {
        var stage = g.t < 18 ? 0 : g.t < 38 ? 1 : g.t < 65 ? 2 : g.t < 84 ? 3 : 4;
        if (stage !== g.eventDustStage) {
          g.eventDustStage = stage;
          g.eventDustTransmission = [0.8, 0.62, 0.5, 0.58, 0.72][stage];
          g.power.solar = g.solarToday();
          g.emit('eventDustStage', { stage: stage });
        }
      },
      fail: function (g) { return g.life <= 20 ? 'event_dust_failure' : null; },
    };
  }

  root.NASAEventMissions = { DATA: DATA, SOURCES: sources, createLevel: levels };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NASAEventMissions;
})(typeof window !== 'undefined' ? window : globalThis);

// DOM screens: menus, power plan, choices, reports, learn cards and the science lab.
(function (root) {
  'use strict';

  var t = function (k, v) { return root.I18N.t(k, v); };
  var NASA = root.NASA, SolCrew = root.SolCrew, Art = root.Art;
  var ROLES = SolCrew.ROLES, DIALS = SolCrew.DIALS, RULES = SolCrew.RULES;
  var screen = null, stopLab = null, dustyWidget = null, dustyCanvas = null, dustyText = null, dustyMoreText = null, dustyMoreButton = null;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid == null) return;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  function ic(name, size) {
    var src = Art.icon(name), cv = Art.canvas(src.width, src.height);
    cv.getContext('2d').drawImage(src, 0, 0);
    cv.className = 'icon';
    cv.style.width = (size || 22) + 'px';
    cv.style.height = (size || 22) + 'px';
    return cv;
  }

  function portrait(who, size) {
    size = size || 72;
    var cv;
    if (who === 'dusty' && root.DustyAvatar) {
      // A live canvas: Dusty keeps blinking, reacting and talking on every screen.
      cv = document.createElement('canvas');
      cv.className = 'portrait dusty-avatar';
      cv.style.width = size + 'px';
      cv.style.height = size + 'px';
      cv.setAttribute('aria-hidden', 'true');
      root.DustyAvatar.mount(cv, { mode: 'portrait', background: true });
      return cv;
    }
    if (root.CrewAvatar && root.CrewAvatar.ROLES[who]) {
      // Crew portraits are drawn at the screen's pixel density, so they stay sharp.
      var dpr = Math.min(3, root.devicePixelRatio || 1), px = Math.max(48, Math.round(size * dpr));
      cv = Art.canvas(px, px);
      root.CrewAvatar.portrait(cv.getContext('2d'), who, 0, 0, px, { expression: 'smiling' });
      cv.className = 'portrait crew-portrait';
      cv.style.width = size + 'px';
      cv.style.height = size + 'px';
      return cv;
    }
    var src = Art.portrait(who);
    cv = Art.canvas(48, 48);
    cv.getContext('2d').drawImage(src, 0, 0);
    cv.className = 'portrait';
    cv.style.width = size + 'px';
    cv.style.height = size + 'px';
    return cv;
  }

  function show(mode, node) {
    if (stopLab) { stopLab(); stopLab = null; }
    screen.className = mode;
    screen.textContent = '';
    if (node) screen.appendChild(node);
    screen.scrollTop = 0;
  }

  function clear() { show('', null); }

  function choice(title, sub, on, click) {
    return h('button', { class: 'choice' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false', onclick: click }, [
      h('strong', { text: title }), h('span', { text: sub }),
    ]);
  }

  function voiceStatusKey() {
    if (!root.Voice || !root.Voice.isSupported()) return 'voice_status_unsupported';
    if (!root.Voice.isEnabled()) return 'voice_status_off';
    var status = root.Voice.availability();
    if (status === 'playing' || status === 'ready') status = 'available';
    if (status === 'english-missing') status = 'english_missing';
    if (status === 'locked') status = 'locked';
    return 'voice_status_' + status;
  }
  function voiceControls(app) {
    return h('div', { class: 'dusty-voice-controls' }, [
      h('button', { type: 'button', 'data-voice-toggle': '', 'aria-pressed': root.Voice && root.Voice.isEnabled() ? 'true' : 'false', text: t('voice_setting') + ': ' + t(root.Voice && root.Voice.isEnabled() ? 'on' : 'off'), onclick: function () { app.toggleVoice(); } }),
      h('button', { type: 'button', 'data-voice-replay': '', text: t('voice_replay'), disabled: !root.Voice || !root.Voice.hasReplay() || !root.Voice.hasLanguage(), onclick: function () { app.replayVoice(); } }),
      h('button', { type: 'button', text: t('voice_stop'), onclick: function () { app.stopVoice(); } }),
      h('label', { class: 'voice-volume' }, [h('span', { text: t('voice_volume') }), h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: root.Voice ? root.Voice.getVolume() : 1, 'aria-label': t('voice_volume'), 'data-voice-volume': '', oninput: function (e) { app.setVoiceVolume(e.target.value); } })]),
      h('small', { class: 'dusty-voice-status', role: 'status', 'aria-live': 'polite', 'data-voice-status': '', text: t(voiceStatusKey()) }),
    ]);
  }
  function listenButton(app, text, key, voiceId) {
    return h('button', { type: 'button', text: t('voice_listen'), onclick: function () { app.speakText(text, key || 'listen:' + text, 30, voiceId); } });
  }
  function updateVoiceControls() {
    if (!screen) return;
    Array.prototype.forEach.call(screen.querySelectorAll('[data-voice-status]'), function (el) { el.textContent = t(voiceStatusKey()); });
    Array.prototype.forEach.call(screen.querySelectorAll('[data-voice-toggle]'), function (el) {
      el.setAttribute('aria-pressed', root.Voice && root.Voice.isEnabled() ? 'true' : 'false');
      el.textContent = t('voice_setting') + ': ' + t(root.Voice && root.Voice.isEnabled() ? 'on' : 'off');
    });
    Array.prototype.forEach.call(screen.querySelectorAll('[data-voice-replay]'), function (el) { el.disabled = !root.Voice || !root.Voice.hasReplay() || !root.Voice.hasLanguage(); });
    Array.prototype.forEach.call(screen.querySelectorAll('[data-voice-volume]'), function (el) { el.value = root.Voice ? root.Voice.getVolume() : 1; });
    if (dustyWidget) updateDustyWidgetControls();
  }

  function updateDustyWidgetControls() {
    if (!dustyWidget) return;
    var voice = root.Voice, enabled = voice && voice.isEnabled();
    dustyWidget.querySelector('[data-dusty-replay]').textContent = t('voice_replay');
    dustyWidget.querySelector('[data-dusty-replay]').disabled = !voice || !voice.hasReplay() || !voice.hasLanguage();
    dustyWidget.querySelector('[data-dusty-stop]').textContent = t('voice_stop');
    dustyWidget.querySelector('[data-dusty-volume-label]').textContent = t('voice_volume');
    dustyWidget.querySelector('[data-dusty-volume]').setAttribute('aria-label', t('voice_volume'));
    dustyWidget.querySelector('[data-dusty-voice]').textContent = t('voice_setting') + ': ' + t(enabled ? 'on' : 'off');
    dustyWidget.querySelector('[data-dusty-voice]').setAttribute('aria-pressed', enabled ? 'true' : 'false');
    var status = voice ? voice.availability() : 'unsupported';
    if (status === 'playing' || status === 'ready') status = 'available';
    if (status === 'english-missing') status = 'english_missing';
    var statusKey = !voice || !voice.isSupported() ? 'voice_status_unsupported' : !enabled ? 'voice_status_off' : 'voice_status_' + status;
    dustyWidget.querySelector('[data-dusty-status]').textContent = t(statusKey);
    var volume = dustyWidget.querySelector('[data-dusty-volume]');
    if (volume) volume.value = voice ? voice.getVolume() : 1;
    dustyWidget.setAttribute('aria-label', t('dusty_companion_label'));
    dustyWidget.querySelector('[data-dusty-collapse]').textContent = t(dustyWidget.dataset.collapsed === 'true' ? 'dusty_expand' : 'dusty_collapse');
    dustyWidget.querySelector('[data-dusty-collapse]').setAttribute('aria-expanded', dustyWidget.dataset.collapsed !== 'true' ? 'true' : 'false');
    if (dustyMoreButton) dustyMoreButton.textContent = t('dusty_more');
  }

  function setDustyMessage(text) {
    if (!dustyText) return;
    var changed = dustyText.textContent !== (text || '');
    dustyText.textContent = text || '';
    dustyWidget.classList.toggle('has-message', !!text);
    // Dusty glances up at the speech bubble when a new message appears.
    if (changed && text && root.DustyAvatar && dustyWidget.dataset.collapsed !== 'true') root.DustyAvatar.lookAt(-0.35, -0.75, 900);
  }

  function updateDustyWidget(app) {
    if (!dustyWidget) return;
    dustyWidget.dir = root.I18N.lang === 'ar' ? 'rtl' : 'ltr';
    dustyWidget.dataset.welcoming = app.dustyGreetingPlaying ? 'true' : 'false';
    if (dustyText.textContent !== (app.dustyMessage || '')) setDustyMessage(app.dustyMessage);
    // app.dustyTopic is already a lesson id (main.js maps actions through Guide.TASK_LESSON).
    var topic = app.dustyTopic || null;
    dustyMoreButton.hidden = !topic;
    if ((dustyMoreText.dataset.topic || null) !== topic) {
      dustyMoreText.hidden = true;
      if (topic) { dustyMoreText.dataset.topic = topic; dustyMoreText.textContent = root.Guide.shortLesson(topic); }
      else { delete dustyMoreText.dataset.topic; dustyMoreText.textContent = ''; }
    }
    // Advances Dusty's shared animation and repaints every visible Dusty canvas.
    if (root.DustyAvatar) root.DustyAvatar.frame();
  }

  function factBox(id, isNew) {
    var f = NASA.FACTS[id], src = NASA.SOURCES[f.src];
    return h('div', { class: 'fact' }, [
      h('h3', {}, [ic('book', 20), ' ', isNew ? t('report_new') : t('report_fact')]),
      h('p', { text: t(f.key) }),
      h('small', {}, [t('report_source') + ': ', h('a', { href: src.url, target: '_blank', rel: 'noopener', text: src.name })]),
    ]);
  }

  // A full-body crew canvas (96x128, the 3:4 sprite box). pose/expression are optional.
  function roleCanvas(role, pose, expression) {
    var src = pose && Art.crewSprite ? Art.crewSprite(role, 'down', 0, false, null, pose, expression) : Art.sprite(role, 'down', 0, false);
    var cv = Art.canvas(src.width, src.height);
    cv.getContext('2d').drawImage(src, 0, 0);
    cv.classList.add('crew-figure');
    return cv;
  }

  // ---- Menus --------------------------------------------------------------
  function title(app) {
    var live = app.live, sun;
    if (app.liveChecked === false) sun = [h('span', { text: t('sun_loading') })];
    else if (live && live.latest) {
      sun = [
        h('strong', { text: t('sun_now') + ': ' }),
        t('sun_line', { cls: live.latest.cls, time: live.latest.begin.slice(11, 16) }),
        h('br'), h('small', { text: t('sun_src', { src: live.source }) }),
      ];
    } else sun = [h('span', { text: t('sun_offline') })];

    show('menu', h('div', { class: 'title-wrap' }, [
      h('h1', { text: t('title') }),
      h('p', { class: 'tagline', text: t('tagline') }),
      h('section', { class: 'featured-event-entry' }, [
        h('p', { class: 'featured-event-kicker', text: t('event_evidence') }),
        h('button', { class: 'event-menu-button', type: 'button', onclick: function () { app.openEventArchive(); } }, [ic('rad', 28), ' ', h('span', { text: t('event_menu') })]),
        h('p', { class: 'featured-event-caption', text: t('event_tagline') }),
      ]),
      h('div', { class: 'stack' }, [
        h('button', { class: 'primary big', type: 'button', onclick: function () { app.go('academy'); } }, [
          h('span', { class: 'btn-main', text: t('academy') }), h('span', { class: 'btn-sub', text: t('academy_sub') }),
        ]),
        h('button', { class: 'primary big alt', type: 'button', onclick: function () { app.go('setup'); } }, [
          h('span', { class: 'btn-main', text: t('play') }), h('span', { class: 'btn-sub', text: t('play_sub') }),
        ]),
        h('button', { class: 'primary big landing-lab-button', type: 'button', onclick: function () { app.go('landingLab'); } }, [
          h('span', { class: 'btn-main', text: t('ll_menu') }), h('span', { class: 'btn-sub', text: t('ll_menu_sub') }),
        ]),
        h('button', { type: 'button', text: t('howto'), onclick: function () { app.go('howto'); } }),
        h('button', { type: 'button', onclick: function () { app.go('lab'); } }, [ic('book', 20), ' ' + t('lab')]),
        h('button', { type: 'button', text: t('dataroom'), onclick: function () { app.go('data'); } }),
        h('div', { class: 'row', style: 'justify-content:center' }, [
          h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } }),
          h('button', { type: 'button', text: t('sound') + ': ' + t(app.sound ? 'on' : 'off'), onclick: function () { app.toggleSound(); } }),
          h('button', { type: 'button', text: t('music') + ': ' + t(app.music ? 'on' : 'off'), onclick: function () { app.toggleMusic(); } }),
          voiceControls(app),
        ]),
      ]),
      h('div', { class: 'sun-now' }, sun),
    ]));
  }

  function seasonList(app) {
    var list = ['aug2026', 'jan2025', 'feb2026', 'quiet2016'].map(function (id) { return root.DONKI_ARCHIVE[id]; });
    if (app.live) list.unshift(app.live);
    return list;
  }

  function setup(app) {
    var s = app.settings;
    var players = [1, 2, 3, 4].map(function (n) {
      return choice(t('p' + n), t('p' + n + 'd2'), s.players === n, function () { s.players = n; setup(app); });
    });
    var diffs = ['cadet', 'engineer', 'commander'].map(function (d) {
      var D = SolCrew.DIFFICULTY[d];
      return choice(t('d_' + d), t('d_' + d + 'd', { sols: D.sols }), s.diff === d, function () {
        s.diff = d; s.season = D.season; setup(app);
      });
    });
    var suns = null;
    if (app.showSuns) {
      suns = h('div', { class: 'grid' }, seasonList(app).map(function (se) {
        var sub = se.live ? t('season_live_d', { n: se.totalFlares, src: se.source }) : t('seasond', { n: se.totalFlares, from: se.start, to: se.end });
        return h('div', {}, [
          choice(t('season_' + se.id), sub, s.season === se.id, function () { s.season = se.id; setup(app); }),
          h('span', { class: 'badge ' + (se.live ? 'live' : 'saved'), text: se.live ? 'LIVE' : 'SAVED' }),
        ]);
      }));
    }
    var classMode = h('div', { class: 'grid' }, [
      choice(t('class_off'), t('class_off_d'), !s.classroom, function () { app.setClassroom(false); setup(app); }),
      choice(t('class_on'), t('class_on_d'), !!s.classroom, function () { app.setClassroom(true); setup(app); }),
    ]);
    show('menu', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('setup') }),
      h('h3', { text: t('how_many') }), h('div', { class: 'grid' }, players),
      h('h3', { text: t('pick_diff') }), h('div', { class: 'grid' }, diffs),
      h('h3', { text: t('class_title') }), classMode,
      h('button', { class: 'link', type: 'button', text: (app.showSuns ? '▾ ' : '▸ ') + t('more_sun'), onclick: function () { app.showSuns = !app.showSuns; setup(app); } }),
      suns,
      h('div', { class: 'row end' }, [
        h('button', { type: 'button', text: t('back'), onclick: function () { app.go('title'); } }),
        h('button', { class: 'primary', type: 'button', text: t('next_btn'), onclick: function () { app.go('roles'); } }),
      ]),
    ]));
  }

  function eventArchive(app) {
    var data = root.NASAEventMissions.DATA;
    var cards = ['radiation', 'darkenedSky'].map(function (id, index) {
      var item = data[id];
      var summary = id === 'radiation' ? 'event_rad_summary' : 'event_dust_summary';
      var challenge = id === 'radiation' ? 'event_rad_challenge' : 'event_dust_challenge';
      var sources = id === 'radiation' ? [[item.source, item.sourceName], [item.source2, 'NASA RAD archival data']] : [[item.source, item.sourceName], [item.source2, 'NASA · On Mars, Light Is Energy'], [item.source3, 'NASA Mars Report · July 3, 2018']];
      if (item.sourceWind) sources.push([item.sourceWind, 'NASA Curiosity wind-gust image']);
      if (item.source4) sources.push([item.source4, 'NASA Curiosity motor and dust-storm explanation']);
      return h('article', { class: 'event-card event-card-' + id }, [
        h('div', { class: 'event-card-image' }, [h('img', { src: item.image, alt: t(id === 'radiation' ? 'event_rad_img_alt' : 'event_dust_img_alt'), loading: 'lazy' }), h('span', { class: 'badge real', text: t('event_evidence') })]),
        h('div', { class: 'event-card-copy' }, [
          h('small', { class: 'event-date', text: t(item.dateKey) }),
          h('h2', { text: t(item.titleKey) }), h('p', { class: 'event-subtitle', text: t(item.subtitleKey) }),
          h('p', { text: t(summary) }), h('p', { text: t(challenge) }),
          h('p', { class: 'muted', text: item.instrument }),
          h('details', { class: 'event-learn' }, [h('summary', { text: t('event_learn') }),
            h('p', { text: t(id === 'radiation' ? 'event_rad_brief' : 'event_dust_brief') }),
            h('small', { class: 'muted', text: item.imageCredit }),
            h('ul', { class: 'clean' }, sources.map(function (source) { return h('li', {}, [h('a', { href: source[0], target: '_blank', rel: 'noopener', text: source[1] })]); })),
            id === 'darkenedSky' ? h('p', { class: 'muted', text: t('event_map_note') }) : null,
          ]),
          h('button', { class: 'primary event-play', type: 'button', onclick: function () { app.openEventBrief(id); } }, [ic('star', 21), ' ' + t('event_play')]),
        ]),
      ]);
    });
    show('menu', h('div', { class: 'box wide event-archive' }, [
      h('header', { class: 'event-archive-head' }, [h('div', {}, [h('p', { class: 'event-kicker', text: 'MARS CREW · NASA HISTORY ARCHIVE' }), h('h1', { text: t('event_archive') }), h('p', { text: t('event_tagline') })]), portrait('dusty', 96)]),
      h('div', { class: 'event-grid' }, cards),
      h('p', { class: 'muted event-offline-note', text: t('event_about_data') }),
      h('div', { class: 'row end' }, [h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } }), h('button', { type: 'button', text: t('back'), onclick: function () { app.exitEventArchive(); } })]),
    ]));
    screen.classList.add('event-mode');
  }

  function eventBrief(app, id) {
    var item = root.NASAEventMissions.DATA[id], radiation = id === 'radiation';
    var learn = h('section', { class: 'event-evidence' }, [
      h('p', { class: 'badge real', text: t('event_evidence') }), h('h2', { text: t(item.titleKey) }),
      h('div', { class: 'event-evidence-grid' }, [
        h('figure', { class: 'event-evidence-image' }, [h('img', { src: item.image, alt: t(radiation ? 'event_rad_img_alt' : 'event_dust_img_alt') }), h('figcaption', { text: item.imageCredit + ' · ' + item.imageObservationDate })]),
        h('div', {}, [h('p', { class: 'event-date', text: t(item.dateKey) }), h('p', { text: t(item.instrument) }), h('p', { text: t(radiation ? 'event_rad_brief' : 'event_dust_brief') }),
          radiation ? h('div', { class: 'particle-illustration', role: 'img', 'aria-label': t('event_particle_alt') }, [
            h('span', { class: 'particle-sun', text: '☀' }), h('i', { class: 'particle-path p1' }), h('i', { class: 'particle-path p2' }), h('span', { class: 'particle-mars', text: 'MARS' }), h('small', { text: t('event_illustration_label') }),
          ]) : dustTimeline(),
        ]),
      ]),
      h('p', { class: 'event-sim-label badge game', text: t('event_sim') }),
      h('p', { text: t(radiation ? 'event_rad_challenge' : 'event_dust_challenge') }),
      h('p', { class: 'muted', text: t(radiation ? 'event_rad_limit' : 'event_dust_limit') }),
      h('section', { class: 'event-role-picker' }, [h('strong', { text: t('event_crew_role') }), h('div', { class: 'event-role-choices' }, ['engineer', 'doctor', 'farmer'].map(function (role) {
        return choice(t('role_' + role), t('event_role_' + role), app.eventCrewRole === role, function () { app.setEventRole(id, role); });
      }))]),
      !radiation ? h('fieldset', { class: 'event-power-choice' }, [h('legend', { text: t('event_power_choice') }),
        choice(t('event_solar'), t('event_solar_d'), app.eventPowerChoice !== 'radioisotope', function () { app.setEventPower('solar'); }),
        choice(t('event_rtg'), t('event_rtg_d'), app.eventPowerChoice === 'radioisotope', function () { app.setEventPower('radioisotope'); }),
      ]) : null,
      h('div', { class: 'event-source-list' }, [h('strong', { text: t('event_nasa_refs') }), h('p', {}, [h('a', { href: item.source, target: '_blank', rel: 'noopener', text: item.sourceName })]),
        item.source2 ? h('p', {}, [h('a', { href: item.source2, target: '_blank', rel: 'noopener', text: radiation ? 'NASA RAD archived data' : 'NASA · Opportunity energy and Tau graphic' })]) : null,
        item.source3 ? h('p', {}, [h('a', { href: item.source3, target: '_blank', rel: 'noopener', text: 'NASA Mars Report · July 3, 2018' })]) : null,
        item.sourceWind ? h('p', {}, [h('a', { href: item.sourceWind, target: '_blank', rel: 'noopener', text: 'NASA Curiosity wind-gust image' })]) : null,
        item.source4 ? h('p', {}, [h('a', { href: item.source4, target: '_blank', rel: 'noopener', text: 'NASA Curiosity motor and dust-storm explanation' })]) : null,
        !radiation ? h('p', { class: 'muted', text: t('event_dust_locations') }) : null,
        h('p', { text: item.observation }), h('small', { text: t('event_about_data') })]),
      h('div', { class: 'row end' }, [
        h('button', { type: 'button', text: t('event_back'), onclick: function () { app.openEventArchive(); } }),
        h('button', { class: 'primary', type: 'button', text: t('event_play'), onclick: function () { app.launchEvent(id); } }),
      ]),
    ]);
    show('menu', h('div', { class: 'box wide event-brief event-brief-' + id }, [
      h('header', { class: 'event-brief-head' }, [portrait('dusty', 76), h('p', { class: 'event-dusty-message', text: t(radiation ? 'event_rad_intro' : 'event_dust_intro') }), h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } })]), learn,
    ]));
    screen.classList.add('event-mode');
  }

  function dustTimeline() {
    var labels = ['event_stage_may', 'event_stage_june', 'event_stage_july', 'event_stage_aug', 'event_stage_sept'];
    var initial = 0, value = h('p', { class: 'event-timeline-value', text: t(labels[initial]) });
    var bar = h('div', { class: 'event-tau-illustration', 'data-stage': '0', role: 'img', 'aria-label': t('event_illustration_label') }, [h('span', { class: 'tau-globe' }, ['MARS']), h('span', { class: 'tau-haze' })]);
    var slider = h('input', { type: 'range', min: '0', max: '4', step: '1', value: '0', 'aria-label': t('event_timeline'), oninput: function (e) { var stage = Number(e.target.value); value.textContent = t(labels[stage]); bar.dataset.stage = String(stage); } });
    return h('div', { class: 'event-timeline' }, [h('strong', { text: t('event_timeline') }), bar, slider, value, h('p', { text: t('event_tau_fact') }), h('p', { text: t('event_opp_fact') }), h('small', { text: t('event_illustration_label') })]);
  }

  function eventDebrief(app) {
    var g = app.game, r = g.result, d = r.event, id = d.id;
    var radiation = id === 'radiation';
    var decision = radiation ? t('event_rad_result', { dose: Math.round(d.dose), shelter: Math.round(d.stats.shelteredSeconds || 0) }) : t('event_power_result', { architecture: t(g.level.eventPowerMode === 'radioisotope' ? 'event_rtg' : 'event_solar'), battery: Math.round(d.battery), life: Math.round(d.life), science: d.science });
    var historyKey = radiation ? 'event_rad_brief' : 'event_dust_brief';
    var sourceLink = radiation ? root.NASAEventMissions.DATA.radiation.source : root.NASAEventMissions.DATA.darkenedSky.source;
    show('menu', h('div', { class: 'box wide event-debrief' }, [
      h('header', { class: 'event-brief-head' }, [portrait('dusty', 88), h('div', {}, [h('p', { class: 'badge ' + (r.won ? 'real' : 'game'), text: t(r.won ? 'event_success_title' : 'event_retry_title') }), h('h1', { text: t('event_debrief') }), h('p', { text: t(r.won ? (radiation ? 'event_rad_success' : 'event_dust_success') : (radiation ? 'event_rad_failure' : 'event_dust_failure')) })])]),
      h('div', { class: 'event-debrief-grid' }, [h('section', { class: 'event-historical' }, [h('h2', { text: t('event_historical') }), h('p', { text: t(historyKey) }), h('a', { href: sourceLink, target: '_blank', rel: 'noopener', text: t('event_source') })]),
        h('section', { class: 'event-simulation' }, [h('h2', { text: t('event_yours') }), h('p', { text: decision }), h('p', { text: t('event_resource_start', { battery: Math.round(d.stats.startBattery || 0) }) }), h('p', { text: t('event_decision_record', { role: t('role_' + d.role), life: Math.round(d.life), battery: Math.round(d.battery), allocation: d.allocation.life + '/' + d.allocation.green + '/' + d.allocation.shield + '/' + d.allocation.science }) }), h('p', { text: t('event_resource_consumed', { water: Math.max(0, Math.round((d.stats.startWater || 0) - d.water)), wall: Math.round(d.wall) }) }),
          radiation ? h('p', { text: t('event_rad_failure_detail', { exposure: Math.round(d.stats.exposedSeconds || 0) }) }) : null,
          h('p', { class: 'muted', text: t('event_play_note') }),
        ]),
      ]),
      h('details', { class: 'event-learn' }, [h('summary', { text: t('event_nasa_refs') }), h('p', { text: root.NASAEventMissions.DATA[id === 'radiation' ? 'radiation' : 'darkenedSky'].limitation }), h('a', { href: sourceLink, target: '_blank', rel: 'noopener', text: t('event_source') })]),
      voiceControls(app),
      h('div', { class: 'row end' }, [h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } }), h('button', { type: 'button', text: t('event_back'), onclick: function () { app.openEventArchive(); } }), h('button', { type: 'button', text: t('event_restart'), onclick: function () { app.launchEvent(id); } }), h('button', { class: 'primary', type: 'button', text: t('event_back_title'), onclick: function () { app.finishEventToTitle(); } })]),
    ]));
    screen.classList.add('event-mode');
    if (Art) Art.setDustyEmotion(r.won ? 'celebrating' : 'sad');
  }

  // pick: {sel:[...], locked:[...]} lives on app so main.js can move it by keyboard.
  function roles(app) {
    var pick = app.pick, n = app.settings.players;
    var cards = ROLES.map(function (r, i) {
      var tokens = [];
      for (var p = 0; p < n; p++) {
        if (pick.sel[p] === i) tokens.push(h('span', { class: 'token' + (pick.locked[p] ? ' locked' : ''), text: 'P' + (p + 1) }));
      }
      var expert = root.Levels.expert(r, app.stars);
      return h('button', {
        class: 'role', type: 'button',
        style: pick.sel.indexOf(i) >= 0 ? 'border-color:' + root.Render.ROLE_COLOR[r] : null,
        onclick: function () { app.clickRole(i); },
      }, [
        h('div', { class: 'tokens' }, tokens.length ? tokens : [h('span', { class: 'token bot', text: t('bot') })]), roleCanvas(r), h('strong', { text: t('role_' + r) }), h('span', { text: t('roled_' + r) }),
        expert ? h('span', { class: 'expert', text: '★ ' + t('expert') }) : null,
      ]);
    });
    var keys = [];
    for (var p = 0; p < n; p++) {
      var L = root.Input.label(p);
      keys.push(h('div', { class: 'keys' }, [
        h('b', { text: 'P' + (p + 1) + ': ' }), t('c_move') + ' ' + L.move + ' · ' + t('c_act') + ' ' + L.act + ' · ' + t('c_leave') + ' ' + L.swap,
      ]));
    }
    var anyExpert = ROLES.some(function (r) { return root.Levels.expert(r, app.stars); });
    show('menu', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('pick_roles') }),
      n > 1 ? h('p', { class: 'muted', text: t('roles_hint') }) : null,
      n > 1 && anyExpert ? h('p', { class: 'muted', text: t('expert_hint') }) : null,
      h('div', { class: 'role-grid' }, cards),
      h('h3', { text: t('look_title') }), lookRows(app, n),
      h('h3', { text: t('controls') }), h('div', {}, keys),
      h('div', { class: 'row end' }, [
        h('button', { type: 'button', text: t('back'), onclick: function () { app.go('setup'); } }),
        h('button', { class: 'primary', type: 'button', text: t('roles_ready'), onclick: function () { app.go('blueprint'); } }),
      ]),
    ]));
  }

  function blueprint(app) {
    var M = root.MissionDNA, d = app.missionDesign || { site: 'gale', instruments: ['meda'] };
    var check = M.validate(d), sites = Object.keys(M.SITES).map(function (id) {
      var item = M.SITES[id];
      return h('div', {}, [choice(t('md_site_' + id), t('md_site_' + id + '_d'), d.site === id, function () { app.setMissionSite(id); }), h('small', {}, [t('report_source') + ': ', h('a', { href: item.source, target: '_blank', rel: 'noopener', text: t('md_site_' + id + '_src') })])]);
    });
    var instruments = Object.keys(M.INSTRUMENTS).map(function (id) {
      var item = M.INSTRUMENTS[id], selected = d.instruments.indexOf(id) >= 0;
      return choice(t('md_inst_' + id), t('md_inst_' + id + '_d'), selected, function () { app.toggleMissionInstrument(id); });
    });
    var errors = [];
    if (check.selected.length > M.BUDGET.maxInstruments) errors.push('md_too_many');
    if (check.mass > M.BUDGET.mass) errors.push('md_over_mass');
    if (check.power > M.BUDGET.power) errors.push('md_over_power');
    if (!check.selected.length) errors.push('md_need_payload');
    var budgetKids = [h('b', { text: t('md_budget') }), h('p', { text: t('md_mass', { a: check.mass, b: M.BUDGET.mass }) + ' · ' + t('md_power', { a: check.power, b: M.BUDGET.power }) }), h('strong', { class: check.valid ? 'good' : 'bad', text: t(check.valid ? 'md_ok' : errors[0]) })];
    errors.slice(1).forEach(function (key) { budgetKids.push(h('p', { class: 'bad', text: t(key) })); });
    budgetKids.push(h('p', { class: 'muted', text: t('md_assumption') }), h('small', {}, [h('a', { href: 'https://pds.nasa.gov/ds-view/pds/viewContext.jsp?identifier=urn:nasa:pds:context:instrument:mgs.mola&version=1.0', target: '_blank', rel: 'noopener', text: t('md_mola') })]));
    show('menu', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('md_title') }), h('p', { text: t('md_objective') }),
      h('div', { class: 'talk' }, [portrait('dusty', 56), h('p', { text: app.dustyMessage || t('dusty_blueprint_intro') })]),
      h('h3', { text: t('md_sites') }), h('div', { class: 'grid' }, sites),
      h('h3', { text: t('md_payload') }), h('div', { class: 'grid' }, instruments),
      h('div', { class: 'sun-card' }, budgetKids),
      h('small', {}, [t('report_source') + ': ', h('a', { href: M.INSTRUMENTS.meda.source, target: '_blank', rel: 'noopener', text: 'NASA MEDA PDS' }), ' · ', h('a', { href: M.INSTRUMENTS.moxie.source, target: '_blank', rel: 'noopener', text: 'NASA MOXIE' }), ' · ', h('a', { href: M.INSTRUMENTS.rad.source, target: '_blank', rel: 'noopener', text: 'NASA RAD' })]),
      h('div', { class: 'row end' }, [h('button', { type: 'button', text: t('back'), onclick: function () { app.go('roles'); } }), h('button', { class: 'primary', type: 'button', text: t('md_confirm'), disabled: !check.valid, onclick: function () { app.confirmMission(); } })]),
    ]));
  }

  // Each player can name their astronaut and pick a suit colour.
  var SUIT_COLORS = ['#f3f4f8', '#ff9a2e', '#ff6b9a', '#62d873', '#58b7f0', '#c792ea', '#ffd166'];
  function suitPreview(role, color) {
    var src = Art.sprite(role, 'down', 0, true, color), cv = Art.canvas(src.width, src.height);
    cv.getContext('2d').drawImage(src, 0, 0);
    cv.className = 'look-suit crew-figure';
    return cv;
  }
  function lookRows(app, n) {
    var rows = [];
    for (var p = 0; p < n; p++) (function (p) {
      var look = app.looks[p], role = ROLES[app.pick.sel[p]] || 'engineer';
      var preview = h('span', { class: 'look-preview' }, [suitPreview(role, look.color)]);
      var swatches = SUIT_COLORS.map(function (col) {
        return h('button', {
          class: 'swatch' + ((look.color || '#f3f4f8') === col ? ' on' : ''), type: 'button', style: 'background:' + col,
          'aria-label': t('look_color') + ' ' + (SUIT_COLORS.indexOf(col) + 1),
          onclick: function () { app.setLook(p, 'color', col === '#f3f4f8' ? null : col); roles(app); },
        });
      });
      rows.push(h('div', { class: 'look-row' }, [
        h('b', { text: 'P' + (p + 1) }), preview,
        h('input', { class: 'look-name', type: 'text', maxlength: '12', placeholder: t('look_name'), value: look.name || '', 'aria-label': t('look_name') + ' P' + (p + 1),
          oninput: function () { app.setLook(p, 'name', this.value.replace(/[<>]/g, '').slice(0, 12)); } }),
        h('div', { class: 'swatches' }, swatches),
      ]));
    })(p);
    return h('div', { class: 'looks' }, rows);
  }

  function howto(app) {
    var parts = [1, 2, 3, 4].map(function (i) {
      return h('div', { class: 'how-step' }, [Art.howPicture(i), h('h3', { text: t('how_' + i + 't') }), h('p', { text: t('how_' + i) })]);
    });
    show('menu', h('div', { class: 'box how tall' }, [
      h('h2', { text: t('how_title') }), h('div', { class: 'how-grid' }, parts),
      h('div', { class: 'how-goal' }, [ic('air', 30), ic('rad', 30), h('p', { text: t('how_goal') })]),
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('back'), onclick: function () { app.go('title'); } })]),
    ]));
  }

  // ---- Mars Academy: solo levels ---------------------------------------------
  function starRow(n, of) {
    var out = [];
    for (var i = 1; i <= (of || 3); i++) out.push(h('span', { class: i <= n ? '' : 'off', text: '★' }));
    return out;
  }

  function goalText(gl, withProgress) {
    var s = t(gl.key, { of: gl.of });
    return withProgress && gl.of > 1 ? s + ' (' + gl.n + '/' + gl.of + ')' : s;
  }

  function academy(app) {
    var Levels = root.Levels, stars = app.stars;
    var total = 0;
    Levels.LIST.forEach(function (L) { total += stars[L.id] || 0; });
    var cols = Levels.ROLES.map(function (r) {
      var expert = Levels.expert(r, stars);
      var rows = Levels.forRole(r).map(function (L, i) {
        var open = Levels.open(L.id, stars), got = stars[L.id] || 0;
        return h('button', {
          class: 'lv-btn' + (open ? '' : ' locked') + (got ? ' done' : ''), type: 'button', disabled: !open,
          style: open ? 'border-color:' + root.Render.ROLE_COLOR[r] : null,
          onclick: function () { levelBrief(app, L.id); },
        }, [
          h('span', { class: 'lv-num', style: 'background:' + root.Render.ROLE_COLOR[r], text: String(i + 1) }),
          h('span', { class: 'lv-name' }, [h('strong', { text: t('lv_' + L.id) }), h('small', { text: open ? t('learn_' + L.lab + '_t') : '🔒 ' + t('lv_locked') })]),
          h('span', { class: 'stars small' }, starRow(got)),
        ]);
      });
      return h('div', { class: 'ac-col' }, [
        h('div', { class: 'ac-head' }, [portrait(r, 44), h('div', {}, [h('strong', { text: t('role_' + r) }), expert ? h('span', { class: 'expert', text: '★ ' + t('expert') }) : h('small', { class: 'muted', text: t('roled_' + r) })])]),
        h('div', { class: 'stack' }, rows),
      ]);
    });
    show('menu', h('div', { class: 'box wide tall' }, [
      h('div', { class: 'row spread' }, [h('h2', { text: t('academy') }), h('div', { class: 'ac-total' }, ['★ ' + total + ' / ' + Levels.LIST.length * 3])]),
      h('div', { class: 'talk' }, [portrait('dusty', 56), h('p', { text: t('academy_intro') })]),
      h('div', { class: 'ac-grid' }, cols),
      h('div', { class: 'ac-mission' }, [
        h('p', { text: t('academy_mission') }),
        h('button', { class: 'primary', type: 'button', text: t('play'), onclick: function () { app.go('setup'); } }),
      ]),
      h('div', { class: 'row end' }, [h('button', { type: 'button', text: t('back'), onclick: function () { app.go('title'); } })]),
    ]));
  }

  function levelBrief(app, id) {
    var L = root.Levels.get(id), list = root.Levels.forRole(L.role), n = list.indexOf(L) + 1;
    var L0 = root.Input.label(0);
    show('menu', h('div', { class: 'box tall', style: 'max-width:640px' }, [
      h('div', { class: 'talk' }, [portrait(L.role, 72), h('div', {}, [
        h('small', { class: 'muted', text: t('role_' + L.role) + ' · ' + t('lv_level', { n: n }) }),
        h('h2', { text: t('lv_' + L.id) }),
      ])]),
      h('p', { text: t('lv_' + L.id + '_d') }),
      h('h3', { text: t('lv_learn') }), h('p', {}, [ic('book', 20), ' ' + t('learn_' + L.lab + '_t')]),
      h('h3', { text: t('lv_goals') }),
      h('ul', { class: 'clean goals' }, L.goals.map(function (gl) { return h('li', { text: '◻ ' + goalText({ key: gl.key, of: gl.of || 1 }) }); })),
      h('h3', { text: t('lv_stars') }),
      h('ul', { class: 'clean' }, [
        h('li', { text: '★ ' + t('ls_win') }),
        h('li', { text: '★ ' + t(L.star2.key, L.star2.vars) }),
        h('li', { text: '★ ' + t('ls_quiz') }),
      ]),
      h('p', { class: 'keys' }, [h('b', { text: t('controls') + ': ' }), t('c_move') + ' ' + L0.move + ' · ' + t('c_act') + ' ' + L0.act + ' · ' + t('c_leave') + ' ' + L0.swap]),
      h('div', { class: 'row end' }, [
        h('button', { type: 'button', text: t('back'), onclick: function () { app.go('academy'); } }),
        h('button', { class: 'primary', type: 'button', text: t('lv_start'), onclick: function () { app.launchLevel(L.id); } }),
      ]),
    ]));
  }

  // The goal list shown under the top bar during a level.
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), s = list[i]; list[i] = list[j]; list[j] = s; }
    return list;
  }

  function levelEnd(app) {
    var g = app.game, r = g.result, L = g.level;
    var stars = r.stars;
    var head = r.won ? t('lv_win') : t('lv_fail');
    var why = r.won ? t('lv_win_d') : t(r.failKey || (r.why === 'time' ? 'lf_time' : 'end_' + r.why));
    var starsEl = h('div', { class: 'stars' }, starRow(stars));
    var goals = h('ul', { class: 'clean goals' }, r.goals.map(function (gl) {
      return h('li', { class: gl.ok ? 'good' : 'bad', text: (gl.ok ? '✔ ' : '✘ ') + goalText(gl, true) });
    }));
    var starList = h('ul', { class: 'clean' }, [
      h('li', { text: (r.won ? '★ ' : '☆ ') + t('ls_win') }),
      h('li', { text: (r.star2 ? '★ ' : '☆ ') + t(L.star2.key, L.star2.vars) }),
    ]);
    var buttons = h('div', { class: 'row end' });
    function fillButtons(final) {
      buttons.textContent = '';
      buttons.appendChild(h('button', { type: 'button', text: t('academy'), onclick: function () { app.go('academy'); } }));
      buttons.appendChild(h('button', { type: 'button', text: t('lv_again'), onclick: function () { app.launchLevel(L.id); } }));
      var nx = root.Levels.next(L.id);
      if (final && r.won && nx) buttons.appendChild(h('button', { class: 'primary', type: 'button', text: t('lv_next'), onclick: function () { levelBrief(app, nx.id); } }));
      else if (final && r.won) buttons.appendChild(h('button', { class: 'primary', type: 'button', text: t('academy'), onclick: function () { app.go('academy'); } }));
    }

    var quiz = null;
    if (r.won) {
      var q = 'lq_' + L.id;
      var why2 = h('p', { class: 'quiz-why', hidden: true });
      var opts = h('div', { class: 'quiz-opts' });
      shuffle([0, 1, 2]).forEach(function (k) {
        opts.appendChild(h('button', { type: 'button', 'data-k': k, text: t(q + '_' + k), onclick: function () {
          var right = k === 0;
          app.sfx(right ? 'right' : 'wrong');
          if (right) setTimeout(function () { app.sfx('star'); }, 260);
          Array.prototype.forEach.call(opts.children, function (b) {
            b.disabled = true;
            if (b.getAttribute('data-k') === '0') b.classList.add('right');
          });
          if (!right) this.classList.add('wrong');
          why2.hidden = false;
          why2.textContent = (right ? t('lv_quiz_right') : t('lv_quiz_wrong')) + ' ' + t(q + '_why');
          var total = stars + (right ? 1 : 0);
          starsEl.textContent = '';
          starRow(total).forEach(function (s) { starsEl.appendChild(s); });
          starList.appendChild(h('li', { text: (right ? '★ ' : '☆ ') + t('ls_quiz') }));
          app.saveStars(L.id, total);
          fillButtons(true);
        } }));
      });
      quiz = h('div', { class: 'quiz' }, [h('h3', { text: t('lv_quiz') }), h('p', { class: 'quiz-q', text: t(q) }), opts, why2]);
      app.saveStars(L.id, stars);
      fillButtons(false);
    } else fillButtons(true);

    show('overlay', h('div', { class: 'box tall', style: 'max-width:640px' }, [
      h('div', { class: 'talk' }, [portrait(r.won ? L.role : 'dusty', 72), h('div', {}, [h('h2', { text: head }), h('p', { text: why })])]),
      starsEl, goals, starList,
      r.won ? null : h('div', { class: 'fact' }, [h('h3', {}, [ic('book', 20), ' ' + t('lv_tip')]), h('p', { text: t('lv_' + L.id + '_tip') })]),
      quiz,
      // Winning a level collects its science card for the Science lab.
      r.won ? factBox(L.card, app.addCard(L.card)) : null,
      buttons,
    ]));
    if (r.won) { var box = screen.querySelector('.box'); box.insertBefore(party(), box.firstChild); }
  }

  // ---- This really happened -----------------------------------------------------
  function niceDate(iso) {
    try {
      return new Date(iso + 'T12:00:00Z').toLocaleDateString(root.I18N.lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { return iso; }
  }

  // Where a flare is on the Sun's face, from a DONKI location such as "N13E35".
  // East is on the left as seen from Earth. Flares behind the edge have no spot.
  function flareSpot(loc, radius) {
    var m = /^([NS])(\d+)([EW])(\d+)$/.exec(loc || '');
    if (!m) return null;
    var lat = (m[1] === 'N' ? 1 : -1) * m[2] * Math.PI / 180, lon = (m[3] === 'W' ? 1 : -1) * m[4] * Math.PI / 180;
    if (Math.abs(lon) > Math.PI / 2 * 0.97) return null;
    return { x: 0.5 + radius * Math.cos(lat) * Math.sin(lon), y: 0.5 - radius * Math.sin(lat) };
  }

  function sunPicture(info) {
    var P = root.SUN_PHOTOS, photo = P && P.days[info.date];
    if (!photo) {
      // No photo for this day (for example live data): a drawn Sun instead.
      var cv = Art.canvas(160, 160), c = cv.getContext('2d');
      Art.glow(c, 80, 80, 78, '#ffb347', 0.6);
      c.fillStyle = '#ffb347'; c.beginPath(); c.arc(80, 80, 52, 0, 7); c.fill();
      c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(80, 80, 36, 0, 7); c.fill();
      return { el: h('div', { class: 'real-sun' }, [cv]), photo: false, spot: false };
    }
    var spot = flareSpot(info.flare.loc, P.radius);
    var kids = [h('img', { src: photo.file, alt: t('real_photo', { date: niceDate(info.date) }) })];
    if (spot) kids.push(h('span', { class: 'real-ring', style: 'left:' + (spot.x * 100).toFixed(1) + '%;top:' + (spot.y * 100).toFixed(1) + '%' }));
    return { el: h('div', { class: 'real-sun' }, kids), photo: true, spot: !!spot };
  }

  function realCard(app, info, onClose) {
    app.sfx('science');
    var f = info.flare, letter = f.cls.charAt(0).toUpperCase();
    var pic = sunPicture(info);
    var scale = h('div', { class: 'real-scale' }, ['A', 'B', 'C', 'M', 'X'].map(function (L) {
      return h('span', { class: L === letter ? 'on' : '', text: L });
    }));
    var src = NASA.SOURCES.donki;
    show('overlay', h('div', { class: 'box real', style: 'max-width:640px' }, [
      h('div', { class: 'talk' }, [portrait('dusty', 72), h('div', {}, [h('h2', { text: t('real_title') }), h('p', { text: t('real_you') })])]),
      h('div', { class: 'real-body' }, [
        h('figure', {}, [pic.el, h('figcaption', {}, [
          pic.photo ? t('real_photo', { date: niceDate(info.date) }) : t('real_nophoto', { date: niceDate(info.date) }),
          pic.spot ? h('div', { class: 'real-hint', text: t('real_spot') }) : null,
        ])]),
        h('div', { class: 'real-facts' }, [
          h('div', { class: 'real-cls', text: f.cls }),
          scale,
          h('p', { text: t('real_scale_' + (letter === 'X' || letter === 'M' ? letter : 'C')) }),
          info.count > 1 ? h('p', { text: t('real_count', { n: info.count }) }) : null,
          f.region ? h('p', { text: t('real_region', { n: f.region }) }) : null,
        ]),
      ]),
      h('small', { class: 'muted real-src' }, [
        t('real_src') + ': ', src ? h('a', { href: src.url, target: '_blank', rel: 'noopener', text: 'NASA DONKI' }) : 'NASA DONKI', ' · ' + f.id,
        pic.photo ? h('br') : null, pic.photo ? t('real_photo_src', { src: root.SUN_PHOTOS.source }) : null,
      ]),
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('real_ok'), onclick: onClose })]),
    ]));
  }

  // Class mode: the game stops so the group can talk before going on.
  function think(app, key, onClose) {
    app.sfx('page');
    show('overlay', h('div', { class: 'box', style: 'max-width:560px' }, [
      h('div', { class: 'talk' }, [portrait('dusty', 72), h('div', {}, [h('h2', { text: t('think_title') }), h('p', { text: t('think_' + key) })])]),
      h('p', { class: 'muted', text: t('think_how') }),
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('think_go'), onclick: onClose })]),
    ]));
  }

  function dataRoom(app) {
    var live = app.live;
    var status = live
      ? h('p', {}, [h('span', { class: 'badge live', text: 'LIVE' }), ' ', t('data_live_ok', { src: live.source, time: live.fetchedAt.slice(0, 16).replace('T', ' ') + ' UTC' })])
      : h('p', {}, [h('span', { class: 'badge live', text: 'LIVE' }), ' ', t('data_live_no')]);

    function li(badge, cls, key) { return h('li', {}, [h('span', { class: 'badge ' + cls, text: badge }), ' ', t(key)]); }

    var tables = ['aug2026', 'jan2025', 'feb2026', 'quiet2016'].map(function (id) {
      var se = root.DONKI_ARCHIVE[id];
      var rows = se.days.filter(function (d) { return d.top; }).map(function (d) {
        return h('tr', {}, [h('td', { text: d.date }), h('td', { text: d.top.cls }), h('td', { text: String(d.count) }), h('td', { class: 'id', text: d.top.id })]);
      });
      return h('div', {}, [
        h('h3', { text: t('season_' + id) + ' (' + se.start + ' / ' + se.end + ')' }),
        h('div', { class: 'table-wrap' }, [h('table', {}, [
          h('thead', {}, [h('tr', {}, [h('th', { text: t('data_col_date') }), h('th', { text: t('data_col_top') }), h('th', { text: t('data_col_n') }), h('th', { text: t('data_col_id') })])]),
          h('tbody', {}, rows),
        ])]),
      ]);
    });

    var sources = Object.keys(NASA.SOURCES).map(function (k) {
      var s = NASA.SOURCES[k];
      return h('li', {}, [h('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.name })]);
    });

    show('menu', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('data_title') }),
      h('p', { text: t('data_intro') }),
      h('details', { class: 'teach' }, [
        h('summary', { text: t('teach_title') }),
        h('p', { text: t('teach_intro') }),
        h('ul', { class: 'clean' }, [1, 2, 3, 4, 5].map(function (i) { return h('li', { text: '• ' + t('teach_g' + i) }); })),
        h('h3', { text: t('teach_q_t') }),
        h('ul', { class: 'clean' }, [1, 2, 3, 4].map(function (i) { return h('li', { text: '• ' + t('teach_q' + i) }); })),
      ]),
      h('h3', { text: t('data_status') }), status,
      h('p', {}, [h('span', { class: 'badge saved', text: 'SAVED' }), ' ', t('data_saved')]),
      h('ul', { class: 'clean' }, [
        li(t('data_real'), 'real', 'data_r1'), li(t('data_real'), 'real', 'data_r2'), li(t('data_real'), 'real', 'data_r3'),
        li(t('data_game'), 'game', 'data_g1'), li(t('data_game'), 'game', 'data_g2'), li(t('data_game'), 'game', 'data_g3'), li(t('data_game'), 'game', 'data_g4'),
      ]),
      h('h3', { text: t('data_seasons') }), h('div', {}, tables),
      h('h3', { text: t('data_sources') }), h('ul', { class: 'clean' }, sources),
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('back'), onclick: function () { app.go('title'); } })]),
    ]));
  }

  // Real NASA photos, loaded from NASA's image library. Hidden if there is no connection.
  var PHOTOS = [
    { id: 'PIA20602', key: 'photo_1', url: 'https://images-assets.nasa.gov/image/PIA20602/PIA20602~medium.jpg' },
    { id: 'PIA22210', key: 'photo_2', url: 'https://images-assets.nasa.gov/image/PIA22210/PIA22210~medium.jpg' },
  ];

  // ---- Sticker album ---------------------------------------------------------------
  // Every science card is a sticker: a topic colour, an icon and a short title.
  var STICKER = {
    storm2024: ['rad', 'rad'],
    shelter: ['rad', 'wall'],
    dailyDose: ['rad', 'rad'],
    careerLimit: ['rad', 'rad'],
    flareScale: ['rad', 'star'],
    moxie: ['air', 'air'],
    thinAir: ['air', 'air'],
    leak: ['air', 'fan'],
    lettuce: ['plant', 'plant'],
    plantLight: ['plant', 'plant'],
    plantRadiation: ['plant', 'plant'],
    bones: ['body', 'gear'],
    exercise: ['body', 'gear'],
    astronautBlood: ['body', 'drop'],
    mars520: ['body', 'moon'],
    sol: ['mars', 'moon'],
    gravity: ['mars', 'star'],
    cold: ['mars', 'moon'],
    dustGlobal: ['mars', 'fan'],
    cleaning: ['mars', 'bolt'],
    meteorite: ['mars', 'star'],
    opportunity: ['mars', 'bolt'],
    marsTime: ['mars', 'moon'],
    delay: ['radio', 'radio'],
  };
  function album(app) {
    var ids = Object.keys(NASA.FACTS);
    var found = ids.filter(function (id) { return app.cards[id]; });
    var detail = h('div', { class: 'sticker-detail', hidden: true });
    function open(id, el) {
      Array.prototype.forEach.call(grid.children, function (s) { s.classList.toggle('open', s === el); });
      detail.hidden = false;
      detail.textContent = '';
      if (!app.cards[id]) { detail.appendChild(h('p', { class: 'muted', text: t('album_locked') })); return; }
      var f = NASA.FACTS[id], src = NASA.SOURCES[f.src];
      detail.appendChild(h('h3', { text: t('stk_' + id) }));
      detail.appendChild(h('p', { text: t(f.key) }));
      detail.appendChild(h('small', {}, [t('report_source') + ': ', h('a', { href: src.url, target: '_blank', rel: 'noopener', text: src.name })]));
      detail.appendChild(listenButton(app, t(f.key), 'science-card:' + id, 'dusty_fact_' + id));
    }
    var grid = h('div', { class: 'stickers' }, ids.map(function (id, i) {
      var s = STICKER[id] || ['mars', 'star'], have = !!app.cards[id], isNew = have && app.newCards[id];
      var el = h('button', {
        class: 'sticker topic-' + s[0] + (have ? '' : ' locked'), type: 'button',
        'aria-label': have ? t('stk_' + id) : t('album_locked'),
        onclick: function () { open(id, el); },
      }, [
        h('span', { class: 'sticker-num', text: '#' + (i + 1) }),
        ic(s[1], 44),
        h('span', { class: 'sticker-name', text: have ? t('stk_' + id) : '?' }),
        isNew ? h('span', { class: 'sticker-new', text: t('album_new') }) : null,
      ]);
      return el;
    }));
    // A sticker is new only until the album has been opened once.
    app.newCards = {};
    var pct = Math.round(100 * found.length / ids.length);
    return h('div', { class: 'album' }, [
      h('h3', { text: t('album_title') }),
      h('div', { class: 'album-bar' }, [h('div', { style: 'width:' + pct + '%' }), h('span', { text: t('album_count', { a: found.length, b: ids.length }) })]),
      h('p', { class: 'muted', text: found.length === ids.length ? t('album_full') : t('album_tap') }),
      grid, detail,
    ]);
  }

  // Science lab: every experiment, and the cards you have found.
  function lab(app) {
    var buttons = root.Labs.LIST.map(function (id) {
      return h('button', { class: 'choice', type: 'button', onclick: function () { app.openLearn(id, function () { lab(app); }); } }, [
        h('strong', { text: t('learn_' + id + '_t') }),
      ]);
    });
    show('menu', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('lab_title') }),
      h('button', { class: 'choice landing-lab-card', type: 'button', onclick: function () { app.go('landingLab'); } }, [h('strong', { text: t('ll_menu') }), h('span', { text: t('ll_menu_sub') })]),
      h('h3', { text: t('lab_try') }), h('div', { class: 'grid' }, buttons),
      h('h3', { text: t('photos_title') }),
      h('div', { class: 'photos' }, PHOTOS.map(function (p) {
        return h('figure', {}, [
          h('img', { src: p.url, alt: t(p.key), loading: 'lazy', onerror: function () { this.closest('figure').hidden = true; } }),
          h('figcaption', {}, [t(p.key) + ' ', h('small', { class: 'muted', text: p.id + ' · ' + t('photo_credit') })]),
        ]);
      })),
      album(app),
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('back'), onclick: function () { app.go('title'); } })]),
    ]));
  }

  // A learn card pauses the game. Most have a small experiment to try.
  function learn(app, id, onClose) {
    app.sfx('page');
    var host = h('div', { class: 'lab-host' });
    show(app.game ? 'overlay' : 'menu', h('div', { class: 'box learn' }, [
      h('div', { class: 'talk' }, [
        portrait('dusty', 72),
        h('div', {}, [h('h2', { text: t('learn_' + id + '_t') }), h('p', { text: app.spokenText ? app.spokenText('dusty_lesson_' + id, t('learn_' + id)) : t('learn_' + id) })]),
      ]),
      h('div', { class: 'row' }, [listenButton(app, t('learn_' + id), 'lesson:' + id, 'dusty_lesson_' + id), h('button', { type: 'button', text: t('voice_stop'), onclick: function () { app.stopVoice(); } })]),
      host,
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('gotit'), onclick: onClose })]),
    ]));
    stopLab = root.Labs.mount(host, id);
  }

  function intro(app, line) {
    var g = app.game;
    var lines = [t('intro1'), t('intro2', { sols: g.totalSols }), t('intro3'), t('intro4')];
    if (line >= lines.length) return app.afterIntro();
    app.introLine = line;
    var introVoice = line === 1 ? 'dusty_intro_goal' : line === 2 ? 'dusty_intro_power' : line === 3 ? 'dusty_intro_sun' : null;
    var said = introVoice && app.spokenText ? app.spokenText(introVoice, lines[line]) : lines[line];
    if (introVoice) app.playVoice(introVoice, lines[line], { priority: 45, emotion: 'guiding', dedupeKey: 'intro:' + line, group: 'intro', ttl: 15000, replaceGroup: true });
    show('overlay soft', h('div', { class: 'intro-box', role: 'button', tabindex: '0', onclick: function () { intro(app, line + 1); } }, [
      portrait('dusty', 88),
      h('span', { class: 'intro-text', text: said }), h('span', { class: 'more', text: '▼' }),
    ]));
  }

  // ---- Top bar ------------------------------------------------------------
  var hudEls = null;
  function meter(iconName, color) {
    var fill = h('div', { class: 'fill', style: 'background:' + color });
    var val = h('span', { class: 'val' }), name = h('span');
    var el = h('div', { class: 'meter' }, [ic(iconName, 26), h('div', { class: 'meter-body' }, [h('label', {}, [name, val]), h('div', { class: 'track' }, [fill])])]);
    return { el: el, fill: fill, val: val, name: name };
  }

  function buildHud() {
    var hud = document.getElementById('hud');
    hud.textContent = '';
    var day = h('div', { class: 'day-text' }), solFill = h('div', { class: 'fill' });
    var box = h('div', { class: 'sol-clock' }, [day, h('div', { class: 'track' }, [solFill])]);
    var power = meter('bolt', 'var(--power)'), life = meter('air', 'var(--life)');
    var sci = h('span');
    var science = h('div', { class: 'stat' }, [ic('star', 26), sci]);
    var team = ROLES.map(function (r) {
      var green = h('div', { class: 'tc-green' }), purple = h('div', { class: 'tc-rad' });
      var card = h('div', { class: 'team-card', title: t('role_' + r) }, [portrait(r, 30), h('div', { class: 'tc-bar' }, [green, purple])]);
      return { role: r, card: card, green: green, purple: purple };
    });
    var goal = h('div', { class: 'hud-goal' });
    [box, power.el, life.el, science, goal].forEach(function (n) { hud.appendChild(n); });
    var wrap = h('div', { class: 'team' }, team.map(function (m) { return m.card; }));
    hud.appendChild(wrap);
    hudEls = { day: day, solFill: solFill, power: power, life: life, sci: sci, science: science, goal: goal, goalText: '', team: team };
  }

  function updateHud(g) {
    if (!hudEls) buildHud();
    var e = hudEls;
    e.science.hidden = !!g.level;
    e.goal.hidden = !g.level;
    if (g.level) {
      // Show each goal with a tick, so the player always knows what is left.
      var goals = g.levelGoals();
      var key = goals.map(function (gl) { return gl.n + (gl.ok ? 'y' : 'n'); }).join() + root.I18N.lang;
      if (key !== e.goalText) {
        e.goalText = key;
        e.goal.textContent = '';
        goals.forEach(function (gl) { e.goal.appendChild(h('span', { class: gl.ok ? 'ok' : '', text: (gl.ok ? '✔ ' : '◻ ') + goalText(gl, true) })); });
      }
    }
    var eventInfo = g.level && g.level.eventId && root.NASAEventMissions && root.NASAEventMissions.DATA[g.level.eventId];
    e.day.textContent = eventInfo ? t(eventInfo.titleKey) : g.level ? t('lv_' + g.level.id) : t('bar_day') + ' ' + g.sol + ' / ' + g.totalSols;
    e.solFill.style.width = (g.phase === 'day' ? Math.min(100, 100 * g.t / g.dayLen) : 0) + '%';
    var saved = g.phase === 'day' || g.phase === 'plan' ? Math.max(0, g.leftover()) : g.power.battery;
    e.power.name.textContent = t('bar_power');
    e.power.val.textContent = Math.round(saved * 2) / 2;
    e.power.fill.style.width = Math.min(100, saved / RULES.batteryCap * 100) + '%';
    e.power.el.classList.toggle('low', saved < RULES.nightNeed);
    e.life.name.textContent = t('bar_life');
    e.life.val.textContent = Math.round(g.life);
    e.life.fill.style.width = g.life + '%';
    e.life.el.classList.toggle('low', g.life < 25);
    e.team.forEach(function (m) {
      var c = g.crew[m.role];
      m.green.style.width = c.health + '%';
      m.green.style.background = c.health < 30 ? 'var(--bad)' : 'var(--life)';
      m.purple.style.width = (m.role === 'earth' ? 0 : Math.min(100, c.dose)) + '%';
      m.card.classList.toggle('me', c.player != null);
      m.card.classList.toggle('danger', c.down || c.resting);
    });
    var txt = g.science + ' / ' + g.scienceGoal;
    if (e.sci.textContent !== txt) e.sci.textContent = txt;
  }

  // ---- Morning power plan ---------------------------------------------------
  function dialStatus(g, d) {
    var a = g.alloc;
    if (d === 'life') {
      var rate = a.life * RULES.recyclerPerBlock - g.diff.lifeUse;
      return rate < -14 ? ['st_life0', 'bad'] : rate < 0 ? ['st_life1', 'warn'] : ['st_life2', 'good'];
    }
    if (d === 'green') return a.green === 0 ? ['st_green0', 'bad'] : a.green === 1 ? ['st_green1', 'warn'] : a.green < 4 ? ['st_green2', 'good'] : ['st_green3', 'good'];
    if (d === 'shield') { var s = g.shieldPercent(); return s < 40 ? ['st_shield0', 'warn'] : s < 65 ? ['st_shield1', 'good'] : ['st_shield2', 'good']; }
    return a.science === 0 ? ['st_science0', 'bad'] : a.science === 1 ? ['st_science1', 'good'] : ['st_science2', 'good'];
  }

  var DIAL_ICON = { life: 'fan', green: 'plant', shield: 'wall', science: 'radio' };

  function plan(app) {
    var g = app.game, cursors = app.planCursors, left = g.leftover(), need = RULES.nightNeed, asks = g.asks();
    var spill = Math.max(0, left - RULES.batteryCap);

    var rows = DIALS.map(function (d, i) {
      var owner = SolCrew.DIAL_OWNER[d];
      var focus = cursors.some(function (c) { return c === i; });
      var blocks = [];
      for (var b = 0; b < SolCrew.DIAL_MAX; b++) blocks.push(h('div', { class: 'block' + (b < g.alloc[d] ? ' on' : '') }));
      var st = dialStatus(g, d);
      var isBot = g.crew[owner].player == null;
      return h('div', { class: 'dial' + (focus ? ' focus' : '') }, [
        ic(DIAL_ICON[d], 34),
        h('div', { class: 'dial-info' }, [
          h('div', { class: 'dial-name', text: t('dial_' + d) }),
          h('div', { class: 'dial-tip ' + st[1], text: t(st[0]) }),
          isBot ? h('div', { class: 'dial-ask' }, [portrait(owner, 20), ' ' + t('asks', { who: t('role_' + owner), n: asks[d] })]) : null,
        ]),
        h('div', { class: 'dial-ctl' }, [
          h('button', { type: 'button', text: '−', 'aria-label': t('dial_' + d) + ' -', onclick: function () { app.dial(d, -1); } }),
          h('div', { class: 'blocks' }, blocks),
          h('button', { type: 'button', text: '+', 'aria-label': t('dial_' + d) + ' +', onclick: function () { app.dial(d, 1); } }),
        ]),
      ]);
    });

    var nightBlocks = [];
    var shown = Math.max(need, Math.min(10, Math.ceil(left)));
    for (var b = 0; b < shown; b++) nightBlocks.push(h('div', { class: 'block small' + (b < left ? ' on' : '') + (b < need ? ' need' : '') }));
    var nightOk = left >= need;

    show('overlay', h('div', { class: 'box wide tall' }, [
      h('h2', { text: t('plan_title', { sol: g.sol }) }),
      h('p', { class: 'plan-have' }, [ic('bolt', 26), ' ', t('plan_have', { n: g.pool() })]),
      g.dustStorm > 0 ? h('p', { class: 'warn-line', text: t('plan_dust') }) : null,
      h('div', { class: 'dials' }, rows),
      h('div', { class: 'night' + (nightOk ? '' : ' bad') }, [
        ic('moon', 30),
        h('div', { class: 'dial-info' }, [
          h('strong', { text: t('plan_tonight') + ': ' + left + ' · ' + t('plan_need', { n: need }) }),
          h('div', { class: 'dial-tip ' + (nightOk ? 'good' : 'bad'), text: nightOk ? (spill > 0 ? t('plan_spill', { n: spill }) : t('plan_ok')) : t('plan_bad') }),
        ]),
        h('div', { class: 'blocks' }, nightBlocks),
      ]),
      h('div', { class: 'row spread', style: 'margin-top:10px' }, [
        h('button', { type: 'button', text: t('plan_help'), onclick: function () { app.suggest(); } }),
        h('button', { class: 'primary', type: 'button', text: t('plan_ready'), onclick: function () { app.beginDay(); } }),
      ]),
      app.settings.classroom && !g.level ? h('p', { class: 'class-line', text: t('class_plan') }) : null,
      g.level ? h('p', { class: 'class-line', text: t('lv_plan_hint') }) : null,
      h('small', { class: 'muted', text: t('plan_keys') }),
    ]));
  }

  // ---- A choice -------------------------------------------------------------
  function decision(app) {
    var g = app.game, c = g.card;
    var opts = c.options.map(function (o, i) {
      var tokens = [];
      g.players.forEach(function (p, pi) {
        if (app.voteCursor[pi] === i && g.players.length > 1) tokens.push(h('span', { class: 'token' + (g.votes[p.id] != null ? ' locked' : ''), text: 'P' + (p.id + 1) }));
      });
      return h('button', {
        class: 'card-opt' + (app.voteCursor.indexOf(i) >= 0 ? ' focus' : ''), type: 'button',
        onclick: function () { app.pickCard(i); },
      }, [
        h('strong', { text: t(o.key) }), h('span', { text: t(o.key + '_c') }),
        h('div', { class: 'row', style: 'margin-top:6px;gap:4px' }, tokens),
      ]);
    });
    show('overlay', h('div', { class: 'box' }, [
      h('h2', { text: t('card_title', { sol: g.sol }) }),
      h('div', { class: 'talk' }, [portrait('dusty', 64), h('p', { text: t('card_' + c.id) })]),
      g.players.length > 1 ? h('small', { text: t('card_vote') }) : null,
      app.settings.classroom ? h('p', { class: 'class-line', text: t('class_vote') }) : null,
      h('div', { class: 'cards' }, opts),
    ]));
  }

  // ---- End of a day ---------------------------------------------------------
  function lineText(l) {
    var v = Object.assign({}, l.vars);
    if (v.device) v.device = t(v.device);
    if (v.choice) v.choice = t(v.choice);
    return t(l.key, v);
  }

  function arrowOf(n, goodUp) {
    n = Math.round(n);
    if (n === 0) return { text: '=', cls: '' };
    var good = (n > 0) === goodUp;
    return { text: (n > 0 ? '▲ +' : '▼ ') + n, cls: good ? 'good' : 'bad' };
  }

  function outcome(iconName, label, value, a) {
    return h('div', { class: 'outcome' }, [ic(iconName, 34), h('div', {}, [h('div', { class: 'muted', text: label }), h('strong', { text: String(value) }), ' ', h('span', { class: a.cls, text: a.text })])]);
  }

  function teamRow(team) {
    return h('div', { class: 'team-row' }, team.map(function (m) {
      return h('div', { class: 'team-big' }, [
        portrait(m.role, 40),
        h('div', { class: 'tc-bar big' }, [
          h('div', { class: 'tc-green', style: 'width:' + m.health + '%;background:' + (m.health < 30 ? 'var(--bad)' : 'var(--life)') }),
          h('div', { class: 'tc-rad', style: 'width:' + (m.role === 'earth' ? 0 : 100 - m.top) + '%' }),
        ]),
      ]);
    }));
  }

  // The night in the sleep room: the crew in their pods, getting ready for bed, and one sleep fact.
  function sleepRoom(r) {
    var late = r.lateToBed || [], sep = root.I18N.lang === 'ar' ? '، ' : ', ';
    var pods = ['engineer', 'farmer', 'doctor'].map(function (role) {
      var missing = late.indexOf(role) >= 0;
      return h('div', { class: 'sleep-pod' + (missing ? ' empty' : '') }, [portrait(role, 44), h('span', { class: 'sleep-zz', text: missing ? '?' : 'Zz' })]);
    });
    pods.push(h('div', { class: 'sleep-pod earth' }, [portrait('earth', 44), h('small', { text: t('sleep_earth_hi') })]));
    return h('div', { class: 'sleep-room' }, [
      h('div', { class: 'sleep-head' }, [
        h('span', { class: 'sleep-moon', 'aria-hidden': 'true', text: '🌙' }),
        h('div', {}, [
          h('h2', { text: t('sleep_title', { sol: r.sol }) }),
          h('p', { class: late.length ? 'sleep-missing' : 'muted', text: late.length ? t('sleep_late', { who: late.map(function (x) { return t('role_' + x); }).join(sep) }) : t('sleep_sub') }),
        ]),
      ]),
      h('div', { class: 'sleep-pods' }, pods),
      h('div', { class: 'sleep-prep' }, [h('strong', { text: t('sleep_prep') })].concat(['sleep_teeth', 'sleep_water', 'sleep_lights', 'sleep_earth'].map(function (k) { return h('span', { text: '✔ ' + t(k) }); }))),
      h('p', { class: 'sleep-fact' }, [h('strong', { text: t('sleep_fact_t') + ' ' }), t('sleep_fact_' + (((r.sol - 1) % 6) + 1))]),
    ]);
  }

  function report(app) {
    var g = app.game, r = g.lastReport, isNew = app.addCard(r.fact);
    var lines = r.lines.filter(function (l) { return l.key !== 'rep_card'; })
      .sort(function (a, b) { var o = { bad: 0, warn: 1, good: 2, info: 3 }; return o[a.tone] - o[b.tone]; }).slice(0, 3);
    show('overlay', h('div', { class: 'box tall' + (g.level ? '' : ' night-report') }, [
      g.level ? null : sleepRoom(r),
      h(g.level ? 'h2' : 'h3', { text: g.level ? t('report_title', { sol: r.sol }) : t('sleep_today') }),
      h('div', { class: 'outcomes' }, [
        outcome('air', t('bar_life'), Math.round(r.life), arrowOf(r.lifeDelta, true)),
        outcome('rad', t('bar_rad'), Math.round(r.dose), arrowOf(r.doseDelta, false)),
        outcome('star', t('bar_science'), g.science, arrowOf(r.scienceDelta, true)),
      ]),
      teamRow(r.team),
      h('div', { class: 'sun-card' }, [
        h('span', { text: t('report_sun', { date: r.date }) + ': ' }),
        h('b', { text: r.flare ? t('report_flare', { cls: r.flare.cls }) : t('report_noflare') }),
      ]),
      lines.length ? h('h3', { text: t('report_what') }) : null,
      h('div', {}, lines.map(function (l) { return h('div', { class: 'report-line ' + l.tone, text: lineText(l) }); })),
      buildBox(app),
      factBox(r.fact, isNew),
      app.settings.classroom ? talkBox(r) : null,
      h('div', { class: 'row end' }, [h('button', { class: 'primary', type: 'button', text: t('cont'), onclick: function () { app.nextSol(); } })]),
    ]));
  }

  // After a day, the crew picks one new thing for the base.
  function buildBox(app) {
    var g = app.game;
    if (g.builtToday) {
      var last = g.built[g.built.length - 1];
      return h('div', { class: 'build done' }, [ic(SolCrew.UPGRADES.filter(function (u) { return u.id === last; })[0].icon, 34), h('strong', { text: t('build_done', { name: t('up_' + last) }) })]);
    }
    var list = g.upgradeChoices();
    if (!list.length) return null;
    return h('div', { class: 'build' }, [
      h('h3', { text: t('build_title') }),
      h('p', { class: 'muted', text: t('build_hint') }),
      h('div', { class: 'build-grid' }, list.map(function (u) {
        return h('button', { class: 'choice build-pick', type: 'button', onclick: function () { app.build(u.id); } }, [
          ic(u.icon, 40), h('strong', { text: t('up_' + u.id) }), h('span', { text: t('up_' + u.id + '_d') }),
        ]);
      })),
    ]);
  }

  // Class mode: two questions about what really happened today.
  function talkBox(r) {
    var keys = r.lines.map(function (l) { return l.key; });
    var first = keys.indexOf('rep_cold') >= 0 ? 'talk_cold'
      : keys.indexOf('rep_storm_surprise') >= 0 || keys.indexOf('rep_warning_lost') >= 0 ? 'talk_surprise'
      : keys.indexOf('rep_storm_warned') >= 0 ? 'talk_warned'
      : keys.indexOf('rep_down') >= 0 ? 'talk_down'
      : keys.indexOf('rep_broke') >= 0 ? 'talk_broke'
      : r.lifeDelta < 0 ? 'talk_air' : 'talk_good';
    var second = 'teach_q' + (((r.sol - 1) % 4) + 1);
    return h('div', { class: 'talk-box' }, [
      h('h3', { text: t('talk_title') }),
      h('ul', { class: 'clean' }, [h('li', { text: '1. ' + t(first) }), h('li', { text: '2. ' + t(second) })]),
    ]);
  }

  // ---- Celebrations -------------------------------------------------------------
  var CONFETTI = ['#ffd166', '#ff6b6b', '#62d873', '#58b7f0', '#c792ea', '#ff9a2e'];
  // Confetti over the whole screen and the crew dancing in a row.
  function party() {
    var layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    for (var i = 0; i < 70; i++) {
      var size = 6 + (i * 7) % 8;
      layer.appendChild(h('i', { style: 'left:' + ((i * 37) % 100) + '%;width:' + size + 'px;height:' + Math.round(size * 1.5) + 'px;background:' + CONFETTI[i % CONFETTI.length] +
        ';animation-delay:' + ((i * 0.13) % 2.4).toFixed(2) + 's;animation-duration:' + (2.4 + (i % 5) * 0.35).toFixed(2) + 's' }));
    }
    screen.appendChild(layer);
    return h('div', { class: 'dance' }, ROLES.map(function (r, i) {
      var cv = roleCanvas(r, 'celebrate', 'excited');
      cv.style.animationDelay = (i * 0.12) + 's';
      return cv;
    }));
  }

  // ---- End of the mission ---------------------------------------------------
  function end(app) {
    var g = app.game, r = g.result;
    if (r.level && r.event) return eventDebrief(app);
    if (r.level) return levelEnd(app);
    var head = r.survived ? t('end_win') : t('end_' + r.why);
    var body = r.survived ? t('end_win_d', { n: r.total }) : t('end_' + r.why + '_d', { sol: r.sol });
    var stars = h('div', { class: 'stars' }, [1, 2, 3].map(function (i) { return h('span', { class: i <= r.stars ? '' : 'off', text: '★' }); }));
    var flares = r.flares.map(function (f) {
      var fate = f.level === 0 ? t('end_small') : f.hit ? t('end_hit') : t('end_miss');
      return h('tr', {}, [h('td', { text: f.date }), h('td', { text: f.cls }), h('td', { text: fate }), h('td', { class: 'id', text: f.id })]);
    });
    var fact = r.why === 'dose' ? 'careerLimit' : r.why === 'cold' ? 'opportunity' : 'storm2024';
    var isNew = app.addCard(fact);
    // Losing is part of learning: Dusty gives a tip, and the crew can try that day again.
    var canRetry = !r.survived && !!g.snap;
    var dance = r.survived ? h('div') : null;
    var buttons = r.survived || !canRetry ? [
      h('button', { type: 'button', text: t('menu'), onclick: function () { app.quit(); } }),
      h('button', { class: 'primary', type: 'button', text: t('again'), onclick: function () { app.go('setup'); } }),
    ] : [
      h('button', { type: 'button', text: t('menu'), onclick: function () { app.quit(); } }),
      h('button', { type: 'button', text: t('again'), onclick: function () { app.go('setup'); } }),
      h('button', { class: 'primary', type: 'button', text: t('retry_day', { n: r.sol }), onclick: function () { app.retryDay(); } }),
    ];
    show('overlay', h('div', { class: 'box tall' }, [
      dance,
      h('div', { class: 'talk' }, [portrait('dusty', 72), h('div', {}, [
        h('h2', { text: head }), h('p', { text: body }),
        canRetry ? h('p', { class: 'cheer', text: t('end_cheer', { n: r.sol }) }) : null,
      ])]),
      canRetry ? h('div', { class: 'row end retry-top' }, [buttons[2]]) : null,
      stars,
      r.mission ? missionDebrief(r.mission) : null,
      h('ul', { class: 'clean' }, [
        h('li', { text: (r.survived ? '★ ' : '☆ ') + t('end_star1') }),
        h('li', { text: (r.survived && r.science >= r.goal ? '★ ' : '☆ ') + t('end_star2', { a: r.science, b: r.goal }) }),
        h('li', { text: (r.survived && r.maxDose < 50 ? '★ ' : '☆ ') + t('end_star3', { a: Math.round(r.maxDose) }) }),
      ]),
      flares.length ? h('h3', { text: t('end_real') }) : null,
      flares.length ? h('div', { class: 'table-wrap' }, [h('table', {}, [h('tbody', {}, flares)])]) : null,
      todayLink(app),
      h('h3', { text: t('end_lesson') }),
      h('p', { text: t('end_lesson_txt') }),
      factBox(fact, isNew),
      voiceControls(app),
      h('div', { class: 'row end' }, canRetry ? buttons.slice(0, 2) : buttons),
    ]));
    if (dance) dance.replaceWith(party());
  }

  function missionDebrief(m) {
    var d = m.design;
    return h('section', { class: 'fact' }, [
      h('h3', { text: t('md_debrief') }),
      h('p', { text: t('md_objective') }),
      h('p', { text: t('md_summary', { site: t('md_site_' + d.site), instruments: d.instruments.map(function (id) { return t('md_inst_' + id); }).join(', '), mass: d.mass, power: d.payloadPower }) }),
      h('p', { text: t('md_outcome', { life: Math.round(m.life), battery: Math.round(m.battery), science: m.science, storms: m.storms }) }),
      h('p', { text: t(ratingKey(m)) }),
      h('p', { text: t(adviceKey(m)) }),
      h('p', { text: t(m.discoveries.indexOf('weatherObserved') >= 0 ? 'md_debrief_weather' : 'md_debrief_no_weather') }),
      h('small', {}, [t('md_data_note'), ' ', h('a', { href: root.MissionDNA.INSTRUMENTS.meda.source, target: '_blank', rel: 'noopener', text: 'MEDA PDS' }), ', ', h('a', { href: root.MissionDNA.INSTRUMENTS.rad.source, target: '_blank', rel: 'noopener', text: 'RAD' }), ', ', h('a', { href: root.MissionDNA.INSTRUMENTS.moxie.source, target: '_blank', rel: 'noopener', text: 'MOXIE' })]),
    ]);
  }

  function ratingKey(m) { return m.survived && m.battery >= 2 && m.life >= 35 ? 'md_good_decisions' : 'md_weak_decisions'; }
  function adviceKey(m) { return m.battery < 2 ? 'md_advice_power' : m.life < 35 ? 'md_advice_life' : 'md_advice_general'; }

  // Links the game to what the real Sun is doing right now.
  function todayLink(app) {
    var live = app.live;
    if (!live || !live.latest) return null;
    var storm = NASA.flareToStorm(live.latest.cls).level > 0;
    return h('div', { class: 'sun-card' }, [
      h('b', { text: t('end_today') + ': ' }),
      t(storm ? 'end_today_storm' : 'end_today_safe', { cls: live.latest.cls }),
      h('br'), h('small', { class: 'muted', text: t('sun_src', { src: live.source }) }),
    ]);
  }

  function pause(app) {
    show('overlay', h('div', { class: 'box', style: 'max-width:420px' }, [
      h('h2', { text: t('title') }),
      h('div', { class: 'stack' }, [
        h('button', { class: 'primary', type: 'button', text: t('cont'), onclick: function () { app.togglePause(); } }),
        h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } }),
        h('button', { type: 'button', text: t('sound') + ': ' + t(app.sound ? 'on' : 'off'), onclick: function () { app.toggleSound(); } }),
        h('button', { type: 'button', text: t('music') + ': ' + t(app.music ? 'on' : 'off'), onclick: function () { app.toggleMusic(); } }),
        voiceControls(app),
        h('button', { type: 'button', text: t('menu'), onclick: function () { app.quit(); } }),
      ]),
    ]));
  }

  root.UI = {
    init: function () {
      screen = document.getElementById('screen');
      dustyWidget = document.getElementById('dusty-companion');
      dustyCanvas = dustyWidget && dustyWidget.querySelector('[data-dusty-rover]');
      dustyText = dustyWidget && dustyWidget.querySelector('[data-dusty-text]');
      dustyMoreText = dustyWidget && dustyWidget.querySelector('[data-dusty-more-text]');
      dustyMoreButton = dustyWidget && dustyWidget.querySelector('[data-dusty-more]');
      if (dustyWidget) {
        try { dustyWidget.dataset.collapsed = localStorage.getItem('marscrew.dustyCollapsed') === '1' ? 'true' : 'false'; } catch (e) { dustyWidget.dataset.collapsed = 'false'; }
        dustyWidget.querySelector('[data-dusty-collapse]').addEventListener('click', function () {
          dustyWidget.dataset.collapsed = dustyWidget.dataset.collapsed === 'true' ? 'false' : 'true';
          try { localStorage.setItem('marscrew.dustyCollapsed', dustyWidget.dataset.collapsed === 'true' ? '1' : '0'); } catch (e) { /* companion still works without storage */ }
          updateDustyWidgetControls();
        });
        dustyMoreButton.addEventListener('click', function () {
          dustyMoreText.hidden = !dustyMoreText.hidden;
          if (!dustyMoreText.hidden && root.App) root.App.requestDustyMore();
        });
        dustyWidget.querySelector('[data-dusty-replay]').addEventListener('click', function () { if (root.App) root.App.replayVoice(); });
        dustyWidget.querySelector('[data-dusty-stop]').addEventListener('click', function () { if (root.App) root.App.stopVoice(); });
        dustyWidget.querySelector('[data-dusty-voice]').addEventListener('click', function () { if (root.App) root.App.toggleVoice(); });
        dustyWidget.querySelector('[data-dusty-volume]').addEventListener('input', function (e) { if (root.App) root.App.setVoiceVolume(e.target.value); });
        if (dustyCanvas && root.DustyAvatar) root.DustyAvatar.mount(dustyCanvas, { mode: 'full' });
        updateDustyWidgetControls();
      }
      document.documentElement.style.setProperty('--bolt', 'url(' + Art.icon('bolt').toDataURL() + ')');
    },
    clear: clear, title: title, setup: setup, roles: roles, blueprint: blueprint, howto: howto, dataRoom: dataRoom, lab: lab, learn: learn, intro: intro,
    eventArchive: eventArchive, eventBrief: eventBrief,
    academy: academy, levelBrief: levelBrief, think: think, realCard: realCard, flareSpot: flareSpot,
    plan: plan, decision: decision, report: report, end: end, pause: pause,
    updateHud: updateHud, resetHud: function () { hudEls = null; }, updateVoiceControls: updateVoiceControls,
    companionMessage: setDustyMessage, updateCompanion: updateDustyWidget,
    // Small helpers shared with js/landing-ui.js.
    h: h, show: show, portrait: portrait,
  };
})(typeof window !== 'undefined' ? window : globalThis);

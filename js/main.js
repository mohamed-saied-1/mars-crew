// Ties everything together: screens, the frame loop, events and sound.
(function (root) {
  'use strict';

  var UI = root.UI, Input = root.Input, Render = root.Render, SolCrew = root.SolCrew, I18N = root.I18N, Guide = root.Guide, Voice = root.Voice, Art = root.Art;
  var t = function (k, v) { return I18N.t(k, v); };
  var ROLES = SolCrew.ROLES, DIALS = SolCrew.DIALS;

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
    return null;
  }

  // ---- Sound: every effect and the music live in sound.js ------------------
  var Sound = root.Sound;
  function sfx(name) { if (App.sound) Sound.play(name); }
  var VOICE_GUIDE = {
    clean: 'dusty_guide_clean_solar', repair: 'dusty_guide_repair', drill: 'dusty_guide_drill_ice',
    plant: 'dusty_guide_plant_seeds', water: 'dusty_guide_water_plants', harvest: 'dusty_guide_harvest',
    fillwall: 'dusty_guide_fill_wall', checkup: 'dusty_guide_checkup', sample: 'dusty_guide_scan_rock',
    analyse: 'dusty_guide_analyze_sample', upload: 'dusty_guide_upload_data', warn: 'dusty_guide_warn_mars',
    forecast: 'dusty_guide_forecast_dust', study: 'dusty_guide_study_data', twintest: 'dusty_guide_test_twin',
    rest: 'dusty_guide_rest', nap: 'dusty_guide_nap', revive: 'dusty_guide_revive', patch: 'dusty_guide_patch_leak',
  };
  var VOICE_MINIGAME = {
    clean: 'dusty_minigame_clean', repair: 'dusty_minigame_sequence', twintest: 'dusty_minigame_sequence',
    drill: 'dusty_minigame_drill', plant: 'dusty_minigame_plant', water: 'dusty_minigame_pour',
    harvest: 'dusty_minigame_harvest', fillwall: 'dusty_minigame_shield', checkup: 'dusty_minigame_focus',
    study: 'dusty_minigame_focus', sample: 'dusty_minigame_scan', analyse: 'dusty_minigame_focus',
    upload: 'dusty_minigame_antenna', warn: 'dusty_minigame_sun_flash', forecast: 'dusty_minigame_dust_cloud',
    rest: 'dusty_minigame_breathe', nap: 'dusty_minigame_breathe', revive: 'dusty_minigame_breathe',
    recover: 'dusty_guide_recover', patch: 'dusty_minigame_patch',
  };
  var VOICE_SUCCESS = {
    clean: 'dusty_success_clean', repair: 'dusty_success_repair', drill: 'dusty_success_drill',
    plant: 'dusty_success_plant', water: 'dusty_success_water', harvest: 'dusty_success_harvest',
    fillwall: 'dusty_success_wall', checkup: 'dusty_success_checkup', sample: 'dusty_success_sample',
    analyse: 'dusty_success_analyze', upload: 'dusty_success_upload', warn: 'dusty_success_warning',
    twintest: 'dusty_success_twin', patch: 'dusty_success_patch', rest: 'dusty_success_rest', nap: 'dusty_success_nap',
  };
  var moodTimer = null, moodExpired = false, moodRevision = 0, currentMoodPriority = 0, dustyContextKey = '', dustyContextMood = null, activeDustyMood = 'idle';
  // A voice id only when a confirmed recording exists in the current language; otherwise null, so
  // Dusty shows the text without trying (and failing) to play a missing clip.
  function voiceIf(id) { return Voice && Voice.has && Voice.has(id) ? id : null; }
  // In English, a clip whose recording says something other than the usual line shows its own
  // words (js/voice-text-en.js), so the bubble and the audio always agree.
  function spokenText(id, text) {
    var said = root.DUSTY_SPOKEN_EN;
    return id && said && said[id] && I18N.lang === 'en' && voiceIf(id) ? said[id] : text;
  }
  var screenVoiceAt = {}; // last time each screen line was spoken (ms)
  // Recent mistakes per crew role: the first one makes Dusty concerned, repeated ones encouraging.
  var recentMistakes = {};
  function mistakeMood(role) {
    var now = Date.now(), list = (recentMistakes[role] || []).filter(function (at) { return now - at < 25000; });
    list.push(now); recentMistakes[role] = list;
    return list.length >= 2 ? 'encouraging' : 'worried';
  }
  function ambientDustyMood() {
    if (App.state === 'title') return 'happy';
    if (App.state !== 'game') return 'idle';
    if (dustyContextMood) return dustyContextMood;
    var g = App.game;
    if (g && g.phase === 'end' && g.result) return g.result.survived ? 'celebrating' : 'encouraging';
    if (g && (g.alert === 'active' || g.life < 30 || g.power.battery < 1)) return 'worried';
    return g ? 'curious' : 'idle';
  }
  function clearDustyMood(reset) {
    moodRevision++;
    if (moodTimer != null) clearTimeout(moodTimer);
    moodTimer = null; moodExpired = false;
    if (reset) { currentMoodPriority = 0; activeDustyMood = ambientDustyMood(); if (Art) Art.setDustyEmotion(activeDustyMood); }
  }
  function dustyReact(text, mood, key, priority, voiceId, voiceOptions) {
    if (mood && Art) {
      var moodPriority = Number(priority) || 0;
      if (moodPriority >= currentMoodPriority || (moodTimer == null && !(Voice && Voice.isSpeaking()))) {
        clearDustyMood(false);
        currentMoodPriority = moodPriority;
        activeDustyMood = mood;
        Art.setDustyEmotion(mood);
        var revision = moodRevision;
        moodTimer = setTimeout(function () {
          moodTimer = null;
          if (revision !== moodRevision) return;
          if (Voice && Voice.isSpeaking()) moodExpired = true;
          else { activeDustyMood = ambientDustyMood(); Art.setDustyEmotion(activeDustyMood); moodExpired = false; currentMoodPriority = 0; }
        }, mood === 'celebrating' ? 6500 : 4500);
      }
    }
    if (text) {
      if (voiceId && Voice) App.playVoice(voiceId, text, Object.assign({ priority: priority || 0, dedupeKey: key || voiceId, emotion: mood }, voiceOptions || {}));
      else showDustyText(text);
    }
  }
  function showDustyText(text) {
    App.pendingDustyText = null;
    App.dustyMessage = text;
    if (UI && UI.companionMessage) UI.companionMessage(text);
  }

  // ---- Talking box inside each view ---------------------------------------
  var toasts = { base: [], earth: [] };
  function toast(aud, text, tone, keep, who) {
    var q = toasts[aud];
    if (!keep && q.length > 1) return;
    q.push({ text: text, tone: tone || 'info', age: 0, life: Math.max(2.8, text.length * 0.06), who: who || 'dusty' });
  }
  function both(text, tone, who) { toast('base', text, tone, true, who); toast('earth', text, tone, true, who); }

  var uiView = { toastFor: function (aud) { return toasts[aud][0] || null; }, lessonFor: function (id) { return Guide.bannerFor(id); } };

  function roleAudience(role) { return role === 'earth' ? 'earth' : 'base'; }

  function handleEvent(g, e) {
    var deferredMiniVoice = null;
    switch (e.type) {
      case 'smallFlare': toast('earth', t('t_flare_small', { cls: e.cls }), 'info', false, 'earth'); dustyReact(t('t_flare_small', { cls: e.cls }), 'worried', 'flare-small:' + e.cls + ':' + e.date, 65, 'dusty_warning_flare', { group: 'hazard', ttl: 6000 }); break;
      case 'flare': toast('earth', t('t_flare_earth', { cls: e.cls, date: e.date }), 'bad', true, 'earth'); dustyReact(t('t_flare_earth', { cls: e.cls, date: e.date }), 'alert', 'flare:' + e.cls + ':' + e.date, 90, 'dusty_warning_flare', { group: 'hazard', ttl: 6000, replaceGroup: true }); sfx('flare'); break;
      case 'stormHit': both(t('t_storm'), 'bad'); dustyReact(t('t_storm'), 'alert', 'event:storm-hit', 100, 'dusty_warning_storm_active', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('storm'); break;
      case 'allClear':
        toast('base', t(e.falseAlarm ? 't_clear_false' : 't_clear'), e.falseAlarm ? 'info' : 'good', true);
        if (!e.falseAlarm) {
          var stormVoice = g.storm && g.storm.warnedInTime ? 'dusty_storm_over' : 'dusty_storm_warning_missed';
          dustyReact(t('t_clear'), g.storm && g.storm.warnedInTime ? 'happy' : 'encouraging', 'event:storm-clear', 70, stormVoice, { group: 'hazard', ttl: 5000, replaceGroup: true });
        }
        sfx(e.falseAlarm ? 'radio' : 'clear');
        // The crew just lived through a real flare: show the real Sun from that day.
        if (!e.falseAlarm && g.storm) App.realQueue.push({ flare: g.storm.flare, date: g.today().date, count: g.storm.count });
        break;
      case 'broken': both(t(e.why === 'storm' ? 't_broken_storm' : 't_broken', { device: t('dev_' + e.device) }), 'bad'); dustyReact(t('t_broken', { device: t('dev_' + e.device) }), 'worried', 'event:broken:' + e.device, 90, 'dusty_equipment_broken', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('broken'); break;
      case 'down': both(t('t_down', { who: t('role_' + e.role) }), 'bad'); dustyReact(t('dusty_down_support', { who: t('role_' + e.role) }), 'encouraging', 'event:down:' + e.role, 85, 'dusty_teammate_down', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('down'); break;
      case 'saved': both(t('t_saved', { who: t('role_' + e.who) }), 'good', e.role); dustyReact(t('t_saved', { who: t('role_' + e.who) }), 'celebrating', 'event:saved:' + e.who, 55, 'dusty_teammate_saved', { group: 'hazard', ttl: 5000 }); sfx('saved'); break;
      case 'carried': both(t('t_carried', { who: t('role_' + e.role) }), 'info'); break;
      case 'awake':
        toast('base', t('t_awake', { who: t('role_' + e.role) }), 'good', false);
        if (g.crew[e.role] && g.crew[e.role].player != null) dustyReact(t('t_awake', { who: t('role_' + e.role) }), 'happy', 'awake:' + e.role + ':' + g.sol, 55, 'dusty_success_generic', { group: 'task-result', ttl: 7000, replaceGroup: true });
        break;
      case 'lowSuit': if (g.crew[e.role].player != null) { toast('base', t('t_low_suit'), 'bad', true); dustyReact(t('t_low_suit'), 'alert', 'event:low-suit:' + e.role, 90, 'dusty_warning_suit_air', { group: 'hazard', ttl: 5000, replaceGroup: true }); } break;
      case 'meteorWarn': toast('base', t('t_meteor'), 'bad', true); dustyReact(t('t_meteor'), 'alert', 'event:meteor', 100, 'dusty_warning_meteor', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('meteor'); break;
      case 'boom': Render.boom(e.x, e.y); dustyReact(t('dusty_meteor_hit'), 'alert', 'meteor-hit:' + g.sol, 100, 'dusty_meteor_hit', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('boom'); break;
      case 'leak': toast('base', t('t_leak'), 'bad', true); dustyReact(t('t_leak'), 'alert', 'event:leak', 100, 'dusty_warning_leak', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('leak'); break;
      case 'devil': toast('base', t('t_devil'), 'info', true); dustyReact(t('t_devil'), 'alert', 'dust-devil:' + g.sol, 80, 'dusty_warning_dust_devil', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('devil'); break;
      case 'botSay': toast('base', t(e.key), 'info', false, e.role); break;
      case 'hurt': if (e.why === 'accident' && g.crew[e.role].player != null) toast('base', t('t_shock'), 'bad', false); if (g.crew[e.role].player != null) sfx('hurt'); break;
      case 'radioIn':
        toast('base', t(e.key, { minutes: e.minutes }), e.key === 'msg_warning' ? 'bad' : 'info', true, 'earth');
        if (e.key === 'msg_warning') dustyReact(t(e.key, { minutes: e.minutes }), 'worried', 'storm-coming:' + g.sol, 90, 'dusty_warning_storm_coming', { group: 'hazard', ttl: 7000, replaceGroup: true });
        sfx('radio'); break;
      case 'radioEarth': toast('earth', t(e.key), 'good', false, 'earth'); sfx('radio'); break;
      case 'radioLost': toast('earth', t('t_lost'), 'bad', true, 'earth'); dustyReact(t('t_lost'), 'worried', 'radio-lost:' + g.sol, 85, 'dusty_radio_message_lost', { group: 'hazard', ttl: 5000, replaceGroup: true }); sfx('lost'); break;
      case 'radioSent': if (e.to === 'base') toast('earth', t('t_sent', { s: Math.round(e.delay) }), 'info', false, 'earth'); break;
      case 'done':
        // Only talk about what the player did, so helpers do not fill the screen with messages.
        if (g.crew[e.role].player == null) break;
        toast(roleAudience(e.role), t(e.key, { n: e.n }), 'good', false, e.role);
        if (e.key === 'done_water_bad') dustyReact(t('done_water_bad'), mistakeMood(e.role),'water-spill:' + g.sol + ':' + e.role, 55, 'dusty_mistake_spilled_water', { group: 'task-result', ttl: 7000, replaceGroup: true });
        sfx(e.key === 'done_harvest' ? 'harvest' : 'done');
        break;
      case 'miniStart':
        if (g.crew[e.role] && g.crew[e.role].player != null && VOICE_MINIGAME[e.action]) {
          var miniText = t('dusty_activity', { action: t('act_' + e.action) });
          dustyReact(miniText, 'guiding', 'minigame:' + e.role + ':' + e.action + ':' + g.sol, 65);
          deferredMiniVoice = { id: VOICE_MINIGAME[e.action], action: e.action, role: e.role, sol: g.sol };
        }
        break;
      case 'blocked':
        toast(roleAudience(e.role), t(e.key), 'bad');
        if (g.crew[e.role] && g.crew[e.role].player != null) {
          var blockedVoices = { act_nolab: 'dusty_blocked_lab_power', act_noparts: 'dusty_blocked_no_parts', act_nopower: 'dusty_blocked_no_power', act_nowater: 'dusty_blocked_no_water', act_noradio: 'dusty_blocked_radio' };
          dustyReact(t('dusty_blocked_action', { reason: t(e.key) }), 'thinking', 'event:blocked:' + e.key, 75, blockedVoices[e.key], { group: 'guidance', ttl: 5000, replaceGroup: true });
        }
        break;
      case 'miniDone':
        if (g.crew[e.role] && g.crew[e.role].player != null) {
          var taskText = t('act_' + e.action);
          if (e.hurt) dustyReact(t('dusty_task_try'), mistakeMood(e.role),'event:task-mistake:' + e.action, 55, 'dusty_mistake_missed', { group: 'task-result', ttl: 7000, replaceGroup: true });
          else if (!(e.action === 'water' && e.quality < 0.6) && e.action !== 'revive') dustyReact(t('dusty_task_success', { action: taskText }), 'happy', 'event:task-success:' + e.action, 55, VOICE_SUCCESS[e.action] || 'dusty_success_generic', { group: 'task-result', ttl: 7000, replaceGroup: true });
        }
        break;
      case 'science': both(t('t_science', { n: e.n }), 'good'); dustyReact(t('t_science', { n: e.n }), 'curious', 'event:science:' + e.n, 60, 'dusty_science_discovery', { group: 'achievement', ttl: 6000, replaceGroup: true }); sfx('science'); break;
      // Bedtime has no recordings yet, so Dusty only shows the text.
      case 'bedtime': dustyReact(t('dusty_bedtime'), 'guiding', 'bedtime:' + g.sol, 80, null, { group: 'guidance', ttl: 9000, replaceGroup: true }); break;
      case 'bedReady': dustyReact(t('dusty_bed_ready'), 'happy', 'bed-ready:' + g.sol, 70, null, { group: 'guidance', ttl: 7000, replaceGroup: true }); break;
      case 'bedLate': dustyReact(t('dusty_bed_late'), 'worried', 'bed-late:' + g.sol, 85, null, { group: 'guidance', ttl: 8000, replaceGroup: true }); break;
      case 'dust': toast('base', t('t_dust'), 'bad', true); dustyReact(t('t_dust'), 'alert', 'dust-storm:' + g.sol, 90, 'dusty_warning_dust_storm', { group: 'hazard', ttl: 5000, replaceGroup: true }); break;
      case 'mini':
        sfx(e.sound === 'good' ? 'good' : 'bad');
        if (e.sound === 'bad' && g.crew[e.role] && g.crew[e.role].player != null) dustyReact(t('dusty_task_try'), mistakeMood(e.role),'mini-mistake:' + e.role + ':' + e.action + ':' + g.sol, 55, 'dusty_mistake_try_again', { group: 'task-result', ttl: 7000, cooldown: 10000, replaceGroup: true });
        break;
      case 'eventRadiationWarning':
        toast('base', t('event_rad_warning'), 'bad', true);
        dustyReact(t('event_rad_warning'), 'alert', 'event-rad-warning:' + e.date, 95, voiceIf('dusty_event_rad_warning'), { group: 'hazard', ttl: 6000, replaceGroup: true });
        sfx('radio');
        break;
      case 'eventRadiationStart':
        dustyReact(t('event_rad_alert'), 'alert', 'event-rad-alert:' + e.date, 100, voiceIf('dusty_event_rad_alert'), { group: 'hazard', ttl: 6000, replaceGroup: true });
        sfx('storm');
        break;
      case 'eventRadiationClear':
        dustyReact(t('event_rad_clear'), 'encouraging', 'event-rad-clear:' + e.date, 75, voiceIf('dusty_event_rad_clear'), { group: 'hazard', ttl: 6000, replaceGroup: true });
        sfx('clear');
        break;
      case 'eventDustStage':
        if (e.stage === 2) dustyReact(t('event_storm_worsens'), 'worried', 'event-dust-peak', 90, voiceIf('dusty_event_storm_worsens'), { group: 'hazard', ttl: 8000, replaceGroup: true });
        else if (e.stage === 4) dustyReact(t('event_storm_eases'), 'curious', 'event-dust-clears', 65, voiceIf('dusty_event_storm_eases'), { group: 'hazard', ttl: 8000, replaceGroup: true });
        break;
    }
    Guide.onEvent(App, g, e);
    if (deferredMiniVoice) {
      if (App.modal) App.pendingMiniVoice = deferredMiniVoice;
      else App.playVoice(deferredMiniVoice.id, t('dusty_activity', { action: t('act_' + deferredMiniVoice.action) }), { priority: 65, dedupeKey: 'minigame:' + deferredMiniVoice.role + ':' + deferredMiniVoice.action + ':' + deferredMiniVoice.sol, group: 'minigame', ttl: 12000, replaceGroup: true });
    }
    // Class mode: stop the game at big moments so the group talks first.
    if (App.settings.classroom && !g.level && THINK[e.type] && !App.thought[e.type]) {
      App.thought[e.type] = true;
      App.thinkQueue.push(THINK[e.type]);
    }
  }

  var THINK = { stormHit: 'storm', down: 'down', broken: 'broken', leak: 'leak', meteorWarn: 'meteor', radioLost: 'lost' };

  // Dusty's live advice is derived only from the human crew's current game state.
  function updateDustyContext(g) {
    if (!g || App.state !== 'game' || !App.introDone || App.paused || App.modal || g.phase !== 'day') {
      if (App.state !== 'game' || g && g.phase !== 'day') { dustyContextKey = ''; dustyContextMood = null; App.dustyTopic = null; }
      return;
    }
    // In a crew game Dusty talks to whoever most recently reached a machine or started a game,
    // so player 2 is not ignored while player 1 stands next to something.
    var player = null, crew = null, newest = -1, now = performance.now();
    var seen = App.dustyFocus = App.dustyFocus || {};
    for (var i = 0; i < g.players.length; i++) {
      var candidate = g.players[i], member = g.crew[candidate.roles[candidate.active]];
      var sig = member.role + '|' + (member.mini ? 'mini:' + member.mini.action : member.near || '');
      if (!seen[candidate.id] || seen[candidate.id].sig !== sig) seen[candidate.id] = { sig: sig, at: now };
      var busy = !!(member.near || member.mini);
      if (!player) { player = candidate; crew = member; }
      if (busy && seen[candidate.id].at > newest) { newest = seen[candidate.id].at; player = candidate; crew = member; }
    }
    if (!player || !crew) return;
    var next = null, topic = null, voiceId = null;
    if (crew.mini) {
      topic = Guide.TASK_LESSON[crew.mini.action] || null;
      next = { key: 'mini:' + crew.role + ':' + crew.mini.action, text: t('dusty_activity', { action: t('act_' + crew.mini.action) }), mood: 'encouraging', priority: 1 };
    } else if (crew.role !== 'earth' && g.alert === 'active' && crew.zone !== 'shelter') {
      next = { key: 'storm:' + g.sol + ':' + crew.role, text: t('go_shelter'), mood: 'alert', priority: 90 };
      voiceId = voiceIf('dusty_go_shelter');
    } else if (g.life < 30) {
      next = { key: 'air:' + g.sol, text: t('dusty_low_air', { n: Math.round(g.life) }), mood: 'worried', priority: 90 };
      voiceId = 'dusty_low_air_food';
    } else if (g.power.battery < 1) {
      next = { key: 'power:' + g.sol, text: t('dusty_low_power', { n: Math.round(g.power.battery) }), mood: 'worried', priority: 90 };
      voiceId = 'dusty_low_power';
    } else if (crew.health < 30) {
      next = { key: 'health:' + g.sol + ':' + crew.role, text: t('dusty_low_health'), mood: 'worried', priority: 80 };
      voiceId = 'dusty_low_health';
    } else if (g.water < SolCrew.RULES.valveWater) {
      next = { key: 'water:' + g.sol, text: t('dusty_low_water'), mood: 'worried', priority: 80 };
      voiceId = 'dusty_low_water';
    } else if (g.t / g.dayLen > 0.8 && crew.zone === 'outside') {
      next = { key: 'night:' + g.sol + ':' + crew.role, text: t('dusty_night'), mood: 'worried', priority: 65 };
      voiceId = 'dusty_night_coming';
    } else {
      var nearby = crew.near, nearbyDistance = nearby ? 0 : 1.35;
      if (!nearby && root.World && root.World.stationDistance) {
        g.stationIds().forEach(function (id) {
          var distance = root.World.stationDistance(g.st(id), crew.x, crew.y);
          if (distance < nearbyDistance) { nearby = id; nearbyDistance = distance; }
        });
      }
      var action = nearby && g.stationAction(nearby, crew);
      if (action) {
        topic = Guide.TASK_LESSON[action.action] || null;
        if (action.blocked) {
          var blockedMap = { noparts: 'dusty_blocked_no_parts', nopower: 'dusty_blocked_no_power', nowater: 'dusty_blocked_no_water', nolab: 'dusty_blocked_lab_power', noradio: 'dusty_blocked_radio' };
          next = { key: 'blocked:' + nearby + ':' + action.action, text: t('dusty_blocked_action', { reason: t('act_' + action.action) }), mood: 'thinking', priority: 65 };
          voiceId = blockedMap[action.action];
        } else {
          next = { key: 'action:' + nearby + ':' + action.action, text: t('dusty_near_action', { key: Input.actKey(player.id), action: t('act_' + action.action) }) + (action.cost ? ' ' + t(action.cost) : ''), mood: 'guiding', priority: 65 };
          voiceId = VOICE_GUIDE[action.action];
        }
      } else if (nearby) {
        var roleAction = null;
        for (var r = 0; r < ROLES.length; r++) {
          var other = g.crew[ROLES[r]];
          if (other.role !== crew.role && g.stationAction(nearby, other)) { roleAction = other; break; }
        }
        if (roleAction) { next = { key: 'role:' + nearby + ':' + crew.role + ':' + roleAction.role, text: t('dusty_wrong_role', { role: t('role_' + roleAction.role) }), mood: 'thinking', priority: 45 }; voiceId = voiceIf('dusty_wrong_role'); }
      }
    }
    if (!next) { dustyContextKey = ''; dustyContextMood = null; App.dustyTopic = null; return; }
    dustyContextMood = next.mood;
    App.dustyTopic = topic;
    if (next.key === dustyContextKey) return;
    dustyContextKey = next.key;
    dustyReact(next.text, next.mood, 'context:' + next.key, next.priority, voiceId, { group: voiceId && (voiceId.indexOf('blocked_') >= 0 || voiceId.indexOf('_low_') >= 0 || voiceId.indexOf('night_') >= 0 || voiceId === 'dusty_go_shelter') ? 'hazard' : 'guidance', ttl: 7000, cooldown: 20000, replaceGroup: true });
  }

  var App = {
    settings: { players: 1, diff: 'cadet', season: 'aug2026', classroom: false },
    live: null, liveChecked: false, sound: true, music: true, voice: true, game: null, pick: null, cards: {}, stars: {}, thought: {}, thinkQueue: [], realQueue: [], looks: [{}, {}, {}, {}], newCards: {}, dustyMessage: '', dustyWelcomed: false, dustyGreetingPlaying: false, dustyTopic: null,
    state: 'title', planCursors: [], voteCursor: [], paused: false, modal: false, modalAt: 0, reportTime: 0, showSuns: false,
    eventMission: null, eventPowerChoice: 'solar', eventCrewRole: 'engineer', suspendedCampaign: null,

    openEventArchive: function () {
      if (this.state === 'game' && this.game && !this.eventMission && !this.suspendedCampaign) {
        this.suspendedCampaign = {
          game: this.game, state: this.state, paused: this.paused, introDone: this.introDone, shownPhase: this.shownPhase,
          dustyMessage: this.dustyMessage, dustyTopic: this.dustyTopic, thought: Object.assign({}, this.thought),
          thinkQueue: this.thinkQueue.slice(), realQueue: this.realQueue.slice(), pendingMiniVoice: this.pendingMiniVoice,
          missionCriticalSpoken: this.missionCriticalSpoken, reportTime: this.reportTime, planCursors: this.planCursors.slice(), voteCursor: this.voteCursor.slice(),
          toasts: { base: toasts.base.map(function (item) { return Object.assign({}, item); }), earth: toasts.earth.map(function (item) { return Object.assign({}, item); }) },
          guide: Guide && Guide.snapshot ? Guide.snapshot() : null, pick: this.pick, missionConfig: this.missionConfig,
          inputSolo: Input.isSolo ? Input.isSolo() : this.game.players.length === 1,
        };
      }
      if (Voice) Voice.cancel();
      this.eventMission = null; this.game = null; this.paused = false; this.modal = false;
      this.state = 'eventArchive'; this.dustyMessage = t('event_tagline');
      document.body.classList.remove('in-game');
      document.getElementById('hud').hidden = true;
      if (UI.companionMessage) UI.companionMessage(this.dustyMessage);
      UI.eventArchive(this); resize();
    },
    openEventBrief: function (id) {
      if (Voice) Voice.cancel();
      this.state = 'eventBrief'; this.eventMission = id; this.dustyMessage = t(id === 'radiation' ? 'event_rad_intro' : 'event_dust_intro');
      this.eventCrewRole = id === 'radiation' ? 'doctor' : 'engineer';
      if (id === 'darkenedSky') this.eventPowerChoice = 'solar';
      if (Art) Art.setDustyEmotion(id === 'radiation' ? 'curious' : 'worried');
      if (UI.companionMessage) UI.companionMessage(this.dustyMessage);
      var briefVoice = voiceIf(id === 'radiation' ? 'dusty_event_rad_intro' : 'dusty_event_dust_intro');
      if (briefVoice) this.playVoice(briefVoice, null, { priority: 50, group: 'event-brief', ttl: 9000, replaceGroup: true, emotion: id === 'radiation' ? 'curious' : 'worried' });
      UI.eventBrief(this, id); resize();
    },
    setEventRole: function (id, role) { if (['engineer', 'doctor', 'farmer'].indexOf(role) < 0) return; this.eventCrewRole = role; UI.eventBrief(this, id); },
    setEventPower: function (mode) { this.eventPowerChoice = mode === 'radioisotope' ? mode : 'solar'; UI.eventBrief(this, 'darkenedSky'); },
    launchEvent: function (id) {
      var mission = root.NASAEventMissions.DATA[id];
      if (!mission) return;
      if (Voice) Voice.cancel();
      this.eventMission = id;
      this.pick = { sel: [0], locked: [true] };
      Input.setSolo(true);
      var level = root.NASAEventMissions.createLevel(id, this.eventPowerChoice);
      this.start(new SolCrew.Game({ difficulty: 'cadet', season: this.seasonById('quiet2016'), players: [{ id: 0, roles: [this.eventCrewRole], active: 0 }], level: level }), true);
      this.introDone = true;
      this.dustyMessage = t(id === 'radiation' ? 'event_rad_intro' : 'event_dust_intro');
      if (UI.companionMessage) UI.companionMessage(this.dustyMessage);
      if (Art) Art.setDustyEmotion(id === 'radiation' ? 'alert' : 'worried');
      this.shownPhase = null;
      this.syncPhase();
      if (this.game && this.game.phase === 'plan') UI.plan(this);
    },
    returnEventArchive: function () {
      if (Voice) Voice.cancel();
      this.eventMission = null; this.modal = false; this.paused = false;
      if (this.suspendedCampaign) {
        var saved = this.suspendedCampaign; this.suspendedCampaign = null;
        this.game = saved.game; this.state = saved.state; this.paused = saved.paused; this.introDone = saved.introDone; this.shownPhase = saved.shownPhase;
        this.dustyMessage = saved.dustyMessage; this.dustyTopic = saved.dustyTopic; this.thought = saved.thought; this.thinkQueue = saved.thinkQueue; this.realQueue = saved.realQueue; this.pendingMiniVoice = saved.pendingMiniVoice;
        this.missionCriticalSpoken = saved.missionCriticalSpoken; this.reportTime = saved.reportTime; this.planCursors = saved.planCursors; this.voteCursor = saved.voteCursor;
        this.pick = saved.pick; this.missionConfig = saved.missionConfig; toasts = saved.toasts;
        if (Guide && Guide.restore) Guide.restore(saved.guide);
        if (Input.setSolo) Input.setSolo(saved.inputSolo);
        dustyContextKey = ''; dustyContextMood = null; clearDustyMood(true);
        document.body.classList.add('in-game'); document.getElementById('hud').hidden = false;
        UI.clear(); UI.updateHud(this.game); UI.resetHud(); this.shownPhase = null;
        if (this.paused) UI.pause(this); else this.syncPhase(); resize();
        return;
      }
      this.game = null; this.state = 'eventArchive';
      document.body.classList.remove('in-game'); document.getElementById('hud').hidden = true;
      this.dustyMessage = t('event_tagline'); if (UI.companionMessage) UI.companionMessage(this.dustyMessage);
      UI.eventArchive(this); resize();
    },
    finishEventToTitle: function () {
      if (this.suspendedCampaign) this.returnEventArchive();
      else { this.eventMission = null; this.go('title'); }
    },
    exitEventArchive: function () {
      if (this.suspendedCampaign) this.returnEventArchive();
      else { this.eventMission = null; this.go('title'); }
    },

    greetDusty: function () {
      if (this.dustyWelcomed) return;
      this.dustyWelcomed = true;
      dustyReact(spokenText('dusty_welcome', t('dusty_welcome')), 'welcome', 'greeting:welcome', 40);
      this.pendingDustyGreeting = this.dustyMessage;
    },
    spokenText: spokenText,
    playVoice: function (id, text, options) {
      text = text ? spokenText(id, text) : '';
      if (!Voice || !id) { if (text) showDustyText(text); return false; }
      options = options || {};
      var dedupeKey = options.dedupeKey || id;
      var accepted = Voice.play(id, {
        text: text, priority: options.priority, emotion: options.emotion,
        dedupeKey: dedupeKey, group: options.group || '', context: options.context || '',
        ttl: options.ttl, cooldown: options.cooldown, replaceGroup: options.replaceGroup, force: options.force,
      });
      // Keep the bubble in step with the audio: while another recording is still speaking, a
      // queued line's text waits until that recording ends (or until its own clip starts).
      var current = Voice.current ? Voice.current() : null;
      if (text) {
        if (accepted && current && current.dedupeKey !== dedupeKey && Voice.isSpeaking()) this.pendingDustyText = text;
        else showDustyText(text);
      }
      return accepted;
    },
    requestDustyMore: function () {
      // The detail opens inside the bubble; Dusty only shows that he is explaining.
      if (!this.dustyTopic) return;
      dustyReact(null, 'thinking', 'more:' + this.dustyTopic, 30);
    },

    go: function (name) {
      this.pendingMiniVoice = null;
      var keepWelcome = this.preserveWelcomeOnce && this.state === 'title' && name !== 'title';
      this.preserveWelcomeOnce = false;
      if (Voice && !keepWelcome) Voice.cancel();
      if (!keepWelcome) {
        clearDustyMood(false);
        if (Art) Art.setDustySpeaking(false);
      }
      this.state = name;
      dustyContextKey = ''; dustyContextMood = null;
      // Leaving the menu during the welcome entrance sends Dusty straight back to his corner.
      if (root.DustyIntro && root.DustyIntro.active()) root.DustyIntro.active().check(name);
      activeDustyMood = ambientDustyMood();
      if (Art) Art.setDustyEmotion(activeDustyMood);
      this.dustyTopic = null;
      if (!keepWelcome && name === 'title' && this.dustyWelcomed) this.dustyMessage = t('dusty_return');
      else if (!keepWelcome && name !== 'title') this.dustyMessage = name === 'blueprint' ? t('dusty_blueprint_intro') : t('dusty_screen_ready');
      if (name === 'blueprint') dustyReact(t('dusty_blueprint_intro'), 'curious', 'blueprint:intro', 50, 'dusty_blueprint_intro', { group: 'blueprint', ttl: 12000, replaceGroup: true });
      else if (name === 'howto') dustyReact(t('dusty_general_help'), 'thinking', 'help:general', 45, 'dusty_general_help', { group: 'guidance', ttl: 12000, replaceGroup: true });
      if (UI && UI.companionMessage && this.dustyMessage) UI.companionMessage(this.dustyMessage);
      // Spoken screen lines, only when recorded, and rarely (Voice's own dedupe forgets after 20 s).
      if (!keepWelcome) {
        var screenVoice = name === 'title' ? (this.dustyWelcomed ? 'dusty_return' : null)
          : (name === 'blueprint' || name === 'howto' || name === 'landingLab') ? null : 'dusty_screen_ready';
        var nowMs = Date.now(), gap = screenVoice === 'dusty_return' ? 60000 : 120000;
        if (screenVoice && voiceIf(screenVoice) && !(screenVoiceAt[screenVoice] && nowMs - screenVoiceAt[screenVoice] < gap)) {
          screenVoiceAt[screenVoice] = nowMs;
          this.playVoice(screenVoice, null, { priority: screenVoice === 'dusty_return' ? 35 : 30, group: 'screen', ttl: 6000, replaceGroup: true, emotion: screenVoice === 'dusty_return' ? 'happy' : 'idle' });
        }
      }
      this.modal = false;
      document.body.classList.remove('in-game');
      document.getElementById('hud').hidden = true;
      this.game = null;
      if (name === 'title') UI.title(this);
      else if (name === 'setup') UI.setup(this);
      else if (name === 'roles') { this.resetPick(); Input.setSolo(this.settings.players === 1); UI.roles(this); }
      else if (name === 'blueprint') { this.missionDesign = this.missionDesign || { site: 'gale', instruments: ['meda'] }; this.dustyMessage = t('dusty_blueprint_intro'); UI.blueprint(this); }
      else if (name === 'howto') UI.howto(this);
      else if (name === 'data') UI.dataRoom(this);
      else if (name === 'lab') UI.lab(this);
      else if (name === 'academy') UI.academy(this);
      else if (name === 'landingLab') { UI.landingLab(this); dustyReact(t('ll_intro'), 'curious', 'lab:intro', 40, voiceIf('dusty_lab_intro'), { group: 'lab', ttl: 9000, replaceGroup: true }); }
      resize();
    },

    // Best stars for each academy level, kept on this device.
    saveStars: function (id, n) {
      if ((this.stars[id] || 0) >= n) return;
      this.stars[id] = n;
      store('marscrew.academy', JSON.stringify(this.stars));
    },

    setClassroom: function (on) {
      this.settings.classroom = on;
      store('marscrew.class', on ? '1' : '0');
    },

    // Stops the game with a question for the group (class mode).
    think: function (key) {
      if (Voice) Voice.cancel();
      var self = this;
      this.modal = true;
      this.modalAt = performance.now();
      this.modalClose = function () { self.modal = false; UI.clear(); self.shownPhase = null; };
      UI.think(this, key, this.modalClose);
    },

    // "This really happened": the real Sun on the day of the flare the crew just lived through.
    showReal: function (info) {
      if (Voice) Voice.cancel();
      var self = this;
      this.modal = true;
      this.modalAt = performance.now();
      this.modalClose = function () { self.modal = false; UI.clear(); self.shownPhase = null; };
      UI.realCard(this, info, this.modalClose);
    },

    // After a loss: back to the morning of the same day, with everything as it was.
    retryDay: function () {
      var g = this.game;
      if (!g || !g.retryDay()) return this.go('setup');
      if (Voice) Voice.cancel();
      dustyReact(t('dusty_retry_encouragement'), 'encouraging', 'mission:retry:' + g.sol, 55, 'dusty_retry_encouragement', { group: 'task-result', ttl: 10000, replaceGroup: true });
      this.state = 'game';
      this.paused = false;
      this.modal = false;
      this.thinkQueue = [];
      this.realQueue = [];
      toasts = { base: [], earth: [] };
      UI.resetHud();
      UI.clear();
      document.getElementById('hud').hidden = false;
      this.shownPhase = null;
    },

    say: function (aud, text, tone, who) {
      toast(aud, text, tone, true, who);
      if (who === 'dusty' && aud === 'base') dustyReact(text, tone === 'bad' ? 'worried' : 'encouraging', 'guide:' + text, tone === 'bad' ? 55 : 30);
    },
    speakText: function (text, key, priority, voiceId) { dustyReact(text, 'thinking', key || 'manual:' + text, priority || 30, voiceId, { dedupeKey: key, group: 'manual', replaceGroup: true, ttl: 30000 }); return !!voiceId; },
    toggleVoice: function () {
      this.voice = !this.voice;
      store('marscrew.voice', this.voice ? '1' : '0');
      if (Voice) Voice.setEnabled(this.voice);
      UI.updateVoiceControls();
    },
    replayVoice: function () { if (Voice) Voice.replay(); },
    stopVoice: function () { if (Voice) Voice.stop(); },
    setVoiceVolume: function (value) {
      var amount = Math.max(0, Math.min(1, Number(value) || 0));
      store('marscrew.voiceVolume', String(amount));
      if (Voice) Voice.setVolume(amount);
      UI.updateVoiceControls();
    },

    addCard: function (id) {
      if (this.cards[id]) return false;
      this.cards[id] = true;
      this.newCards[id] = true;
      store('marscrew.cards', Object.keys(this.cards).join(','));
      if (this.state === 'game' && this.game && this.game.phase === 'report') dustyReact(t('dusty_science_congratulations'), 'celebrating', 'science-card-earned:' + id, 55, 'dusty_science_congratulations', { group: 'achievement', ttl: 9000, replaceGroup: true });
      return true;
    },

    openLearn: function (id, onClose) {
      if (Voice) Voice.cancel();
      var self = this;
      this.modal = true;
      this.modalAt = performance.now();
      this.modalClose = function () {
        self.modal = false;
        if (onClose) onClose();
        else { UI.clear(); self.shownPhase = null; }
        if (self.pendingMiniVoice) {
          var pendingMini = self.pendingMiniVoice;
          self.pendingMiniVoice = null;
          self.playVoice(pendingMini.id, t('dusty_activity', { action: t('act_' + pendingMini.action) }), { priority: 65, dedupeKey: 'minigame:' + pendingMini.role + ':' + pendingMini.action + ':' + pendingMini.sol, group: 'minigame', ttl: 12000, replaceGroup: true });
        }
      };
      UI.learn(this, id, this.modalClose);
    },

    resetPick: function () {
      var n = this.settings.players;
      this.pick = { sel: [0, 1, 2, 3].slice(0, n), locked: [false, false, false, false].slice(0, n) };
      if (n === 2) this.pick.sel = [0, 3]; // start one player on Mars and one on Earth
    },

    clickRole: function (i) {
      var p = this.pick, n = p.sel.length;
      if (p.sel.indexOf(i) >= 0) {
        var owner = p.sel.indexOf(i);
        p.locked[owner] = !p.locked[owner];
      } else {
        var free = p.locked.indexOf(false);
        if (free < 0) free = 0;
        p.sel[free] = i;
        p.locked[free] = n > 1;
      }
      UI.roles(this);
    },

    movePick: function (player, dir) {
      var p = this.pick;
      if (p.locked[player]) return;
      var i = p.sel[player];
      for (var s = 0; s < 4; s++) {
        i = (i + dir + 4) % 4;
        var taken = p.sel.some(function (v, k) { return k !== player && v === i && p.locked[k]; });
        if (!taken) break;
      }
      p.sel[player] = i;
      UI.roles(this);
    },

    lockPick: function (player) {
      var p = this.pick;
      var clash = p.sel.some(function (v, k) { return k !== player && v === p.sel[player] && p.locked[k]; });
      if (clash) return;
      p.locked[player] = !p.locked[player];
      UI.roles(this);
      if (p.locked.every(Boolean)) this.go('blueprint');
    },

    // Each player is one person. Everyone else in the crew is a robot helper.
    assignRoles: function () {
      var p = this.pick, n = p.sel.length;
      var used = {}, players = [];
      for (var i = 0; i < n; i++) {
        var pickRole = ROLES[p.sel[i]];
        if (used[pickRole]) pickRole = ROLES.filter(function (r) { return !used[r]; })[0];
        used[pickRole] = true;
        players.push({ id: i, roles: [pickRole], active: 0 });
      }
      return players;
    },

    seasonById: function (id) {
      if (id === 'live' && this.live) return this.live;
      return root.DONKI_ARCHIVE[id] || root.DONKI_ARCHIVE.aug2026;
    },

    launch: function () {
      var s = this.settings;
      this.missionConfig = root.MissionDNA.normalize(this.missionDesign || { site: 'gale', instruments: ['meda'] });
      if (!this.missionConfig) return this.go('blueprint');
      this.start(new SolCrew.Game({ difficulty: s.diff, season: this.seasonById(s.season), players: this.assignRoles(), mission: this.missionConfig }), s.players === 1);
      UI.intro(this, 0);
      var names = this.missionConfig.instruments.map(function (id) { return t('md_inst_' + id); }).join(', ');
      dustyReact(t('dusty_mission_confirmed', { site: t('md_site_' + this.missionConfig.site), payload: names }), 'happy', 'mission:confirmed', 55, 'dusty_mission_confirmed', { group: 'blueprint', ttl: 12000, replaceGroup: true });
    },

    setMissionSite: function (site) {
      this.missionDesign.site = site;
      if (Voice) Voice.cancel();
      dustyReact(t('dusty_site_' + site), 'curious', 'mission:site:' + site, 50, 'dusty_site_' + site, { group: 'blueprint', ttl: 10000, replaceGroup: true });
      UI.blueprint(this);
    },
    toggleMissionInstrument: function (id) {
      if (Voice) Voice.cancelGroup('blueprint');
      var list = this.missionDesign.instruments, at = list.indexOf(id);
      if (at >= 0) list.splice(at, 1); else list.push(id);
      var check = root.MissionDNA.validate(this.missionDesign);
      if (check.mass > root.MissionDNA.BUDGET.mass || check.power > root.MissionDNA.BUDGET.power) {
        var explanation = [];
        if (check.mass > root.MissionDNA.BUDGET.mass) explanation.push(t('md_over_mass'));
        if (check.power > root.MissionDNA.BUDGET.power) explanation.push(t('md_over_power'));
        dustyReact(t('dusty_instrument_' + id) + ' ' + explanation.join(' '), 'thinking', 'mission:budget:' + check.mass + ':' + check.power, 65, 'dusty_instrument_' + id, { group: 'blueprint', ttl: 10000, replaceGroup: true });
      }
      else if (at < 0) dustyReact(t('dusty_instrument_' + id), 'curious', 'mission:instrument:' + id, 50, 'dusty_instrument_' + id, { group: 'blueprint', ttl: 10000, replaceGroup: true });
      else dustyReact(t('dusty_payload_removed'), 'thinking', 'mission:payload-removed', 45, 'dusty_payload_removed', { group: 'blueprint', ttl: 10000, replaceGroup: true });
      UI.blueprint(this);
    },
    confirmMission: function () { this.launch(); },

    // A solo academy level: one player, the level's job, robots for the rest.
    launchLevel: function (id) {
      var L = root.Levels.get(id);
      Input.setSolo(true);
      this.start(new SolCrew.Game({ difficulty: 'cadet', season: root.DONKI_ARCHIVE[L.season], players: [{ id: 0, roles: [L.role], active: 0 }], level: L }), true);
      // The level's experiment is the intro.
      this.introDone = true;
      this.openLearn(L.lab);
    },

    start: function (game, solo) {
      if (Voice) Voice.cancel();
      clearDustyMood(false);
      dustyContextMood = null;
      activeDustyMood = 'curious';
      if (Art) Art.setDustyEmotion(activeDustyMood);
      this.game = game;
      dustyContextKey = ''; dustyContextMood = null;
      // Each player's name and suit colour, picked on the roles screen.
      var looks = this.looks;
      game.looks = {};
      game.players.forEach(function (p) { if (looks[p.id] && (looks[p.id].name || looks[p.id].color)) game.looks[p.id] = { name: looks[p.id].name || '', color: looks[p.id].color || null }; });
      this.state = 'game';
      this.paused = false;
      this.modal = false;
      this.thought = {};
      this.missionCriticalSpoken = false;
      this.dustyFocus = {};
      this.thinkQueue = [];
      this.realQueue = [];
      toasts = { base: [], earth: [] };
      Guide.reset();
      document.body.classList.add('in-game');
      UI.resetHud();
      document.getElementById('hud').hidden = false;
      UI.updateHud(this.game);
      this.shownPhase = null;
      this.introDone = false;
      resize();
    },

    afterIntro: function () { this.introDone = true; this.shownPhase = null; dustyReact(t('dusty_mission_ready'), 'happy', 'intro:ready', 45, 'dusty_mission_ready', { group: 'guidance', ttl: 9000, replaceGroup: true }); },

    syncPhase: function () {
      var g = this.game;
      if (!g || !this.introDone || this.paused || this.modal) return;
      if (g.phase === this.shownPhase) return;
      this.shownPhase = g.phase;
      this.reportTime = performance.now();
      if (g.phase === 'plan') {
        this.planCursors = g.players.map(function (p) {
          return DIALS.findIndex(function (d) { return p.roles.indexOf(SolCrew.DIAL_OWNER[d]) >= 0; });
        });
        UI.plan(this);
        Guide.onPlan(this, g);
      } else if (g.phase === 'decision') {
        this.voteCursor = g.players.map(function () { return 0; });
        UI.decision(this);
      } else if (g.phase === 'report') {
        UI.report(this);
        if (!this.missionCriticalSpoken && (g.life < 30 || g.power.battery < 1)) {
          this.missionCriticalSpoken = true;
          var criticalAir = g.life < 30;
          dustyReact(criticalAir ? t('dusty_low_air', { n: Math.round(g.life) }) : t('dusty_low_power', { n: Math.round(g.power.battery) }), 'worried', 'mission:critical:' + g.sol, 90, criticalAir ? 'dusty_low_air_food' : 'dusty_low_power', { group: 'hazard', ttl: 10000, replaceGroup: true });
        }
      }
      else if (g.phase === 'end') {
        if (Voice) Voice.cancel();
        UI.end(this); sfx(g.result.survived ? 'win' : 'lose');
        if (g.result.event) {
          var eventWon = g.result.won;
          var eventMsg = eventWon ? (g.result.event.id === 'radiation' ? 'event_rad_success' : 'event_dust_success') : (g.result.event.id === 'radiation' ? 'event_rad_failure' : 'event_dust_failure');
          dustyReact(t(eventMsg), eventWon ? 'celebrating' : 'sad','event:result:' + g.result.event.id + ':' + eventWon, 100, eventWon ? 'dusty_mission_success' : 'dusty_mission_failure', { group: 'hazard', ttl: 16000, replaceGroup: true });
        } else dustyReact(t(g.result.survived ? 'dusty_mission_win' : 'dusty_mission_loss', { sol: g.result.sol, science: g.result.science, battery: Math.round(g.power.battery) }), g.result.survived ? 'celebrating' : 'sad', 'mission:result:' + g.result.why, 100, g.result.survived ? 'dusty_mission_success' : 'dusty_mission_failure', { group: 'hazard', ttl: 20000, replaceGroup: true });
      }
      else UI.clear();
    },

    dial: function (d, delta) {
      var g = this.game;
      g.setDial(d, g.alloc[d] + delta);
      g.planReady = {};
      UI.plan(this);
    },

    // A safe starting split for younger players.
    suggest: function () {
      var g = this.game, asks = g.asks(), left = g.pool() - SolCrew.RULES.nightNeed;
      var want = { life: 0, green: 0, shield: 0, science: 0 };
      DIALS.forEach(function (d) { g.alloc[d] = 0; });
      // Give everyone the minimum first, then what they asked for.
      [['life', 3], ['green', 2], ['science', 1], ['shield', 1]].forEach(function (x) {
        var n = Math.max(0, Math.min(x[1], left));
        want[x[0]] = n; left -= n;
      });
      ['shield', 'green', 'life', 'science'].forEach(function (d) {
        var n = Math.max(0, Math.min(asks[d] - want[d], left));
        want[d] += n; left -= n;
      });
      DIALS.forEach(function (d) { g.setDial(d, want[d]); });
      UI.plan(this);
    },

    beginDay: function () { this.game.startDay(); },
    setLook: function (i, part, value) {
      this.looks[i][part] = value;
      store('marscrew.looks', JSON.stringify(this.looks));
    },

    nextSol: function () { this.game.nextSol(); },
    build: function (id) { if (this.game.build(id)) { sfx('star'); UI.report(this); } },
    pickCard: function (i) { this.game.chooseCard(i); },

    togglePause: function () {
      var g = this.game;
      if (!g || !this.introDone || g.phase !== 'day' || this.modal) return;
      this.paused = !this.paused;
      if (this.paused) { if (Voice) Voice.cancel(); UI.pause(this); } else UI.clear();
    },

    quit: function () {
      if (this.eventMission) return this.returnEventArchive();
      var wasLevel = this.game && this.game.level;
      this.paused = false;
      this.go(wasLevel ? 'academy' : 'title');
    },

    redraw: function () {
      if (this.paused) UI.pause(this);
      else if (this.state === 'title') UI.title(this);
      else if (this.state === 'eventArchive') UI.eventArchive(this);
      else if (this.state === 'eventBrief' && this.eventMission) UI.eventBrief(this, this.eventMission);
      else if (this.state === 'game' && this.game && this.game.phase === 'end') UI.end(this);
      else if (this.state === 'landingLab' && UI.landingLab) UI.landingLab(this);
    },

    // ---- Landing Lab + Crater Explorer: Dusty ------------------------------------
    // A crater was chosen: curious face, the crater's kid-friendly text, and its own recording
    // only when that exact file is confirmed (crater-voice-manifest recorded: true).
    // Any previous crater recording is stopped first. Hover, zoom and pan never call this.
    labCrater: function (id, replay) {
      var f = root.Craters && root.Craters.get(id);
      if (!f) return false;
      var text = f.kids[I18N.lang === 'ar' ? 'ar' : 'en'] || f.kids.en;
      // A clip is used only if a confirmed recording exists in the current language.
      var voiceId = Voice && Voice.has && Voice.has(f.voice) ? f.voice : null;
      if (Voice) Voice.cancelGroup('crater');
      dustyReact(text, 'curious', 'crater:' + id + (replay ? ':' + Date.now() : ''), 60, voiceId, { group: 'crater', replaceGroup: true, ttl: 30000, force: !!replay });
      return !!voiceId;
    },
    labSay: function (text, mood, key, priority, voiceId) {
      dustyReact(text, mood, key, priority || 45, voiceId ? voiceIf(voiceId) : null, { group: 'lab', ttl: 8000, replaceGroup: true });
    },

    toggleLang: function () {
      if (Voice) Voice.cancel();
      I18N.lang = I18N.lang === 'en' ? 'ar' : 'en';
      if (Voice) Voice.setLanguage(I18N.lang);
      if (this.pendingDustyGreeting) this.pendingDustyGreeting = spokenText('dusty_welcome', t('dusty_welcome'));
      if (this.pendingDustyGreeting) { this.dustyMessage = this.pendingDustyGreeting; if (UI.companionMessage) UI.companionMessage(this.dustyMessage); }
      else {
        this.dustyMessage = t('dusty_language_change'); if (UI.companionMessage) UI.companionMessage(this.dustyMessage);
        if (voiceIf('dusty_language_change')) this.playVoice('dusty_language_change', null, { priority: 40, group: 'screen', ttl: 6000, replaceGroup: true, emotion: 'happy' });
      }
      if (UI.updateVoiceControls) UI.updateVoiceControls();
      store('marscrew.lang', I18N.lang);
      applyLang();
      UI.resetHud();
      this.redraw();
    },

    toggleSound: function () {
      this.sound = !this.sound;
      store('marscrew.sound', this.sound ? '1' : '0');
      Sound.set('sfx', this.sound);
      this.redraw();
    },

    toggleMusic: function () {
      this.music = !this.music;
      store('marscrew.music', this.music ? '1' : '0');
      Sound.set('music', this.music);
      this.redraw();
    },

    sfx: sfx,
  };

  function applyLang() {
    document.documentElement.lang = I18N.lang;
    document.documentElement.dir = I18N.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
  }

  // ---- Keyboard and gamepad on overlays ------------------------------------
  function overlayInput(g, inputs) {
    var rtlFlip = I18N.lang === 'ar' ? -1 : 1;
    if (g.phase === 'plan') {
      var redraw = false;
      g.players.forEach(function (p, i) {
        var inp = inputs[p.id];
        var mine = [0, 1, 2, 3];
        var pos = Math.max(0, mine.indexOf(App.planCursors[i]));
        if (inp.upPressed) { App.planCursors[i] = mine[(pos - 1 + mine.length) % mine.length]; redraw = true; }
        if (inp.downPressed) { App.planCursors[i] = mine[(pos + 1) % mine.length]; redraw = true; }
        var d = DIALS[App.planCursors[i]];
        if (inp.leftPressed) { g.setDial(d, g.alloc[d] - rtlFlip); redraw = true; }
        if (inp.rightPressed) { g.setDial(d, g.alloc[d] + rtlFlip); redraw = true; }
        if (inp.actPressed) g.planReady[p.id] = true;
      });
      if (redraw) UI.plan(App);
      if (g.players.every(function (p) { return g.planReady[p.id]; })) g.startDay();
    } else if (g.phase === 'decision') {
      var change = false;
      g.players.forEach(function (p, i) {
        var inp = inputs[p.id];
        if (g.votes[p.id] != null) return;
        if (inp.leftPressed || inp.rightPressed) { App.voteCursor[i] = 1 - App.voteCursor[i]; change = true; }
        if (inp.actPressed) { g.votes[p.id] = App.voteCursor[i]; change = true; }
      });
      var votes = g.players.map(function (p) { return g.votes[p.id]; });
      if (votes.every(function (v) { return v != null; })) {
        var ones = votes.filter(function (v) { return v === 1; }).length;
        g.chooseCard(ones * 2 > votes.length ? 1 : ones * 2 === votes.length ? votes[0] : 0);
      } else if (change) UI.decision(App);
    } else if (g.phase === 'report' && performance.now() - App.reportTime > 900) {
      if (g.players.some(function (p) { return inputs[p.id].actPressed; })) g.nextSol();
    }
  }

  function menuInput() {
    if (App.state !== 'roles') return;
    var n = App.settings.players;
    for (var i = 0; i < n; i++) {
      var inp = Input.read(i);
      if (inp.leftPressed) App.movePick(i, -1);
      if (inp.rightPressed) App.movePick(i, 1);
      if (inp.actPressed) App.lockPick(i);
    }
  }

  // ---- Sounds that follow the players: steps, doors, wind, siren, night ----
  var heard = { zone: {}, step: {}, dusk: -1 };
  function gameSounds(g, dt) {
    var people = g.players.map(function (p) { return g.crew[p.roles[p.active]]; });
    var day = g.phase === 'day';
    people.forEach(function (c) {
      if (!day) { heard.zone[c.role] = c.zone; return; }
      var was = heard.zone[c.role];
      if (was && (was === 'outside') !== (c.zone === 'outside')) sfx('door');
      heard.zone[c.role] = c.zone;
      if (c.moving && !c.mini && dt > 0) {
        heard.step[c.role] = (heard.step[c.role] || 0) + dt;
        if (heard.step[c.role] > 0.34) { heard.step[c.role] = 0; sfx(c.zone === 'outside' ? 'stepOut' : 'step'); }
      }
    });
    var night = day && g.t / g.dayLen > SolCrew.RULES.duskStart;
    if (night && heard.dusk !== g.sol) { heard.dusk = g.sol; sfx('dusk'); }
    var onMars = people.filter(function (c) { return c.role !== 'earth'; });
    Sound.update({
      outside: day && onMars.some(function (c) { return c.zone === 'outside'; }),
      dust: g.dustStorm > 0,
      alert: day && onMars.length ? g.alert : null,
      low: day && onMars.some(function (c) { return !c.down && !c.resting && c.health < 25; }),
      mode: g.alert === 'active' && day ? 'storm' : night ? 'night' : g.phase === 'end' ? 'menu' : 'day',
    });
  }

  // ---- Frame loop ----------------------------------------------------------
  var canvas, ctx, dpr = 1, last = 0, cssW = 0, cssH = 0, hudH = 0;

  function resize() {
    var hud = document.getElementById('hud');
    var top = hud.hidden ? 0 : hud.offsetHeight;
    hudH = hud.offsetHeight;
    cssW = window.innerWidth; cssH = window.innerHeight - top;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.top = top + 'px';
    canvas.style.height = cssH + 'px';
    document.getElementById('screen').style.top = top + 'px';
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.imageSmoothingEnabled = false;
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt);
    requestAnimationFrame(frame);
  }

  // One tick of the whole game. Kept apart from the timer so tests can drive it.
  function step(dt) {
    var g = App.game;
    if (g && App.state === 'game') {
      var inputs = {};
      g.players.forEach(function (p) { inputs[p.id] = Input.read(p.id); });
      if (!App.introDone) {
        if (g.players.some(function (p) { return inputs[p.id].actPressed; })) UI.intro(App, App.introLine + 1);
      } else if (App.modal) {
        if (performance.now() - App.modalAt > 900 && g.players.some(function (p) { return inputs[p.id].actPressed; })) App.modalClose();
      } else if (!App.paused) {
        if (g.phase === 'day') { g.update(dt, inputs); Guide.update(App, g, dt); }
        else overlayInput(g, inputs);
      }
      var evs = g.events.splice(0);
      for (var i = 0; i < evs.length; i++) handleEvent(g, evs[i]);
      if (App.realQueue.length && !App.modal && !App.paused && App.introDone) App.showReal(App.realQueue.shift());
      if (App.thinkQueue.length && !App.modal && !App.paused && App.introDone && g.phase === 'day') App.think(App.thinkQueue.shift());
      if (!App.modal && !App.paused) {
        ['base', 'earth'].forEach(function (a) {
          var q = toasts[a];
          if (q[0]) { q[0].age += dt; if (q[0].age > q[0].life) q.shift(); }
        });
      }
      App.syncPhase();
      updateDustyContext(g);
      UI.updateHud(g);
      if (document.getElementById('hud').offsetHeight !== hudH) resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Render.draw(ctx, g, uiView, cssW, cssH, App.paused || App.modal ? 0 : dt);
      gameSounds(g, App.paused || App.modal ? 0 : dt);
    } else {
      menuInput();
      if (App.state === 'landingLab' && UI.landingTick) UI.landingTick(dt); // the lab covers the screen
      else { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); Render.drawTitle(ctx, cssW, cssH, dt); }
      Sound.update({ mode: 'menu' });
    }
    if (UI.updateCompanion) UI.updateCompanion(App, Date.now());
  }

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    UI.init();
    Input.init();
    var lang = store('marscrew.lang');
    if (lang === 'ar' || lang === 'en') I18N.lang = lang;
    else if ((navigator.language || '').slice(0, 2) === 'ar') I18N.lang = 'ar';
    App.sound = store('marscrew.sound') !== '0';
    App.music = store('marscrew.music') !== '0';
    Sound.set('sfx', App.sound);
    Sound.set('music', App.music);
    Sound.unlockOnce();
    // Every button clicks.
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('button')) sfx('click'); }, true);
    (store('marscrew.cards') || '').split(',').forEach(function (id) { if (id) App.cards[id] = true; });
    try { App.stars = JSON.parse(store('marscrew.academy') || '{}') || {}; } catch (e) { App.stars = {}; }
    try {
      var looks = JSON.parse(store('marscrew.looks') || '[]');
      if (Array.isArray(looks)) looks.slice(0, 4).forEach(function (l, i) { if (l && typeof l === 'object') App.looks[i] = { name: String(l.name || '').slice(0, 12), color: typeof l.color === 'string' ? l.color : null }; });
    } catch (e) { /* keep the defaults */ }
    App.settings.classroom = store('marscrew.class') === '1';
    applyLang();
    App.voice = store('marscrew.voice') !== '0';
    if (Voice) {
      Voice.setLanguage(I18N.lang);
      Voice.setEnabled(App.voice);
      var savedVoiceVolume = store('marscrew.voiceVolume');
      Voice.setVolume(savedVoiceVolume == null ? 1 : Number(savedVoiceVolume));
      // Crater recordings: only entries confirmed by tools/check_crater_voice.js (recorded: true).
      // English clips (js/voice-manifest-en.js) follow the same rule: only confirmed files are registered.
      [root.CRATER_VOICE_MANIFEST, root.DUSTY_VOICE_MANIFEST_AR_EXTRA, root.DUSTY_VOICE_MANIFEST_EN].forEach(function (list) {
        if (!list || !Voice.register) return;
        var recorded = {};
        Object.keys(list).forEach(function (id) { if (list[id].recorded) recorded[id] = list[id]; });
        Voice.register(recorded);
      });
      // Dusty's mouth follows the loudness of the recording that is actually playing.
      if (root.DustyAvatar && Voice.level) root.DustyAvatar.setVoiceSource(function () { return Voice.level(); });
      Voice.onSpeaking(function (on, reason, item) {
        if (Art) Art.setDustySpeaking(on);
        // The face and the bubble always belong to the clip that is really playing.
        if (on && item && item.text) showDustyText(item.text);
        if (!on && App.pendingDustyText) {
          if (reason === 'cancel') App.pendingDustyText = null; // the screen or context changed
          else showDustyText(App.pendingDustyText);
        }
        if (on && item && item.emotion) {
          activeDustyMood = item.emotion;
          if (Art) Art.setDustyEmotion(activeDustyMood);
          if (moodTimer == null) {
            moodExpired = false;
            var voiceMoodRevision = ++moodRevision;
            moodTimer = setTimeout(function () {
              moodTimer = null;
              if (voiceMoodRevision !== moodRevision) return;
              if (Voice && Voice.isSpeaking()) moodExpired = true;
              else { activeDustyMood = ambientDustyMood(); currentMoodPriority = 0; if (Art) Art.setDustyEmotion(activeDustyMood); }
            }, activeDustyMood === 'celebrating' ? 6500 : 4500);
          }
        }
        if (!on && App.dustyGreetingPlaying) App.dustyGreetingPlaying = false;
        if (!on && (reason === 'cancel' || reason === 'pause')) clearDustyMood(true);
        else if (!on && (moodExpired || activeDustyMood === 'speaking') && Art) {
          moodExpired = false; currentMoodPriority = 0; activeDustyMood = ambientDustyMood(); Art.setDustyEmotion(activeDustyMood);
        }
        if (Sound && Sound.duckMusic) Sound.duckMusic(on);
      });
      Voice.onChange(function (status) {
        UI.updateVoiceControls();
        if (App.dustyGreetingPlaying && (status === 'missing' || status === 'unsupported' || status === 'error' || status === 'english-missing' || !Voice.isEnabled())) App.dustyGreetingPlaying = false;
      });
    }
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', function (e) { if (e.code === 'Escape') App.togglePause(); });
    // Welcome entrance (js/dusty-intro.js): once per page load, on the menu. Dusty travels from his
    // corner to the middle of the screen, and the recorded dusty_welcome line (Arabic or English)
    // starts the moment he arrives. If the browser blocks sound before the first click, voice.js
    // keeps the line and plays it from the beginning on the first tap or key press.
    function startDustyWelcome() {
      if (!App.pendingDustyGreeting || App.dustyIntroStarted) return;
      App.dustyIntroStarted = true;
      var greeting = App.pendingDustyGreeting;
      App.pendingDustyGreeting = null;
      App.preserveWelcomeOnce = true;
      if (Voice && App.voice) {
        if (Voice.has && !Voice.has('dusty_welcome')) {
          // Never swap in another clip: report what is missing and greet with text only.
          console.warn('Dusty welcome: no recording for "dusty_welcome" in "' + I18N.lang + '". Expected file: assets/audio/voice/' + I18N.lang + '/dusty_welcome.mp3');
        } else if (Voice.prepare) Voice.prepare('dusty_welcome'); // read the lip-sync curve while he travels
      }
      function speak() {
        if (!Voice || !App.voice || App.state !== 'title') return false;
        App.dustyGreetingPlaying = Voice.play('dusty_welcome', { text: spokenText('dusty_welcome', greeting), emotion: 'welcome', dedupeKey: 'session-welcome', priority: 40, group: 'greeting', ttl: 60000 });
        if (UI.updateCompanion) UI.updateCompanion(App);
        return App.dustyGreetingPlaying;
      }
      if (root.DustyIntro && root.DustyIntro.start({
        doc: document, win: window, app: App, avatar: root.DustyAvatar, voice: Voice, speak: speak,
        t: t, reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      })) return;
      speak(); // no entrance (not on the menu): just greet
    }
    App.go('title');
    App.greetDusty();
    if (App.pendingDustyGreeting && UI.companionMessage) UI.companionMessage(App.pendingDustyGreeting);
    startDustyWelcome();
    root.LiveData.load().then(function (season) {
      App.live = season;
      App.liveChecked = true;
      if (App.state === 'title') UI.title(App);
      else if (App.state === 'setup') UI.setup(App);
    });
    requestAnimationFrame(frame);
  }

  App.step = step;
  root.App = App;
  boot();
})(typeof window !== 'undefined' ? window : globalThis);

// What each English Dusty clip actually says. The clips come from the ElevenLabs dubs in
// audio-dubbing/dubbed/, which follow the Arabic recordings rather than the game's English lines.
// The text was transcribed offline by audio-dubbing/scripts/split_dubbed.py (see
// audio-dubbing/reports/split-report.md); only punctuation and capitals were tidied by hand.
// When the game is in English and the clip is registered, Dusty's bubble, the intro line and the
// lesson card show this text instead of the usual line, so the words on screen match the voice.
// When a clip is re-dubbed, update its line here too.
(function (root) {
  'use strict';
  var TEXT = Object.freeze({
    dusty_welcome: "Welcome, astronaut! Welcome to Mars Base! I'm Dusty, your mission assistant! Let's start our adventure!",
    dusty_follow_arrow: 'Come on, follow the yellow arrow to get to the next mission.',
    dusty_general_help: "Look around and see what mission is open for you. I'm with you every step of the way.",
    dusty_guide_analyze_sample: "The sample is ready for analysis. Scan it so we can see what we've collected.",
    dusty_guide_plant_seeds: 'Plant new seeds to grow food for the crew.',
    dusty_guide_recover: 'Let your teammate rest and recover before heading back to the mission.',
    dusty_guide_repair: 'This device needs repairs. Start the mission and follow the steps on screen.',
    dusty_guide_rest: 'Resting on the medical bed helps the crew member recover.',
    dusty_intro_goal: 'You know our mission is to keep the crew safe and make sure the base survives on Mars. Yeah, exactly like I told you. Come take a look.',
    dusty_intro_power: 'All the equipment needs power, but energy is limited, so we have to choose carefully how to use it.',
    dusty_lesson_help: "On a mission, crew members rely on each other. If someone gets hurt and can't move, their teammate has to get to them and help them in time.",
    dusty_lesson_ice: 'Did you know there is water ice under the surface of Mars in various spots? If we can reach and process it, we could get water to use on the mission.',
    dusty_minigame_antenna: 'Point the comms dish toward Earth so you can transmit the data.',
    dusty_minigame_breathe: 'Wait until the circle gets bigger and press gently. Keep your breathing steady.',
    dusty_minigame_clean: 'Move the character and wipe the dust off the panel. The cleaner you get it, the better the sunlight will reach it.',
    dusty_mission_failure: "The mission was tough, but that doesn't mean we didn't learn something. Let's review what happened and try again with a better plan.",
    dusty_mistake_missed: "Don't worry about it. Just focus and try again.",
    dusty_mistake_spilled_water: 'Oh! Some water got left behind. Next time, try to pour it more slowly.',
    dusty_mistake_try_again: 'No problem. Try again. Every try teaches us something new.',
    dusty_retry_encouragement: "Don't give up. Astronauts train and try over and over. Let's go back and try a new plan.",
    dusty_storm_over: 'The storm is over. You can get back to work, but keep an eye on the weather.',
    dusty_success_analyze: "The analysis is done. We've got new data now.",
    dusty_success_checkup: 'Great job! The crew got the help they needed.',
    dusty_success_clean: "Excellent! The panels are cleaner now and that'll help them take in sunlight.",
    dusty_success_drill: 'Awesome! We found ice and managed to extract water from it.',
    dusty_success_generic: 'Way to go! Mission accomplished! Every step helps the crew.',
    dusty_success_harvest: 'Sweet! We gathered a new harvest and boosted our food supplies.',
    dusty_success_nap: 'His health is topped up, so now you can go back to helping the team.',
    dusty_success_patch: 'Awesome! We sealed the leak and the base is holding its air now!',
    dusty_success_plant: 'Nice job planting new seeds! Now we need to take care of the plants.',
    dusty_success_repair: 'Awesome! The device is back up and running!',
    dusty_success_rest: 'Take your time resting. Your health matters more than speed.',
    dusty_teammate_down: "Oh no! A crew member is down and needs help! Whoever's closest, get there now!",
  });
  root.DUSTY_SPOKEN_EN = TEXT;
  if (typeof module !== 'undefined' && module.exports) module.exports = TEXT;
})(typeof window !== 'undefined' ? window : globalThis);

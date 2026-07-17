// src/features/exploration/story/content/map4.ts
//
// The Void narrative content. Recurring NPC is Iri, keeper of the
// crystal hollow. The map's splash art (a dark, rocky, underwater-
// feeling cavern hung with tall blue crystal formations, a still pool
// at its base, faint red coral-like growths) is confirmed as the real
// live asset, even though it visibly clashes with the established
// sky/ascension chamber names (Cloud Vestibule, Star Corridor, Void
// Sanctum, Ether Pinnacle, The Apex) and with Under World's own ending
// line ("a third stretch... that remembers the sky, and doesn't sleep,
// only waits").
//
// Reconciliation: the crystals aren't native stone — they're the sky
// itself, drawn down and crystallized long ago and kept in this hollow
// so the surface world wouldn't have to carry it. "The Void" isn't
// empty space down here; it's the absence this left in the sky above.
// Iri's tending isn't physical maintenance like Senna's coals or
// Maren's vents — it's memory-work: keeping the story of what these
// crystals are alive, so they stay meaning instead of becoming inert
// rock. This is the deliberate difference from the prior three regions
// rather than a fourth repetition of "guardian tends a physical thing."
//
// This is the last authored region (per the person building this — an
// unused MAP5_IMAGE constant exists in Exploration.tsx but has no map
// entry or chamber data, so it isn't built toward here). The ending is
// written as a series culmination: Iri acknowledges the player has now
// walked all three prior keepers' ground, rather than pointing at an
// unopened region.
//
// Emotional arc (distinct from the prior three): awe -> doubt ->
// recognition -> belonging, with the climax chamber completing
// "belonging" rather than introducing a fifth beat.
//
// Mechanical notes:
// - Structural difference from all three prior regions: FOUR artifact
//   chambers here (2, 3, 4, and 5), not one or two. Chamber 1 (Cloud
//   Vestibule) is the only non-artifact chamber. Following the
//   established rule that every artifact chamber before the final one
//   carries `artifact_odds_delta` only, never `grant_artifact`:
//     - Star Corridor (ch2) claim: odds only, ~0.1
//     - Void Sanctum (ch3) claim: odds only, ~0.15
//     - Ether Pinnacle (ch4) claim: odds only, ~0.2 (ceiling)
//     - The Apex (ch5) claim: both story-exclusive keys granted here,
//       plus odds, matching how every prior region's final artifact
//       chamber has worked.
// - xp_bonus tops out at 30 and artifact_odds_delta at 0.2 in this
//   file, same ceiling as map1.ts/map2.ts/map3.ts, so the bounds
//   documented in 0036_exploration_story.sql stay accurate without a
//   comment update there.
// - `grant_artifact` targets two new story_exclusive rows that need to
//   exist in the `artifacts` table before this ships: "Iri's Starlight
//   Shard" and "Iri's Kept Sky" (see 0039_the_void_story.sql).
// - Flag keys use a `vo_ch{n}_{stage}_{action}` prefix, matching the
//   `gf_`/`cl_`/`uw_` convention — load-bearing, since user_story_flags
//   has no map_id column and keys must be globally unique.

import type { ChamberStory } from '../types'

const CLOUD_VESTIBULE: ChamberStory = {
  start: {
    intro: [
      'The guild\'s brief for this one was short even by the standards of the last three: a cavern reported, coordinates unclear, previous surveyors\' notes contradicting each other on basic details like whether there was water inside at all.',
      'There is. A still, dark pool laps at the threshold, and past it the air thickens into something between mist and held breath — cool where the last three regions ran warm, quiet in a way that doesn\'t feel empty so much as attentive.',
      'Rising from the pool\'s far edge, tall shards of blue crystal catch what little light there is and throw it back doubled, tripled, scattering it across wet stone like something trying very hard to still be sky.',
      'Wedged into a crack at the vestibule\'s mouth, protected from the damp by a scrap of oiled leather, is a single folded page — the hand unfamiliar this time, careful in a different way than the last three:',
      '"You will want to know what this place is before you know who kept it. Fair. Here is the short version: the sky used to reach further down than it does now. This is where the rest of it went." — unsigned.',
    ],
    options: [
      {
        id: 'touch_the_pool',
        label: 'Kneel and touch the still pool at the threshold',
        reveal: [
          'The water is cold and utterly motionless — no current, no ripple even where your fingers break the surface, as though it\'s been asked, a very long time ago, to hold still and simply never stopped.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'vo_ch1_start_touch_pool' },
        ],
      },
      {
        id: 'look_up_at_crystals',
        label: 'Look up at the crystal shards rising from the far edge',
        reveal: [
          'From this angle they don\'t look like formations so much as a held gesture — tall, upright, faintly luminous, arranged with a symmetry too deliberate to be geological accident. You find yourself thinking of things reaching upward, and not quite finishing the thought.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'vo_ch1_start_look_up' },
        ],
      },
      {
        id: 'reread_the_note',
        label: 'Read the note a second time, more slowly',
        reveal: [
          '"This is where the rest of it went." You\'re not sure yet whether that\'s meant literally, metaphorically, or as a kind of test to see which way you\'ll take it. You decide to keep both readings open for now.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'vo_ch1_start_reread' },
        ],
      },
    ],
    transition: [
      'Whatever waits deeper in, it has clearly been waited on before — this vestibule has the unmistakable feel of a place built to be crossed slowly, by people meant to arrive curious rather than frightened.',
    ],
  },
  mid: {
    intro: [
      'A shallow ledge circles the pool, leading around toward a passage cut into the crystal-hung wall — natural rock giving way, gradually, to something that looks worked, faceted, deliberate.',
      'Cut into the ledge itself, small enough to miss if you\'re not looking down, is a second fragment, the same careful hand:',
      '"I used to think my job was keeping the crystals from cracking. It took me embarrassingly long to understand my actual job was keeping their story from being forgotten. A crystal that no one remembers the meaning of is just a rock, however pretty."',
    ],
    options: [
      {
        id: 'trace_worked_edge',
        label: 'Trace the line where natural rock becomes worked crystal',
        reveal: [
          'The transition is seamless, no tool-marks, no seams — whatever shaped this wasn\'t carved so much as coaxed, the way a river shapes a canyon rather than the way a mason shapes a block.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch1_mid_trace_edge' },
        ],
      },
      {
        id: 'sit_with_memory_line',
        label: 'Sit with the line about a forgotten story making it "just a rock"',
        reveal: [
          'It\'s a strange kind of duty to imagine — not defending something from damage, but defending it from being misunderstood. You\'re not sure your guild training has a category for that either.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch1_mid_sit_memory' },
        ],
      },
      {
        id: 'watch_light_scatter',
        label: 'Watch how the passage light scatters through the crystal walls',
        reveal: [
          'It doesn\'t scatter randomly — it moves in slow, patterned drifts, like something shifting very gradually behind the crystal, or like starlight remembering, faintly, that it used to twinkle.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch1_mid_watch_light' },
        ],
      },
    ],
    transition: [
      'The passage opens ahead into something brighter and stranger than the vestibule — a corridor that seems, impossibly, to hold more sky than any cave should be able to.',
    ],
  },
  claim: {
    intro: [
      'The vestibule\'s inner chamber is small, round, and lined floor to ceiling with smaller crystal fragments set into the stone like a mosaic — and at its center, resting on a plinth of the same dark rock as the entrance, a final fragment for this chamber:',
      '"Every surveyor who reaches this point asks the same question next, in one form or another: is any of it dangerous? I\'ll save you the trip. No. It was never dangerous. It was only ever heavy, and someone had to be the one who carried it."',
    ],
    options: [
      {
        id: 'study_the_mosaic',
        label: 'Study the mosaic pattern the fragments make',
        reveal: [
          'From the chamber\'s center, the fragments resolve into a shape you almost recognize — a wide arc, dotted with smaller points, unmistakably a piece of night sky rendered in stone and crystal instead of dark and light.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch1_claim_mosaic' },
        ],
      },
      {
        id: 'leave_plinth_undisturbed',
        label: 'Leave the plinth and fragment exactly as found',
        reveal: [
          'You catalogue the chamber carefully and touch nothing on the plinth. Whatever "heavy" means here, it doesn\'t feel like something you should pick up on a first pass through.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch1_claim_undisturbed' },
        ],
      },
      {
        id: 'sit_with_carried_line',
        label: 'Sit with the line about someone having to carry it',
        reveal: [
          'Not dangerous. Heavy. You find that distinction doing more work on you than you expected, walking in prepared for a hazard survey and finding, instead, what reads increasingly like someone\'s life\'s work.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch1_claim_carried' },
        ],
      },
    ],
    transition: [
      'You leave the round chamber and step into the passage proper, the crystal walls brightening steadily around you, the air losing its cave-damp chill for something closer to open night air.',
    ],
  },
}

const STAR_CORRIDOR: ChamberStory = {
  start: {
    intro: [
      'The corridor earns its name immediately — the crystal walls here are studded with pinpoint flecks of brighter light, scattered in clusters and arcs that, the longer you look, refuse to resemble anything but constellations.',
      'A fragment rests in a shallow niche at the corridor\'s start, weighted by a small dark stone: "I mapped every one of these to a sky-chart once, just to see. They matched. Every single one. I still don\'t fully understand how, and I\'ve stopped needing to."',
    ],
    options: [
      {
        id: 'trace_a_constellation',
        label: 'Trace one of the light-clusters with your finger',
        reveal: [
          'It\'s cool and smooth under your fingertip, and for a moment — surely just a trick of the light — the points seem to pulse once, faintly, in sequence, the way stars might if you could watch them slowly enough.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch2_start_trace' },
        ],
      },
      {
        id: 'doubt_the_matching_claim',
        label: 'Wonder, honestly, whether the fragment\'s claim is even true',
        reveal: [
          'It would be easy to dismiss as devotion talking, a keeper seeing meaning in coincidence. But the shapes really do hold steady the longer you compare them to what little sky-lore you know — you just can\'t explain how yet, and you write that uncertainty down honestly rather than resolving it for your report.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch2_start_doubt' },
        ],
      },
      {
        id: 'walk_corridor_slow',
        label: 'Walk the corridor slowly, watching the pattern shift',
        reveal: [
          'The clusters don\'t repeat as you move — each stretch shows a different arrangement, as though the corridor holds not one sky but many, layered, each one true at a different hour of some night you\'ll never see.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch2_start_walk_slow' },
        ],
      },
    ],
    transition: [
      'Whatever doubt you brought in with you, the corridor doesn\'t argue with it — it just keeps offering more sky, patiently, as if confident the doubt will wear itself out before the crystal does.',
    ],
  },
  mid: {
    intro: [
      'Midway down, the corridor widens into a small alcove where the constellation-clusters gather thickest, almost too bright to look at directly — and at its center, a longer fragment, pinned beneath a shard of loose crystal:',
      '"The guild that trained me called this superstition and sent me anyway, because superstition or not, someone had to survey the readings. I came in a skeptic. I did not leave one. I\'m not asking you to believe me. I\'m asking you to keep looking."',
    ],
    options: [
      {
        id: 'keep_looking_as_asked',
        label: 'Do exactly as the fragment asks — keep looking, without deciding yet',
        reveal: [
          'You let the question sit unanswered and simply look, for longer than feels efficient by guild standards. Whatever this place is doing to you, it isn\'t asking for belief. It\'s asking for attention. Those turn out to be different things.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch2_mid_keep_looking' },
        ],
      },
      {
        id: 'note_skeptic_line',
        label: 'Note that even a trained skeptic came around, and consider why',
        reveal: [
          'You\'ve met a version of this claim in every chamber so far, phrased differently by every keeper. You\'re starting to suspect the disbelief isn\'t a flaw in the story — it\'s the entry price everyone pays before they\'re allowed to understand it.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch2_mid_skeptic' },
        ],
      },
      {
        id: 'examine_pinning_shard',
        label: 'Examine the loose crystal shard pinning the fragment down',
        reveal: [
          'It\'s warmer than the wall around it, faintly, the way a hand is warmer than the table it rests on. You set it back down exactly where it was, unwilling to be the one who finally lets this particular page blow away.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'vo_ch2_mid_pinning_shard' },
        ],
      },
    ],
    transition: [
      'Past the alcove the corridor angles downward, the constellation-light thinning as the passage narrows toward a chamber the light seems reluctant to follow you into.',
    ],
  },
  claim: {
    intro: [
      'The corridor ends at a low archway, past which the crystal formations grow taller, denser, unmistakably closer to whatever this whole cavern is oriented around. A final fragment for this stretch waits pinned just inside the arch.',
      '"You\'ve been patient with the not-knowing. That\'s rarer than you\'d think, and it\'s the only qualification that actually matters down here."',
    ],
    options: [
      {
        id: 'accept_the_praise_quietly',
        label: 'Accept the fragment\'s acknowledgment without needing to earn it further',
        reveal: [
          'You let it land simply, without deflecting it. It\'s an odd thing to be thanked by a page for a quality you didn\'t know you were demonstrating, and odder still how much it steadies you for what\'s ahead.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.1 },
          { type: 'set_flag', key: 'vo_ch2_claim_accept_praise' },
        ],
      },
      {
        id: 'wonder_whos_watching',
        label: 'Wonder whether someone is tracking your progress through these fragments',
        reveal: [
          'It would explain the timing — every fragment landing exactly when it\'s most relevant, never before, never after. Either an extraordinary coincidence, or a keeper who knows this corridor, and everyone who walks it, better than you\'ve assumed.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.1 },
          { type: 'set_flag', key: 'vo_ch2_claim_wonder_watching' },
        ],
      },
      {
        id: 'look_back_down_corridor',
        label: 'Turn and look back down the corridor before continuing',
        reveal: [
          'From this end, the constellation-clusters align into one single, continuous shape stretching the corridor\'s full length — a sky, whole, exactly as it must have looked from somewhere, once, before it came to be kept here instead.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.1 },
          { type: 'set_flag', key: 'vo_ch2_claim_look_back' },
        ],
      },
    ],
    transition: [
      'You duck through the archway into denser, taller crystal growth, the corridor\'s patient not-knowing giving way, ahead, to a chamber that feels like it intends to actually answer something.',
    ],
  },
}

const VOID_SANCTUM: ChamberStory = {
  start: {
    intro: [
      'The sanctum is the largest open space you\'ve found in the cavern — a vaulted chamber where the crystal formations arch overhead like ribs, meeting at a point so high above that the light gives out before it reaches the ceiling.',
      'At the sanctum\'s heart, that darkness isn\'t incidental — a wide, perfectly circular patch of the chamber has no crystal at all, no light, nothing but a stillness so complete it feels less like an absence and more like a held note.',
      'A fragment rests at the edge of that dark circle, weighted the way all the others have been: "This is the part people misunderstand fastest. The dark patch isn\'t a wound in the crystal. It\'s the actual thing the crystal was built to hold. Everything bright you\'ve walked through is the wrapping, not the gift."',
    ],
    options: [
      {
        id: 'approach_dark_patch',
        label: 'Approach the edge of the dark circle carefully',
        reveal: [
          'Standing at its rim, the stillness you felt at the pool in Cloud Vestibule returns, stronger — not menace, not cold, just an enormous, patient quiet, the kind that makes you lower your voice without deciding to.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch3_start_approach' },
        ],
      },
      {
        id: 'reconsider_the_wrapping',
        label: 'Reconsider everything you\'ve seen so far as "wrapping"',
        reveal: [
          'The corridor\'s constellations, the vestibule\'s mosaic, every fragment framed as evidence of a beautiful, kept sky — all of it, per this note, in service of protecting something that isn\'t bright at all. It reframes the whole cavern without making it feel any less cared for.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch3_start_reconsider' },
        ],
      },
      {
        id: 'name_it_the_true_void',
        label: 'Write, plainly, that you\'ve found the true void',
        reveal: [
          'You set the words down in your report without embellishing them. Whatever the guild expected this survey to log, "found the actual void, still being kept" was not a line you imagined writing today.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch3_start_name_it' },
        ],
      },
    ],
    transition: [
      'You keep a respectful distance from the dark circle\'s edge and continue around the sanctum\'s perimeter, where the crystal growth thickens again into something almost architectural.',
    ],
  },
  mid: {
    intro: [
      'Along the sanctum\'s curved wall, a shallow groove has been worn into the stone at hand height, as though something has been traced along it, over and over, for a very long time. A fragment sits at the groove\'s midpoint:',
      '"I walk this wall every day and touch this line the whole way around. It isn\'t superstition. It\'s how I remind the dark patch it\'s still being watched, without ever needing to disturb it. Some kinds of care don\'t look like doing anything at all."',
    ],
    options: [
      {
        id: 'walk_the_groove',
        label: 'Walk the groove the way the fragment describes',
        reveal: [
          'You trace the worn line with your fingers the whole way around the visible wall, slow, deliberate, feeling faintly foolish and then, somewhere past the halfway point, not foolish at all.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch3_mid_walk_groove' },
        ],
      },
      {
        id: 'consider_quiet_care',
        label: 'Sit with the idea that watching, alone, can be the whole job',
        reveal: [
          'It\'s the plainest description yet of what every keeper you\'ve read about this survey has actually been doing — not fixing, not fighting, just staying, present, so that whatever they\'re near never has to wonder if it\'s alone.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch3_mid_quiet_care' },
        ],
      },
      {
        id: 'measure_the_groove_depth',
        label: 'Measure how deep the groove has been worn',
        reveal: [
          'Deep enough that this can\'t be the habit of a single season, or even a single decade — deep enough that "every day, a very long time" reads, now, less like a figure of speech and more like an exact account.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'vo_ch3_mid_measure_groove' },
        ],
      },
    ],
    transition: [
      'The wall\'s groove leads you around toward a narrower gap in the crystal — a way up, out of the sanctum\'s vast quiet and toward wherever "up" in this cavern actually leads.',
    ],
  },
  claim: {
    intro: [
      'Past the gap, a short climb opens onto a broad shelf overlooking the sanctum from above — the dark circle visible far below now, smaller, stiller, exactly as patient from this height as it was up close.',
      'A final fragment here, tucked where it catches what little light reaches this high: "If you\'re standing on this shelf, you\'ve seen the whole shape of the thing — the bright, the dark, and the very long habit of tending both at once. There isn\'t much further to go before you\'ll understand why."',
    ],
    options: [
      {
        id: 'look_down_at_circle',
        label: 'Look down at the dark circle from the shelf',
        reveal: [
          'From here it looks less like an absence and more like the pupil of something very large, very old, and entirely unbothered by being watched in return. You don\'t look away first, but it takes an effort you weren\'t expecting.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.15 },
          { type: 'set_flag', key: 'vo_ch3_claim_look_down' },
        ],
      },
      {
        id: 'catalogue_the_whole_shape',
        label: 'Write up the "whole shape" the fragment describes',
        reveal: [
          'Bright and dark, tended together, deliberately, for longer than you can currently estimate. You set it down as plainly as you can manage, aware that plain language is doing more work here than any embellishment could.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.15 },
          { type: 'set_flag', key: 'vo_ch3_claim_catalogue_shape' },
        ],
      },
      {
        id: 'prepare_to_understand',
        label: 'Prepare yourself, honestly, for whatever comes next',
        reveal: [
          'You take a moment before continuing — not out of fear, but out of a sense that whatever waits ahead deserves to be met without the leftover skepticism you walked in with. You leave as much of it on this shelf as you can.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.15 },
          { type: 'set_flag', key: 'vo_ch3_claim_prepare' },
        ],
      },
    ],
    transition: [
      'The shelf narrows into a final stair, warmer underfoot than anything else in the cavern, climbing toward a light that isn\'t crystal-glow at all, but something closer to actual dawn.',
    ],
  },
}

const ETHER_PINNACLE: ChamberStory = {
  start: {
    intro: [
      'The stair ends at a slender spire of crystal rising through a gap in the cavern roof — not open sky, quite, but close enough to it that a thin, real shaft of daylight finds its way down the shaft to meet you.',
      'Wound around the spire\'s base, protected in a spiral groove clearly cut for exactly this purpose, is the longest fragment yet:',
      '"I have carried this a long time, and I want to be honest about the cost of it before you meet me, so it doesn\'t surprise you. Keeping a story alive means telling it, over and over, to people who mostly never come back. That part is lonelier than the tending itself."',
    ],
    options: [
      {
        id: 'sit_with_loneliness_line',
        label: 'Sit with what she\'s admitting, plainly, before you\'ve even met her',
        reveal: [
          'Every fragment before this one framed the keeping as devotion, purpose, even peace. This is the first to name the cost outright, and it lands harder for having waited this long to say it.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch4_start_sit_lonely' },
        ],
      },
      {
        id: 'resolve_to_come_back',
        label: 'Resolve, quietly, that you\'ll be one of the ones who comes back',
        reveal: [
          'You don\'t say it aloud to anyone — there\'s no one here to say it to yet — but you make the decision anyway, privately, the way decisions that actually stick tend to get made.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch4_start_resolve_return' },
        ],
      },
      {
        id: 'look_up_the_shaft',
        label: 'Look up through the shaft toward the real daylight',
        reveal: [
          'It\'s a thin, ordinary sliver of afternoon sun, nothing like the crystal\'s carefully kept version of it — and somehow more moving for being so plain, proof that the real sky is still up there, still fine, still worth all this careful keeping of what fell from it.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch4_start_look_shaft' },
        ],
      },
    ],
    transition: [
      'You unwind your hand from the groove\'s edge and continue up, the daylight strengthening slightly with every step, the spire narrowing steadily toward its point.',
    ],
  },
  mid: {
    intro: [
      'Partway up, the spire widens briefly into a small landing, crystal walls here catching the daylight shaft and scattering it into something between starlight and sunrise — neither one, entirely, and lovely for being both at once.',
      'A fragment waits at the landing\'s center, shorter than the last, almost like a breath taken before continuing: "Ardis wasn\'t the only name I carry, if you\'re keeping track. Senna\'s in these walls too, and Maren\'s, though neither of them will ever know it firsthand. Keepers recognize keepers, even across distances like these."',
    ],
    options: [
      {
        id: 'recognize_the_names',
        label: 'Recognize both names, having met their stories already',
        reveal: [
          'You have met Ardis in Senna\'s account of her, and Maren in her own account of the vent field — and now, unexpectedly, both of them again here, folded into a third keeper\'s private acknowledgment of a kinship none of them ever got to have in person.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'vo_ch4_mid_recognize_names' },
        ],
      },
      {
        id: 'consider_keepers_recognizing_keepers',
        label: 'Sit with the phrase "keepers recognize keepers"',
        reveal: [
          'It reframes all four regions at once — not four separate survivors of four separate incidents, but one long, quiet lineage of people who each said yes to something enormous and never got to compare notes with the others who\'d said yes too.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'vo_ch4_mid_lineage' },
        ],
      },
      {
        id: 'watch_light_between_star_and_sun',
        label: 'Watch the landing\'s light shift between starlight and sunrise',
        reveal: [
          'It never settles into one or the other — always caught between, the way this whole cavern seems caught between what it used to be and what it\'s quietly become instead.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch4_mid_watch_light' },
        ],
      },
    ],
    transition: [
      'You climb the last stretch of the spire in something close to reverence, the daylight shaft widening steadily ahead, the crystal walls thinning toward whatever waits at the very top.',
    ],
  },
  claim: {
    intro: [
      'The spire\'s upper landing opens onto a narrow ledge just below the cavern\'s roof gap — close enough to true open air that you can feel it, faint and cool, mixed in with the crystal-scent below.',
      'One last fragment here, pinned where the daylight reaches it directly: "You\'re nearly at the top. What\'s waiting for you there isn\'t a monster, a mystery, or a body. It\'s a woman having a fairly ordinary day, who happens to also be holding up a piece of the sky. Please don\'t let the second part make you forget the first."',
    ],
    options: [
      {
        id: 'promise_to_remember_ordinary',
        label: 'Promise yourself you\'ll remember the "ordinary day" part',
        reveal: [
          'It\'s good advice, and you know it, having spent three prior regions half-mythologizing keepers before you met them. You resolve, this time, to meet her as a person first and a legend second.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'set_flag', key: 'vo_ch4_claim_promise_ordinary' },
        ],
      },
      {
        id: 'feel_the_open_air',
        label: 'Pause and feel the faint, real open air on this ledge',
        reveal: [
          'It\'s barely a breeze, more suggestion than sensation, but after a cavern\'s worth of kept-sky and crystallized starlight, even this faint trace of the actual thing feels like arriving somewhere.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'set_flag', key: 'vo_ch4_claim_feel_air' },
        ],
      },
      {
        id: 'climb_without_more_delay',
        label: 'Climb the last stretch without pausing further',
        reveal: [
          'You\'ve read enough. You\'ve waited enough. Whatever ordinary, extraordinary thing is waiting at the top of this spire, you\'d rather meet it than keep reading about it from one landing below.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'set_flag', key: 'vo_ch4_claim_climb_on' },
        ],
      },
    ],
    transition: [
      'You take the last stretch of the spire in a handful of steps, and the ledge opens, finally, onto the top.',
    ],
  },
}

const THE_APEX: ChamberStory = {
  start: {
    intro: [
      'The Apex is smaller than you expected — a modest platform at the spire\'s tip, open on one side to the real sky through the roof gap, crystal walls curving protectively around the rest.',
      'A woman sits at its edge, legs over the drop, a fragment of loose crystal turning slowly in one hand, catching the daylight and the cavern-glow both at once. She looks up at your footsteps with the unhurried recognition of someone who heard you coming a while ago.',
      '"You made it," she says. "Most people take a full day resting at the base before this last stretch. I\'m Iri. I\'d get up, but this view doesn\'t come around often, and I\'ve learned not to waste it. Sit, if you\'d like — there\'s room."',
    ],
    options: [
      {
        id: 'ask_about_the_dark_circle',
        label: 'Ask her, directly, what the dark circle in the sanctum actually is',
        reveal: [
          'She considers the question longer than the others so far. "Honestly? I don\'t fully know. I know it isn\'t hostile. I know it\'s old, older than the crystal, maybe older than the sky it came from. I know my job isn\'t to understand it completely — just to make sure it\'s never forgotten, and never alone."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch5_start_ask_dark_circle' },
        ],
      },
      {
        id: 'ask_about_loneliness',
        label: 'Ask about the loneliness she named in the fragment below',
        reveal: [
          '"It\'s real," she says, without flinching from it. "I wasn\'t exaggerating for effect. But you came back up here anyway to ask me about it in person instead of just filing a report on it, which — for what it\'s worth — already makes today better than most."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch5_start_ask_lonely' },
        ],
      },
      {
        id: 'sit_beside_her',
        label: 'Simply sit down beside her and take in the view first',
        reveal: [
          'She doesn\'t press for conversation, seems almost relieved you didn\'t lead with a question. You sit together for a while, the real sky above and the kept one glowing faintly below, and it turns out to be exactly the right way to start.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'vo_ch5_start_sit_beside' },
        ],
      },
    ],
    transition: [
      'Eventually she sets the turning crystal shard down between you, unhurried, and the conversation settles into something easier.',
    ],
  },
  mid: {
    intro: [
      'You sit together as the daylight shaft shifts slowly across the platform, and Iri talks — about the crystal, about the dark circle, about the long, strange, oddly companionable work of remembering something so that it doesn\'t have to remember itself alone.',
      '"I\'ve never met Senna. Never met Maren, or whoever came before Mira in Greenfields, if anyone did," she says. "But I\'ve heard about all of them, the way word travels between keepers even when the keepers themselves never do. You\'ve walked all our ground now. That\'s rarer than you\'d think."',
    ],
    options: [
      {
        id: 'tell_her_about_the_others',
        label: 'Tell her, in your own words, what you saw in the other three regions',
        reveal: [
          'She listens carefully, asking small questions, clearly hungry for detail she\'s only ever had secondhand. By the end she\'s smiling in a way that looks like relief as much as delight — proof, finally, that the others really are still out there, still tending, still whole.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'vo_ch5_mid_tell_others' },
        ],
      },
      {
        id: 'ask_if_she_wants_to_meet_them',
        label: 'Ask if she\'d ever want to actually meet the others in person',
        reveal: [
          '"Every day," she says, simply, no self-pity in it. "But someone has to stay, and it turns out that someone is usually me. I\'ve made peace with that. Doesn\'t mean I don\'t think about it."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'vo_ch5_mid_ask_meet' },
        ],
      },
      {
        id: 'offer_to_carry_word_back',
        label: 'Offer to carry word of her back to the other keepers',
        reveal: [
          'Something in her expression shifts, hope trying hard not to look like hope. "Would you?" she says. "Tell Senna the fire sounds like it\'s in good hands. Tell Maren the vent field sounds the same. That\'s enough. That would genuinely be enough."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'vo_ch5_mid_carry_word' },
        ],
      },
    ],
    transition: [
      'She rises, finally, brushing crystal dust from her knees, and nods toward a small alcove set into the platform\'s inner wall — the only place on this whole open ledge that looks deliberately closed off, and deliberately waiting.',
    ],
  },
  claim: {
    intro: [
      '"Two things live in there," Iri says. "One I give to anyone who\'s walked all the way up here and actually listened — that\'s you, clearly. The other I only give to someone who means to carry word back down, the way you just offered to. No wrong answer. Just an honest one, same as always down here."',
      'The alcove holds a small, faceted shard that seems to hold actual starlight rather than reflect the cavern\'s glow, and beside it, a single smooth dark stone, cool exactly the way the pool at the vestibule\'s entrance was cool.',
    ],
    options: [
      {
        id: 'accept_shard_only',
        label: 'Accept the starlight shard, and thank her honestly for all of it',
        reveal: [
          'She presses it into your hands. "For listening the whole way through," she says. "That\'s the whole job, on both ends. You did it well." You leave the dark stone in its alcove, and she doesn\'t seem to mind at all.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 30 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'grant_artifact', artifactName: "Iri's Starlight Shard" },
          { type: 'set_flag', key: 'vo_ch5_claim_shard_only' },
        ],
      },
      {
        id: 'promise_to_carry_word',
        label: 'Renew your promise, plainly, to carry word back to Senna and Maren',
        reveal: [
          'Iri studies you for a long moment, then nods, satisfied, and presses both objects into your hands — the starlight shard, and the smooth dark stone beside it. "Then you\'ll want both," she says. "One to remember me by. One to prove, to yourself, that you meant it — same as I imagine it went the first three times."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 30 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'grant_artifact', artifactName: "Iri's Starlight Shard" },
          { type: 'grant_artifact', artifactName: "Iri's Kept Sky" },
          { type: 'set_flag', key: 'vo_ch5_claim_promise_carry' },
        ],
      },
      {
        id: 'ask_her_to_choose_gift',
        label: 'Ask her to choose which one suits you better',
        reveal: [
          'She laughs, warm and unhurried, and picks up the starlight shard without hesitation. "This one," she says. "The other asks something of you that isn\'t mine to hand out lightly. No shame in taking your time with that. The sky\'s not going anywhere. Neither, as it turns out, am I."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 30 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'grant_artifact', artifactName: "Iri's Starlight Shard" },
          { type: 'set_flag', key: 'vo_ch5_claim_ask_her_choose' },
        ],
      },
    ],
    transition: [
      'You climb back down the spire, through Ether Pinnacle\'s daylight, past the Void Sanctum\'s watched dark circle, through Star Corridor\'s kept constellations, and out through Cloud Vestibule\'s still pool into ordinary afternoon light — carrying, this time, word for two keepers you\'ve already met and a shard of a sky none of them will ever see whole again, but all of them, it turns out, have been quietly keeping together the entire time.',
    ],
  },
}

// mapId 4 (The Void) -> chamberId -> ChamberStory
export const STORY_CONTENT: Record<number, Record<number, ChamberStory>> = {
  4: {
    1: CLOUD_VESTIBULE,
    2: STAR_CORRIDOR,
    3: VOID_SANCTUM,
    4: ETHER_PINNACLE,
    5: THE_APEX,
  },
}

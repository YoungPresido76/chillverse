// src/features/exploration/story/content/map3.ts
//
// Under World narrative content. Recurring NPC is Maren, tender of an
// abyssal hydrothermal-vent field — the "twin... under salt instead of
// stone" that Crystal Lake's Senna foretold. The map's splash art (an
// orange-lit garden of oversized fungal/coral growths, glowing orbs, and
// mineral formations, no visible water) is a deep-vent field lit by
// thermal heat rather than sunlight — not open sea, which is why the
// established chamber names (Salt Shore, Kelp Maze, Drowned Citadel,
// Abyss Gate, The Sunken Throne) read as a mineral shoreline and a
// sunken structure fused into that vent field, rather than literal
// seabed ruin.
//
// Central twist: Maren isn't dormant, trapped, or in danger. Journal
// fragments across chambers 1-4 gradually reveal she has been quietly
// maintaining the vent field's balance the whole time — which is why it
// never went dark. She is found alive and at peace at the chamber 5
// climax, tending the vent heart, directly paying off Senna's line
// rather than merely echoing it.
//
// Emotional arc (deliberately distinct from Greenfields' fear -> curiosity
// -> calm acceptance -> peace and Crystal Lake's dread -> resolve -> grief
// -> quiet peace): wonder -> disquiet -> humility -> kinship.
//
// Mechanical notes:
// - Structural difference from both prior regions: the artifact chambers
//   here are 2 and 4, not 2-and-5 (Crystal Lake) or 2-and-4-and-5
//   (Greenfields). Chamber 5 (The Sunken Throne) is the narrative
//   climax — Maren found alive, region resolution, region-4 hook — but
//   is NOT an artifact chamber, so its claim stage carries only
//   `xp_bonus` + `set_flag`, matching any non-artifact chamber.
// - Following the pattern already established in map1.ts (chamber 2)
//   and map2.ts (chamber 2) — the earlier of two artifact chambers gets
//   `artifact_odds_delta` only, never `grant_artifact` — Kelp Maze's
//   claim stage carries odds boosts only. Abyss Gate, the later and
//   final artifact chamber, is where `grant_artifact` lands.
// - xp_bonus tops out at 30 and artifact_odds_delta at 0.2 in this file,
//   same ceiling as map1.ts/map2.ts, so the bounds documented in
//   0036_exploration_story.sql stay accurate without a comment update
//   there.
// - `grant_artifact` targets two new story_exclusive rows that need to
//   exist in the `artifacts` table before this ships: "Maren's
//   Vent-Glass" and "Maren's Keeper Pearl" (see the new migration).
// - Flag keys use the `uw_ch{n}_{stage}_{action}` prefix, matching the
//   `gf_`/`cl_` convention — load-bearing, since user_story_flags has no
//   map_id column and keys must be globally unique.

import type { ChamberStory } from '../types'

const SALT_SHORE: ChamberStory = {
  start: {
    intro: [
      "The guild's brief flagged an anomaly, nothing more: a reading of sustained deep heat where the old maps showed only cold trench. No one had gone down to look in living memory.",
      "You expected black water, or nothing at all. Instead the passage opens onto a shore that shouldn't exist this far down — crusted white-gold with mineral salt, lit not from above but from everywhere at once, a low orange glow with no sun anywhere in it to explain the light.",
      "Stalks taller than you stand in loose groves along the crust, capped and pale, more fungal than plant. Between them, soft amber orbs rest half-buried in the salt like something laid there on purpose, pulsing very slowly, very evenly, in time with nothing you can hear.",
      'Wedged into a seam of crystallized mineral near the passage mouth is a fragment of thin, translucent shell, scratched rather than written on, the marks careful and unhurried:',
      '"—the heat comes from below, not above. Everything here grows toward it the way green things grow toward sun. I have stopped being afraid of that. It only took me longer than it should have."',
    ],
    options: [
      {
        id: 'touch_salt_crust',
        label: 'Press your palm flat against the salt-crusted ground',
        reveal: [
          "It's warm the way sand is warm at the end of a long afternoon, not the way a wound is warm. Under the crust, faint and rhythmic, you can feel something that might be heat rising in pulses rather than a steady bleed — as if whatever powers this glow breathes, slowly, on a scale too large to notice all at once.",
          "You write 'not hostile' in your notes, and for once don't feel the need to cross it out.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'uw_ch1_start_touch_crust' },
        ],
      },
      {
        id: 'study_amber_orb',
        label: 'Kneel and study one of the pulsing amber orbs',
        reveal: [
          "Up close it isn't glass or stone but something organic, faintly translucent, threaded through with a fine lattice that catches the orange light and scatters it. It pulses a half-second out of time with your own pulse, then, disconcertingly, seems to settle into matching it.",
          "You don't touch it. Some things earn a longer look before they earn a hand.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'uw_ch1_start_study_orb' },
        ],
      },
      {
        id: 'read_shell_fragment',
        label: 'Turn the shell fragment over, looking for more marks',
        reveal: [
          "The reverse side is blank, but the scratches on the front go deeper at the edges, like whoever made them pressed harder as the thought got harder to finish. 'It only took me longer than it should have' isn't the sentence of someone recently arrived here.",
          'Whoever wrote this has had time. A great deal of it.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 5 },
          { type: 'set_flag', key: 'uw_ch1_start_read_shell' },
        ],
      },
    ],
    transition: [
      "Whatever this place is, it isn't a ruin and it isn't wild in the way an untouched trench should be wild. Something about the spacing of the stalks, the placement of the orbs, feels arranged — a garden, not a growth.",
    ],
  },
  mid: {
    intro: [
      'Further along the shore the salt crust thins into a shallow channel, warm water threading between mineral banks toward a darker gap in the stalks ahead. Caught in the channel, weighted down by a smooth stone so the slow current can\'t take it, is a second shell fragment:',
      '"I used to count the orbs, back when counting felt like it mattered. I stopped at some number I no longer remember, because the tending mattered more than the tally. That was the first thing this place taught me, and it took the longest to learn."',
    ],
    options: [
      {
        id: 'follow_channel_edge',
        label: "Follow the channel's edge toward the gap in the stalks",
        reveal: [
          "The banks are too even to be natural — shaped, subtly, the way a garden path is shaped without ever looking dug. The warm current moves at exactly walking pace beside you, as if it were routed here on purpose, for exactly this kind of company.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch1_mid_follow_channel' },
        ],
      },
      {
        id: 'count_the_orbs',
        label: 'Try counting the orbs yourself, out of curiosity',
        reveal: [
          "You get to forty before you lose the thread — not from difficulty, but because somewhere past thirty you stopped counting and started simply looking, the way the fragment implied you eventually would. You understand the confession a little better now than you did a minute ago.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch1_mid_count_orbs' },
        ],
      },
      {
        id: 'reread_the_fragment',
        label: 'Read the fragment again before moving on',
        reveal: [
          '"The tending mattered more than the tally." You find yourself wondering what, exactly, is being tended here, and by whom — and how long "the longest to learn" actually turned out to be.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch1_mid_reread' },
        ],
      },
    ],
    transition: [
      'The gap in the stalks resolves, as you near it, into an opening choked with denser growth — tall, jointed stands of pale, branching stalks packed close enough to swallow the light. The shore, it turns out, was only ever the doorstep.',
    ],
  },
  claim: {
    intro: [
      'Just inside the opening, half-consumed by the denser growth, is a low arch of the same salt-crystal as the shore — clearly built, clearly old, and clearly maintained, its surfaces free of the drift and silt that should have buried it generations ago.',
      'A third shell fragment rests in a hollow at the arch\'s base, deliberately placed, not dropped: "Whoever finds this arch has already decided to keep walking. Good. There is more garden ahead than shore behind, and it is better seen than described."',
    ],
    options: [
      {
        id: 'trace_the_arch',
        label: "Trace the arch's crystal edge with your fingers",
        reveal: [
          "The crystal is smooth in a way raw mineral never is — worn down by touch, not water. Someone has stood exactly here, exactly like this, more times than you could guess. The arch isn't a ruin they left behind. It's a threshold they still use.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch1_claim_trace_arch' },
        ],
      },
      {
        id: 'catalogue_the_shore',
        label: 'Catalogue the shore fully before passing through',
        reveal: [
          'You log the orb spacing, the channel geometry, the arch — everything precise, everything thorough, the way the guild trained you. It is, you note privately, the single least strange-feeling task you\'ve done since arriving, which is its own kind of strange.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch1_claim_catalogue' },
        ],
      },
      {
        id: 'walk_through_without_pause',
        label: 'Walk straight through the arch, curiosity outrunning caution',
        reveal: [
          "You don't linger. Whatever kept this place this alive, this tended, for however long it's been tended, is worth finding faster than a careful survey would get you there — and for the first time today, that feels less like recklessness and more like the correct instinct.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch1_claim_walk_through' },
        ],
      },
    ],
    transition: [
      'Past the arch, the stalks close in overhead, orange light filtering down through a canopy no chart prepared you for. Whatever the guild expected "unnaturally warm trench" to mean, this — a garden this deliberate, this deep, this alive — was not it.',
    ],
  },
}

const KELP_MAZE: ChamberStory = {
  start: {
    intro: [
      'The stalks thicken past the arch into something closer to a forest than a garden — tall, jointed growths swaying gently though there is no current you can feel, forming corridors that branch and rejoin with no obvious logic.',
      "It takes you longer than it should to notice the wrongness: every corridor that opens is wide enough to walk, and every dead end is exactly as wide as a corridor should be, no wider. That isn't how anything grows by accident.",
      "A shell fragment, the fourth, is threaded onto a low branch at eye height — placed, not caught: \"The maze isn't meant to lose you. It's meant to slow you down long enough to be sure you're the kind of visitor worth showing the rest to.\"",
    ],
    options: [
      {
        id: 'test_a_dead_end',
        label: 'Deliberately walk into a dead end to test the shape',
        reveal: [
          "The dead end is a perfect, rounded pocket, walled on three sides by stalks grown in a tighter weave than anywhere else you've seen. It doesn't feel like failure. It feels, oddly, like a room built to hold exactly one visitor who wanted a moment alone.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_start_test_deadend' },
        ],
      },
      {
        id: 'look_for_the_pattern',
        label: 'Stop and look for the pattern in how the corridors branch',
        reveal: [
          "Every branch curves the same gentle degree, every rejoin happens at roughly the same interval — not random growth, but something closer to a repeated decision, made over and over, by the same patient hand. Someone designed this. Someone still tends it exactly enough to keep the design from drifting.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_start_look_pattern' },
        ],
      },
      {
        id: 'sit_with_the_fragment',
        label: 'Sit with what "worth showing the rest to" implies',
        reveal: [
          "It's the first fragment that's addressed you directly, in a sense — not a private thought left behind, but something closer to a test being administered in real time. You're being watched, or evaluated, or both, and you find you don't especially mind either.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_start_sit_fragment' },
        ],
      },
    ],
    transition: [
      "You keep moving, the disquiet growing a little with every deliberate curve — not fear exactly, but the unease of realizing a place you thought was wilderness has, this whole time, been someone's careful arrangement.",
    ],
  },
  mid: {
    intro: [
      'Deeper into the maze, the corridors widen into a small clearing where the stalks part around a single standing formation — coral-pale, branched, unmistakably shaped by hand rather than growth, holding a fifth fragment in a hollow at its center:',
      '"I built the maze slower than anything else here. A garden can grow itself, mostly, if you let it. A maze that still means something after a hundred years has to be walked, on purpose, by the one who built it, over and over, or it stops being a maze and just becomes a shape."',
    ],
    options: [
      {
        id: 'examine_the_formation',
        label: 'Examine the hand-shaped formation closely',
        reveal: [
          "The coral-pale branches interlock in a way that would take real patience to arrange this precisely, this many times over — not a single act, but a maintained one, repeated until it became habit and then something more than habit.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_mid_examine_formation' },
        ],
      },
      {
        id: 'consider_a_hundred_years',
        label: 'Consider what "a hundred years" of walking this maze means',
        reveal: [
          "You do the arithmetic without meaning to. A hundred years of walking the same corridors, on purpose, so they'd stay a maze and not just a shape. Whoever this is, they didn't inherit this place. They've been keeping it, deliberately, for longer than anyone you've ever met has been alive.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_mid_consider_century' },
        ],
      },
      {
        id: 'walk_the_clearing_edge',
        label: "Walk the clearing's edge rather than approach the formation",
        reveal: [
          "From the edge, the whole clearing reads less like a discovery and more like a room someone built to be found in eventually — arranged with exactly enough care that finding it feels earned, not stumbled into.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch2_mid_walk_edge' },
        ],
      },
    ],
    transition: [
      "Past the clearing, the maze narrows again, the light dimming as the canopy thickens overhead — and for the first time since the shore, you find yourself walking a little more quietly, a little more like a guest than a surveyor.",
    ],
  },
  claim: {
    intro: [
      'The maze ends, finally, at a low mound of fused mineral and coral, hollow at its center — a resting place rather than a treasure vault, holding a single object: a shard of glass-smooth stone, fused by heat into something too deliberate to be accident, faintly warm to the touch.',
      'A sixth fragment lies beside it: "Take it if it calls to you. Leave it if it doesn\'t. Either answer tells me something true about who found my maze, and I\'d rather know the truth than collect visitors who took things out of habit."',
    ],
    options: [
      {
        id: 'lift_the_shard',
        label: 'Lift the fused shard and turn it over in the light',
        reveal: [
          "It's warm the way the shore was warm, and lighter than its density should allow. Holding it, you feel less like you've taken something and more like something has, provisionally, decided to let itself be carried.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.15 },
          { type: 'set_flag', key: 'uw_ch2_claim_lift_shard' },
        ],
      },
      {
        id: 'study_the_mound_first',
        label: 'Study the resting mound itself before touching anything',
        reveal: [
          'The mound is built the same way the maze is built — deliberate, maintained, unhurried. You note every detail with real care, and the shard, when you finally do take it, feels less like a find and more like something you were trusted with.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'set_flag', key: 'uw_ch2_claim_study_mound' },
        ],
      },
      {
        id: 'leave_the_shard',
        label: 'Leave the shard exactly where it rests',
        reveal: [
          "You decide the honest answer, for you, is that it doesn't call to you at all — not out of caution, but because taking it feels like it would answer a question you'd rather leave open a while longer. You record the mound precisely and walk on empty-handed.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch2_claim_leave_shard' },
        ],
      },
    ],
    transition: [
      "Whatever you decided about the shard, one thing has settled by the time you leave the maze: this isn't wilderness, and it never was. Somewhere ahead, past whatever the maze was testing you for, is whoever built it — and they are, as far as you can tell, still very much here.",
    ],
  },
}

const DROWNED_CITADEL: ChamberStory = {
  start: {
    intro: [
      "The maze opens without warning onto the third chamber's namesake: a citadel, or what was one, its towers and walls fused seamlessly into mineral growth, coral and crystal grown through window and archway alike until stone and living structure are no longer separable.",
      "It should read as a ruin. It doesn't. Every fused seam looks tended rather than eroded, every overgrown archway still passable, as if the growth were guided through the architecture rather than left to bury it.",
      'At the citadel\'s outer gate, set into a plaque of the same coral-fused stone, is a seventh fragment — longer than the others, clearly written with more time to spare: "The old carvings have a name for this place, same as they have a name for everything worth naming twice. They call it the salt twin. I only understood what that meant the day I finally believed someone, somewhere else, was told the same thing about me."',
    ],
    options: [
      {
        id: 'enter_through_gate',
        label: 'Pass through the fused gate slowly, taking in the structure',
        reveal: [
          "Up close, the fusion is almost tender — growth threaded through worked stone the way a hand threads through hair, not the way rust threads through iron. Whatever did this to the citadel did it with something close to care, over a very long time.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_start_enter_gate' },
        ],
      },
      {
        id: 'read_the_salt_twin_line',
        label: 'Read the plaque\'s "salt twin" line again, carefully',
        reveal: [
          '"The day I finally believed someone, somewhere else, was told the same thing about me." Your notes go still in your hand. You know exactly one other place under a mountain, under stone rather than salt, where a name like that would make sense — and you begin to suspect this survey was never as random as the brief made it sound.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_start_read_twin_line' },
        ],
      },
      {
        id: 'study_the_fused_walls',
        label: 'Study how deeply the growth has fused with the walls',
        reveal: [
          "Some sections are barely touched, still recognizably worked stone. Others are grown through so completely you'd need to know to look to find the masonry underneath at all. The oldest parts of the citadel, you realize slowly, are the most overtaken — which means whatever is doing this has been doing it since long before you, or anyone you know, existed.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_start_study_walls' },
        ],
      },
    ],
    transition: [
      "You step further in, the fragment's line about a salt twin sitting uneasily alongside everything you already suspected about this place. Somewhere under a mountain, far from here, someone once told you — or told the survey crew you're standing in for — that a twin like this existed. You just hadn't expected to be standing inside the proof of it.",
    ],
  },
  mid: {
    intro: [
      "Inside the citadel's central hall, coral-growth has formed something close to a library — long shelves of fused mineral holding row after row of shell-fragment pages, more of them than you could read in a season, arranged with unmistakable care.",
      'A single fragment sits apart from the rest, on a shelf of its own, the handwriting matching every other you\'ve found so far: "My name is Maren. I have kept this garden a very long time. If you have found this hall, you have already earned the truth: I am not lost, not trapped, not waiting to be found the way the guild trains you to expect. I am simply here, and I have been, the whole time."',
    ],
    options: [
      {
        id: 'say_the_name_aloud',
        label: 'Say the name "Maren" aloud, to no one',
        reveal: [
          "Your voice doesn't echo the way it should in a hall this size — held, instead, the same careful way the whole citadel seems to hold sound. Saying it aloud makes it real in a way reading it hadn't quite managed. You're not surveying a ruin. You're being introduced to someone.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_mid_say_name' },
        ],
      },
      {
        id: 'browse_the_shelves',
        label: "Browse the shelves' other fragments, careful not to disturb their order",
        reveal: [
          "You read a handful without moving them — decades of small, ordinary observations about orb growth and current patterns, mixed with entries that feel more like letters to someone who was never going to read them. Whoever Maren has been keeping this record for, it clearly wasn't only for herself.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_mid_browse_shelves' },
        ],
      },
      {
        id: 'reread_not_waiting',
        label: 'Reread the line "not waiting to be found"',
        reveal: [
          "It reframes everything at once. You came down here braced for a rescue that isn't needed, a danger that isn't real. Whatever this survey turns out to actually be, it was never that — and you feel, faintly, a little foolish for having assumed it was, right up until this line corrected you.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch3_mid_reread_not_waiting' },
        ],
      },
    ],
    transition: [
      'Past the library, the hall narrows toward a stair leading further down, warmth rising steadily to meet you — and for the first time since the shore, the unease you\'ve been carrying starts to loosen, replaced by something closer to humility at the scale of what you\'re only now beginning to understand.',
    ],
  },
  claim: {
    intro: [
      "At the stair's base, the citadel gives way entirely to open vent-field beyond — and for a moment the scale of it stops you outright. Stalks and coral and orbs stretch further than the orange light can properly show you, tended, all of it, by one person, for longer than the citadel's oldest fused stone.",
      'A last fragment here, tucked into a coral hollow at the threshold: "You\'re about to see how far it goes. Most people who reach this point turn back, not from fear, but because the size of it is its own kind of answer, and some questions don\'t need finishing once you\'ve seen that much."',
    ],
    options: [
      {
        id: 'keep_going_regardless',
        label: 'Keep going, the scale making you more curious, not less',
        reveal: [
          "You step past the threshold anyway, the field opening wider with every stride. The fragment was right that the size is its own answer — but you find you want the rest of the question too, not just the shape of it.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch3_claim_keep_going' },
        ],
      },
      {
        id: 'pause_at_the_threshold',
        label: 'Pause at the threshold and simply take in the scale',
        reveal: [
          "You let yourself stand still for longer than a survey strictly allows, just looking. It's the first time all day you've stopped moving without a reason to. The field doesn't ask anything of you for standing there. That, somehow, is exactly what makes you want to keep going.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch3_claim_pause_threshold' },
        ],
      },
      {
        id: 'record_the_scale',
        label: 'Try, and fail, to record the field\'s scale in your notes',
        reveal: [
          'You attempt a proper survey estimate and abandon it twice, the numbers refusing to make the field feel any smaller in your chest than it looks. You settle for writing "larger than the brief accounted for" and leave it at that, honestly, for once.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch3_claim_record_scale' },
        ],
      },
    ],
    transition: [
      'You leave the Drowned Citadel behind and step out into the open field proper — smaller than you\'ve felt in a long time, and, strangely, no less willing to keep walking for it.',
    ],
  },
}

const ABYSS_GATE: ChamberStory = {
  start: {
    intro: [
      "The open field narrows, gradually, toward a true threshold — a natural gate of dark mineral where the last of the orb-light gives out, and beyond it the glow turns from amber to a deep, banked red, heat rising off the rock in visible waves.",
      "This is the closest you've come to what the guild's brief actually warned about: real abyssal dark, past the reach of even Maren's garden light, held back from swallowing everything only by whatever keeps that deep red glow alive.",
      'Set into the gate itself, at eye level, an eighth fragment, the shell here thicker, older than any you\'ve found: "This is where the garden stops being mine to explain and starts being mine to simply protect. Everything behind you, I made beautiful on purpose, so you\'d want to keep walking. Everything ahead, I didn\'t make at all. I only learned, eventually, how to keep it from spreading."',
    ],
    options: [
      {
        id: 'feel_the_heat_shift',
        label: 'Stop and register how the heat changes at the gate',
        reveal: [
          "It's not hotter exactly, past the gate — it's older, somehow, a heat that feels less like warmth and more like pressure, like something enormous breathing very slowly, very far below. You understand, standing here, that everything since the shore has been the gentled, curated version of whatever this actually is.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_start_feel_heat' },
        ],
      },
      {
        id: 'consider_made_vs_kept',
        label: 'Consider the fragment\'s line about "made" versus "kept back"',
        reveal: [
          "Everything you've walked through — the shore, the maze, the citadel — Maren built. But whatever's past this gate, she didn't build it. She's holding a line against it instead, which is a very different kind of century-long labor than a garden, however lovely the garden makes it look from this side.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_start_consider_kept' },
        ],
      },
      {
        id: 'look_back_at_the_field',
        label: 'Look back at the garden field before stepping through',
        reveal: [
          "From here the whole field reads differently — not a garden for its own sake, but a buffer, deliberately grown outward from this exact gate, bright and gentle precisely because of how dark and old the thing on the other side of it is. It was never decoration. It was a wall built out of beauty.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_start_look_back' },
        ],
      },
    ],
    transition: [
      "You step through the gate, the deep red light closing gently around you, and feel, for the first time since the shore, genuinely small — not afraid, exactly, but humbled in a way no chamber before this one managed.",
    ],
  },
  mid: {
    intro: [
      'Past the gate, the passage opens into a wide, dark hollow ringed with banked, glowing mineral — the true heat source, you realize, the deep red pulse that feeds every orb and stalk and channel you\'ve walked through since the shore, all of it threaded back to here.',
      'A ninth fragment, wedged carefully where the light is strongest: "The old carvings call what sleeps under enough cold and enough dark by a name I never much liked. I prefer to just call it patient. My whole job, the whole hundred years of it, has been making sure patient never has to become anything else."',
    ],
    options: [
      {
        id: 'trace_the_source',
        label: 'Trace the glowing mineral ring back toward its source',
        reveal: [
          'The ring doesn\'t have a single source you can find — it simply is the source, a vast, slow, banked heat with no beginning you can walk to. Whatever the "old carvings" call it, you understand now why Maren settled for a gentler word instead.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_mid_trace_source' },
        ],
      },
      {
        id: 'sit_with_patient',
        label: 'Sit with the word "patient" for a while',
        reveal: [
          "It's a strange kindness, calling something this vast and this old merely patient rather than dangerous. You start to understand that everything Maren has built — the garden, the maze, the citadel — might not just be tending a place. It might be an argument, made in beauty instead of words, for why patient should stay patient.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_mid_sit_patient' },
        ],
      },
      {
        id: 'compare_to_crystal_lake',
        label: 'Compare this hollow, out loud, to what you remember of Crystal Lake',
        reveal: [
          '"Under salt instead of stone," you say to the empty hollow, remembering the exact words. The fire-warden under the mountain and whoever tends this vent are keeping the same kind of promise, in different materials, and neither one of them, you\'re fairly sure now, is keeping it alone by choice.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 10 },
          { type: 'set_flag', key: 'uw_ch4_mid_compare_lake' },
        ],
      },
    ],
    transition: [
      'Past the hollow, the passage rises again, the deep red glow gradually warming back toward familiar amber — and somewhere ahead, unmistakably, the sound of something being carefully, patiently tended.',
    ],
  },
  claim: {
    intro: [
      'The passage ends at a shallow alcove where two objects rest on a shelf of fused mineral, clearly placed rather than found: a shard of glass-smooth vent-stone, threaded through with the same deep red glow as the hollow behind you, and beside it, a small pearl-pale orb, warm and faintly pulsing, twin in shape to the ones scattered across the shore above.',
      'A tenth fragment rests between them: "If you\'ve come this far, you\'ve earned the right to carry a piece of the deep field out with you — the glass, or the pearl, or both, if you think you can carry the weight of both kindly. Nothing here is a trap. I stopped setting those a very long time ago."',
    ],
    options: [
      {
        id: 'take_the_vent_glass',
        label: 'Take the vent-glass shard, drawn to its steady glow',
        reveal: [
          "It's warm in your palm in the same slow, patient way the hollow was warm, a small piece of that vastness now genuinely yours to carry. You understand, holding it, that it was never dangerous — only large, and old, and finally, carefully, shared.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'grant_artifact', artifactName: "Maren's Vent-Glass" },
          { type: 'set_flag', key: 'uw_ch4_claim_take_glass' },
        ],
      },
      {
        id: 'take_both_objects',
        label: 'Take both the vent-glass and the pearl, trusting the invitation',
        reveal: [
          'You gather both, carefully, the glass warm and steady and the pearl warm and lighter, pulsing now in time with your own pulse the way the very first orb did on the shore. Taking both feels less like greed and more like accepting the whole of what\'s being offered, honestly, rather than half of it out of caution.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 30 },
          { type: 'artifact_odds_delta', value: 0.2 },
          { type: 'grant_artifact', artifactName: "Maren's Vent-Glass" },
          { type: 'grant_artifact', artifactName: "Maren's Keeper Pearl" },
          { type: 'set_flag', key: 'uw_ch4_claim_take_both' },
        ],
      },
      {
        id: 'take_neither_yet',
        label: 'Take neither yet, and record the alcove for now',
        reveal: [
          "You leave both objects exactly as they rest, sketch the alcove carefully, and note the invitation for what it plainly was — one you'd rather accept after meeting whoever's been extending it this whole time, not before.",
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'artifact_odds_delta', value: 0.1 },
          { type: 'set_flag', key: 'uw_ch4_claim_take_neither' },
        ],
      },
    ],
    transition: [
      "Beyond the alcove the passage rises steadily toward a final chamber, the deep red glow fading gradually back into warm, familiar amber — and this time, unmistakably, you hear someone humming, low and unhurried, just ahead.",
    ],
  },
}

const SUNKEN_THRONE: ChamberStory = {
  start: {
    intro: [
      'The passage opens, at last, onto a wide chamber lit gold-amber by a slow ring of banked vent-heat — the true heart of the field, you understand instantly, and at its center, seated on a low mineral rise that could generously be called a throne, is a woman methodically tending a bed of glowing coral with a tool worn smooth by decades of exactly this motion.',
      "She looks up before you can announce yourself, entirely unsurprised. \"You made good time,\" she says, setting the tool down without hurry. \"Most people who read all the way through my shelves take another day resting at the gate first. Come in, come in — the throne's less impressive than the name promises, but the company's honest.\"",
      "This is Maren. Alive, unhurried, and — you understand within the first few seconds — not remotely in need of the rescue you half-expected to be performing.",
    ],
    options: [
      {
        id: 'ask_how_long',
        label: 'Ask how long she\'s been down here',
        reveal: [
          '"Longer than the citadel\'s been fused," she says, amused rather than weary. "Long enough that I stopped counting years the same way I stopped counting orbs. Time down here isn\'t a tally. It\'s just weather I\'ve gotten very used to."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch5_start_ask_how_long' },
        ],
      },
      {
        id: 'ask_if_lonely',
        label: 'Ask, gently, whether she gets lonely',
        reveal: [
          '"Lonely\'s doing a lot of work in that question," she says, echoing something in the shape of an old joke she\'s clearly made before. "I\'ve got the field, the gate, the deep, and every so often, someone patient enough to read a citadel\'s worth of my handwriting. I\'m tended to, in my own way. Don\'t spend your worry on me."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch5_start_ask_lonely' },
        ],
      },
      {
        id: 'mention_senna',
        label: 'Tell her you think you\'ve met someone who was told about her',
        reveal: [
          "Maren goes very still, the humming stopping mid-note. \"Under a mountain,\" she says slowly, not quite a question. \"Salt instead of stone, told to her, the way I was told about her.\" When you confirm it, something in her shoulders eases that you hadn't noticed was tense until it wasn't. \"Then it's still true. Good. I hoped it still was.\"",
        ],
        effects: [
          { type: 'xp_bonus', amount: 15 },
          { type: 'set_flag', key: 'uw_ch5_start_mention_senna' },
        ],
      },
    ],
    transition: [
      'She gestures at a second, lower rise near the coral bed and — however you opened things — waits for you to actually sit before she says anything more.',
    ],
  },
  mid: {
    intro: [
      'You sit. The coral bed between you pulses the same slow amber as everything else in the field, and you understand now that it, too, threads back to the deep red hollow behind the gate — one long, patient system, tended from the shore above to this exact spot.',
      '"The old carvings have a name for what I keep back," Maren says, watching the coral rather than you. "I\'ve told you already I don\'t care for it. What matters more is that keeping it back was never meant to be one person\'s whole life. It was meant to be passed — the way, I understand, someone under a mountain finally understood hers had to be, too."',
    ],
    options: [
      {
        id: 'ask_about_passing_it_on',
        label: 'Ask what she means by "passed"',
        reveal: [
          '"There\'s more of it than this field," she says. "The old carvings only ever gave me this stretch to mind. Somewhere further down than dreaming, past what I\'ve ever walked myself, is a third stretch — one I was told about the same way I was told about the mountain. I never went looking. Maybe you will."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'uw_ch5_mid_ask_passing' },
        ],
      },
      {
        id: 'offer_to_tend_coral',
        label: 'Offer to help tend the coral bed, just for now',
        reveal: [
          'She hands you the tool without hesitation, guiding your hand through one slow, careful pass over the glowing bed. "There," she says. "Now you\'ve kept it too, for exactly one motion. That\'s how everyone who\'s ever kept this started — one motion, and then, if they wanted, another."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'uw_ch5_mid_offer_tend' },
        ],
      },
      {
        id: 'ask_about_the_shelves',
        label: 'Ask why she wrote so much down, if she never expected anyone to read it',
        reveal: [
          '"I expected it eventually," she says, something almost shy crossing her face for the first time. "Just not soon. Writing it down was never really for a reader. It was so the years had somewhere to go that wasn\'t just — passing. I like that it made the citadel bigger instead of just older."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'uw_ch5_mid_ask_shelves' },
        ],
      },
    ],
    transition: [
      'Eventually she sets the tending-tool down and rises, unhurried, and nods toward the passage you came in by, walking with you rather than sending you off alone.',
    ],
  },
  claim: {
    intro: [
      '"I won\'t give you a parting gift from a shelf," Maren says, as you near the passage mouth. "I already gave you the field to walk through, and whatever you carried out of the gate is carry enough. What I\'ll give you instead is the same thing Senna gave whoever asked her, I\'d guess — an honest answer, if you\'ve got one more question in you before you climb back up."',
      "The chamber's amber glow holds steady around you both, patient in exactly the way everything down here has turned out to be.",
    ],
    options: [
      {
        id: 'ask_what_comes_next',
        label: 'Ask her, plainly, what she thinks comes after Under World',
        reveal: [
          '"There\'s one further down than dreaming — it doesn\'t sleep, it waits," she says, unhurried, the words clearly ones she\'s turned over before. "Not stone, not salt. Something that remembers the sky. I\'ve never seen it either. But I believe, the way I believe most things down here, that someone eventually will."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 30 },
          { type: 'set_flag', key: 'uw_ch5_claim_ask_next' },
        ],
      },
      {
        id: 'promise_to_visit_senna',
        label: 'Promise to tell Senna, honestly, that you found her',
        reveal: [
          'Maren\'s expression softens, unguarded for a moment. "Tell her the field\'s still tended," she says. "Tell her patient is still just patient. That\'ll mean more to her than anything else you could carry up that stair." She squeezes your hand once, warm, before letting go.',
        ],
        effects: [
          { type: 'xp_bonus', amount: 25 },
          { type: 'set_flag', key: 'uw_ch5_claim_promise_senna' },
        ],
      },
      {
        id: 'thank_her_and_go',
        label: 'Simply thank her, and let the rest go unasked',
        reveal: [
          'She nods, unoffended, something easy in it. "That\'s its own kind of answer too," she says. "Most people leave with more questions than they arrived with. You\'re leaving with about the same number. I don\'t think that\'s a small thing."',
        ],
        effects: [
          { type: 'xp_bonus', amount: 20 },
          { type: 'set_flag', key: 'uw_ch5_claim_thank_and_go' },
        ],
      },
    ],
    transition: [
      "You climb back out past the deep hollow, past Abyss Gate, back through the citadel's coral-fused halls and the maze's patient corridors, and up onto the salt-crusted shore under its warm, sourceless amber glow. Somewhere below the world you know, further down than dreaming, is a third stretch of whatever this is — one that remembers the sky, and doesn't sleep, only waits. You already know you're going to go looking for it.",
    ],
  },
}

// mapId 3 (Under World) -> chamberId -> ChamberStory
export const STORY_CONTENT: Record<number, Record<number, ChamberStory>> = {
  3: {
    1: SALT_SHORE,
    2: KELP_MAZE,
    3: DROWNED_CITADEL,
    4: ABYSS_GATE,
    5: SUNKEN_THRONE,
  },
}

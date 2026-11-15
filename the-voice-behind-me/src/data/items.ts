import type { ItemDef } from './types';

/**
 * Every collectible in the game. Clues are written so that they read one way
 * on a first playthrough and another way once the player knows the truth:
 * Noah woke Elias, led him out, and went back in when Elias returned for him.
 */
export const ITEMS: Record<string, ItemDef> = {
  // ───────────────────────── CHAPTER 1 ─────────────────────────
  voicemail: {
    id: 'voicemail',
    name: 'Voicemail — Unknown Number',
    type: 'tape',
    chapter: 1,
    important: true,
    tint: '#5a6b78',
    description:
      'A message left on the house answering machine. The line was disconnected seven years ago.',
    tape: [
      { who: 'Answering Machine', text: 'You have... one... new message.', voice: 'machine', tape: true },
      { who: 'Voice', text: '(rain... static... breathing)', voice: 'whisper', tape: true, faint: true, dur: 3 },
      { who: 'Voice', text: 'Kuya...', voice: 'noah', tape: true, dur: 2.2 },
      {
        who: 'Voice',
        text: 'Huwag kang maniwala sa taong nasa likod mo.',
        voice: 'noah',
        tape: true,
        dur: 4.2,
      },
      { who: '', text: "(Kuya... don't believe the person behind you.)", voice: 'none', faint: true, dur: 3.4 },
      { who: 'Answering Machine', text: 'End of message.', voice: 'machine', tape: true },
    ],
  },
  photo_porch: {
    id: 'photo_porch',
    name: 'Photograph — The Porch',
    type: 'photo',
    chapter: 1,
    important: true,
    tint: '#8a7356',
    description:
      'Two boys on the front steps. Elias, 17, squinting into the sun. Noah, 15, a step behind him with a hand on his shoulder.',
    back: 'June. Si Kuya at ako.\nNoah always walks behind me. "So I can catch you, Kuya." — Mom',
  },
  key_noah: {
    id: 'key_noah',
    name: "Key — Noah's Room",
    type: 'key',
    chapter: 1,
    important: true,
    tint: '#9b8b52',
    description: 'A small brass key on a string. The paper tag says NOAH in a child\'s handwriting.',
  },
  clue_calendar: {
    id: 'clue_calendar',
    name: 'Kitchen Calendar',
    type: 'clue',
    chapter: 1,
    optionalClue: true,
    tint: '#a65a4a',
    description: 'A calendar still turned to July. Nobody turned the page.',
    text:
      'JULY\n\n9 — Noah: start drum lessons?\n12 — Elias: Manila dorm deposit\n14 — (circled twice) SIGNAL NO. 3. Brownout again. Buy candles. Check flashlight batteries — Noah\n15 — Elias leaves.\n\nOn the 14th, in pencil, very small: "say sorry to Kuya"',
  },
  clue_fridge_drawing: {
    id: 'clue_fridge_drawing',
    name: "Child's Drawing — Fridge",
    type: 'clue',
    chapter: 1,
    optionalClue: true,
    tint: '#d7c48a',
    description: 'Crayon on yellowed paper, held by a cracked fruit magnet.',
    text:
      '"AKO AT SI KUYA" (me and Kuya)\n\nTwo stick figures in the dark. The big one walks in front. The small one walks behind him holding a yellow flashlight, its beam drawn as a wide happy triangle.\n\nUnder the small one: "AKO ANG ILAW" — I\'m the light.',
  },

  // ───────────────────────── CHAPTER 2 ─────────────────────────
  photo_beach: {
    id: 'photo_beach',
    name: 'Photograph — Beach',
    type: 'photo',
    chapter: 2,
    important: true,
    tint: '#6f8a96',
    description: 'Two small boys at the edge of the sea. The smaller one is holding the back of the bigger one\'s shirt.',
    back: 'Batangas. Elias 8, Noah 6.\nHe wouldn\'t let go of Kuya\'s shirt the whole day.',
  },
  photo_bike: {
    id: 'photo_bike',
    name: 'Photograph — Bicycle',
    type: 'photo',
    chapter: 2,
    important: true,
    tint: '#7c8559',
    description: 'A boy on a too-big bicycle. Another boy running behind, one hand on the seat.',
    back: 'Noah, 9.\n"Kuya ran behind me the whole time. Then he let go and I didn\'t fall."',
  },
  photo_graduation: {
    id: 'photo_graduation',
    name: 'Photograph — Graduation',
    type: 'photo',
    chapter: 2,
    important: true,
    tint: '#8d7a6a',
    description: 'A boy in a white barong with a paper medal. Someone\'s arm reaches into frame to fix his collar.',
    back: 'Elementary graduation. Noah, 12.\nKuya fixed my collar. He pretended he wasn\'t crying.',
  },
  photo_recorder: {
    id: 'photo_recorder',
    name: 'Photograph — Birthday',
    type: 'photo',
    chapter: 2,
    important: true,
    tint: '#a0574a',
    description: 'A cake with fifteen candles. Noah holds a red cassette recorder up to the camera like a trophy.',
    back: 'March 9. Noah, 15.\nKuya\'s gift. "Record everything, para hindi mo makalimutan." (so you never forget)',
  },
  diary: {
    id: 'diary',
    name: "Noah's Diary",
    type: 'note',
    chapter: 2,
    important: true,
    tint: '#4f5a7a',
    description: 'A school notebook with a cartoon robot sticker. The last entry is torn out.',
    text:
      'May 2 — Dad did the fire drill again. Front door, not the back, the back sticks. I have to wake Kuya. He sleeps like a rock.\n\nJune 20 — Kuya got into the school in Manila. I\'m happy. I\'m not happy.\n\nJuly 10 — I keep the flashlight under my pillow now. Brownouts every night.\n\nJuly 13 — [the page is torn out — four strips are tucked in the back cover]',
  },
  diary_page: {
    id: 'diary_page',
    name: 'Diary — Restored Page',
    type: 'note',
    chapter: 2,
    important: true,
    tint: '#4f5a7a',
    description: 'The torn page, pieced back together.',
    text:
      'July 13. Kuya says he\'s leaving for Manila after the storm. I said things I didn\'t mean. Tomorrow I\'ll say sorry, even if he doesn\'t open the door.\n\nIf the brownout comes again I\'ll keep the flashlight by my bed, because Kuya sleeps like a rock and someone has to wake him up.\n\nThat\'s my job. Little brothers walk behind, so they can catch you.',
  },
  clue_height_marks: {
    id: 'clue_height_marks',
    name: 'Height Marks — Doorframe',
    type: 'clue',
    chapter: 2,
    optionalClue: true,
    tint: '#6b5640',
    description: 'Pencil lines climbing Noah\'s doorframe, year after year.',
    text:
      'E — 10 . . . N — 8\nE — 13 . . . N — 11\nE — 16 . . . N — 14\nE — 17 . . . N — 15\n\nAt the very top, above every line, in Noah\'s handwriting:\n"Someday I\'ll be tall enough to carry you, Kuya."',
  },
  clue_noah_drawing: {
    id: 'clue_noah_drawing',
    name: "Noah's Drawing — Desk",
    type: 'clue',
    chapter: 2,
    optionalClue: true,
    tint: '#c25a4a',
    description: 'Ballpoint on graph paper. A red cassette recorder with sound waves coming out.',
    text:
      'FOR KUYA.\nPLAY WHEN YOU MISS ME.\n(rewind ko na, para diretso na) — I already rewound it so it starts at the right place.\n\nA tiny arrow points to the music box on the shelf.',
  },
  tape_hidden_a: {
    id: 'tape_hidden_a',
    name: 'Hidden Tape — "Music Box"',
    type: 'tape',
    chapter: 2,
    hiddenTape: true,
    tint: '#b04848',
    description: 'A tiny tape wound in red thread, hidden in the music box. Labelled "A — for Kuya".',
    tape: [
      { who: 'Noah', text: 'Okay, okay. Is it recording? The red light is on.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Kuya, if you find this it means you were snooping. Typical.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'I\'m making you a tape for Manila. In pieces. You have to find all of them.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Part one: "I know you think I\'m annoying..."', voice: 'noah', tape: true },
      { who: 'Noah', text: '...and part two: "...but I\'m proud of you."', voice: 'noah', tape: true },
    ],
  },

  // ───────────────────────── CHAPTER 3 ─────────────────────────
  mark_1: { id: 'mark_1', name: 'Marking I', type: 'marking', chapter: 3, tint: '#5a5a5a', description: 'A scratched letter. One tally mark beneath it.', text: 'Scratched backwards into the plaster, readable only in a mirror:\n\nL\n|' },
  mark_2: { id: 'mark_2', name: 'Marking II', type: 'marking', chapter: 3, tint: '#5a5a5a', description: 'A scratched letter. Two tally marks beneath it.', text: 'Scratched backwards into the plaster, readable only in a mirror:\n\nI\n||' },
  mark_3: { id: 'mark_3', name: 'Marking III', type: 'marking', chapter: 3, tint: '#5a5a5a', description: 'A scratched letter. Three tally marks beneath it.', text: 'Scratched backwards into the plaster, readable only in a mirror:\n\nK\n|||' },
  mark_4: { id: 'mark_4', name: 'Marking IV', type: 'marking', chapter: 3, tint: '#5a5a5a', description: 'A scratched letter. Four tally marks beneath it.', text: 'Scratched backwards into the plaster, readable only in a mirror:\n\nO\n||||' },
  mark_5: { id: 'mark_5', name: 'Marking V', type: 'marking', chapter: 3, tint: '#5a5a5a', description: 'A scratched letter. Five tally marks beneath it.', text: 'Scratched backwards into the plaster, readable only in a mirror:\n\nD\n||||| ' },
  clue_wall_scratches: {
    id: 'clue_wall_scratches',
    name: 'Scratches — Behind the Dresser',
    type: 'clue',
    chapter: 3,
    optionalClue: true,
    tint: '#4d4a46',
    description: 'Letters gouged low on the wall with a nail, at a child\'s height.',
    text:
      'N + E\n\n"KAPAG NATATAKOT SI KUYA, NASA LIKOD NIYA AKO."\n(When Kuya is scared, I\'m right behind him.)\n\n— Noah, 10 years old',
  },
  tape_hidden_b: {
    id: 'tape_hidden_b',
    name: 'Hidden Tape — "Linen Closet"',
    type: 'tape',
    chapter: 3,
    hiddenTape: true,
    tint: '#b04848',
    description: 'Tucked inside a folded bedsheet. Labelled "B — wag mo munang pakinggan" (don\'t listen yet).',
    tape: [
      { who: 'Noah', text: 'Part three. This one\'s hard to say so don\'t laugh.', voice: 'noah', tape: true },
      { who: 'Noah', text: '"...I heard what you said about leaving and never coming back..."', voice: 'noah', tape: true },
      { who: 'Noah', text: '"...and I\'m not mad. I was never mad."', voice: 'noah', tape: true },
      { who: 'Noah', text: '(a long breath) Okay. That was the hard part.', voice: 'noah', tape: true },
    ],
  },

  // ───────────────────────── CHAPTER 4 ─────────────────────────
  cassette_player: {
    id: 'cassette_player',
    name: 'Cassette Player',
    type: 'tool',
    chapter: 4,
    important: true,
    tint: '#9c3c34',
    description: 'Noah\'s red recorder. The plastic is warped by heat on one side. It still works.',
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper Clipping',
    type: 'note',
    chapter: 4,
    important: true,
    tint: '#b6ad96',
    description: 'Yellowed newsprint, folded into quarters. The date line reads JULY 15.',
    text:
      'STORM NIGHT FIRE CLAIMS TEEN\n\nJULY 15 — A fire that began during last night\'s brownout (Signal No. 3, July 14) destroyed much of a two-storey home. A 15-year-old boy, Noah, did not survive.\n\nHis brother, 17, was treated for burns to his back and smoke inhalation. He was found just inside the front door.\n\nA neighbor told reporters she saw "one of the boys" come out of the house and then run back in. "The other one was screaming his name."\n\nFire officials believe a candle was left burning in the kitchen.',
  },
  office_calendar: {
    id: 'office_calendar',
    name: "Dad's Desk Note",
    type: 'note',
    chapter: 4,
    tint: '#a59880',
    description: 'A note in Dad\'s blocky handwriting, taped to the desk lamp.',
    text:
      'The archive lock: same four numbers as the worst night. Month, then day.\nI keep everything in there. I can\'t throw it away and I can\'t look at it.',
  },
  tape_1: {
    id: 'tape_1',
    name: 'Tape — "HAPPY BDAY"',
    type: 'tape',
    chapter: 4,
    important: true,
    tint: '#8d4a3c',
    description: 'Label in marker: "MARCH 9 — FIRST TAPE!!"',
    tape: [
      { who: 'Noah', text: 'Testing, testing. This is Noah\'s recorder. Property of Noah.', voice: 'noah', tape: true },
      { who: 'Elias', text: 'Technically I bought it.', voice: 'elias', tape: true },
      { who: 'Noah', text: 'Technically shut up. March 9! I\'m fifteen! Happy birthday to me!', voice: 'noah', tape: true },
    ],
  },
  tape_2: {
    id: 'tape_2',
    name: 'Tape — "FIRE DRILL"',
    type: 'tape',
    chapter: 4,
    important: true,
    tint: '#8d4a3c',
    description: 'Label: "MAY 2 — DAD\'S DRILL (boring)"',
    tape: [
      { who: 'Dad', text: 'Okay, boys. If there\'s a fire, where do we go?', voice: 'dad', tape: true },
      { who: 'Noah', text: 'Front door. Not the back, the back door sticks.', voice: 'noah', tape: true },
      { who: 'Dad', text: 'And who wakes up your Kuya?', voice: 'dad', tape: true },
      { who: 'Noah', text: 'Me. Because he sleeps like a rock.', voice: 'noah', tape: true },
      { who: 'Elias', text: '(from far away) I can hear you!', voice: 'elias', tape: true },
    ],
  },
  tape_3: {
    id: 'tape_3',
    name: 'Tape — "DON\'T"',
    type: 'tape',
    chapter: 4,
    important: true,
    tint: '#8d4a3c',
    description: 'Label scratched out. Underneath: "JULY 14 — 9:10 PM"',
    tape: [
      { who: 'Noah', text: 'You said you\'d take me with you to Manila one day.', voice: 'noah', tape: true },
      { who: 'Elias', text: 'I said a lot of things, Noah. Get out of my room.', voice: 'elias', tape: true },
      { who: 'Noah', text: 'Kuya—', voice: 'noah', tape: true },
      { who: 'Elias', text: 'Leave me alone! I\'m leaving and I\'m not coming back!', voice: 'elias', tape: true },
      { who: '', text: '(a door slams)', voice: 'none', tape: true, dur: 2 },
      { who: 'Noah', text: '...sorry, Kuya.', voice: 'noah', tape: true, faint: true },
    ],
  },
  tape_4: {
    id: 'tape_4',
    name: 'Tape — "SORRY"',
    type: 'tape',
    chapter: 4,
    important: true,
    tint: '#8d4a3c',
    description: 'Label: "JULY 14 — 10:40 PM"',
    tape: [
      { who: '', text: '(knocking on a door)', voice: 'none', tape: true, dur: 2 },
      { who: 'Noah', text: 'Kuya? Can I come in? ...You have your headphones on, huh.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Okay. I\'ll leave the recorder here by your door. Goodnight, Kuya.', voice: 'noah', tape: true },
      { who: '', text: '(rain. a long silence. the tape keeps running.)', voice: 'none', tape: true, dur: 3 },
    ],
  },
  tape_5: {
    id: 'tape_5',
    name: 'Tape — (no label)',
    type: 'tape',
    chapter: 4,
    important: true,
    tint: '#3a2a26',
    description: 'No label. The shell is blackened with soot. Counter stopped at 11:52.',
    tape: [
      { who: '', text: '(rain... a crackle that grows louder... a smoke alarm)', voice: 'none', tape: true, dur: 3.2 },
      { who: 'Noah', text: 'KUYA! GISING! May sunog! Kuya, wake up!', voice: 'noah', tape: true },
      { who: 'Elias', text: '(coughing) Noah—? What—', voice: 'elias', tape: true },
      { who: 'Noah', text: 'Hawakan mo kamay ko. Don\'t look, just walk.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Sa likod mo lang ako, Kuya. I\'m right behind you.', voice: 'noah', tape: true },
      { who: '', text: '(the tape warps into a long, melting tone)', voice: 'none', tape: true, dur: 3 },
    ],
  },
  clue_mom_letter: {
    id: 'clue_mom_letter',
    name: 'Unsent Letter — Mom',
    type: 'clue',
    chapter: 4,
    optionalClue: true,
    tint: '#c9b8a0',
    description: 'A handwritten letter in an envelope addressed to Elias. Never sealed. Never sent.',
    text:
      'Anak,\n\nEvery Christmas you say the same thing: that Noah called you and you walked away. You say it like a prayer you hate.\n\nThe firemen found you at the door with burns across your back, in the shape of two small hands. Someone pushed you out, Elias.\n\nOne day I will be brave enough to tell you what your brother did. Until then I will keep his tapes in the basement, where your father keeps everything he cannot look at.\n\n— Mama',
  },
  tape_hidden_c: {
    id: 'tape_hidden_c',
    name: 'Hidden Tape — "Behind the Boxes"',
    type: 'tape',
    chapter: 4,
    hiddenTape: true,
    tint: '#b04848',
    description: 'Taped to the back of a shelf. Labelled "C — LAST PART (finish this before you leave)".',
    tape: [
      { who: 'Noah', text: 'Last part. Recording on July 14, really late. It\'s storming.', voice: 'noah', tape: true },
      { who: 'Noah', text: '"...so go to Manila. Don\'t feel bad about leaving."', voice: 'noah', tape: true },
      { who: 'Noah', text: '"...wherever you go, I\'ll be right behind you."', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Hmm. The pieces are out of order. I\'ll fix it tomorrow.', voice: 'noah', tape: true },
    ],
  },

  // ───────────────────────── CHAPTER 6 ─────────────────────────
  final_tape: {
    id: 'final_tape',
    name: 'The Last Recording',
    type: 'tape',
    chapter: 6,
    important: true,
    tint: '#d6c39a',
    description:
      'A tape spliced together from dozens of fragments. Pieces of every recording, joined with clear tape. Someone made this out of him.',
    tape: [
      { who: 'Voice', text: '(the tape is silent until you choose to play it)', voice: 'none', faint: true },
    ],
  },
};

export const OPTIONAL_CLUES = Object.values(ITEMS)
  .filter((i) => i.optionalClue)
  .map((i) => i.id);
export const HIDDEN_TAPES = Object.values(ITEMS)
  .filter((i) => i.hiddenTape)
  .map((i) => i.id);
export const IMPORTANT_EVIDENCE = [
  'voicemail',
  'photo_porch',
  'diary_page',
  'tape_1',
  'tape_2',
  'tape_3',
  'tape_4',
  'tape_5',
  'newspaper',
];

export function getItem(id: string): ItemDef {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown item ${id}`);
  return it;
}

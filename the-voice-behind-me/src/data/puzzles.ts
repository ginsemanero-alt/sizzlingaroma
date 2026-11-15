export type PuzzleId = 'photos' | 'diary' | 'mirror_lock' | 'basement_lock' | 'cassettes' | 'timeline' | 'splice';

export interface OrderCard {
  id: string;
  label: string;
  detail?: string;
}

export interface OrderPuzzleDef {
  kind: 'order';
  id: PuzzleId;
  title: string;
  instructions: string;
  cards: OrderCard[];
  slots: number;
  /** returns true when the ordering (ids, one per slot) is correct */
  check: (order: string[]) => boolean;
  hint: string;
  solvedText: string;
}

export interface DialPuzzleDef {
  kind: 'dial';
  id: PuzzleId;
  title: string;
  instructions: string;
  symbols: string[];
  length: number;
  answer: string;
  hint: string;
  solvedText: string;
}

export type PuzzleDef = OrderPuzzleDef | DialPuzzleDef;

const exact = (answer: string[]) => (order: string[]) =>
  order.length === answer.length && order.every((v, i) => v === answer[i]);

export const PUZZLES: Record<PuzzleId, PuzzleDef> = {
  photos: {
    kind: 'order',
    id: 'photos',
    title: "Noah's Corkboard",
    instructions:
      'Four empty pins, four pale rectangles where photographs used to hang. Pin them back in the order they were taken. (Inspect the backs of the photos in your inventory.)',
    cards: [
      { id: 'photo_graduation', label: 'Graduation', detail: 'A boy in a white barong, paper medal' },
      { id: 'photo_beach', label: 'Beach', detail: 'Two small boys at the sea' },
      { id: 'photo_recorder', label: 'Birthday', detail: 'Fifteen candles, red recorder' },
      { id: 'photo_bike', label: 'Bicycle', detail: 'A boy on a too-big bike' },
    ],
    slots: 4,
    check: exact(['photo_beach', 'photo_bike', 'photo_graduation', 'photo_recorder']),
    hint: 'Noah\'s age is written on the back of every photograph.',
    solvedText:
      'Six. Nine. Twelve. Fifteen.\nIn every photograph, Noah is a step behind his brother. Not lagging. Watching.',
  },
  diary: {
    kind: 'order',
    id: 'diary',
    title: 'The Torn Page',
    instructions: 'Four strips of a torn diary page. Lay them out so the sentences run on.',
    cards: [
      { id: 'c', label: '"...the flashlight by my bed, because Kuya sleeps like a rock and someone has to wake him"' },
      { id: 'a', label: '"July 13. Kuya says he\'s leaving for Manila after the storm. I said things I didn\'t"' },
      { id: 'd', label: '"up. That\'s my job. Little brothers walk behind, so they can catch you."' },
      { id: 'b', label: '"mean. Tomorrow I\'ll say sorry, even if he doesn\'t open the door. If the brownout comes again I\'ll keep"' },
    ],
    slots: 4,
    check: exact(['a', 'b', 'c', 'd']),
    hint: 'Every strip ends mid-sentence. The date comes first.',
    solvedText: 'Someone has to wake him up.\nThat\'s my job.',
  },
  mirror_lock: {
    kind: 'dial',
    id: 'mirror_lock',
    title: 'Letter Lock — Stairwell Door',
    instructions:
      'A five-letter combination lock, the kind from a school locker. Noah\'s markings are numbered with tally marks.',
    symbols: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    length: 5,
    answer: 'LIKOD',
    hint: 'Collect the five mirrored markings. The tallies give the order.',
    solvedText: 'L-I-K-O-D.\nLikod. Behind.',
  },
  basement_lock: {
    kind: 'dial',
    id: 'basement_lock',
    title: 'Padlock — Archive Door',
    instructions: 'A rusted four-digit padlock. Dad\'s note: "same four numbers as the worst night. Month, then day."',
    symbols: '0123456789'.split(''),
    length: 4,
    answer: '0714',
    hint: 'The newspaper clipping names the night of the fire.',
    solvedText: 'Zero, seven, one, four. The lock gives with a sound like a bone.',
  },
  cassettes: {
    kind: 'order',
    id: 'cassettes',
    title: 'Reconstruct the Timeline',
    instructions:
      'Dad\'s tape deck has five slots, numbered in marker. Load the recordings in the order they were made. (Play them from your inventory to hear their dates.)',
    cards: [
      { id: 'tape_3', label: 'Tape "DON\'T"', detail: 'scratched-out label' },
      { id: 'tape_5', label: 'Tape (no label)', detail: 'soot-blackened shell' },
      { id: 'tape_1', label: 'Tape "HAPPY BDAY"' },
      { id: 'tape_4', label: 'Tape "SORRY"' },
      { id: 'tape_2', label: 'Tape "FIRE DRILL"' },
    ],
    slots: 5,
    check: exact(['tape_1', 'tape_2', 'tape_3', 'tape_4', 'tape_5']),
    hint: 'March, May, then three tapes from July 14. The unlabeled tape stopped at 11:52.',
    solvedText: 'March 9. May 2. July 14 — 9:10 PM. 10:40 PM. 11:52 PM.\nThe last one is the night of the fire. Noah is the one shouting.',
  },
  timeline: {
    kind: 'order',
    id: 'timeline',
    title: 'The Night We Lost',
    instructions:
      'Seven memories belong to that night. One of them is a lie you told yourself for seven years. Place the true seven in order. Leave the lie out.',
    cards: [
      { id: 'pushed', label: 'Noah found me in the smoke and pushed me out the door.' },
      { id: 'argue', label: 'We argued. I told him I was never coming back.' },
      { id: 'false', label: 'Noah called for help. I heard him and I walked away.' },
      { id: 'woke', label: 'Noah woke me up. "Kuya, gising! May sunog!"' },
      { id: 'never', label: 'Noah never came out.' },
      { id: 'knock', label: 'Noah knocked on my door to say sorry. I had my headphones on.' },
      { id: 'back', label: 'Outside, I couldn\'t see him. I ran back in to find him.' },
      { id: 'led', label: 'He held my hand and led me down the stairs, walking behind me.' },
    ],
    slots: 7,
    check: exact(['argue', 'knock', 'woke', 'led', 'back', 'pushed', 'never']),
    hint: 'The tapes, the diary and the clipping all tell the same story. The lie is the only memory with no evidence.',
    solvedText:
      'He didn\'t call for help.\nHe called for me.\nAnd when I ran back into the fire, he followed me in.',
  },
  splice: {
    kind: 'order',
    id: 'splice',
    title: "Noah's Last Tape",
    instructions:
      'Six fragments from the three hidden tapes. Noah said the pieces were out of order. Splice them into one message.',
    cards: [
      { id: 'c2', label: '"...wherever you go, I\'ll be right behind you."' },
      { id: 'a1', label: '"I know you think I\'m annoying..."' },
      { id: 'b2', label: '"...and I\'m not mad. I was never mad."' },
      { id: 'c1', label: '"...so go to Manila. Don\'t feel bad about leaving."' },
      { id: 'a2', label: '"...but I\'m proud of you."' },
      { id: 'b1', label: '"I heard what you said about leaving and never coming back..."' },
    ],
    slots: 6,
    check: (o) => {
      if (o.length !== 6) return false;
      const pairs = [o.slice(0, 2).join(), o.slice(2, 4).join(), o.slice(4, 6).join()];
      const okPairs = ['a1,a2', 'b1,b2', 'c1,c2'];
      if (!pairs.every((p) => okPairs.includes(p))) return false;
      // "...so go to Manila" must follow the reassurance; the goodbye comes last.
      return pairs[2] === 'c1,c2';
    },
    hint: 'Each fragment that starts with "..." continues the one before it. The goodbye comes last.',
    solvedText: 'The pieces click into place. The recorder\'s red light comes on by itself.',
  },
};

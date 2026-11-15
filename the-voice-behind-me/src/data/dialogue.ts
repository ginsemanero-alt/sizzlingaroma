import type { Line } from './types';

const E = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'Elias', text, voice: 'elias', ...extra });
const N = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'Noah', text, voice: 'noah', ...extra });
const F = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'The Figure', text, voice: 'figure', ...extra });
const W = (text: string, extra: Partial<Line> = {}): Line => ({ who: 'Voice', text, voice: 'whisper', faint: true, ...extra });
const FX = (text: string, dur = 2.4): Line => ({ who: '', text, voice: 'none', faint: true, dur });

export const DIALOGUE = {
  // ───────── Chapter 1 ─────────
  c1_intro: [
    FX('(a phone buzzes in a jacket pocket)'),
    E('Seven years. I swore I\'d never come back here.'),
    E('Unknown number. One voicemail. It sounded like him.'),
    E('The machine in the house still has a copy. I need to hear it again. Properly.'),
  ],
  c1_intro_loop: [
    FX('(a phone buzzes in a jacket pocket)'),
    E('...I\'ve been here before. Haven\'t I?'),
    E('The rain. The gate. The light upstairs. I know what happens next.'),
    E('Then why do I keep coming back?'),
  ],
  c1_upstairs_light: [E('...The light upstairs. That\'s Noah\'s window.'), E('There\'s been no power here for years.')],
  c1_window_shadow: [FX('(something moves behind the glass)'), E('Someone\'s in there.')],
  c1_door_locked_dark: [E('It\'s too dark to find anything. The fuse box should be in the kitchen.')],
  c1_enter: [E('Smells like wet ash. Still.'), E('Electricity first. The fuse box is in the kitchen, by the back door.')],
  c1_power_on: [E('...It works. How does it still work?')],
  c1_machine_blink: [E('The answering machine is blinking.')],
  c1_after_voicemail: [
    E('"Don\'t believe the person behind you."'),
    E('Noah used to say that when we watched horror movies. Then he\'d grab my shoulder from behind.'),
  ],
  c1_after_voicemail_loop: [
    E('"Don\'t believe the person behind you."'),
    E('I heard it last time too. I heard it and I didn\'t listen.'),
  ],
  c1_footsteps_above: [FX('(footsteps cross the ceiling, slowly, toward the stairs)', 3), E('...Hello?')],
  c1_photo_fall: [FX('(a frame falls in the living room)', 2)],
  c1_photo_look: [E('The porch. He always stood behind me in pictures. I used to think it was to make himself look taller.')],
  c1_photo_away: [E('Not yet. I can\'t look at his face yet.')],
  c1_closet_open: [FX('(a door creaks open, slowly, by itself)', 3)],
  c1_key: [E('Noah\'s room. Mom locked it after the funeral.'), E('Upstairs. Of course it\'s upstairs.')],
  c1_stairs_locked: [E('Not yet. I\'m not going up there with nothing.')],
  c1_kitchen_figure: [FX('(a pale shape passes behind the kitchen window)', 2.4)],

  // ───────── Chapter 2 ─────────
  c2_intro: [E('The second floor. Our rooms.'), E('His door is at the end. I can still hear him behind it, shouting for me.')],
  c2_door_open: [E('Everything is exactly where he left it.')],
  c2_whisper: [W('Kuya...', { dur: 2.2 })],
  c2_toys: [E('...Wasn\'t that facing the bed a second ago?')],
  c2_music_box: [FX('(a music box begins to play by itself)', 3)],
  c2_music_box_listen: [E('He hid something in here. He was always hiding things for me to find.')],
  c2_music_box_close: [E('I closed it. I don\'t want to hear that song.')],
  c2_silhouette: [E('Noah...?'), FX('(it is gone before he can take a step)', 2.4)],
  c2_diary: [E('His diary. The last page is torn out — no. The strips are in the back.')],
  c2_diary_done: [E('"Someone has to wake him up."'), E('...Why would he write that?')],
  c2_corkboard_need: [E('There are four empty pins. The photographs were taken down.')],
  c2_memory_done: [
    E('Every picture. He\'s behind me in every picture.'),
    W('Kuya... dito...', { dur: 2.4 }),
    E('The voice — it came from the hallway.'),
  ],

  // ───────── Chapter 3 ─────────
  c3_intro: [
    FX('(footsteps somewhere ahead. Unhurried.)', 3),
    E('This hallway was never this long.'),
  ],
  c3_footsteps_end: [E('They stopped at the mirror room. Mom\'s old sewing room.')],
  c3_door_slam: [FX('(the door slams shut behind him)', 2)],
  c3_mirror1: [E('My reflection is... late. Like it\'s deciding whether to copy me.')],
  c3_mirror2: [E('There\'s someone behind me in the mirror.'), E('...There\'s no one behind me.')],
  c3_mirror3: [E('There are letters on the wall behind me. Backwards. You can only read them in the glass.')],
  c3_marking_hint: [E('Noah scratched these. Mirror writing — he learned it from a Da Vinci book. Five of them, numbered.')],
  c3_steps_behind: [FX('(footsteps approach from behind. They stop when he stops.)', 3.4)],
  c3_figure_stand: [E('...'), F('You remember it wrong on purpose, you know.', { faint: true })],
  c3_unlock: [E('The stairwell. I can get down to the basement from there.'), FX('(every light on the floor goes out at once)', 2.4)],
  c3_chase: [F('Don\'t go down there.'), E('Run. RUN.')],
  c3_caught: [F('You always come back to this part.', { faint: true }), FX('(the memory resets)', 2)],
  c3_escaped: [E('(breathing hard) It stopped. At the top of the stairs. Like it isn\'t allowed down here.')],

  // ───────── Chapter 4 ─────────
  c4_intro: [
    E('The basement. Dad\'s "office". Mom said he kept everything down here.'),
    E('If there are recordings, they\'re here.'),
  ],
  c4_player: [E('Noah\'s recorder. The one I gave him. It\'s half melted.'), E('It still works.')],
  c4_speaker: [W('...he\'s in the basement now. He found the recorder...', { dur: 3.4 }), E('That speaker isn\'t connected to anything.')],
  c4_drawer_voice: [
    { who: 'Recorder', text: '"...now he opens the drawer. He always opens the drawer..."', voice: 'whisper', tape: true, faint: true, dur: 3.6 },
    E('That\'s— that\'s me. It\'s describing me.'),
  ],
  c4_archive_locked: [E('Padlocked. Four digits.')],
  c4_lights_out: [FX('(the basement lights die with a sound like a sigh)', 2.6), E('Flashlight. Flashlight.')],
  c4_tape3_skip: [E('I know what\'s on that one. I don\'t need to hear us fight again.')],
  c4_timeline_done: [E('Eleven fifty-two.'), E('That\'s Noah\'s voice. Shouting for me to wake up.')],
  c4_conflict: [
    E('No. No, that\'s not— He called for help. I heard him calling and I walked away.'),
    E('That\'s what happened. That\'s what I\'ve always—'),
    F('Then why does the tape remember it differently?'),
  ],

  // ───────── Chapter 5 ─────────
  c5_false_intro: [
    FX('JULY 14. 11:50 PM. HOW ELIAS REMEMBERS IT.', 3.6),
    N('Kuya! Kuya, help me! Tulungan mo ako!'),
    E('(He\'s just being dramatic. He\'s always dramatic.)'),
  ],
  c5_false_door: [E('(I don\'t open it. I never open it.)')],
  c5_false_calls: [N('KUYA!'), E('(I walk away. That\'s what I did. Isn\'t it?)')],
  c5_false_exit: [
    F('This is how you remember it.'),
    F('Smoke doesn\'t come from the front door, Elias. Look at the tape counter. Look at your back.'),
    F('Remember it again.'),
  ],
  c5_true_intro: [
    FX('JULY 14. 11:52 PM. HOW IT HAPPENED.', 3.6),
    N('KUYA! GISING! May sunog! Kuya, wake up!'),
    E('(coughing) Noah—? What—'),
    N('Hawakan mo kamay ko. Don\'t look at the fire. Just follow my voice.'),
  ],
  c5_follow_1: [N('This way! Stay low, Kuya!')],
  c5_follow_2: [N('Stairs! Hold the railing, I\'m right behind you!')],
  c5_follow_3: [N('Front door! Not the back, the back sticks! GO!')],
  c5_outside: [
    E('(coughing) Noah? NOAH!'),
    E('Where is he? He was right behind me— he must still be inside—'),
    W('Kuya, nandito ako— nasa likod mo ako—', { dur: 3.2 }),
    E('I have to go back in. I have to get him.'),
  ],
  c5_back_inside: [
    E('NOAH! WHERE ARE YOU?!'),
    FX('(the ceiling groans)', 2),
    N('KUYA! Behind you! Nandito ako sa likod mo!', { dur: 3.4 }),
  ],
  c5_push: [
    N('Ano ba, Kuya! LUMABAS KA!'),
    FX('(two small hands, hard against his back)', 2.6),
  ],
  c5_collapse: [
    FX('(the hallway ceiling comes down between them)', 2.6),
    N('Sa likod mo lang ako, Kuya. Lagi.', { dur: 3.6 }),
    FX('(I\'m right behind you, Kuya. Always.)', 3),
  ],
  c5_after: [
    E('He got me out.'),
    E('He got me out, and I went back in, and he came in after me.'),
    E('He didn\'t call me for help. He called me so I\'d follow him.'),
  ],

  // ───────── Chapter 6 ─────────
  c6_intro: [
    E('This isn\'t the house anymore.'),
    FX('(footsteps behind him, perfectly in step with his own)', 3.2),
  ],
  c6_loop1: [E('...This is the same hallway. The same crack. The same door.'), W('stop running...', { dur: 2.4 })],
  c6_loop2: [F('Keep walking. You\'re good at walking away.', { faint: true })],
  c6_loop3: [E('It doesn\'t end. It doesn\'t END.'), W('Kuya... lumingon ka... (turn around)', { dur: 3 })],
  c6_faced: [
    E('...I stopped. It stopped.'),
    F('You turned around. You never turn around.'),
    E('Because last time I turned around, I ran back into a fire.'),
  ],
  c6_confront_intro: [
    F('Look at me, Elias.'),
    E('You\'re— you have my jacket. My face.'),
    F('I am the one who remembers. I am the one who keeps you safe from the worst part.'),
    F('He called for help and you walked away. Say it with me. Say it like every night.'),
  ],
  c6_confront_tape5: [E('He didn\'t call for help. He called for me to wake up. It\'s on the tape.'), F('Tapes warp. Memories warp.')],
  c6_confront_diary: [E('"Someone has to wake him up. That\'s my job." He wrote it the night before.'), F('Children write all sorts of things.')],
  c6_confront_letter: [E('Mom said I had burns on my back. Like two small hands.'), F('...')],
  c6_confront_agree: [E('...He called for help. And I walked away.'), F('Good. Good. That one doesn\'t hurt as much, does it?')],
  c6_confront_end: [
    F('If he saved you, then he died because of you. Isn\'t it easier if you just left him?'),
    E('...It is easier.'),
    E('It\'s not true.'),
    F('The last tape is in the room ahead. Play it, and you lose me. Destroy it, and we go back to the start. Together.'),
  ],
  c6_chamber: [E('The last recording. Spliced together from all of them.'), E('First — I need to remember it right. In order. Without the lie.')],
  c6_timeline_done: [E('All of it. In order. Without the lie.')],
  c6_secret_found: [E('Three little tapes. A, B, C. "Finish this before you leave."'), E('He made me something. He made me something and I never heard it.')],
  c6_secret_missing: [E('There\'s an empty slot in the deck, marked "FOR KUYA". Something is missing.')],
  c6_decide: [F('Choose, Elias.')],
} satisfies Record<string, Line[]>;

export type DialogueKey = keyof typeof DIALOGUE;

import type { DialogueLine } from '@/types';

/** Scripted dialogue for every chapter. Filipino lines carry `fil` (original) and `en` (translation). */
export const DIALOGUE = {
  c1: {
    intro: [
      { s: 'narrator', en: 'Bubog National High School. Closed since 2018.' },
      { s: 'alex', en: 'Ten years. I said I would never come back here.' },
      { s: 'alex', en: 'Room 13... I never even had class in Room 13. I transferred before — before all that happened.' },
    ],
    gate: [{ s: 'alex', en: 'Not even locked. Just rusted shut.' }],
    bell: [{ s: 'alex', en: 'The bell? There hasn\'t been power here in years...' }],
    shadow: [{ s: 'alex', en: 'Someone\'s up there. Second floor.' }],
    inside: [
      { s: 'alex', en: 'Hello? ...Anyone?' },
      { s: 'alex', en: 'I need light. The guard station was by the west stairs — the breaker panel should be there.' },
    ],
    upstairs: [{ s: 'alex', en: 'Footsteps. Upstairs. The second floor has been sealed since the fire.' }],
    power: [{ s: 'alex', en: 'Power\'s back. Some of it.' }],
    room13Light: [{ s: 'alex', en: 'Room 13. The light just came on by itself.' }],
    rollIntro: [
      { s: 'reyes', en: 'Good evening, class.', fil: 'Magandang gabi, klase.', lang: 'fil', d: 3000 },
      { s: 'reyes', en: 'Let us begin the attendance.', fil: 'Simulan natin ang attendance.', lang: 'fil', d: 3200 },
    ],
    rollOneMore: [{ s: 'reyes', en: '...One more.', fil: '...Isa pa.', lang: 'fil', d: 3200 }],
    rollMissing: [{ s: 'reyes', en: 'You are the one missing from the attendance.', fil: 'Ikaw ang kulang sa attendance.', lang: 'fil', d: 4200 }],
    afterRoll: [
      { s: 'alex', en: 'Missing? I\'m not on your list. I was never — I transferred. I transferred before the fire.' },
      { s: 'alex', en: 'The teacher\'s desk. The drawer is open.' },
    ],
    foundId: [
      { s: 'alex', en: 'This is mine. My ID. "Class monitor." School year 2017 to 2018 — valid until March 31.' },
      { s: 'alex', en: 'But I left in February. I\'m sure I did.' },
      { s: 'alex', en: 'There\'s a key with it. Wing B — the classrooms.' },
    ],
    wingLocked: [{ s: 'alex', en: 'Wing B. It\'s locked. There has to be a key somewhere.' }],
    girl: [{ s: 'alex', en: 'A girl...? She was pointing at something.' }],
  },
  c2: {
    intro: [
      { s: 'alex', en: 'The classroom wing. Lockers... they never emptied the lockers.' },
      { s: 'alex', en: 'If they were missing, someone should have come for their things.' },
    ],
    lockers: [{ s: 'alex', en: 'Hannah. Carlo. Katrina. Joshua. I remember their faces. I don\'t remember why I remember them.' }],
    whisper: [{ s: 'student', en: 'Jasmine...', fil: 'Jasmine...', d: 2200 }],
    ghosts: [{ s: 'alex', en: 'They\'re... sitting at their desks. Like they\'re waiting for class.' }],
    photos: [{ s: 'alex', en: 'The faculty photo board. The name labels have all been torn off.' }],
    identified: [
      { s: 'alex', en: 'Hannah Lim. Carlo Mendoza. Katrina Flores. Joshua Ramos. Grade 12 — Sampaguita.' },
      { s: 'alex', en: 'That was... my section. Wasn\'t it?' },
    ],
    teacherHall: [{ s: 'alex', en: '...She\'s here. At the end of the hall.' }],
    teacherWarn: [{ s: 'alex', en: 'She\'s looking for me. Keep quiet. Hide if she comes close.' }],
    seatingSolved: [
      { s: 'alex', en: 'Seat three. In front of Daniel. ...That was my seat.' },
      { s: 'alex', en: 'Daniel\'s drawer just slid open.' },
    ],
    diary: [{ s: 'alex', en: 'Daniel\'s diary. He wrote about me. About the lab. About a girl named Mara.' }],
    exit: [{ s: 'alex', en: 'The records wing. If anything about that night still exists, it\'s in there.' }],
  },
  c3: {
    intro: [
      { s: 'alex', en: 'Library. Computer room. Records.' },
      { s: 'alex', en: 'Somebody wrote a report about that night. I want to read it.' },
    ],
    books: [{ s: 'alex', en: 'Just books. Just old books falling.' }],
    pcOn: [{ s: 'alex', en: 'The computer turned on. There\'s no power in this room.' }],
    printer: [{ s: 'alex', en: 'The printer... it\'s printing something. An attendance sheet. March 9, 2018.' }],
    report: [{ s: 'alex', en: '"The students did not attend." But the attendance sheet says they all signed in.' }],
    reconstructed: [
      { s: 'alex', en: 'Twelve students signed in that night. Eleven of them never came home.' },
      { s: 'alex', en: 'And the twelfth name is mine.' },
    ],
    file: [
      { s: 'alex', en: 'Transferred out, February 2018. Entered March 12. Three days after the fire.' },
      { s: 'alex', en: 'Somebody decided I was never here.' },
    ],
    archiveOpen: [{ s: 'alex', en: 'Seven thirty-eight. Every clock in this school stopped at 7:38.' }],
    teacherDoor: [
      { s: 'reyes', en: 'You are starting to remember.', fil: 'Nagsisimula ka nang makaalala.', lang: 'fil', d: 3600 },
    ],
  },
  c4: {
    intro: [
      { s: 'narrator', en: 'March 9, 2018. 7:38 PM.' },
      { s: 'alex', en: 'This is... that night. The smoke. The bell. I was here.' },
      { s: 'alex', en: 'Daniel went to the lab for his reviewer. And I went after him.' },
    ],
    smoke: [{ s: 'alex', en: 'Too much smoke — stay low.' }],
    source: [{ s: 'alex', en: 'The extension cord under the fume hood. "Reported three times." Undetermined, they said.' }],
    voices: [{ s: 'reyes', en: 'Everyone, stay together! Hold the hand of the person beside you!', fil: 'Lahat, magkakasama tayo! Hawakan ang kamay ng katabi niyo!', lang: 'fil' }],
    stairsBlocked: [{ s: 'alex', en: 'The main stairs are full of smoke. She couldn\'t take them this way.' }],
    evacSolved: [{ s: 'alex', en: 'Room 13. The stairs. The east hall. The east exit. She took them to the east exit.' }],
    chained: [
      { s: 'alex', en: 'Chained. From the inside. "By order of the Principal."' },
      { s: 'alex', en: 'They were right here. Behind this door. And the report said they never came.' },
    ],
  },
  c5: {
    intro: [
      { s: 'alex', en: 'The principal\'s office. Mr. Villanueva.' },
      { s: 'alex', en: 'He signed the report. He would have kept everything.' },
    ],
    mirror: [{ s: 'alex', en: 'That\'s not... I\'m eighteen. I\'m —' }, { s: 'alex', en: 'Ten years. It\'s been ten years.' }],
    shelf: [{ s: 'alex', en: 'There\'s a draft coming from behind this bookshelf.' }],
    altered: [{ s: 'alex', en: 'Correction fluid. Every check mark painted over. "ABSENT." My name scratched out.' }],
    reyesPurpose: [
      { s: 'reyes', en: 'I am not keeping you here, Jasmine.', fil: 'Hindi kita ikinukulong, Jasmine.', lang: 'fil', d: 3800 },
      { s: 'reyes', en: 'I am only asking you to remember.', fil: 'Pinapaalala ko lang.', lang: 'fil', d: 3600 },
      { s: 'reyes', en: 'You were the class monitor. You are the only one who can answer for us.', fil: 'Ikaw ang class monitor. Ikaw lang ang makakasagot para sa amin.', lang: 'fil', d: 5200 },
      { s: 'reyes', en: 'Come back to Room 13. It is time for the last attendance.', fil: 'Bumalik ka sa Room 13. Oras na ng huling attendance.', lang: 'fil', d: 4800 },
    ],
  },
  c6: {
    intro: [
      { s: 'alex', en: 'The school is... wrong. The walls are breathing.' },
      { s: 'alex', en: 'Room 13 is at the end of this hall. The gate behind me is open.' },
    ],
    leaveConfirm: [{ s: 'alex', en: 'I could just leave. Drive home. Forget again.' }],
    enter: [{ s: 'reyes', en: 'Sit down, class. We are almost complete.', fil: 'Umupo na kayo. Halos kumpleto na tayo.', lang: 'fil', d: 3800 }],
    roll: [{ s: 'reyes', en: 'The attendance book is on my desk, Jasmine. Bring it to me.', fil: 'Nasa mesa ko ang attendance book, Jasmine. Dalhin mo sa akin.', lang: 'fil', d: 4400 }],
    q1: { s: 'reyes', en: 'Where were you when the fire started?', fil: 'Nasaan ka nang magsimula ang sunog?', lang: 'fil' } as DialogueLine,
    q2: { s: 'reyes', en: 'Why did you leave Room 13?', fil: 'Bakit ka umalis sa Room 13?', lang: 'fil' } as DialogueLine,
    q3: { s: 'reyes', en: 'What happened to Daniel?', fil: 'Ano ang nangyari kay Daniel?', lang: 'fil' } as DialogueLine,
    finalName: { s: 'reyes', en: 'Jasmine?', d: 3200 } as DialogueLine,
  },
} satisfies Record<string, Record<string, DialogueLine[] | DialogueLine>>;

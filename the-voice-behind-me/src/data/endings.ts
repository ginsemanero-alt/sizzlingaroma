import type { EndingDef, EndingId } from './types';

export const ENDINGS: Record<EndingId, EndingDef> = {
  A: {
    id: 'A',
    title: 'Ending A',
    name: 'Acceptance',
    requirement: 'Collect the important evidence, reconstruct the memory, and accept the truth.',
    lines: [
      { who: 'Elias', text: 'He woke me up. He held my hand. He walked behind me so I wouldn\'t fall.', voice: 'elias' },
      { who: 'Elias', text: 'And when I ran back in for him, he came back for me.', voice: 'elias' },
      { who: 'Elias', text: 'I didn\'t leave you, Noah. You didn\'t let me.', voice: 'elias' },
      { who: 'Noah', text: 'Kuya, hindi mo kasalanan na nakaligtas ka.', voice: 'noah', tape: true, dur: 4.5 },
      { who: 'Noah', text: 'Sana mabuhay ka para sa ating dalawa.', voice: 'noah', tape: true, dur: 4.5 },
      { who: '', text: '(Kuya, it\'s not your fault that you survived. I hope you live — for the both of us.)', voice: 'none', faint: true, dur: 5.5 },
    ],
    epilogue: [
      'The Figure Behind does not follow him out.',
      'Elias leaves the house at sunrise.',
      'For the first time in seven years, he does not look over his shoulder.',
      'He knows who is there.',
    ],
  },
  B: {
    id: 'B',
    title: 'Ending B',
    name: 'Denial',
    requirement: 'Reject the evidence and destroy the final recording.',
    lines: [
      { who: 'Elias', text: 'No. I know what I heard. He called for me and I walked away.', voice: 'elias' },
      { who: 'The Figure', text: 'That\'s right. That\'s how it goes. Again.', voice: 'figure' },
      { who: '', text: '(the tape snaps. the reels keep turning.)', voice: 'none', dur: 3 },
    ],
    epilogue: [
      'Rain on a dark road.',
      'A phone buzzing in a jacket pocket.',
      'You have one new message.',
      'You already know what it says.',
    ],
  },
  C: {
    id: 'C',
    title: 'Ending C',
    name: 'The Figure',
    requirement: 'Avoid the memories. Keep running from what follows you.',
    lines: [
      { who: 'Elias', text: 'There\'s no end to it. There\'s no door.', voice: 'elias' },
      { who: 'The Figure', text: 'There was a door. You walked through it once. You keep walking back.', voice: 'figure' },
      { who: 'The Figure', text: 'Stay. I\'ll remember it for you. The way you like it.', voice: 'figure' },
    ],
    epilogue: [
      'The hallway grows one door longer every night.',
      'Elias is still walking it.',
      'Something stands behind him, wearing his face.',
    ],
  },
  D: {
    id: 'D',
    title: 'Ending D',
    name: 'The Last Recording',
    requirement: 'Find every hidden recording and every clue, then complete Noah\'s tape.',
    lines: [
      { who: 'Noah', text: 'Kuya. I heard what you said about leaving and never coming back.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'And I\'m not mad. I was never mad.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'I know you think I\'m annoying. But I\'m proud of you.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'So go to Manila. Don\'t feel bad about leaving.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'Wherever you go, I\'ll be right behind you.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'It\'s eleven-thirty. The lights went out again. I\'ll put this under your door before I sleep.', voice: 'noah', tape: true },
      { who: 'Noah', text: 'I forgive you for tonight, Kuya. I forgave you before you even said it.', voice: 'noah', tape: true, dur: 5 },
      { who: 'Recorder', text: '(click. July 14 — 11:31 PM. Twenty-one minutes before the fire.)', voice: 'none', faint: true, dur: 5 },
    ],
    epilogue: [
      'The tape was under his door the whole time.',
      'It melted into the carpet, and Elias never heard it.',
      'He hears it now. All of it, in the right order.',
      'Noah forgave him before the fire. Before he even knew there was anything to forgive.',
      'Elias rewinds the tape. Plays it again. And again. And then, finally, he lets it end.',
    ],
  },
};

import type { DialogueLine, EndingId } from '@/types';

export interface EndingDef {
  id: EndingId;
  number: number;
  title: string;
  type: string;
  requirement: string;
  lines: DialogueLine[];
  epilogue: string[];
}

export const ENDINGS: Record<EndingId, EndingDef> = {
  present: {
    id: 'present', number: 1, title: 'PRESENT', type: 'True Ending',
    requirement: 'Collect the key evidence, reconstruct the timeline, restore the original record and answer the attendance truthfully.',
    lines: [
      { s: 'alex', en: 'I remember now. I was here. I left to find Daniel. I got out. They didn\'t.' },
      { s: 'reyes', en: 'Thank you, Alex. Now we are complete.', fil: 'Salamat, Alex. Ngayon, kumpleto na tayo.', lang: 'fil', d: 5200 },
      { s: 'daniel', en: 'Told you. You always take attendance too seriously.', fil: 'Sabi ko sa\'yo. Masyado mong sineseryoso ang attendance.', lang: 'fil' },
    ],
    epilogue: [
      'The restored attendance book was delivered to the Division Office the following Monday.',
      'The East Wing of San Aurelio High School was opened for the first time in ten years.',
      'Twelve names were read aloud at the memorial. Eleven students. One teacher.',
      'Alex Mercado answered for all of them.',
    ],
  },
  absent: {
    id: 'absent', number: 2, title: 'ABSENT', type: 'Ending',
    requirement: 'Leave the record as it is, or walk away from Room 13.',
    lines: [
      { s: 'alex', en: 'I transferred. I was never here. I was never here.' },
      { s: 'narrator', en: 'The next morning, the attendance book lies open on the teacher\'s desk.' },
      { s: 'reyes', en: 'Mercado, Alex.', fil: 'Mercado, Alex.', d: 3000 },
      { s: 'reyes', en: '...Absent.', fil: '...Absent.', d: 3200 },
    ],
    epilogue: [
      'Alex drove home before sunrise and did not look back.',
      'That night, and every night after, a new name appeared at the bottom of the attendance book.',
      'In Room 13, someone is still calling the roll.',
    ],
  },
  new_student: {
    id: 'new_student', number: 3, title: 'THE NEW STUDENT', type: 'Ending',
    requirement: 'Answer without remembering, choose wrongly, or be caught by the teacher.',
    lines: [
      { s: 'reyes', en: 'You still do not remember.', fil: 'Hindi mo pa rin naaalala.', lang: 'fil' },
      { s: 'reyes', en: 'Then you will stay until you do.', fil: 'Kung gayon, dito ka muna hanggang maalala mo.', lang: 'fil' },
      { s: 'reyes', en: 'Welcome to Sampaguita.', d: 3000 },
    ],
    epilogue: [
      'On the empty desk by the window lies a new student ID.',
      'MERCADO, ALEX R. — GRADE 12 – SAMPAGUITA.',
      'The photograph on it is you, tonight.',
      'Room 13 has twelve students again.',
    ],
  },
  unrecorded: {
    id: 'unrecorded', number: 4, title: 'THE UNRECORDED', type: 'Secret Ending',
    requirement: 'Find every optional record and hidden student clue, both sides of the confession, Daniel\'s final message, and solve the unrecorded timeline.',
    lines: [
      { s: 'reyes', en: 'There is one more name. It was never written. I am writing it now.', fil: 'May isa pang pangalan. Hindi ito kailanman naisulat. Isusulat ko na ngayon.', lang: 'fil' },
      { s: 'reyes', en: 'Dizon, Mara.', d: 3200 },
      { s: 'girl', en: 'Present, Ma\'am.', fil: 'Present po, Ma\'am.', lang: 'fil', d: 3600 },
      { s: 'girl', en: 'I was the one who sent the message. Thank you for coming back.', fil: 'Ako po ang nag-text. Salamat po sa pagbalik.', lang: 'fil' },
    ],
    epilogue: [
      'The recovered archive held thirteen boxes. Twelve students. One teacher. One of them had never existed on paper.',
      'Side B of the tape was played at the inquiry. The report had been rewritten deliberately, on instruction from above.',
      'Ricardo Villanueva was promoted in 2019. He signed the order to demolish San Aurelio High School in 2027.',
      'Demolition was scheduled for March 10, 2028 — the morning after you came back.',
      'The school\'s history was changed to protect the people responsible. Now it has a witness.',
    ],
  },
};

export const ENDING_ORDER: EndingId[] = ['present', 'absent', 'new_student', 'unrecorded'];

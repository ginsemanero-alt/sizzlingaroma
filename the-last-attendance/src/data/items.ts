import type { ItemDef } from '@/types';

/**
 * Every collectible in the game. Key evidence (key: true) is required for the true ending.
 * Secret entries (secret: 'record' | 'hidden') are required for the secret ending.
 *
 * Canon: The fire happened on Friday, March 9, 2018 during the evening review session of
 * Grade 12 – Sampaguita in Room 13. The game takes place on March 9, 2028, exactly ten years later.
 */
export const ITEMS: Record<string, ItemDef> = {
  // ───────────────────────── CHAPTER 1 ─────────────────────────
  flashlight: {
    id: 'flashlight', name: 'Old Flashlight', category: 'item', chapter: 1, model: 'flashlight', tool: true,
    description: 'A heavy metal flashlight. The batteries will not last forever. [F] to toggle.',
  },
  anonymous_message: {
    id: 'anonymous_message', name: 'Anonymous Message', category: 'document', chapter: 1, model: 'phone',
    description: 'A text message from an unknown number.',
    content:
      'FROM: Unknown Number\nRECEIVED: March 9, 2028 — 5:13 PM\n\n"Jasmine, may isang pangalan na hindi pa natawag. Bumalik ka sa Room 13."\n\n[Translation: "Jasmine, there is one name that has not been called yet. Come back to Room 13."]\n\nThe number does not exist when you try to call it back.',
  },
  guard_note: {
    id: 'guard_note', name: "Guard's Note", category: 'document', chapter: 1, model: 'paper', tool: true,
    description: 'A note taped beside the breaker panel in the guard station.',
    content:
      'PAALALA (REMINDER) — breaker panel\n\nKapag nag-trip ulit ang kuryente:\n  1. MAIN muna.\n  2. Tapos HALLWAY.\n  3. Tapos ROOM 13 (evening session).\n  Huwag na galawin ang CANTEEN — sira pa rin. Sasabog.\n\n[When the power trips again: MAIN first. Then HALLWAY. Then ROOM 13. Do not touch CANTEEN — still broken.]\n\n— Mang Tonyo, guard, Feb 2018',
  },
  bulletin_notice: {
    id: 'bulletin_notice', name: 'Evening Session Notice', category: 'document', chapter: 1, model: 'paper', key: true,
    description: 'A notice still pinned to the bulletin board in the lobby.',
    content:
      'BUBOG NATIONAL HIGH SCHOOL\nNOTICE — EVENING REVIEW SESSION\n\nGrade 12 – Section Sampaguita\nVenue: ROOM 13\nDate: Friday, March 9, 2018\nTime: 6:00 PM – 9:00 PM\n\nAdviser: Ms. Elena Reyes\nClass Monitor: J. Seman— [the rest is torn away]\n\nAll students must sign the evening attendance upon arrival.\nApproved: R. Villanueva, Principal',
  },
  student_id: {
    id: 'student_id', name: 'Old Student ID', category: 'item', chapter: 1, model: 'card', key: true,
    description: "Your student ID. Found in Ms. Reyes's desk drawer in Room 13.",
    content:
      'BUBOG NATIONAL HIGH SCHOOL — STUDENT IDENTIFICATION\n\nName: SEMANERO, JASMINE\nGrade & Section: 12 – SAMPAGUITA\nSchool Year: 2017–2018\nAge: 18\nValid until: March 31, 2018\n\nSpecial designation: CLASS MONITOR\n\nThe lamination is warped by heat at one corner.',
    back: { text: 'Written on the back in pencil, in your own handwriting:\n"Mar 9 — evening session. Ako ang magche-check ng attendance. Huwag kalimutan si Daniel."\n[I am checking attendance. Don\'t forget Daniel.]' },
  },
  wing_key: {
    id: 'wing_key', name: 'Classroom Wing Key', category: 'item', chapter: 1, model: 'key', tool: true,
    description: 'A brass key on a red tag: "WING B — CLASSROOMS".',
  },
  mara_clip: {
    id: 'mara_clip', name: 'Star Hair Clip', category: 'item', chapter: 1, model: 'clip', secret: 'hidden',
    description: 'A small blue hair clip shaped like a star. It was lying exactly where the girl had been standing.',
    content: 'A cheap plastic hair clip, blue, shaped like a star. Scratched into the back with a pin: "M.D."\nNo student in Sampaguita had those initials. Not on any list you have seen.',
  },

  // ───────────────────────── CHAPTER 2 ─────────────────────────
  hannah_ribbon: {
    id: 'hannah_ribbon', name: "Hannah's Yellow Ribbon", category: 'item', chapter: 2, model: 'cloth',
    description: 'From locker 07, tagged "LIM, H." A faded yellow hair ribbon.',
    content: 'Locker 07 — LIM, HANNAH.\nA yellow hair ribbon, the kind she tied in her hair every single day. Folded inside her notebook cover: "Never without it — Lola\'s gift."',
  },
  carlo_jersey: {
    id: 'carlo_jersey', name: "Carlo's Jersey", category: 'item', chapter: 2, model: 'cloth',
    description: 'From locker 11, tagged "MENDOZA, C." A varsity jersey, number 7.',
    content: 'Locker 11 — MENDOZA, CARLO.\nA red varsity basketball jersey, number 7. He wore it under his uniform for every photo, no matter how many times he was told not to.',
  },
  katrina_glasses: {
    id: 'katrina_glasses', name: "Katrina's Glasses", category: 'item', chapter: 2, model: 'glasses',
    description: 'From locker 04, tagged "FLORES, K." Thick round eyeglasses.',
    content: 'Locker 04 — FLORES, KATRINA.\nThick, round tortoiseshell glasses. One lens is cracked. She was the only one in the class who wore glasses.',
  },
  joshua_pick: {
    id: 'joshua_pick', name: "Joshua's Guitar Pick", category: 'item', chapter: 2, model: 'pick',
    description: 'From locker 09, tagged "RAMOS, J." A guitar pick on a string necklace.',
    content: 'Locker 09 — RAMOS, JOSHUA.\nA green guitar pick hanging from a black string. He always wore it around his neck, outside the uniform collar.',
  },
  seating_notes: {
    id: 'seating_notes', name: "Ms. Reyes's Seating Notes", category: 'document', chapter: 2, model: 'paper', tool: true,
    description: 'Notes for the Room 13 seating plan, written in red ink.',
    content:
      'Seating plan — Sampaguita (evening review, front corner group)\nSix seats: front row 1–2–3, back row 4–5–6. Window side is seat 3 / seat 6.\n\n• Daniel — always by the window, at the back. ("Para makita ang ulan, Ma\'am.")\n• Jasmine sits directly in front of Daniel. Class monitor needs to see the door.\n• Hannah beside Jasmine, never beside the window.\n• Carlo directly behind Hannah.\n• Katrina in the front row — her eyes.\n• Joshua takes the remaining seat.\n\n— E.R.',
  },
  class_photo: {
    id: 'class_photo', name: 'Sampaguita Class Photo', category: 'photo', chapter: 2, model: 'photo', key: true,
    description: 'The class photo of Grade 12 – Sampaguita, taken February 2018.',
    content: 'Grade 12 – Sampaguita, February 2018. Ms. Reyes stands at the end of the row. Count the faces. Then count the names in the caption.',
    photo: {
      kind: 'class',
      caption: 'GRADE 12 – SAMPAGUITA • S.Y. 2017–2018 • Adviser: Ms. E. Reyes',
      figures: [
        { label: 'Aquino' }, { label: 'Bautista', long: true }, { label: 'Cruz' }, { label: 'Flores', glasses: true, long: true },
        { label: 'Garcia', long: true }, { label: 'Lim', ribbon: true, long: true }, { label: 'Mendoza', jersey: '7' },
        { label: 'Semanero', long: true }, { label: 'Navarro' }, { label: 'Ramos' }, { label: 'Santos', long: true }, { label: 'Tan' },
        { long: true, accent: '#7f95ff' }, { label: 'Ms. Reyes', long: true, accent: '#5a3a3a' },
      ],
    },
    back: {
      text: 'Written on the back in blue ballpen:\n"12 names in the caption. 13 of us in the picture. Bakit wala ang pangalan ko? — M."\n[Why is my name not here?]',
      clue: 'mara_photo',
    },
  },
  mara_photo: {
    id: 'mara_photo', name: 'Thirteenth Face', category: 'document', chapter: 2, model: 'paper', secret: 'hidden',
    description: 'The class photo shows 13 students. The caption names only 12.',
    content: 'There are thirteen students in the class photo, but only twelve names in the caption. The girl at the far end — the one with the star clip — is not named anywhere. Someone signed the back with a single letter: M.',
  },
  daniel_diary: {
    id: 'daniel_diary', name: "Daniel's Diary", category: 'document', chapter: 2, model: 'book', key: true,
    description: "Found in the drawer of Daniel's desk — seat 6, by the window.",
    content:
      'DANIEL CRUZ — PERSONAL. HUWAG BASAHIN. (DON\'T READ.)\n\nFeb 2, 2018\nJasmine got picked as class monitor again. She takes the attendance SO seriously. Tinatawag niya ako ng "Cruz, Daniel" like Ma\'am Reyes. Nakakainis. (It\'s annoying.) I\'ll record every review session on my tape recorder so we can study.\n\nFeb 19, 2018\nThe extension cord in the science lab sparked again during chem. Ma\'am Reyes said she already reported it twice. Sir Villanueva said "next budget".\n\nFeb 26, 2018\nMay bagong transferee — si Mara. (A new transferee.) Sabi niya hindi pa raw siya naka-encode sa system kaya wala siya sa class record. Ma\'am Reyes said she will fix it. Mara sits at the back and draws stars on everything.\n\nMarch 5, 2018\nBakit kinadena nila yung east emergency exit? (Why did they chain the east exit?) Sabi ng guard, utos daw ni Principal, dahil sa nakawan. (Principal\'s orders, because of a theft.)\n\nMarch 8, 2018\nEvening review tomorrow. Iiwan ko muna yung reviewer ko sa lab, kukunin ko na lang bukas ng gabi. (I\'ll leave my reviewer in the lab and get it tomorrow night.)',
  },
  reyes_memo_1: {
    id: 'reyes_memo_1', name: 'Repair Request Memo', category: 'document', chapter: 2, model: 'folder', secret: 'record',
    description: 'A faculty memo filed under "UNANSWERED".',
    content:
      'MEMORANDUM\nTO: Mr. Ricardo Villanueva, Principal\nFROM: Ms. Elena Reyes, Grade 12 Adviser\nDATE: January 15, 2018\nRE: SECOND request — electrical repair, Science Laboratory\n\nSir,\nThe extension cord under the fume hood is overloaded and sparks when the lab is in use. I first reported this on November 20, 2017. The fire alarm on the second floor is also disconnected.\nWe will hold evening review sessions in March. I respectfully request that both be repaired before then.\n\nStamped: RECEIVED — Jan 15, 2018\nHandwritten in the margin: "Next budget. — R.V."',
  },
  records_key: {
    id: 'records_key', name: 'Records Wing Key', category: 'item', chapter: 2, model: 'key', tool: true,
    description: 'A key taped under Daniel\'s desk drawer. Tag: "RECORDS — LIBRARY / COMP / REG."',
  },
  mara_canteen: {
    id: 'mara_canteen', name: 'Canteen Order Slip', category: 'document', chapter: 2, model: 'paper', secret: 'hidden',
    description: 'An order slip still pinned behind the canteen counter.',
    content:
      'BUBOG NHS CANTEEN — ORDER SLIP\nDate: March 9, 2018\nFor: Room 13 — Evening Review (Ms. Reyes)\n\n  Pancit canton ........ 13 servings\n  Turon ................ 13 pcs\n  Juice (sachet) ....... 13\n\nNote: "13 kasi may bago." (13, because there\'s a new one.) — E.R.\n\nTwelve students on the class list. Thirteen servings.',
  },

  // ───────────────────────── CHAPTER 3 ─────────────────────────
  library_log: {
    id: 'library_log', name: 'Library Borrowing Log', category: 'document', chapter: 3, model: 'book', secret: 'record',
    description: 'The library log, open to the evening of March 9, 2018.',
    content:
      'BUBOG NHS LIBRARY — BORROWER\'S LOG\n\nMarch 9, 2018 (Friday)\n  5:40 PM  Garcia, N.    Gen. Chemistry (Brown)      — returned 6:55 PM\n  6:10 PM  Cruz, D.      Physics Reviewer             — returned 7:05 PM\n  6:15 PM  Dizon, M.     "Mga Bituin" (illustrated)   — NOT RETURNED\n\nThe official report says the evening session "did not take place as scheduled" and that "the students did not attend." Daniel returned a book at 7:05 PM.',
  },
  pc_hint: {
    id: 'pc_hint', name: 'Sticky Note', category: 'document', chapter: 3, model: 'paper', tool: true,
    description: 'A yellow sticky note on the records computer monitor.',
    content: 'Records PC password:\n"Our section, then our room number. All caps, no spaces."\n— E.R.\n\n(The section is printed on every student ID.)',
  },
  roster_records: {
    id: 'roster_records', name: 'Sampaguita Roster Records', category: 'document', chapter: 3, model: 'folder',
    description: 'Printed from the records computer. Enrollment status of Section Sampaguita and nearby names.',
    content:
      'BUBOG NHS — STUDENT INFORMATION SYSTEM\nSection: 12-SAMPAGUITA   S.Y. 2017–2018\n\nAQUINO, MIGUEL ............ ENROLLED — MISSING (03/09/18)\nBAUTISTA, ANDREA .......... ENROLLED — MISSING (03/09/18)\nCRUZ, DANIEL .............. ENROLLED — MISSING (03/09/18)\nFLORES, KATRINA ........... ENROLLED — MISSING (03/09/18)\nGARCIA, NICOLE ............ ENROLLED — MISSING (03/09/18)\nILAGAN, RAMON ............. TRANSFERRED OUT — Nov 2017\nLIM, HANNAH ............... ENROLLED — MISSING (03/09/18)\nMENDOZA, CARLO ............ ENROLLED — MISSING (03/09/18)\nNAVARRO, PAOLO ............ ENROLLED — MISSING (03/09/18)\nOCAMPO, LIZA .............. ENROLLED — EXCUSED 03/09/18 (medical certificate, fever)\nRAMOS, JOSHUA ............. ENROLLED — MISSING (03/09/18)\nSANTOS, ERIKA ............. ENROLLED — MISSING (03/09/18)\nSEMANERO, JASMINE ............. TRANSFERRED OUT — Feb 2018  *entry modified 03/12/2018 by admin_rv\nTAN, GABRIEL .............. ENROLLED — MISSING (03/09/18)\n\nCross-listed (other sections):\nTORRES, BEATRIZ ........... 12-ROSAL — not a Sampaguita student',
  },
  printed_attendance: {
    id: 'printed_attendance', name: 'Original Evening Attendance (scan)', category: 'document', chapter: 3, model: 'paper', key: true,
    description: 'The printer produced this on its own. A scan of the handwritten evening attendance.',
    content:
      'EVENING ATTENDANCE — 12-SAMPAGUITA — ROOM 13 — MARCH 9, 2018 — 6:00 PM\n(scan, water damaged)\n\n 1. Aquino, M. ........ ✓\n 2. Bautista, A. ...... ✓\n 3. Cruz, D. .......... ✓   out 7:10 → lab (reviewer)\n 4. Flores, K. ........ ✓\n 5. Garcia, N. ........ ✓\n 6. ████████████ ...... (illegible)\n 7. Lim, H. ........... ✓\n 8. Mendoza, C. ....... ✓\n 9. Navarro, P. ....... ✓\n10. ██████, ████ ...... ✓  (smudged)\n11. Ramos, J. ......... ✓\n12. Santos, E. ........ ✓\n13. Seman████, J. ...... ✓   out 7:30 → looking for D. Cruz\n14. Tan, G. ........... ✓\n\nChecked by: [signature of class monitor]\nMs. E. Reyes\n\nNote: some entries are illegible. Compare against the roster records.',
  },
  official_report: {
    id: 'official_report', name: 'Official Incident Report', category: 'document', chapter: 3, model: 'folder', key: true,
    description: 'The official incident report on the fire, filed in the records office.',
    content:
      'BUBOG NATIONAL HIGH SCHOOL — OFFICIAL INCIDENT REPORT\nIncident: Fire, Science Laboratory (2nd floor, East Wing)\nDate: March 9, 2018\n\nCause: Electrical accident (faulty wiring). Undetermined point of origin.\n\nEvacuation: The building was evacuated in an orderly manner. Evacuation declared COMPLETE at 8:05 PM. All students present on the premises were accounted for.\n\nThe evening review session of 12-Sampaguita did not take place as scheduled. The students listed below did not attend and their whereabouts are unknown. Ms. Elena Reyes, adviser, is likewise unaccounted for:\n  Aquino, Bautista, Cruz, Flores, Garcia, Lim, Mendoza, Navarro, Ramos, Santos, Tan\n\nNo casualties within the premises.\nThe East Wing is declared structurally unsafe and is to be sealed.\n\nPrepared and certified: R. Villanueva, Principal\nDate filed: March 12, 2018',
  },
  attendance_reconstructed: {
    id: 'attendance_reconstructed', name: 'Reconstructed Attendance', category: 'document', chapter: 3, model: 'paper', key: true,
    description: 'Your reconstruction of who was really in Room 13 on March 9, 2018.',
    content:
      'RECONSTRUCTED — EVENING ATTENDANCE, MARCH 9, 2018\n\nPresent at 6:00 PM (signed in): Aquino, Bautista, Cruz, Flores, Garcia, Lim, Mendoza, SEMANERO, Navarro, Ramos, Santos, Tan.\n\nNot present: Ilagan (transferred Nov 2017), Ocampo (excused, fever), Torres (different section).\n\nThe official report says the session "did not take place". The original sheet says twelve students signed in — and one of them was you.\n\nAnd line 10 — smudged, but checked present — matches no one on the roster.',
  },
  alex_file: {
    id: 'alex_file', name: 'Student File: Semanero, J.', category: 'document', chapter: 3, model: 'folder', key: true,
    description: 'A student file pulled from the drawer marked "TRANSFERS".',
    content:
      'PERMANENT RECORD — SEMANERO, JASMINE\nSection: 12-Sampaguita   Role: Class Monitor\n\nStatus: TRANSFERRED OUT\nEffective: February 2018\nReason: "Family relocation"\n\nNote clipped to the folder:\n"Per instruction of the Principal, record updated 03/12/2018. Parents advised to enroll the student elsewhere. No further statements from the student. — Registrar"\n\nThe transfer was entered three days AFTER the fire, but dated a month BEFORE it.',
  },
  archive_note: {
    id: 'archive_note', name: 'Archive Door Note', category: 'document', chapter: 3, model: 'paper', tool: true,
    description: 'A torn note left near the archive keypad.',
    content: 'Archive code:\n"Kung kailan tumigil ang lahat."\n[When everything stopped.]\n\nEvery clock in this school stopped at the same minute. Look at any of them.',
  },
  mara_enrollment: {
    id: 'mara_enrollment', name: 'Unprocessed Enrollment Form', category: 'document', chapter: 3, model: 'folder', secret: 'hidden',
    description: 'An enrollment form found behind the filing cabinet, never processed.',
    content:
      'ENROLLMENT FORM — TRANSFEREE\nName: DIZON, MARA L.\nAge: 17\nSection requested: 12-SAMPAGUITA (adviser: Ms. E. Reyes)\nDate submitted: February 26, 2018\n\nStamp: RECEIVED.\nStamp: NOT ENCODED.\n\nA sticky note from Ms. Reyes: "Paki-encode po ASAP. Pumapasok na siya." (Please encode ASAP. She\'s already attending.)\n\nShe was attending. She was never recorded. When the eleven were declared missing, no one declared her missing at all.',
  },

  // ───────────────────────── CHAPTER 4 ─────────────────────────
  extension_cord: {
    id: 'extension_cord', name: 'Scorched Extension Cord', category: 'item', chapter: 4, model: 'cord', key: true,
    description: 'The point of origin. Under the fume hood in the science laboratory.',
    content: 'A six-gang extension cord daisy-chained into another. Melted, scorched black. A strip of masking tape on it reads in red marker:\n"HUWAG GAMITIN — REPORTED 3x — E.R."  (Do not use.)\n\nThe report called the cause "undetermined." It was determined. It was reported three times.',
  },
  guard_log: {
    id: 'guard_log', name: "Guard's Logbook", category: 'document', chapter: 4, model: 'book', secret: 'record',
    description: "Mang Tonyo's logbook, open on the stair landing desk.",
    content:
      'GUARD LOGBOOK — March 9, 2018\n\n6:00 PM  Evening session, Rm 13. Ms. Reyes + students. (Sabi ni Ma\'am 13 sila.)\n7:38 PM  Smoke, 2nd floor east, lab.\n7:41 PM  Fire alarm DOES NOT WORK. Rang the bell by hand.\n7:44 PM  Saw Ma\'am Reyes leading students to the EAST exit. Main stairs full of smoke.\n7:52 PM  Ran to east exit outside — CHAINED. No key. Key is with the Principal.\n8:05 PM  Principal says "complete na, lahat accounted for." I said there are still students inside. He said the evening list is "not official."\n\n(The page after this one was torn out.)',
  },
  mara_voice: {
    id: 'mara_voice', name: 'A Voice in Room 12', category: 'recording', chapter: 4, model: 'cassette', secret: 'hidden',
    description: 'A memory you were not supposed to have heard: a girl\'s voice from the smoke.',
    recording: [
      { s: 'girl', en: "Ma'am! I'm still here! I'm not on the list but I'm still here!", fil: "Ma'am! Nandito pa po ako! Wala po ako sa listahan pero nandito pa po ako!", lang: 'fil' },
      { s: 'reyes', en: 'Mara, hold my hand. I counted you. I always count you.', fil: 'Mara, hawakan mo ang kamay ko. Binilang kita. Lagi kitang binibilang.', lang: 'fil' },
    ],
  },
  evac_sequence: {
    id: 'evac_sequence', name: 'Evacuation Sequence', category: 'document', chapter: 4, model: 'paper', key: true,
    description: 'The evacuation route Ms. Reyes actually took.',
    content: 'EVACUATION — AS IT HAPPENED\n\n1. Room 13 — Ms. Reyes counts the students. Jasmine and Daniel are missing.\n2. Main stairs — filled with smoke. Impassable.\n3. East hallway — the class moves toward the emergency exit, holding hands.\n4. East emergency exit — chained shut.\n\nThey were never outside. They were never "not in attendance".',
  },
  chained_exit: {
    id: 'chained_exit', name: 'Chained Emergency Exit', category: 'item', chapter: 4, model: 'chain', key: true,
    description: 'The east emergency exit, chained and padlocked from the inside.',
    content: 'A heavy chain wrapped three times through the push bars, with a brass padlock. A paper tag is wired to the lock:\n"DO NOT OPEN — By order of the Principal. R.V. — Jan 2018"\n\nThis is where they were. Ms. Reyes, and everyone she counted.',
  },
  daniel_memory: {
    id: 'daniel_memory', name: "Daniel's Memory", category: 'recording', chapter: 4, model: 'cassette',
    description: 'Fragments of the night, pieced together.',
    recording: [
      { s: 'daniel', en: "Jasmine? What are you doing here — I just came back for my reviewer!", fil: 'Jasmine? Anong ginagawa mo dito — binalikan ko lang yung reviewer ko!', lang: 'fil' },
      { s: 'alex', en: "You've been gone twenty minutes. Ma'am is going to mark you absent." },
      { s: 'daniel', en: '...Do you smell that?' },
      { s: 'daniel', en: "The stairs — I can't see — Jasmine, let go, I can hear them! They're going to the east exit!", fil: 'Yung hagdan — wala akong makita — Jasmine, bitaw, naririnig ko sila! Papunta sila sa east exit!', lang: 'fil' },
      { s: 'alex', en: 'Daniel! DANIEL!' },
    ],
  },

  // ───────────────────────── CHAPTER 5 ─────────────────────────
  principal_memo: {
    id: 'principal_memo', name: "Principal's Order", category: 'document', chapter: 5, model: 'folder', key: true,
    description: "From the principal's desk: an internal order dated January 2018.",
    content:
      'OFFICE OF THE PRINCIPAL — INTERNAL ORDER No. 03, s. 2018\nDate: January 22, 2018\n\nEffective immediately, the EAST EMERGENCY EXIT (2nd floor) shall be chained and padlocked after 5:00 PM to prevent further theft of laboratory equipment. The key shall remain with the Office of the Principal.\n\nThis order is not to be posted publicly.\n\n— R. Villanueva, Principal',
  },
  draft_report: {
    id: 'draft_report', name: 'Draft Incident Report (edited)', category: 'document', chapter: 5, model: 'folder', key: true,
    description: 'An earlier draft of the incident report, covered in red edits.',
    content:
      'DRAFT — NOT FOR RELEASE — March 10, 2018, 2:14 AM\n\n"...At 7:44 PM, Ms. Reyes and eleven (11) students were last seen proceeding to the east emergency exit, which was [chained per Order No. 03]..."\n   → struck through. Red ink: "REMOVE."\n\n"...students trapped in the East Wing..."\n   → struck through. Red ink: "CHANGE TO: did not attend the session."\n\n"...one student, J. Semanero, escaped through the faculty room window..."\n   → struck through. Red ink: "Semanero = TRANSFERRED (Feb). Talk to the family. No statements."\n\n"...cause: overloaded extension cord, reported by faculty 3x..."\n   → struck through. Red ink: "Electrical accident. Undetermined."',
  },
  confession_a: {
    id: 'confession_a', name: 'Cassette: "R.V. — Side A"', category: 'recording', chapter: 5, model: 'cassette', key: true,
    description: 'A cassette left in the tape player on the principal\'s desk.',
    recording: [
      { s: 'villanueva', en: 'March 10. It is two in the morning. I am recording this because I cannot say it to anyone.' },
      { s: 'villanueva', en: 'The evening attendance book was on the teacher\'s desk in Room 13. The fire did not reach it. I have it here.' },
      { s: 'villanueva', en: 'If that book exists, they were inside. If they were inside, the chain was mine.' },
      { s: 'villanueva', en: 'Kaya wala nang libro. (So there is no more book.) There is only the report.', fil: 'Kaya wala nang libro. Ang report na lang.', lang: 'fil' },
    ],
  },
  confession_b: {
    id: 'confession_b', name: 'Cassette: "R.V. — Side B"', category: 'recording', chapter: 5, model: 'cassette', secret: 'record',
    description: 'The other side of the confession. Found in the hidden storage room.',
    recording: [
      { s: 'villanueva', en: 'Side B. March 10, evening. The Division called this morning. They said: an accident with missing students is a tragedy. An accident with a locked exit is a case.' },
      { s: 'villanueva', en: 'I had already rewritten the report last night. This afternoon they sealed the East Wing. No search. Never open it, they said.' },
      { s: 'villanueva', en: 'There was one more. A transferee. Not encoded. No one will ever ask about her, because she was never there.' },
      { s: 'villanueva', en: 'Ang record ang paniniwalaan nila, hindi ang alaala. (They will believe the record, not the memory.)', fil: 'Ang record ang paniniwalaan nila, hindi ang alaala.', lang: 'fil' },
      { s: 'villanueva', en: 'God forgive me. I will be promoted for this.' },
    ],
  },
  altered_attendance: {
    id: 'altered_attendance', name: 'Altered Evening Attendance', category: 'document', chapter: 5, model: 'book', key: true,
    description: 'The real evening attendance book. Recovered from the records archive.',
    content:
      'The attendance book itself. Every check mark for March 9, 2018 has been painted over with correction fluid. Over each one, in black ink: "ABSENT."\n\nLine 13 — Semanero, J. — has been blotted out entirely.\nLine 10 — the smudged one — has been scraped with a blade until the paper is thin.\n\nBut correction fluid cracks with age. Under the white, every single mark is still there: ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓',
  },
  daniel_final_message: {
    id: 'daniel_final_message', name: "Daniel's Final Message", category: 'recording', chapter: 5, model: 'cassette', key: true,
    description: 'Daniel\'s tape recorder, in a box labeled "CRUZ, D. — PERSONAL EFFECTS — UNCLAIMED".',
    recording: [
      { s: 'daniel', en: '(coughing) ...Recording. It\'s still recording. Okay.', d: 3600 },
      { s: 'daniel', en: "Jasmine, if you hear this — it's not your fault. I'm the one who left the room. You came to find me.", fil: 'Jasmine, kung naririnig mo \'to — hindi mo kasalanan. Ako ang umalis. Hinanap mo lang ako.', lang: 'fil' },
      { s: 'daniel', en: "I went back for them. Ma'am Reyes is here. Everyone is here. Mara is here too.", fil: "Bumalik ako para sa kanila. Nandito si Ma'am Reyes. Nandito kaming lahat. Nandito rin si Mara.", lang: 'fil' },
      { s: 'daniel', en: "The door won't open. Ma'am is calling attendance so nobody panics. She's calling every name.", fil: 'Ayaw bumukas ng pinto. Nagta-attendance si Ma\'am para walang mag-panic. Tinatawag niya lahat ng pangalan.', lang: 'fil' },
      { s: 'daniel', en: "Tell them we were here. Please. Tell them we were here.", fil: 'Sabihin mo sa kanila na nandito kami. Pakiusap. Sabihin mo na nandito kami.', lang: 'fil' },
    ],
  },
  reyes_letter: {
    id: 'reyes_letter', name: "Ms. Reyes's Last Note", category: 'document', chapter: 5, model: 'paper', key: true,
    description: 'A page torn from the back of the attendance book, in Ms. Reyes\'s handwriting.',
    content:
      'March 9, 2018 — 7:55 PM\n\nTo whoever finds this book:\n\nThe east door is chained. The smoke is coming under it. The children are calm because I am calling the roll, again and again, so that each of them hears their name.\n\nJasmine Semanero and Daniel Cruz left to find each other before the fire. Jasmine may have gotten out. If she did, she is the only one who can say we were here.\n\nThis attendance is the only record that we existed tonight. Please do not let them erase it.\n\nKung may makaligtas — tawagin mo kami. (If anyone survives — call our names.)\n\n— Elena Reyes',
  },
  timeline_reconstructed: {
    id: 'timeline_reconstructed', name: 'Incident Timeline', category: 'document', chapter: 5, model: 'paper', key: true,
    description: 'The true order of events on March 9, 2018.',
    content:
      'THE NIGHT OF MARCH 9, 2018\n\n6:00 PM — Evening session begins in Room 13. Attendance is taken.\n7:10 PM — Daniel leaves for the science lab to get his reviewer.\n7:30 PM — Jasmine leaves Room 13 to look for Daniel.\n7:38 PM — Fire starts at the overloaded extension cord in the lab.\n7:44 PM — Ms. Reyes leads the class toward the east emergency exit.\n7:49 PM — Jasmine and Daniel are separated in the smoke at the stairs.\n8:05 PM — The principal declares the evacuation "complete".',
  },
  cracked_mirror: {
    id: 'cracked_mirror', name: 'Cracked Mirror', category: 'item', chapter: 5, model: 'mirror',
    description: "A mirror on the principal's wall. You looked into it.",
    content: 'The face in the mirror is not eighteen.\nThere are lines at the corners of the eyes. A tiredness that was not there at eighteen. A scar along the left hand from a window you broke ten years ago.\n\nYou stopped counting the years the night you stopped being on the list.',
  },
  secret_timeline: {
    id: 'secret_timeline', name: 'The Unrecorded Timeline', category: 'document', chapter: 5, model: 'paper', secret: 'record',
    description: 'The whole history — before and after the fire.',
    content:
      'THE UNRECORDED TIMELINE\n\nNov 20, 2017 — Ms. Reyes reports the overloaded cord (1st).\nJan 22, 2018 — Principal orders the east exit chained after 5 PM.\nFeb 26, 2018 — Mara Dizon enrolls. Her form is never encoded.\nMar 9, 2018, 7:38 PM — The fire.\nMar 9, 2018, 7:52 PM — The guard finds the east exit chained. The key is with the Principal.\nMar 10, 2018, 2:14 AM — The report is rewritten.\nMar 10, 2018 — The East Wing is sealed. No search is ordered.\nMar 12, 2018 — Jasmine Semanero\'s record is changed to "transferred, Feb 2018".\n\nTwelve students. One teacher. One unrecorded name.',
  },
};

export const ITEM_LIST = Object.values(ITEMS);

/** Evidence required for the true ending (PRESENT). */
export const KEY_EVIDENCE = ITEM_LIST.filter((i) => i.key).map((i) => i.id);

/** Optional records + hidden student clues required for the secret ending (THE UNRECORDED). */
export const SECRET_RECORDS = ITEM_LIST.filter((i) => i.secret === 'record' && i.id !== 'secret_timeline').map((i) => i.id);
export const HIDDEN_CLUES = ITEM_LIST.filter((i) => i.secret === 'hidden').map((i) => i.id);

export function itemName(id: string): string {
  return ITEMS[id]?.name ?? id;
}

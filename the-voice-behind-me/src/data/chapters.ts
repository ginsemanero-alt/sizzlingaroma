import type { ChapterDef, ChapterId } from './types';

export const CHAPTERS: Record<ChapterId, ChapterDef> = {
  1: {
    id: 1,
    title: 'The Voicemail',
    subtitle: 'Chapter One',
    location: 'The house on Calle Sampaguita — seven years later',
    objectives: [
      { id: 'enter', text: 'Enter the house' },
      { id: 'power', text: 'Find the electricity switch' },
      { id: 'voicemail', text: 'Listen to the voicemail' },
      { id: 'photo', text: 'Discover the first photograph' },
      { id: 'key', text: "Find the key to Noah's room" },
      { id: 'upstairs', text: 'Go upstairs' },
    ],
  },
  2: {
    id: 2,
    title: 'The Forgotten Room',
    subtitle: 'Chapter Two',
    location: 'Second floor — east wing',
    objectives: [
      { id: 'search', text: "Search Noah's bedroom" },
      { id: 'photos', text: 'Collect the old photographs', total: 4 },
      { id: 'diary', text: "Find Noah's diary" },
      { id: 'diarypage', text: 'Restore the torn diary page' },
      { id: 'memory', text: 'Solve the memory puzzle on the corkboard' },
      { id: 'hallway', text: 'Follow the voice into the hallway' },
    ],
  },
  3: {
    id: 3,
    title: 'Someone Behind Me',
    subtitle: 'Chapter Three',
    location: 'Second floor — the long hallway',
    objectives: [
      { id: 'footsteps', text: 'Investigate the footsteps' },
      { id: 'mirrors', text: 'Examine the mirrors', total: 3 },
      { id: 'markings', text: 'Discover the hidden markings', total: 5 },
      { id: 'lock', text: 'Open the stairwell door' },
      { id: 'escape', text: 'Escape' },
    ],
  },
  4: {
    id: 4,
    title: 'The Recordings',
    subtitle: 'Chapter Four',
    location: 'The basement',
    objectives: [
      { id: 'player', text: 'Find the cassette player' },
      { id: 'tapes', text: 'Collect the audio recordings', total: 5 },
      { id: 'archive', text: 'Open the hidden archive' },
      { id: 'timeline', text: "Reconstruct the family's timeline" },
      { id: 'conflict', text: 'Listen to the last tape' },
    ],
  },
  5: {
    id: 5,
    title: 'The Night We Lost',
    subtitle: 'Chapter Five',
    location: 'July 14 — seven years ago',
    objectives: [
      { id: 'remember', text: 'Remember the night of the fire' },
      { id: 'follow', text: "Follow Noah's voice" },
      { id: 'escape', text: 'Get out of the house' },
      { id: 'find', text: 'Find Noah' },
      { id: 'truth', text: 'See what really happened' },
    ],
  },
  6: {
    id: 6,
    title: 'The Voice Behind Me',
    subtitle: 'Chapter Six',
    location: 'Somewhere inside the house',
    objectives: [
      { id: 'hallway', text: 'Walk the endless hallway' },
      { id: 'confront', text: 'Confront The Figure Behind' },
      { id: 'recording', text: 'Find the final recording' },
      { id: 'reconstruct', text: 'Reconstruct the night' },
      { id: 'decide', text: 'Make the final decision' },
    ],
  },
};

export const CHAPTER_IDS: ChapterId[] = [1, 2, 3, 4, 5, 6];

import type { DayContent } from '../../types';

const sharedSections = [
  {
    id: 'veni-creator',
    type: 'hymn',
    title: 'Veni Creator Spiritus',
    html: '<p>Come, Creator Spirit, visit the souls of your faithful people.</p>',
    required: true,
    tags: ['prayer', 'holy-spirit', 'essential'],
  },
  {
    id: 'ave-maris-stella',
    type: 'hymn',
    title: 'Ave Maris Stella',
    html: '<p>Lead us gently toward your Son, and keep our prayer steady, simple, and faithful.</p>',
    required: true,
    tags: ['prayer', 'mary', 'essential'],
  },
  {
    id: 'quiet-reflection',
    type: 'reflection',
    title: 'Quiet Reflection',
    html: '<p>Notice one invitation from today&apos;s prayer, without forcing a conclusion.</p>',
    required: false,
    tags: ['reflection', 'optional'],
  },
] as const satisfies readonly DayContent['sections'][number][];

const firstWeekReadings = [
  ['Begin with Desire', 'The first movement is simple: turn toward God and ask for the grace to begin.'],
  ['Make Room', 'Preparation grows when small distractions lose their hold.'],
  ['Trust the Pace', 'Consecration is received over time.'],
  ['Look Toward Christ', 'The purpose of this path is union with Jesus Christ.'],
  ['Practice Humility', 'Humility lets prayer become honest.'],
  ['Offer the Ordinary', 'The ordinary parts of the day can become an offering.'],
  ['Renew the Yes', 'The first week closes with a simple renewal.'],
] as const;

export function getBundledDayContent(consecrationId: string, day: number): DayContent {
  const reading = firstWeekReadings[day - 1] ?? [`Day ${String(day)}`, 'This day is ready for prayer and reflection.'];

  return {
    consecrationId,
    day,
    title: `Day ${String(day)} - ${reading[0]}`,
    phase: 'preparation',
    author: 'Consecration App',
    durationMinutes: 8,
    sections: [
      {
        id: `day-${String(day)}-reading`,
        type: 'reading',
        title: reading[0],
        html: `<p>${reading[1]}</p>`,
        required: true,
        tags: ['reading', 'essential'],
      },
      ...sharedSections,
    ],
  };
}

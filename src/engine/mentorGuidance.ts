/**
 * Adaptive mentoring — the mentor should behave like an experienced CM beside
 * you: heavy coaching when you're new to a topic, stepping back to a nudge as
 * you master it. Rather than hand you the answer, lower assist levels prompt
 * reasoning ("what's the failure mode here?"); higher levels get out of the
 * way. Pure and deterministic so it's testable and safe in the reducer path.
 */
import type { Mentor } from '../content/mentors';

export type AssistLevel = 'coaching' | 'guiding' | 'nudging' | 'observing';

/** map a 0–100 proficiency to how much help the mentor should offer */
export function assistLevel(proficiency: number): AssistLevel {
  if (proficiency < 25) return 'coaching';
  if (proficiency < 55) return 'guiding';
  if (proficiency < 80) return 'nudging';
  return 'observing';
}

/**
 * A guidance line for `topic` whose helpfulness matches the player's mastery.
 * Templates are generic on purpose — they teach a way of THINKING (start from
 * what you can't see; name the failure mode; weigh the long fuse) that
 * transfers across every topic, which is exactly the intuition the product
 * wants the player to absorb.
 */
export function adaptiveGuidance(mentor: Mentor, proficiency: number, topic: string): string {
  switch (assistLevel(proficiency)) {
    case 'coaching':
      return `New ground for you, so let's think it through together. With ${topic}, start from what you can't see — the ground, the water, the loads. Don't guess; when you're unsure, ask. That's the job, not a weakness.`;
    case 'guiding':
      return `You've got the basics of ${topic}. Before you commit, ask yourself one thing: what happens if I'm wrong? Name the failure mode out loud — that's how you catch it before the site does.`;
    case 'nudging':
      return `You know ${topic} well. I'll only say this: weigh the long fuse, not just today's number. The cheap call now is often the expensive one later.`;
    case 'observing':
      return `${topic} is your strong suit now. I'll stay out of your way — you've earned that. I'll only speak up if you're about to trip.`;
  }
}

/** short status the UI can show next to the mentor to signal the shift */
export function assistLabel(level: AssistLevel): string {
  switch (level) {
    case 'coaching':
      return 'Coaching closely';
    case 'guiding':
      return 'Guiding your reasoning';
    case 'nudging':
      return 'Just nudging';
    case 'observing':
      return 'Standing back';
  }
}

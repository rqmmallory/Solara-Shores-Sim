/**
 * Tactile feedback — the cheapest, highest-impact "juice". Every meaningful
 * outcome gets a matching haptic so the app feels physical, not textual.
 * All calls are fire-and-forget and guarded: on web or any platform without
 * a haptics engine they silently no-op, never throwing into the render path.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type Tone = 'good' | 'warn' | 'bad';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** light tick — taps, selections, opening a panel */
export function tapFeedback(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** graded outcome — a sim decision, a quiz answer */
export function outcomeFeedback(tone: Tone): void {
  if (!enabled) return;
  const type =
    tone === 'good'
      ? Haptics.NotificationFeedbackType.Success
      : tone === 'warn'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;
  Haptics.notificationAsync(type).catch(() => {});
}

/** a solid thud — earning capital, a building landing on the map */
export function impactFeedback(strength: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (!enabled) return;
  const style =
    strength === 'light'
      ? Haptics.ImpactFeedbackStyle.Light
      : strength === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

/** the celebration — a phase completed */
export function celebrateFeedback(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 140);
}

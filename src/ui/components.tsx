import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, space, type } from './theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space.l, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

export function Small({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.small, style]}>{children}</Text>;
}

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger' | 'teal';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    kind === 'primary' ? colors.accent : kind === 'teal' ? colors.teal : kind === 'danger' ? colors.bad : 'transparent';
  const fg = kind === 'ghost' ? colors.text : '#10141B';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** tappable option row used across quiz / decisions / sim */
export function OptionRow({
  label,
  onPress,
  state = 'idle',
  detail,
}: {
  label: string;
  onPress?: () => void;
  state?: 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';
  detail?: string;
}) {
  const border =
    state === 'correct' ? colors.good : state === 'wrong' ? colors.bad : state === 'selected' ? colors.accent : colors.border;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.option, { borderColor: border, opacity: state === 'dim' ? 0.55 : 1 }]}
    >
      <Text style={styles.body}>{label}</Text>
      {detail ? <Text style={[styles.small, { marginTop: 6, color: colors.muted }]}>{detail}</Text> : null}
    </TouchableOpacity>
  );
}

export function Tag({ label, color = colors.teal }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tiny, { color }]}>{label}</Text>
    </View>
  );
}

export function Meter({
  label,
  value,
  max = 100,
  color = colors.teal,
  suffix = '',
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View style={{ marginVertical: space.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.small}>{label}</Text>
        <Text style={[styles.small, { color: colors.text }]}>
          {Math.round(value)}
          {suffix}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** boxed teaching callout — the "explain before/after" surface */
export function TeachBox({ children, tone = 'teach' }: { children: React.ReactNode; tone?: 'teach' | 'good' | 'bad' | 'warn' }) {
  const border =
    tone === 'good' ? colors.good : tone === 'bad' ? colors.bad : tone === 'warn' ? colors.warn : colors.teal;
  return (
    <View style={[styles.teach, { borderLeftColor: border }]}>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: space.l,
    marginBottom: space.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { fontSize: type.title, fontWeight: '700', color: colors.text, marginBottom: space.s },
  h2: { fontSize: type.h2, fontWeight: '600', color: colors.text, marginBottom: space.xs },
  body: { fontSize: type.body, color: colors.text, lineHeight: 21 },
  small: { fontSize: type.small, color: colors.muted, lineHeight: 18 },
  tiny: { fontSize: type.tiny, fontWeight: '600' },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: space.s,
  },
  btnLabel: { fontSize: type.body, fontWeight: '700' },
  option: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: space.m,
    marginTop: space.s,
    backgroundColor: colors.cardAlt,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginRight: space.xs,
    marginBottom: space.xs,
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
    marginTop: 3,
  },
  meterFill: { height: 8, borderRadius: 4 },
  teach: {
    backgroundColor: colors.cardAlt,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: space.m,
    marginVertical: space.s,
  },
});

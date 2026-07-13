import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { Mentor } from '../content/mentors';
import { colors, space, type } from './theme';

/**
 * A mentor NPC delivering a line — avatar in a persona-coloured ring, name +
 * role, and a speech bubble. This is how the teaching gets a face and a
 * point of view instead of arriving as an anonymous gray callout.
 */
export default function MentorBubble({
  mentor,
  line,
  compact = false,
  animateIn = false,
}: {
  mentor: Mentor;
  line: string;
  compact?: boolean;
  animateIn?: boolean;
}) {
  const enter = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  useEffect(() => {
    if (!animateIn) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [line, animateIn, enter]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      <View style={[styles.avatarRing, { borderColor: mentor.color }]}>
        <Text style={{ fontSize: compact ? 20 : 26 }}>{mentor.avatar}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: mentor.color }]}>{mentor.name}</Text>
          <Text style={styles.role}> · {mentor.role}</Text>
        </View>
        <View style={[styles.bubble, { borderLeftColor: mentor.color }]}>
          <Text style={styles.line}>{line}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: space.s,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.m,
    backgroundColor: colors.cardAlt,
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 3 },
  name: { fontSize: type.small, fontWeight: '800' },
  role: { fontSize: type.tiny, color: colors.muted },
  bubble: {
    backgroundColor: colors.cardAlt,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: space.m,
  },
  line: { fontSize: type.body, color: colors.text, lineHeight: 21 },
});

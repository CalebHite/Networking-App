import { useContext } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { UserContext } from './user-context';

type UserInfoContentProps = {
  heading?: string;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
};

export function UserInfoContent({ heading, style, cardStyle }: UserInfoContentProps) {
  const user = useContext(UserContext);
  const headingText =
    heading ?? (user?.username ? `Welcome back, ${user.username}!` : 'Welcome!');

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.heading}>{headingText}</Text>
      <View style={[styles.card, cardStyle]}>
        <Text selectable style={styles.body}>
          {JSON.stringify(user ?? { message: 'No user data' }, null, 2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  body: {
    fontFamily: 'monospace',
    lineHeight: 20,
    color: '#2c2c2c',
  },
});


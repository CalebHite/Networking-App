import { useContext } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { UserContext } from './user-context';

export default function HomeScreen() {
  const user = useContext(UserContext);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>
        {user?.username ? `Welcome back, ${user.username}!` : 'Welcome!'}
      </Text>
      <Text style={styles.subheading}>Here is the shape of your authenticated user:</Text>
      <View style={styles.card}>
        <Text selectable style={styles.body}>
          {JSON.stringify(user ?? { message: 'No user data' }, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    backgroundColor: '#f7f7f7',
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subheading: {
    fontSize: 16,
    color: '#555',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  body: {
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});

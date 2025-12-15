import { useContext, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { UserContext } from './user-context';
import { UserInfoContent } from './user-info';

export default function HomeScreen() {
  const user = useContext(UserContext);
  const eventEntries = useMemo(() => {
    const values = Array.isArray(user?.events) ? user.events : [];
    return values.map((value, index) => {
      const stringValue =
        typeof value === 'string'
          ? value
          : JSON.stringify(value ?? '') ?? `Event ${index + 1}`;
      return {
        id: typeof value === 'string' ? value : `event-${index}`,
        label: stringValue,
      };
    });
  }, [user?.events]);

  const taskEntries = useMemo(() => {
    const values = Array.isArray(user?.tasks) ? user.tasks : [];
    return values.map((value, index) => {
      const stringValue =
        typeof value === 'string'
          ? value
          : JSON.stringify(value ?? '') ?? `Task ${index + 1}`;
      return {
        id: typeof value === 'string' ? value : `task-${index}`,
        label: stringValue,
      };
    });
  }, [user?.tasks]);

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>User info</Text>
          <Text style={styles.sectionSubtitle}>Personalized snapshot</Text>
        </View>
        <UserInfoContent style={styles.userCard} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent events</Text>
          <Text style={styles.sectionSubtitle}>
            {eventEntries.length > 0
              ? `${eventEntries.length} tracked`
              : 'No events yet'}
          </Text>
        </View>
        {eventEntries.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              No events identified yet — save one from the event screen.
            </Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {eventEntries.map((entry, index) => (
              <View key={entry.id} style={styles.eventCard}>
                <Text style={styles.eventName}>{`Event ${index + 1}`}</Text>
                <Text style={styles.eventDate}>{entry.label}</Text>
                <Text style={styles.eventMeta}>ID: {entry.id}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending tasks</Text>
          <Text style={styles.sectionSubtitle}>
            {taskEntries.length > 0
              ? `${taskEntries.length} recorded`
              : 'All caught up'}
          </Text>
        </View>
        {taskEntries.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              No tasks tracked yet — add one from the tasks screen.
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {taskEntries.map((entry, index) => (
              <View key={entry.id} style={styles.taskCard}>
                <Text style={styles.taskTitle}>{`Task ${index + 1}`}</Text>
                <Text style={styles.taskMeta}>{entry.label}</Text>
                <Text style={styles.taskTime}>ID: {entry.id}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 16,
    backgroundColor: '#f4f4f6',
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6c6c6c',
  },
  userCard: {
    backgroundColor: '#fff',
  },
  eventList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventCard: {
    width: 220,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  eventName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1c1c1c',
  },
  eventDate: {
    fontSize: 14,
    color: '#4b4b4b',
  },
  eventMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  placeholderCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  placeholderText: {
    color: '#6a6a6a',
    fontSize: 14,
  },
  taskList: {
    flexDirection: 'column',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderLeftWidth: 4,
    borderLeftColor: '#2f95dc',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  taskMeta: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b4b4b',
  },
  taskTime: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
});

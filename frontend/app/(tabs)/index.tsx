import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createTask, EventRecord, getEvents } from '@/scripts/database';
import { UserContext } from './user-context';
import { UserInfoContent } from './user-info';

const TASK_TYPES = ['Connect', 'Meeting', 'Application', 'Other'] as const;
type TaskType = (typeof TASK_TYPES)[number];

type TaskEntry = {
  id: string;
  label: string;
  type?: string;
  eventName?: string;
};

export default function HomeScreen() {
  const user = useContext(UserContext);
  const username = typeof user?.username === 'string' ? user.username : undefined;

  // Events from user context (array of event IDs or event objects)
  const userEvents = Array.isArray(user?.events) ? user.events : [];

  // Fetched event records with full data
  const [fetchedEvents, setFetchedEvents] = useState<EventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Tasks state
  const [createdTasks, setCreatedTasks] = useState<TaskEntry[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [taskInfo, setTaskInfo] = useState('');
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPES[0]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load events when username changes
  useEffect(() => {
    if (!username) {
      setFetchedEvents([]);
      return;
    }

    let cancelled = false;
    setLoadingEvents(true);

    getEvents(username)
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.events) {
          setFetchedEvents(response.events);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Failed to load events:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // Build display events: prefer fetched data, fallback to user.events
  const events: Array<{ id: string; name: string; date?: string }> =
    fetchedEvents.length > 0
      ? fetchedEvents.map((e, i) => ({
          id: e._id || e.id,
          name: e.name,
          date: e.date,
        }))
      : userEvents.map((e, i) => {
          // e could be a string ID or an object
          if (typeof e === 'string') {
            return { id: e, name: `Event ${i + 1}` };
          }
          const obj = e as Record<string, unknown>;
          return {
            id: (obj._id as string) || (obj.id as string) || `event-${i}`,
            name: (obj.name as string) || `Event ${i + 1}`,
            date: obj.date as string | undefined,
          };
        });

  // Helper to get event name by ID
  const getEventName = (eventId: string): string => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || 'Unknown Event';
  };

  // Get selected event name for dropdown
  const selectedEventName = selectedEventId ? getEventName(selectedEventId) : undefined;

  const handleOpenModal = () => {
    setTaskInfo('');
    setTaskType(TASK_TYPES[0]);
    setSelectedEventId(undefined);
    setFormError(null);
    setIsDropdownOpen(false);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setIsDropdownOpen(false);
  };

  const handleCreateTask = async () => {
    if (!username) {
      setFormError('User not available');
      return;
    }

    const trimmedInfo = taskInfo.trim();
    if (!trimmedInfo) {
      setFormError('Task info is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await createTask({
        username,
        info: trimmedInfo,
        type: taskType,
        eventId: selectedEventId,
      });

      if (response.success && response.task) {
        const task = response.task as Record<string, unknown>;
        const newTask: TaskEntry = {
          id: (task._id as string) || (task.id as string) || `task-${Date.now()}`,
          label: trimmedInfo,
          type: taskType,
          eventName: selectedEventId ? getEventName(selectedEventId) : undefined,
        };
        setCreatedTasks((prev) => [newTask, ...prev]);
        handleCloseModal();
      } else {
        setFormError(response.error || 'Failed to create task');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* User Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>User info</Text>
          <Text style={styles.sectionSubtitle}>Personalized snapshot</Text>
        </View>
        <UserInfoContent style={styles.userCard} />
      </View>

      {/* Events Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent events</Text>
          <Text style={styles.sectionSubtitle}>
            {loadingEvents
              ? 'Loading...'
              : events.length > 0
              ? `${events.length} tracked`
              : 'No events yet'}
          </Text>
        </View>
        {loadingEvents ? (
          <ActivityIndicator style={{ marginVertical: 20 }} />
        ) : events.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              No events yet — create one to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {events.map((event, index) => (
              <View key={event.id} style={styles.eventCard}>
                <Text style={styles.eventName}>{event.name}</Text>
                {event.date && (
                  <Text style={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tasks Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Pending tasks</Text>
            <Text style={styles.sectionSubtitle}>
              {createdTasks.length > 0
                ? `${createdTasks.length} recorded`
                : 'All caught up'}
            </Text>
          </View>
          <Pressable
            onPress={handleOpenModal}
            style={styles.addTaskButton}
            accessibilityLabel="Add a task"
          >
            <Text style={styles.addTaskButtonText}>+</Text>
          </Pressable>
        </View>
        {createdTasks.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              No tasks yet — add one with the button above.
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {createdTasks.map((task, index) => (
              <View key={task.id} style={styles.taskCard}>
                <Text style={styles.taskTitle}>{`Task ${index + 1}`}</Text>
                <Text style={styles.taskMeta}>{task.label}</Text>
                {task.type && (
                  <Text style={styles.taskDetail}>Type: {task.type}</Text>
                )}
                {task.eventName && (
                  <Text style={styles.taskDetail}>Event: {task.eventName}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Create Task Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create a task</Text>
            {formError && <Text style={styles.modalError}>{formError}</Text>}

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              multiline
              numberOfLines={4}
              placeholder="Describe the task"
              placeholderTextColor="#888"
              value={taskInfo}
              onChangeText={setTaskInfo}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeOptionRow}>
              {TASK_TYPES.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setTaskType(option)}
                  style={[
                    styles.typeOption,
                    option === taskType && styles.typeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      option === taskType && styles.typeOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Event</Text>
            <Pressable
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              style={[
                styles.dropdownButton,
                isDropdownOpen && styles.dropdownButtonActive,
              ]}
            >
              <Text style={styles.dropdownButtonText}>
                {selectedEventName || 'None'}
              </Text>
            </Pressable>

            {isDropdownOpen && (
              <View style={styles.dropdownList}>
                <Pressable
                  onPress={() => {
                    setSelectedEventId(undefined);
                    setIsDropdownOpen(false);
                  }}
                  style={styles.dropdownOption}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedEventId === undefined && styles.dropdownOptionTextActive,
                    ]}
                  >
                    None
                  </Text>
                </Pressable>
                {events.map((event) => {
                  const eventId = event.id || '';
                  return (
                    <Pressable
                      key={eventId}
                      onPress={() => {
                        setSelectedEventId(eventId);
                        setIsDropdownOpen(false);
                      }}
                      style={styles.dropdownOption}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          eventId === selectedEventId && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {event.name || 'Unnamed Event'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateTask}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>
                    Save task
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
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
  taskDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#5a5a5a',
  },
  addTaskButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalError: {
    color: '#b00020',
    marginBottom: 8,
    fontSize: 13,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    fontSize: 14,
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  typeOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: '#cfcfcf',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  typeOptionSelected: {
    borderColor: '#2f95dc',
    backgroundColor: '#e6f0ff',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  typeOptionTextSelected: {
    color: '#2f95dc',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  dropdownButtonActive: {
    borderColor: '#2f95dc',
    backgroundColor: '#f2f7ff',
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    maxHeight: 160,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownOptionTextActive: {
    color: '#2f95dc',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonPrimary: {
    backgroundColor: '#2f95dc',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1f1f1f',
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});

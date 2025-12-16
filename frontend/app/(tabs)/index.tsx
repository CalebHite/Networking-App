import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createTask,
  EventRecord,
  getEvents,
  getFinishedTasks,
  getUserTasks,
  updateTask,
  TaskRecord,
} from '@/scripts/database';
import { UserContext } from './user-context';

const TASK_TYPES = ['Connect', 'Meeting', 'Application', 'Other'] as const;
type TaskType = (typeof TASK_TYPES)[number];

const UI = {
  bg: '#0B0B0F',
  card: '#14141B',
  card2: '#1A1A21',
  border: '#26262E',
  text: '#FFFFFF',
  sub: '#A0A0AA',
  purple: '#5D2DB7',
  magenta: '#FF2AD4',
};

export default function HomeScreen() {
  const user = useContext(UserContext);
  const username = typeof user?.username === 'string' ? user.username : undefined;
  const insets = useSafeAreaInsets();

  // Events from user context (array of event IDs or event objects)
  const userEvents = Array.isArray(user?.events) ? user.events : [];

  // Fetched event records with full data
  const [fetchedEvents, setFetchedEvents] = useState<EventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [finishedCount, setFinishedCount] = useState<number>(0);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [taskInfo, setTaskInfo] = useState('');
  const [taskType, setTaskType] = useState<TaskType>(TASK_TYPES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskDetailsVisible, setTaskDetailsVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [taskDetailsError, setTaskDetailsError] = useState<string | null>(null);

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

  const loadTasks = useCallback(async (activeUsername: string) => {
    setLoadingTasks(true);
    try {
      const [tasksResponse, finishedResponse] = await Promise.all([
        getUserTasks(activeUsername),
        getFinishedTasks(activeUsername),
      ]);
      if (tasksResponse.success && Array.isArray(tasksResponse.tasks)) {
        setTasks(tasksResponse.tasks);
      }
      if (finishedResponse.success && Array.isArray(finishedResponse.tasks)) {
        setFinishedCount(finishedResponse.tasks.length);
      }
    } catch (err) {
      console.warn('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (!username) {
      setTasks([]);
      setFinishedCount(0);
      return;
    }
    loadTasks(username);
  }, [loadTasks, username]);

  // Build display events: prefer fetched data, fallback to user.events
  const events: { id: string; name: string; date?: string }[] =
    fetchedEvents.length > 0
      ? fetchedEvents.map((e, i) => ({
          id: e._id || e.id || `event-${i}`,
          name: e.name || `Event ${i + 1}`,
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

  const activeEvent = events[0];

  const handleOpenModal = () => {
    setTaskInfo('');
    setTaskType(TASK_TYPES[0]);
    setFormError(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleOpenTaskDetails = (task: TaskRecord) => {
    setSelectedTask(task);
    setTaskDetailsError(null);
    setTaskDetailsVisible(true);
  };

  const handleCloseTaskDetails = () => {
    setTaskDetailsVisible(false);
    setSelectedTask(null);
    setTaskDetailsError(null);
    setIsCompletingTask(false);
  };

  const handleCompleteSelectedTask = async () => {
    if (!username) {
      setTaskDetailsError('User not available');
      return;
    }
    const taskId = selectedTask?._id || selectedTask?.id;
    if (!taskId) {
      setTaskDetailsError('Task id missing');
      return;
    }

    setIsCompletingTask(true);
    setTaskDetailsError(null);
    try {
      const response = await updateTask({
        username,
        taskId,
        status: 'completed',
      });
      if (!response.success) {
        setTaskDetailsError(response.error || 'Failed to complete task');
        return;
      }

      await loadTasks(username);
      handleCloseTaskDetails();
    } catch (err) {
      setTaskDetailsError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setIsCompletingTask(false);
    }
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
      });

      if (response.success) {
        handleCloseModal();
        await loadTasks(username);
      } else {
        setFormError(response.error || 'Failed to create task');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const integrations = useMemo(() => {
    const raw = (user?.integrations as unknown) ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [user?.integrations]);

  const connectionCount = useMemo(() => {
    const raw = (user?.connections as unknown) ?? [];
    return Array.isArray(raw) ? raw.length : 0;
  }, [user?.connections]);

  const pendingTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.status !== 'completed'),
    [tasks]
  );

  const formatMaybeDateTime = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  return (
    <ScrollView
      style={{ backgroundColor: UI.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <Text style={styles.profileTitle}>
          {typeof user?.username === 'string' && user.username.trim().length > 0
            ? 'Hey, '+user.username+'!'
            : 'Your Profile'}
        </Text>

        <View style={styles.profileStatsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{connectionCount}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{finishedCount}</Text>
            <Text style={styles.statLabel}>Finished Tasks</Text>
          </View>
        </View>

        <Text style={styles.integrationsLabel}>Integrations</Text>
        <View style={styles.dotsRow}>
          {(integrations.length > 0 ? integrations.slice(0, 5) : new Array(5).fill(null)).map(
            (_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  { backgroundColor: idx % 2 === 0 ? UI.magenta : '#7A3CFF' },
                ]}
              />
            )
          )}
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
      </View>
      {loadingEvents ? (
        <ActivityIndicator color={UI.sub} style={{ marginVertical: 14 }} />
      ) : !activeEvent ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No events yet.</Text>
        </View>
      ) : (
        <View style={styles.eventHero}>
          <View style={styles.eventHeroTopRow}>
            <Text style={styles.eventHeroTitle} numberOfLines={1}>
              {activeEvent.name}
            </Text>
            <View style={styles.eventPlay}>
              <Text style={styles.eventPlayText}>{'▶'}</Text>
            </View>
          </View>
          <Text style={styles.eventHeroSub}>
            {activeEvent.date ? `On ${new Date(activeEvent.date).toLocaleDateString()}` : ' '}
          </Text>
        </View>
      )}

      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        <Pressable
          onPress={handleOpenModal}
          style={styles.addButton}
          accessibilityLabel="Add a task"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
      {loadingTasks ? (
        <ActivityIndicator color={UI.sub} style={{ marginVertical: 14 }} />
      ) : pendingTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>All caught up.</Text>
        </View>
      ) : (
        <View style={styles.taskList}>
          {pendingTasks.slice(0, 6).map((task) => (
            <Pressable
              key={(task._id || task.id || task.info || '') as string}
              style={({ pressed }) => [styles.taskRow, pressed ? styles.taskRowPressed : null]}
              onPress={() => handleOpenTaskDetails(task)}
              accessibilityRole="button"
              accessibilityLabel="View task details"
            >
              <View style={styles.taskBullet} />
              <View style={{ flex: 1 }}>
                <Text style={styles.taskRowTitle} numberOfLines={1}>
                  {task.info || 'Task'}
                </Text>
                <Text style={styles.taskRowSub} numberOfLines={1}>
                  {(task.type ? `${task.type} • ` : '') +
                    (task.dateTime ? new Date(task.dateTime).toLocaleString() : '')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Task Details Modal */}
      <Modal
        transparent
        visible={taskDetailsVisible}
        animationType="fade"
        onRequestClose={handleCloseTaskDetails}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseTaskDetails}>
          <Pressable style={styles.detailsModalContainer} onPress={() => null}>
            <Text style={styles.modalTitle}>Task details</Text>
            {taskDetailsError ? (
              <Text style={styles.modalError}>{taskDetailsError}</Text>
            ) : null}

            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Type</Text>
              <Text style={styles.detailsMetaValue}>{selectedTask?.type || '—'}</Text>
            </View>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Status</Text>
              <Text style={styles.detailsMetaValue}>{selectedTask?.status || 'pending'}</Text>
            </View>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Date</Text>
              <Text style={styles.detailsMetaValue}>
                {formatMaybeDateTime(selectedTask?.dateTime)}
              </Text>
            </View>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>ID</Text>
              <Text selectable style={styles.detailsMetaValue}>
                {selectedTask?._id || selectedTask?.id || '—'}
              </Text>
            </View>

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>Details</Text>
            <View style={styles.detailsBody}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text selectable style={styles.detailsBodyText}>
                  {selectedTask?.info || '—'}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCompleteSelectedTask}
                disabled={isCompletingTask}
              >
                {isCompletingTask ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Complete</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCloseTaskDetails}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              placeholderTextColor={UI.sub}
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
    flexGrow: 1,
    padding: 18,
    paddingBottom: 120,
    backgroundColor: UI.bg,
  },
  profileCard: {
    backgroundColor: UI.purple,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  profileTitle: {
    color: UI.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statNumber: {
    color: UI.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  integrationsLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: UI.text,
  },
  eventHero: {
    backgroundColor: UI.card2,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  eventHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  eventHeroTitle: {
    flex: 1,
    color: UI.text,
    fontSize: 18,
    fontWeight: '800',
  },
  eventHeroSub: {
    color: UI.sub,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  eventPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventPlayText: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: UI.text,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    padding: 16,
  },
  emptyText: {
    color: UI.sub,
    fontSize: 14,
    fontWeight: '600',
  },
  taskList: {
    flexDirection: 'column',
  },
  taskRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: UI.card2,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  taskRowPressed: {
    opacity: 0.85,
  },
  taskBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: UI.magenta,
  },
  taskRowTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
  },
  taskRowSub: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
    backgroundColor: UI.card,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  detailsModalContainer: {
    borderRadius: 18,
    padding: 20,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    width: '100%',
    maxHeight: 520,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: UI.text,
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
    color: UI.sub,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailsMetaLabel: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsMetaValue: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailsBody: {
    backgroundColor: UI.card2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    maxHeight: 180,
  },
  detailsBodyText: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: UI.card2,
    fontSize: 14,
    marginBottom: 12,
    color: UI.text,
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
    borderColor: UI.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: UI.card2,
    marginRight: 8,
    marginBottom: 8,
  },
  typeOptionSelected: {
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.sub,
  },
  typeOptionTextSelected: {
    color: UI.text,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modalButtonPrimary: {
    backgroundColor: UI.purple,
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: UI.text,
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});

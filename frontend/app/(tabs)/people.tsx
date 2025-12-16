import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addConnection, getConnections } from '@/scripts/database';
import { UserContext } from './user-context';

type Connection = Record<string, unknown>;

const UI = {
  bg: '#0B0B0F',
  card: '#1A1A21',
  border: '#26262E',
  text: '#FFFFFF',
  sub: '#A0A0AA',
  magenta: '#FF2AD4',
};

const getConnectionName = (connection: Connection) => {
  const candidates = [
    connection.connectionName,
    connection.name,
    connection.username,
    connection.id,
    connection._id,
  ];
  const first = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return (first as string | undefined) ?? 'Connection';
};

const getConnectionSubtitle = (connection: Connection) => {
  const raw =
    (typeof connection.note === 'string' ? connection.note : undefined) ??
    (typeof connection.description === 'string' ? connection.description : undefined) ??
    '';
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'Tap + to add notes';
};

export default function PeopleScreen() {
  const user = useContext(UserContext);
  const insets = useSafeAreaInsets();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username =
    typeof user?.username === 'string' ? user.username : '';
  const [modalVisible, setModalVisible] = useState(false);
  const [connectionName, setConnectionName] = useState('');
  const [connectionNote, setConnectionNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingConnection, setIsSubmittingConnection] = useState(false);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getConnections(username);
      if (response.success) {
        setConnections((response.connections ?? []) as Connection[]);
      } else {
        setError(response.error ?? 'Unable to load connections');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load connections';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!username) {
      return;
    }
    loadConnections();
  }, [loadConnections, username]);

  const resetConnectionForm = useCallback(() => {
    setConnectionName('');
    setConnectionNote('');
  }, []);

  const handleDismissModal = useCallback(() => {
    setModalVisible(false);
    setFormError(null);
    resetConnectionForm();
    setIsSubmittingConnection(false);
  }, [resetConnectionForm]);

  const handleCreateConnection = useCallback(async () => {
    if (!username) {
      setFormError('Current user is unavailable');
      return;
    }

    const trimmedName = connectionName.trim();
    const trimmedNote = connectionNote.trim();
    if (!trimmedName || !trimmedNote) {
      setFormError('Name and note are required');
      return;
    }

    setIsSubmittingConnection(true);
    setFormError(null);

    try {
      await addConnection({
        username,
        connectionName: trimmedName,
        note: trimmedNote,
      });
      handleDismissModal();
      loadConnections();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to add connection';
      setFormError(message);
    } finally {
      setIsSubmittingConnection(false);
    }
  }, [
    username,
    connectionName,
    connectionNote,
    loadConnections,
    handleDismissModal,
  ]);

  const noConnectionsMessage = useMemo(
    () =>
      loading
        ? 'Loading connections…'
        : error
        ? 'Unable to show connections right now'
        : 'You do not currently have any connections',
    [loading, error]
  );

  const renderConnection = ({ item }: { item: Connection }) => (
    <View style={styles.row}>
      <View style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {getConnectionName(item)}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {getConnectionSubtitle(item)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.miniIcon} />
        <View style={[styles.miniIcon, { opacity: 0.65 }]} />
      </View>
    </View>
  );

  const keyExtractor = (connection: Connection, index: number) =>
    `${connection.id ?? connection._id ?? connection.username ?? index}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>People</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
          accessibilityLabel="Add a connection"
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={UI.sub} size="large" style={styles.loader} />
      ) : null}
      <FlatList
        data={connections}
        renderItem={renderConnection}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.list,
          connections.length === 0 ? styles.emptyList : null,
        ]}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>{noConnectionsMessage}</Text>
        )}
      />
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={handleDismissModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add a connection</Text>
            <Text style={styles.modalDescription}>
              Tell us who you met and add a note for later.
            </Text>
            {formError ? (
              <Text style={styles.modalError}>{formError}</Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={connectionName}
              onChangeText={setConnectionName}
              autoCapitalize="words"
              placeholderTextColor={UI.sub}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Note"
              value={connectionNote}
              onChangeText={setConnectionNote}
              multiline
              numberOfLines={4}
              placeholderTextColor={UI.sub}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleDismissModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateConnection}
                disabled={isSubmittingConnection}
              >
                {isSubmittingConnection ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>
                    Save connection
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 96,
    backgroundColor: UI.bg,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: UI.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI.card,
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
  loader: {
    marginVertical: 16,
  },
  list: {
    paddingBottom: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: UI.sub,
    textAlign: 'center',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.magenta,
    opacity: 0.9,
  },
  rowTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
  },
  rowSub: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  rowRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  miniIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: UI.card,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: UI.text,
  },
  modalDescription: {
    fontSize: 14,
    color: UI.sub,
    marginBottom: 12,
  },
  modalError: {
    color: '#b00020',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: UI.card,
    fontSize: 14,
    color: UI.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#6D2CF5',
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  modalButtonText: {
    fontWeight: '600',
    color: UI.text,
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});
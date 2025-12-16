import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { addConnection, getConnections } from '@/scripts/database';
import { UserContext } from './user-context';

type Connection = Record<string, unknown>;

const formatConnectionValue = (value: unknown) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'None';
    }
    return value.join(', ');
  }
  if (value === null || value === undefined) {
    return 'None';
  }
  return String(value);
};

export default function PeopleScreen() {
  const user = useContext(UserContext);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username =
    typeof user?.username === 'string' ? user.username : '';
  const [modalVisible, setModalVisible] = useState(false);
  const [connectionName, setConnectionName] = useState('');
  const [connectionNote, setConnectionNote] = useState('');
  const [connectionEmail, setConnectionEmail] = useState('');
  const [connectionPhone, setConnectionPhone] = useState('');
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
    setConnectionEmail('');
    setConnectionPhone('');
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
        email: connectionEmail ? connectionEmail.trim() : undefined,
        phoneNumber: connectionPhone ? connectionPhone.trim() : undefined,
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
    connectionEmail,
    connectionPhone,
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

  const renderConnection = ({ item }: { item: Connection }) => {
    const entries = Object.entries(item ?? {}).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    );

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {formatConnectionValue(item.username ?? item.id ?? item._id ?? 'Connection')}
        </Text>
        <ScrollView style={styles.cardContent} nestedScrollEnabled>
          {entries.map(([key, value]) => (
            <View key={key} style={styles.cardRow}>
              <Text style={styles.cardKey}>{key}</Text>
              <Text style={styles.cardValue}>{formatConnectionValue(value)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const keyExtractor = (connection: Connection, index: number) =>
    `${connection.id ?? connection._id ?? connection.username ?? index}`;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Connections</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#2f95dc" size="large" style={styles.loader} />
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
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
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
              placeholderTextColor="#888"
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Note"
              value={connectionNote}
              onChangeText={setConnectionNote}
              multiline
              numberOfLines={4}
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              value={connectionEmail}
              onChangeText={setConnectionEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#888"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              value={connectionPhone}
              onChangeText={setConnectionPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#888"
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
    backgroundColor: '#fafafa',
    position: 'relative',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
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
    color: '#555',
    textAlign: 'center',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardContent: {
    maxHeight: 200,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardKey: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  cardValue: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    textAlign: 'right',
  },
  floatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  floatingButtonText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 34,
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
    backgroundColor: '#fff',
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
  },
  modalDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  modalError: {
    color: '#b00020',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    fontSize: 14,
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
    backgroundColor: '#2f95dc',
  },
  modalButtonSecondary: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonText: {
    fontWeight: '600',
    color: '#1f1f1f',
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});
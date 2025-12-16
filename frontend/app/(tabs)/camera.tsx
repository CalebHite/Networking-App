import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useContext, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import { addConnection, createTask } from '@/scripts/database';
import { UserContext } from './user-context';

// Regex to match LinkedIn profile URLs and extract username
const LINKEDIN_PROFILE_REGEX = /^https?:\/\/(?:www\.)?linkedin\.com\/in\/([^/?]+)/;

const extractLinkedInUsername = (url: string): string | null => {
  const match = url.match(LINKEDIN_PROFILE_REGEX);
  return match ? match[1] : null;
};

export default function CameraScreen() {
  const user = useContext(UserContext);
  const username = typeof user?.username === 'string' ? user.username : '';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleLinkedInQR = async (linkedInUrl: string, linkedInUsername: string) => {
    if (!username) {
      setStatusMessage('Please log in to add connections');
      return;
    }

    try {
      // Add the connection
      console.log('Calling addConnection for:', linkedInUsername);
      const connectionResponse = await addConnection({
        username,
        connectionName: linkedInUsername,
        note: `LinkedIn connection\nLinkedIn URL: ${linkedInUrl}`,
      });

      console.log('Connection response:', JSON.stringify(connectionResponse));

      if (!connectionResponse.success) {
        throw new Error(connectionResponse.error || 'Failed to add connection');
      }

      // Create a task with type "Connect"
      console.log('About to call createTask for:', linkedInUsername);
      const taskResponse = await createTask({
        username,
        info: `Connect with ${linkedInUsername} on LinkedIn: ${linkedInUrl}`,
        type: 'Connect',
      });

      console.log('TaskResponse:', JSON.stringify(taskResponse));

      if (!taskResponse.success) {
        throw new Error(taskResponse.error || 'Failed to create task');
      }

      console.log('LinkedIn connection added:', linkedInUsername);
      console.log('Connect task created for:', linkedInUsername);
      setStatusMessage(`Added ${linkedInUsername} as a connection!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add connection';
      console.error('Error adding LinkedIn connection:', message);
      setStatusMessage(`Error: ${message}`);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    
    const url = result.data;
    console.log('QR Code URL:', url);

    // Check if it's a LinkedIn QR code
    const linkedInUsername = extractLinkedInUsername(url);
    if (linkedInUsername) {
      console.log('LinkedIn profile detected:', linkedInUsername);
      await handleLinkedInQR(url, linkedInUsername);
    } else {
      setStatusMessage('QR Code scanned (not a LinkedIn profile)');
    }

    // Reset after 3 seconds to allow scanning again
    setTimeout(() => {
      setScanned(false);
      setStatusMessage(null);
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      {statusMessage && (
        <View style={styles.overlay}>
          <Text style={styles.scannedText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannedText: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});


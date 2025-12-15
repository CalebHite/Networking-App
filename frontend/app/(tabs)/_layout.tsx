import { Tabs } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { login, register } from '@/scripts/database';
import { User, UserContext } from './user-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoginEnabled =
    username.trim().length > 0 && password.trim().length > 0 && !loading;
  const isRegisterEnabled =
    isLoginEnabled &&
    email.trim().length > 0 &&
    phoneNumber.trim().length > 0;

  const handleLogin = async () => {
    if (!isLoginEnabled) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await login({ username, password });
      if (response.success && response.user) {
        setUser(response.user);
        setUsername('');
        setPassword('');
      } else {
        setError(response.error ?? 'Login failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isRegisterEnabled) {
      return;
    }

    const parsedPhone = Number(phoneNumber.trim());
    if (Number.isNaN(parsedPhone)) {
      setError('Phone number must be numeric');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await register({
        username,
        password,
        email,
        phoneNumber: parsedPhone,
      });
      if (response.success && response.user) {
        setUser(response.user);
        setUsername('');
        setPassword('');
        setEmail('');
        setPhoneNumber('');
      } else {
        setError(response.error ?? 'Registration failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loginForm = (
    <View
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? 'light'].background },
      ]}>
      <Text style={styles.heading}>Sign in to continue</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        editable={!loading}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Phone number"
        style={styles.input}
        keyboardType="phone-pad"
      />
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button
            title={loading ? 'Logging in…' : 'Log in'}
            onPress={handleLogin}
            disabled={!isLoginEnabled}
          />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title={loading ? 'Registering…' : 'Register'}
            onPress={handleRegister}
            disabled={!isRegisterEnabled}
          />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  const tabBarOptions = useMemo(
    () => ({
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: false,
      tabBarButton: HapticTab,
    }),
    [colorScheme]
  );

  if (!user) {
    return loginForm;
  }

  return (
      <UserContext.Provider value={user}>
        <Tabs screenOptions={tabBarOptions}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="camera"
            options={{
              title: 'Camera',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="people"
            options={{
              title: 'People',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
            }}
          />
        </Tabs>
      </UserContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  error: {
    marginTop: 12,
    color: '#b00020',
    fontWeight: '600',
  },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
});

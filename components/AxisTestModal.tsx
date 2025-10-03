import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { doorControlService } from '../services/DoorControlService';

interface AxisTestModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AxisTestModal({ visible, onClose }: AxisTestModalProps) {
  const [ip, setIp] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>('');

  const handleTest = async () => {
    setIsTesting(true);
    setResultMessage('');
    try {
      const res = await doorControlService.testAxisIntercomConnection(ip, username, password, 'axis');
      if (res.success) {
        setResultMessage(
          `Conexión OK. Endpoints OK: ${res.deviceInfo?.successfulEndpoints}/${res.deviceInfo?.endpointsTested}`
        );
      } else {
        setResultMessage(`Fallo: ${res.message}${res.error ? ' - ' + res.error : ''}`);
      }
    } catch (e: any) {
      setResultMessage(`Error: ${e?.message || e}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PRUEBA INTERCOM AXIS</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>IP</Text>
              <TextInput
                style={styles.input}
                placeholder="192.168.1.130"
                value={ip}
                onChangeText={setIp}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, isTesting && styles.buttonDisabled]} onPress={handleTest} disabled={isTesting}>
                {isTesting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>PROBAR</Text>
                )}
              </TouchableOpacity>
            </View>

            {resultMessage ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>{resultMessage}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#495057',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: {
    minWidth: 90,
    color: '#495057',
    fontWeight: '600',
    fontSize: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#212529',
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#17A2B8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  resultBox: {
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderRadius: 6,
    padding: 10,
  },
  resultText: {
    color: '#1976D2',
    fontSize: 12,
  },
});



import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { User, X } from 'lucide-react-native';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ visible, onClose, onSuccess }: LoginModalProps) {
  const [ordinal, setOrdinal] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Credenciales de prueba
  const TEST_CREDENTIALS = {
    ordinal: 'admin',
    password: '123456'
  };

  const handleLogin = () => {
    setError('');
    setIsLoading(true);

    // Simular validación
    setTimeout(() => {
      if (ordinal === TEST_CREDENTIALS.ordinal && 
          password === TEST_CREDENTIALS.password) {
        // Login exitoso
        setOrdinal('');
        setPassword('');
        setError('');
        onSuccess();
      } else {
        setError('Ordinal o contraseña incorrectos');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleClose = () => {
    setOrdinal('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ACCESO AL SISTEMA</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Credenciales de prueba info */}
            <View style={styles.testCredentials}>
              <Text style={styles.testCredentialsTitle}>Credenciales de prueba:</Text>
              <Text style={styles.testCredentialsText}>Ordinal: admin</Text>
              <Text style={styles.testCredentialsText}>Contraseña: 123456</Text>
            </View>

            {/* Error Display */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>ORDINAL:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={ordinal}
                  onChangeText={setOrdinal}
                  placeholder="Ingrese ordinal"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CONTRASEÑA:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ingrese contraseña"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                <User size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'VALIDANDO...' : 'ACCEDER'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    backgroundColor: '#495057',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 32,
  },
  testCredentials: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  testCredentialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  testCredentialsText: {
    fontSize: 14,
    color: '#1976D2',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '500',
  },
  formContainer: {
    gap: 24,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: '#212529',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#212529',
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 40,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
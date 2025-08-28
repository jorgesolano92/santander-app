import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { User, X } from 'lucide-react-native';
import { Image } from 'react-native';
import { useWindowDimensions } from 'react-native';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ visible, onClose, onSuccess }: LoginModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

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
      width: isSmallTablet ? '90%' : isLargeTablet ? '70%' : '80%',
      maxWidth: isSmallTablet ? 600 : isLargeTablet ? 900 : 750,
      minWidth: isSmallTablet ? 500 : isLargeTablet ? 700 : 600,
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
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 14 : isLargeTablet ? 20 : 16,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      padding: isSmallTablet ? 24 : isLargeTablet ? 40 : 32,
      paddingVertical: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
    },
    santanderLogo: {
      width: isSmallTablet ? 260 : isLargeTablet ? 380 : 320,
      height: isSmallTablet ? 75 : isLargeTablet ? 110 : 92,
    },
    testCredentials: {
      backgroundColor: '#E3F2FD',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#2196F3',
    },
    testCredentialsTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1976D2',
      marginBottom: 6,
    },
    testCredentialsText: {
      fontSize: 13,
      color: '#1976D2',
      fontFamily: 'monospace',
      marginBottom: 4,
    },
    errorContainer: {
      backgroundColor: '#FFEBEE',
      padding: 10,
      borderRadius: 8,
      marginBottom: 14,
      borderLeftWidth: 4,
      borderLeftColor: '#F44336',
    },
    errorText: {
      fontSize: 13,
      color: '#C62828',
      fontWeight: '500',
    },
    formContainer: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 24,
    },
    inputContainer: {
      flex: 1,
    },
    inputWrapper: {
      backgroundColor: '#F8F9FA',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#E9ECEF',
      paddingHorizontal: 14,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#6C757D',
      marginBottom: 4,
      marginTop: 6,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    textInput: {
      fontSize: 16,
      color: '#212529',
      paddingVertical: 12,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
      minHeight: 20,
      fontWeight: '500',
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    closeButtonSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    closeButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    loginButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#495057',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

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

          <View style={styles.content}>
            {/* Santander Logo */}
            <View style={styles.logoSection}>
              <Image 
                source={require('@/assets/images/banco-santander-seeklogo.png')}
                style={styles.santanderLogo}
                resizeMode="contain"
              />
            </View>

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
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>ORDINAL</Text>
                  <TextInput
                    style={styles.textInput}
                    value={ordinal}
                    onChangeText={setOrdinal}
                    placeholder="Ingrese ordinal"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>CONTRASEÑA</Text>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Ingrese contraseña"
                    secureTextEntry={true}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity 
                style={styles.closeButtonSecondary}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>CERRAR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                <User size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'VALIDANDO...' : 'ACCEDER'}
                </Text>
        </View>
      </View>
    </Modal>
  );
}
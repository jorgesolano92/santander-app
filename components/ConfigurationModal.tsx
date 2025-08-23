import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { User, X, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import DetailedConfigurationModal from './DetailedConfigurationModal';

interface ConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: ConfigData) => void;
  officeNumber?: string;
}

interface ConfigData {
  username: string;
  password: string;
  officeNumber: string;
}

export default function ConfigurationModal({ visible, onClose, onSave, officeNumber = "1234" }: ConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigData>({
    username: '',
    password: '',
    officeNumber: officeNumber
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailedConfig, setShowDetailedConfig] = useState(false);

  // Credenciales de prueba
  const TEST_CREDENTIALS = {
    username: 'admin',
    password: '123456'
  };

  const handleAccept = () => {
    setError('');
    setIsLoading(true);

    // Simular validación
    setTimeout(() => {
      if (config.username === TEST_CREDENTIALS.username && 
          config.password === TEST_CREDENTIALS.password) {
        // En lugar de cerrar, abrir la vista detallada
        setShowDetailedConfig(true);
        setConfig({ username: '', password: '', officeNumber: config.officeNumber });
      } else {
        setError('Usuario o contraseña incorrectos');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleUpdateVersion = () => {
    // Implementar lógica de actualización
  };

  const handleDetailedConfigClose = () => {
    setShowDetailedConfig(false);
    onClose();
  };

  const handleDetailedConfigSave = (config: ConfigData) => {
    onSave(config);
    setShowDetailedConfig(false);
    onClose();
  };

  return (
    <View style={{ flex: 1 }}>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>CONFIGURACIÓN</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
            {/* Title */}
            <Text style={styles.pageTitle}>CONFIGURACION</Text>

            {/* Office Card */}
            <View style={styles.officeCard}>
              <View style={styles.officePlaceholder} />
              <View style={styles.officeContent}>
                <Text style={styles.officeTitle}>OFICINA N° {config.officeNumber}</Text>
                <Text style={styles.officeSubtitle}>Por favor introduzca usuario y contraseña</Text>
              </View>
            </View>

            {/* Credenciales de prueba info */}
            <View style={styles.testCredentials}>
              <Text style={styles.testCredentialsTitle}>Credenciales de prueba:</Text>
              <Text style={styles.testCredentialsText}>Usuario: admin</Text>
              <Text style={styles.testCredentialsText}>Contraseña: 123456</Text>
            </View>

            {/* Error Display */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>USUARIO:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={config.username}
                  onChangeText={(text) => setConfig(prev => ({ ...prev, username: text }))}
                  placeholder="Ingrese usuario"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CONTRASEÑA:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={config.password}
                  onChangeText={(text) => setConfig(prev => ({ ...prev, password: text }))}
                  placeholder="Ingrese contraseña"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>

              {/* Accept Button */}
              <TouchableOpacity 
                style={[styles.acceptButton, isLoading && styles.acceptButtonDisabled]} 
                onPress={handleAccept}
                disabled={isLoading}
              >
                <User size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>
                  {isLoading ? 'VALIDANDO...' : 'ACEPTAR'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.updateButton} onPress={handleUpdateVersion}>
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>ACTUALIZAR VERSION</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={onClose}>
                <ArrowLeft size={20} color="#FFFFFF" />
                <Text style={styles.backButtonText}>VOLVER</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Text */}
            <Text style={styles.footerText}>
              Pantalla de configuración, solo se podrá acceder a esta pantalla después de meter un usuario y contraseña
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Detailed Configuration Modal */}
      <DetailedConfigurationModal
        visible={showDetailedConfig}
        onClose={handleDetailedConfigClose}
        onSave={handleDetailedConfigSave}
        officeNumber={config.officeNumber}
      />
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notificationsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 32,
    minHeight: 600,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  officeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  officePlaceholder: {
    width: 120,
    height: 90,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    marginRight: 24,
  },
  officeContent: {
    flex: 1,
  },
  officeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  officeSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '400',
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
  formSection: {
    marginBottom: 32,
  },
  formColumns: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 24,
  },
  formColumn: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
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
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
    gap: 8,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'center',
    marginTop: 24,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingVertical: 20,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#495057',
    paddingVertical: 20,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'left',
    fontWeight: '400',
    lineHeight: 20,
  },
});
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DetailedConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: DetailedConfigData) => void;
  officeNumber?: string;
}

interface DetailedConfigData {
  officeNumber: string;
  direccionIP1: string;
  tipoComm1: 'TCP/IP' | 'RS485' | 'Wireless';
  tipoSucursal1: 'Principal' | 'Secundaria' | 'Cajero';
  configurarWifi1: 'Si' | 'No';
  direccionIP2: string;
  tipoComm2: 'TCP/IP' | 'RS485' | 'Wireless';
  tipoSucursal2: 'Principal' | 'Secundaria' | 'Cajero';
  configurarWifi2: 'Si' | 'No';
  direccionIP3?: string;
  tipoComm3?: 'TCP/IP' | 'RS485' | 'Wireless';
  tipoSucursal3?: 'Principal' | 'Secundaria' | 'Cajero';
  configurarWifi3?: 'Si' | 'No';
  direccionIP4?: string;
  tipoComm4?: 'TCP/IP' | 'RS485' | 'Wireless';
  tipoSucursal4?: 'Principal' | 'Secundaria' | 'Cajero';
  configurarWifi4?: 'Si' | 'No';
}

export default function DetailedConfigurationModal({ 
  visible, 
  onClose, 
  onSave, 
  officeNumber = "1234" 
}: DetailedConfigurationModalProps) {
  const [config, setConfig] = useState<DetailedConfigData>({
    officeNumber: officeNumber,
    direccionIP1: '',
    tipoComm1: 'TCP/IP',
    tipoSucursal1: 'Principal',
    configurarWifi1: 'No',
    direccionIP2: '',
    tipoComm2: 'TCP/IP',
    tipoSucursal2: 'Principal',
    configurarWifi2: 'No',
  });

  const isMounted = useRef(false);

  // Cargar configuración guardada al abrir el modal
  useEffect(() => {
    isMounted.current = true;
    if (visible) {
      loadSavedConfiguration();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [visible]);

  const loadSavedConfiguration = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('detailed_door_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        if (isMounted.current) {
          setConfig(prev => ({ ...prev, ...parsedConfig, officeNumber: officeNumber }));
        }
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  };

  const saveConfiguration = async (configToSave: DetailedConfigData) => {
    try {
      await AsyncStorage.setItem('detailed_door_config', JSON.stringify(configToSave));
      console.log('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
    }
  };

  const handleSave = async () => {
    // Guardar en localStorage
    await saveConfiguration(config);
    onSave(config);
    console.log('📋 Configuración completa guardada:', config);
  };

  const updateConfig = (field: keyof DetailedConfigData, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SAIMA SEGURIDAD – Panel de control puertas SECURA</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={styles.pageTitle}>CONFIGURACION</Text>

          {/* Office Card */}
          <View style={styles.officeCard}>
            <View style={styles.officePlaceholder} />
            <View style={styles.officeContent}>
              <Text style={styles.officeTitle}>OFICINA N° {config.officeNumber}</Text>
              <Text style={styles.officeSubtitle}>Datos generales de la Sucursal, Nombre, direccion, ect...</Text>
            </View>
          </View>

          {/* Configuration Fields */}
          <View style={styles.fieldsContainer}>
            {/* Left Column */}
            <View style={styles.column}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>DIRECCION IP ORDENADOR DE PUERTAS:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={config.direccionIP1}
                  onChangeText={(text) => updateConfig('direccionIP1', text)}
                  placeholder="192.168.1.100"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>TIPO DE COMUNICACION:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.tipoComm1}
                    onValueChange={(value) => updateConfig('tipoComm1', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="TCP/IP" value="TCP/IP" />
                    <Picker.Item label="RS485" value="RS485" />
                    <Picker.Item label="Wireless" value="Wireless" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>TIPO DE SUCURSAL:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.tipoSucursal1}
                    onValueChange={(value) => updateConfig('tipoSucursal1', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Principal" value="Principal" />
                    <Picker.Item label="Secundaria" value="Secundaria" />
                    <Picker.Item label="Cajero" value="Cajero" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CONFIGURAR WIFI:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.configurarWifi1}
                    onValueChange={(value) => updateConfig('configurarWifi1', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="No" value="No" />
                    <Picker.Item label="Sí" value="Si" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.column}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>DIRECCION IP ORDENADOR DE PUERTAS:</Text>
                <View style={styles.inputUnderline} />
                <TextInput
                  style={styles.textInput}
                  value={config.direccionIP2}
                  onChangeText={(text) => updateConfig('direccionIP2', text)}
                  placeholder="192.168.1.101"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>TIPO DE COMUNICACION:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.tipoComm2}
                    onValueChange={(value) => updateConfig('tipoComm2', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="TCP/IP" value="TCP/IP" />
                    <Picker.Item label="RS485" value="RS485" />
                    <Picker.Item label="Wireless" value="Wireless" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>TIPO DE SUCURSAL:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.tipoSucursal2}
                    onValueChange={(value) => updateConfig('tipoSucursal2', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Principal" value="Principal" />
                    <Picker.Item label="Secundaria" value="Secundaria" />
                    <Picker.Item label="Cajero" value="Cajero" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CONFIGURAR WIFI:</Text>
                <View style={styles.inputUnderline} />
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.configurarWifi2}
                    onValueChange={(value) => updateConfig('configurarWifi2', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="No" value="No" />
                    <Picker.Item label="Sí" value="Si" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>VOLVER</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>GUARDAR</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            Pantalla de configuración, solo se podrá acceder a esta pantalla después de meter un usuario y contraseña
          </Text>
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
    backgroundColor: '#EC1C24',
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
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 32,
    paddingBottom: 64,
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
    marginBottom: 48,
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
  fieldsContainer: {
    flexDirection: 'row',
    gap: 64,
    marginBottom: 48,
  },
  column: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 32,
    position: 'relative',
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
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    minHeight: 24,
  },
  pickerContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    minHeight: 24,
  },
  picker: {
    fontSize: 16,
    color: '#212529',
    backgroundColor: 'transparent',
    marginLeft: -16,
    marginRight: -16,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 24,
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
  saveButton: {
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
  saveButtonText: {
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
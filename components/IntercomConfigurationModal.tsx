import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Camera, Phone } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useWindowDimensions } from 'react-native';

export interface IntercomConfig {
  name: string;
  cameraIP: string;
  httpPort: number;
  httpsPort: number;
  onvifUsername: string;
  onvifPassword: string;
  rtspPort: number;
  videoProfile: 'MainStream' | 'SubStream' | 'Auto';
  sipUri: string;
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
  enableOnvifEvents: boolean;
  enableTLS: boolean;
  preferredResolution: string;
  preferredFPS: number;
  defaultOpenTime: number;
  doorControlUsername: string;
  doorControlPassword: string;
  doorControlPCB: number;
  doorControlSwitch: number;
}

interface IntercomConfigurationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: IntercomConfig) => void;
  doorName: string;
  initialConfig?: IntercomConfig;
}

const defaultIntercomConfig: IntercomConfig = {
  name: '',
  cameraIP: '',
  httpPort: 80,
  httpsPort: 443,
  onvifUsername: 'admin',
  onvifPassword: '',
  rtspPort: 554,
  videoProfile: 'MainStream',
  sipUri: '',
  sipUsername: '',
  sipPassword: '',
  sipDomain: '',
  enableOnvifEvents: true,
  enableTLS: false,
  preferredResolution: '1920x1080',
  preferredFPS: 25,
  defaultOpenTime: 5,
  doorControlUsername: 'Scati2023',
  doorControlPassword: 'Scati2023',
  doorControlPCB: 1,
  doorControlSwitch: 1,
};

export default function IntercomConfigurationModal({ 
  visible, 
  onClose, 
  onSave, 
  doorName,
  initialConfig 
}: IntercomConfigurationModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [config, setConfig] = useState<IntercomConfig>(defaultIntercomConfig);

  useEffect(() => {
    if (visible) {
      if (initialConfig) {
        setConfig(initialConfig);
      } else {
        setConfig({
          ...defaultIntercomConfig,
          name: `Intercomunicador ${doorName}`,
        });
      }
    }
  }, [visible, initialConfig, doorName]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const updateConfig = (field: keyof IntercomConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

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
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
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
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingBottom: 40,
    },
    section: {
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    sectionTitle: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    twoColumnSection: {
      flexDirection: 'row',
      gap: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      marginBottom: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    leftColumn: {
      flex: 1,
    },
    rightColumn: {
      flex: 1,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      gap: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
    },
    inputLabel: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
      minWidth: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
    },
    textInput: {
      flex: 1,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 8 : 7,
      fontFamily: 'monospace',
    },
    numberInput: {
      width: isSmallTablet ? 80 : isLargeTablet ? 100 : 90,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      paddingHorizontal: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 8 : 7,
      fontFamily: 'monospace',
      textAlign: 'center',
    },
    pickerContainer: {
      flex: 1,
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#CED4DA',
      borderRadius: 4,
      minHeight: isSmallTablet ? 32 : isLargeTablet ? 40 : 36,
    },
    picker: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    switchLabel: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
      flex: 1,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: isSmallTablet ? 8 : isLargeTablet ? 16 : 12,
      marginTop: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
    },
    backButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#6C757D',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#6C757D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    backButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#28A745',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: isSmallTablet ? 4 : isLargeTablet ? 8 : 6,
      shadowColor: '#28A745',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 14 : 13,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

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
          <Text style={styles.headerTitle}>CONFIGURACIÓN INTERCOMUNICADOR - {doorName.toUpperCase()}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Información General */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Camera size={20} color="#495057" />
              <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Nombre:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.name}
                  onChangeText={(text) => updateConfig('name', text)}
                  placeholder={`Intercomunicador ${doorName}`}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>IP Cámara:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.cameraIP}
                  onChangeText={(text) => updateConfig('cameraIP', text)}
                  placeholder="192.168.1.120"
                />
              </View>
            </View>
          </View>

          {/* Sección en dos columnas */}
          <View style={styles.twoColumnSection}>
            {/* Columna Izquierda - Configuración de Red */}
            <View style={styles.leftColumn}>
              <View style={styles.sectionTitle}>
                <Text style={styles.sectionTitle}>CONFIGURACIÓN DE RED</Text>
              </View>
              <View style={styles.sectionCard}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Puerto HTTP:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={config.httpPort.toString()}
                    onChangeText={(text) => updateConfig('httpPort', parseInt(text) || 80)}
                    placeholder="80"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Puerto HTTPS:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={config.httpsPort.toString()}
                    onChangeText={(text) => updateConfig('httpsPort', parseInt(text) || 443)}
                    placeholder="443"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Puerto RTSP:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={config.rtspPort.toString()}
                    onChangeText={(text) => updateConfig('rtspPort', parseInt(text) || 554)}
                    placeholder="554"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Columna Derecha - Credenciales ONVIF */}
            <View style={styles.rightColumn}>
              <View style={styles.sectionTitle}>
                <Text style={styles.sectionTitle}>CREDENCIALES ONVIF</Text>
              </View>
              <View style={styles.sectionCard}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Usuario:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={config.onvifUsername}
                    onChangeText={(text) => updateConfig('onvifUsername', text)}
                    placeholder="admin"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Contraseña:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={config.onvifPassword}
                    onChangeText={(text) => updateConfig('onvifPassword', text)}
                    placeholder="password"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Perfil Video:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={config.videoProfile}
                      onValueChange={(value) => updateConfig('videoProfile', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="MainStream (Alta calidad)" value="MainStream" />
                      <Picker.Item label="SubStream (Baja calidad)" value="SubStream" />
                      <Picker.Item label="Automático" value="Auto" />
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Configuración SIP */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Phone size={20} color="#495057" />
              <Text style={styles.sectionTitle}>CONFIGURACIÓN SIP (VOZ BIDIRECCIONAL)</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>SIP URI:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sipUri}
                  onChangeText={(text) => updateConfig('sipUri', text)}
                  placeholder="sip:intercom1@pbx.local"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Usuario SIP:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sipUsername}
                  onChangeText={(text) => updateConfig('sipUsername', text)}
                  placeholder="intercom1"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Contraseña SIP:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sipPassword}
                  onChangeText={(text) => updateConfig('sipPassword', text)}
                  placeholder="sippassword"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Dominio SIP:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sipDomain}
                  onChangeText={(text) => updateConfig('sipDomain', text)}
                  placeholder="pbx.local"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Configuración SDIO12 */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitle}>CONFIGURACIÓN CONTROL DE PUERTAS (SDIO12)</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Usuario SDIO12:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.doorControlUsername}
                  onChangeText={(text) => updateConfig('doorControlUsername', text)}
                  placeholder="Scati2023"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Contraseña SDIO12:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.doorControlPassword}
                  onChangeText={(text) => updateConfig('doorControlPassword', text)}
                  placeholder="Scati2023"
                  secureTextEntry={true}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>PCB:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.doorControlPCB}
                    onValueChange={(value) => updateConfig('doorControlPCB', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="PCB 01" value={1} />
                    <Picker.Item label="PCB 02" value={2} />
                    <Picker.Item label="PCB 03" value={3} />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Switch:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.doorControlSwitch}
                    onValueChange={(value) => updateConfig('doorControlSwitch', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Switch 01" value={1} />
                    <Picker.Item label="Switch 02" value={2} />
                    <Picker.Item label="Switch 03" value={3} />
                    <Picker.Item label="Switch 04" value={4} />
                    <Picker.Item label="Switch 05" value={5} />
                    <Picker.Item label="Switch 06" value={6} />
                    <Picker.Item label="Switch 07" value={7} />
                    <Picker.Item label="Switch 08" value={8} />
                    <Picker.Item label="Switch 09" value={9} />
                    <Picker.Item label="Switch 10" value={10} />
                    <Picker.Item label="Switch 11" value={11} />
                    <Picker.Item label="Switch 12" value={12} />
                  </Picker>
                </View>
              </View>
            </View>
          </View>

          {/* Configuración Avanzada */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitle}>CONFIGURACIÓN AVANZADA</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Habilitar eventos ONVIF</Text>
                <Switch
                  value={config.enableOnvifEvents}
                  onValueChange={(value) => updateConfig('enableOnvifEvents', value)}
                  trackColor={{ false: '#CED4DA', true: '#28A745' }}
                  thumbColor={config.enableOnvifEvents ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Forzar TLS/HTTPS</Text>
                <Switch
                  value={config.enableTLS}
                  onValueChange={(value) => updateConfig('enableTLS', value)}
                  trackColor={{ false: '#CED4DA', true: '#28A745' }}
                  thumbColor={config.enableTLS ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Resolución:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.preferredResolution}
                  onChangeText={(text) => updateConfig('preferredResolution', text)}
                  placeholder="1920x1080"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>FPS:</Text>
                <TextInput
                  style={styles.numberInput}
                  value={config.preferredFPS.toString()}
                  onChangeText={(text) => updateConfig('preferredFPS', parseInt(text) || 25)}
                  placeholder="25"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Tiempo apertura (s):</Text>
                <TextInput
                  style={styles.numberInput}
                  value={config.defaultOpenTime.toString()}
                  onChangeText={(text) => updateConfig('defaultOpenTime', parseInt(text) || 5)}
                  placeholder="5"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={20} color="#FFFFFF" />
              <Text style={styles.backButtonText}>CANCELAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
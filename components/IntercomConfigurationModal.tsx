import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Switch, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Save, X, Camera, Phone } from 'lucide-react-native';
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
  rtspPath?: string; // Ruta RTSP personalizada (p.ej. axis-media/media.amp?...)
  snapshotPath?: string; // Ruta HTTP(S) de snapshot por modelo
  /** Solo web: URL del proxy Node (FFmpeg→HLS). */
  proxyUrl?: string;
  /** Puerto Net SDK del fabricante (p. ej. 9008 en TD-E3110). */
  sdkPort?: number;
  /** Usuario SDK; si vacío, se usa onvifUsername. */
  sdkUsername?: string;
  /** Contraseña SDK; si vacía, se usa onvifPassword. */
  sdkPassword?: string;
  /** Canal de voz/intercom en el SDK (-1 = IPC/videoportero, 0/1 = canal NVR). */
  voiceChannel?: number;
  /** bridge = PC industrial + audio_bridge.py; sdk = SDK nativo Android (TX suele fallar). */
  intercomMode?: 'bridge' | 'sdk';
  /** URL WebSocket del puente (ej. ws://192.168.1.10:8765 o IP ZeroTier). */
  bridgeUrl?: string;
  /** Micrófono tablet en modo puente: voice_communication (AGC) o mic (más crudo). */
  bridgeMicSource?: 'voice_communication' | 'mic';
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
  hasAudio?: boolean; // Indica si la cámara tiene audio (por defecto true)
  doorControlManualMode?: boolean; // true = control manual (permanente), false = pulso automático (temporal)
  doorControlPulseTime?: number; // Tiempo de pulso en segundos (por defecto 1.0)
  /** Estrategia de apertura en modo manual: set_output (OUT) o set_rule (regla panel). */
  doorControlAction?: 'set_output' | 'set_rule';
  /** rule_key usada cuando doorControlAction === set_rule. */
  doorControlRuleKey?: string;
  /** Solo para set_output: auto = pulso con auto-off, manual = queda ON hasta cerrar. */
  doorOutputMode?: 'auto' | 'manual';
  deviceType?: 'AXIS-I8116-E' | 'SAFIRE' | 'GENERIC'; // Tipo de dispositivo para control de audio
  supportsIntercom?: boolean; // true si soporta intercomunicación bidireccional
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
  cameraIP: '192.168.1.120',
  httpPort: 80,
  httpsPort: 443,
  onvifUsername: 'ceroideas',
  onvifPassword: 'Cero21264712-',
  rtspPort: 554,
  videoProfile: 'MainStream',
  rtspPath: '',
  snapshotPath: '',
  proxyUrl: 'http://localhost:3001',
  sdkPort: 9008,
  sdkUsername: 'admin',
  sdkPassword: '',
  voiceChannel: -1,
  intercomMode: 'bridge',
  bridgeUrl: 'ws://192.168.1.10:8765',
  bridgeMicSource: 'voice_communication',
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
  hasAudio: true, // Por defecto las cámaras tienen audio
  doorControlManualMode: false, // Por defecto pulso automático
  doorControlPulseTime: 1.0, // 1 segundo por defecto
  doorControlAction: 'set_output',
  doorControlRuleKey: '',
  doorOutputMode: 'auto',
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
  const [voiceChannelText, setVoiceChannelText] = useState('-1');

  useEffect(() => {
    if (visible) {
      if (initialConfig) {
        setConfig(initialConfig);
        setVoiceChannelText(String(initialConfig.voiceChannel ?? -1));
      } else {
        setConfig({
          ...defaultIntercomConfig,
          name: `Intercomunicador ${doorName}`,
        });
        setVoiceChannelText('-1');
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
      flex: 1,
      flexShrink: 1,
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      marginRight: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconButton: {
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
      width: '100%',
      height: isSmallTablet ? 48 : isLargeTablet ? 52 : 50,
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      color: '#212529',
    },
    pickerRowVertical: {
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
    },
    pickerLabel: {
      fontSize: isSmallTablet ? 11 : isLargeTablet ? 13 : 12,
      fontWeight: '600',
      color: '#495057',
      marginBottom: 4,
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
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleSave}>
              <Save size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
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

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Ruta RTSP (opcional):</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.rtspPath || ''}
                  onChangeText={(text) => updateConfig('rtspPath', text)}
                  placeholder="profile1"
                  autoCapitalize="none"
                />
              </View>

              {/* Ruta Snapshot oculta - no se usa */}

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>URL puente WS:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.bridgeUrl || ''}
                  onChangeText={(text) => updateConfig('bridgeUrl', text)}
                  placeholder="ws://192.168.1.10:8765"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.pickerRowVertical}>
                <Text style={styles.pickerLabel}>Micrófono tablet:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
                    selectedValue={config.bridgeMicSource ?? 'voice_communication'}
                    onValueChange={(v) => updateConfig('bridgeMicSource', v)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Voz (AGC / anti-eco)" value="voice_communication" />
                    <Picker.Item label="Mic crudo (menos procesado)" value="mic" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Puerto SDK:</Text>
                <TextInput
                  style={styles.textInput}
                  value={String(config.sdkPort ?? 9008)}
                  onChangeText={(text) => {
                    const n = parseInt(text.replace(/\D/g, ''), 10);
                    updateConfig('sdkPort', Number.isFinite(n) ? n : 9008);
                  }}
                  placeholder="9008"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Usuario SDK:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sdkUsername || ''}
                  onChangeText={(text) => updateConfig('sdkUsername', text)}
                  placeholder="admin (vacío = ONVIF)"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Contraseña SDK:</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.sdkPassword || ''}
                  onChangeText={(text) => updateConfig('sdkPassword', text)}
                  placeholder="vacío = ONVIF"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Canal voz SDK:</Text>
                <TextInput
                  style={styles.textInput}
                  value={voiceChannelText}
                  onChangeText={(text) => {
                    setVoiceChannelText(text);
                    const t = text.trim();
                    if (t === '' || t === '-') return;
                    if (!/^-?\d+$/.test(t)) return;
                    const n = parseInt(t, 10);
                    if (Number.isFinite(n)) {
                      updateConfig('voiceChannel', n);
                    }
                  }}
                  onBlur={() => {
                    const t = voiceChannelText.trim();
                    if (t === '' || t === '-') {
                      updateConfig('voiceChannel', -1);
                      setVoiceChannelText('-1');
                      return;
                    }
                    if (/^-?\d+$/.test(t)) {
                      const n = parseInt(t, 10);
                      updateConfig('voiceChannel', n);
                      setVoiceChannelText(String(n));
                    }
                  }}
                  placeholder="-1 (IPC)"
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {Platform.OS === 'web' && (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>URL Proxy (solo web):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={config.proxyUrl || ''}
                    onChangeText={(text) => updateConfig('proxyUrl', text)}
                    placeholder="http://localhost:3001"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Ayuda contextual y botones rápidos */}
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11, color: '#6C757D', marginBottom: 6 }}>
                  Ejemplos de rutas por fabricante:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#F1F3F5', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E9ECEF' }}
                    onPress={() => updateConfig('snapshotPath', 'ISAPI/Streaming/channels/101/picture')}
                  >
                    <Text style={{ fontSize: 11, color: '#212529' }}>Hik/ISAPI: ISAPI/Streaming/channels/101/picture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#F1F3F5', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E9ECEF' }}
                    onPress={() => updateConfig('snapshotPath', 'axis-cgi/jpg/image.cgi')}
                  >
                    <Text style={{ fontSize: 11, color: '#212529' }}>Axis: axis-cgi/jpg/image.cgi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#F1F3F5', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E9ECEF' }}
                    onPress={() => updateConfig('snapshotPath', 'cgi-bin/snapshot.cgi?channel=1')}
                  >
                    <Text style={{ fontSize: 11, color: '#212529' }}>IDIS/Dahua: cgi-bin/snapshot.cgi?channel=1</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ marginTop: 10, fontSize: 11, color: '#6C757D' }}>
                  En Android/tablet el vídeo usa RTSP directo (puerto {config.rtspPort}). En web, proxy HLS.
                </Text>
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

          {/* Configuración Control de Puertas */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitle}>CONFIGURACIÓN CONTROL DE PUERTAS</Text>
            </View>
            <View style={styles.sectionCard}>
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

              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Acción:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={config.doorControlAction || 'set_output'}
                    onValueChange={(value) => updateConfig('doorControlAction', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="set_output (OUT)" value="set_output" />
                    <Picker.Item label="set_rule (regla panel)" value="set_rule" />
                  </Picker>
                </View>
              </View>

              {(config.doorControlAction || 'set_output') === 'set_rule' ? (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Rule key:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={config.doorControlRuleKey || ''}
                    onChangeText={(text) => updateConfig('doorControlRuleKey', text)}
                    placeholder="interfono_puerta_calle_interior"
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Modo OUT:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={config.doorOutputMode || 'auto'}
                      onValueChange={(value) => updateConfig('doorOutputMode', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Auto (pulso + auto OFF)" value="auto" />
                      <Picker.Item label="Manual (ABRIR/CERRAR)" value="manual" />
                    </Picker>
                  </View>
                </View>
              )}
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
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Cámara con audio (RTSP)</Text>
                <Switch
                  value={config.hasAudio !== false}
                  onValueChange={(value) => updateConfig('hasAudio', value)}
                  trackColor={{ false: '#CED4DA', true: '#28A745' }}
                  thumbColor={config.hasAudio !== false ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
              
              {((config.doorControlAction || 'set_output') === 'set_output' &&
                (config.doorOutputMode || 'auto') === 'auto') && (
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Tiempo auto-OFF (seg):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={config.doorControlPulseTime?.toString() || '1.0'}
                    onChangeText={(value) => {
                      const numValue = parseFloat(value) || 1.0;
                      updateConfig('doorControlPulseTime', Math.max(0.1, Math.min(30, numValue)));
                    }}
                    keyboardType="decimal-pad"
                    placeholder="1.0"
                  />
                </View>
              )}
              
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

        </ScrollView>
      </View>
    </Modal>
  );
}
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Image } from 'react-native';

interface ModeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onModeSelect: (mode: string) => void;
}

interface ModeOption {
  id: string;
  category: 'COMERCIAL' | 'EXTENDIDO' | 'ATM' | 'CERRADO' | 'CARGA_CAJERO' | 'EMERGENCIA';
  name: string;
  description: string;
}

const modeOptions: ModeOption[] = [
  // MODO COMERCIAL
  {
    id: 'comercial_independiente',
    category: 'COMERCIAL',
    name: 'INDEPENDIENTE',
    description: 'La puerta P1 y la puerta P2 actúan de forma independiente, tanto si se va en dirección entrada como en dirección salida. No es necesario pulsar botones de Visor Voxter o Videoporteros, dado que los detectores de movimiento actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas no trabajan en modo esclusa; es decir las puertas abren independientemente de si la otra puerta está abierta o cerrada.'
  },
  {
    id: 'comercial_automatico',
    category: 'COMERCIAL',
    name: 'AUTOMÁTICO',
    description: 'La puerta P1 y la puerta P2 actúan de forma automática, tanto si se va en dirección entrada como en dirección salida. No es necesario pulsar botones de Visor Voxter o Videoporteros, dado que los detectores de movimiento actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  {
    id: 'comercial_semiautomatico',
    category: 'COMERCIAL',
    name: 'SEMIAUTOMÁTICO',
    description: 'La puerta P1 y la puerta P2 actúan de forma semiautomática, es decir, si se va en dirección entrada, será necesario pulsar el botón de llamada de los Videoporteros ubicados en la parte exterior de las puertas. En el caso de ir en dirección de salida, las puertas funcionarán de forma automática mediante los detectores de movimiento, los cuales actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  {
    id: 'comercial_manual',
    category: 'COMERCIAL',
    name: 'MANUAL',
    description: 'La puerta P1 y la puerta P2 actúan de forma manual, es decir, tanto si se va en dirección entrada como de salida, será necesario pulsar el botón de llamada de los Videoporteros ubicados en la parte exterior de las puertas o los pulsadores retroiluminados ubicados en el interior de las puertas. Los detectores de movimiento interiores y exteriores actuarán sólo en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  
  // MODO EXTENDIDO
  {
    id: 'extendido_semiautomatico',
    category: 'EXTENDIDO',
    name: 'SEMIAUTOMÁTICO',
    description: 'La puerta P1 y la puerta P2 actúan de forma semiautomática, es decir, si se va en dirección entrada, será necesario pulsar el botón de llamada de los video porteros ubicados en la parte exterior de las puertas. En el caso de ir en dirección de salida, las puertas funcionarán de forma automática mediante los detectores de movimiento, los cuales actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  {
    id: 'extendido_manual',
    category: 'EXTENDIDO',
    name: 'MANUAL',
    description: 'La puerta P1 y la puerta P2 actúan de forma manual, es decir, tanto si se va en dirección entrada como de salida, será necesario pulsar el botón de llamada de los video porteros ubicados en la parte exterior de las puertas o los pulsadores retro iluminados ubicados en el interior de las puertas. Los detectores de movimiento interiores y exteriores actuarán sólo en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  
  // MODO ATM
  {
    id: 'atm',
    category: 'ATM',
    name: 'ATM',
    description: 'Es el modo de funcionamiento destinado al acceso al cajero. La puerta P1 y la puerta P2 actúan de forma manual, es decir, tanto si se va en dirección entrada como de salida, será necesario pulsar el botón de llamada de los video porteros ubicados en la parte exterior de las puertas o los pulsadores retro iluminados ubicados en el interior de las puertas. Los detectores de movimiento interiores y exteriores actuarán sólo en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  
  // MODO CERRADO
  {
    id: 'cerrado',
    category: 'CERRADO',
    name: 'CERRADO',
    description: 'Es el modo de funcionamiento destinado a horarios sin empleados. Solo se permite acceso mediante llave o de forma remota en al caso que la instalación se haya dado de alta en los servidores del cliente.'
  },
  
  // MODO CARGA DE CAJERO
  {
    id: 'carga_cajero',
    category: 'CARGA_CAJERO',
    name: 'CARGA DE CAJERO',
    description: 'Es el modo de funcionamiento destinado la carga de cajero en los casos que exista en el uno en el zaguán. La puerta P1 permanece cerrada y es necesario pulsar para que haga llamada a las consolas interiores. La puerta P2 permanece abierta para facilitar el desarrollo de la actividad.'
  },
  
  // MODO EMERGENCIA
  {
    id: 'emergencia',
    category: 'EMERGENCIA',
    name: 'EMERGENCIA',
    description: 'Es el modo de funcionamiento de las puertas destinado a su desbloqueo en caso de funcionamiento anómalo de la electrónica de gestión del sistema. Las puertas P1 y P2 quedan totalmente abiertas, permitiendo el libre tránsito de personas. Este modo de funcionamiento puede ser actuado desde las consolas o desde el pulsador verde rearmable ubicado en las inmediaciones de la mesa de subdirección.'
  }
];

const categoryDisplayNames = {
  'COMERCIAL': 'COMERCIAL',
  'EXTENDIDO': 'EXTENDIDO',
  'ATM': 'ATM',
  'CERRADO': 'CERRADO',
  'CARGA_CAJERO': 'CARGA DE CAJERO',
  'EMERGENCIA': 'EMERGENCIA'
};

// Categorías que tienen submodos
const categoriesWithSubmodes = ['COMERCIAL', 'EXTENDIDO'];

export default function ModeSelectionModal({ visible, onClose, onModeSelect }: ModeSelectionModalProps) {
  const [selectedMode, setSelectedMode] = useState<string>('comercial_automatico');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['COMERCIAL']));
  const [countdown, setCountdown] = useState<number>(30);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Iniciar cuenta atrás cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setCountdown(30);
      setIsCountdownActive(true);
      
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Auto-activar cuando llegue a 0
            handleActivate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Limpiar interval cuando se cierra el modal
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
      setIsCountdownActive(false);
      setCountdown(30);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [visible]);
  const handleModeSelect = (modeId: string) => {
    setSelectedMode(modeId);
  };

  const handleActivate = () => {
    // Detener cuenta atrás
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setIsCountdownActive(false);
    
    onModeSelect(selectedMode);
    onClose();
  };

  const handleClose = () => {
    // Detener cuenta atrás al cerrar
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setIsCountdownActive(false);
    setCountdown(30);
    onClose();
  };
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getSelectedModeDetails = () => {
    return modeOptions.find(mode => mode.id === selectedMode);
  };

  const selectedModeDetails = getSelectedModeDetails();

  // Agrupar modos por categoría
  const categories = ['COMERCIAL', 'EXTENDIDO', 'ATM', 'CERRADO', 'CARGA_CAJERO', 'EMERGENCIA'] as const;

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
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Left Panel - Mode Selection (más estrecho) */}
          <ScrollView style={styles.leftPanel} contentContainerStyle={styles.leftPanelContent}>
            {categories.map(category => {
              const categoryModes = modeOptions.filter(mode => mode.category === category);
              if (categoryModes.length === 0) return null;
              
              const hasSubmodes = categoriesWithSubmodes.includes(category);
              const isExpanded = expandedCategories.has(category);
              
              return (
                <View key={category} style={styles.section}>
                  {hasSubmodes ? (
                    // Categoría con submodos desplegables
                    <>
                      <TouchableOpacity 
                        style={styles.categoryHeader}
                        onPress={() => toggleCategory(category)}
                      >
                        <Text style={styles.sectionTitle}>{categoryDisplayNames[category]}</Text>
                        {isExpanded ? (
                          <ChevronDown size={16} color="#212529" />
                        ) : (
                          <ChevronRight size={16} color="#212529" />
                        )}
                      </TouchableOpacity>
                      
                      {isExpanded && (
                        <View style={styles.submodeContainer}>
                          {categoryModes.map(mode => (
                            <TouchableOpacity
                              key={mode.id}
                              style={[
                                styles.modeButton,
                                selectedMode === mode.id && styles.selectedModeButton
                              ]}
                              onPress={() => handleModeSelect(mode.id)}
                            >
                              <Text style={[
                                styles.modeButtonText,
                                selectedMode === mode.id && styles.selectedModeButtonText
                              ]}>
                                {mode.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    // Categoría sin submodos (botón directo)
                    // Botón directo sin título redundante
                    categoryModes.map(mode => (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.modeButton,
                          selectedMode === mode.id && styles.selectedModeButton
                        ]}
                        onPress={() => handleModeSelect(mode.id)}
                      >
                        <Text style={[
                          styles.modeButtonText,
                          selectedMode === mode.id && styles.selectedModeButtonText
                        ]}>
                          {categoryDisplayNames[category]}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Right Panel - Details */}
          <View style={styles.rightPanel}>
            {/* Santander Logo */}
            <View style={styles.logoSection}>
              <Image 
                source={require('@/assets/images/banco-santander-seeklogo.png')}
                style={styles.santanderLogo}
                resizeMode="contain"
              />
            </View>

            {/* Mode Details Card */}
            <ScrollView style={styles.detailsScrollView}>
              <View style={styles.detailsCard}>
                <View style={styles.detailsContent}>
                  <Text style={styles.detailsTitle}>
                    {selectedModeDetails ? categoryDisplayNames[selectedModeDetails.category] : ''} {selectedModeDetails?.name}
                  </Text>
                  <Text style={styles.detailsDescription}>
                    {selectedModeDetails?.description}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Activate Button */}
            <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
              <Text style={styles.activateButtonText}>
                {isCountdownActive ? `ACTIVAR (${countdown}s)` : 'ACTIVAR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>Pantalla selección modo puertas</Text>
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
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 32,
    gap: 32,
  },
  leftPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1, // 1/3 de la vista
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  leftPanelContent: {
    padding: 16,
    paddingBottom: 64,
  },
  section: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  submodeContainer: {
    paddingLeft: 8,
  },
  modeButton: {
    backgroundColor: '#495057',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedModeButton: {
    backgroundColor: '#EC1C24',
    shadowColor: '#EC1C24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  selectedModeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rightPanel: {
    flex: 2, // 2/3 de la vista
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  santanderLogo: {
    width: 350,
    height: 100,
  },
  detailsScrollView: {
    flex: 1,
    width: '100%',
    marginBottom: 32,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 800,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  detailsImagePlaceholder: {
    width: 120,
    height: 90,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    marginRight: 24,
    flexShrink: 0,
  },
  detailsContent: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  detailsDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    fontWeight: '400',
  },
  activateButton: {
    backgroundColor: '#495057',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 8,
    shadowColor: '#495057',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  activateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  footerText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'left',
    fontWeight: '400',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
});
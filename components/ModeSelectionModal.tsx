import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCallback } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';

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
  // COMERCIAL
  {
    id: 'comercial_automatico',
    category: 'COMERCIAL',
    name: 'AUTOMÁTICO',
    description: 'La puerta P1 y la puerta P2 actúan de forma automática, tanto si se va en dirección entrada como en dirección salida. No es necesario pulsar botones de Visor Voxter o Videoporteros, dado que los detectores de movimiento actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.'
  },
  {
    id: 'comercial_esclusa',
    category: 'COMERCIAL',
    name: 'ESCLUSA',
    description: 'La puerta P1 y la puerta P2 actúan de forma automática con funcionamiento en esclusa estricta. Los detectores de movimiento actuarán como apertura de puerta en cortesía. Una puerta no abre hasta que la otra esté completamente cerrada, garantizando máxima seguridad en el acceso.'
  },
  
  // HORARIO
  {
    id: 'horario_extendido',
    category: 'HORARIO',
    name: 'EXTENDIDO',
    description: 'Modo de funcionamiento para horarios extendidos de atención al público. Las puertas funcionan de forma automática con detectores de movimiento activos. Ideal para horarios de mayor afluencia de clientes.'
  },
  {
    id: 'horario_autoservicio',
    category: 'HORARIO',
    name: 'HORARIO AUTOSERVICIO',
    description: 'Modo de funcionamiento para horarios de autoservicio. Las puertas funcionan de forma automática permitiendo el acceso a los cajeros automáticos fuera del horario comercial normal.'
  },
  
  // OFICINA CERRADA
  {
    id: 'oficina_cerrada',
    category: 'INDIVIDUAL',
    name: 'OFICINA CERRADA',
    description: 'Modo de funcionamiento destinado a horarios sin empleados. Solo se permite acceso mediante llave o de forma remota en caso que la instalación se haya dado de alta en los servidores del cliente. Todas las puertas permanecen bloqueadas.'
  },
  
  // CARGA DE CAJERO
  {
    id: 'carga_cajero',
    category: 'INDIVIDUAL',
    name: 'CARGA DE CAJERO',
    description: 'Es el modo de funcionamiento destinado la carga de cajero en los casos que exista en el uno en el zaguán. La puerta P1 permanece cerrada y es necesario pulsar para que haga llamada a las consolas interiores. La puerta P2 permanece abierta para facilitar el desarrollo de la actividad.'
  },
  
  // MANUAL
  {
    id: 'manual',
    category: 'INDIVIDUAL',
    name: 'MANUAL',
    description: 'La puerta P1 y la puerta P2 actúan de forma manual. Es necesario pulsar el botón de llamada de los videoporteros ubicados en la parte exterior de las puertas o los pulsadores retroiluminados ubicados en el interior. Los detectores de movimiento actuarán sólo en modo seguridad para evitar atrapamientos.'
  }
];

// Orden específico de categorías según la imagen
const categoryOrder = ['COMERCIAL', 'HORARIO', 'INDIVIDUAL'];

const categoryDisplayNames = {
  'COMERCIAL': 'COMERCIAL',
  'HORARIO': 'HORARIO',
  'INDIVIDUAL': '', // Sin título para los modos individuales
};

export default function ModeSelectionModal({ visible, onClose, onModeSelect }: ModeSelectionModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [selectedMode, setSelectedMode] = useState<string>('comercial_automatico');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState<number>(30);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [showCargaCajero, setShowCargaCajero] = useState<boolean>(false);
  const [isModalReady, setIsModalReady] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const selectedModeRef = useRef<string>('comercial_automatico');

  // Actualizar la referencia cuando cambie el modo seleccionado
  useEffect(() => {
    selectedModeRef.current = selectedMode;
  }, [selectedMode]);

  // Cargar configuración
  const loadConfiguration = async () => {
    try {
      const savedConfig = await AsyncStorage.getItem('new_door_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setShowCargaCajero(config.officeWithATM === true);
      } else {
        const oldConfig = await AsyncStorage.getItem('detailed_door_config');
        if (oldConfig) {
          setShowCargaCajero(false);
        } else {
          setShowCargaCajero(false);
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setShowCargaCajero(false);
    }
  };

  // Función para limpiar el temporizador
  const clearCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCountdownActive(false);
  };

  // Función para iniciar el contador
  const startCountdown = () => {
    clearCountdown(); // Limpiar cualquier contador existente
    setCountdown(30);
    setIsCountdownActive(true);
    
    intervalRef.current = setInterval(() => {
      setCountdown(prevCount => {
        const newCount = prevCount - 1;
        console.log(`⏰ Contador: ${newCount} segundos restantes`);
        
        if (newCount <= 0) {
          console.log('🚀 Auto-activando modo por timeout:', selectedModeRef.current);
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          
          // Auto-activar después de un pequeño delay
          setTimeout(() => {
            if (isMountedRef.current) {
              onModeSelect(selectedModeRef.current);
            }
          }, 1500); // Dar tiempo para mostrar "ACTIVADO"
          
          return 0;
        }
        return newCount;
      });
    }, 1000);
  };

  // Efecto principal para manejar la apertura/cierre del modal
  useEffect(() => {
    if (visible && !isModalReady) {
      console.log('📱 Modal abierto - iniciando configuración');
      isMountedRef.current = true;
      loadConfiguration();
      setIsModalReady(true);
    } else if (!visible && isModalReady) {
      console.log('❌ Modal cerrado - limpiando contador');
      clearCountdown();
      isMountedRef.current = false;
      setIsModalReady(false);
    }
  }, [visible, isModalReady]);

  // Efecto separado para el contador
  useEffect(() => {
    if (isModalReady) {
      startCountdown();
    }
    return () => {
      clearCountdown();
    };
  }, [isModalReady]);

  const handleModeSelect = (modeId: string) => {
    console.log(`🎯 Modo seleccionado: ${modeId}`);
    setSelectedMode(modeId);
    selectedModeRef.current = modeId;
    
    // Reiniciar contador cuando cambia el modo
    if (isModalReady) {
      console.log('🔄 Reiniciando contador por cambio de modo');
      startCountdown();
    }
  };

  const handleActivate = () => {
    console.log('✅ Activación manual del modo:', selectedMode);
    clearCountdown();
    onModeSelect(selectedMode);
  };

  const handleClose = () => {
    console.log('🚪 Cerrando modal');
    clearCountdown();
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

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      backgroundColor: '#F8F9FA',
      borderRadius: 0,
      flex: 1,
      height: '100%',
      overflow: 'hidden',
    },
    modalHeader: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
    },
    modalHeaderTitle: {
      fontSize: isSmallTablet ? 16 : isLargeTablet ? 20 : 18,
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
      padding: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      gap: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    leftPanel: {
      backgroundColor: '#FFFFFF',
      borderRadius: 0,
      flex: 1,
    },
    leftPanelContent: {
      padding: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 16,
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
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 6,
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
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    selectedModeButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    sectionTitleStatic: {
      fontSize: 13,
      fontWeight: '700',
      color: '#212529',
      textAlign: 'left',
      letterSpacing: 0.5,
      marginBottom: 10,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    rightPanel: {
      flex: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    santanderLogo: {
      width: isSmallTablet ? 280 : isLargeTablet ? 400 : 340,
      height: isSmallTablet ? 80 : isLargeTablet ? 115 : 97,
    },
    detailsScrollView: {
      width: '100%',
      maxHeight: '60%',
    },
    detailsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      flexDirection: 'row',
      alignItems: 'flex-start',
      width: '100%',
      maxWidth: isSmallTablet ? 600 : isLargeTablet ? 900 : 750,
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
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 24 : 21,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      letterSpacing: 0.3,
    },
    detailsDescription: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 18 : isLargeTablet ? 24 : 20,
      fontWeight: '400',
    },
    activateButton: {
      backgroundColor: '#495057',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 8,
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    progressBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#28A745',
      borderRadius: 8,
      opacity: 0.3,
    },
    activateButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
      textAlign: 'center',
      position: 'relative',
      zIndex: 1,
    },
    footerText: {
      fontSize: 12,
      color: '#6C757D',
      textAlign: 'left',
      fontWeight: '400',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
  });

  // Agrupar modos por categoría
  const getFilteredModes = () => {
    let filteredModes = [...modeOptions];
    
    // Filtrar CARGA CAJERO si no está habilitado
    if (!showCargaCajero) {
      filteredModes = filteredModes.filter(mode => mode.id !== 'carga_cajero');
    }
    
    return filteredModes;
  };

  const filteredModes = getFilteredModes();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>SELECCIONAR MODO DE OPERACIÓN</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Left Panel - Mode Selection */}
            <ScrollView style={styles.leftPanel} contentContainerStyle={styles.leftPanelContent}>
              {categoryOrder.map(category => {
                const categoryModes = filteredModes.filter(mode => mode.category === category);
                if (categoryModes.length === 0) return null;
                
                return (
                  <View key={category} style={styles.section}>
                    {categoryDisplayNames[category] ? (
                      <Text style={styles.sectionTitleStatic}>
                        {categoryDisplayNames[category]}
                      </Text>
                    ) : null}
                    
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
                      {selectedModeDetails?.name}
                    </Text>
                    <Text style={styles.detailsDescription}>
                      {selectedModeDetails?.description}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Activate Button */}
              <TouchableOpacity style={styles.activateButton} onPress={handleActivate}>
                {isCountdownActive && (
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${((30 - countdown) / 30) * 100}%` }
                    ]} 
                  />
                )}
                <Text style={styles.activateButtonText}>
                  {isCountdownActive && countdown > 0 ? `ACTIVAR (${countdown}s)` : 
                   countdown === 0 ? 'ACTIVADO' : 'ACTIVAR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
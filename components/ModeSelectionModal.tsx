import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ModeSwipeRow from '@/components/ModeSwipeRow';

interface ModeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onModeSelect: (mode: string) => void | boolean | Promise<void | boolean>;
  currentMode?: string | null;
}

interface ModeOption {
  id: string;
  category: 'COMERCIAL' | 'EXTENDIDO' | 'ATM' | 'CERRADO' | 'CARGA_CAJERO' | 'EMERGENCIA' | 'INDIVIDUAL';
  name: string;
  description: string;
}

const BLOQUEO_OFICINA_ID = 'manual';

const modeOptions: ModeOption[] = [
  {
    id: 'comercial_automatico',
    category: 'COMERCIAL',
    name: 'AUTOMÁTICO',
    description:
      'La puerta P1 y la puerta P2 actúan de forma automática, tanto si se va en dirección entrada como en dirección salida. No es necesario pulsar botones de Visor Voxter o Videoporteros, dado que los detectores de movimiento actuarán como apertura de puerta en cortesía. Los detectores de movimiento interiores y exteriores actuarán también en modo seguridad, es decir, cuando la puerta esté abierta, protegerán a los usuarios frente al atrapamiento cuando ésta se cierre. Las puertas trabajan en modo esclusa; es decir una puerta no abre hasta que la otra esté cerrada.',
  },
  {
    id: 'comercial_esclusa',
    category: 'COMERCIAL',
    name: 'ESCLUSA',
    description:
      'La puerta P1 y la puerta P2 actúan de forma automática con funcionamiento en esclusa estricta. Los detectores de movimiento actuarán como apertura de puerta en cortesía. Una puerta no abre hasta que la otra esté completamente cerrada, garantizando máxima seguridad en el acceso.',
  },
  {
    id: 'horario_extendido',
    category: 'EXTENDIDO',
    name: 'EXTENDIDO',
    description:
      'Modo de funcionamiento para horarios extendidos de atención al público. Las puertas funcionan de forma automática con detectores de movimiento activos. Ideal para horarios de mayor afluencia de clientes.',
  },
  {
    id: 'horario_autoservicio',
    category: 'EXTENDIDO',
    name: 'AUTOSERVICIO',
    description:
      'Modo de funcionamiento para horarios de autoservicio. Las puertas funcionan de forma automática permitiendo el acceso a los cajeros automáticos fuera del horario comercial normal.',
  },
  {
    id: 'oficina_cerrada',
    category: 'INDIVIDUAL',
    name: 'OFICINA CERRADA',
    description:
      'Modo de funcionamiento destinado a horarios sin empleados. Solo se permite acceso mediante llave o de forma remota en caso que la instalación se haya dado de alta en los servidores del cliente. Todas las puertas permanecen bloqueadas.',
  },
  {
    id: 'carga_cajero',
    category: 'INDIVIDUAL',
    name: 'CARGA DE CAJERO',
    description:
      'Es el modo de funcionamiento destinado la carga de cajero en los casos que exista en el uno en el zaguán. La puerta P1 permanece cerrada y es necesario pulsar para que haga llamada a las consolas interiores. La puerta P2 permanece abierta para facilitar el desarrollo de la actividad.',
  },
  {
    id: BLOQUEO_OFICINA_ID,
    category: 'INDIVIDUAL',
    name: 'BLOQUEO OFICINA',
    description:
      'La puerta P1 y la puerta P2 actúan de forma manual. Es necesario pulsar el botón de llamada de los videoporteros ubicados en la parte exterior de las puertas o los pulsadores retroiluminados ubicados en el interior. Los detectores de movimiento actuarán sólo en modo seguridad para evitar atrapamientos.',
  },
];

const categoryOrder = ['COMERCIAL', 'EXTENDIDO', 'INDIVIDUAL'];

const categoryDisplayNames = {
  COMERCIAL: 'COMERCIAL',
  EXTENDIDO: 'HORARIO',
  INDIVIDUAL: '',
};

const modeIdToNameMap: Record<string, string> = {
  comercial_automatico: 'COMERCIAL AUTOMÁTICO',
  comercial_esclusa: 'COMERCIAL ESCLUSA',
  horario_extendido: 'HORARIO EXTENDIDO',
  horario_autoservicio: 'HORARIO AUTOSERVICIO',
  oficina_cerrada: 'OFICINA CERRADA',
  carga_cajero: 'CARGA DE CAJERO',
  manual: 'MANUAL',
};

const bloqueoOficinaMode = modeOptions.find((m) => m.id === BLOQUEO_OFICINA_ID)!;

function normalizeCurrentModeToModeId(mode: string | null | undefined): string | null {
  if (!mode) return null;
  const lower = String(mode).trim().toLowerCase();

  const directIds = new Set([
    'comercial_automatico',
    'comercial_esclusa',
    'horario_extendido',
    'horario_autoservicio',
    'horario_automatico',
    'horario_esclusa',
    'horario_manual',
    'horario_carga_cajero',
    'horario_cerrado',
    'oficina_cerrada',
    'carga_cajero',
    'manual',
  ]);

  const ruleKeyToId: Record<string, string> = {
    horario_automatico: 'comercial_automatico',
    horario_esclusa: 'comercial_esclusa',
    horario_extendido: 'horario_extendido',
    horario_autoservicio: 'horario_autoservicio',
    horario_cerrado: 'oficina_cerrada',
    horario_carga_cajero: 'carga_cajero',
    horario_manual: 'manual',
  };

  if (directIds.has(lower)) {
    return ruleKeyToId[lower] || (lower === 'horario_cerrado' ? 'oficina_cerrada' : lower);
  }

  const labelToIdMap: Record<string, string> = {
    'comercial automático': 'comercial_automatico',
    'comercial automatico': 'comercial_automatico',
    'comercial esclusa': 'comercial_esclusa',
    'horario extendido': 'horario_extendido',
    'horario autoservicio': 'horario_autoservicio',
    'oficina cerrada': 'oficina_cerrada',
    'carga de cajero': 'carga_cajero',
    'carga cajero': 'carga_cajero',
    manual: 'manual',
    'horario manual': 'manual',
    'bloqueo oficina': 'manual',
  };
  return labelToIdMap[lower] || null;
}

export default function ModeSelectionModal({
  visible,
  onClose,
  onModeSelect,
  currentMode,
}: ModeSelectionModalProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [selectedMode, setSelectedMode] = useState<string>('comercial_automatico');
  const [isModalReady, setIsModalReady] = useState<boolean>(false);

  const activeModeId = useMemo(
    () => normalizeCurrentModeToModeId(currentMode),
    [currentMode]
  );

  useEffect(() => {
    if (visible && !isModalReady) {
      const preselected = activeModeId || 'comercial_automatico';
      setSelectedMode(preselected);
      setIsModalReady(true);
    } else if (!visible && isModalReady) {
      setIsModalReady(false);
    }
  }, [visible, isModalReady, activeModeId]);

  const handlePreview = (modeId: string) => {
    setSelectedMode(modeId);
  };

  const handleActivateMode = async (modeId: string): Promise<boolean> => {
    const modeName = modeIdToNameMap[modeId] || modeId;
    const result = await Promise.resolve(onModeSelect(modeName));
    return result !== false;
  };

  const selectedModeDetails = modeOptions.find((mode) => mode.id === selectedMode);
  const mainModes = modeOptions.filter((m) => m.id !== BLOQUEO_OFICINA_ID);

  const renderModeRow = (mode: ModeOption) => (
    <ModeSwipeRow
      key={mode.id}
      modeName={mode.name}
      isSelected={selectedMode === mode.id}
      isActive={activeModeId === mode.id}
      onPreview={() => handlePreview(mode.id)}
      onActivate={() => handleActivateMode(mode.id)}
    />
  );

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
      flexGrow: 1,
    },
    section: {
      marginBottom: 18,
    },
    modeList: {
      gap: 10,
    },
    sectionTitleStatic: {
      fontSize: 13,
      fontWeight: '700',
      color: '#212529',
      textAlign: 'left',
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    swipeHelp: {
      fontSize: 11,
      color: '#868E96',
      marginBottom: 14,
      paddingHorizontal: 4,
      lineHeight: 16,
    },
    bloqueoSection: {
      marginTop: 6,
      paddingTop: 16,
      borderTopWidth: 2,
      borderTopColor: '#DEE2E6',
    },
    rightPanel: {
      flex: 2,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rightPanelMain: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
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
      maxHeight: '55%',
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
    actionArea: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      paddingBottom: 8,
    },
    volverButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#495057',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    volverButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#495057',
      letterSpacing: 1,
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>SELECCIONAR MODO DE OPERACIÓN</Text>
          </View>

          <View style={styles.content}>
            <ScrollView style={styles.leftPanel} contentContainerStyle={styles.leftPanelContent}>
              <Text style={styles.swipeHelp}>
                Toque el nombre para ver la descripción. Deslice → para activar cada modo. El modo
                activo no requiere deslizamiento.
              </Text>

              {categoryOrder.map((category) => {
                const categoryModes = mainModes.filter((mode) => mode.category === category);
                if (categoryModes.length === 0) return null;

                return (
                  <View key={category} style={styles.section}>
                    {categoryDisplayNames[category as keyof typeof categoryDisplayNames] ? (
                      <Text style={styles.sectionTitleStatic}>
                        {categoryDisplayNames[category as keyof typeof categoryDisplayNames]}
                      </Text>
                    ) : null}
                    <View style={styles.modeList}>
                      {categoryModes.map(renderModeRow)}
                    </View>
                  </View>
                );
              })}

              <View style={styles.bloqueoSection}>
                {renderModeRow(bloqueoOficinaMode)}
              </View>
            </ScrollView>

            <View style={styles.rightPanel}>
              <View style={styles.rightPanelMain}>
                <View style={styles.logoSection}>
                  <Image
                    source={require('@/assets/images/banco-santander-seeklogo.png')}
                    style={styles.santanderLogo}
                    resizeMode="contain"
                  />
                </View>

                <ScrollView style={styles.detailsScrollView}>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsContent}>
                      <Text style={styles.detailsTitle}>{selectedModeDetails?.name}</Text>
                      <Text style={styles.detailsDescription}>
                        {selectedModeDetails?.description}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>

              <View style={styles.actionArea}>
                <TouchableOpacity style={styles.volverButton} onPress={onClose}>
                  <Text style={styles.volverButtonText}>VOLVER</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

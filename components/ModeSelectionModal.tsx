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
import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModeSwipeRow from '@/components/ModeSwipeRow';
import ModeIcon, { ModeDiagram } from '@/components/ModeIcon';
import {
  MODE_DEFINITIONS,
  MODE_CATEGORY_LABELS,
  MODE_CATEGORY_ORDER,
  normalizeModeToId,
  modeIdToBackendName,
  type ModeDefinition,
} from '@/config/modeTexts';
interface ModeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onModeSelect: (mode: string) => void | boolean | Promise<void | boolean>;
  currentMode?: string | null;
}

const BLOQUEO_OFICINA_ID = 'manual';

const bloqueoOficinaMode = MODE_DEFINITIONS.find((m) => m.id === BLOQUEO_OFICINA_ID)!;

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
  const [officeWithATM, setOfficeWithATM] = useState(false);

  const activeModeId = useMemo(
    () => normalizeModeToId(currentMode),
    [currentMode]
  );

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('new_door_config')
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setOfficeWithATM(Boolean(parsed?.officeWithATM));
      })
      .catch(() => {});
  }, [visible]);

  const visibleModes = useMemo(
    () =>
      MODE_DEFINITIONS.filter(
        (mode) => !mode.requiresAtmInVestibule || officeWithATM
      ),
    [officeWithATM]
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
    const modeName = modeIdToBackendName(modeId);
    const result = await Promise.resolve(onModeSelect(modeName));
    return result !== false;
  };

  const selectedModeDetails = visibleModes.find((mode) => mode.id === selectedMode);
  const mainModes = visibleModes.filter((m) => m.id !== BLOQUEO_OFICINA_ID);

  const renderModeRow = (mode: ModeDefinition) => (
    <ModeSwipeRow
      key={mode.id}
      modeId={mode.id}
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
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 22 : 20,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      gap: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    leftPanel: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      flex: 1,
      maxWidth: isSmallTablet ? 380 : isLargeTablet ? 480 : 430,
      borderWidth: 1,
      borderColor: '#E9ECEF',
    },
    leftPanelContent: {
      flexGrow: 1,
      minHeight: '100%',
      paddingTop: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingBottom: 12,
      justifyContent: 'flex-start',
    },
    section: {
      marginBottom: 18,
    },
    modesBlock: {
      gap: 18,
      paddingBottom: 0,
    },
    modeList: {
      gap: 12,
    },
    sectionTitleStatic: {
      fontSize: 15,
      fontWeight: '700',
      color: '#212529',
      textAlign: 'left',
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    swipeHelp: {
      fontSize: 13,
      color: '#868E96',
      marginBottom: 14,
      paddingHorizontal: 4,
      lineHeight: 18,
    },
    bloqueoSection: {
      marginTop: 'auto',
      paddingTop: 20,
      paddingBottom: 0,
      borderTopWidth: 2,
      borderTopColor: '#DEE2E6',
    },
    rightPanel: {
      flex: 2.4,
    },
    rightPanelContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
    },
    rightPanelMain: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
    },
    santanderLogo: {
      width: isSmallTablet ? 160 : isLargeTablet ? 220 : 190,
      height: isSmallTablet ? 46 : isLargeTablet ? 64 : 55,
    },
    detailsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 20 : isLargeTablet ? 28 : 24,
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: isSmallTablet ? 600 : isLargeTablet ? 900 : 750,
      borderWidth: 1,
      borderColor: '#E9ECEF',
      gap: 14,
    },
    detailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailsContent: {
      width: '100%',
    },
    detailsTitle: {
      flex: 1,
      fontSize: isSmallTablet ? 20 : isLargeTablet ? 26 : 22,
      fontWeight: '700',
      color: '#212529',
      letterSpacing: 0.3,
    },
    detailsDescription: {
      fontSize: isSmallTablet ? 15 : isLargeTablet ? 18 : 16,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 22 : isLargeTablet ? 28 : 24,
      fontWeight: '400',
    },
    diagramBelow: {
      width: '100%',
      maxWidth: isSmallTablet ? 600 : isLargeTablet ? 900 : 750,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    actionArea: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      paddingBottom: 8,
      marginTop: 16,
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
      fontSize: 17,
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

              <View style={styles.modesBlock}>
                {MODE_CATEGORY_ORDER.map((category) => {
                  const categoryModes = mainModes.filter((mode) => mode.category === category);
                  if (categoryModes.length === 0) return null;

                  return (
                    <View key={category} style={styles.section}>
                      {MODE_CATEGORY_LABELS[category] ? (
                        <Text style={styles.sectionTitleStatic}>
                          {MODE_CATEGORY_LABELS[category]}
                        </Text>
                      ) : null}
                      <View style={styles.modeList}>
                        {categoryModes.map(renderModeRow)}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.bloqueoSection}>
                {renderModeRow(bloqueoOficinaMode)}
              </View>
            </ScrollView>

            <ScrollView
              style={styles.rightPanel}
              contentContainerStyle={styles.rightPanelContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.rightPanelMain}>
                <View style={styles.logoSection}>
                  <Image
                    source={require('@/assets/images/banco-santander-seeklogo.png')}
                    style={styles.santanderLogo}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.detailsCard}>
                  <View style={styles.detailsHeader}>
                    <ModeIcon mode={selectedMode} size={36} color="#EC1C24" />
                    <Text style={styles.detailsTitle}>{selectedModeDetails?.name}</Text>
                  </View>
                  <View style={styles.detailsContent}>
                    <Text style={styles.detailsDescription}>
                      {selectedModeDetails?.previewDescription}
                    </Text>
                  </View>
                </View>

                <View style={styles.diagramBelow}>
                  <ModeDiagram
                    mode={selectedMode}
                    width={isSmallTablet ? 280 : isLargeTablet ? 360 : 320}
                    height={isSmallTablet ? 130 : 150}
                  />
                </View>
              </View>

              <View style={styles.actionArea}>
                <TouchableOpacity style={styles.volverButton} onPress={onClose}>
                  <Text style={styles.volverButtonText}>VOLVER</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

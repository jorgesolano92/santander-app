import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Settings, MessageCircle, HardHat, Wifi } from 'lucide-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

export default function MainScreen() {
  const { width = 0 } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [currentDateTime] = useState(new Date());

  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      backgroundColor: '#495057',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
      paddingTop: (isSmallTablet ? 12 : isLargeTablet ? 20 : 16) + insets.top,
      paddingBottom: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dateTimeContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 12 : isLargeTablet ? 20 : 16,
      paddingVertical: isSmallTablet ? 6 : isLargeTablet ? 10 : 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    dateTimeText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    leftHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    rightHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notificationsButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    notificationsButtonText: {
      fontSize: isSmallTablet ? 14 : isLargeTablet ? 18 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    connectionIndicatorContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      marginRight: 16,
    },
    configButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 10 : isLargeTablet ? 14 : 12,
      borderRadius: 8,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    configButtonText: {
      fontSize: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#333333',
    },
    mainContent: {
      flex: 1,
      padding: isSmallTablet ? 16 : isLargeTablet ? 32 : 24,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
      marginTop: 8,
    },
    santanderLogo: {
      width: isSmallTablet ? 280 : isLargeTablet ? 400 : 340,
      height: isSmallTablet ? 90 : isLargeTablet ? 130 : 110,
    },
    operationSection: {
      marginBottom: isSmallTablet ? 20 : isLargeTablet ? 32 : 24,
    },
    modeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 0,
    },
    modeImagePlaceholder: {
      width: 120,
      height: 90,
      backgroundColor: '#E9ECEF',
      borderRadius: 12,
      marginRight: 24,
    },
    modeContent: {
      flex: 1,
    },
    modeTitle: {
      fontSize: isSmallTablet ? 18 : isLargeTablet ? 24 : 21,
      fontWeight: '700',
      color: '#212529',
      marginBottom: isSmallTablet ? 8 : isLargeTablet ? 12 : 10,
      letterSpacing: 0.3,
    },
    modeDescription: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      color: '#6C757D',
      lineHeight: isSmallTablet ? 18 : isLargeTablet ? 24 : 20,
      fontWeight: '400',
    },
    changeModeButton: {
      backgroundColor: '#F8F9FA',
      paddingHorizontal: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      paddingVertical: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
      borderRadius: 8,
      marginLeft: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      borderWidth: 1,
      borderColor: '#DEE2E6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    changeModeButtonText: {
      fontSize: isSmallTablet ? 13 : isLargeTablet ? 16 : 14,
      fontWeight: '600',
      color: '#495057',
      letterSpacing: 0.5,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
      paddingHorizontal: isSmallTablet ? 16 : 0,
    },
    emergencyButton: {
      flex: 1,
      backgroundColor: '#EC1C24',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EC1C24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    emergencyButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    visualizationButton: {
      flex: 1,
      backgroundColor: '#495057',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#495057',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    visualizationButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeaderSection}>
          <TouchableOpacity 
            style={styles.notificationsButton}
            onPress={() => console.log('Notificaciones presionado')}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.notificationsButtonText}>NOTIFICACIONES</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.notificationsButton}
            onPress={() => console.log('Técnico presionado')}
          >
            <HardHat size={20} color="#FFFFFF" />
            <Text style={styles.notificationsButtonText}>TÉCNICO</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{formatDateTime(currentDateTime)}</Text>
        </View>

        <View style={styles.rightHeaderSection}>
          <View style={styles.connectionIndicatorContainer}>
            <Wifi size={20} color="#28A745" />
          </View>

          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => console.log('Configuración presionado')}
          >
            <Settings size={20} color="#666666" />
            <Text style={styles.configButtonText}>CONFIGURACIÓN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.logoSection}>
          <Image 
            source={require('@/assets/images/banco-santander-seeklogo.png')}
            style={styles.santanderLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.operationSection}>
          <View style={styles.modeCard}>
            <View style={styles.modeImagePlaceholder} />
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Modo de Operación Actual: COMERCIAL AUTOMÁTICO</Text>
              <Text style={styles.modeDescription}>
                Visualización del modo de operación activo en tiempo real. Esta información se obtiene automáticamente mediante una consulta GET al sistema de control de puertas.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.changeModeButton}
              onPress={() => console.log('Cambiar modo presionado')}
            >
              <Text style={styles.changeModeButtonText}>CAMBIAR MODO</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomButtons}>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => console.log('Emergencia presionado')}
          >
            <Text style={styles.emergencyButtonText}>ACTIVAR EMERGENCIA</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.visualizationButton}
            onPress={() => console.log('Visualización presionado')}
          >
            <Text style={styles.visualizationButtonText}>VISUALIZACIÓN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
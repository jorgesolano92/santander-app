import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { IntercomConfig } from './IntercomConfigurationModal';
import { useWindowDimensions } from 'react-native';

interface DoorVideoStreamProps {
  intercomConfig: IntercomConfig;
  doorName: string;
}

export default function DoorVideoStream({ intercomConfig, doorName }: DoorVideoStreamProps) {
  const { width = 0 } = useWindowDimensions();
  const isSmallTablet = width < 900;
  const isLargeTablet = width >= 1200;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    if (intercomConfig.cameraIP) {
      // Construir URL del stream basado en la configuración
      const protocol = intercomConfig.enableTLS ? 'https' : 'http';
      const port = intercomConfig.enableTLS ? intercomConfig.httpsPort : intercomConfig.httpPort;
      
      // URL típica para cámaras IP con interfaz web
      // Esto puede variar según el fabricante de la cámara
      const url = `${protocol}://${intercomConfig.cameraIP}:${port}/video.html`;
      
      setStreamUrl(url);
      setIsLoading(true);
      setHasError(false);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [intercomConfig]);

  const handleWebViewLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleWebViewError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const styles = StyleSheet.create({
    container: {
      width: isSmallTablet ? 200 : isLargeTablet ? 260 : 230,
      height: isSmallTablet ? 150 : isLargeTablet ? 195 : 172,
      backgroundColor: '#000000',
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    webView: {
      flex: 1,
      backgroundColor: '#000000',
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
      zIndex: 1,
    },
    loadingText: {
      color: '#FFFFFF',
      fontSize: isSmallTablet ? 10 : isLargeTablet ? 12 : 11,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#2C2C2C',
      padding: 16,
    },
    errorIcon: {
      width: isSmallTablet ? 32 : isLargeTablet ? 48 : 40,
      height: isSmallTablet ? 24 : isLargeTablet ? 36 : 30,
      backgroundColor: '#555555',
      borderRadius: 6,
      marginBottom: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorIconInner: {
      width: isSmallTablet ? 16 : isLargeTablet ? 24 : 20,
      height: isSmallTablet ? 12 : isLargeTablet ? 18 : 15,
      backgroundColor: '#777777',
      borderRadius: 4,
    },
    errorText: {
      color: '#CCCCCC',
      fontSize: isSmallTablet ? 9 : isLargeTablet ? 11 : 10,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: isSmallTablet ? 12 : isLargeTablet ? 16 : 14,
    },
    configInfo: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      right: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      zIndex: 2,
    },
    configInfoText: {
      color: '#FFFFFF',
      fontSize: isSmallTablet ? 8 : isLargeTablet ? 10 : 9,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

  if (!intercomConfig.cameraIP) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <View style={styles.errorIconInner} />
          </View>
          <Text style={styles.errorText}>
            Cámara no configurada{'\n'}
            Configure la IP de la cámara{'\n'}
            en el intercomunicador
          </Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <View style={styles.errorIconInner} />
          </View>
          <Text style={styles.errorText}>
            Error de conexión{'\n'}
            Verifique la configuración{'\n'}
            de la cámara IP
          </Text>
        </View>
        <View style={styles.configInfo}>
          <Text style={styles.configInfoText}>
            {intercomConfig.cameraIP}:{intercomConfig.enableTLS ? intercomConfig.httpsPort : intercomConfig.httpPort}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            Conectando a cámara...{'\n'}
            {intercomConfig.cameraIP}
          </Text>
        </View>
      )}
      
      <WebView
        style={styles.webView}
        source={{ uri: streamUrl }}
        onLoad={handleWebViewLoad}
        onError={handleWebViewError}
        onHttpError={handleWebViewError}
        startInLoadingState={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
      />
      
      {!isLoading && !hasError && (
        <View style={styles.configInfo}>
          <Text style={styles.configInfoText}>
            {intercomConfig.name} • {intercomConfig.preferredResolution}
          </Text>
        </View>
      )}
    </View>
  );
}
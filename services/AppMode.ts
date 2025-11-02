import AsyncStorage from '@react-native-async-storage/async-storage';

const USE_SERVER_PROXY_KEY = 'use_server_proxy';
const PROXY_BASE_URL_KEY = 'proxy_base_url';

export async function getUseServerProxy(): Promise<boolean> {
	try {
		const val = await AsyncStorage.getItem(USE_SERVER_PROXY_KEY);
		if (val === null) {
			// FORZAR modo directo en Android para evitar problemas de red
			console.log('🔧 Configurando modo DIRECTO por defecto en Android');
			return false; // SIEMPRE directo en React Native/Android
		}
		return val === 'true';
	} catch {
		console.log('🔧 Error leyendo configuración, usando modo DIRECTO');
		return false; // SIEMPRE directo en React Native/Android
	}
}

export async function setUseServerProxy(value: boolean): Promise<void> {
	await AsyncStorage.setItem(USE_SERVER_PROXY_KEY, value ? 'true' : 'false');
}

export async function getProxyBaseUrl(): Promise<string> {
	try {
		const url = await AsyncStorage.getItem(PROXY_BASE_URL_KEY);
		return url || 'http://10.147.17.74:3001';
	} catch {
		return 'http://10.147.17.74:3001';
	}
}

export async function setProxyBaseUrl(url: string): Promise<void> {
	await AsyncStorage.setItem(PROXY_BASE_URL_KEY, url);
}



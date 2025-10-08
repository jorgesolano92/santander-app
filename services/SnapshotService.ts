import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface DirectSnapshotConfig {
    ip: string;
    username?: string;
    password?: string;
    preferHttps?: boolean;
    snapshotPath?: string; // ruta específica del modelo
}

function buildCandidates(ip: string, preferHttps: boolean, explicitPath?: string, auth?: { user?: string; pass?: string }): string[] {
    const authPrefix = auth && (auth.user || auth.pass) ? `${encodeURIComponent(auth.user || '')}:${encodeURIComponent(auth.pass || '')}@` : '';
    const httpBase = `http://${authPrefix}${ip}`;
    const httpsBase = `https://${authPrefix}${ip}`;
	const order = preferHttps ? [httpsBase, httpBase] : [httpBase, httpsBase];
    const paths = explicitPath ? [explicitPath.startsWith('/') ? explicitPath : `/${explicitPath}`] : [
		'/ISAPI/Streaming/channels/101/picture',
		'/Streaming/channels/101/picture',
		'/axis-cgi/jpg/image.cgi',
		'/cgi-bin/snapshot.cgi?channel=1',
		'/GetSnapshot/1',
		'/snapshot.jpg',
		'/jpeg/snap.jpg',
	];
	const urls: string[] = [];
	for (const base of order) {
		for (const p of paths) {
			urls.push(`${base}${p}`);
		}
	}
	return urls;
}

export async function downloadCameraSnapshotDirect(config: DirectSnapshotConfig): Promise<string | null> {
    const { ip, username, password, preferHttps, snapshotPath } = config;
    const urls = buildCandidates(ip, !!preferHttps, snapshotPath, { user: username, pass: password });

	// Request permission to save
	const permission = await MediaLibrary.requestPermissionsAsync();
	if (!permission.granted) {
		throw new Error('Permiso de galería denegado');
	}

	const ts = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `snapshot_${ip}_${ts}.jpg`;
	const destUri = `${FileSystem.cacheDirectory}${filename}`;

	for (const url of urls) {
		try {
        const res = await FileSystem.downloadAsync(url, destUri);
			if (res.status === 200 && res.headers && (res.headers['Content-Type'] || res.headers['content-type'] || '').includes('image')) {
				const asset = await MediaLibrary.createAssetAsync(res.uri);
				// Try to save to Download album; fallback to generic
				let album = await MediaLibrary.getAlbumAsync('Download');
				if (!album) {
					album = await MediaLibrary.createAlbumAsync('Download', asset, false);
				} else {
					await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
				}
				return res.uri;
			}
		} catch (e) {
			// try next
		}
	}

	return null;
}



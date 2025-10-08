const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Resolves RTSP dependency conflicts by excluding duplicates
 */
function withRtspConflictResolver(config) {
	return withAppBuildGradle(config, (config) => {
		// Force exclude ALL RTSP dependencies from react-native-video
		config.modResults.contents = config.modResults.contents.replace(
			/implementation\s+['"]react-native-video['"]/,
			`implementation('react-native-video') {
        exclude group: 'androidx.media3', module: 'media3-exoplayer-rtsp'
        exclude group: 'androidx.media3', module: 'media3-exoplayer'
    }`
		);
		
		// Add RTSP dependency with specific version to avoid conflicts
		if (!config.modResults.contents.includes('media3-exoplayer-rtsp')) {
			config.modResults.contents = config.modResults.contents.replace(
				/dependencies\s*\{[\s\S]*?\n\}/,
				(match) => {
					const insertion = `    implementation "androidx.media3:media3-exoplayer-rtsp:1.3.1"`;
					if (match.includes('media3-exoplayer-rtsp')) return match;
					return match.replace(/\n\}/, `\n${insertion}\n}`);
				}
			);
		}
		
		// Add ProGuard rules to handle duplicate classes
		if (!config.modResults.contents.includes('proguardFiles')) {
			config.modResults.contents = config.modResults.contents.replace(
				/buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?\}/,
				(match) => {
					const proguardRule = `
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'`;
					return match.replace(/\n\s*\}/, `${proguardRule}\n    }`);
				}
			);
		}
		
		return config;
	});
}

module.exports = function withRtspConflictResolverPlugin(config) {
	return withRtspConflictResolver(config);
};

const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Completely resolves RTSP dependency conflicts
 */
function withDependencyResolver(config) {
	return withAppBuildGradle(config, (config) => {
		// Remove ALL Media3 dependencies from react-native-video
		config.modResults.contents = config.modResults.contents.replace(
			/implementation\s+['"]react-native-video['"]/,
			`implementation('react-native-video') {
        exclude group: 'androidx.media3'
        exclude group: 'com.google.android.exoplayer'
    }`
		);
		
		// Add only the dependencies we need, in the correct order
		const dependencies = [
			'implementation "androidx.media3:media3-common:1.3.1"',
			'implementation "androidx.media3:media3-exoplayer:1.3.1"',
			'implementation "androidx.media3:media3-exoplayer-rtsp:1.3.1"',
			'implementation "androidx.media3:media3-datasource:1.3.1"',
			'implementation "androidx.media3:media3-datasource-rtmp:1.3.1"'
		];
		
		// Add dependencies if not already present
		dependencies.forEach(dep => {
			if (!config.modResults.contents.includes(dep.split('"')[1])) {
				config.modResults.contents = config.modResults.contents.replace(
					/dependencies\s*\{[\s\S]*?\n\}/,
					(match) => {
						return match.replace(/\n\}/, `\n    ${dep}\n}`);
					}
				);
			}
		});
		
		// Disable ProGuard for debug builds
		config.modResults.contents = config.modResults.contents.replace(
			/buildTypes\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}/,
			(match) => {
				if (!match.includes('minifyEnabled false')) {
					return match.replace(/\n\s*\}/, `\n        minifyEnabled false\n    }`);
				}
				return match;
			}
		);
		
		return config;
	});
}

module.exports = function withDependencyResolverPlugin(config) {
	return withDependencyResolver(config);
};

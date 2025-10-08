const { withAppBuildGradle, withPlugins } = require('@expo/config-plugins');

/**
 * Adds Media3 ExoPlayer RTSP dependency to Android app/build.gradle
 */
function withExoPlayerRtspGradle(config) {
	return withAppBuildGradle(config, (config) => {
		if (!config.modResults.contents.includes('media3-exoplayer-rtsp')) {
			config.modResults.contents = config.modResults.contents.replace(
				/dependencies\s*\{[\s\S]*?\n\}/,
				(match) => {
					const insertion = `    implementation "androidx.media3:media3-exoplayer-rtsp:1.3.1" {
        exclude group: 'androidx.media3', module: 'media3-exoplayer'
    }`;
					if (match.includes('implementation "androidx.media3:media3-exoplayer-rtsp')) return match;
					return match.replace(/\n\}/, `\n${insertion}\n}`);
				}
			);
		}
		return config;
	});
}

module.exports = function withExoPlayerRtsp(config) {
	return withPlugins(config, [withExoPlayerRtspGradle]);
};



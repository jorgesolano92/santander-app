const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET = path.join(
  'node_modules',
  'react-native-video',
  'android',
  'src',
  'main',
  'java',
  'com',
  'brentvatne',
  'exoplayer',
  'ReactExoplayerView.java'
);

const OLD_LINE = 'mediaSourceFactory = new RtspMediaSource.Factory();';
const NEW_LINE =
  'mediaSourceFactory = new RtspMediaSource.Factory().setForceUseRtpTcp(true);';

function patchRtspTcp(projectRoot) {
  const filePath = path.join(projectRoot, TARGET);
  if (!fs.existsSync(filePath)) {
    console.warn('[with-rtsp-tcp] No se encontró ReactExoplayerView.java');
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  if (contents.includes('setForceUseRtpTcp')) {
    return;
  }
  if (!contents.includes(OLD_LINE)) {
    console.warn('[with-rtsp-tcp] Línea RTSP no encontrada; revisa react-native-video');
    return;
  }
  fs.writeFileSync(filePath, contents.replace(OLD_LINE, NEW_LINE));
}

function withRtspTcp(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      patchRtspTcp(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
}

module.exports = function withRtspTcpPlugin(config) {
  return withRtspTcp(config);
};

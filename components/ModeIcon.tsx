/**
 * Iconos / diagramas de modos desde assets/svg.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { normalizeModeToId } from '@/config/modeTexts';
import { MODE_ICON_SVG, MODE_DIAGRAM_SVG } from '@/config/modeSvgAssets';

type IconProps = {
  mode?: string | null;
  size?: number;
  color?: string;
};

export default function ModeIcon({ mode, size = 28, color = '#495057' }: IconProps) {
  const id = normalizeModeToId(mode);
  const xml = id ? MODE_ICON_SVG[id] : null;
  if (!xml) return null;
  const tinted = xml.replace(/currentColor/g, color);
  return <SvgXml xml={tinted} width={size} height={size} />;
}

type DiagramProps = {
  mode?: string | null;
  width?: number;
  height?: number;
};

export function ModeDiagram({ mode, width = 280, height = 130 }: DiagramProps) {
  const id = normalizeModeToId(mode);
  let xml = id ? MODE_DIAGRAM_SVG[id] : null;
  if (xml) {
    // react-native-svg Android: orient="auto-start-reverse" → NumberFormatException
    xml = xml.replace(/orient="auto-start-reverse"/g, 'orient="auto"');
  }
  if (!xml) {
    return (
      <View style={[styles.diagramFallback, { width, height }]}>
        <ModeIcon mode={mode} size={64} color="#EC1C24" />
      </View>
    );
  }
  return (
    <View style={[styles.diagramWrap, { width, height }]}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  diagramWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

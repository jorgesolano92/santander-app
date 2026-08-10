import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SwipeToActivate from '@/components/SwipeToActivate';
import ModeIcon from '@/components/ModeIcon';

interface ModeSwipeRowProps {
  modeId: string;
  modeName: string;
  isSelected: boolean;
  isActive: boolean;
  onPreview: () => void;
  onActivate: () => void | boolean | Promise<void | boolean>;
}

export default function ModeSwipeRow({
  modeId,
  modeName,
  isSelected,
  isActive,
  onPreview,
  onActivate,
}: ModeSwipeRowProps) {
  const iconColor = isActive || isSelected ? '#EC1C24' : '#495057';

  if (isActive) {
    return (
      <TouchableOpacity
        style={[styles.row, styles.activeRow, isSelected && styles.selectedRow]}
        onPress={onPreview}
        activeOpacity={0.85}
      >
        <View style={styles.labelAreaActive}>
          <ModeIcon mode={modeId} size={26} color={iconColor} />
          <Text style={[styles.modeName, styles.modeNameActive]} numberOfLines={1}>
            {modeName}
          </Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVO</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, isSelected && styles.selectedRow]}>
      <TouchableOpacity style={styles.labelArea} onPress={onPreview} activeOpacity={0.7}>
        <ModeIcon mode={modeId} size={24} color={iconColor} />
        <Text style={[styles.modeName, isSelected && styles.modeNameSelected]} numberOfLines={1}>
          {modeName}
        </Text>
      </TouchableOpacity>
      <View style={styles.swipeArea}>
        <SwipeToActivate variant="compact" showHint={false} onActivate={onActivate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DEE2E6',
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  selectedRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EC1C24',
  },
  activeRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EC1C24',
    justifyContent: 'space-between',
  },
  labelArea: {
    width: '52%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  labelAreaActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  modeName: {
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    letterSpacing: 0.3,
  },
  modeNameSelected: {
    color: '#EC1C24',
  },
  modeNameActive: {
    color: '#B8161E',
    fontSize: 14,
  },
  swipeArea: {
    flex: 1,
    minWidth: 0,
  },
  activeBadge: {
    backgroundColor: '#EC1C24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

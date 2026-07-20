import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import SwipeToActivate from '@/components/SwipeToActivate';

interface ModeSwipeRowProps {
  modeName: string;
  isSelected: boolean;
  isActive: boolean;
  onPreview: () => void;
  onActivate: () => void | boolean | Promise<void | boolean>;
}

export default function ModeSwipeRow({
  modeName,
  isSelected,
  isActive,
  onPreview,
  onActivate,
}: ModeSwipeRowProps) {
  if (isActive) {
    return (
      <TouchableOpacity
        style={[styles.row, styles.activeRow, isSelected && styles.selectedRow]}
        onPress={onPreview}
        activeOpacity={0.85}
      >
        <Text style={[styles.modeName, styles.modeNameActive]}>{modeName}</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVO</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, isSelected && styles.selectedRow]}>
      <TouchableOpacity style={styles.labelArea} onPress={onPreview} activeOpacity={0.7}>
        <Text style={[styles.modeName, isSelected && styles.modeNameSelected]} numberOfLines={2}>
          {modeName}
        </Text>
      </TouchableOpacity>
      <View style={styles.swipeArea}>
        <SwipeToActivate
          variant="compact"
          showHint={false}
          onActivate={onActivate}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  selectedRow: {
    backgroundColor: '#FFF5F5',
  },
  activeRow: {
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: '#EC1C24',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  labelArea: {
    width: '38%',
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 4,
  },
  modeName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
    letterSpacing: 0.4,
  },
  modeNameSelected: {
    color: '#EC1C24',
  },
  modeNameActive: {
    color: '#B8161E',
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

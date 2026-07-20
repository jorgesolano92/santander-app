import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface SwipeToActivateProps {
  /** Devuelve true si el modo se activó; false para devolver el deslizante. */
  onActivate: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  hint?: string;
  showHint?: boolean;
  variant?: 'default' | 'compact';
  style?: ViewStyle;
}

const ACTIVATE_RATIO = 0.82;

export default function SwipeToActivate({
  onActivate,
  disabled = false,
  hint = 'Deslizar para activar el modo',
  showHint = true,
  variant = 'default',
  style,
}: SwipeToActivateProps) {
  const compact = variant === 'compact';
  const thumbSize = compact ? 34 : 52;
  const trackPadding = compact ? 3 : 4;
  /** Rectángulo con bordes redondeados (mismo lenguaje visual que el resto de la app). */
  const cornerRadius = compact ? 8 : 10;

  const trackWidth = useRef(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const lockedRef = useRef(false);
  const [pending, setPending] = useState(false);

  const maxDrag = () =>
    Math.max(0, trackWidth.current - thumbSize - trackPadding * 2);

  const resetThumb = () => {
    lockedRef.current = false;
    setPending(false);
    Animated.spring(dragX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const commitActivate = async (max: number) => {
    lockedRef.current = true;
    setPending(true);
    dragX.setValue(max);
    try {
      const result = await Promise.resolve(onActivate());
      if (result === false) {
        resetThumb();
      }
    } catch {
      resetThumb();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !lockedRef.current,
      onMoveShouldSetPanResponder: () => !disabled && !lockedRef.current,
      onPanResponderMove: (_, gesture) => {
        if (lockedRef.current) return;
        const max = maxDrag();
        const next = Math.max(0, Math.min(gesture.dx, max));
        dragX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        if (lockedRef.current) return;
        const max = maxDrag();
        if (max > 0 && gesture.dx >= max * ACTIVATE_RATIO) {
          void commitActivate(max);
          return;
        }
        resetThumb();
      },
      onPanResponderTerminate: () => {
        if (!lockedRef.current) resetThumb();
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const trackHeight = thumbSize + trackPadding * 2;

  return (
    <View style={[compact ? styles.wrapperCompact : styles.wrapper, style]}>
      {showHint && !compact ? <Text style={styles.hint}>{hint}</Text> : null}
      <View
        style={[
          styles.track,
          {
            height: trackHeight,
            borderRadius: cornerRadius,
            paddingHorizontal: trackPadding,
          },
          disabled && styles.trackDisabled,
        ]}
        onLayout={onTrackLayout}
      >
        <Text
          style={[
            styles.trackLabel,
            compact &&
              (pending ? styles.trackLabelPendingCompact : styles.trackLabelCompact),
          ]}
          numberOfLines={1}
        >
          {pending ? 'Activando…' : compact ? '→' : 'Deslizar →'}
        </Text>
        <Animated.View
          style={[
            styles.thumb,
            compact && styles.thumbCompact,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: cornerRadius,
              transform: [{ translateX: dragX }],
            },
            disabled && styles.thumbDisabled,
          ]}
          {...panResponder.panHandlers}
        >
          <ChevronRight
            size={compact ? 20 : 28}
            color="#FFFFFF"
            strokeWidth={2.5}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 420,
    marginTop: 8,
  },
  wrapperCompact: {
    width: '100%',
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  track: {
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackDisabled: {
    opacity: 0.5,
  },
  trackLabel: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    letterSpacing: 0.5,
  },
  trackLabelCompact: {
    fontSize: 11,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  trackLabelPendingCompact: {
    fontSize: 11,
    left: 10,
    right: 46,
    textAlign: 'center',
  },
  thumb: {
    backgroundColor: '#EC1C24',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC1C24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbCompact: {
    backgroundColor: '#EC1C24',
  },
  thumbDisabled: {
    backgroundColor: '#ADB5BD',
  },
});

import { View, Text, TouchableOpacity } from 'react-native';

export type ModeAction = 'set_rule' | 'set_output';

const MODE_ACTIONS: ModeAction[] = ['set_rule', 'set_output'];

type ActionSelectorStyles = {
  actionToggleRow: object;
  actionToggleBtn: object;
  actionToggleBtnActive: object;
  actionToggleText: object;
  actionToggleTextActive: object;
};

interface ActionSelectorProps {
  value: ModeAction | undefined;
  onChange: (action: ModeAction) => void;
  styles: ActionSelectorStyles;
}

export default function ActionSelector({ value, onChange, styles }: ActionSelectorProps) {
  const selected = value === 'set_output' ? 'set_output' : 'set_rule';

  return (
    <View style={styles.actionToggleRow}>
      {MODE_ACTIONS.map((modeAction) => (
        <TouchableOpacity
          key={modeAction}
          style={[styles.actionToggleBtn, selected === modeAction && styles.actionToggleBtnActive]}
          onPress={() => onChange(modeAction)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionToggleText, selected === modeAction && styles.actionToggleTextActive]}>
            {modeAction}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

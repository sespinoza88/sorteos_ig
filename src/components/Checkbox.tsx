import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.row} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Text style={styles.tick}>✓</Text>}</View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#888', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  boxOn: { backgroundColor: '#2980b9', borderColor: '#2980b9' },
  tick: { color: '#fff', fontWeight: 'bold' },
  label: { fontSize: 16, flex: 1 },
});

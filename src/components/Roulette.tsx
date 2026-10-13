import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

const COLORS = ['#e74c3c', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#d35400', '#c0392b'];
const SIZE = 300;
const R = SIZE / 2;

type Props = {
  names: string[]; // segmentos visibles (el ganador debe estar incluido)
  winnerIndex: number | null; // índice del segmento ganador; al cambiar, la ruleta gira
  spinKey: number; // incrementar para disparar un nuevo giro
  onFinish: () => void;
};

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: R + r * Math.sin(a), y: R - r * Math.cos(a) };
};

export function Roulette({ names, winnerIndex, spinKey, onFinish }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const current = useRef(0);
  const n = names.length;
  const seg = 360 / Math.max(n, 1);

  useEffect(() => {
    if (winnerIndex === null || spinKey === 0) return;
    const center = (winnerIndex + 0.5) * seg;
    // jitter dentro del segmento para que no caiga siempre en el centro
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const base = Math.ceil(current.current / 360) * 360;
    const target = base + 360 * 5 + (360 - center) + jitter;
    current.current = target;
    Animated.timing(rotation, {
      toValue: target,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => finished && onFinish());
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const slices = useMemo(
    () =>
      names.map((name, i) => {
        const a0 = i * seg;
        const a1 = (i + 1) * seg;
        const p0 = pt(a0, R - 4);
        const p1 = pt(a1, R - 4);
        const large = seg > 180 ? 1 : 0;
        const d = `M${R},${R} L${p0.x},${p0.y} A${R - 4},${R - 4} 0 ${large} 1 ${p1.x},${p1.y} Z`;
        const t = pt(a0 + seg / 2, R * 0.62);
        return { d, name, t, angle: a0 + seg / 2, color: COLORS[i % COLORS.length] };
      }),
    [names, seg],
  );

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wrap}>
      <View style={styles.pointer} />
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Svg width={SIZE} height={SIZE}>
          {n === 1 ? (
            <Circle cx={R} cy={R} r={R - 4} fill={COLORS[0]} />
          ) : (
            slices.map((s, i) => <Path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />)
          )}
          {slices.map((s, i) => (
            <G key={`t${i}`} rotation={s.angle - 90} origin={`${s.t.x}, ${s.t.y}`}>
              <SvgText x={s.t.x} y={s.t.y} fill="#fff" fontSize={13} fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                {s.name.length > 12 ? s.name.slice(0, 11) + '…' : s.name}
              </SvgText>
            </G>
          ))}
          <Circle cx={R} cy={R} r={14} fill="#fff" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
  pointer: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111',
  },
});

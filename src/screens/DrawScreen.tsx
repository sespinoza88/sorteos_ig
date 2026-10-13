import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Roulette } from '../components/Roulette';
import { pickWinners } from '../lib/draw';
import type { Comment } from '../lib/filters';

const MAX_SEGMENTS = 12;

type Props = { participants: Comment[]; winnersCount: number; onBack: () => void };

export function DrawScreen({ participants, winnersCount, onBack }: Props) {
  // Los ganadores se deciden por adelantado al azar; la ruleta solo los muestra.
  const winners = useMemo(() => pickWinners(participants, winnersCount), [participants, winnersCount]);
  const [done, setDone] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [wheel, setWheel] = useState<{ names: string[]; idx: number | null }>({ names: winners.map((w) => w.username), idx: null });

  const spin = () => {
    const winner = winners[done.length];
    const rest = participants
      .map((p) => p.username)
      .filter((u, i, a) => a.indexOf(u) === i && u !== winner.username && !done.includes(u));
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const names = rest.slice(0, MAX_SEGMENTS - 1);
    const idx = Math.floor(Math.random() * (names.length + 1));
    names.splice(idx, 0, winner.username);
    setWheel({ names, idx });
    setSpinning(true);
    setSpinKey((k) => k + 1);
  };

  const finished = done.length >= winners.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sorteo</Text>
      <Roulette
        names={wheel.names}
        winnerIndex={wheel.idx}
        spinKey={spinKey}
        onFinish={() => {
          setDone((d) => [...d, winners[d.length].username]);
          setSpinning(false);
        }}
      />
      <View style={{ marginTop: 24 }}>
        {done.map((u, i) => (
          <Text key={u} style={styles.winner}>
            🏆 Ganador {i + 1}: @{u}
          </Text>
        ))}
      </View>
      {!finished && (
        <TouchableOpacity style={[styles.btn, spinning && { opacity: 0.5 }]} disabled={spinning} onPress={spin}>
          <Text style={styles.btnText}>{done.length === 0 ? '¡Girar!' : `Girar para ganador ${done.length + 1}`}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.btn, styles.secondary]} disabled={spinning} onPress={onBack}>
        <Text style={styles.btnText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold' },
  winner: { fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  btn: { backgroundColor: '#27ae60', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, marginTop: 16 },
  secondary: { backgroundColor: '#7f8c8d' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Roulette } from '../components/Roulette';
import type { Comment } from '../lib/filters';

const MAX_SEGMENTS = 12;

type Props = { participants: Comment[]; winnersCount: number; onBack: () => void };

export function DrawScreen({ participants, winnersCount, onBack }: Props) {
  // Lista única de participantes elegibles
  const uniqueParticipants = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of participants) {
      const u = p.username;
      if (!seen.has(u.toLowerCase())) {
        seen.add(u.toLowerCase());
        list.push(u);
      }
    }
    return list;
  }, [participants]);

  // Lista inicial para mostrar en la ruleta antes de girar (muestra participantes al azar, no ganadores predeterminados)
  const initialWheelNames = useMemo(() => {
    const shuffled = [...uniqueParticipants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(MAX_SEGMENTS, shuffled.length));
  }, [uniqueParticipants]);

  const [done, setDone] = useState<string[]>([]);
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [wheel, setWheel] = useState<{ names: string[]; idx: number | null }>({
    names: initialWheelNames,
    idx: null,
  });

  const spin = () => {
    // Los participantes elegibles para esta ronda son los que aún no ganaron
    const pool = uniqueParticipants.filter((u) => !done.includes(u));
    if (pool.length === 0) return;

    // Se elige al ganador al azar en el momento de girar
    const winnerIdxInPool = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIdxInPool];
    setCurrentWinner(winner);

    // Los demás segmentos se completan con otros participantes al azar
    const rest = pool.filter((u) => u !== winner);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    const names = rest.slice(0, MAX_SEGMENTS - 1);
    const targetIdx = Math.floor(Math.random() * (names.length + 1));
    names.splice(targetIdx, 0, winner);

    setWheel({ names, idx: targetIdx });
    setSpinning(true);
    setSpinKey((k) => k + 1);
  };

  const totalWinnersAllowed = Math.min(winnersCount, uniqueParticipants.length);
  const finished = done.length >= totalWinnersAllowed;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sorteo</Text>
      <Roulette
        names={wheel.names}
        winnerIndex={wheel.idx}
        spinKey={spinKey}
        onFinish={() => {
          if (currentWinner) {
            setDone((d) => [...d, currentWinner]);
          }
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

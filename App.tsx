import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SetupScreen } from './src/screens/SetupScreen';
import { DrawScreen } from './src/screens/DrawScreen';
import type { Comment } from './src/lib/filters';

export default function App() {
  const [draw, setDraw] = useState<{ participants: Comment[]; winners: number } | null>(null);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        {draw ? (
          <DrawScreen participants={draw.participants} winnersCount={draw.winners} onBack={() => setDraw(null)} />
        ) : (
          <SetupScreen onStart={(participants, winners) => setDraw({ participants, winners })} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

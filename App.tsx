import React, { useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SetupScreen } from './src/screens/SetupScreen';
import { DrawScreen } from './src/screens/DrawScreen';
import type { Comment } from './src/lib/filters';
import { logger, setLogPlatform } from './src/lib/logger';

setLogPlatform(Platform.OS);

export default function App() {
  const [draw, setDraw] = useState<{ participants: Comment[]; winners: number } | null>(null);
  React.useEffect(() => {
    logger.info('app.started', { version: process.env.EXPO_PUBLIC_APP_VERSION ?? 'unknown' });
  }, []);

  const returnToSetup = () => {
    logger.info('draw.return_to_setup');
    setDraw(null);
  };

  const startDraw = (participants: Comment[], winners: number) => {
    logger.info('draw.started', { participantCount: participants.length, winners });
    setDraw({ participants, winners });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        {draw ? (
          <DrawScreen participants={draw.participants} winnersCount={draw.winners} onBack={returnToSetup} />
        ) : (
          <SetupScreen onStart={startDraw} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

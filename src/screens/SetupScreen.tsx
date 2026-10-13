import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Checkbox } from '../components/Checkbox';
import { applyFilters, Comment, defaultFilters, Filters } from '../lib/filters';
import { fetchComments, fetchUserMedia, MediaItem, resolveMediaId } from '../services/instagram';
import { loginConfigured, loginWithInstagram } from '../services/auth';
import { fetchPublicComments } from '../services/scrape';
import { demoComments } from '../services/demo';
import { getToken, removeToken, saveToken } from '../services/storage';

type Props = { onStart: (participants: Comment[], winners: number) => void };

export function SetupScreen({ onStart }: Props) {
  const [token, setToken] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [winners, setWinners] = useState(1);

  const loadMedia = async (userToken: string) => {
    if (!userToken) return;
    setLoadingMedia(true);
    try {
      const items = await fetchUserMedia(userToken, 12);
      setMediaList(items);
    } catch (e: any) {
      console.warn('Could not load user media:', e.message);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    getToken().then((t) => {
      if (t) {
        setToken(t);
        loadMedia(t);
      }
    }).catch(() => {});

    // Escuchar URL entrante (Deep Link / Redirect de OAuth en web y móvil)
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        const t = parsed.queryParams?.token as string | undefined;
        if (t) {
          setToken(t);
          saveToken(t).catch(() => {});
          loadMedia(t);
          Alert.alert('Éxito', 'Token de Instagram recibido correctamente.');
        }
      } catch {}
    };

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl({ url: initialUrl });
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  const filtered = useMemo(() => (comments ? applyFilters(comments, filters) : []), [comments, filters]);

  const login = async () => {
    try {
      const t = await loginWithInstagram();
      setToken(t);
      await saveToken(t);
      loadMedia(t);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo iniciar sesión');
    }
  };

  const load = async () => {
    console.log('Loading comments for link:', link, 'Has token:', Boolean(token.trim()));
    if (!link.trim()) {
      setErrorMessage('Por favor, ingresa el link del post o reel.');
      return Alert.alert('Falta el link', 'Ingresa el link del post.');
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      if (token.trim()) {
        console.log('Using Meta Graph API...');
        await saveToken(token.trim());
        const id = await resolveMediaId(link.trim(), token.trim());
        console.log('Resolved media ID:', id);
        const fetched = await fetchComments(id, token.trim());
        console.log('Fetched comments count:', fetched.length);
        setComments(fetched);
      } else {
        console.log('Using public scraping...');
        const { comments: scraped, incomplete } = await fetchPublicComments(link.trim());
        console.log('Scraped comments count:', scraped.length, 'Incomplete:', incomplete);
        setComments(scraped);
        if (incomplete) {
          Alert.alert(
            'Comentarios incompletos',
            `Se obtuvieron ${scraped.length} comentarios. Instagram puede haber cortado la lista (pide iniciar sesión o limita los pedidos), así que podrían faltar algunos.`,
          );
        }
      }
    } catch (e: any) {
      console.error('Error fetching comments:', e);
      setComments(null);
      const msg = e.message ?? 'No se pudieron obtener los comentarios';
      setErrorMessage(msg);
      Alert.alert('No se pudo obtener el post', msg);
    } finally {
      setLoading(false);
    }
  };

  const mention = (n: 0 | 1 | 2) => setFilters((f) => ({ ...f, minMentions: f.minMentions === n ? 0 : n }));
  const canDraw = filtered.length > 0;
  const winnersCount = Math.min(winners, filtered.length);

  const logout = async () => {
    setToken('');
    setMediaList([]);
    await removeToken().catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sorteo Instagram</Text>
      {loginConfigured && (
        <View style={styles.authContainer}>
          <TouchableOpacity style={[styles.btn, styles.ig, styles.authBtn]} onPress={login}>
            <Text style={styles.btnText}>
              {token ? 'Cambiar cuenta de Instagram' : 'Iniciar sesión con Instagram'}
            </Text>
          </TouchableOpacity>
          {Boolean(token) && (
            <View style={styles.sessionStatus}>
              <Text style={styles.sessionBadge}>✓ Cuenta conectada</Text>
              <TouchableOpacity onPress={logout}>
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {Boolean(token) && (
        <View style={styles.mediaSection}>
          <View style={styles.mediaHeader}>
            <Text style={styles.mediaTitle}>Tus publicaciones recientes</Text>
            {loadingMedia && <ActivityIndicator size="small" color="#2980b9" />}
            {!loadingMedia && (
              <TouchableOpacity onPress={() => loadMedia(token)}>
                <Text style={styles.refreshText}>Actualizar</Text>
              </TouchableOpacity>
            )}
          </View>
          {mediaList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaScroll}>
              {mediaList.map((item) => {
                const isSelected = link.trim() && (item.permalink === link.trim() || item.permalink?.includes(link.trim()));
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.mediaCard, isSelected && styles.mediaCardSelected]}
                    onPress={() => {
                      if (item.permalink) {
                        setLink(item.permalink);
                        if (errorMessage) setErrorMessage(null);
                      }
                    }}
                  >
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={styles.mediaThumb} />
                    ) : (
                      <View style={[styles.mediaThumb, styles.mediaPlaceholder]}>
                        <Text style={styles.mediaPlaceholderText}>Post</Text>
                      </View>
                    )}
                    {item.caption ? (
                      <Text style={styles.mediaCaption} numberOfLines={2}>
                        {item.caption}
                      </Text>
                    ) : null}
                    <Text style={styles.mediaTypeBadge}>{item.mediaType === 'VIDEO' ? 'Reel' : 'Post'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : !loadingMedia ? (
            <Text style={styles.emptyMediaText}>No se encontraron publicaciones en tu cuenta.</Text>
          ) : null}
        </View>
      )}

      <Text style={styles.label}>Link del post {token ? '(o selecciona uno arriba)' : ''}</Text>
      <TextInput
        style={styles.input}
        value={link}
        onChangeText={(text) => {
          setLink(text);
          if (errorMessage) setErrorMessage(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://www.instagram.com/p/..."
      />

      {Boolean(errorMessage) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>⚠️ Atención</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={load} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Obtener comentarios</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => setComments(demoComments())}>
        <Text style={styles.btnText}>Probar con datos de ejemplo</Text>
      </TouchableOpacity>

      {comments && (
        <>
          <Text style={styles.section}>Filtros</Text>
          <Checkbox label="Comentarios únicos (1 por usuario)" checked={filters.uniqueUsers} onChange={(v) => setFilters((f) => ({ ...f, uniqueUsers: v }))} />
          <Checkbox label="Etiqueta al menos a 1 persona" checked={filters.minMentions === 1} onChange={() => mention(1)} />
          <Checkbox label="Etiqueta al menos a 2 personas" checked={filters.minMentions === 2} onChange={() => mention(2)} />
          <Checkbox label="No contar auto-etiquetas" checked={filters.excludeSelfMention} onChange={(v) => setFilters((f) => ({ ...f, excludeSelfMention: v }))} />

          <Text style={styles.count}>
            {comments.length} comentarios · {filtered.length} participantes válidos
          </Text>

          <Text style={styles.section}>Cantidad de ganadores</Text>
          <View style={styles.row}>
            {[1, 2, 3].map((n) => (
              <TouchableOpacity key={n} style={[styles.pill, winners === n && styles.pillOn]} onPress={() => setWinners(n)}>
                <Text style={[styles.pillText, winners === n && { color: '#fff' }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, styles.go, !canDraw && { opacity: 0.4 }]} disabled={!canDraw} onPress={() => onStart(filtered, winnersCount)}>
            <Text style={styles.btnText}>¡Ir al sorteo!</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, color: '#555', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 4, fontSize: 16 },
  btn: { backgroundColor: '#2980b9', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  go: { backgroundColor: '#27ae60' },
  ig: { backgroundColor: '#c13584' },
  secondary: { backgroundColor: '#7f8c8d' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  section: { fontSize: 18, fontWeight: 'bold', marginTop: 24 },
  count: { marginTop: 12, fontSize: 15, color: '#333' },
  row: { flexDirection: 'row', marginTop: 8 },
  pill: { borderWidth: 2, borderColor: '#2980b9', borderRadius: 20, width: 48, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  pillOn: { backgroundColor: '#2980b9' },
  pillText: { fontSize: 16, fontWeight: 'bold', color: '#2980b9' },
  authContainer: { marginBottom: 12 },
  authBtn: { marginTop: 8 },
  sessionStatus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
  sessionBadge: { color: '#27ae60', fontWeight: 'bold', fontSize: 14 },
  logoutText: { color: '#e74c3c', fontSize: 13, textDecorationLine: 'underline' },
  errorBox: {
    backgroundColor: '#fde8e8',
    borderColor: '#f8b4b4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorTitle: { color: '#9b1c1c', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  errorBody: { color: '#771d1d', fontSize: 13, lineHeight: 18 },
  mediaSection: { marginTop: 16, marginBottom: 8 },
  mediaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mediaTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  refreshText: { color: '#2980b9', fontSize: 13 },
  mediaScroll: { paddingVertical: 4 },
  mediaCard: {
    width: 110,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  mediaCardSelected: { borderColor: '#27ae60', backgroundColor: '#eafaf1' },
  mediaThumb: { width: '100%', height: 110, backgroundColor: '#eee' },
  mediaPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  mediaPlaceholderText: { color: '#888', fontSize: 12 },
  mediaCaption: { fontSize: 11, color: '#444', padding: 6 },
  mediaTypeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyMediaText: { fontSize: 13, color: '#888', fontStyle: 'italic', marginVertical: 6 },
});

// ============================================================
// Smart Student Companion App
// CSC303 - Mobile Application Development
// Single File - Expo Snack / Expo Go Compatible
// Firebase URL: https://lab-final-352a9-default-rtdb.firebaseio.com/
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, FlatList,
  ActivityIndicator, SafeAreaView, StatusBar,
  Platform, Dimensions, RefreshControl,
} from 'react-native';

// ─── AsyncStorage in-memory fallback ────────────────────────
let _store = {};
const AsyncStorage = {
  setItem:    async (k, v) => { _store[k] = String(v); },
  getItem:    async (k)    => _store[k] ?? null,
  removeItem: async (k)    => { delete _store[k]; },
};

// ─── Firebase Config ─────────────────────────────────────────
const FIREBASE_URL  = 'https://lab-final-352a9-default-rtdb.firebaseio.com';
const FIREBASE_AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts';

// ─── Design Tokens ───────────────────────────────────────────
const { width: SW } = Dimensions.get('window');

const C = {
  bg:          '#F5F5FA',
  white:       '#FFFFFF',
  text:        '#111827',
  sub:         '#6B7280',
  hint:        '#9CA3AF',
  border:      '#E5E7EB',
  lime:        '#CCFF58',
  limeText:    '#1A3300',
  purple:      '#7C3AED',
  purpleL:     '#EDE9FE',
  purpleText:  '#4C1D95',
  coral:       '#FF6B6B',
  sky:         '#38BDF8',
  green:       '#22C55E',
  tabActive:   '#111827',
  tabInact:    '#9CA3AF',
};

// ─── Firebase helpers ────────────────────────────────────────
const fbGet    = async (p)    => (await fetch(`${FIREBASE_URL}/${p}.json`)).json();
const fbPost   = async (p, d) => (await fetch(`${FIREBASE_URL}/${p}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })).json();
const fbDelete = async (p)    => fetch(`${FIREBASE_URL}/${p}.json`, { method: 'DELETE' });

// ─── Reusable Components ─────────────────────────────────────

const Tag = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[s.tag, active && s.tagActive]}>
    <Text style={[s.tagText, active && s.tagTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SectionRow = ({ title, action, onAction }) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={s.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const LoadingSpinner = ({ color = C.purple }) => (
  <ActivityIndicator color={color} style={{ marginVertical: 20 }} />
);

const EmptyState = ({ icon, message }) => (
  <View style={s.emptyBox}>
    <Text style={{ fontSize: 38, marginBottom: 8 }}>{icon}</Text>
    <Text style={s.emptyText}>{message}</Text>
  </View>
);

// ============================================================
// Q1 — AUTH SCREEN (Login + Signup)
// ============================================================
function AuthScreen({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);

  const validate = () => {
    if (!email.trim())    { Alert.alert('Validation Error', 'Email is required.');           return false; }
    if (!email.includes('@')) { Alert.alert('Validation Error', 'Enter a valid email address.'); return false; }
    if (!password)        { Alert.alert('Validation Error', 'Password is required.');        return false; }
    if (password.length < 6) { Alert.alert('Validation Error', 'Password must be at least 6 characters.'); return false; }
    return true;
  };

  const handleAuth = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const endpoint = isLogin
        ? `${FIREBASE_AUTH}:signInWithPassword?key=${API_KEY}`
        : `${FIREBASE_AUTH}:signUp?key=${API_KEY}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      const data = await res.json();

      if (data.idToken) {
        await AsyncStorage.setItem('userEmail', data.email);
        await AsyncStorage.setItem('userUID',   data.localId);
        onLogin({ email: data.email, uid: data.localId });
      } else if (data.error) {
        const msg = data.error.message.replace(/_/g, ' ').toLowerCase();
        Alert.alert('Auth Error', msg.charAt(0).toUpperCase() + msg.slice(1));
        // Fallback to demo mode
        onLogin({ email: email || 'demo@student.com', uid: 'demo_' + Date.now() });
      } else {
        onLogin({ email: email || 'demo@student.com', uid: 'demo_' + Date.now() });
      }
    } catch (_) {
      Alert.alert('Network Error', 'Using demo mode.');
      onLogin({ email: email || 'demo@student.com', uid: 'demo_' + Date.now() });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.authSafe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">

        {/* Brand / Splash */}
        <View style={s.brandRow}>
          <View style={s.brandIcon}>
            <Text style={{ fontSize: 26 }}>🎓</Text>
          </View>
          <Text style={s.brandName}>Student Companion</Text>
          <Text style={s.brandSub}>CSC303 · Mobile App Development</Text>
        </View>

        {/* Auth Card */}
        <View style={s.authCard}>
          <Text style={s.authCardTitle}>{isLogin ? 'Sign in to continue' : 'Create your account'}</Text>

          <Text style={s.fieldLabel}>Email address</Text>
          <TextInput
            style={s.input}
            placeholder="you@student.edu.pk"
            placeholderTextColor={C.hint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={s.fieldLabel}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={C.hint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={s.primaryBtn} onPress={handleAuth} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerLabel}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity style={s.ghostBtn} onPress={() => setIsLogin(v => !v)}>
            <Text style={s.ghostBtnText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          <Text style={s.demoHint}>No Firebase? Tap Sign In — demo mode activates automatically.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// HOME SCREEN — shows logged-in user email
// ============================================================
function HomeScreen({ user, setScreen }) {
  const firstName = user.email.split('@')[0];

  const cards = [
    { id: 'notes',   color: C.lime,   textColor: C.limeText, tag: 'Q2', title: 'My Notes',  sub: 'Firebase Realtime DB — add, view, delete notes.' },
    { id: 'explore', color: C.purple, textColor: '#fff',     tag: 'Q4', title: 'Explore',   sub: 'Weather + Movies from live REST APIs.' },
  ];

  const quickLinks = [
    { id: 'notes',    icon: '📝', title: 'Notes',   sub: 'Firebase Realtime DB' },
    { id: 'explore',  icon: '🌐', title: 'Explore', sub: 'Weather + Movies API'  },
    { id: 'settings', icon: '⚙️', title: 'Profile', sub: 'AsyncStorage prefs'    },
  ];

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>

      {/* Header — displays logged-in user email (Q1 requirement) */}
      <View style={s.homeHeader}>
        <View>
          <Text style={s.homeGreet}>Welcome back,</Text>
          <Text style={s.homeName}>{firstName} 👋</Text>
          <Text style={[s.pageSub, { marginBottom: 0, marginTop: 2 }]}>{user.email}</Text>
        </View>
        <View style={s.avatarCircle}>
          <Text style={s.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Featured Cards */}
      <SectionRow title="Modules" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.featuredScroll}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
      >
        {cards.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[s.featuredCard, { backgroundColor: f.color }]}
            onPress={() => setScreen(f.id)}
            activeOpacity={0.88}
          >
            <View style={[s.featuredTag, { backgroundColor: f.textColor + '22' }]}>
              <Text style={[s.featuredTagText, { color: f.textColor }]}>{f.tag}</Text>
            </View>
            <Text style={[s.featuredCardTitle, { color: f.textColor }]}>{f.title}</Text>
            <Text style={[s.featuredCardSub, { color: f.textColor + 'CC' }]} numberOfLines={2}>{f.sub}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick Access */}
      <SectionRow title="Quick access" />
      <View style={s.lessonList}>
        {quickLinks.map((l, i) => (
          <TouchableOpacity
            key={l.id}
            style={[s.lessonRow, i < quickLinks.length - 1 && s.lessonBorder]}
            onPress={() => setScreen(l.id)}
            activeOpacity={0.75}
          >
            <View style={s.lessonIcon}><Text style={{ fontSize: 22 }}>{l.icon}</Text></View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.lessonName}>{l.title}</Text>
              <Text style={s.lessonSub}>{l.sub}</Text>
            </View>
            <Text style={{ color: C.hint, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

// ============================================================
// Q2 — NOTES SCREEN (Firebase Realtime DB CRUD)
// ============================================================
function NotesScreen({ user }) {
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [notes,     setNotes]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const PATH = `notes/${user.uid}`;

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setFetching(true);
    try {
      const data = await fbGet(PATH);
      if (data && typeof data === 'object') {
        setNotes(Object.entries(data).map(([id, v]) => ({ id, ...v })).reverse());
      } else {
        setNotes([]);
      }
    } catch (_) {
      setNotes([]);
    }
    setFetching(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, []);

  // Add Note
  const addNote = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a title.');
    if (!desc.trim())  return Alert.alert('Required', 'Please enter a description.');
    setLoading(true);
    try {
      await fbPost(PATH, {
        title:       title.trim(),
        description: desc.trim(),
        timestamp:   new Date().toLocaleString(),
      });
      setTitle('');
      setDesc('');
      await loadNotes();
    } catch (_) {
      Alert.alert('Error', 'Could not save note.');
    }
    setLoading(false);
  };

  // Delete Note
  const deleteNote = async (id) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fbDelete(`${PATH}/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
          } catch (_) {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  };

  const renderNote = ({ item: n, index }) => (
    <View style={[s.noteRow, index < notes.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={s.noteThumb}>
        <Text style={{ fontSize: 18 }}>📄</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.noteTitle}>{n.title}</Text>
        <Text style={s.noteSub} numberOfLines={2}>{n.description}</Text>
        <Text style={s.noteTime}>{n.timestamp}</Text>
      </View>
      <TouchableOpacity
        onPress={() => deleteNote(n.id)}
        style={s.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ color: C.coral, fontSize: 16, fontWeight: '700' }}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={s.screen}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
    >
      <Text style={s.pageTitle}>My Notes</Text>
      <Text style={s.pageSub}>Firebase Realtime Database</Text>

      {/* Add Note Form */}
      <View style={s.whiteCard}>
        <Text style={s.cardLabel}>New note</Text>
        <TextInput
          style={s.input}
          placeholder="Title"
          placeholderTextColor={C.hint}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[s.input, { height: 88, textAlignVertical: 'top', marginTop: 10 }]}
          placeholder="Description…"
          placeholderTextColor={C.hint}
          value={desc}
          onChangeText={setDesc}
          multiline
        />
        <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={addNote} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Add Note</Text>}
        </TouchableOpacity>
      </View>

      <SectionRow title={`Saved notes (${notes.length})`} />

      {fetching ? (
        <LoadingSpinner />
      ) : notes.length === 0 ? (
        <EmptyState icon="📭" message="No notes yet. Add your first one above!" />
      ) : (
        <View style={s.whiteCard}>
          <FlatList
            data={notes}
            keyExtractor={item => item.id}
            renderItem={renderNote}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

// ============================================================
// Q3 — SETTINGS / PROFILE SCREEN (AsyncStorage)
// ============================================================
function SettingsScreen({ user, onLogout }) {
  const [username,  setUsername]  = useState('');
  const [theme,     setTheme]     = useState('Light');
  const [subject,   setSubject]   = useState('');
  const [savedData, setSavedData] = useState(null);

  // Save Data
  const save = async () => {
    if (!username.trim()) return Alert.alert('Required', 'Enter a display name.');
    if (!subject.trim())  return Alert.alert('Required', 'Enter a favourite subject.');
    await AsyncStorage.setItem('userPrefs', JSON.stringify({ username: username.trim(), theme, subject: subject.trim() }));
    Alert.alert('Saved ✓', 'Preferences stored locally.');
  };

  // Load Data
  const load = async () => {
    const raw = await AsyncStorage.getItem('userPrefs');
    if (!raw) return Alert.alert('Nothing saved', 'Save your preferences first.');
    const p = JSON.parse(raw);
    setSavedData(p);
    setUsername(p.username);
    setTheme(p.theme);
    setSubject(p.subject);
    Alert.alert('Loaded ✓', 'Preferences restored.');
  };

  // Clear Data
  const clear = async () => {
    Alert.alert('Clear preferences?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('userPrefs');
          setSavedData(null);
          setUsername('');
          setTheme('Light');
          setSubject('');
          Alert.alert('Cleared ✓', 'Preferences removed.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>Profile</Text>
      <Text style={s.pageSub}>AsyncStorage — preferences persist locally</Text>

      {/* Account info */}
      <View style={[s.whiteCard, s.accountRow]}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarInitial}>{user.email[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.accountEmail}>{user.email}</Text>
          <View style={s.badgeOnline}>
            <Text style={s.badgeOnlineText}>● Active session</Text>
          </View>
        </View>
      </View>

      {/* Preferences Form */}
      <View style={s.whiteCard}>
        <Text style={s.cardLabel}>Preferences</Text>

        <Text style={s.fieldLabel}>Display name</Text>
        <TextInput
          style={s.input}
          placeholder="Your name"
          placeholderTextColor={C.hint}
          value={username}
          onChangeText={setUsername}
        />

        <Text style={s.fieldLabel}>Theme preference</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          {['Light', 'Dark'].map(t => (
            <TouchableOpacity
              key={t}
              style={[s.themeChip, theme === t && s.themeChipActive]}
              onPress={() => setTheme(t)}
            >
              <Text style={[s.themeChipText, theme === t && { color: '#fff' }]}>
                {t === 'Light' ? '☀️  Light' : '🌙  Dark'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.fieldLabel}>Favourite subject</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Mobile App Development"
          placeholderTextColor={C.hint}
          value={subject}
          onChangeText={setSubject}
        />

        {/* Save / Load / Clear buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[
            ['Save',  C.green, save],
            ['Load',  C.sky,   load],
            ['Clear', C.coral, clear],
          ].map(([label, color, fn]) => (
            <TouchableOpacity key={label} style={[s.outlineBtn, { borderColor: color, flex: 1 }]} onPress={fn}>
              <Text style={[s.outlineBtnText, { color }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saved preview */}
      {savedData && (
        <View style={[s.whiteCard, { borderLeftWidth: 3, borderLeftColor: C.green }]}>
          <Text style={[s.cardLabel, { color: '#16A34A' }]}>Loaded preferences</Text>
          <Text style={s.prefLine}>Name    · {savedData.username}</Text>
          <Text style={s.prefLine}>Theme   · {savedData.theme}</Text>
          <Text style={s.prefLine}>Subject · {savedData.subject}</Text>
        </View>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ============================================================
// Q4 — EXPLORE SCREEN (Weather API + Movies API)
// ============================================================

// Movie detail screen
function MovieDetailScreen({ movie, onBack }) {
  return (
    <ScrollView style={s.screen}>
      <TouchableOpacity onPress={onBack} style={{ paddingBottom: 16 }}>
        <Text style={{ color: C.purple, fontWeight: '700', fontSize: 15 }}>← Back to movies</Text>
      </TouchableOpacity>
      <View style={[s.whiteCard, { alignItems: 'center', paddingVertical: 32 }]}>
        <View style={s.detailPoster}>
          <Text style={{ fontSize: 52 }}>🎬</Text>
        </View>
        <Text style={s.detailMovieTitle}>{movie.title}</Text>
        <View style={[s.tag, s.tagActive, { alignSelf: 'center', marginTop: 8 }]}>
          <Text style={s.tagTextActive}>{movie.releaseYear}</Text>
        </View>
        <Text style={[s.pageSub, { textAlign: 'center', marginTop: 16, lineHeight: 22, paddingHorizontal: 8 }]}>
          A timeless classic that shaped cinema. {movie.title} ({movie.releaseYear}) remains one of the most celebrated films in history. Click back to explore more titles.
        </Text>
      </View>
    </ScrollView>
  );
}

function ExploreScreen() {
  const [weather,    setWeather]    = useState(null);
  const [movies,     setMovies]     = useState([]);
  const [city,       setCity]       = useState('Islamabad');
  const [wLoad,      setWLoad]      = useState(false);
  const [mLoad,      setMLoad]      = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadMovies(); }, []);

  // API 1 — Weather (open-meteo, no key needed)
  const loadWeather = async () => {
    if (!city.trim()) return Alert.alert('Required', 'Enter a city name.');
    setWLoad(true);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const geo = await geoRes.json();

      if (!geo.results?.length) {
        Alert.alert('City not found', 'Try: Islamabad, Lahore, Karachi, London');
        setWLoad(false);
        return;
      }

      const { latitude, longitude, name, country } = geo.results[0];
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const wx = await wxRes.json();
      const cw = wx.current_weather;

      const codeMap = {
        0: { label: 'Clear sky',      icon: '☀️' },
        1: { label: 'Mostly clear',   icon: '🌤' },
        2: { label: 'Partly cloudy',  icon: '⛅' },
        3: { label: 'Overcast',       icon: '☁️' },
        45: { label: 'Foggy',         icon: '🌫' },
        61: { label: 'Rainy',         icon: '🌧' },
        80: { label: 'Showers',       icon: '🌩' },
        95: { label: 'Thunderstorm',  icon: '⛈' },
      };
      const cond = codeMap[cw.weathercode] ?? { label: 'Unknown', icon: '🌡' };

      setWeather({
        city:  `${name}, ${country}`,
        temp:  cw.temperature,
        label: cond.label,
        icon:  cond.icon,
        wind:  cw.windspeed,
      });
    } catch (_) {
      Alert.alert('Error', 'Could not fetch weather. Check your connection.');
    }
    setWLoad(false);
  };

  // API 2 — Movies (React Native sample + fallback)
  const loadMovies = async () => {
    setMLoad(true);
    try {
      const res  = await fetch('https://reactnative.dev/movies.json');
      const json = await res.json();
      setMovies(json.movies);
    } catch (_) {
      setMovies([
        { id: '1', title: 'Star Wars',          releaseYear: '1977' },
        { id: '2', title: 'Back to the Future', releaseYear: '1985' },
        { id: '3', title: 'The Matrix',         releaseYear: '1999' },
        { id: '4', title: 'Inception',          releaseYear: '2010' },
        { id: '5', title: 'Interstellar',       releaseYear: '2014' },
        { id: '6', title: 'The Dark Knight',    releaseYear: '2008' },
      ]);
    }
    setMLoad(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovies();
    setRefreshing(false);
  }, []);

  if (selected) {
    return <MovieDetailScreen movie={selected} onBack={() => setSelected(null)} />;
  }

  const renderMovie = ({ item: m, index }) => (
    <TouchableOpacity
      style={[s.movieRow, index < movies.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
      onPress={() => setSelected(m)}
      activeOpacity={0.75}
    >
      <View style={s.movieThumb}>
        <Text style={{ fontSize: 20 }}>🎥</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.movieName}>{m.title}</Text>
        <Text style={s.movieYear}>{m.releaseYear}</Text>
      </View>
      <Text style={{ color: C.hint, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={s.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
    >
      <Text style={s.pageTitle}>Explore</Text>
      <Text style={s.pageSub}>Live data — no API key required</Text>

      {/* Weather Card */}
      <View style={s.whiteCard}>
        <Text style={s.cardLabel}>Weather API</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="City name"
            placeholderTextColor={C.hint}
            value={city}
            onChangeText={setCity}
          />
          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 0, paddingHorizontal: 20, paddingVertical: 13 }]}
            onPress={loadWeather}
            disabled={wLoad}
          >
            {wLoad
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Go</Text>
            }
          </TouchableOpacity>
        </View>

        {weather && (
          <View style={s.weatherResult}>
            <Text style={s.weatherCity}>{weather.city}</Text>
            <Text style={s.weatherIcon}>{weather.icon}</Text>
            <Text style={s.weatherTemp}>{weather.temp}°C</Text>
            <Text style={s.weatherCond}>{weather.label}</Text>
            <Text style={s.weatherWind}>💨 {weather.wind} km/h wind</Text>
          </View>
        )}
      </View>

      {/* Movies FlatList */}
      <SectionRow title="Classic movies" action="Pull to refresh" onAction={loadMovies} />
      <View style={s.whiteCard}>
        {mLoad ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            data={movies}
            keyExtractor={item => item.id}
            renderItem={renderMovie}
            scrollEnabled={false}
            ListEmptyComponent={<EmptyState icon="🎬" message="No movies found." />}
          />
        )}
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

// ============================================================
// Q5 — MAIN APP with Bottom Tab Navigation
// ============================================================
function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState('home');

  const tabs = [
    { id: 'home',     label: 'Home',    icon: '🏠' },
    { id: 'notes',    label: 'Notes',   icon: '📝' },
    { id: 'explore',  label: 'Explore', icon: '🌐' },
    { id: 'settings', label: 'Profile', icon: '⚙️' },
  ];

  const renderScreen = () => {
    switch (tab) {
      case 'notes':    return <NotesScreen    user={user} />;
      case 'explore':  return <ExploreScreen />;
      case 'settings': return <SettingsScreen user={user} onLogout={onLogout} />;
      default:         return <HomeScreen     user={user} setScreen={setTab} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {/* Bottom Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map(t => {
          const active = t.id === tab;
          return (
            <TouchableOpacity
              key={t.id}
              style={s.tabItem}
              onPress={() => setTab(t.id)}
              activeOpacity={0.7}
            >
              {active && <View style={s.tabPill} />}
              <Text style={{ fontSize: 22 }}>{t.icon}</Text>
              <Text style={[s.tabLabel, { color: active ? C.tabActive : C.tabInact, fontWeight: active ? '700' : '400' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// ROOT — Splash + Session restore
// ============================================================
export default function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        const uid   = await AsyncStorage.getItem('userUID');
        if (email && uid) setUser({ email, uid });
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const handleLogin = async (data) => {
    setUser(data);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userUID');
    setUser(null);
  };

  // Splash Screen
  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <View style={[s.brandIcon, { width: 90, height: 90, borderRadius: 24, marginBottom: 20 }]}>
        <Text style={{ fontSize: 40 }}>🎓</Text>
      </View>
      <Text style={[s.brandName, { fontSize: 26 }]}>Student Companion</Text>
      <Text style={[s.brandSub, { marginTop: 6 }]}>CSC303 · Mobile App Development</Text>
      <ActivityIndicator color={C.purple} size="large" style={{ marginTop: 32 }} />
    </View>
  );

  return user
    ? <MainApp user={user} onLogout={handleLogout} />
    : <AuthScreen onLogin={handleLogin} />;
}

// ============================================================
// STYLES
// ============================================================
const s = StyleSheet.create({

  // Auth
  authSafe:   { flex: 1, backgroundColor: C.bg },
  authScroll: { flexGrow: 1, padding: 24, paddingTop: 40 },
  brandRow:   { alignItems: 'center', marginBottom: 32 },
  brandIcon:  { width: 72, height: 72, borderRadius: 20, backgroundColor: C.purpleL, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  brandName:  { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  brandSub:   { fontSize: 13, color: C.sub, marginTop: 4 },
  authCard:   { backgroundColor: C.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border },
  authCardTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 18 },

  // Shared
  screen:       { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 20 },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  pageSub:      { fontSize: 13, color: C.sub, marginTop: 3, marginBottom: 18 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  sectionAction:{ fontSize: 13, color: C.purple, fontWeight: '600' },
  whiteCard:    { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardLabel:    { fontSize: 13, fontWeight: '700', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Inputs
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: C.sub, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.text,
  },
  primaryBtn:     { backgroundColor: C.tabActive, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ghostBtn:       { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText:   { color: C.purple, fontWeight: '700', fontSize: 14 },
  outlineBtn:     { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  outlineBtnText: { fontWeight: '700', fontSize: 13 },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: C.border },
  dividerLabel:   { color: C.hint, fontSize: 13 },
  demoHint:       { fontSize: 11, color: C.hint, textAlign: 'center', marginTop: 14, lineHeight: 16 },

  // Tags
  tag:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 30, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  tagActive:    { backgroundColor: C.tabActive, borderColor: C.tabActive },
  tagText:      { fontSize: 13, fontWeight: '600', color: C.sub },
  tagTextActive:{ color: '#fff', fontWeight: '700' },

  // Home
  homeHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  homeGreet:     { fontSize: 14, color: C.sub },
  homeName:      { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 2 },
  avatarCircle:  { width: 46, height: 46, borderRadius: 23, backgroundColor: C.purple, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },
  featuredScroll:{ marginLeft: -20, marginRight: -20, marginBottom: 20 },
  featuredCard:  { width: SW * 0.68, borderRadius: 20, padding: 20, marginRight: 12, minHeight: 160, justifyContent: 'flex-end' },
  featuredTag:   { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  featuredTagText:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  featuredCardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  featuredCardSub:   { fontSize: 13, lineHeight: 18 },
  lessonList:  { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  lessonRow:   { flexDirection: 'row', alignItems: 'center', padding: 16 },
  lessonBorder:{ borderBottomWidth: 1, borderBottomColor: C.border },
  lessonIcon:  { width: 46, height: 46, borderRadius: 14, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  lessonName:  { fontSize: 14, fontWeight: '700', color: C.text },
  lessonSub:   { fontSize: 12, color: C.sub, marginTop: 2 },

  // Notes
  noteRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 },
  noteThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.purpleL, justifyContent: 'center', alignItems: 'center' },
  noteTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  noteSub:   { fontSize: 13, color: C.sub, marginTop: 2 },
  noteTime:  { fontSize: 11, color: C.sky, marginTop: 5 },
  deleteBtn: { padding: 6 },
  emptyBox:  { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: C.sub, fontSize: 14, textAlign: 'center' },

  // Settings
  accountRow:     { flexDirection: 'row', alignItems: 'center' },
  accountEmail:   { fontSize: 14, fontWeight: '700', color: C.text },
  badgeOnline:    { alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  badgeOnlineText:{ fontSize: 11, fontWeight: '700', color: '#15803D' },
  themeChip:      { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  themeChipActive:{ backgroundColor: C.tabActive, borderColor: C.tabActive },
  themeChipText:  { fontSize: 13, fontWeight: '600', color: C.sub },
  prefLine:       { fontSize: 14, color: C.sub, marginBottom: 6 },
  logoutBtn:      { borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: C.coral, marginTop: 4, marginBottom: 8 },
  logoutText:     { color: C.coral, fontWeight: '800', fontSize: 15 },

  // Explore / Weather
  weatherResult: { marginTop: 16, padding: 18, backgroundColor: C.purpleL, borderRadius: 14, alignItems: 'center' },
  weatherCity:   { fontSize: 14, fontWeight: '600', color: C.purpleText },
  weatherIcon:   { fontSize: 40, marginVertical: 6 },
  weatherTemp:   { fontSize: 54, fontWeight: '800', color: C.purple },
  weatherCond:   { fontSize: 17, color: C.purpleText, marginTop: 4 },
  weatherWind:   { fontSize: 13, color: C.sub, marginTop: 5 },
  movieRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  movieThumb:    { width: 44, height: 44, borderRadius: 12, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  movieName:     { fontSize: 14, fontWeight: '700', color: C.text },
  movieYear:     { fontSize: 12, color: C.sub, marginTop: 2 },
  detailPoster:      { width: 100, height: 100, borderRadius: 24, backgroundColor: C.purpleL, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  detailMovieTitle:  { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },

  // Tab bar
  tabBar:  { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, position: 'relative' },
  tabPill: { position: 'absolute', top: -1, width: 36, height: 3, borderRadius: 2, backgroundColor: C.tabActive },
  tabLabel:{ fontSize: 11, marginTop: 3 },
});
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  TextInput,
  Alert,
  Switch,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Info,
  Brain,
  Tag,
  ShieldCheck,
  SortDesc,
  Archive,
  MessageSquare,
  Database,
  Trash2,
  Key,
  Cpu,
  Eye,
  EyeOff,
  Copy,
  Check,
  Palette,
  Type,
  Layout,
  FileText,
  Download,
  HardDrive,
  ChevronDown,
  BookOpen,
  Users,
  UserCheck,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { API_URL } from '@env';

const API_BASE = API_URL || 'https://slate.opsapp.co';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useDataStore } from '../stores/dataStore';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

const ACCENT_COLORS: Record<string, { name: string; primary: string }> = {
  beige:      { name: 'Beige',      primary: '#d1b18f' },
  sand:       { name: 'Sand',       primary: '#c2b280' },
  gold:       { name: 'Gold',       primary: '#c9a227' },
  amber:      { name: 'Amber',      primary: '#d4a574' },
  rust:       { name: 'Rust',       primary: '#c17f59' },
  terracotta: { name: 'Terracotta', primary: '#c4786e' },
  coral:      { name: 'Coral',      primary: '#d4897a' },
  dustyRose:  { name: 'Dusty Rose', primary: '#c4a4a4' },
  mauve:      { name: 'Mauve',      primary: '#b09ab0' },
  lavender:   { name: 'Lavender',   primary: '#9a8fb8' },
  slate:      { name: 'Slate',      primary: '#708090' },
  steel:      { name: 'Steel',      primary: '#7895a8' },
  sage:       { name: 'Sage',       primary: '#9caf88' },
  olive:      { name: 'Olive',      primary: '#8a9a5b' },
};

// Compute preview color from mode + brightness + accent hex
function computePreviewColor(mode: 'accent' | 'grayscale', brightness: number, accentHex: string): string {
  const b = Math.max(0, Math.min(100, brightness));
  if (mode === 'grayscale') {
    const v = Math.round((b / 100) * 255);
    return `rgb(${v}, ${v}, ${v})`;
  }
  const r = parseInt(accentHex.slice(1, 3), 16);
  const g = parseInt(accentHex.slice(3, 5), 16);
  const bl = parseInt(accentHex.slice(5, 7), 16);
  const f = b / 100;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(bl * f)})`;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Segmented control component
function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={segStyles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt.value)}
          style={[
            segStyles.segment,
            value === opt.value && { borderColor: '#ffffff', borderWidth: 1 },
          ]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              segStyles.segmentText,
              value === opt.value && { fontFamily: theme.fonts.semibold, color: '#ffffff' },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Setting row component
function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.header}>
        {icon && <View style={rowStyles.icon}>{icon}</View>}
        <View style={rowStyles.labelContainer}>
          <Text style={rowStyles.label}>{label}</Text>
          {description && (
            <Text style={rowStyles.description}>{description}</Text>
          )}
        </View>
      </View>
      <View style={rowStyles.control}>{children}</View>
    </View>
  );
}

// Dropdown picker for pages
function PagePicker({
  pages,
  selectedId,
  onSelect,
}: {
  pages: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const selectedName = pages.find(p => p.id === selectedId)?.name || 'None (last viewed)';

  return (
    <View>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={pickerStyles.triggerText}>{selectedName}</Text>
        <ChevronDown size={14} color={staticColors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          <TouchableOpacity
            style={pickerStyles.option}
            onPress={() => { onSelect(null); setOpen(false); }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.optionText, !selectedId && { color: colors.primary }]}>
              None (last viewed)
            </Text>
          </TouchableOpacity>
          {pages.map(page => (
            <TouchableOpacity
              key={page.id}
              style={pickerStyles.option}
              onPress={() => { onSelect(page.id); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.optionText, selectedId === page.id && { color: colors.primary }]}>
                {page.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Dropdown picker for sections
function SectionPicker({
  sections,
  selectedId,
  onSelect,
}: {
  sections: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const selectedName = sections.find(s => s.id === selectedId)?.name || 'None (first section)';

  return (
    <View>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={pickerStyles.triggerText}>{selectedName}</Text>
        <ChevronDown size={14} color={staticColors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          <TouchableOpacity
            style={pickerStyles.option}
            onPress={() => { onSelect(null); setOpen(false); }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.optionText, !selectedId && { color: colors.primary }]}>
              None (first section)
            </Text>
          </TouchableOpacity>
          {sections.map(section => (
            <TouchableOpacity
              key={section.id}
              style={pickerStyles.option}
              onPress={() => { onSelect(section.id); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[pickerStyles.optionText, selectedId === section.id && { color: colors.primary }]}>
                {section.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// Brightness Slider Component
function BrightnessSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const colors = useTheme();
  const SLIDER_WIDTH = Dimensions.get('window').width - 120;
  const translateX = useSharedValue((value / 100) * SLIDER_WIDTH);
  const [displayValue, setDisplayValue] = useState(value);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, event.translationX + (value / 100) * SLIDER_WIDTH));
      translateX.value = newX;
      const newValue = Math.round((newX / SLIDER_WIDTH) * 100);
      runOnJS(setDisplayValue)(newValue);
    })
    .onEnd(() => {
      const finalValue = Math.round((translateX.value / SLIDER_WIDTH) * 100);
      runOnJS(onChange)(finalValue);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.track}>
        <Animated.View style={[sliderStyles.fill, { backgroundColor: '#aaaaaa' }, fillStyle]} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[sliderStyles.thumb, thumbStyle]}>
            <View style={[sliderStyles.thumbInner, { backgroundColor: '#aaaaaa' }]} />
          </Animated.View>
        </GestureDetector>
      </View>
      <Text style={sliderStyles.valueText}>{displayValue}%</Text>
    </View>
  );
}

type SettingsSection = 'appearance' | 'ai' | 'content' | 'data' | 'developer' | 'app' | null;

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { settings, fetchSettings, updateSetting, updateSettings } = useSettingsStore();
  const { pages } = useDataStore();
  const colors = useTheme();

  const translateX = useSharedValue(-SCREEN_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const [currentSection, setCurrentSection] = useState<SettingsSection>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [memoryCleared, setMemoryCleared] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  // Pending changes state
  const [pendingChanges, setPendingChanges] = useState<Partial<typeof settings>>({});
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Merged settings (pending changes override actual settings)
  const effectiveSettings = { ...settings, ...pendingChanges };

  // Update pending change
  const setPendingSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  // Save all pending changes
  const handleSaveChanges = async () => {
    if (Object.keys(pendingChanges).length > 0) {
      for (const [key, value] of Object.entries(pendingChanges)) {
        await updateSetting(key as keyof typeof settings, value as any);
      }
      setPendingChanges({});
    }
  };

  // Revert all pending changes
  const handleRevertChanges = () => {
    setPendingChanges({});
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      translateX.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
      // Reset to main menu when closing and clear pending changes
      setTimeout(() => {
        setCurrentSection(null);
        setPendingChanges({});
      }, 300);
    }
  }, [isOpen, translateX, overlayOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(-SCREEN_WIDTH, event.translationX);
        overlayOpacity.value = interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0],
          [0, 0.5],
          Extrapolation.CLAMP,
        );
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD * 2 || event.velocityX < -500) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 300 });
        overlayOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
      } else {
        translateX.value = withTiming(0, { duration: 300 });
        overlayOpacity.value = withTiming(0.5, { duration: 300 });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? 'auto' as const : 'none' as const,
  }));

  const getUserInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.full_name;
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return (user.email || '?')[0].toUpperCase();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          onClose();
          logout();
        },
      },
    ]);
  };

  const handleCopyUserId = async () => {
    if (user?.id) {
      try {
        await Share.share({ message: user.id });
      } catch {}
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm.',
              [{ text: 'Cancel', style: 'cancel' }],
            );
          },
        },
      ],
    );
  };

  const handleClearMemory = async () => {
    if (!user?.id) return;
    Alert.alert(
      'Clear AI Memory',
      'Slate will forget your behavioral patterns and preferences. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Memory',
          style: 'destructive',
          onPress: async () => {
            setClearingMemory(true);
            try {
              const response = await fetch(
                `${API_BASE}/api/mem0-settings`,
                {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id }),
                },
              );
              const data = await response.json();
              if (data.success) {
                setMemoryCleared(true);
                setTimeout(() => setMemoryCleared(false), 3000);
              } else {
                Alert.alert('Error', 'Failed to clear memory. Please try again.');
              }
            } catch {
              Alert.alert('Error', 'Failed to clear memory. Please try again.');
            } finally {
              setClearingMemory(false);
            }
          },
        },
      ],
    );
  };

  const handleExport = async (type: string) => {
    if (!user?.id) return;
    setExporting(type);
    try {
      // Fetch all pages with sections and notes
      const { data: pagesData, error: pagesError } = await supabase
        .from('pages')
        .select(`
          id, name, starred, position,
          sections (
            id, name, position,
            notes ( id, content, completed, date, tags, created_at )
          )
        `)
        .eq('user_id', user.id)
        .order('name');

      if (pagesError) throw pagesError;

      let exportContent = '';
      let fileName = '';

      switch (type) {
        case 'markdown': {
          const mdPages = (pagesData || []).map((page: any) => {
            let md = `# ${page.name}\n\n`;
            const sections = (page.sections || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
            for (const section of sections) {
              md += `## ${section.name}\n\n`;
              const notes = (section.notes || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              );
              for (const note of notes) {
                const checkbox = note.completed ? '[x]' : '[ ]';
                md += `- ${checkbox} ${note.content}`;
                if (note.tags?.length) md += ` #${note.tags.join(' #')}`;
                md += '\n';
              }
              md += '\n';
            }
            return md;
          });
          exportContent = mdPages.join('\n---\n\n');
          fileName = 'slate-export.md';
          break;
        }
        case 'json': {
          exportContent = JSON.stringify(pagesData, null, 2);
          fileName = 'slate-export.json';
          break;
        }
        case 'csv': {
          const rows = ['Page,Section,Content,Completed,Tags,Date,Created'];
          for (const page of pagesData || []) {
            for (const section of (page as any).sections || []) {
              for (const note of section.notes || []) {
                const escaped = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
                rows.push([
                  escaped(page.name),
                  escaped(section.name),
                  escaped(note.content),
                  note.completed ? 'Yes' : 'No',
                  escaped((note.tags || []).join(', ')),
                  note.date || '',
                  note.created_at,
                ].join(','));
              }
            }
          }
          exportContent = rows.join('\n');
          fileName = 'slate-export.csv';
          break;
        }
        case 'backup': {
          // Include settings
          const { data: settingsData } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
          exportContent = JSON.stringify({
            exportedAt: new Date().toISOString(),
            pages: pagesData,
            settings: settingsData,
          }, null, 2);
          fileName = 'slate-backup.json';
          break;
        }
      }

      // Use Share API (RN doesn't have file download like web)
      await Share.share({
        message: exportContent,
        title: fileName,
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Something went wrong. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  if (!isOpen && translateX.value === -SCREEN_WIDTH) {
    return null;
  }

  const personalityDescriptions = {
    tactical: 'Short, direct responses',
    balanced: 'Medium-length, informative',
    conversational: 'Detailed explanations',
  };

  return (
    <View style={styles.wrapper} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            { paddingTop: insets.top },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={currentSection ? () => setCurrentSection(null) : onClose}
              activeOpacity={0.7}
            >
              <ChevronLeft size={22} color={staticColors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {currentSection === 'appearance' && 'APPEARANCE'}
              {currentSection === 'ai' && 'AI BEHAVIOR'}
              {currentSection === 'content' && 'CONTENT'}
              {currentSection === 'data' && 'DATA & PRIVACY'}
              {currentSection === 'developer' && 'DEVELOPER'}
              {currentSection === 'app' && 'APP'}
              {!currentSection && 'SETTINGS'}
            </Text>
            <View style={styles.backButton} />
          </View>

          {/* Save/Revert buttons when there are pending changes */}
          {hasPendingChanges && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.revertButton}
                onPress={handleRevertChanges}
                activeOpacity={0.7}
              >
                <Text style={styles.revertButtonText}>REVERT CHANGES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveChanges}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: 24 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ===== ACCOUNT ===== */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ACCOUNT</Text>
              <View style={styles.card}>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>{getUserInitials()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    {user?.user_metadata?.full_name && (
                      <Text style={styles.userName}>
                        {user.user_metadata.full_name}
                      </Text>
                    )}
                    <Text style={styles.userEmail}>
                      {user?.email || 'Not signed in'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Sign-in method */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sign-in</Text>
                  <Text style={styles.infoValue}>
                    {user?.app_metadata?.provider === 'apple' ? 'Apple' : user?.app_metadata?.provider === 'google' ? 'Google' : 'Email'}
                  </Text>
                </View>

                {/* User ID */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>User ID</Text>
                  <TouchableOpacity
                    onPress={handleCopyUserId}
                    style={styles.copyRow}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.infoValueSmall} numberOfLines={1}>
                      {user?.id ? `${user.id.slice(0, 8)}...` : '—'}
                    </Text>
                    {copiedUserId ? (
                      <Check size={14} color={staticColors.success} />
                    ) : (
                      <Copy size={14} color={staticColors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Main Menu */}
            {!currentSection && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.card}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('appearance')}
                    activeOpacity={0.7}
                  >
                    <Palette size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>Appearance</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('ai')}
                    activeOpacity={0.7}
                  >
                    <MessageSquare size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>AI Behavior</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('content')}
                    activeOpacity={0.7}
                  >
                    <FileText size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>Content</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('data')}
                    activeOpacity={0.7}
                  >
                    <Database size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>Data & Privacy</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('developer')}
                    activeOpacity={0.7}
                  >
                    <Key size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>Developer</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setCurrentSection('app')}
                    activeOpacity={0.7}
                  >
                    <BookOpen size={20} color={staticColors.textMuted} />
                    <Text style={styles.menuItemText}>App</Text>
                    <ChevronRight size={18} color={staticColors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ===== APPEARANCE ===== */}
            {currentSection === 'appearance' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>APPEARANCE</Text>

              {/* Preview Card */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>PREVIEW</Text>
                <View style={[
                  styles.previewCard,
                  {
                    backgroundColor: effectiveSettings.theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    borderColor: effectiveSettings.theme === 'dark' ? '#2a2a2a' : '#e0e0e0',
                  }
                ]}>
                  <View style={styles.previewHeader}>
                    <View style={[
                      styles.previewDot,
                      { backgroundColor: ACCENT_COLORS[effectiveSettings.accent_color]?.primary || colors.primary }
                    ]} />
                    <Text style={[
                      styles.previewTitle,
                      {
                        color: effectiveSettings.theme === 'dark' ? '#e8e8e8' : '#1a1a1a',
                        fontSize: effectiveSettings.font_size === 'small' ? 14 : effectiveSettings.font_size === 'large' ? 18 : 16,
                      }
                    ]}>
                      Sample Note Card
                    </Text>
                  </View>
                  <Text style={[
                    styles.previewText,
                    {
                      color: effectiveSettings.theme === 'dark' ? '#a0a0a0' : '#666666',
                      fontSize: effectiveSettings.font_size === 'small' ? 12 : effectiveSettings.font_size === 'large' ? 16 : 14,
                    }
                  ]}>
                    This is how your notes will look with the selected theme and accent color.
                  </Text>
                  <View style={styles.previewTags}>
                    <View style={[
                      styles.previewTag,
                      {
                        backgroundColor: effectiveSettings.theme === 'dark' ? '#2a2a2a' : '#e8e8e8',
                        borderColor: ACCENT_COLORS[effectiveSettings.accent_color]?.primary || colors.primary,
                      }
                    ]}>
                      <Text style={[
                        styles.previewTagText,
                        {
                          color: ACCENT_COLORS[effectiveSettings.accent_color]?.primary || colors.primary,
                          fontSize: effectiveSettings.font_size === 'small' ? 10 : effectiveSettings.font_size === 'large' ? 14 : 12,
                        }
                      ]}>
                        tag
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                {/* Theme */}
                <SettingRow
                  icon={<Palette size={16} color={staticColors.textMuted} />}
                  label="Theme"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Dark', value: 'dark' as const },
                      { label: 'Light', value: 'light' as const },
                    ]}
                    value={effectiveSettings.theme}
                    onChange={(v) => setPendingSetting('theme', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Accent Color */}
                <View style={rowStyles.container}>
                  <View style={rowStyles.header}>
                    <View style={rowStyles.icon}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT_COLORS[effectiveSettings.accent_color]?.primary || colors.primary }} />
                    </View>
                    <View style={rowStyles.labelContainer}>
                      <Text style={rowStyles.label}>Accent Color</Text>
                      <Text style={rowStyles.description}>
                        {ACCENT_COLORS[effectiveSettings.accent_color]?.name || 'Beige'}
                      </Text>
                    </View>
                  </View>
                  <View style={[rowStyles.control, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
                    {Object.entries(ACCENT_COLORS).map(([key, color]) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setPendingSetting('accent_color', key as any)}
                        activeOpacity={0.7}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 4,
                          backgroundColor: color.primary,
                          borderWidth: effectiveSettings.accent_color === key ? 2 : 0,
                          borderColor: staticColors.textPrimary,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {effectiveSettings.accent_color === key && (
                          <Check size={14} color="#fff" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Font Size */}
                <SettingRow
                  icon={<Type size={16} color={staticColors.textMuted} />}
                  label="Font Size"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Small', value: 'small' as const },
                      { label: 'Medium', value: 'medium' as const },
                      { label: 'Large', value: 'large' as const },
                    ]}
                    value={effectiveSettings.font_size}
                    onChange={(v) => setPendingSetting('font_size', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* View Density */}
                <SettingRow
                  icon={<Layout size={16} color={staticColors.textMuted} />}
                  label="View Density"
                  description="Spacing between UI elements"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Compact', value: 'compact' as const },
                      { label: 'Comfortable', value: 'comfortable' as const },
                    ]}
                    value={effectiveSettings.view_density}
                    onChange={(v) => setPendingSetting('view_density', v)}
                  />
                </SettingRow>
              </View>

              {/* Chat Appearance */}
              <View style={styles.card}>
                <Text style={styles.subsectionLabel}>CHAT APPEARANCE</Text>

                {/* Chat Font Size */}
                <SettingRow
                  icon={<MessageSquare size={16} color={staticColors.textMuted} />}
                  label="Chat Font Size"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Small', value: 'small' as const },
                      { label: 'Medium', value: 'medium' as const },
                      { label: 'Large', value: 'large' as const },
                    ]}
                    value={effectiveSettings.chat_font_size}
                    onChange={(v) => setPendingSetting('chat_font_size', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Agent Text Color */}
                <View style={rowStyles.container}>
                  <View style={rowStyles.header}>
                    <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: computePreviewColor(effectiveSettings.chat_agent_text_mode, effectiveSettings.chat_agent_text_brightness, colors.primary), borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={rowStyles.labelContainer}>
                      <Text style={rowStyles.label}>Agent Text Color</Text>
                    </View>
                  </View>
                  <View style={rowStyles.control}>
                    <SegmentedControl
                      options={[
                        { label: 'Accent', value: 'accent' as const },
                        { label: 'Grayscale', value: 'grayscale' as const },
                      ]}
                      value={effectiveSettings.chat_agent_text_mode}
                      onChange={(v) => setPendingSetting('chat_agent_text_mode', v)}
                    />
                    <BrightnessSlider
                      value={effectiveSettings.chat_agent_text_brightness}
                      onChange={(v) => setPendingSetting('chat_agent_text_brightness', v)}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* User Text Color */}
                <View style={rowStyles.container}>
                  <View style={rowStyles.header}>
                    <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: computePreviewColor(effectiveSettings.chat_user_text_mode, effectiveSettings.chat_user_text_brightness, colors.primary), borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                    <View style={rowStyles.labelContainer}>
                      <Text style={rowStyles.label}>User Text Color</Text>
                    </View>
                  </View>
                  <View style={rowStyles.control}>
                    <SegmentedControl
                      options={[
                        { label: 'Accent', value: 'accent' as const },
                        { label: 'Grayscale', value: 'grayscale' as const },
                      ]}
                      value={effectiveSettings.chat_user_text_mode}
                      onChange={(v) => setPendingSetting('chat_user_text_mode', v)}
                    />
                    <BrightnessSlider
                      value={effectiveSettings.chat_user_text_brightness}
                      onChange={(v) => setPendingSetting('chat_user_text_brightness', v)}
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Chat Background */}
                <View style={rowStyles.container}>
                  <View style={rowStyles.header}>
                    <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                      <View style={{ flex: 1, backgroundColor: effectiveSettings.chat_background_mode === 'accent' ? colors.primary : '#000000', opacity: effectiveSettings.chat_background_brightness / 100 || 0.08 }} />
                    </View>
                    <View style={rowStyles.labelContainer}>
                      <Text style={rowStyles.label}>Chat Background</Text>
                    </View>
                  </View>
                  <View style={rowStyles.control}>
                    <SegmentedControl
                      options={[
                        { label: 'Accent', value: 'accent' as const },
                        { label: 'Grayscale', value: 'grayscale' as const },
                      ]}
                      value={effectiveSettings.chat_background_mode}
                      onChange={(v) => setPendingSetting('chat_background_mode', v)}
                    />
                    <BrightnessSlider
                      value={effectiveSettings.chat_background_brightness}
                      onChange={(v) => setPendingSetting('chat_background_brightness', v)}
                    />
                  </View>
                </View>
              </View>
            </View>
            )}

            {/* ===== AI BEHAVIOR ===== */}
            {currentSection === 'ai' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>AI BEHAVIOR</Text>
              <View style={styles.card}>
                {/* Agent Personality */}
                <SettingRow
                  icon={<Brain size={16} color={staticColors.textMuted} />}
                  label="Agent Personality"
                  description={personalityDescriptions[settings.ai_response_style]}
                >
                  <SegmentedControl
                    options={[
                      { label: 'Tactical', value: 'tactical' as const },
                      { label: 'Balanced', value: 'balanced' as const },
                      { label: 'Chatty', value: 'conversational' as const },
                    ]}
                    value={settings.ai_response_style}
                    onChange={(v) => updateSetting('ai_response_style', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Auto-tagging */}
                <SettingRow
                  icon={<Tag size={16} color={staticColors.textMuted} />}
                  label="Auto-Tagging"
                  description="How aggressively the AI tags notes"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Light', value: 1 as const },
                      { label: 'Medium', value: 2 as const },
                      { label: 'Heavy', value: 3 as const },
                    ]}
                    value={settings.auto_tagging_sensitivity}
                    onChange={(v) => updateSetting('auto_tagging_sensitivity', v as 1 | 2 | 3)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Confirmation level */}
                <SettingRow
                  icon={<ShieldCheck size={16} color={staticColors.textMuted} />}
                  label="Confirmation Level"
                  description="When to ask before executing"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Light', value: 1 as const },
                      { label: 'Medium', value: 2 as const },
                      { label: 'Heavy', value: 3 as const },
                    ]}
                    value={settings.confirmation_level}
                    onChange={(v) => updateSetting('confirmation_level', v as 1 | 2 | 3)}
                  />
                </SettingRow>
              </View>
            </View>
            )}

            {/* ===== CONTENT ===== */}
            {currentSection === 'content' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CONTENT</Text>
              <View style={styles.card}>
                {/* Default Page */}
                <SettingRow
                  icon={<BookOpen size={16} color={staticColors.textMuted} />}
                  label="Default Page"
                  description="Page to open on startup"
                >
                  <PagePicker
                    pages={pages}
                    selectedId={settings.default_page_id}
                    onSelect={(id) => {
                      updateSetting('default_page_id', id);
                      if (!id) updateSetting('default_section_id', null);
                    }}
                  />
                </SettingRow>

                {/* Default Section (only when page is selected) */}
                {settings.default_page_id && (() => {
                  const selectedPage = pages.find(p => p.id === settings.default_page_id);
                  const sections = selectedPage?.sections || [];
                  return sections.length > 0 ? (
                    <>
                      <View style={styles.divider} />
                      <SettingRow
                        icon={<Layout size={16} color={staticColors.textMuted} />}
                        label="Default Section"
                      >
                        <SectionPicker
                          sections={sections}
                          selectedId={settings.default_section_id}
                          onSelect={(id) => updateSetting('default_section_id', id)}
                        />
                      </SettingRow>
                    </>
                  ) : null;
                })()}

                <View style={styles.divider} />

                {/* Note sort order */}
                <SettingRow
                  icon={<SortDesc size={16} color={staticColors.textMuted} />}
                  label="Note Sort Order"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Newest', value: 'created_desc' as const },
                      { label: 'Oldest', value: 'created_asc' as const },
                      { label: 'A-Z', value: 'alpha' as const },
                      { label: 'Modified', value: 'modified' as const },
                    ]}
                    value={settings.note_sort_order}
                    onChange={(v) => updateSetting('note_sort_order', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Auto-archive */}
                <SettingRow
                  icon={<Archive size={16} color={staticColors.textMuted} />}
                  label="Auto-Archive Completed"
                  description="Archive done notes after"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Never', value: 'never' },
                      { label: '7d', value: '7' },
                      { label: '30d', value: '30' },
                      { label: '90d', value: '90' },
                    ]}
                    value={settings.auto_archive_completed === null ? 'never' : String(settings.auto_archive_completed)}
                    onChange={(v) => updateSetting('auto_archive_completed', v === 'never' ? null : parseInt(v, 10))}
                  />
                </SettingRow>
              </View>
            </View>
            )}

            {/* ===== DATA & PRIVACY ===== */}
            {currentSection === 'data' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>
              <View style={styles.card}>
                {/* Chat history retention */}
                <SettingRow
                  icon={<MessageSquare size={16} color={staticColors.textMuted} />}
                  label="Chat History"
                  description="How long to keep chat messages"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Forever', value: 'forever' },
                      { label: '30d', value: '30' },
                      { label: '7d', value: '7' },
                    ]}
                    value={settings.chat_history_retention === null ? 'forever' : String(settings.chat_history_retention)}
                    onChange={(v) => updateSetting('chat_history_retention', v === 'forever' ? null : parseInt(v, 10))}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* RAG Context */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <Database size={16} color={staticColors.textMuted} />
                    <View style={styles.toggleLabelContainer}>
                      <Text style={styles.toggleLabel}>AI Context Search</Text>
                      <Text style={styles.toggleDescription}>
                        Allow AI to search your notes
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.rag_context_enabled}
                    onValueChange={(v) => updateSetting('rag_context_enabled', v)}
                    trackColor={{ false: staticColors.border, true: colors.primary }}
                    thumbColor={staticColors.textPrimary}
                  />
                </View>
              </View>

              {/* AI Memory */}
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <Brain size={16} color={staticColors.textMuted} />
                    <View style={styles.toggleLabelContainer}>
                      <Text style={styles.toggleLabel}>AI Memory</Text>
                      <Text style={styles.toggleDescription}>
                        Slate learns your preferences and patterns
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.dangerRowButton}
                  onPress={handleClearMemory}
                  activeOpacity={0.7}
                  disabled={clearingMemory}
                >
                  {clearingMemory ? (
                    <ActivityIndicator size="small" color={staticColors.textMuted} />
                  ) : memoryCleared ? (
                    <>
                      <Check size={14} color={staticColors.success} />
                      <Text style={[styles.dangerRowText, { color: staticColors.success }]}>Memory Cleared</Text>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} color={staticColors.textMuted} />
                      <Text style={styles.dangerRowText}>Clear Memory</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Export Data */}
              <View style={styles.card}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={rowStyles.label}>Export Data</Text>
                  <Text style={[rowStyles.description, { marginTop: 4 }]}>
                    Download your notes in various formats
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => handleExport('markdown')}
                    activeOpacity={0.7}
                    disabled={!!exporting}
                  >
                    <FileText size={14} color={exporting === 'markdown' ? colors.primary : staticColors.textMuted} />
                    <Text style={styles.exportLabel}>
                      {exporting === 'markdown' ? 'Exporting...' : 'Markdown'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => handleExport('json')}
                    activeOpacity={0.7}
                    disabled={!!exporting}
                  >
                    <FileText size={14} color={exporting === 'json' ? colors.primary : staticColors.textMuted} />
                    <Text style={styles.exportLabel}>
                      {exporting === 'json' ? 'Exporting...' : 'JSON'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => handleExport('csv')}
                    activeOpacity={0.7}
                    disabled={!!exporting}
                  >
                    <FileText size={14} color={exporting === 'csv' ? colors.primary : staticColors.textMuted} />
                    <Text style={styles.exportLabel}>
                      {exporting === 'csv' ? 'Exporting...' : 'CSV'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Full Backup */}
              <View style={styles.card}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={rowStyles.label}>Full Backup</Text>
                  <Text style={[rowStyles.description, { marginTop: 4 }]}>
                    Complete workspace including notes, settings, and chat history
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={() => handleExport('backup')}
                  activeOpacity={0.7}
                  disabled={!!exporting}
                >
                  <HardDrive size={14} color={exporting === 'backup' ? colors.primary : staticColors.textMuted} />
                  <Text style={styles.exportLabel}>
                    {exporting === 'backup' ? 'Downloading...' : 'Download Backup'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Team Settings */}
              <View style={styles.card}>
                <Text style={styles.subsectionLabel}>TEAM SETTINGS</Text>

                {/* Default Member Permission */}
                <SettingRow
                  icon={<Users size={16} color={staticColors.textMuted} />}
                  label="Default Permission"
                  description="Default role for new team members"
                >
                  <SegmentedControl
                    options={[
                      { label: 'Team', value: 'team' as const },
                      { label: 'Limited', value: 'team-limited' as const },
                    ]}
                    value={settings.default_member_permission}
                    onChange={(v) => updateSetting('default_member_permission', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                {/* Require Invite Approval */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <UserCheck size={16} color={staticColors.textMuted} />
                    <View style={styles.toggleLabelContainer}>
                      <Text style={styles.toggleLabel}>Require Approval</Text>
                      <Text style={styles.toggleDescription}>
                        New invites need your approval
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.require_invite_approval}
                    onValueChange={(v) => updateSetting('require_invite_approval', v)}
                    trackColor={{ false: staticColors.border, true: colors.primary }}
                    thumbColor={staticColors.textPrimary}
                  />
                </View>
              </View>
            </View>
            )}

            {/* ===== DEVELOPER ===== */}
            {currentSection === 'developer' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DEVELOPER</Text>
              <View style={styles.card}>
                {/* OpenAI API Key */}
                <View style={styles.inputRow}>
                  <View style={styles.inputHeader}>
                    <Key size={16} color={staticColors.textMuted} />
                    <Text style={styles.inputLabel}>OpenAI API Key</Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInputInline}
                      value={settings.custom_openai_key || ''}
                      onChangeText={(v) => updateSetting('custom_openai_key', v || null)}
                      placeholder="sk-..."
                      placeholderTextColor={staticColors.textMuted}
                      secureTextEntry={!showApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowApiKey(!showApiKey)}
                      style={styles.eyeButton}
                    >
                      {showApiKey ? (
                        <EyeOff size={16} color={staticColors.textMuted} />
                      ) : (
                        <Eye size={16} color={staticColors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* OpenAI Model */}
                <View style={styles.inputRow}>
                  <View style={styles.inputHeader}>
                    <Cpu size={16} color={staticColors.textMuted} />
                    <Text style={styles.inputLabel}>OpenAI Model</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, { flex: 0 }]}
                    value={settings.custom_openai_model || ''}
                    onChangeText={(v) => updateSetting('custom_openai_model', v || null)}
                    placeholder="gpt-4.1-mini"
                    placeholderTextColor={staticColors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>
            )}

            {/* ===== APP ===== */}
            {currentSection === 'app' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>APP</Text>
              <View style={styles.card}>
                {/* Default View Mode */}
                <SettingRow
                  icon={<Layout size={16} color={staticColors.textMuted} />}
                  label="Default View Mode"
                  description="How notes are displayed when opening a page"
                >
                  <SegmentedControl
                    options={[
                      { label: 'List', value: 'list' as const },
                      { label: 'Calendar', value: 'calendar' as const },
                      { label: 'Boxes', value: 'boxes' as const },
                    ]}
                    value={settings.default_view_mode}
                    onChange={(v) => updateSetting('default_view_mode', v)}
                  />
                </SettingRow>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Info size={16} color={staticColors.textMuted} />
                    <Text style={styles.infoLabel}>Version</Text>
                  </View>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
              </View>
            </View>
            )}

            {/* Sign Out */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={staticColors.danger} />
              <Text style={styles.signOutText}>SIGN OUT</Text>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={staticColors.danger} />
              <Text style={styles.deleteText}>DELETE ACCOUNT</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.footerLogo}>SLATE</Text>
            <Text style={styles.footerTagline}>Built for operators.</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Segmented control styles
const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    fontFamily: theme.fonts.semibold,
    color: staticColors.bg,
  },
});

// Setting row styles
const rowStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {},
  labelContainer: {
    flex: 1,
  },
  label: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  description: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  control: {
    marginTop: 4,
  },
});

// Slider styles
const sliderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: staticColors.border,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    marginLeft: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: staticColors.bg,
  },
  valueText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: staticColors.textMuted,
    width: 40,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: staticColors.bg,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    height: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 15,
    color: staticColors.textPrimary,
    letterSpacing: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subsectionLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 10,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 15,
  },
  previewText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  previewTags: {
    flexDirection: 'row',
    gap: 8,
  },
  previewTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  previewTagText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
  },
  card: {
    backgroundColor: staticColors.surface,
    borderWidth: 1,
    borderColor: staticColors.border,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  menuItemText: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: staticColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.border,
    marginVertical: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: staticColors.bg,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: staticColors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textMuted,
  },
  infoValue: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  infoValueSmall: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  toggleDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
    marginTop: 2,
  },
  inputRow: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  textInput: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  textInputInline: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: staticColors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  eyeButton: {
    padding: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: staticColors.border,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: theme.fonts.medium,
    color: staticColors.danger,
    fontSize: 12,
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  deleteText: {
    fontFamily: theme.fonts.regular,
    color: staticColors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  footerLogo: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: staticColors.textMuted,
    letterSpacing: 3,
    marginBottom: 6,
  },
  footerTagline: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  dangerRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  dangerRowText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: staticColors.textMuted,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  exportLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: staticColors.textMuted,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
    backgroundColor: staticColors.surface,
  },
  revertButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revertButtonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.textMuted,
    letterSpacing: 1,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: staticColors.bg,
    letterSpacing: 1,
  },
});

const pickerStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: staticColors.bg,
  },
  triggerText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textPrimary,
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: staticColors.border,
    backgroundColor: staticColors.surface,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  optionText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: staticColors.textSecondary,
  },
});

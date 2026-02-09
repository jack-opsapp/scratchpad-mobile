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
  Share,
  ActivityIndicator,
  Switch,
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
  X,
  Send,
  Trash2,
  Link2,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
} from 'lucide-react-native';
import { useShareStore } from '../stores/shareStore';
import { useAuthStore } from '../stores/authStore';
import { colors, theme } from '../styles';
import type { PermissionRole } from '@slate/shared';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  pageId: string;
  pageName: string;
}

const ROLE_OPTIONS: { label: string; value: PermissionRole }[] = [
  { label: 'Team-Admin', value: 'team-admin' },
  { label: 'Team', value: 'team' },
  { label: 'Team-Limited', value: 'team-limited' },
];

function RolePicker({
  value,
  onChange,
}: {
  value: PermissionRole;
  onChange: (role: PermissionRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = ROLE_OPTIONS.find((o) => o.value === value);

  return (
    <View>
      <TouchableOpacity
        style={pickerStyles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={pickerStyles.triggerText}>{selected?.label || value}</Text>
        <ChevronDown size={12} color={colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.dropdown}>
          {ROLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={pickerStyles.option}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  pickerStyles.optionText,
                  value === opt.value && pickerStyles.optionSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ShareSheet({
  visible,
  onClose,
  pageId,
  pageName,
}: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    myRole,
    collaborators,
    pendingInvitations,
    publicLink,
    loading,
    sending,
    error,
    loadShareData,
    inviteByEmail,
    removeCollaborator,
    updateRole,
    cancelInvitation,
    resendInvitation,
    createPublicLink,
    togglePublicLink,
    updatePublicLinkPassword,
    regeneratePublicLink,
    reset,
  } = useShareStore();

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PermissionRole>('team');
  const [linkPassword, setLinkPassword] = useState('');

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  const canManage = ['owner', 'team-admin'].includes(myRole || '');

  useEffect(() => {
    if (visible && user?.id) {
      loadShareData(pageId, user.id);
      translateY.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible, pageId, user?.id]);

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    overlayOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      reset();
      setEmail('');
      setInviteRole('team');
      setLinkPassword('');
      onClose();
    }, 300);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        overlayOpacity.value = interpolate(
          event.translationY,
          [0, SCREEN_HEIGHT],
          [0.5, 0],
          Extrapolation.CLAMP,
        );
      }
    })
    .onEnd((event) => {
      if (
        event.translationY > SWIPE_THRESHOLD ||
        event.velocityY > 500
      ) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
        overlayOpacity.value = withTiming(0, { duration: 300 });
        runOnJS(handleClose)();
      } else {
        translateY.value = withTiming(0, { duration: 300 });
        overlayOpacity.value = withTiming(0.5, { duration: 300 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    pointerEvents: overlayOpacity.value > 0 ? ('auto' as const) : ('none' as const),
  }));

  const handleInvite = async () => {
    if (!email.trim()) return;
    const inviterName = user?.email?.split('@')[0] || 'Team member';
    await inviteByEmail(email.trim(), inviteRole, inviterName, pageName);
    setEmail('');
  };

  const handleRemove = (userId: string, userEmail: string) => {
    Alert.alert('Remove Collaborator', `Remove ${userEmail}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeCollaborator(userId),
      },
    ]);
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Link',
      'The old link will stop working. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: () => regeneratePublicLink(),
        },
      ],
    );
  };

  const handleCopyLink = async () => {
    if (!publicLink) return;
    const url = `https://slate.opsapp.co/public/${publicLink.token}`;
    try {
      await Share.share({ message: url });
    } catch {}
  };

  if (!visible && translateY.value === SCREEN_HEIGHT) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Share "{pageName}"
            </Text>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ===== INVITE ===== */}
              {canManage && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>INVITE</Text>
                  <View style={styles.card}>
                    <TextInput
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="email@example.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View style={styles.inviteRow}>
                      <View style={{ flex: 1 }}>
                        <RolePicker value={inviteRole} onChange={setInviteRole} />
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          (!email.trim() || sending) && styles.sendButtonDisabled,
                        ]}
                        onPress={handleInvite}
                        disabled={!email.trim() || sending}
                        activeOpacity={0.7}
                      >
                        <Send size={14} color={colors.bg} />
                        <Text style={styles.sendButtonText}>
                          {sending ? 'Sending...' : 'Send'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* ===== COLLABORATORS ===== */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  COLLABORATORS ({collaborators.length})
                </Text>
                <View style={styles.card}>
                  {collaborators.map((collab, idx) => (
                    <View key={collab.userId}>
                      {idx > 0 && <View style={styles.divider} />}
                      <View style={styles.collabRow}>
                        <View style={styles.collabInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.collabName}>
                              {collab.email.split('@')[0]}
                              {collab.userId === user?.id && (
                                <Text style={styles.youLabel}> (You)</Text>
                              )}
                            </Text>
                            {collab.status === 'pending' && (
                              <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>PENDING</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.collabEmail}>{collab.email}</Text>
                        </View>

                        {collab.role === 'owner' ? (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>OWNER</Text>
                          </View>
                        ) : canManage && collab.userId !== user?.id ? (
                          <View style={styles.collabActions}>
                            <RolePicker
                              value={collab.role}
                              onChange={(newRole) =>
                                updateRole(collab.userId, newRole)
                              }
                            />
                            <TouchableOpacity
                              onPress={() =>
                                handleRemove(collab.userId, collab.email)
                              }
                              activeOpacity={0.7}
                              style={styles.trashButton}
                            >
                              <Trash2 size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={styles.roleBadgeText}>
                            {collab.role.toUpperCase()}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {collaborators.length === 0 && (
                    <Text style={styles.emptyText}>No collaborators yet</Text>
                  )}
                </View>
              </View>

              {/* ===== PENDING INVITATIONS ===== */}
              {canManage && pendingInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    PENDING INVITATIONS ({pendingInvitations.length})
                  </Text>
                  <View style={styles.card}>
                    {pendingInvitations.map((invite, idx) => (
                      <View key={invite.email}>
                        {idx > 0 && <View style={styles.divider} />}
                        <View style={styles.collabRow}>
                          <View style={styles.collabInfo}>
                            <Text style={styles.collabName}>
                              {invite.email}
                            </Text>
                            <Text style={styles.collabEmail}>
                              Role: {invite.role}
                            </Text>
                          </View>
                          <View style={styles.pendingActions}>
                            <TouchableOpacity
                              style={styles.smallButton}
                              onPress={() => resendInvitation(invite.email)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.smallButtonText}>Resend</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallButton}
                              onPress={() => cancelInvitation(invite.email)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.smallButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ===== PUBLIC LINK ===== */}
              {canManage && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>PUBLIC LINK</Text>
                  <View style={styles.card}>
                    {!publicLink ? (
                      <>
                        <TextInput
                          style={styles.textInput}
                          value={linkPassword}
                          onChangeText={setLinkPassword}
                          placeholder="Optional password"
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.generateButton}
                          onPress={() => createPublicLink(linkPassword || undefined)}
                          activeOpacity={0.7}
                        >
                          <Link2 size={14} color={colors.bg} />
                          <Text style={styles.generateButtonText}>
                            Generate Public Link
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {/* Toggle + view count */}
                        <View style={styles.publicToggleRow}>
                          <View style={styles.publicToggleLeft}>
                            {publicLink.is_active ? (
                              <Eye size={14} color={colors.primary} />
                            ) : (
                              <EyeOff size={14} color={colors.textMuted} />
                            )}
                            <Text
                              style={[
                                styles.publicToggleLabel,
                                publicLink.is_active && {
                                  color: colors.primary,
                                },
                              ]}
                            >
                              {publicLink.is_active ? 'Public' : 'Private'}
                            </Text>
                          </View>
                          <View style={styles.publicToggleRight}>
                            <Text style={styles.viewCount}>
                              Views: {publicLink.view_count}
                            </Text>
                            <Switch
                              value={publicLink.is_active}
                              onValueChange={() => togglePublicLink()}
                              trackColor={{
                                false: colors.border,
                                true: colors.primary,
                              }}
                              thumbColor={colors.textPrimary}
                            />
                          </View>
                        </View>

                        {publicLink.is_active && (
                          <>
                            <View style={styles.divider} />

                            {/* Link URL + copy */}
                            <TouchableOpacity
                              style={styles.linkRow}
                              onPress={handleCopyLink}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={styles.linkText}
                                numberOfLines={1}
                              >
                                slate.opsapp.co/public/{publicLink.token}
                              </Text>
                              <Link2 size={14} color={colors.textMuted} />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Password */}
                            <TextInput
                              style={styles.textInput}
                              value={linkPassword}
                              onChangeText={setLinkPassword}
                              placeholder={
                                publicLink.password_hash
                                  ? 'Update password'
                                  : 'Add password'
                              }
                              placeholderTextColor={colors.textMuted}
                              secureTextEntry
                              autoCapitalize="none"
                            />
                            <View style={styles.linkActionsRow}>
                              <TouchableOpacity
                                style={styles.smallButton}
                                onPress={() => {
                                  updatePublicLinkPassword(
                                    linkPassword || null,
                                  );
                                  setLinkPassword('');
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.smallButtonText}>
                                  {publicLink.password_hash
                                    ? 'Update'
                                    : 'Add'}{' '}
                                  Password
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.smallButton}
                                onPress={handleRegenerate}
                                activeOpacity={0.7}
                              >
                                <RefreshCw
                                  size={12}
                                  color={colors.textMuted}
                                />
                                <Text style={styles.smallButtonText}>
                                  Regenerate
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Bottom spacer */}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.error,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  textInput: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: colors.bg,
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  collabInfo: {
    flex: 1,
    marginRight: 12,
  },
  collabName: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  youLabel: {
    fontFamily: theme.fonts.regular,
    color: colors.textMuted,
  },
  collabEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  collabActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trashButton: {
    padding: 4,
  },
  ownerBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ownerBadgeText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  roleBadgeText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  pendingBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  pendingBadgeText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  generateButtonText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: colors.bg,
  },
  publicToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  publicToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicToggleLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  publicToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewCount: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  linkText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  linkActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});

const pickerStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    minWidth: 110,
  },
  triggerText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textPrimary,
    marginRight: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  optionSelected: {
    color: colors.primary,
    fontFamily: theme.fonts.medium,
  },
});

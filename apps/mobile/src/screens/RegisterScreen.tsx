import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { radius, shadow, spacing, theme } from '../constants/theme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../App';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={[styles.ruleDot, met ? styles.ruleMet : styles.ruleUnmet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.ruleLabel, met ? styles.ruleMet : styles.ruleUnmet]}>{label}</Text>
    </View>
  );
}

export function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading, error, clearError } = useAuthStore();

  const hasLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = email && hasLength && hasLetter && hasNumber && passwordsMatch;

  const handleRegister = async () => {
    if (!canSubmit) return;
    clearError();
    await register(email.trim().toLowerCase(), password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>🛒</Text>
          </View>
          <Text style={styles.logoText}>TrolleyCheck</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign up</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textHint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={theme.textHint}
                secureTextEntry={!showPassword}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {password.length > 0 && (
              <View style={styles.rules}>
                <PasswordRule met={hasLength} label="8+ characters" />
                <PasswordRule met={hasLetter} label="Contains a letter" />
                <PasswordRule met={hasNumber} label="Contains a number" />
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={[
                styles.input,
                confirm.length > 0 && !passwordsMatch && styles.inputError,
              ]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
              placeholderTextColor={theme.textHint}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            {confirm.length > 0 && !passwordsMatch && (
              <Text style={styles.matchError}>Passwords don't match</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              !canSubmit && styles.primaryBtnDisabled,
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handleRegister}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <LoadingSpinner color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.link}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadow.md,
  },
  logoIcon: { fontSize: 36 },
  logoText: { fontSize: 28, fontWeight: '700', color: theme.primaryDark, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: theme.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: theme.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: spacing.md },

  errorBanner: {
    backgroundColor: theme.dangerLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { color: theme.danger, fontSize: 14 },

  field: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  inputError: { borderColor: theme.danger },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeBtn: { position: 'absolute', right: spacing.sm, padding: 4 },
  eyeIcon: { fontSize: 18 },

  rules: { marginTop: spacing.xs, gap: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ruleDot: { fontSize: 12, width: 16 },
  ruleLabel: { fontSize: 13 },
  ruleMet: { color: theme.primary },
  ruleUnmet: { color: theme.textHint },

  matchError: { color: theme.danger, fontSize: 13, marginTop: 4 },

  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.sm,
  },
  primaryBtnDisabled: { backgroundColor: theme.border },
  pressed: { opacity: 0.85 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  linkRow: { alignItems: 'center', marginTop: spacing.lg },
  linkText: { fontSize: 15, color: theme.textSecondary },
  link: { color: theme.primary, fontWeight: '600' },
});

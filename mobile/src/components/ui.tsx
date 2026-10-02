import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { websitePath } from "../lib/config";

export const colors = {
  background: "#050B18",
  surface: "#0D172A",
  raised: "#15223A",
  border: "#23344D",
  text: "#F2F7FF",
  muted: "#A8B6CC",
  cyan: "#5CDBF2",
  blue: "#2262C6",
  error: "#FFB9B2",
  green: "#7BE2BC",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: 24,
    gap: 20,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "600",
  },
  text: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 52,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    flexDirection: "row",
    gap: 10,
  },
  secondary: {
    backgroundColor: colors.raised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: "700" },
  error: { color: colors.error, fontSize: 14, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.border },
});

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}
export function Brand() {
  return (
    <View style={styles.row} accessible accessibilityLabel="ARYNQO">
      <Image
        source={require("../../assets/icon.png")}
        style={{ width: 44, height: 44 }}
        resizeMode="contain"
      />
      <Text
        style={{
          color: colors.text,
          fontSize: 22,
          fontWeight: "700",
          letterSpacing: 1.8,
        }}
      >
        ARYNQO
      </Text>
    </View>
  );
}
export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={secondary ? colors.cyan : colors.background}
        />
      ) : null}
      <Text style={[styles.buttonText, secondary && { color: colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7D90AE"
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={onPress ? { selected: Boolean(active) } : undefined}
      style={{
        minHeight: onPress ? 44 : 30,
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 24,
        backgroundColor: active ? colors.cyan : colors.raised,
      }}
    >
      <Text
        style={{
          color: active ? colors.background : colors.muted,
          fontSize: 13,
          fontWeight: active ? "700" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 48, gap: 16, alignItems: "center" }}>
      <ActivityIndicator color={colors.cyan} />
      <Text style={styles.text}>A carregar…</Text>
    </View>
  );
}
export function Notice({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.subtitle}>{title}</Text>
      {body ? <Text style={styles.text}>{body}</Text> : null}
      {action && onPress ? (
        <Button title={action} onPress={onPress} secondary />
      ) : null}
    </View>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      {retry ? (
        <Button title="Tentar novamente" onPress={retry} secondary />
      ) : null}
    </View>
  );
}
export function Back() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar às vagas"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      style={[styles.row, { minHeight: 44, alignSelf: "flex-start" }]}
    >
      <Ionicons name="arrow-back" size={20} color={colors.text} />
      <Text style={{ color: colors.text }}>Voltar</Text>
    </Pressable>
  );
}
export function WebsiteLink({ path, label }: { path: string; label: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        void Linking.openURL(websitePath(path)).catch(() => {});
      }}
      style={[styles.row, { minHeight: 44 }]}
    >
      <Text style={{ color: colors.cyan, fontSize: 14, flexShrink: 1 }}>
        {label}
      </Text>
      <Ionicons name="open-outline" color={colors.cyan} size={15} />
    </Pressable>
  );
}

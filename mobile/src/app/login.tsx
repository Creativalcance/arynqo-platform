import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  Back,
  Brand,
  Button,
  colors,
  Field,
  Screen,
  styles,
  WebsiteLink,
} from "../components/ui";
import { getSupabase } from "../lib/supabase";
import { useAuth } from "../providers/auth";

export default function Login() {
  const { session } = useAuth();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (session)
    return (
      <Redirect
        href={
          typeof jobId === "string" && /^[0-9a-f-]{36}$/i.test(jobId)
            ? { pathname: "/vaga/[id]", params: { id: jobId } }
            : "/"
        }
      />
    );
  async function signIn() {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Preenche o email e a palavra-passe.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (result.error)
        setError(
          result.error.code === "email_not_confirmed"
            ? "Confirma o teu email antes de entrares."
            : result.error.status === 429
              ? "Demasiadas tentativas. Aguarda um pouco e tenta novamente."
              : result.error.code === "invalid_credentials" ||
                  result.error.message === "Invalid login credentials"
                ? "O email ou a palavra-passe não estão corretos."
                : "Não foi possível entrar. Verifica a ligação e tenta novamente.",
        );
      else setPassword("");
    } catch {
      setError(
        "Não foi possível entrar. Verifica a ligação e tenta novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { flexGrow: 1 }]}
        >
          <Back />
          <View style={{ marginTop: 30, marginBottom: 20 }}>
            <Brand />
          </View>
          <Text style={styles.eyebrow}>BEM-VINDO DE VOLTA</Text>
          <Text style={[styles.title, { fontSize: 36, lineHeight: 43 }]}>
            O teu próximo passo{"\n"}começa aqui.
          </Text>
          <Text style={styles.text}>
            Entra com a conta que já utilizas na ARYNQO.
          </Text>
          <View style={{ gap: 20, marginTop: 12 }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="O teu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              editable={!busy}
            />
            <Field
              label="Palavra-passe"
              value={password}
              onChangeText={setPassword}
              placeholder="A tua palavra-passe"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              editable={!busy}
              onSubmitEditing={() => {
                void signIn();
              }}
              returnKeyType="go"
            />
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button
              title="Entrar na minha conta"
              busy={busy}
              onPress={() => {
                void signIn();
              }}
            />
          </View>
          <WebsiteLink
            path="/recuperar-acesso"
            label="Esqueci-me da palavra-passe"
          />
          <View style={styles.divider} />
          <Text style={styles.text}>Ainda não tens conta?</Text>
          <WebsiteLink path="/registo" label="Criar conta no website" />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>
            Nesta versão, o registo e a recuperação de acesso abrem no
            navegador. Depois, regressa à app para entrar.
          </Text>
          <WebsiteLink
            path="/politica-de-privacidade"
            label="Política de Privacidade"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

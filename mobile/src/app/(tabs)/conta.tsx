import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Brand,
  Button,
  colors,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  styles,
  WebsiteLink,
} from "../../components/ui";
import { fetchAccount } from "../../lib/api";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../../providers/auth";
import { useResource } from "../../hooks/use-resource";

export default function Account() {
  const { session, error: sessionError } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const resource = useResource(
    async () => (session ? fetchAccount(session.user.id) : null),
    session?.user.id || "guest",
  );
  async function signOut() {
    setLeaving(true);
    setError("");
    try {
      const result = await getSupabase().auth.signOut({ scope: "local" });
      if (result.error)
        setError("Não foi possível terminar a sessão. Tenta novamente.");
    } catch {
      setError("Não foi possível terminar a sessão. Tenta novamente.");
    } finally {
      setLeaving(false);
    }
  }
  const account = resource.data;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={resource.loading}
            onRefresh={() => {
              void resource.reload();
            }}
            tintColor={colors.cyan}
          />
        }
      >
        <Brand />
        <Text style={styles.title}>A minha conta</Text>
        {sessionError ? <ErrorNotice message={sessionError} /> : null}
        {!session ? (
          <Notice
            title="Tudo começa contigo"
            body="Entra com a tua conta ARYNQO para te candidatares e acompanhares as respostas das empresas."
            action="Entrar na minha conta"
            onPress={() => router.push("/login")}
          />
        ) : resource.loading && !account ? (
          <Loading />
        ) : resource.error ? (
          <ErrorNotice
            message={resource.error}
            retry={() => {
              void resource.reload();
            }}
          />
        ) : account ? (
          <>
            <View style={styles.card}>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: colors.raised,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-outline" size={26} color={colors.cyan} />
              </View>
              <Text style={styles.subtitle}>
                {account.profile.name || "A tua conta ARYNQO"}
              </Text>
              <Text style={styles.text}>{session.user.email}</Text>
              <Text style={{ color: colors.cyan }}>
                {account.profile.role === "student"
                  ? "Candidato"
                  : account.profile.role === "company"
                    ? "Empresa"
                    : "Administrador"}
              </Text>
            </View>
            {account.candidate ? (
              <View style={styles.card}>
                <Text style={styles.subtitle}>O teu perfil</Text>
                {account.candidate.headline ? (
                  <Text style={styles.text}>{account.candidate.headline}</Text>
                ) : null}
                <Text style={styles.text}>
                  {account.candidate.location || "Localização por preencher"}
                </Text>
                <Text style={styles.text}>
                  CV:{" "}
                  {account.candidate.cv_url || account.candidate.cv_file_url
                    ? "associado ao perfil"
                    : "ainda não associado"}
                </Text>
                <WebsiteLink
                  path="/dashboard/perfil"
                  label="Editar perfil e CV no website"
                />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.text}>
                  {account.profile.role === "student"
                    ? "Completa o perfil para te candidatares a vagas."
                    : "A gestão empresarial continua disponível no website nesta primeira versão da app."}
                </Text>
                <WebsiteLink
                  path={
                    account.profile.role === "company"
                      ? "/empresa/vagas"
                      : "/dashboard"
                  }
                  label="Abrir a minha área no website"
                />
              </View>
            )}
          </>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.subtitle}>ARYNQO</Text>
          <WebsiteLink path="/academia" label="Explorar a Academy no website" />
          <WebsiteLink
            path="/politica-de-privacidade"
            label="Política de Privacidade"
          />
          <WebsiteLink path="/aviso-legal" label="Aviso Legal" />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {session ? (
          <Button
            title="Terminar sessão neste dispositivo"
            busy={leaving}
            onPress={() => {
              void signOut();
            }}
            secondary
          />
        ) : (
          <WebsiteLink path="/registo" label="Criar uma conta no website" />
        )}
        <Text
          style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}
        >
          ARYNQO · Versão de desenvolvimento 0.1.0
        </Text>
      </ScrollView>
    </Screen>
  );
}

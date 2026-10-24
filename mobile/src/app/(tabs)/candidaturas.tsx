import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Chip,
  colors,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  styles,
} from "../../components/ui";
import { fetchAccount, fetchApplications } from "../../lib/api";
import { companyName, statusLabels } from "../../lib/jobs";
import { useAuth } from "../../providers/auth";
import { useResource } from "../../hooks/use-resource";

export default function Applications() {
  const { session } = useAuth();
  const resource = useResource(async (signal) => {
    if (!session) return null;
    const account = await fetchAccount(session.user.id);
    return {
      account,
      applications: account.candidate
        ? await fetchApplications(account.candidate.id, signal)
        : [],
    };
  }, session?.user.id || "guest");
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
        <Text style={styles.eyebrow}>ACOMPANHA O TEU PERCURSO</Text>
        <Text style={styles.title}>As tuas candidaturas</Text>
        <Text style={styles.text}>
          Consulta as candidaturas enviadas na app e no website.
        </Text>
        {!session ? (
          <Notice
            title="Entra na tua conta"
            body="As tuas candidaturas ficam reunidas aqui."
            action="Entrar"
            onPress={() => router.push("/login")}
          />
        ) : resource.loading && !resource.data ? (
          <Loading />
        ) : resource.error ? (
          <ErrorNotice
            message={resource.error}
            retry={() => {
              void resource.reload();
            }}
          />
        ) : resource.data?.account.profile.role !== "student" ? (
          <Notice
            title="Área de candidato"
            body="A gestão das candidaturas recebidas pela tua empresa está disponível no website."
          />
        ) : !resource.data?.applications.length ? (
          <Notice
            title="Ainda não enviaste candidaturas"
            body="Explora as oportunidades e encontra uma vaga que faça sentido para ti."
            action="Explorar vagas"
            onPress={() => router.push("/")}
          />
        ) : (
          <>
            {resource.data.applications.map((application) => (
              <View key={application.id} style={styles.card}>
                <View style={styles.wrap}>
                  <Chip
                    label={
                      statusLabels[application.status] || "Estado por confirmar"
                    }
                  />
                </View>
                <Text style={styles.subtitle}>
                  {application.jobs?.title || "Vaga indisponível"}
                </Text>
                <Text style={styles.text}>
                  {application.jobs
                    ? companyName(application.jobs)
                    : "A vaga já não pode ser consultada."}
                </Text>
                <Text style={styles.text}>
                  Enviada a{" "}
                  {new Date(application.created_at).toLocaleDateString("pt-PT")}
                </Text>
                {application.jobs ? (
                  <Button
                    title="Consultar vaga"
                    secondary
                    onPress={() =>
                      router.push({
                        pathname: "/vaga/[id]",
                        params: { id: application.job_id },
                      })
                    }
                  />
                ) : null}
              </View>
            ))}
            {resource.data.applications.length === 100 ? (
              <Text style={styles.text}>
                São apresentadas as 100 candidaturas mais recentes.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

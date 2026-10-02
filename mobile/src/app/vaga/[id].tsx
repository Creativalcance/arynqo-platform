import { useRef, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Back,
  Button,
  Chip,
  colors,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  styles,
  WebsiteLink,
} from "../../components/ui";
import { fetchAccount, fetchApplication, fetchJob } from "../../lib/api";
import { sendApplication } from "../../lib/application";
import {
  acceptsApplications,
  applicationError,
  companyName,
  statusLabels,
  workModel,
} from "../../lib/jobs";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../../providers/auth";
import { useResource } from "../../hooks/use-resource";

export default function JobDetail() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Clear local submission state immediately on account or vacancy changes.
  return <JobDetailContent key={`${id}:${session?.user.id || "guest"}`} />;
}
function JobDetailContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { session } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const resource = useResource(
    async (signal) => {
      if (!/^[0-9a-f-]{36}$/i.test(id))
        return { job: null, account: null, application: null };
      const [job, account] = await Promise.all([
        fetchJob(id, signal),
        session ? fetchAccount(session.user.id) : Promise.resolve(null),
      ]);
      const application = account?.candidate
        ? await fetchApplication(account.candidate.id, id, signal)
        : null;
      return { job, account, application };
    },
    `${id}:${session?.user.id || "guest"}`,
  );
  const job = resource.data?.job;
  const candidate = resource.data?.account?.candidate;
  const applied = submitted || Boolean(resource.data?.application);
  async function apply() {
    if (
      !candidate ||
      !job ||
      !acceptsApplications(job) ||
      sendingRef.current ||
      applied
    )
      return;
    sendingRef.current = true;
    setSending(true);
    setMessage("");
    try {
      const { error } = await sendApplication(
        getSupabase(),
        job.id,
        candidate.id,
      );
      if (error) {
        if (error.code === "23505") setSubmitted(true);
        setMessage(applicationError(error.code));
      } else {
        setSubmitted(true);
      }
      await resource.reload();
    } catch {
      setMessage(applicationError());
    } finally {
      setSending(false);
      sendingRef.current = false;
      setConfirming(false);
    }
  }
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Back />
        {resource.loading && !resource.data ? (
          <Loading />
        ) : resource.error ? (
          <ErrorNotice
            message={resource.error}
            retry={() => {
              void resource.reload();
            }}
          />
        ) : !job ? (
          <Notice
            title="Vaga indisponível"
            body="Esta oportunidade pode ter sido retirada. Podes continuar a explorar outras vagas."
            action="Ver oportunidades"
            onPress={() => router.replace("/")}
          />
        ) : (
          <>
            <Text style={styles.eyebrow}>{companyName(job).toUpperCase()}</Text>
            <Text style={styles.title}>{job.title}</Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" color={colors.cyan} size={19} />
              <Text style={styles.text}>
                {[job.location, job.country_code].filter(Boolean).join(" · ") ||
                  "Localização por indicar"}
              </Text>
            </View>
            <View style={styles.wrap}>
              <Chip label={workModel(job)} />
              {job.opportunity_type || job.contract_type ? (
                <Chip label={(job.opportunity_type || job.contract_type)!} />
              ) : null}
            </View>
            {job.salary_range ? (
              <View style={styles.card}>
                <Text style={styles.label}>Remuneração indicada</Text>
                <Text style={styles.text}>{job.salary_range}</Text>
              </View>
            ) : null}
            {applied ? (
              <View style={[styles.card, { borderColor: "#285F50" }]}>
                <View style={styles.row}>
                  <Ionicons
                    name="checkmark-circle"
                    size={23}
                    color={colors.green}
                  />
                  <Text style={[styles.subtitle, { color: colors.green }]}>
                    Candidatura enviada
                  </Text>
                </View>
                <Text style={styles.text}>
                  {statusLabels[
                    resource.data?.application?.status || "pending"
                  ] || "Recebida"}
                  . Podes acompanhar a resposta na área de candidaturas.
                </Text>
                <Button
                  title="Ver candidaturas"
                  secondary
                  onPress={() => router.push("/candidaturas")}
                />
              </View>
            ) : !acceptsApplications(job) ? (
              <Notice
                title="Candidaturas encerradas"
                body="Esta vaga já não está a aceitar novas candidaturas."
              />
            ) : !session ? (
              <Button
                title="Entrar para me candidatar"
                onPress={() =>
                  router.push({ pathname: "/login", params: { jobId: id } })
                }
              />
            ) : resource.data?.account?.profile.role !== "student" ? (
              <Notice
                title="Área de candidato"
                body="Esta ação está disponível para contas de candidato. A gestão empresarial está disponível no website."
              />
            ) : !candidate ? (
              <View style={styles.card}>
                <Text style={styles.text}>
                  Completa o perfil de candidato para enviares a candidatura.
                </Text>
                <WebsiteLink
                  path="/dashboard/perfil"
                  label="Completar perfil no website"
                />
              </View>
            ) : (
              <Button
                title="Candidatar-me a esta vaga"
                disabled={resource.loading}
                onPress={() => setConfirming(true)}
              />
            )}
            {message ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {message}
              </Text>
            ) : null}
            <View style={styles.divider} />
            <Text style={styles.subtitle}>Sobre a oportunidade</Text>
            <Text style={[styles.text, { color: "#CED8E8", lineHeight: 25 }]}>
              {job.description ||
                "A empresa ainda não disponibilizou uma descrição."}
            </Text>
            {job.required_skills?.length ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.subtitle}>Competências pedidas</Text>
                <View style={styles.wrap}>
                  {job.required_skills.map((skill, i) => (
                    <Chip key={`${skill}-${i}`} label={skill} />
                  ))}
                </View>
              </View>
            ) : null}
            <WebsiteLink
              path={`/vagas/${job.id}`}
              label="Consultar esta vaga no website"
            />
          </>
        )}
      </ScrollView>
      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sending) setConfirming(false);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "#000000BB",
            padding: 24,
          }}
        >
          <View
            style={[
              styles.card,
              { maxWidth: 520, width: "100%", alignSelf: "center", gap: 20 },
            ]}
          >
            <Text style={styles.subtitle}>Enviar candidatura?</Text>
            <Text style={styles.text}>
              Ao candidatar-te a {job?.title}, permites que a empresa consulte o
              teu perfil e o CV associado à tua conta.
            </Text>
            {candidate && !candidate.cv_url && !candidate.cv_file_url ? (
              <Text style={styles.text}>
                Ainda não tens um CV associado. A candidatura será enviada com
                os dados do teu perfil.
              </Text>
            ) : null}
            <Button
              title="Confirmar candidatura"
              busy={sending}
              onPress={() => {
                void apply();
              }}
            />
            <Button
              title="Voltar"
              disabled={sending}
              secondary
              onPress={() => setConfirming(false)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

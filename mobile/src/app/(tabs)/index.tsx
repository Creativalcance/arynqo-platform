import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Brand,
  Button,
  Chip,
  colors,
  ErrorNotice,
  Field,
  Loading,
  Notice,
  Screen,
  styles,
} from "../../components/ui";
import { JobCard } from "../../components/job-card";
import { CountryFilter } from "../../components/country-filter";
import { fetchJobs } from "../../lib/api";
import {
  emptyFilters,
  pageSize,
  type Job,
  type JobFilters,
} from "../../lib/jobs";
import { useDebounced } from "../../hooks/use-resource";

export default function Opportunities() {
  const [filters, setFilters] = useState<JobFilters>(emptyFilters);
  const [expanded, setExpanded] = useState(false);
  const debounced = useDebounced(filters);
  const [result, setResult] = useState<{
    filters: JobFilters;
    jobs: Job[];
  } | null>(null);
  const jobs = result?.filters === debounced ? result.jobs : [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(true);
  const page = useRef(0);
  const request = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const hasFilters = Object.values(filters).some(Boolean);
  const update = (part: Partial<JobFilters>) =>
    setFilters((previous) => ({ ...previous, ...part }));
  const load = useCallback(
    async (append = false) => {
      if (append && loadingRef.current) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const next = append ? page.current + 1 : 0;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchJobs(debounced, next, controller.signal);
        if (controller.signal.aborted) return;
        page.current = next;
        setMore(result.length === pageSize);
        setResult((previous) => ({
          filters: debounced,
          jobs:
            append && previous?.filters === debounced
              ? [
                  ...new Map(
                    [...previous.jobs, ...result].map((job) => [job.id, job]),
                  ).values(),
                ]
              : result,
        }));
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as vagas.",
          );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [debounced],
  );
  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);
  return (
    <Screen>
      <FlatList
        data={jobs}
        keyExtractor={(job) => job.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        refreshing={loading}
        onRefresh={() => {
          void load();
        }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 22, marginBottom: 20 }}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Brand />
              <View
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 8,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="planet-outline" color={colors.cyan} size={22} />
              </View>
            </View>
            <LinearGradient
              colors={["#15396A", "#0C203B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 25,
                borderRadius: 26,
                gap: 14,
                borderWidth: 1,
                borderColor: "#274D73",
              }}
            >
              <Text style={styles.eyebrow}>O TEU PRÓXIMO PASSO</Text>
              <Text style={[styles.title, { fontSize: 34, lineHeight: 40 }]}>
                Oportunidades{"\n"}para o teu futuro.
              </Text>
              <Text style={[styles.text, { color: "#C0D3E8" }]}>
                Explora vagas e encontra o teu lugar.
              </Text>
            </LinearGradient>
            <Field
              label="O que procuras?"
              placeholder="Função ou área profissional"
              value={filters.search}
              onChangeText={(search) => update({ search })}
              returnKeyType="search"
              autoCorrect={false}
            />
            <View style={styles.wrap}>
              {["", "Remoto", "Híbrido", "Presencial"].map((model) => (
                <Chip
                  key={model}
                  label={model || "Todos"}
                  active={filters.model === model}
                  onPress={() => update({ model })}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              style={[
                styles.row,
                { minHeight: 44, justifyContent: "space-between" },
              ]}
            >
              <Text style={{ color: colors.cyan, fontWeight: "600" }}>
                País e localização
                {filters.country || filters.location ? " · filtro ativo" : ""}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "options-outline"}
                color={colors.cyan}
                size={20}
              />
            </Pressable>
            {expanded ? (
              <View style={[styles.card, { gap: 18 }]}>
                <CountryFilter
                  value={filters.country}
                  onChange={(country) => update({ country, location: "" })}
                />
                <Field
                  label="Localização"
                  value={filters.location}
                  onChangeText={(location) => update({ location })}
                  placeholder="Ex.: Coimbra"
                  autoCorrect={false}
                />
              </View>
            ) : null}
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={styles.subtitle}>Vagas disponíveis</Text>
              {hasFilters ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFilters(emptyFilters)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ color: colors.cyan }}>Limpar filtros</Text>
                </Pressable>
              ) : null}
            </View>
            {error ? (
              <ErrorNotice
                message={error}
                retry={() => {
                  void load();
                }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : !error ? (
            <Notice
              title="Sem vagas para esta pesquisa"
              body="Experimenta outra função ou alarga a localização."
            />
          ) : null
        }
        ListFooterComponent={
          jobs.length && more ? (
            <View style={{ marginTop: 20 }}>
              <Button
                title="Ver mais vagas"
                busy={loading}
                onPress={() => {
                  void load(true);
                }}
                secondary
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

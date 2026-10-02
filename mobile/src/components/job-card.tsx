import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Chip, colors, styles } from "./ui";
import { companyName, workModel, type Job } from "../lib/jobs";

export function JobCard({ job }: { job: Job }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${companyName(job)}, ${job.location || "localização por indicar"}`}
      onPress={() =>
        router.push({ pathname: "/vaga/[id]", params: { id: job.id } })
      }
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Text style={{ color: colors.cyan, fontSize: 13, flex: 1 }}>
          {companyName(job)}
        </Text>
        <Ionicons
          name="arrow-up-right-box-outline"
          color={colors.muted}
          size={20}
        />
      </View>
      <Text style={styles.subtitle}>{job.title}</Text>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={16} color={colors.muted} />
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
        <Text style={{ color: colors.text, fontSize: 14 }}>
          {job.salary_range}
        </Text>
      ) : null}
    </Pressable>
  );
}

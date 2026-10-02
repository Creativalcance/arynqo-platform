import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, colors, Field, Screen, styles } from "./ui";
import countries from "../data/countries.json";

const names = new Intl.DisplayNames(["pt-PT"], { type: "region" });
const options = countries
  .map((code) => ({ code, label: names.of(code) || code }))
  .sort((a, b) => a.label.localeCompare(b.label, "pt"));
export function CountryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (country: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalized = search
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    <View>
      <Text style={styles.label}>País</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`País: ${value ? names.of(value) : "Todos os países"}`}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.row, { justifyContent: "space-between" }]}
      >
        <Text style={{ color: colors.text }}>
          {value ? names.of(value) : "Todos os países"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet"
      >
        <Screen>
          <View style={[styles.content, { flex: 1 }]}>
            <Text style={styles.title}>Selecionar país</Text>
            <Field
              label="Pesquisar país"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            <FlatList
              data={[
                { code: "", label: "Todos os países" },
                ...options.filter((o) =>
                  o.label
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .includes(normalized),
                ),
              ]}
              keyExtractor={(item) => item.code || "all"}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.code === value }}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                    setSearch("");
                  }}
                  style={{
                    paddingVertical: 17,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: item.code === value ? colors.cyan : colors.text,
                      fontSize: 16,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
            <Button title="Fechar" onPress={() => setOpen(false)} secondary />
          </View>
        </Screen>
      </Modal>
    </View>
  );
}

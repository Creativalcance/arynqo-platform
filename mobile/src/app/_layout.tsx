import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../providers/auth";
import { colors, Loading, Notice, Screen, styles } from "../components/ui";
import { isConfigured } from "../lib/config";
import { View } from "react-native";

function Navigation() {
  const { ready } = useAuth();
  if (!isConfigured)
    return (
      <Screen>
        <View style={styles.content}>
          <Notice
            title="ARYNQO"
            body="Esta versão ainda não tem uma ligação configurada. Contacta a equipa responsável pela versão de teste."
          />
        </View>
      </Screen>
    );
  if (!ready)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ presentation: "modal" }} />
      <Stack.Screen name="vaga/[id]" />
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

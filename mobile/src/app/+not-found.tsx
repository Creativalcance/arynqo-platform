import { router } from "expo-router";
import { View } from "react-native";
import { Notice, Screen, styles } from "../components/ui";
export default function NotFound() {
  return (
    <Screen>
      <View style={styles.content}>
        <Notice
          title="Página indisponível"
          body="Continua a explorar as oportunidades na ARYNQO."
          action="Ver oportunidades"
          onPress={() => router.replace("/")}
        />
      </View>
    </Screen>
  );
}

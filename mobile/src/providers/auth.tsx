import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const AuthContext = createContext<{
  session: Session | null;
  ready: boolean;
  error: string | null;
}>({ session: null, ready: false, error: null });

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let revision = 0;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      revision++;
      if (active) {
        setSession(next);
        setReady(true);
        setError(null);
      }
    });
    const current = revision;
    client.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (!active || revision !== current) return;
        setSession(data.session);
        if (authError)
          setError("Não foi possível recuperar a sessão. Volta a entrar.");
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível recuperar a sessão.");
          setReady(true);
        }
      });
    const refresh = (state: string) =>
      state === "active"
        ? client.auth.startAutoRefresh()
        : client.auth.stopAutoRefresh();
    if (Platform.OS !== "web") refresh(AppState.currentState);
    const appState =
      Platform.OS !== "web"
        ? AppState.addEventListener("change", refresh)
        : null;
    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, []);
  return (
    <AuthContext.Provider value={{ session, ready, error }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);

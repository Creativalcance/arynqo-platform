import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
) {
  const [value, setValue] = useState<{ key: string; data: T } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  }, [load]);
  const controller = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError(null);
    try {
      const data = await loader.current(request.signal);
      if (!request.signal.aborted) setValue({ key, data });
    } catch (reason) {
      if (!request.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar a informação.",
        );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, [key]);
  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => controller.current?.abort();
    }, [reload]),
  );
  return {
    data: value?.key === key ? value.data : null,
    error,
    loading,
    reload,
  };
}

export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

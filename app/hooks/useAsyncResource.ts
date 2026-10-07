"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Keeps the latest request and discards results from previous loads or unmounted pages. */
export function useAsyncResource<T>(
  load: () => Promise<T>,
  initialData: T,
  failureMessage: string,
) {
  const requestId = useRef({ current: 0 });
  const [state, setState] = useState({
    data: initialData,
    errorMessage: null as string | null,
    isLoading: true,
    source: load,
  });

  const read = useCallback(async () => {
    try {
      return { data: await load(), errorMessage: null, isLoading: false, source: load };
    } catch (error) {
      console.error(error);
      return { data: initialData, errorMessage: failureMessage, isLoading: false, source: load };
    }
  }, [load, initialData, failureMessage]);

  useEffect(() => {
    const requests = requestId.current;
    const current = ++requests.current;
    void read().then(result => {
      if (current === requests.current) setState(result);
    });
    return () => { requests.current++; };
  }, [read]);

  const reload = useCallback(async () => {
    const current = ++requestId.current.current;
    setState(previous => ({ ...previous, isLoading: true, errorMessage: null }));
    const result = await read();
    if (current === requestId.current.current) setState(result);
  }, [read]);

  // A changed account/mode must not render the previous account's data while loading.
  const current = state.source === load;
  return {
    data: current ? state.data : initialData,
    errorMessage: current ? state.errorMessage : null,
    isLoading: !current || state.isLoading,
    reload,
  };
}

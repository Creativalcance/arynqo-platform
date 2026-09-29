"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type UseAppMatchGenerationResult = {
  isGeneratingMatches: boolean;
  generationMessage: string;
  generateMatchesForCurrentStudent: () => Promise<boolean>;
};

async function getCurrentStudentProfileId() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  const { data } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  return data?.id || null;
}

export function useAppMatchGeneration(): UseAppMatchGenerationResult {
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

  async function generateMatchesForCurrentStudent() {
    setGenerationMessage("");

    const studentId = await getCurrentStudentProfileId();

    if (!studentId) {
      setGenerationMessage(
        "Apenas perfis de talento podem gerar matches com vagas.",
      );
      return false;
    }

    setIsGeneratingMatches(true);

    try {
      const response = await authenticatedFetch("/api/ai/generate-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
        }),
      });

      if (!response.ok) {
        setGenerationMessage(
          "Não foi possível gerar matches neste momento. Tenta novamente.",
        );
        setIsGeneratingMatches(false);
        return false;
      }

      setGenerationMessage("Matches IA atualizados com sucesso.");
      setIsGeneratingMatches(false);
      return true;
    } catch (error) {
      console.error("Erro ao gerar matches:", error);
      setGenerationMessage("Erro ao comunicar com a IA da ARYNQO.");
      setIsGeneratingMatches(false);
      return false;
    }
  }

  return {
    isGeneratingMatches,
    generationMessage,
    generateMatchesForCurrentStudent,
  };
}
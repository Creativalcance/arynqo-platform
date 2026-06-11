"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppRole =
  | "student"
  | "professional"
  | "candidate"
  | "company"
  | "recruiter"
  | "academy"
  | "university"
  | "school"
  | "admin"
  | "unknown";

export type AppMode =
  | "talent"
  | "company"
  | "recruiter"
  | "education"
  | "admin"
  | "public";

export type AppProfile = {
  id: string;
  role: string | null;
  appRole: AppRole;
  appMode: AppMode;
  roleLabel: string;
  name: string | null;
  email: string | null;
};

type RawProfile = {
  id: string;
  role: string | null;
  name: string | null;
  email: string | null;
};

type UseAppProfileResult = {
  profile: AppProfile | null;
  hasSession: boolean;
  isLoading: boolean;
  appMode: AppMode;
  appRole: AppRole;
  roleLabel: string;
  isTalent: boolean;
  isCompany: boolean;
  isRecruiter: boolean;
  isEducation: boolean;
  isAdmin: boolean;
  reloadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

function normalizeAppRole(role: string | null | undefined): AppRole {
  const normalizedRole = role?.trim().toLowerCase();

  if (!normalizedRole) {
    return "unknown";
  }

  if (
    normalizedRole === "student" ||
    normalizedRole === "estudante" ||
    normalizedRole === "talent" ||
    normalizedRole === "talento"
  ) {
    return "student";
  }

  if (
    normalizedRole === "professional" ||
    normalizedRole === "profissional"
  ) {
    return "professional";
  }

  if (
    normalizedRole === "candidate" ||
    normalizedRole === "candidato"
  ) {
    return "candidate";
  }

  if (
    normalizedRole === "company" ||
    normalizedRole === "empresa" ||
    normalizedRole === "employer" ||
    normalizedRole === "empregador"
  ) {
    return "company";
  }

  if (
    normalizedRole === "recruiter" ||
    normalizedRole === "recrutador" ||
    normalizedRole === "rh" ||
    normalizedRole === "hr"
  ) {
    return "recruiter";
  }

  if (
    normalizedRole === "academy" ||
    normalizedRole === "academia"
  ) {
    return "academy";
  }

  if (
    normalizedRole === "university" ||
    normalizedRole === "universidade"
  ) {
    return "university";
  }

  if (
    normalizedRole === "school" ||
    normalizedRole === "escola"
  ) {
    return "school";
  }

  if (
    normalizedRole === "admin" ||
    normalizedRole === "administrator"
  ) {
    return "admin";
  }

  return "unknown";
}

function getAppModeFromRole(role: string | null | undefined): AppMode {
  const appRole = normalizeAppRole(role);

  if (
    appRole === "student" ||
    appRole === "professional" ||
    appRole === "candidate"
  ) {
    return "talent";
  }

  if (appRole === "company") {
    return "company";
  }

  if (appRole === "recruiter") {
    return "recruiter";
  }

  if (
    appRole === "academy" ||
    appRole === "university" ||
    appRole === "school"
  ) {
    return "education";
  }

  if (appRole === "admin") {
    return "admin";
  }

  return "public";
}

function getRoleLabel(role: string | null | undefined): string {
  const appRole = normalizeAppRole(role);

  switch (appRole) {
    case "student":
      return "Estudante";
    case "professional":
      return "Profissional";
    case "candidate":
      return "Candidato";
    case "company":
      return "Empresa";
    case "recruiter":
      return "Recrutador";
    case "academy":
      return "Academia";
    case "university":
      return "Universidade";
    case "school":
      return "Escola";
    case "admin":
      return "Administrador";
    default:
      return "Visitante";
  }
}

function mapRawProfile(profile: RawProfile): AppProfile {
  const appRole = normalizeAppRole(profile.role);
  const appMode = getAppModeFromRole(profile.role);
  const roleLabel = getRoleLabel(profile.role);

  return {
    id: profile.id,
    role: profile.role,
    appRole,
    appMode,
    roleLabel,
    name: profile.name,
    email: profile.email,
  };
}

export function useAppProfile(): UseAppProfileResult {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile() {
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setHasSession(false);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setHasSession(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, name, email")
      .eq("id", sessionData.session.user.id)
      .single();

    if (error || !data) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setProfile(mapRawProfile(data as RawProfile));
    setIsLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setHasSession(false);
    window.location.href = "/login";
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const appMode = profile?.appMode ?? "public";
  const appRole = profile?.appRole ?? "unknown";
  const roleLabel = profile?.roleLabel ?? "Visitante";

  return {
    profile,
    hasSession,
    isLoading,
    appMode,
    appRole,
    roleLabel,
    isTalent: appMode === "talent",
    isCompany: appMode === "company",
    isRecruiter: appMode === "recruiter",
    isEducation: appMode === "education",
    isAdmin: appMode === "admin",
    reloadProfile: loadProfile,
    signOut,
  };
}
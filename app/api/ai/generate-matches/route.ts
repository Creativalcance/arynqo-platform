import { requireActor, enforceApiLimit, authorizeMatchScope, apiErrorResponse } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

import { calculateMatch, type StudentProfile, type Job } from "@/lib/matching-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const requestedScope = (await request.json().catch(() => ({}))) as {
      studentId?: string;
      jobId?: string;
    };

    const body = await authorizeMatchScope(actor, requestedScope);
    await enforceApiLimit(actor, "matching", 30, 60);
    const supabase = getAdminClient();

    let studentsQuery = supabase.from("student_profiles").select(`
      id,
      user_id,
      headline,
      desired_area,
      location,
      seniority,
      work_model,
      expected_salary,
      preferred_regions,
      academic_education,
      professional_experience,
      languages,
      spoken_languages,
      written_languages,
      tools,
      soft_skills,
      career_goals,
      preferred_opportunity_type,
      role_title,
      role_family,
      skills_normalized,
      tools_normalized,
      soft_skills_normalized,
      regions,
      salary_min,
      salary_max,
      ai_match_keywords,
      talent_type,
      student_skills ( skills ( name ) )
    `);

    if (body.studentId) {
      studentsQuery = studentsQuery.eq("id", body.studentId);
    }

    let jobsQuery = supabase
      .from("jobs")
      .select(`
        id,
        title,
        description,
        area,
        specializations,
        required_skills,
        preferred_skills,
        location,
        work_model,
        work_mode,
        opportunity_type,
        contract_type,
        seniority,
        languages,
        salary_range,
        salary_min,
        salary_max,
        education_requirements,
        experience_requirements,
        candidate_pitch,
        ai_summary,
        role_title,
        role_family,
        regions,
        ai_match_keywords
      `)
      .eq("is_active", true);

    if (body.jobId) {
      jobsQuery = jobsQuery.eq("id", body.jobId);
    }

    const [
      { data: students, error: studentsError },
      { data: jobs, error: jobsError },
    ] = await Promise.all([studentsQuery, jobsQuery]);

    if (studentsError) {
      return NextResponse.json(
        { error: studentsError.message },
        { status: 500 }
      );
    }

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    const matches = [];

    for (const student of (students || []) as StudentProfile[]) {
      for (const job of (jobs || []) as Job[]) {
        const result = calculateMatch(student, job);

        matches.push({
          student_id: student.id,
          job_id: job.id,
          match_score: result.matchScore,
          skills_score: result.skillsScore,
          role_score: result.roleScore,
          seniority_score: result.seniorityScore,
          location_score: result.locationScore,
          work_model_score: result.workModelScore,
          salary_score: result.salaryScore,
          education_language_score: result.educationLanguageScore,
          opportunity_type_score: result.opportunityTypeScore,
          match_category: result.matchCategory,
          is_relevant: result.isRelevant,
          strengths: result.strengths,
          gaps: result.gaps,
          matching_skills: result.matchingSkills,
          missing_skills: result.missingSkills,
          ai_recommendations: result.aiRecommendations,
          ai_reason: result.aiReason,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (matches.length > 0) {
      const { error: upsertError } = await supabase
        .from("ai_matches")
        .upsert(matches, {
          onConflict: "student_id,job_id",
        });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      matches_generated: matches.length,
    });
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao gerar matches:", error);

    return NextResponse.json(
      {
        error: "Erro ao gerar matches.",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
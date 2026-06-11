import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalize(text: string | null | undefined) {
  return (text || "").trim().toLowerCase();
}

export async function GET() {
  try {
    const { data: students, error: studentsError } =
      await supabase
        .from("student_profiles")
        .select(`
          id,
          desired_area,
          location,
          seniority,
          work_model,
          student_skills (
            skills (
              name
            )
          )
        `);

    if (studentsError) {
      throw studentsError;
    }

    const { data: jobs, error: jobsError } =
      await supabase
        .from("jobs")
        .select(`
          id,
          area,
          location,
          work_mode,
          seniority,
          job_skills (
            skills (
              name
            )
          )
        `);

    if (jobsError) {
      throw jobsError;
    }

    await supabase
      .from("job_matches")
      .delete()
      .neq("id", "");

    for (const student of students || []) {
      const studentSkills =
        student.student_skills?.map(
          (item: any) =>
            normalize(item.skills?.name)
        ) || [];

      for (const job of jobs || []) {
        let score = 0;

        const reasons: string[] = [];

        const jobSkills =
          job.job_skills?.map(
            (item: any) =>
              normalize(item.skills?.name)
          ) || [];

        const matchingSkills =
          studentSkills.filter((skill: string) =>
            jobSkills.includes(skill)
          );

        score += matchingSkills.length * 10;

        if (matchingSkills.length > 0) {
          reasons.push(
            `${matchingSkills.length} skills compatíveis`
          );
        }

        if (
          normalize(student.desired_area) ===
          normalize(job.area)
        ) {
          score += 25;

          reasons.push("Área profissional compatível");
        }

        if (
          normalize(student.location) ===
          normalize(job.location)
        ) {
          score += 15;

          reasons.push("Mesma localização");
        }

        if (
          normalize(student.seniority) ===
          normalize(job.seniority)
        ) {
          score += 10;

          reasons.push("Senioridade compatível");
        }

        if (
          normalize(student.work_model) ===
          normalize(job.work_mode)
        ) {
          score += 10;

          reasons.push("Modelo trabalho compatível");
        }

        if (score > 100) {
          score = 100;
        }

        if (score < 20) {
          continue;
        }

        await supabase
          .from("job_matches")
          .insert({
            student_id: student.id,
            job_id: job.id,
            match_score: score,
            match_reasons: reasons,
          });
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : "Erro ao calcular matches.",
  },
  {
    status: 500,
  }
);
  }
}
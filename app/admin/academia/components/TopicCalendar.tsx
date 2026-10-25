export type CalendarTopic = {
  id: string;
  title: string;
  enabled?: boolean;
  // Regeneration allows multiple runs per topic; accept the former one-to-one shape too.
  academy_generation_runs: { id: string } | { id: string }[] | null;
};

export default function TopicCalendar({ topics, nextDueAt, intervalDays, locale = "pt" }: {
  topics: CalendarTopic[];
  nextDueAt?: string;
  intervalDays?: number;
  locale?: string;
}) {
  const start = nextDueAt ? Date.parse(nextDueAt) : NaN;
  const showDates = Number.isFinite(start) && Number.isInteger(intervalDays) && intervalDays! > 0;
  return (
    <ol className="my-4 max-h-64 list-decimal space-y-2 overflow-y-auto pl-6 text-sm">
      {topics
        .filter((topic) => {
          if (topic.enabled === false) return false;
          const run = topic.academy_generation_runs;
          return Array.isArray(run) ? run.length === 0 : run === null;
        })
        .map((topic, index) => {
          const date = showDates ? new Date(start + index * intervalDays! * 86_400_000) : null;
          return <li key={topic.id}>
            {date && <time dateTime={date.toISOString()} className="mr-2 font-semibold">
              {date.toLocaleString(locale, { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })} UTC ·
            </time>}
            {topic.title}
          </li>;
        })}
    </ol>
  );
}

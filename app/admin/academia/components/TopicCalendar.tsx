export type CalendarTopic = {
  id: string;
  title: string;
  // UNIQUE(topic_id) makes the reverse PostgREST relation one-to-one.
  // Accept arrays as well for compatibility with an older cached response.
  academy_generation_runs: { id: string } | { id: string }[] | null;
};

export default function TopicCalendar({ topics }: { topics: CalendarTopic[] }) {
  return (
    <ol className="my-4 max-h-64 list-decimal space-y-2 overflow-y-auto pl-6 text-sm">
      {topics
        .filter((topic) => {
          const run = topic.academy_generation_runs;
          return Array.isArray(run) ? run.length === 0 : run === null;
        })
        .map((topic) => <li key={topic.id}>{topic.title}</li>)}
    </ol>
  );
}

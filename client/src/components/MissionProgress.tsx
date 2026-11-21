import { Link } from "wouter";
import { BookOpen, CheckCircle2, Flame, Lightbulb, RefreshCw, Rocket, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { MissionOverview, MissionSummary } from "@shared/missions";
import "./missions.css";

function completionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Completed mission" : new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

export function MissionStats({ summary }: { summary: MissionSummary }) {
  return (
    <dl className="mf-stats" aria-label="Mission results">
      <div><dt>Independent</dt><dd>{summary.independent}<span>/{summary.problemCount}</span></dd></div>
      <div><dt>First try</dt><dd>{summary.firstTry}<span>/{summary.problemCount}</span></dd></div>
      <div><dt>Hints opened</dt><dd>{summary.hintsUsed}</dd></div>
    </dl>
  );
}

export function MissionLaunchCards({ heading = "Your next mission" }: { heading?: string }) {
  const overview = trpc.mission.getOverview.useQuery(undefined, {
    refetchOnWindowFocus: true,
    retry: false,
  });

  return (
    <section className="mf-panel" aria-labelledby="mission-launch-heading">
      <div className="mf-section-heading">
        <div>
          <p className="mf-eyebrow">Build your number sense</p>
          <h2 id="mission-launch-heading">{heading}</h2>
        </div>
        <Rocket className="mf-section-icon" aria-hidden="true" />
      </div>
      <p className="mf-muted">Start with Make Ten, then use the same idea to add across ten. Each mission has five problems.</p>
      {overview.isLoading ? (
        <p className="mf-loading" role="status">Loading your saved missions…</p>
      ) : overview.error ? (
        <div className="mf-error" role="alert">
          <p>Your missions could not be loaded. Try again to see your saved progress.</p>
          <button type="button" className="mf-button mf-button-quiet" onClick={() => void overview.refetch()} disabled={overview.isFetching}>
            Try again
          </button>
        </div>
      ) : overview.data ? (
        <div className="mf-launch-grid">
          {overview.data.missions.map((mission) => (
            <article className="mf-launch-card" key={mission.id}>
              <div className="mf-launch-top">
                <span className="mf-launch-symbol" aria-hidden="true">{mission.id === "make-ten" ? <Flame /> : <Sparkles />}</span>
                <span className={`mf-readiness mf-readiness-${mission.readiness.status}`}>{mission.readiness.label}</span>
              </div>
              <h3>{mission.title}</h3>
              <p className="mf-muted">{mission.description}</p>
              {mission.latest && <p className="mf-latest">Last mission: <strong>{mission.latest.independent}/{mission.latest.problemCount} independent</strong></p>}
              <p className="mf-readiness-note">{mission.readiness.explanation}</p>
              <Link href={`/missions/${mission.id}${mission.activeRunId ? `?run=${encodeURIComponent(mission.activeRunId)}` : ""}`} className="mf-button mf-button-primary">
                {mission.activeRunId ? "Continue mission" : mission.latest ? "Practice again" : "Explore mission"}
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ParentMissionProgress({ childId }: { childId: number }) {
  const overview = trpc.parent.getMissionProgress.useQuery({ childId }, {
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: false,
  });
  const accessDenied = overview.error?.data?.code === "FORBIDDEN" || overview.error?.data?.code === "NOT_FOUND";

  return (
    <section className="mf-panel" aria-labelledby={`mission-progress-${childId}`}>
      <div className="mf-section-heading">
        <div>
          <p className="mf-eyebrow">A closer look at learning</p>
          <h2 id={`mission-progress-${childId}`}>Mission flight log</h2>
        </div>
        <button type="button" className="mf-button mf-button-quiet" onClick={() => void overview.refetch()} disabled={overview.isFetching} aria-label="Refresh mission progress">
          <RefreshCw size={17} className={overview.isFetching ? "mf-spinning" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>
      <p className="mf-muted">See what your learner solved independently and where a little support helped.</p>
      {overview.isLoading ? (
        <p className="mf-loading" role="status">Loading saved mission results…</p>
      ) : overview.error ? (
        // A failed authorization check must hide previously cached child results.
        <div className="mf-error" role="alert">
          <p>{accessDenied ? "This student’s mission progress is no longer available to this account." : "Mission results could not be refreshed. Refresh again to see the latest saved progress."}</p>
        </div>
      ) : overview.data ? (
        <div className="mf-parent-missions">
          {overview.data.missions.map((mission) => <ParentMissionCard key={mission.id} mission={mission} />)}
        </div>
      ) : null}
      <div className="mf-explainer">
        <Lightbulb size={19} aria-hidden="true" />
        <p><strong>Independent</strong> means correct on the first try without a hint. Bridge Through Ten counts a problem as independent only when all three steps meet that standard. Readiness uses an initial pilot rule, not a validated mastery assessment.</p>
      </div>
    </section>
  );
}

function ParentMissionCard({ mission }: { mission: MissionOverview["missions"][number] }) {
  return (
    <article className="mf-parent-card">
      <div className="mf-parent-card-heading">
        <h3>{mission.title}</h3>
        <span className={`mf-readiness mf-readiness-${mission.readiness.status}`}>{mission.readiness.label}</span>
      </div>
      {mission.latest ? (
        <>
          <p className="mf-date"><CheckCircle2 size={15} aria-hidden="true" /><time dateTime={mission.latest.completedAt}>{completionDate(mission.latest.completedAt)}</time></p>
          <MissionStats summary={mission.latest} />
        </>
      ) : (
        <p className="mf-empty"><BookOpen size={19} aria-hidden="true" />No completed mission yet. Results appear after the final step is saved.</p>
      )}
      {mission.activeRunId && <p className="mf-latest">A mission is in progress. Completed results will appear here.</p>}
      <p className="mf-readiness-note">{mission.readiness.explanation}</p>
    </article>
  );
}

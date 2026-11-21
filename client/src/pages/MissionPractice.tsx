import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { BookOpen, CheckCircle2, Cloud, Flame, Lightbulb, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MissionLaunchCards, MissionStats } from "@/components/MissionProgress";
import { MISSION_DEFINITIONS, type MissionAction, type MissionId, type MissionView } from "@shared/missions";
import "@/components/missions.css";

export default function MissionPractice() {
  const { user, isAuthenticated, loading } = useAuth();
  const { missionId } = useParams<{ missionId?: string }>();
  const search = useSearch();
  const definition = MISSION_DEFINITIONS.find((mission) => mission.id === missionId);
  useEffect(() => { document.title = `${definition?.title ?? "Missions"} · MathFuel`; }, [definition?.title]);
  return (
    <div className="mf-page">
      <header className="mf-header">
        <div className="mf-shell mf-header-inner">
          <Link href="/dashboard" className="mf-brand" aria-label="MathFuel dashboard"><span className="mf-brand-icon"><Flame size={25} aria-hidden="true" /></span>MathFuel</Link>
          <nav className="mf-header-nav" aria-label="Mission navigation">
            <Link href="/missions" className="mf-header-link"><Rocket size={17} aria-hidden="true" />Missions</Link>
            <Link href={user?.userType === "parent" ? "/parent" : "/dashboard"} className="mf-header-link">{user?.userType === "parent" ? "Parent view" : "Dashboard"}</Link>
          </nav>
        </div>
      </header>
      <main className="mf-shell mf-main">
        <section className="mf-hero" aria-labelledby="mission-page-heading">
          <div className="mf-hero-copy">
            <p className="mf-eyebrow">Number sense · Practice missions</p>
            <h1 id="mission-page-heading">{definition?.title ?? "Big ideas. Small steps."}</h1>
            <p className="mf-hero-description">{definition?.description ?? "Explore a useful strategy, try it for yourself, and watch your thinking grow."}</p>
          </div>
          <div className="mf-orbit" aria-hidden="true"><i className="mf-star" /><i className="mf-star" /><i className="mf-star" /><Rocket /></div>
        </section>
        {loading ? (
          <section className="mf-panel"><p className="mf-loading" role="status">Loading your account…</p></section>
        ) : !isAuthenticated ? (
          <section className="mf-panel"><h2>Save every small step.</h2><p className="mf-muted">Sign in to your student account to begin a mission and keep your progress.</p><div className="mf-actions"><Link className="mf-button mf-button-primary" href="/login">Sign in</Link><Link className="mf-button mf-button-quiet" href="/signup">Create an account</Link></div></section>
        ) : user?.userType !== "student" ? (
          <section className="mf-panel"><h2>Missions belong to your learner.</h2><p className="mf-muted">Your learner can start a mission from their own student account. Linked parents can follow completed results in the mission flight log.</p><div className="mf-actions"><Link className="mf-button mf-button-primary" href="/parent">Open parent view</Link></div></section>
        ) : missionId && !definition ? (
          <section className="mf-panel"><h2>Choose an available mission.</h2><p className="mf-muted">This mission could not be found.</p><div className="mf-actions"><Link className="mf-button mf-button-primary" href="/missions">See missions</Link></div></section>
        ) : definition ? <MissionSession key={`${definition.id}:${search}`} missionId={definition.id} /> : <MissionLaunchCards heading="Choose your mission" />}
        <p className="mf-footer">One mission is one practice sample. Take your time, use a hint when it helps, and keep exploring.</p>
      </main>
    </div>
  );
}

function MissionSession({ missionId }: { missionId: MissionId }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [runId, setRunId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("run"));
  const [answer, setAnswer] = useState("");
  const [validation, setValidation] = useState("");
  const [notice, setNotice] = useState("");
  const [retryAction, setRetryAction] = useState<MissionAction | null>(null);
  const [actionError, setActionError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const run = trpc.mission.getRun.useQuery({ runId: runId ?? "" }, { enabled: !!runId, retry: false, refetchOnWindowFocus: true });
  const view = run.data;
  const start = trpc.mission.start.useMutation({
    retry: false,
    onSuccess(data) {
      utils.mission.getRun.setData({ runId: data.id }, data);
      setRunId(data.id); setAnswer(""); setValidation(""); setActionError(""); setRetryAction(null); setNotice("");
      navigate(`/missions/${missionId}?run=${encodeURIComponent(data.id)}`, { replace: true });
      void utils.mission.getOverview.invalidate();
    },
  });
  const act = trpc.mission.act.useMutation({
    retry: false,
    onSuccess(data, action) {
      utils.mission.getRun.setData({ runId: data.id }, data);
      setRetryAction(null); setActionError(""); setValidation(""); setNotice("");
      if (action.action === "next") setAnswer("");
      if (data.status === "completed") void utils.mission.getOverview.invalidate();
      if (action.action === "answer" && !data.question?.solved) requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
    },
    async onError(error, action) {
      if (error.data?.code === "CONFLICT") {
        setRetryAction(null);
        try {
          const latest = await utils.mission.getRun.fetch({ runId: action.runId });
          utils.mission.getRun.setData({ runId: latest.id }, latest);
          setActionError(""); setValidation(""); setNotice("Your latest saved step has been loaded. Continue from here.");
          return;
        } catch { /* Retain the original request to avoid recording it twice. */ }
      }
      setRetryAction(action);
      setActionError(error.data?.code === "FORBIDDEN" || error.data?.code === "NOT_FOUND" ? "This mission is not available to this account. Return to your missions to continue." : "We could not confirm that this step was saved. Try saving it again before continuing.");
    },
  });
  useEffect(() => { setAnswer(""); setValidation(""); }, [view?.id, view?.problemIndex, view?.stepIndex]);
  useEffect(() => {
    if (act.isPending) return;
    if (view?.question?.solved) nextRef.current?.focus();
    else if (view?.question) inputRef.current?.focus();
  }, [view?.id, view?.problemIndex, view?.stepIndex, view?.question?.solved, act.isPending]);
  const blocked = act.isPending || !!retryAction || run.isFetching;
  function takeAction(action: MissionAction["action"], value?: string) {
    if (!view || blocked) return;
    setNotice(""); setActionError(""); setValidation("");
    act.mutate({ runId: view.id, expectedRevision: view.revision, actionId: crypto.randomUUID(), action, ...(action === "answer" ? { answer: value } : {}) });
  }
  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    const value = answer.trim();
    if (!/^\d{1,2}$/.test(value) || Number(value) > 20) { setValidation("Enter a whole number from 0 to 20."); inputRef.current?.focus(); return; }
    takeAction("answer", value);
  }
  if (!runId) return (
    <div className="mf-layout">
      <section className="mf-panel mf-workspace">
        <p className="mf-eyebrow">Ready when you are</p>
        <h2>{missionId === "make-ten" ? "How many more make ten?" : "Use ten as your stepping stone."}</h2>
        <p className="mf-muted" style={{ marginTop: ".8rem" }}>{missionId === "make-ten" ? "Look at the filled spaces in the ten-frame. Find how many more counters will fill it." : "Split the second number: use a few counters to make ten, then add the counters left over."}</p>
        <TenFrame question={{ a: missionId === "make-ten" ? 6 : 8, b: missionId === "make-ten" ? 4 : 5, kind: missionId === "make-ten" ? "make-ten" : "bridge-gap", solved: false, hintsUsed: 0, hint: null, answer: null, equation: "", prompt: "", feedback: null }} />
        <p className="mf-muted">Five problems. No timer. Your answers and hints save as you go.</p>
        <div className="mf-actions"><button type="button" className="mf-button mf-button-amber" onClick={() => start.mutate({ missionId })} disabled={start.isPending}><Rocket size={19} aria-hidden="true" />{start.isPending ? "Opening mission…" : "Open mission"}</button></div>
        {start.error && <div className="mf-error" role="alert"><p>Your mission could not be opened. Try again to load your saved progress.</p></div>}
      </section>
      <MissionNotes missionId={missionId} />
    </div>
  );
  if (run.isLoading) return <section className="mf-panel"><p className="mf-loading" role="status">Opening your saved mission…</p></section>;
  if (run.error) return (
    <section className="mf-panel"><h2>Your saved mission could not be opened.</h2><p className="mf-muted">Check your connection, then try again. Only the student who started this mission can open it.</p><div className="mf-actions"><button type="button" className="mf-button mf-button-primary" onClick={() => void run.refetch()} disabled={run.isFetching}>Try again</button><Link className="mf-button mf-button-quiet" href="/missions">Back to missions</Link></div></section>
  );
  if (!view) return null;
  if (view.missionId !== missionId) return <section className="mf-panel"><h2>This saved run belongs to {view.title}.</h2><div className="mf-actions"><Link className="mf-button mf-button-primary" href={`/missions/${view.missionId}?run=${encodeURIComponent(view.id)}`}>Open saved mission</Link></div></section>;
  if (view.status === "completed" && view.summary) return (
    <div className="mf-layout">
      <section className="mf-panel mf-workspace mf-completion" aria-labelledby="mission-complete-heading">
        <div className="mf-complete-icon"><CheckCircle2 size={36} aria-hidden="true" /></div>
        <p className="mf-eyebrow">Five problems explored</p><h2 id="mission-complete-heading">Mission complete.</h2>
        <p className="mf-muted">{missionId === "make-ten" ? "You practiced finding the missing part of ten." : "You practiced making ten first, then adding what is left."}</p>
        <MissionStats summary={view.summary} />
        <div className="mf-explainer"><Lightbulb size={20} aria-hidden="true" /><p>Independent means correct on the first try without a hint.{missionId === "bridge-ten" ? " Each problem includes all three bridge steps." : ""} Every try gives you another chance to learn.</p></div>
        <p className="mf-save-status"><Cloud size={19} aria-hidden="true" />Saved to your account and available in your linked parent’s mission flight log.</p>
        <div className="mf-actions">
          {missionId === "make-ten" && <Link className="mf-button mf-button-amber" href="/missions/bridge-ten">Try Bridge Through Ten</Link>}
          <button type="button" className={`mf-button ${missionId === "bridge-ten" ? "mf-button-amber" : "mf-button-quiet"}`} onClick={() => start.mutate({ missionId })} disabled={start.isPending}>{start.isPending ? "Opening mission…" : "Practice again"}</button>
          <Link className="mf-button mf-button-quiet" href="/missions">All missions</Link>
        </div>
        {start.error && <div className="mf-error" role="alert"><p>Your next mission could not be opened. Your completed result is still saved. Try again when your connection is ready.</p></div>}
      </section>
      <MissionNotes missionId={missionId} completed />
    </div>
  );
  const question = view.question;
  if (!question) return <section className="mf-panel"><p className="mf-muted">This mission needs to be refreshed.</p><div className="mf-actions"><button type="button" className="mf-button mf-button-primary" onClick={() => void run.refetch()} disabled={run.isFetching}>Refresh mission</button></div></section>;
  const isFinalStep = view.problemIndex === view.problemCount - 1 && view.stepIndex === view.stepCount - 1;
  return (
    <div className="mf-layout">
      <section className="mf-panel mf-workspace" aria-labelledby="mission-question-heading" aria-busy={act.isPending}>
        <div className="mf-progress-label"><span>Problem {view.problemIndex + 1} of {view.problemCount}</span><span>{missionId === "make-ten" ? "Addition within 10" : `Step ${view.stepIndex + 1} of ${view.stepCount}`}</span></div>
        <div className="mf-progress-track" aria-hidden="true">{Array.from({ length: view.problemCount }, (_, index) => <span key={index} className={`mf-progress-segment ${index < view.problemIndex ? "mf-progress-done" : index === view.problemIndex ? "mf-progress-current" : ""}`} />)}</div>
        {missionId === "bridge-ten" && <p className="mf-step-label">{["Make a ten", "Find what is left", "Put the parts together"][view.stepIndex]}</p>}
        <h2 id="mission-question-heading" className="mf-question">{question.prompt}</h2>
        <p className="mf-equation" aria-label={question.equation.replace(/[□?]/g, "what")}>{question.equation}</p>
        <TenFrame question={question} />
        {question.solved ? (
          <><div className="mf-feedback mf-feedback-good" role="status"><p><CheckCircle2 size={20} aria-hidden="true" />{question.feedback ?? "You found it. Let’s keep going."}</p></div><div className="mf-actions"><button ref={nextRef} type="button" className="mf-button mf-button-amber" onClick={() => takeAction("next")} disabled={blocked}>{act.isPending ? "Saving…" : isFinalStep ? "Finish mission" : view.stepIndex < view.stepCount - 1 ? "Next step" : "Next problem"}</button></div></>
        ) : (
          <form onSubmit={submitAnswer} noValidate>
            <label className="mf-answer-label" htmlFor="mission-answer">Your answer</label>
            <div className="mf-answer-controls">
              <input ref={inputRef} id="mission-answer" className="mf-answer-input" type="text" inputMode="numeric" autoComplete="off" maxLength={2} value={answer} onChange={(event) => { setAnswer(event.target.value); setValidation(""); }} aria-invalid={!!validation} aria-describedby={validation ? "mission-validation" : question.feedback ? "mission-feedback" : undefined} disabled={blocked} />
              <button type="submit" className="mf-button mf-button-amber" disabled={blocked || !answer.trim()}>{act.isPending ? "Saving…" : "Check answer"}</button>
              <button type="button" className="mf-button mf-button-quiet" onClick={() => takeAction("hint")} disabled={blocked || question.hintsUsed >= 2}><Lightbulb size={18} aria-hidden="true" />{question.hintsUsed >= 2 ? "Hints shown" : question.hintsUsed ? "Another hint" : "Get a hint"}</button>
            </div>
            {validation && <div className="mf-error" id="mission-validation" role="alert"><p>{validation}</p></div>}
            {question.feedback && <div className="mf-feedback" id="mission-feedback" role="status"><p>{question.feedback}</p></div>}
          </form>
        )}
        {question.hint && <div className="mf-hint-box" role="status"><strong>A little help: </strong>{question.hint}</div>}
        {notice && <div className="mf-notice" role="status"><p>{notice}</p></div>}
        {actionError && <div className="mf-error" role="alert"><p>{actionError}</p>{retryAction && <button type="button" className="mf-button mf-button-quiet" onClick={() => act.mutate(retryAction)} disabled={act.isPending}>{act.isPending ? "Saving again…" : "Try saving again"}</button>}</div>}
        <p className="mf-save-status" role="status"><Cloud size={17} aria-hidden="true" />{act.isPending ? "Saving this step…" : retryAction ? "Waiting to confirm this step." : "Your last step is saved."}</p>
      </section>
      <MissionNotes missionId={missionId} stepIndex={view.stepIndex} />
    </div>
  );
}

function TenFrame({ question }: { question: NonNullable<MissionView["question"]> }) {
  const gap = 10 - question.a;
  const bridgeFilled = question.kind === "bridge-rest" || question.kind === "bridge-total";
  const fillAdded = question.solved || bridgeFilled;
  const bridge = question.kind !== "make-ten";
  const remainder = question.b - gap;
  return (
    <div>
      <div className="mf-frame" role="img" aria-label={`Ten-frame: ${question.a} starting counters${fillAdded ? ` and ${gap} added counters, making ten` : ` and ${gap} empty spaces`}.`}>
        {Array.from({ length: 10 }, (_, index) => <span className="mf-frame-cell" key={index}>{index < question.a ? <i className="mf-counter" /> : fillAdded ? <i className="mf-counter mf-counter-added" /> : question.hintsUsed ? <i className="mf-counter mf-counter-empty" /> : null}</span>)}
      </div>
      <div className="mf-frame-key" aria-hidden="true"><span><i />Starting counters</span>{fillAdded && <span><i className="mf-key-added" />Added counters</span>}</div>
      {bridge && <><p className="mf-remainder-label">{bridgeFilled || question.solved ? "Counters left to add" : "Counters to add"}</p><div className="mf-remainder" role="img" aria-label={`${bridgeFilled || question.solved ? remainder : question.b} counters ${bridgeFilled || question.solved ? "left to add" : "to add"}.`}>{Array.from({ length: bridgeFilled || question.solved ? remainder : question.b }, (_, index) => <i key={index} />)}</div></>}
      <p className="mf-frame-caption">{bridgeFilled || (bridge && question.solved) ? "You made a full ten. The extra counters are the part still to add." : question.solved ? "The two parts fill the whole frame. Together, they make ten." : "A full frame holds ten. Look at the spaces that still need a counter."}</p>
    </div>
  );
}

function MissionNotes({ missionId, stepIndex, completed = false }: { missionId: MissionId; stepIndex?: number; completed?: boolean }) {
  return (
    <aside className="mf-aside" aria-label="Mission strategy">
      <section className="mf-panel">
        <Lightbulb className="mf-side-icon" size={25} aria-hidden="true" />
        <h2>{missionId === "make-ten" ? "Think in parts of ten" : "Build a bridge through ten"}</h2>
        <p className="mf-muted">{missionId === "make-ten" ? "The frame holds exactly ten counters. The empty spaces show how many more you need." : "Ten is a friendly number. Split one number into two parts to reach ten first."}</p>
        {missionId === "bridge-ten" && <ol className="mf-steps">{["Fill the first ten-frame.", "Find the counters left over.", "Add ten and the remaining part."].map((step, index) => <li key={step} className={!completed && stepIndex === index ? "mf-step-current" : ""} aria-current={!completed && stepIndex === index ? "step" : undefined}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol>}
      </section>
      <section className="mf-panel mf-note-panel">
        {completed ? <Sparkles className="mf-side-icon" size={25} aria-hidden="true" /> : <ShieldCheck className="mf-side-icon" size={25} aria-hidden="true" />}
        <h2>{completed ? "Give it time to stick" : "A little help is welcome"}</h2>
        <p className="mf-muted">{completed ? "Try the strategy again after a break. Results from more than one practice session help show what is becoming familiar." : "Hints are part of learning. Try a strategy, check your answer, and use a hint whenever you need one."}</p>
        <div className="mf-actions"><Link href="/missions" className="mf-button mf-button-quiet"><BookOpen size={17} aria-hidden="true" />All missions</Link></div>
      </section>
    </aside>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { BookOpen, Check, CheckCircle2, Code2, Copy, Database, Download, Eye, Flame, KeyRound, Lightbulb, Link2, Monitor, RefreshCw, Server, Sparkles, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import "@/components/missions.css";
import "@/components/workshop.css";

type Tutorial = inferRouterOutputs<AppRouter>["discoveryWorkshop"]["getTutorial"];
type Lesson = Tutorial["lessons"][number];
type Example = Lesson["examples"][number];

export default function DiscoveryWorkshop() {
  const [opened, setOpened] = useState(false);
  useEffect(() => { document.title = "The workshop door · MathFuel"; }, []);
  return (
    <div className="mf-page ow-page">
      <header className="mf-header">
        <div className="ow-shell mf-header-inner">
          <Link href="/" className="mf-brand" aria-label="MathFuel home"><span className="mf-brand-icon"><Flame size={25} aria-hidden="true" /></span>MathFuel</Link>
          <nav className="mf-header-nav" aria-label="Workshop navigation"><span className="ow-discovery-label">Explore when you’re ready</span><Link href="/" className="mf-header-link">MathFuel home</Link></nav>
        </div>
      </header>
      <main className="ow-shell ow-main">{opened ? <OpenWorkshop /> : <WorkshopDoor onOpen={() => setOpened(true)} />}</main>
    </div>
  );
}

function WorkshopDoor({ onOpen }: { onOpen: () => void }) {
  const [answer, setAnswer] = useState("");
  const [word, setWord] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [notice, setNotice] = useState("");
  const answerRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  function solve(event: FormEvent) {
    event.preventDefault();
    if (answer.trim() !== "4") { setNotice("How many more does six need to make ten? Try the first clue again."); answerRef.current?.focus(); return; }
    if (word.trim().toUpperCase() !== "DATA") { setNotice("You made ten. Now try the four-letter word for information a database remembers."); wordRef.current?.focus(); return; }
    onOpen();
  }
  return (
    <>
      <section className="mf-hero ow-hero" aria-labelledby="discovery-heading">
        <div className="mf-hero-copy"><p className="mf-eyebrow"><Sparkles size={16} aria-hidden="true" />Explore when you’re ready</p><h1 id="discovery-heading">The workshop door.</h1><p className="mf-hero-description">Love what you can make? Discover what makes it work.</p></div>
        <div className="ow-hero-art" aria-hidden="true"><KeyRound size={92} strokeWidth={1.1} /><i /><i /><i /></div>
      </section>
      <div className="ow-door-layout">
        <section className="mf-panel ow-door" aria-labelledby="door-clues-heading">
          <p className="mf-eyebrow">Follow your curiosity</p><h2 id="door-clues-heading">Two little clues open the door.</h2><p className="mf-muted">No grades or timers. Try it on your own, or explore with someone.</p>
          <form onSubmit={solve} className="ow-door-form" noValidate>
            <div className="ow-door-clue"><label htmlFor="workshop-number">6 + ? = 10</label><p id="number-clue-help">Find the missing number.</p><input ref={answerRef} id="workshop-number" value={answer} onChange={(event) => { setAnswer(event.target.value); setNotice(""); }} inputMode="numeric" autoComplete="off" maxLength={2} aria-describedby="number-clue-help" /></div>
            <div className="ow-door-clue"><label htmlFor="workshop-word">What does the database remember?</label><p id="word-clue-help">A four-letter word for information.</p><input ref={wordRef} id="workshop-word" value={word} onChange={(event) => { setWord(event.target.value); setNotice(""); }} autoComplete="off" maxLength={16} spellCheck={false} aria-describedby="word-clue-help" /></div>
            <div className="mf-actions"><button type="submit" className="mf-button mf-button-amber"><KeyRound size={18} aria-hidden="true" />Open the workshop</button><button type="button" className="mf-button mf-button-quiet" onClick={() => setShowHint((shown) => !shown)} aria-expanded={showHint} aria-controls="workshop-clue-hint"><Lightbulb size={18} aria-hidden="true" />{showHint ? "Hide the clue" : "Need a clue?"}</button></div>
            {showHint && <div className="mf-hint-box" id="workshop-clue-hint"><p>Six needs <strong>four</strong> more to make ten. A database remembers <strong>data</strong>.</p></div>}
            {notice && <div className="mf-notice" role="status"><p>{notice}</p></div>}
          </form>
        </section>
        <aside className="mf-panel ow-door-note"><Database size={32} aria-hidden="true" /><h2>See the thinking behind the screen.</h2><p>Follow an answer from a learner’s screen to the server, into a database, and back as useful progress.</p><p>Peek at captured SQL examples, explore how the pieces fit, and take sample results into Excel.</p><div className="ow-teacher-note"><BookOpen size={21} aria-hidden="true" /><p>You guide the learning. MathFuel gives you more tools to work with.</p></div><p className="ow-door-footnote">An optional discovery activity. Your regular missions are ready whenever you want to return.</p></aside>
      </div>
    </>
  );
}

function OpenWorkshop() {
  // Mount only after both clues are solved. The server checks the same clues;
  // this is a discovery activity, not authentication or access to student data.
  const tutorial = trpc.discoveryWorkshop.getTutorial.useQuery({ answer: 4, word: "DATA" }, { retry: false, refetchOnWindowFocus: false });
  if (tutorial.error) return <section className="mf-panel ow-load-message" role="alert"><Lightbulb size={30} aria-hidden="true" /><h1>The workshop could not be loaded.</h1><p className="mf-muted">Check your connection, then try opening it again.</p><div className="mf-actions"><button type="button" className="mf-button mf-button-primary" onClick={() => void tutorial.refetch()} disabled={tutorial.isFetching}>{tutorial.isFetching ? "Opening…" : "Try again"}</button><Link href="/" className="mf-button mf-button-quiet">Return to MathFuel</Link></div></section>;
  if (!tutorial.data) return <section className="mf-panel"><p className="mf-loading" role="status">Opening the workshop…</p></section>;
  return <WorkshopTutorial tutorial={tutorial.data} refreshing={tutorial.isFetching} onRefresh={() => void tutorial.refetch()} />;
}

function WorkshopTutorial({ tutorial, refreshing, onRefresh }: { tutorial: Tutorial; refreshing: boolean; onRefresh: () => void }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lesson = tutorial.lessons[lessonIndex] ?? tutorial.lessons[0];

  useEffect(() => { document.title = `${tutorial.title} · MathFuel`; }, [tutorial.title]);

  function chooseLesson(index: number) {
    setLessonIndex(index);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    <>
      <section className="mf-hero ow-hero" aria-labelledby="workshop-heading">
        <div className="mf-hero-copy"><p className="mf-eyebrow"><KeyRound size={15} aria-hidden="true" />Discover what makes it work</p><h1 id="workshop-heading">{tutorial.title}</h1><p className="mf-hero-description">{tutorial.subtitle}</p></div>
        <div className="ow-hero-art" aria-hidden="true"><Database size={96} strokeWidth={1.1} /><i /><i /><i /></div>
      </section>

      <section className="ow-overview" aria-label="Workshop overview">
        <div className="ow-intro">{tutorial.intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <dl className="ow-checkpoints">{tutorial.checkpoints?.map((checkpoint) => <div key={checkpoint.label}><dt>{checkpoint.label}</dt><dd>{checkpoint.value}</dd></div>)}</dl>
      </section>
      <div className="ow-snapshot-note"><Database size={19} aria-hidden="true" /><p>{tutorial.snapshotLabel}</p><button type="button" className="ow-refresh" onClick={onRefresh} disabled={refreshing} aria-label="Refresh workshop examples"><RefreshCw size={16} className={refreshing ? "mf-spinning" : ""} aria-hidden="true" /><span>Refresh</span></button></div>

      <div className="ow-layout">
        <aside className="ow-outline">
          <p className="mf-eyebrow">The learning path</p>
          <nav aria-label="Workshop lessons">
            <ol>{tutorial.lessons.map((item, index) => <li key={item.id}><button type="button" aria-current={lesson?.id === item.id ? "step" : undefined} onClick={() => chooseLesson(index)}><span className="ow-lesson-index" aria-hidden="true">{index + 1}</span><span>{item.title}</span></button></li>)}</ol>
          </nav>
          <div className="ow-outline-note"><BookOpen size={20} aria-hidden="true" /><p>Choose any lesson. The examples show captured results; they do not run SQL.</p></div>
        </aside>
        {lesson && <article className="mf-panel ow-lesson" aria-labelledby="lesson-heading">
          <div className="ow-lesson-top"><p className="mf-eyebrow">{lesson.kicker ?? "Inside the application"}</p><span>Lesson {lessonIndex + 1} of {tutorial.lessons.length}</span></div>
          <h2 id="lesson-heading" ref={headingRef} tabIndex={-1}>{lesson.title}</h2>
          <p className="ow-lesson-summary">{lesson.summary}</p>
          <div className="ow-lesson-body">{lesson.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{lesson.bullets?.length ? <ul>{lesson.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul> : null}</div>
          {lesson.replay?.length ? <SystemReplay key={`replay-${lesson.id}`} stages={lesson.replay} /> : null}
          {lesson.models?.length ? <RecordStructureExplorer key={`models-${lesson.id}`} models={lesson.models} /> : null}
          {lesson.examples.length > 0 && <ExampleExplorer key={lesson.id} examples={lesson.examples} />}
          <div className="ow-try"><Sparkles size={22} aria-hidden="true" /><div><h3>Try this</h3><p>{lesson.takeaway}</p></div></div>
          <div className="ow-lesson-footer"><button type="button" className="mf-button mf-button-quiet" onClick={() => chooseLesson(lessonIndex - 1)} disabled={lessonIndex === 0}>Previous lesson</button><span>{lessonIndex + 1} / {tutorial.lessons.length}</span><button type="button" className="mf-button mf-button-amber" onClick={() => chooseLesson(lessonIndex === tutorial.lessons.length - 1 ? 0 : lessonIndex + 1)}>{lessonIndex === tutorial.lessons.length - 1 ? "Back to the beginning" : "Next lesson"}</button></div>
        </article>}
      </div>
      <p className="mf-footer ow-footer">Explore when you’re ready · Examples are captured demonstrations. Opening a result changes only this page.</p>
    </>
  );
}

function ExampleExplorer({ examples }: { examples: Lesson["examples"] }) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const example = examples[exampleIndex];
  if (!example) return null;

  async function copySQL() {
    try { await navigator.clipboard.writeText(example.sql); setCopyNotice("SQL copied."); }
    catch { setCopyNotice("Copy is unavailable here. Select the SQL text to copy it."); }
  }

  return (
    <section className="ow-explorer" aria-label="Captured SQL examples">
      <div className="ow-explorer-heading"><Code2 size={21} aria-hidden="true" /><h3>Explore the evidence</h3><span>Read-only examples</span></div>
      {examples.length > 1 && <div className="ow-example-select" role="group" aria-label="Choose a SQL example">{examples.map((item, index) => <button type="button" key={item.id} aria-pressed={index === exampleIndex} onClick={() => { setExampleIndex(index); setRevealed(false); setCopyNotice(""); }}>{item.title}</button>)}</div>}
      <div className="ow-code">
        <div className="ow-code-bar"><span>{example.title}</span><button type="button" onClick={() => void copySQL()} aria-label="Copy the read-only SQL example">{copyNotice === "SQL copied." ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}Copy SQL</button></div>
        <pre tabIndex={0} aria-label="Read-only SQL example"><code>{example.sql}</code></pre>
      </div>
      {copyNotice && <p className="ow-copy-notice" role="status">{copyNotice}</p>}
      <div className="ow-reveal-row"><button type="button" className="mf-button mf-button-primary" onClick={() => setRevealed((shown) => !shown)} aria-expanded={revealed} aria-controls={`captured-${example.id}`}><Eye size={18} aria-hidden="true" />{revealed ? "Hide captured result" : "Show captured result"}</button><p>This reveals a saved example. It does not execute a query.</p></div>
      {revealed && <CapturedResult example={example} />}
    </section>
  );
}

function CapturedResult({ example }: { example: Example }) {
  return (
    <div className="ow-result" id={`captured-${example.id}`}>
      <div className="ow-result-caption"><Database size={17} aria-hidden="true" /><strong>Captured demonstration result</strong>{example.capturedAt && <time dateTime={example.capturedAt}>{displayDate(example.capturedAt)}</time>}</div>
      <div className="ow-table-scroll" tabIndex={0} role="region" aria-label={`Captured rows for ${example.title}`}>
        <table><caption className="sr-only">{example.title}: captured example rows</caption><thead><tr>{example.columns.map((column, index) => <th scope="col" key={`${column}-${index}`}>{column}</th>)}</tr></thead><tbody>{example.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, cellIndex) => <td key={cellIndex} className={typeof value === "number" ? "ow-number" : undefined}>{value === null ? <span className="ow-null">NULL</span> : String(value)}</td>)}</tr>)}</tbody></table>
        {example.rows.length === 0 && <p className="ow-no-rows">This captured query returned no rows.</p>}
      </div>
      <div className="ow-result-explanation"><Check size={18} aria-hidden="true" /><p>{example.explanation}</p></div>
      <div className="ow-export"><button type="button" className="mf-button mf-button-quiet" onClick={() => downloadCapturedCSV(example)}><Download size={17} aria-hidden="true" />Download captured CSV</button><p>Bring these sample rows into Excel. The download contains only the result shown here.</p></div>
    </div>
  );
}

function SystemReplay({ stages }: { stages: NonNullable<Lesson["replay"]> }) {
  const [stageIndex, setStageIndex] = useState(0);
  const icons = [Monitor, Server, Database, CheckCircle2];
  const current = stages[stageIndex];
  if (!current) return null;
  return (
    <section className="ow-replay" aria-labelledby="replay-heading">
      <div className="ow-explorer-heading"><Sparkles size={21} aria-hidden="true" /><h3 id="replay-heading">Follow one answer</h3><span>Illustrated replay</span></div>
      <div className="ow-replay-stages" role="group" aria-label="Choose a part of the journey">{stages.map((stage, index) => { const Icon = icons[index] ?? Database; return <button type="button" key={stage.title} onClick={() => setStageIndex(index)} aria-pressed={index === stageIndex}><Icon size={23} aria-hidden="true" /><span>{stage.title}</span></button>; })}</div>
      <div className="ow-replay-detail" aria-live="polite"><p className="mf-eyebrow">Part {stageIndex + 1} of {stages.length}</p><h4>{current.title}</h4><p>{current.description}</p></div>
      <div className="ow-replay-actions"><p>A demonstration of the flow, using fictional practice data.</p><button type="button" className="mf-button mf-button-amber" onClick={() => setStageIndex((index) => (index + 1) % stages.length)}>{stageIndex === stages.length - 1 ? "Replay from the screen" : "Next part"}</button></div>
    </section>
  );
}

function downloadCapturedCSV(example: Example) {
  const cell = (value: string | number | null) => {
    const raw = value === null ? "" : String(value);
    // Keep spreadsheet applications from interpreting a captured text cell as
    // a formula. Numeric values retain their numeric representation.
    const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = "\uFEFF" + [example.columns, ...example.rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mathfuel-captured-${example.id.replace(/[^a-z0-9-]/gi, "-")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(date);
}

function RecordStructureExplorer({ models }: { models: NonNullable<Lesson["models"]> }) {
  const [modelIndex, setModelIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(3);
  const model = models[modelIndex];
  const icons = [Users, Database, Link2];
  const learnerId = models.find((item) => item.id === "learner")?.fields.find((field) => field.name === "id")?.example ?? "learner-id";
  if (!model) return null;
  return (
    <section className="ow-models" aria-label="Explore record structure">
      <div className="ow-explorer-heading"><Database size={22} aria-hidden="true" /><h3>What does one row mean?</h3><span>Choose a kind of record</span></div>
      <div className="ow-model-choices" role="group" aria-label="Choose a record type">{models.map((item, index) => { const Icon = icons[index] ?? Database; return <button key={item.id} type="button" aria-pressed={index === modelIndex} onClick={() => setModelIndex(index)}><Icon size={22} aria-hidden="true" />{item.title}</button>; })}</div>
      <div className="ow-row-meaning" aria-live="polite"><h4>{model.title}</h4><p>{model.rowMeaning}</p></div>
      <dl className="ow-fields">{model.fields.map((field) => <div key={field.name}><dt><code>{field.name}</code></dt><dd><strong>{field.example}</strong><p>{field.explanation}</p></dd></div>)}</dl>
      <div className="ow-count-sketch">
        <label htmlFor="workshop-attempt-count">How many attempts does this learner make?</label>
        <div className="ow-slider-row"><input id="workshop-attempt-count" type="range" min={1} max={5} step={1} value={attemptCount} onChange={(event) => setAttemptCount(Number(event.target.value))} aria-valuetext={`${attemptCount} attempts: one learner row and ${attemptCount} attempt rows`} /><output htmlFor="workshop-attempt-count">{attemptCount}</output></div>
        <div className="ow-count-summary" aria-live="polite"><span><strong>1</strong> learner row</span><span><strong>{attemptCount}</strong> mission attempt {attemptCount === 1 ? "row" : "rows"}</span></div>
        <div className="ow-record-attempts" aria-hidden="true">{Array.from({ length: attemptCount }, (_, index) => <div key={index}><span>Attempt {index + 1}</span><code>studentId: {learnerId}</code></div>)}</div>
        <p>The learner’s ID stays the same. Each attempt has its own record. This is a structure sketch; moving the slider does not create records.</p>
      </div>
    </section>
  );
}

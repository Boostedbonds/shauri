"use client";

import React, { useMemo, useState } from "react";
import type { Experiment, Subject } from "@/lib/lab/types";
import { EXPERIMENTS, getExperimentsBySubject } from "@/lib/lab/labData";
import ExperimentRunner from "../ExperimentRunner";
import { evaluateExperiment, getDefaultRuntime } from "@/lib/lab/immersive/engine";
import type { ExperimentOutcome, ExperimentRuntime, InteractionEvent, LabModeType } from "@/lib/lab/immersive/types";
import dynamic from "next/dynamic";
import {
  CBSE_PRACTICALS,
  chaptersFor,
  classScopedGuidance,
  practicalsByFilters,
  type CBSEPractical,
  type ClassLevel,
  type PracticalDifficulty,
  type PracticalMode,
} from "@/lib/lab/curriculum";

const ImmersiveLabExperience = dynamic(() => import("@/app/components/lab/immersive3d/ImmersiveLabExperience"), { ssr: false });

const panelStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(8,16,28,0.9), rgba(10,24,40,0.72))",
  border: "1px solid rgba(122,170,210,0.34)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
  backdropFilter: "blur(14px)",
  borderRadius: 16,
};

export default function ImmersiveLabApp() {
  // ── Pull student name from your auth session ──────────────────────────────
  // Next-Auth:   const { data: session } = useSession();
  //              const studentName = session?.user?.name ?? undefined;
  // Supabase:    const { data: { user } } = useSupabaseClient().auth.getUser()
  //              const studentName = user?.user_metadata?.full_name ?? undefined;
  //
  // Replace the line below once you wire up auth:
  const studentName: string | undefined = undefined; // ← swap with real session value
  const [mode, setMode] = useState<LabModeType>("guided");
  const [classLevel, setClassLevel] = useState<ClassLevel | "all">(10);
  const [difficulty, setDifficulty] = useState<PracticalDifficulty | "all">("all");
  const [chapter, setChapter] = useState<string | "all">("all");
  const [subject, setSubject] = useState<Subject>("chemistry");
  const [experimentId, setExperimentId] = useState<string>(getExperimentsBySubject("chemistry")[0]?.id ?? EXPERIMENTS[0].id);
  const [selectedPracticalId, setSelectedPracticalId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<ExperimentRuntime>(getDefaultRuntime());
  const [score, setScore] = useState(0);
  const [safety, setSafety] = useState(100);
  const [eventFeed, setEventFeed] = useState<InteractionEvent[]>([]);
  const [lastOutcome, setLastOutcome] = useState<ExperimentOutcome | null>(null);
  const [recordObservation, setRecordObservation] = useState("");
  const [recordInference, setRecordInference] = useState("");
  const [recordConclusion, setRecordConclusion] = useState("");
  const [showNotebook, setShowNotebook] = useState(false);
  const [showViva, setShowViva] = useState(false);

  const filteredPracticals = useMemo(
    () =>
      practicalsByFilters({
        classLevel,
        subject,
        difficulty,
        chapter,
        mode: (mode === "research" ? "sandbox" : mode) as PracticalMode,
      }),
    [classLevel, subject, difficulty, chapter, mode]
  );
  const chapterOptions = useMemo(() => chaptersFor(classLevel, subject), [classLevel, subject]);

  const selectedPractical = useMemo<CBSEPractical | null>(() => {
    if (!filteredPracticals.length) return null;
    if (!selectedPracticalId) return filteredPracticals[0];
    return filteredPracticals.find((p) => p.id === selectedPracticalId) ?? filteredPracticals[0];
  }, [filteredPracticals, selectedPracticalId]);

  const experiments = useMemo(() => getExperimentsBySubject(subject), [subject]);
  const resolvedExperimentId = useMemo(() => {
    if (selectedPractical?.linkedExperimentId) return selectedPractical.linkedExperimentId;
    return experimentId;
  }, [selectedPractical, experimentId]);
  const experiment = useMemo(() => experiments.find((x) => x.id === resolvedExperimentId) ?? experiments[0], [experiments, resolvedExperimentId]);

  const classGuidance = useMemo(() => (classLevel === "all" ? "Mixed cohort mode: balanced pedagogy." : classScopedGuidance(classLevel)), [classLevel]);

  const execute = () => {
    if (!experiment) return;
    const outcome = evaluateExperiment(experiment, runtime);
    setLastOutcome(outcome);
    setScore((p) => Math.max(0, p + outcome.scoreDelta));
    setSafety((p) => Math.max(0, Math.min(100, p + outcome.safetyDelta)));
    setEventFeed((prev) => [...outcome.events, ...prev].slice(0, 22));
    const stamp = new Date().toLocaleTimeString();
    setRecordObservation((prev) =>
      `${prev}${prev ? "\n" : ""}[${stamp}] ${outcome.observation}`.slice(0, 2000)
    );
  };

  const setSubjectWithExperiment = (s: Subject) => {
    setSubject(s);
    const first = getExperimentsBySubject(s)[0];
    if (first) setExperimentId(first.id);
    setSelectedPracticalId(null);
    setChapter("all");
    setRuntime(getDefaultRuntime());
  };

  return (
    <div style={{ minHeight: "100vh", color: "#e3f2ff", background: "radial-gradient(circle at 20% 0%, rgba(20,62,104,0.56), rgba(4,8,14,0.98) 42%)", fontFamily: "'Orbitron', 'Segoe UI', system-ui, sans-serif" }}>
      <header style={{ ...panelStyle, margin: "10px", padding: "12px 14px", position: "sticky", top: 8, zIndex: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, letterSpacing: "0.12em", fontSize: 13 }}>SHAURI SPATIAL SCIENCE LAB</div>
          <div style={{ opacity: 0.8, fontSize: 11 }}>AAA-Grade Immersive Runtime</div>
          <div style={{ opacity: 0.8, fontSize: 11 }}>CBSE Practical Ecosystem</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 11, padding: "7px 9px", borderRadius: 9, background: "rgba(22,44,69,0.7)" }}>Score: <strong>{score}</strong></div>
            <div style={{ fontSize: 11, padding: "7px 9px", borderRadius: 9, background: safety > 60 ? "rgba(18,91,70,0.7)" : "rgba(128,42,42,0.7)" }}>Safety: <strong>{safety}%</strong></div>
          </div>
        </div>
      </header>

      <main style={{ display: "grid", gridTemplateColumns: "290px minmax(0,1fr) 340px", gap: 10, padding: "0 10px 10px" }}>
        <aside style={{ ...panelStyle, padding: 12 }}>
          <SectionLabel text="Simulation Modes" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {(["guided", "exam", "sandbox", "research"] as LabModeType[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={btn(mode === m)}>{m}</button>
            ))}
          </div>

          <SectionLabel text="Lab Wings" />
          <div style={{ display: "flex", gap: 6 }}>
            {(["chemistry", "physics", "biology"] as Subject[]).map((s) => (
              <button key={s} onClick={() => setSubjectWithExperiment(s)} style={btn(subject === s, true)}>{s}</button>
            ))}
          </div>

          <SectionLabel text="Class and Difficulty" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select value={classLevel} onChange={(e) => setClassLevel(e.target.value === "all" ? "all" : Number(e.target.value) as ClassLevel)} style={selectStyle}>
              <option value="all">All Classes</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as PracticalDifficulty | "all")} style={selectStyle}>
              <option value="all">All Difficulty</option>
              <option value="foundation">Foundation</option>
              <option value="core">Core</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <SectionLabel text="Chapter" />
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
            <option value="all">All Chapters</option>
            {chapterOptions.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>

          <div style={{ marginTop: 8, fontSize: 10, opacity: 0.78, lineHeight: 1.5 }}>{classGuidance}</div>

          <SectionLabel text="CBSE Practical Catalog" />
          <div style={{ maxHeight: 280, overflow: "auto", display: "grid", gap: 6 }}>
            {filteredPracticals.map((p) => (
              <button key={p.id} onClick={() => setSelectedPracticalId(p.id)} style={{ ...btn(p.id === selectedPractical?.id, true), textAlign: "left", display: "block" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: 10, opacity: 0.82 }}>Class {p.classLevel} • {p.subject} • {p.chapter}</div>
                <div style={{ fontSize: 10, opacity: 0.72 }}>{p.status === "implemented" ? "Immersive ready" : "Curriculum blueprint"}</div>
              </button>
            ))}
          </div>

          <button onClick={() => setShowNotebook((x) => !x)} style={{ ...btn(showNotebook), marginTop: 10, width: "100%" }}>
            {showNotebook ? "Hide scientific notebook" : "Open scientific notebook"}
          </button>
        </aside>

        <section style={{ ...panelStyle, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{selectedPractical?.title ?? experiment?.title}</div>
              <div style={{ fontSize: 11, opacity: 0.82 }}>{selectedPractical?.objective ?? experiment?.description}</div>
              {selectedPractical && (
                <div style={{ fontSize: 10, opacity: 0.72, marginTop: 4 }}>
                  NCERT: {selectedPractical.ncertTopic} • Type: {selectedPractical.experimentType} • Difficulty: {selectedPractical.difficulty}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Mode: {mode}</div>
          </div>

          {experiment && (
            <ImmersiveLabExperience
              subject={subject}
              mode={mode}
              experiment={experiment}
              onRunResult={execute}
              runtime={runtime}
              setRuntime={setRuntime}
              eventFeed={eventFeed}
              setEventFeed={setEventFeed}
              lastOutcome={lastOutcome}
              studentName={studentName}
            />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
            <SliderCard label="Temperature C" min={20} max={200} value={runtime.temperatureC} onChange={(v) => setRuntime((p) => ({ ...p, temperatureC: v }))} />
            <SliderCard label="Stir RPM" min={0} max={500} value={runtime.stirringRpm} onChange={(v) => setRuntime((p) => ({ ...p, stirringRpm: v }))} />
            <SliderCard label="Microscope Zoom" min={10} max={120} value={runtime.microscopeZoom} onChange={(v) => setRuntime((p) => ({ ...p, microscopeZoom: v }))} />
          </div>
        </section>

        <aside style={{ ...panelStyle, padding: 12 }}>
          <SectionLabel text="Procedure Focus" />
          <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
            {(selectedPractical?.proceduralFocus ?? []).map((focus) => (
              <div key={focus} style={{ fontSize: 11, padding: "7px 8px", borderRadius: 8, border: "1px solid rgba(122,170,210,0.28)", background: "rgba(11,24,38,0.58)" }}>
                {focus}
              </div>
            ))}
          </div>

          <SectionLabel text="Materials Rig" />
          <div style={{ maxHeight: 230, overflow: "auto", display: "grid", gap: 6 }}>
            {experiment?.materials.map((m) => {
              const active = runtime.selectedMaterialIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setRuntime((p) => ({ ...p, selectedMaterialIds: active ? p.selectedMaterialIds.filter((x) => x !== m.id) : [...p.selectedMaterialIds, m.id] }))}
                  style={{ ...btn(active, true), textAlign: "left" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{active ? "Loaded" : "Load"} - {m.name}</div>
                  {m.formula && <div style={{ fontSize: 10, opacity: 0.75 }}>{m.formula}</div>}
                </button>
              );
            })}
          </div>

          <SectionLabel text="Lab Record" />
          <div style={{ display: "grid", gap: 6 }}>
            <textarea value={recordObservation} onChange={(e) => setRecordObservation(e.target.value)} placeholder="Observations..." rows={3} style={textAreaStyle} />
            <textarea value={recordInference} onChange={(e) => setRecordInference(e.target.value)} placeholder="Inference..." rows={2} style={textAreaStyle} />
            <textarea value={recordConclusion} onChange={(e) => setRecordConclusion(e.target.value)} placeholder="Conclusion..." rows={2} style={textAreaStyle} />
          </div>

          <button onClick={() => setShowViva((v) => !v)} style={{ ...btn(showViva), marginTop: 8, width: "100%" }}>
            {showViva ? "Hide Viva Panel" : "Show Viva Panel"}
          </button>
          {showViva && (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {(selectedPractical?.vivaPrompts ?? []).map((q, idx) => (
                <div key={q} style={{ fontSize: 11, lineHeight: 1.4, padding: "8px", borderRadius: 8, border: "1px solid rgba(122,170,210,0.3)", background: "rgba(17,32,52,0.62)" }}>
                  Q{idx + 1}. {q}
                </div>
              ))}
            </div>
          )}

          <SectionLabel text="Experiment Telemetry" />
          <div style={{ maxHeight: 320, overflow: "auto", display: "grid", gap: 6 }}>
            {eventFeed.length === 0 && <div style={{ fontSize: 11, opacity: 0.7 }}>No events yet. Execute interaction in lab scene.</div>}
            {eventFeed.map((event) => (
              <div key={event.id} style={{ fontSize: 11, lineHeight: 1.4, padding: "8px", borderRadius: 8, border: "1px solid rgba(122,170,210,0.3)", background: event.severity === "warning" ? "rgba(129,48,48,0.42)" : event.severity === "success" ? "rgba(38,101,79,0.42)" : "rgba(17,32,52,0.62)" }}>
                {event.message}
              </div>
            ))}
          </div>
        </aside>
      </main>

      {showNotebook && experiment && (
        <section style={{ ...panelStyle, margin: "0 10px 10px", overflow: "hidden" }}>
          <ExperimentRunner experiment={experiment} />
        </section>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.78, margin: "10px 0 7px" }}>{text}</div>;
}

function btn(active: boolean, full = false): React.CSSProperties {
  return {
    padding: "8px 9px",
    borderRadius: 10,
    border: "1px solid rgba(122,170,210,0.34)",
    background: active ? "rgba(62,152,244,0.32)" : "rgba(10,20,34,0.55)",
    color: "#e3f2ff",
    cursor: "pointer",
    textTransform: "capitalize",
    width: full ? "100%" : undefined,
    fontSize: 11,
  };
}

function SliderCard({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ border: "1px solid rgba(122,170,210,0.28)", borderRadius: 10, padding: 8, background: "rgba(8,18,30,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    </label>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 8px",
  borderRadius: 8,
  border: "1px solid rgba(122,170,210,0.34)",
  background: "rgba(10,20,34,0.6)",
  color: "#e3f2ff",
  fontSize: 11,
};

const textAreaStyle: React.CSSProperties = {
  border: "1px solid rgba(122,170,210,0.28)",
  borderRadius: 8,
  background: "rgba(8,18,30,0.5)",
  color: "#e3f2ff",
  fontSize: 11,
  padding: 8,
  resize: "vertical",
};
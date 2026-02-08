"use client";

import { useEffect, useState } from "react";
import AccessGate from "./components/AccessGate";
import StudentGate from "./components/StudentGate";
import ProfileGate from "./components/ProfileGate";
import ModeSelector, { Mode } from "./components/ModeSelector";
import Header from "./components/Header";

import { hasAccess } from "./lib/session";
import { getStudent } from "./lib/student";
import { getActiveProfile } from "./lib/profiles";

import TeacherMode from "./components/modes/TeacherMode";
import ExaminerMode from "./components/modes/ExaminerMode";
import OralMode from "./components/modes/OralMode";
import ProgressMode from "./components/modes/ProgressMode";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [student, setStudent] = useState(false);
  const [profile, setProfile] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    setReady(hasAccess());
    setStudent(!!getStudent());
    setProfile(!!getActiveProfile());
  }, []);

  if (!ready) return <AccessGate onSuccess={() => setReady(true)} />;

  if (!student) return <StudentGate onDone={() => setStudent(true)} />;

  if (!profile) return <ProfileGate onDone={() => setProfile(true)} />;

  return (
    <>
      <Header />

      {!mode && <ModeSelector onSelect={setMode} />}

      {mode === "teacher" && <TeacherMode />}
      {mode === "examiner" && <ExaminerMode />}
      {mode === "oral" && <OralMode />}
      {mode === "progress" && <ProgressMode />}
    </>
  );
}

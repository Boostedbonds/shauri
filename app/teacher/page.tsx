"use client";
import LearnChatPage from "../components/LearnChatPage";

export default function TeacherPage() {
  return (
    <LearnChatPage
      mode="learn"
      accentColor="#7c3aed"
      title="👨‍🏫 Teacher Mode"
      greeting="Hey! 👨‍🏫 I'm your CBSE Teacher.\n\nTell me:\n• Which **subject** you're studying (Science, Maths, English, Hindi, SST…)\n• Which **chapter or topic** you want to understand\n\nI'll explain it clearly with examples, diagrams in text, and check your understanding with a quick quiz!"
    />
  );
}
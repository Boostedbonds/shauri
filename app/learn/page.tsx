"use client";
import LearnChatPage from "../components/LearnChatPage";

export default function LearnPage() {
  return (
    <LearnChatPage
      mode="learn"
      accentColor="#16a34a"
      title="🧠 Learn Mode"
      greeting="Hey! 🧠 I'm your CBSE Learn Mode tutor.\n\nTell me:\n• Which **subject** you're studying (Science, Maths, English, Hindi, SST…)\n• Which **chapter or topic** you want to understand\n\nI'll explain it clearly with examples, diagrams in text, and check your understanding with a quick quiz!"
    />
  );
}
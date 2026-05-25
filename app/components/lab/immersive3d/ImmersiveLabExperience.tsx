"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  KeyboardControls,
  PointerLockControls,
  Text,
  useKeyboardControls,
} from "@react-three/drei";
import {
  Physics,
  RigidBody,
  useFixedJoint,
  usePrismaticJoint,
  useRevoluteJoint,
  useSpringJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Experiment, Subject } from "@/lib/lab/types";
import type {
  ExperimentOutcome,
  ExperimentRuntime,
  InteractionEvent,
  LabModeType,
} from "@/lib/lab/immersive/types";
import { LAB_STATIONS, getDefaultRuntime, stationForSubject } from "@/lib/lab/immersive/engine";
import { APPARATUS_PROFILES, clampJoint, dampTo, stepJoint, type ApparatusState } from "@/lib/lab/immersive/mechanics";
import {
  applyStress,
  loadRecords,
  defaultRecords,
  maintain,
  riskScore,
  saveRecords,
  severity,
  summaryAlert,
  type ApparatusId,
  type ApparatusRecords,
} from "@/lib/lab/immersive/apparatusLifecycle";

// ─────────────────────────────────────────────────────────────
// Graphics quality tiers
// ─────────────────────────────────────────────────────────────

export type GraphicsQuality = "low" | "medium" | "high";

const QUALITY_CONFIG = {
  low: {
    label: "Low",
    icon: "⚡",
    shadows: false,
    shadowMapSize: 512,
    dpr: 1.0,
    antialias: false,
    precision: "lowp" as const,
    multisampling: 0,
    bloom: false,
    vignette: false,
    contactShadows: false,
    fogFar: 40,
    liquidParticles: 8,
    stationGeomDetail: 10,
  },
  medium: {
    label: "Medium",
    icon: "🔋",
    shadows: true,
    shadowMapSize: 1024,
    dpr: 1.5,
    antialias: false,
    precision: "mediump" as const,
    multisampling: 0,
    bloom: true,
    vignette: false,
    contactShadows: false,
    fogFar: 52,
    liquidParticles: 16,
    stationGeomDetail: 18,
  },
  high: {
    label: "High",
    icon: "🌟",
    shadows: true,
    shadowMapSize: 2048,
    dpr: 2.0,
    antialias: false,
    precision: "mediump" as const,
    multisampling: 0,
    bloom: true,
    vignette: true,
    contactShadows: true,
    fogFar: 60,
    liquidParticles: 24,
    stationGeomDetail: 28,
  },
} satisfies Record<GraphicsQuality, object>;

const KEYMAP = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "interact", keys: ["KeyE"] },
  { name: "run", keys: ["ShiftLeft"] },
] as const;

type KeyName = (typeof KEYMAP)[number]["name"];

type ToolKind = "beaker" | "flask" | "pipette" | "coil" | "slide";

type Grabbable = {
  id: string;
  label: string;
  kind: ToolKind;
  position: [number, number, number];
  color: string;
  mass: number;
  gripOffset: [number, number, number];
  linearFollow: number;
  angularDamping: number;
};

const GRABBABLES: Grabbable[] = [
  { id: "beaker-a", label: "Beaker", kind: "beaker", position: [-7.2, 1.85, -3.4], color: "#a6e0ff", mass: 0.8, gripOffset: [0.18, -0.16, -0.45], linearFollow: 7.2, angularDamping: 4.2 },
  { id: "flask-b", label: "Flask", kind: "flask", position: [-6.4, 1.9, -3.1], color: "#9ae6d0", mass: 0.95, gripOffset: [0.14, -0.2, -0.48], linearFollow: 6.6, angularDamping: 4.6 },
  { id: "pipette-p", label: "Pipette", kind: "pipette", position: [-5.6, 1.92, -3.7], color: "#f5f3ff", mass: 0.45, gripOffset: [0.24, -0.08, -0.58], linearFollow: 8.7, angularDamping: 5.2 },
  { id: "coil-core", label: "Coil Core", kind: "coil", position: [0.4, 1.88, -4.2], color: "#e8b3ff", mass: 1.4, gripOffset: [0.12, -0.24, -0.54], linearFollow: 5.9, angularDamping: 3.7 },
  { id: "slide-tray", label: "Slide Tray", kind: "slide", position: [6.5, 1.83, -3.4], color: "#b3ffd0", mass: 0.65, gripOffset: [0.16, -0.1, -0.5], linearFollow: 7.8, angularDamping: 4.9 },
];

// ── Plain-English alert explanations ──────────────────────────────────────────
function explainAlert(alert: string, studentName?: string): string {
  const name = studentName ? studentName.split(" ")[0] : null;
  const hey = name ? `${name}, ` : "";
  const a = alert.toLowerCase();

  if (a.includes("microscope") && a.includes("instability"))
    return `${hey}the microscope is a bit wobbly right now — it happens when it's been used a lot. Head to the Maintenance Bay on the right side panel and click "Stabilize" for the microscope. Then come back and try again!`;
  if (a.includes("valve") && a.includes("over-rotation"))
    return `${hey}you've opened the burette valve quite far. Too much pressure can cause a leak. Try clicking the valve again to close it a little, or use "Recalibrate" in the Maintenance Bay.`;
  if (a.includes("thermal") && a.includes("instability"))
    return `${hey}the burner is getting very hot — we need to cool it down before it damages the equipment. Click the burner knob to turn the flame lower. Safety first!`;
  if (a.includes("pressure integrity"))
    return `${hey}the burette tube is leaking pressure. First clamp it (click the clamp on the burette), then use "Repair" in the Maintenance Bay on the right.`;
  if (a.includes("electrical") || a.includes("circuit"))
    return `${hey}the circuit connections don't match up. Make sure both socket A and socket B are connected at the same time — an unbalanced circuit can damage the equipment.`;
  if (a.includes("contamination") || a.includes("spill"))
    return `${hey}there's been a small spill! Don't worry — just use "Clean" in the Maintenance Bay on the right panel to clear it up before continuing.`;
  if (a.includes("calibration"))
    return `${hey}the microscope needs fine-tuning to work properly. Go to the Maintenance Bay on the right and click "Recalibrate" for the microscope.`;
  if (a.includes("replace"))
    return `${hey}one of the instruments is too worn to use safely. Go to the Maintenance Bay and choose "Replace" to swap it out with a fresh one.`;
  if (a.includes("workflow completed"))
    return `${hey}maintenance done! The instrument is back to good condition. You can continue your experiment now. 🎉`;
  return `${hey}${alert}`;
}

// ── Which apparatus are relevant per subject ──────────────────────────────────
const SUBJECT_APPARATUS: Record<string, string[]> = {
  chemistry: ["burette", "burner"],
  physics:   ["circuit", "coil"],
  biology:   ["microscope", "slide"],
};

function isApparatusRelevant(subject: Subject, alertText: string): boolean {
  const relevant = SUBJECT_APPARATUS[subject] ?? [];
  // If the alert doesn't mention any apparatus name, allow it through
  const allApparatus = ["microscope", "burette", "burner", "circuit", "coil", "slide"];
  const mentionsAny = allApparatus.some((a) => alertText.toLowerCase().includes(a));
  if (!mentionsAny) return true;
  return relevant.some((a) => alertText.toLowerCase().includes(a));
}
function aiGuide(
  mode: LabModeType,
  subject: Subject,
  proximity: boolean,
  distanceToStation: number,
  events: InteractionEvent[],
  grabbedLabel: string | null,
  transferActive: boolean,
  studentName?: string
): string {
  const name = studentName ? studentName.split(" ")[0] : null;
  const hey = name ? `Hey ${name}! ` : "";
  const hi = name ? `${name}, ` : "";

  if (transferActive)
    return `${hi}nice work! Keep tilting steadily to pour the liquid into the target beaker. Don't rush — slow and steady gives the best results.`;
  if (grabbedLabel)
    return `${hi}you're holding the ${grabbedLabel}. Walk close to the station and look at it — then press E to place or interact with it.`;
  if (!proximity) {
    if (distanceToStation > 12)
      return `${hey}walk toward the glowing ${subject} station — use W/A/S/D keys to move, and move your mouse to look around.`;
    if (distanceToStation > 6)
      return `${hi}you're getting closer! Keep walking toward the glowing ${subject} bay. You'll be able to interact when you're right in front of it.`;
    return `${hi}almost there! Take a few more steps toward the ${subject} station — look for the glowing blue marker right in front of the bench.`;
  }
  // Near station
  if (mode === "guided") {
    const last = events[0]?.message;
    if (last?.toLowerCase().includes("missing"))
      return `${hi}looks like some materials are missing. Look at each item in the Materials Rig panel on the right and click "Load" to add them to the bench.`;
    return `${hey}you're at the ${subject} bay! Look at any instrument and press E to interact with it. Start with loading your materials on the right panel →`;
  }
  if (mode === "exam")
    return `${hi}exam mode — work carefully and press E on each instrument in order. Take your time before each step.`;
  if (mode === "research")
    return `${hi}research mode! Try changing one thing at a time and notice what happens. Record your observations in the Lab Record panel →`;
  return `${hey}you're at the station! Press E while looking at any instrument to use it. Use the panel on the right to load materials.`;
}

function LabRoom({ subject, pulse }: { subject: Subject; pulse: number }) {
  const accent = subject === "chemistry" ? "#1f6fbf" : subject === "physics" ? "#6033bb" : "#0fa87e";
  const wallTint = subject === "chemistry" ? "#0d2340" : subject === "physics" ? "#1a1035" : "#071e1a";
  const stripeColor = subject === "chemistry" ? "#1e5fa0" : subject === "physics" ? "#5030a8" : "#0d8060";
  const edgeGlow = subject === "chemistry" ? "#1a7aff" : subject === "physics" ? "#8855ff" : "#12d4a0";
  const stationColor = subject === "chemistry" ? "#1e3852" : subject === "physics" ? "#261848" : "#0f2e26";

  // Pre-allocate Color objects once — never re-create in render
  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);
  const edgeGlowColor = useMemo(() => new THREE.Color(edgeGlow), [edgeGlow]);

  const blink = 0.55 + Math.sin(pulse * 3.4) * 0.25;
  const flicker = 0.7 + Math.sin(pulse * 5.1) * 0.05;

  // Floor grid lines
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    for (let i = -10; i <= 10; i += 2) {
      lines.push(
        <mesh key={`gx-${i}`} position={[i, 0.005, 0]}><boxGeometry args={[0.03, 0.01, 40]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} transparent opacity={0.35} /></mesh>
      );
      lines.push(
        <mesh key={`gz-${i}`} position={[0, 0.005, i]}><boxGeometry args={[40, 0.01, 0.03]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} transparent opacity={0.35} /></mesh>
      );
    }
    return lines;
  }, [accent]);

  // Poster / safety sign positions on back wall
  const posters = [
    { x: -16, y: 6.5, label: "⚗", sublabel: "SAFETY FIRST" },
    { x: -8, y: 6.5, label: "🧪", sublabel: subject.toUpperCase() + " LAB" },
    { x: 0, y: 6.5, label: "📐", sublabel: "MEASUREMENT" },
    { x: 8, y: 6.5, label: "🔬", sublabel: "OBSERVE" },
    { x: 16, y: 6.5, label: "📋", sublabel: "RECORD" },
  ];

  return (
    <group>
      {/* ── Floor ── */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[48, 0.04, 48]} />
        <meshStandardMaterial color="#0e1a28" roughness={0.18} metalness={0.6} />
      </mesh>
      {/* Floor reflection strip down center aisle */}
      <mesh position={[0, 0.003, 0]}><boxGeometry args={[1.2, 0.005, 40]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.12} transparent opacity={0.18} /></mesh>
      {gridLines}

      {/* ── Walls ── */}
      {/* Back wall with coloured wainscot stripe */}
      <mesh position={[0, 7, -24]} receiveShadow><boxGeometry args={[48, 14, 0.25]} /><meshStandardMaterial color={wallTint} roughness={0.45} /></mesh>
      <mesh position={[0, 1.4, -23.88]}><boxGeometry args={[48, 2.8, 0.08]} /><meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.22} roughness={0.4} /></mesh>
      {/* Front wall */}
      <mesh position={[0, 7, 24]}><boxGeometry args={[48, 14, 0.25]} /><meshStandardMaterial color={wallTint} roughness={0.45} /></mesh>
      <mesh position={[0, 1.4, 23.88]}><boxGeometry args={[48, 2.8, 0.08]} /><meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.15} roughness={0.4} /></mesh>
      {/* Side walls */}
      <mesh position={[24, 7, 0]}><boxGeometry args={[0.25, 14, 48]} /><meshStandardMaterial color={wallTint} roughness={0.45} /></mesh>
      <mesh position={[-24, 7, 0]}><boxGeometry args={[0.25, 14, 48]} /><meshStandardMaterial color={wallTint} roughness={0.45} /></mesh>
      {/* Accent stripe on side walls */}
      <mesh position={[23.88, 1.4, 0]}><boxGeometry args={[0.08, 2.8, 48]} /><meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.18} roughness={0.4} /></mesh>
      <mesh position={[-23.88, 1.4, 0]}><boxGeometry args={[0.08, 2.8, 48]} /><meshStandardMaterial color={stripeColor} emissive={stripeColor} emissiveIntensity={0.18} roughness={0.4} /></mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, 14, 0]}><boxGeometry args={[48, 0.22, 48]} /><meshStandardMaterial color="#060c14" /></mesh>
      {/* Ceiling light panels — 3 rows */}
      {[-10, 0, 10].map((z, ri) =>
        [-8, 8].map((x, ci) => (
          <mesh key={`cpanel-${ri}-${ci}`} position={[x, 13.85, z]}>
            <boxGeometry args={[3.8, 0.08, 1.2]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#d8efff"
              emissiveIntensity={(0.6 + flicker * 0.3) * blink}
            />
          </mesh>
        ))
      )}
      {/* Subject-tint accent ceiling strip */}
      <mesh position={[0, 13.8, -8]}><boxGeometry args={[20, 0.07, 0.3]} /><meshStandardMaterial emissive={accentColor} emissiveIntensity={0.55 + blink * 0.25} color="#0b1018" /></mesh>

      {/* ── Workbenches (stations) ── */}
      {LAB_STATIONS.map((station, i) => {
        const px = station.x * 2.5;
        const pz = station.z * 1.5;
        return (
          <group key={station.id} position={[px, 0, pz]}>
            {/* Bench body */}
            <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
              <boxGeometry args={[4.2, 1.7, 2.3]} />
              <meshStandardMaterial color={stationColor} metalness={0.55} roughness={0.3} />
            </mesh>
            {/* Bench top surface — reflective */}
            <mesh position={[0, 1.71, 0]}>
              <boxGeometry args={[4.2, 0.06, 2.3]} />
              <meshStandardMaterial color="#223346" metalness={0.8} roughness={0.12} />
            </mesh>
            {/* Bench front edge glow strip */}
            <mesh position={[0, 1.71, 1.18]}>
              <boxGeometry args={[4.2, 0.04, 0.04]} />
              <meshStandardMaterial emissive={edgeGlowColor} emissiveIntensity={0.4 + Math.abs(Math.sin(pulse * 2 + i)) * 0.45} color="#0a111e" />
            </mesh>
            {/* Under-bench LED strip */}
            <mesh position={[0, 0.05, 1.0]}>
              <boxGeometry args={[4.0, 0.04, 0.04]} />
              <meshStandardMaterial emissive={edgeGlowColor} emissiveIntensity={0.22} color="#0a111e" transparent opacity={0.8} />
            </mesh>
            {/* Back splashboard */}
            <mesh position={[0, 2.35, -1.1]}>
              <boxGeometry args={[4.2, 1.3, 0.08]} />
              <meshStandardMaterial color={stationColor} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* Station label plate */}
            <mesh position={[0, 2.95, -1.04]}>
              <boxGeometry args={[1.4, 0.22, 0.03]} />
              <meshStandardMaterial emissive={edgeGlowColor} emissiveIntensity={0.5} color="#0d1828" />
            </mesh>
            {/* Overhead task light boom */}
            <mesh position={[0, 3.2, -0.6]}>
              <boxGeometry args={[0.04, 2.8, 0.04]} />
              <meshStandardMaterial color="#3a4d62" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 4.7, 0.1]}>
              <cylinderGeometry args={[0.22, 0.22, 0.07, 20]} />
              <meshStandardMaterial color="#ffffff" emissive="#e0f4ff" emissiveIntensity={0.7 + Math.sin(pulse * 2 + i * 1.3) * 0.1} />
            </mesh>
            {/* Reagent shelf above splashboard */}
            <mesh position={[0, 3.45, -1.1]}>
              <boxGeometry args={[4.2, 0.06, 0.32]} />
              <meshStandardMaterial color="#1a2a3c" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* ── Poster panels on back wall ── */}
      {posters.map((p, i) => (
        <group key={`poster-${i}`} position={[p.x, p.y, -23.7]}>
          <mesh>
            <boxGeometry args={[2.8, 3.6, 0.05]} />
            <meshStandardMaterial color={wallTint} roughness={0.5} />
          </mesh>
          {/* Coloured border */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[2.8, 0.06, 0.04]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[3.6, 0.06, 0.04]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
          </mesh>
          {/* Small glowing dot on each poster */}
          <mesh position={[0, 1.4, 0.04]}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial emissive={accent} emissiveIntensity={1.2 + Math.sin(pulse * 2.4 + i) * 0.4} color={accent} />
          </mesh>
        </group>
      ))}

      {/* ── Monitor screens on side walls ── */}
      {([[-20, 3.2, -10], [-20, 3.2, 0], [-20, 3.2, 10], [20, 3.2, -10], [20, 3.2, 0], [20, 3.2, 10]] as [number,number,number][]).map((pos, i) => (
        <group key={`mon-${i}`} position={pos}>
          <mesh rotation={[0, pos[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <boxGeometry args={[1.6, 1.0, 0.08]} />
            <meshStandardMaterial color="#0d1826" roughness={0.4} />
          </mesh>
          <mesh rotation={[0, pos[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[0, 0, pos[0] < 0 ? 0.045 : -0.045]}>
            <boxGeometry args={[1.45, 0.88, 0.01]} />
            <meshStandardMaterial
              emissive={subject === "chemistry" ? "#0a3a6e" : subject === "physics" ? "#200b52" : "#041f18"}
              emissiveIntensity={0.7 + Math.sin(pulse * 1.8 + i) * 0.2}
              color="#060c14"
            />
          </mesh>
        </group>
      ))}

      {/* ── Cabinet storage units along back wall ── */}
      {([-18, -12, 12, 18] as number[]).map((x, i) => (
        <group key={`cab-${i}`} position={[x, 0, -22.5]}>
          <mesh castShadow position={[0, 2.0, 0]}>
            <boxGeometry args={[3.5, 4.0, 0.9]} />
            <meshStandardMaterial color={subject === "chemistry" ? "#112233" : subject === "physics" ? "#180f30" : "#071a14"} roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Cabinet door lines */}
          {[0.6, -0.6].map((dy, j) => (
            <mesh key={`door-${j}`} position={[0, 2.0 + dy, 0.46]}>
              <boxGeometry args={[3.3, 1.8, 0.04]} />
              <meshStandardMaterial color={wallTint} roughness={0.35} metalness={0.5} />
            </mesh>
          ))}
          {/* Handle */}
          <mesh position={[0.6, 2.0, 0.51]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 10]} />
            <meshStandardMaterial color="#8aa0b8" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* ── Fume hood at back-left corner ── */}
      <group position={[-20, 0, -20]}>
        <mesh position={[0, 2.0, 0]}><boxGeometry args={[3.8, 4.0, 2.4]} /><meshStandardMaterial color={subject === "chemistry" ? "#0e2238" : "#160d2e"} roughness={0.4} metalness={0.3} /></mesh>
        <mesh position={[0, 2.0, 1.21]}><boxGeometry args={[3.6, 3.0, 0.04]} /><meshPhysicalMaterial color="#a8d8ff" transmission={0.7} transparent opacity={0.28} roughness={0.05} /></mesh>
        {/* Fume hood indicator light */}
        <mesh position={[1.5, 3.8, 1.22]}><sphereGeometry args={[0.08, 10, 10]} /><meshStandardMaterial emissive="#00ff88" emissiveIntensity={1.5 + Math.sin(pulse * 4) * 0.3} color="#00ff88" /></mesh>
      </group>

      {/* ── Fire extinguisher near entrance ── */}
      <group position={[22, 0, 6]}>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.14, 0.14, 1.4, 16]} /><meshStandardMaterial color="#cc2200" roughness={0.35} metalness={0.5} /></mesh>
        <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.08, 0.08, 0.18, 12]} /><meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} /></mesh>
      </group>
    </group>
  );
}

function Vessel({ position, fill, reactionLevel, temperatureC, label }: { position: [number, number, number]; fill: number; reactionLevel: number; temperatureC: number; label: string }) {
  const liquidRef = useRef<THREE.Mesh>(null);
  const bubbleRef = useRef<THREE.Points>(null);
  const baseColor = useMemo(() => new THREE.Color("#3bb4ef"), []);
  const hotColor = useMemo(() => new THREE.Color("#ff7e46"), []);
  const bubbles = useMemo(() => {
    const arr = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i += 1) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 0.35;
      arr[i * 3 + 1] = Math.random() * 0.38;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const wobble = 1 + Math.sin(t * 4.2) * 0.02 * (0.4 + reactionLevel);
    if (liquidRef.current) {
      const f = THREE.MathUtils.clamp(fill, 0.02, 0.98);
      liquidRef.current.scale.y = f * wobble;
      liquidRef.current.position.y = position[1] + 0.27 + f * 0.32;
      const mat = liquidRef.current.material as THREE.MeshStandardMaterial;
      const mix = THREE.MathUtils.clamp((temperatureC - 20) / 140, 0, 1);
      mat.color.copy(baseColor).lerp(hotColor, mix * 0.65 + reactionLevel * 0.35);
      mat.emissive.setRGB(0.05 + reactionLevel * 0.25, 0.07 + reactionLevel * 0.1, 0.1 + reactionLevel * 0.05);
    }
    if (bubbleRef.current) {
      bubbleRef.current.rotation.y += 0.007;
      const mat = bubbleRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.12 + reactionLevel * 0.6;
    }
  });

  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[0.34, 0.36, 0.78, 28]} /><meshPhysicalMaterial color="#b8ecff" roughness={0.08} metalness={0.05} transmission={0.95} thickness={0.2} transparent opacity={0.48} /></mesh>
      <mesh ref={liquidRef} position={[0, 0.5, 0]}><cylinderGeometry args={[0.29, 0.31, 0.38, 24]} /><meshStandardMaterial color="#35b8ff" transparent opacity={0.76} emissive="#193550" emissiveIntensity={0.3} /></mesh>
      <points ref={bubbleRef} position={[0, 0.45, 0]}><bufferGeometry><bufferAttribute attach="attributes-position" args={[bubbles, 3]} /></bufferGeometry><pointsMaterial color="#e7fbff" size={0.014} transparent opacity={0.3} depthWrite={false} /></points>
      <Text fontSize={0.11} color="#d7f2ff" position={[0, -0.55, 0]}>{label}</Text>
    </group>
  );
}

function PourStream({ active, source, target }: { active: boolean; source: THREE.Vector3; target: THREE.Vector3 }) {
  const line = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!line.current) return;
    line.current.visible = active;
    if (!active) return;
    const mid = source.clone().add(target).multiplyScalar(0.5);
    line.current.position.copy(mid);
    const dir = target.clone().sub(source);
    const len = dir.length();
    line.current.scale.set(1, len, 1);
    line.current.lookAt(target);
    line.current.rotateX(Math.PI / 2);
  });
  return (
    <mesh ref={line} visible={false}>
      <cylinderGeometry args={[0.025, 0.012, 1, 12]} />
      <meshStandardMaterial color="#79d2ff" emissive="#79d2ff" emissiveIntensity={0.6} transparent opacity={0.75} />
    </mesh>
  );
}

function GrabbableObjects({ highlightedId, grabbedId, onRegister }: { highlightedId: string | null; grabbedId: string | null; onRegister: (id: string, rb: RapierRigidBody | null) => void }) {
  return (
    <>
      {GRABBABLES.map((obj) => {
        const active = grabbedId === obj.id;
        const highlighted = highlightedId === obj.id;
        return (
          <RigidBody key={obj.id} colliders="cuboid" restitution={0.16} friction={0.86} linearDamping={0.7} angularDamping={obj.angularDamping} mass={obj.mass} position={obj.position} ref={(rb) => onRegister(obj.id, rb)} userData={{ grabbableId: obj.id }}>
            <mesh castShadow receiveShadow userData={{ grabbableId: obj.id }}>
              <boxGeometry args={obj.kind === "pipette" ? [0.08, 0.08, 0.42] : [0.24, 0.24, 0.24]} />
              <meshStandardMaterial color={obj.color} emissive={active ? "#8ef5ff" : highlighted ? "#5ec5ff" : "#19314b"} emissiveIntensity={active ? 1.2 : highlighted ? 0.5 : 0.12} roughness={0.28} metalness={0.22} />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

function JointConstraintRigs({
  controls,
}: {
  controls: {
    microscopeFocus: number;
    microscopeFocusTarget: number;
    microscopeStageX: number;
    microscopeStageXTarget: number;
    buretteValve: number;
    buretteValveTarget: number;
    burnerKnob: number;
    burnerKnobTarget: number;
  };
}) {
  const base = useRef<RapierRigidBody>(null!);
  const microFocus = useRef<RapierRigidBody>(null!);
  const microStage = useRef<RapierRigidBody>(null!);
  const buretteBase = useRef<RapierRigidBody>(null!);
  const valveBody = useRef<RapierRigidBody>(null!);
  const burnerBase = useRef<RapierRigidBody>(null!);
  const burnerKnobBody = useRef<RapierRigidBody>(null!);
  const springA = useRef<RapierRigidBody>(null!);
  const springB = useRef<RapierRigidBody>(null!);

  const focusJoint = useRevoluteJoint(base, microFocus, [[0, 0, 0], [0, 0, 0], [0, 0, 1], [-0.65, 0.65]]);
  const stageJoint = usePrismaticJoint(base, microStage, [[0, 0, 0], [0, 0, 0], [1, 0, 0], [-0.35, 0.35]]);
  const valveJoint = useRevoluteJoint(buretteBase, valveBody, [[0, 0, 0], [0, 0, 0], [0, 0, 1], [0, 1.7]]);
  const burnerJoint = useRevoluteJoint(burnerBase, burnerKnobBody, [[0, 0, 0], [0, 0, 0], [0, 1, 0], [0, 1.4]]);
  useFixedJoint(base, buretteBase, [[0, 0, 0], [0, 0, 0, 1], [0, 0, 0], [0, 0, 0, 1]]);
  useSpringJoint(springA, springB, [[0, 0, 0], [0, 0, 0], 0.15, 210, 12]);

  useFrame(() => {
    focusJoint.current?.configureMotorPosition((controls.microscopeFocusTarget - 0.5) * 1.1, 0.85, 0.25);
    stageJoint.current?.configureMotorPosition((controls.microscopeStageXTarget) * 0.3, 0.9, 0.22);
    valveJoint.current?.configureMotorPosition(controls.buretteValveTarget * 1.5, 0.8, 0.24);
    burnerJoint.current?.configureMotorPosition(controls.burnerKnobTarget * 1.2, 0.75, 0.2);
  });

  return (
    <group visible={false}>
      <RigidBody ref={base} type="fixed" position={[6.5, 2.0, -3.2]} />
      <RigidBody ref={microFocus} colliders="ball" type="dynamic" position={[6.8, 2.24, -2.95]} />
      <RigidBody ref={microStage} colliders="cuboid" type="dynamic" position={[6.5, 2.16, -3.18]} />

      <RigidBody ref={buretteBase} type="fixed" position={[-8.3, 2.0, -3.1]} />
      <RigidBody ref={valveBody} colliders="ball" type="dynamic" position={[-8.1, 1.66, -3.1]} />

      <RigidBody ref={burnerBase} type="fixed" position={[-2.0, 1.9, -3.8]} />
      <RigidBody ref={burnerKnobBody} colliders="ball" type="dynamic" position={[-1.78, 1.88, -3.8]} />

      <RigidBody ref={springA} type="fixed" position={[0.5, 2.1, -5.2]} />
      <RigidBody ref={springB} colliders="ball" type="dynamic" position={[0.7, 2.1, -5.2]} />
    </group>
  );
}

function PhysicsLayer({ highlightedId, grabbedId, onRegister, sourceFill, targetFill, reactionLevel, temperatureC, streamActive, streamPoints, jointControls, liquidParticles }: {
  highlightedId: string | null;
  grabbedId: string | null;
  onRegister: (id: string, rb: RapierRigidBody | null) => void;
  sourceFill: number;
  targetFill: number;
  reactionLevel: number;
  temperatureC: number;
  streamActive: boolean;
  streamPoints: { source: THREE.Vector3; target: THREE.Vector3 };
  liquidParticles: number;
  jointControls: {
    microscopeFocus: number;
    microscopeFocusTarget: number;
    microscopeStageX: number;
    microscopeStageXTarget: number;
    buretteValve: number;
    buretteValveTarget: number;
    burnerKnob: number;
    burnerKnobTarget: number;
  };
}) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <RigidBody type="fixed" colliders="cuboid"><mesh position={[0, -0.5, 0]} visible={false}><boxGeometry args={[60, 1, 60]} /><meshBasicMaterial /></mesh></RigidBody>
      <GrabbableObjects highlightedId={highlightedId} grabbedId={grabbedId} onRegister={onRegister} />
      <JointConstraintRigs controls={jointControls} />
      {Array.from({ length: liquidParticles }).map((_, i) => (
        <RigidBody key={`liquid-${i}`} colliders="ball" restitution={0.62} friction={0.18} position={[4 + (i % 4) * 0.22, 2 + Math.floor(i / 4) * 0.18, -4 + (i % 3) * 0.15]}>
          <mesh castShadow><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial emissive="#66d9ff" emissiveIntensity={0.4 + reactionLevel * 0.5} color="#30a0dc" /></mesh>
        </RigidBody>
      ))}
      <Vessel position={[-6.9, 1.95, -3.2]} fill={sourceFill} reactionLevel={reactionLevel} temperatureC={temperatureC} label="Source" />
      <Vessel position={[-5.9, 1.95, -3.2]} fill={targetFill} reactionLevel={reactionLevel * 0.8} temperatureC={temperatureC * 0.95} label="Target" />
      <PourStream active={streamActive} source={streamPoints.source} target={streamPoints.target} />
    </Physics>
  );
}

function StationBeacons({ activeStationId, highlightedStationId }: { activeStationId: string; highlightedStationId: string | null }) {
  return (
    <group>
      {LAB_STATIONS.map((station) => {
        const isActive = station.id === activeStationId;
        const isHighlighted = station.id === highlightedStationId;
        return (
          <group key={station.id} position={[station.x * 2.5, 3.6, station.z * 1.5]}>
            <mesh userData={{ stationId: station.id }}><cylinderGeometry args={[0.55, 0.55, 0.35, 24]} /><meshStandardMaterial color={isActive ? "#44d3ff" : "#6c89aa"} emissive={isHighlighted ? "#9fe7ff" : isActive ? "#2f95d5" : "#1e3048"} emissiveIntensity={isHighlighted ? 1 : isActive ? 0.58 : 0.24} /></mesh>
            <Text fontSize={0.22} color="#dff4ff" anchorX="center" anchorY="middle" position={[0, 0.52, 0]}>{station.name}</Text>
          </group>
        );
      })}
    </group>
  );
}

function MechanicalApparatusRigs({
  pulse,
  controls,
}: {
  pulse: number;
  controls: {
    microscopeFocus: number;
    microscopeTurret: number;
    microscopeStageX: number;
    microscopeStageY: number;
    buretteValve: number;
    buretteClamp: number;
    burnerKnob: number;
    circuitSnapA: number;
    circuitSnapB: number;
  };
}) {
  const focusRef = useRef<THREE.Group>(null);
  const turretRef = useRef<THREE.Group>(null);
  const stageRef = useRef<THREE.Group>(null);
  const valveRef = useRef<THREE.Group>(null);
  const clampRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (focusRef.current) focusRef.current.rotation.x = controls.microscopeFocus * 0.9;
    if (turretRef.current) turretRef.current.rotation.y = controls.microscopeTurret * (Math.PI / 3);
    if (stageRef.current) stageRef.current.position.set(6.5 + controls.microscopeStageX * 0.28, 2.16, -3.18 + controls.microscopeStageY * 0.28);
    if (valveRef.current) valveRef.current.rotation.z = controls.buretteValve * 1.65;
    if (clampRef.current) clampRef.current.position.x = -8.34 + controls.buretteClamp * 0.12;
    if (flameRef.current) {
      const i = controls.burnerKnob;
      flameRef.current.visible = i > 0.03;
      flameRef.current.scale.set(1, 0.2 + i * 1.6 + Math.abs(Math.sin(pulse * 5.8)) * 0.08, 1);
    }
    if (wireRef.current) {
      const connected = controls.circuitSnapA > 0.5 && controls.circuitSnapB > 0.5;
      wireRef.current.visible = connected;
      wireRef.current.rotation.z = Math.sin(pulse * 0.8) * 0.03;
    }
  });

  return (
    <group>
      {/* Microscope rig */}
      <group position={[6.5, 1.9, -3.2]}>
        <mesh castShadow><boxGeometry args={[0.8, 0.12, 0.8]} /><meshStandardMaterial color="#31445e" metalness={0.55} roughness={0.3} /></mesh>
        <group ref={focusRef} userData={{ apparatusPartId: "microscope-focus" }} position={[0.28, 0.24, 0.25]}>
          <mesh><cylinderGeometry args={[0.08, 0.08, 0.06, 20]} /><meshStandardMaterial color="#a7b6c8" metalness={0.8} roughness={0.2} /></mesh>
        </group>
        <group ref={turretRef} userData={{ apparatusPartId: "microscope-turret" }} position={[0, 0.35, 0]}>
          <mesh><cylinderGeometry args={[0.13, 0.13, 0.08, 18]} /><meshStandardMaterial color="#89a2bd" metalness={0.7} roughness={0.24} /></mesh>
        </group>
        <group ref={stageRef} userData={{ apparatusPartId: "microscope-stage" }} position={[0, 0.26, 0]}>
          <mesh><boxGeometry args={[0.46, 0.04, 0.34]} /><meshStandardMaterial color="#192634" metalness={0.5} roughness={0.35} /></mesh>
        </group>
      </group>

      {/* Burette rig */}
      <group position={[-8.3, 2.0, -3.1]}>
        <mesh castShadow><boxGeometry args={[0.1, 1.8, 0.1]} /><meshStandardMaterial color="#6e7e92" metalness={0.75} roughness={0.3} /></mesh>
        <mesh userData={{ apparatusPartId: "burette-pivot" }} position={[0.2, 0.7, 0]}><boxGeometry args={[0.4, 0.08, 0.08]} /><meshStandardMaterial color="#91a6c0" metalness={0.78} roughness={0.24} /></mesh>
        <mesh position={[0.2, 0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 1.2, 16]} /><meshPhysicalMaterial color="#d9f6ff" transmission={0.9} transparent opacity={0.45} roughness={0.05} /></mesh>
        <group ref={clampRef} userData={{ apparatusPartId: "burette-clamp" }} position={[0.2, 0.72, 0]}>
          <mesh><boxGeometry args={[0.08, 0.14, 0.12]} /><meshStandardMaterial color="#7f8ea3" metalness={0.8} roughness={0.2} /></mesh>
        </group>
        <group ref={valveRef} userData={{ apparatusPartId: "burette-valve" }} position={[0.2, -0.34, 0]}>
          <mesh><cylinderGeometry args={[0.05, 0.05, 0.14, 14]} /><meshStandardMaterial color="#d8c498" metalness={0.35} roughness={0.25} /></mesh>
        </group>
      </group>

      {/* Burner rig */}
      <group position={[-2.0, 1.9, -3.8]}>
        <mesh castShadow><cylinderGeometry args={[0.22, 0.28, 0.14, 20]} /><meshStandardMaterial color="#3b4758" metalness={0.7} roughness={0.25} /></mesh>
        <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.06, 0.07, 0.4, 16]} /><meshStandardMaterial color="#69788c" metalness={0.82} roughness={0.18} /></mesh>
        <mesh userData={{ apparatusPartId: "burner-knob" }} position={[0.22, -0.02, 0]}><cylinderGeometry args={[0.04, 0.04, 0.06, 14]} /><meshStandardMaterial color="#c9b48f" metalness={0.4} roughness={0.3} /></mesh>
        <mesh ref={flameRef} position={[0, 0.55, 0]}>
          <coneGeometry args={[0.06, 0.2, 14]} />
          <meshStandardMaterial emissive="#ffad3b" emissiveIntensity={1.4} color="#ffc96a" transparent opacity={0.82} />
        </mesh>
      </group>

      {/* Circuit snap rig */}
      <group position={[0.0, 2.0, -5.2]}>
        <mesh castShadow><boxGeometry args={[1.0, 0.08, 0.6]} /><meshStandardMaterial color="#26384d" metalness={0.55} roughness={0.3} /></mesh>
        <mesh userData={{ apparatusPartId: "circuit-socket-a" }} position={[-0.26, 0.08, 0]}><cylinderGeometry args={[0.05, 0.05, 0.06, 14]} /><meshStandardMaterial color={controls.circuitSnapA > 0.5 ? "#69ffbb" : "#8ca1bd"} emissive={controls.circuitSnapA > 0.5 ? "#36d88f" : "#1f3045"} emissiveIntensity={controls.circuitSnapA > 0.5 ? 1 : 0.3} /></mesh>
        <mesh userData={{ apparatusPartId: "circuit-socket-b" }} position={[0.26, 0.08, 0]}><cylinderGeometry args={[0.05, 0.05, 0.06, 14]} /><meshStandardMaterial color={controls.circuitSnapB > 0.5 ? "#69ffbb" : "#8ca1bd"} emissive={controls.circuitSnapB > 0.5 ? "#36d88f" : "#1f3045"} emissiveIntensity={controls.circuitSnapB > 0.5 ? 1 : 0.3} /></mesh>
        <mesh ref={wireRef} position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.56, 10]} />
          <meshStandardMaterial color="#4b4b4b" metalness={0.2} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function PlayerController({ targetStationId, setNearStation, setHighlightedStationId, grabbedId, setGrabbedId, rigidBodies, setGrabbedLabel, setPlayerState, onApparatusInteract }: {
  targetStationId: string;
  setNearStation: (v: boolean) => void;
  setHighlightedStationId: (id: string | null) => void;
  grabbedId: string | null;
  setGrabbedId: (id: string | null) => void;
  rigidBodies: React.MutableRefObject<Record<string, RapierRigidBody | null>>;
  setGrabbedLabel: (label: string | null) => void;
  setPlayerState: (p: { pos: THREE.Vector3; forwardY: number }) => void;
  onApparatusInteract: (partId: string) => void;
}) {
  const { camera, scene } = useThree();
  const [, getKeys] = useKeyboardControls<KeyName>();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const gripVec = useMemo(() => new THREE.Vector3(), []); // reuse instead of new every frame
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []); // reuse Vector2
  const t = useRef(0);
  const interactLatch = useRef(false);
  const objects = useMemo(() => LAB_STATIONS.map((s) => ({ id: s.id, pos: new THREE.Vector3(s.x * 2.5, 3.0, s.z * 1.5) })), []);

  // Cache interactable mesh list — rebuild only when scene graph changes, not every frame
  const interactMeshes = useRef<THREE.Object3D[]>([]);
  const meshCacheFrame = useRef(0);

  // Throttle refs to avoid calling setPlayerState / setNearStation every single frame
  const lastNear = useRef(false);
  const lastHighlight = useRef<string | null>(null);
  const lastForwardY = useRef(0);
  const lastPosX = useRef(0);
  const lastPosZ = useRef(0);

  useFrame((_, delta) => {
    const keys = getKeys();
    const speed = (keys.run ? 7.5 : 4.1) * delta;

    camera.getWorldDirection(direction);
    const forwardY = direction.y;
    direction.y = 0;
    direction.normalize();
    side.set(-direction.z, 0, direction.x).normalize();

    if (keys.forward) camera.position.addScaledVector(direction, speed);
    if (keys.backward) camera.position.addScaledVector(direction, -speed);
    if (keys.left) camera.position.addScaledVector(side, -speed);
    if (keys.right) camera.position.addScaledVector(side, speed);

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -19, 19);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -19, 19);

    t.current += delta * 7;
    const moving = Boolean(keys.forward || keys.backward || keys.left || keys.right);
    camera.position.y = 3.0 + (moving ? Math.sin(t.current) * 0.022 : 0);

    // Only call setPlayerState when position/direction actually changed (> 0.05 units)
    const dx = Math.abs(camera.position.x - lastPosX.current);
    const dz = Math.abs(camera.position.z - lastPosZ.current);
    const dfy = Math.abs(forwardY - lastForwardY.current);
    if (dx > 0.05 || dz > 0.05 || dfy > 0.02) {
      setPlayerState({ pos: camera.position.clone(), forwardY });
      lastPosX.current = camera.position.x;
      lastPosZ.current = camera.position.z;
      lastForwardY.current = forwardY;
    }

    const target = objects.find((o) => o.id === targetStationId);
    const near = Boolean(target && Math.sqrt(
      Math.pow(camera.position.x - target.pos.x, 2) +
      Math.pow(camera.position.z - target.pos.z, 2)
    ) < 5.5);
    if (near !== lastNear.current) {
      setNearStation(near);
      lastNear.current = near;
    }

    // Rebuild mesh cache every 120 frames (~2 sec) instead of every frame
    meshCacheFrame.current++;
    if (meshCacheFrame.current === 1 || meshCacheFrame.current % 120 === 0) {
      interactMeshes.current = [];
      scene.traverse((o) => {
        if (o.userData?.stationId || o.userData?.grabbableId || o.userData?.apparatusPartId)
          interactMeshes.current.push(o);
      });
    }

    raycaster.setFromCamera(screenCenter, camera); // reuse cached Vector2
    const hit = raycaster.intersectObjects(interactMeshes.current, false)[0]?.object;
    const stationId = (hit?.userData?.stationId as string | undefined) ?? null;
    const grabbableId = (hit?.userData?.grabbableId as string | undefined) ?? null;
    const apparatusPartId = (hit?.userData?.apparatusPartId as string | undefined) ?? null;
    const newHighlight = stationId ?? grabbableId ?? apparatusPartId ?? null;
    if (newHighlight !== lastHighlight.current) {
      setHighlightedStationId(newHighlight);
      lastHighlight.current = newHighlight;
    }

    if (keys.interact && !interactLatch.current) {
      interactLatch.current = true;
      if (grabbedId) {
        const rb = rigidBodies.current[grabbedId];
        rb?.setGravityScale(1, true);
        rb?.setLinearDamping(0.7);
        rb?.setAngularDamping(0.7);
        setGrabbedId(null);
        setGrabbedLabel(null);
      } else if (apparatusPartId) {
        onApparatusInteract(apparatusPartId);
      } else if (grabbableId) {
        const rb = rigidBodies.current[grabbableId];
        const profile = GRABBABLES.find((g) => g.id === grabbableId);
        if (rb && profile) {
          rb.setGravityScale(0, true);
          rb.setLinearDamping(2.7);
          rb.setAngularDamping(profile.angularDamping);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
          setGrabbedId(grabbableId);
          setGrabbedLabel(profile.label);
        }
      }
    }
    if (!keys.interact && interactLatch.current) interactLatch.current = false;

    if (grabbedId) {
      const rb = rigidBodies.current[grabbedId];
      const profile = GRABBABLES.find((g) => g.id === grabbedId);
      if (rb && profile) {
        camera.getWorldDirection(direction);
        targetPos.copy(camera.position)
          .add(direction.multiplyScalar(Math.abs(profile.gripOffset[2]) + 0.75));
        gripVec.set(profile.gripOffset[0], profile.gripOffset[1], 0); // reuse, no allocation
        targetPos.add(gripVec);
        const cur = rb.translation();
        tmp.set(targetPos.x - cur.x, targetPos.y - cur.y, targetPos.z - cur.z);
        rb.setLinvel({ x: tmp.x * profile.linearFollow, y: tmp.y * profile.linearFollow, z: tmp.z * profile.linearFollow }, true);
        rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  });

  return <PointerLockControls />;
}

function useLabAudio(playerPos: THREE.Vector3, reactionLevel: number) {
  // Use refs so the audio loop always sees latest values WITHOUT re-creating the context
  const playerPosRef = useRef(playerPos);
  const reactionRef = useRef(reactionLevel);
  useEffect(() => { playerPosRef.current = playerPos; });
  useEffect(() => { reactionRef.current = reactionLevel; });

  useEffect(() => {
    // Create AudioContext once on mount only
    let ctx: AudioContext | null = null;
    let raf = 0;
    let humGain: GainNode;
    let ventGain: GainNode;
    let reactGain: GainNode;
    let hum: OscillatorNode;
    let vent: OscillatorNode;
    let react: OscillatorNode;

    const init = async () => {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      hum = ctx.createOscillator();
      vent = ctx.createOscillator();
      react = ctx.createOscillator();
      humGain = ctx.createGain();
      ventGain = ctx.createGain();
      reactGain = ctx.createGain();

      hum.type = "sine";
      hum.frequency.value = 74;
      vent.type = "triangle";
      vent.frequency.value = 142;
      react.type = "sawtooth";
      react.frequency.value = 196;

      humGain.gain.value = 0.03;
      ventGain.gain.value = 0.02;
      reactGain.gain.value = 0;

      hum.connect(humGain).connect(ctx.destination);
      vent.connect(ventGain).connect(ctx.destination);
      react.connect(reactGain).connect(ctx.destination);

      hum.start();
      vent.start();
      react.start();

      const loop = () => {
        // Read latest values from refs — no re-mount needed
        const distCenter = Math.min(1, playerPosRef.current.length() / 22);
        humGain.gain.value = 0.025 + (1 - distCenter) * 0.02;
        ventGain.gain.value = 0.018 + Math.abs(Math.sin(performance.now() * 0.0012)) * 0.01;
        reactGain.gain.value = 0.01 + reactionRef.current * 0.06;
        react.frequency.value = 196 + reactionRef.current * 60;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    init();

    return () => {
      cancelAnimationFrame(raf);
      try { hum?.stop(); vent?.stop(); react?.stop(); } catch {}
      ctx?.close();
    };
  }, []); // ← empty deps: create once, never re-create
}

export default function ImmersiveLabExperience({ subject, mode, experiment, onRunResult, runtime, setRuntime, eventFeed, lastOutcome, studentName }: {
  subject: Subject;
  mode: LabModeType;
  experiment: Experiment;
  onRunResult: () => void;
  runtime: ExperimentRuntime;
  setRuntime: React.Dispatch<React.SetStateAction<ExperimentRuntime>>;
  eventFeed: InteractionEvent[];
  lastOutcome: ExperimentOutcome | null;
  studentName?: string;
}) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [nearStation, setNearStation] = useState(false);
  const [highlightedStationId, setHighlightedStationId] = useState<string | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [grabbedLabel, setGrabbedLabel] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [reactionLevel, setReactionLevel] = useState(0);
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 3.0, 7));
  const [forwardY, setForwardY] = useState(0);
  const [sourceFill, setSourceFill] = useState(0.62);
  const [targetFill, setTargetFill] = useState(0.22);
  const [spill, setSpill] = useState(0);

  // ── Graphics quality ──────────────────────────────────────────────────────
  const [quality, setQuality] = useState<GraphicsQuality>("medium");
  const qc = QUALITY_CONFIG[quality];
  const [apparatusState, setApparatusState] = useState<Record<string, ApparatusState>>({
    microscope: "idle",
    burette: "mounted",
    burner: "idle",
    circuit: "idle",
  });
  const [apparatusHealth, setApparatusHealth] = useState({
    wear: 1,
    calibration: 1,
    pressureIntegrity: 1,
    thermalStress: 0,
    electricalStability: 1,
    contamination: 0,
    structuralStability: 1,
  });
  const [mechanicalAlerts, setMechanicalAlerts] = useState<string[]>([]);
  const [records, setRecords] = useState<ApparatusRecords>(() => loadRecords());
  const [selectedMaintenance, setSelectedMaintenance] = useState<ApparatusId>("microscope");
  const [mechanics, setMechanics] = useState({
    microscopeFocus: 0.2,
    microscopeFocusTarget: 0.2,
    microscopeTurret: 0,
    microscopeTurretTarget: 0,
    microscopeStageX: 0,
    microscopeStageXTarget: 0,
    microscopeStageY: 0,
    microscopeStageYTarget: 0,
    buretteValve: 0,
    buretteValveTarget: 0,
    buretteClamp: 1,
    buretteClampTarget: 1,
    burnerKnob: 0,
    burnerKnobTarget: 0,
    circuitSnapA: 0,
    circuitSnapATarget: 0,
    circuitSnapB: 0,
    circuitSnapBTarget: 0,
  });
  const rigidBodies = useRef<Record<string, RapierRigidBody | null>>({});

  const station = useMemo(() => stationForSubject(subject), [subject]);
  const transferActive = Boolean(grabbedId && (grabbedId === "beaker-a" || grabbedId === "flask-b") && forwardY < -0.22 && sourceFill > 0.03);

  const distanceToStation = useMemo(() => {
    const stationPos = new THREE.Vector3(station.x * 2.5, 1.2, station.z * 1.5);
    return playerPos.distanceTo(stationPos);
  }, [playerPos, station]);

  const stationAngleDeg = useMemo(() => {
    const dx = station.x * 2.5 - playerPos.x;
    const dz = station.z * 1.5 - playerPos.z;
    return (Math.atan2(dx, -dz) * 180) / Math.PI;
  }, [playerPos, station]);

  const guideText = useMemo(() => {
    // Only surface equipment alerts once the student is already at the station.
    // While they're still navigating, always show movement/navigation guidance.
    if (nearStation && mechanicalAlerts.length)
      return explainAlert(mechanicalAlerts[0], studentName);
    return aiGuide(mode, subject, nearStation, distanceToStation, eventFeed, grabbedLabel, transferActive, studentName);
  }, [mode, subject, nearStation, distanceToStation, eventFeed, grabbedLabel, transferActive, mechanicalAlerts, studentName]);

  useLabAudio(playerPos, reactionLevel);

  useEffect(() => {
    setRuntime(getDefaultRuntime());
    setMechanicalAlerts([]);
  }, [subject, experiment.id, setRuntime]);

  useEffect(() => {
    if (!lastOutcome) return;
    setReactionLevel(lastOutcome.success ? 1 : 0.45);
  }, [lastOutcome]);

  useEffect(() => {
    // Always start fresh — don't let persisted wear from old sessions
    // fire scary alerts before the student has done anything.
    setRecords(defaultRecords());
  }, []);

  useEffect(() => {
    const handler = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", handler);
    return () => document.removeEventListener("pointerlockchange", handler);
  }, []);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  // Frame counter for throttling heavy state updates
  const loopFrame = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      loopFrame.current++;
      setPulse((p) => p + 0.016);
      setReactionLevel((r) => Math.max(0, r - 0.008));
      setMechanics((m) => ({
        ...m,
        microscopeFocus: dampTo(m.microscopeFocus, m.microscopeFocusTarget, APPARATUS_PROFILES.microscope.joints[0].damping),
        microscopeTurret: dampTo(m.microscopeTurret, m.microscopeTurretTarget, APPARATUS_PROFILES.microscope.joints[1].damping),
        microscopeStageX: dampTo(m.microscopeStageX, m.microscopeStageXTarget, APPARATUS_PROFILES.microscope.joints[2].damping),
        microscopeStageY: dampTo(m.microscopeStageY, m.microscopeStageYTarget, APPARATUS_PROFILES.microscope.joints[3].damping),
        buretteValve: dampTo(m.buretteValve, m.buretteValveTarget, APPARATUS_PROFILES.burette.joints[0].damping),
        buretteClamp: dampTo(m.buretteClamp, m.buretteClampTarget, APPARATUS_PROFILES.burette.joints[1].damping),
        burnerKnob: dampTo(m.burnerKnob, m.burnerKnobTarget, APPARATUS_PROFILES.burner.joints[0].damping),
        circuitSnapA: dampTo(m.circuitSnapA, m.circuitSnapATarget, APPARATUS_PROFILES.circuit.joints[0].damping),
        circuitSnapB: dampTo(m.circuitSnapB, m.circuitSnapBTarget, APPARATUS_PROFILES.circuit.joints[1].damping),
      }));

      // Throttle health/records updates to every 10 frames (~6×/sec) — reduces React render pressure
      if (loopFrame.current % 10 === 0) {
        setApparatusHealth((h) => {
          const next = { ...h };
          if (mechanics.burnerKnobTarget > 0.86) {
            next.thermalStress = Math.min(1, next.thermalStress + 0.06);
            next.wear = Math.min(1, next.wear + 0.012);
          } else {
            next.thermalStress = Math.max(0, next.thermalStress - 0.03);
          }
          if (mechanics.buretteValveTarget > 0.82 && mechanics.buretteClampTarget < 0.5) {
            next.pressureIntegrity = Math.max(0, next.pressureIntegrity - 0.065);
          }
          if (mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget) {
            next.electricalStability = Math.max(0, next.electricalStability - 0.04);
          }
          if (spill > 0.15) next.contamination = Math.min(1, next.contamination + 0.04);
          if (grabbedId && Math.abs(forwardY) > 0.88) next.structuralStability = Math.max(0, next.structuralStability - 0.03);
          return next;
        });

        setRecords((prev) => {
          let next = { ...prev };
          next.microscope = applyStress(next.microscope, {
            wear: 0.0035,
            calibrationDrift: 0.0045 + Math.abs(mechanics.microscopeFocusTarget - mechanics.microscopeFocus) * 0.006,
            structural: grabbedId === "slide-tray" ? 0.005 : 0,
          });
          next.burette = applyStress(next.burette, {
            wear: 0.004,
            pressure: mechanics.buretteValveTarget > 0.82 && mechanics.buretteClampTarget < 0.5 ? 0.04 : 0.005,
            sealLoss: mechanics.buretteValveTarget > 0.9 ? 0.015 : 0,
            contamination: spill > 0.12 ? 0.022 : 0,
          });
          next.burner = applyStress(next.burner, {
            wear: mechanics.burnerKnobTarget > 0.65 ? 0.012 : 0.003,
            thermal: mechanics.burnerKnobTarget > 0.86 ? 0.045 : 0.006,
            structural: mechanics.burnerKnobTarget > 0.95 ? 0.015 : 0,
          });
          next.circuit = applyStress(next.circuit, {
            wear: 0.0025,
            electrical: mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget ? 0.042 : 0.004,
            connectorLoss: mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget ? 0.018 : 0.002,
          });
          return next;
        });
      }

      if (transferActive) {
        const transferRate = 0.0032 + Math.abs(forwardY) * 0.0025;
        const spillRate = Math.max(0, Math.abs(forwardY) - 0.55) * 0.002;
        setSourceFill((v) => Math.max(0, v - transferRate - spillRate));
        setTargetFill((v) => Math.min(0.95, v + transferRate * 0.88));
        setSpill((v) => Math.min(1, v + spillRate));
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [transferActive, forwardY, mechanics, grabbedId, spill]);

  const sourcePoint = useMemo(() => new THREE.Vector3(-6.9, 2.1, -3.2), []);
  const targetPoint = useMemo(() => new THREE.Vector3(-5.9, 2.1, -3.2), []);

  const performMaintenance = (action: "repair" | "recalibrate" | "clean" | "stabilize" | "replace") => {
    setRecords((prev) => ({
      ...prev,
      [selectedMaintenance]: maintain(prev[selectedMaintenance], action),
    }));
    setMechanicalAlerts((a) => [`${selectedMaintenance} ${action} workflow completed.`, ...a].slice(0, 4));
  };

  const handleApparatusInteract = (partId: string) => {
    setMechanics((m) => {
      if (partId === "microscope-focus") {
        const j = APPARATUS_PROFILES.microscope.joints[0];
        const next = stepJoint(m.microscopeFocusTarget, j, 1);
        setApparatusState((s) => ({ ...s, microscope: "active" }));
        return { ...m, microscopeFocusTarget: next >= j.max ? j.min : next };
      }
      if (partId === "microscope-turret") {
        const j = APPARATUS_PROFILES.microscope.joints[1];
        const next = clampJoint((m.microscopeTurretTarget + 1) % 3, j);
        setApparatusState((s) => ({ ...s, microscope: "aligned" }));
        return { ...m, microscopeTurretTarget: next };
      }
      if (partId === "microscope-stage") {
        const jx = APPARATUS_PROFILES.microscope.joints[2];
        const jy = APPARATUS_PROFILES.microscope.joints[3];
        const nx = m.microscopeStageXTarget >= jx.max ? jx.min : stepJoint(m.microscopeStageXTarget, jx, 1);
        const ny = m.microscopeStageYTarget <= jy.min ? jy.max : stepJoint(m.microscopeStageYTarget, jy, -1);
        return { ...m, microscopeStageXTarget: nx, microscopeStageYTarget: ny };
      }
      if (partId === "burette-valve") {
        const j = APPARATUS_PROFILES.burette.joints[0];
        const next = stepJoint(m.buretteValveTarget, j, 1);
        setApparatusState((s) => ({ ...s, burette: next > 0.7 ? "pressurized" : "active" }));
        if (next > 0.9) setMechanicalAlerts((a) => ["Valve near over-rotation threshold. Pressure risk rising.", ...a].slice(0, 4));
        return { ...m, buretteValveTarget: next >= j.max ? j.min : next };
      }
      if (partId === "burette-clamp") {
        const locked = m.buretteClampTarget > 0.5 ? 0 : 1;
        setApparatusState((s) => ({ ...s, burette: locked ? "locked" : "mounted" }));
        return { ...m, buretteClampTarget: locked };
      }
      if (partId === "burner-knob") {
        const j = APPARATUS_PROFILES.burner.joints[0];
        const next = stepJoint(m.burnerKnobTarget, j, 1);
        const value = next >= j.max ? j.min : next;
        setApparatusState((s) => ({ ...s, burner: value > 0.65 ? "heated" : value > 0.05 ? "active" : "idle" }));
        setReactionLevel((r) => Math.max(r, value * 0.6));
        if (value > 0.9) setMechanicalAlerts((a) => ["Burner overdrive detected. Thermal stress increasing.", ...a].slice(0, 4));
        return { ...m, burnerKnobTarget: value };
      }
      if (partId === "circuit-socket-a") {
        const next = m.circuitSnapATarget > 0.5 ? 0 : 1;
        const state: ApparatusState = next && m.circuitSnapBTarget > 0.5 ? "active" : "aligned";
        setApparatusState((s) => ({ ...s, circuit: state }));
        if (next !== m.circuitSnapBTarget) setMechanicalAlerts((a) => isApparatusRelevant(subject, "circuit") ? ["Circuit polarity/continuity mismatch. Connector fault risk.", ...a].slice(0, 4) : a);
        return { ...m, circuitSnapATarget: next };
      }
      if (partId === "circuit-socket-b") {
        const next = m.circuitSnapBTarget > 0.5 ? 0 : 1;
        const state: ApparatusState = next && m.circuitSnapATarget > 0.5 ? "active" : "aligned";
        setApparatusState((s) => ({ ...s, circuit: state }));
        if (next !== m.circuitSnapATarget) setMechanicalAlerts((a) => isApparatusRelevant(subject, "circuit") ? ["Circuit polarity/continuity mismatch. Connector fault risk.", ...a].slice(0, 4) : a);
        return { ...m, circuitSnapBTarget: next };
      }
      return m;
    });
  };

  useEffect(() => {
    if (apparatusHealth.pressureIntegrity < 0.35 && isApparatusRelevant(subject, "burette")) {
      setApparatusState((s) => ({ ...s, burette: "malfunctioning" }));
      setMechanicalAlerts((a) => ["Burette pressure integrity critical. Clamp and valve recalibration required.", ...a].slice(0, 4));
      setReactionLevel((r) => Math.max(r, 0.8));
    }
    if (apparatusHealth.thermalStress > 0.8 && isApparatusRelevant(subject, "burner")) {
      setApparatusState((s) => ({ ...s, burner: "unstable" }));
      setMechanicalAlerts((a) => ["Thermal instability detected. Reduce flame to avoid apparatus damage.", ...a].slice(0, 4));
      setReactionLevel((r) => Math.max(r, 0.75));
    }
    if (apparatusHealth.electricalStability < 0.4 && isApparatusRelevant(subject, "circuit")) {
      setApparatusState((s) => ({ ...s, circuit: "malfunctioning" }));
      setMechanicalAlerts((a) => ["Electrical stability degraded. Re-seat connectors and verify polarity.", ...a].slice(0, 4));
    }
  }, [apparatusHealth]);

  useEffect(() => {
    const all = Object.values(records);
    const avg = (fn: (r: (typeof all)[number]) => number) => all.reduce((sum, r) => sum + fn(r), 0) / all.length;
    setApparatusHealth({
      wear: avg((r) => r.wear),
      calibration: avg((r) => r.calibration),
      pressureIntegrity: avg((r) => r.sealIntegrity),
      thermalStress: avg((r) => r.thermalFatigue),
      electricalStability: avg((r) => 1 - r.electricalFatigue),
      contamination: avg((r) => r.contamination),
      structuralStability: avg((r) => 1 - r.structuralStress),
    });
    const alert = summaryAlert(records);
    if (alert && isApparatusRelevant(subject, alert)) {
      setMechanicalAlerts((a) => [alert, ...a].slice(0, 4));
    }
    const emergency = Math.max(...all.map((r) => severity(r.stage)));
    if (emergency > 0.55) {
      setReactionLevel((r) => Math.max(r, 0.45 + emergency * 0.5));
    }
  }, [records]);

  // ── FOV auto-zoom: lerp FOV toward 52 when near station, 70 when roaming ──
  const fovRef = useRef(72);
  function FovController({ near, grabbed }: { near: boolean; grabbed: string | null }) {
    const { camera } = useThree();
    useFrame((_, delta) => {
      const targetFov = near ? (grabbed ? 52 : 58) : 72;
      fovRef.current = THREE.MathUtils.lerp(fovRef.current, targetFov, delta * 3.5);
      (camera as THREE.PerspectiveCamera).fov = fovRef.current;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    });
    return null;
  }

  return (
    <div ref={canvasContainerRef} style={{ position: "relative", height: 560, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(118,172,212,0.3)", background: "#040812" }}>
      <KeyboardControls map={KEYMAP as unknown as { name: string; keys: string[] }[]}>
        <Canvas
          shadows={qc.shadows}
          camera={{ position: [0, 3.0, 7], fov: 70 }}
          gl={{
            antialias: qc.antialias,
            powerPreference: "high-performance",
            precision: qc.precision,
          }}
          dpr={Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, qc.dpr)}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
          }}
        >
          <color attach="background" args={["#030712"]} />
          <fog attach="fog" args={["#07101d", 15 - reactionLevel * 4, qc.fogFar - reactionLevel * 8]} />
          <ambientLight intensity={0.65} />

          {/* Main overhead directional — soft top-down like a lab skylight */}
          <directionalLight
            position={[0, 14, 0]}
            intensity={1.4}
            castShadow={qc.shadows}
            shadow-mapSize-width={qc.shadowMapSize}
            shadow-mapSize-height={qc.shadowMapSize}
            shadow-camera-near={0.5}
            shadow-camera-far={60}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />

          {/* Ceiling fluorescent panel lights — 4 panels matching room geometry */}
          <pointLight position={[-9,  12, -9]}  intensity={3.2} distance={22} decay={2} color="#d6eeff" />
          <pointLight position={[ 9,  12, -9]}  intensity={3.2} distance={22} decay={2} color="#d6eeff" />
          <pointLight position={[-9,  12,  9]}  intensity={3.2} distance={22} decay={2} color="#d6eeff" />
          <pointLight position={[ 9,  12,  9]}  intensity={3.2} distance={22} decay={2} color="#d6eeff" />

          {/* Workbench spotlights — aimed down at the active station benches */}
          <spotLight position={[-7, 7, -3.5]} angle={0.45} penumbra={0.4} intensity={4.5} distance={14} decay={2} color="#e8f4ff" castShadow={false} target-position={[-7, 0, -3.5]} />
          <spotLight position={[ 0, 7, -4.5]} angle={0.45} penumbra={0.4} intensity={4.5} distance={14} decay={2} color="#e8f4ff" castShadow={false} target-position={[ 0, 0, -4.5]} />
          <spotLight position={[ 6.5, 7, -3.5]} angle={0.45} penumbra={0.4} intensity={4.5} distance={14} decay={2} color="#e8f4ff" castShadow={false} target-position={[6.5, 0, -3.5]} />

          {/* Subject-tint accent — chemistry blue, physics purple, biology teal */}
          <pointLight position={[-8, 3.6, -10]} intensity={1.8 + reactionLevel * 0.9} color={subject === "chemistry" ? "#3ca8ff" : subject === "physics" ? "#8c5dff" : "#23d1af"} />

          {/* Reaction glow — intensifies during active experiment */}
          <pointLight position={[-7.2, 2.2, -3.2]} intensity={0.4 + reactionLevel * 2.6} color="#ff9f54" />

          <FovController near={nearStation} grabbed={grabbedId} />

          <Suspense fallback={null}>
            <LabRoom subject={subject} pulse={pulse} />
            <PhysicsLayer
              highlightedId={highlightedStationId}
              grabbedId={grabbedId}
              onRegister={(id, rb) => { rigidBodies.current[id] = rb; }}
              sourceFill={sourceFill}
              targetFill={targetFill}
              reactionLevel={reactionLevel}
              temperatureC={runtime.temperatureC}
              streamActive={transferActive}
              streamPoints={{ source: sourcePoint, target: targetPoint }}
              liquidParticles={qc.liquidParticles}
              jointControls={{
                microscopeFocus: mechanics.microscopeFocus,
                microscopeFocusTarget: mechanics.microscopeFocusTarget,
                microscopeStageX: mechanics.microscopeStageX,
                microscopeStageXTarget: mechanics.microscopeStageXTarget,
                buretteValve: mechanics.buretteValve,
                buretteValveTarget: mechanics.buretteValveTarget,
                burnerKnob: mechanics.burnerKnob,
                burnerKnobTarget: mechanics.burnerKnobTarget,
              }}
            />
            <MechanicalApparatusRigs pulse={pulse} controls={mechanics} />
            <StationBeacons activeStationId={station.id} highlightedStationId={highlightedStationId} />
            <PlayerController
              targetStationId={station.id}
              setNearStation={setNearStation}
              setHighlightedStationId={setHighlightedStationId}
              grabbedId={grabbedId}
              setGrabbedId={setGrabbedId}
              rigidBodies={rigidBodies}
              setGrabbedLabel={setGrabbedLabel}
              setPlayerState={(p) => {
                setPlayerPos(p.pos);
                setForwardY(p.forwardY);
              }}
              onApparatusInteract={handleApparatusInteract}
            />
            <Environment preset="city" />
          </Suspense>

          <EffectComposer multisampling={qc.multisampling}>
            <Bloom
              intensity={qc.bloom ? 0.45 + reactionLevel * 0.5 : 0}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.22}
            />
            <Vignette
              eskil={false}
              offset={qc.vignette ? 0.18 : 0}
              darkness={qc.vignette ? 0.45 : 0}
            />
          </EffectComposer>

          {qc.contactShadows ? (
            <ContactShadows position={[0, -0.01, 0]} scale={42} opacity={0.42} blur={2.7} far={16} />
          ) : null}
        </Canvas>
      </KeyboardControls>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* ── Click-to-start overlay — shown until pointer lock is acquired ── */}
        {!pointerLocked && (
          <div
            onClick={() => {
              const canvas = canvasContainerRef.current?.querySelector("canvas");
              canvas?.requestPointerLock();
            }}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(3,7,18,0.82)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", pointerEvents: "auto",
              backdropFilter: "blur(5px)",
              zIndex: 10,
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🔬</div>
            <div style={{ color: "#cce8ff", fontWeight: 800, fontSize: 22, marginBottom: 6, letterSpacing: "0.02em" }}>
              {experiment.title}
            </div>
            <div style={{ color: "#88b8d8", fontSize: 13, marginBottom: 22 }}>
              {experiment.description}
            </div>

            {/* Step-by-step card */}
            <div style={{
              background: "rgba(8,22,46,0.75)", border: "1px solid rgba(80,160,255,0.25)",
              borderRadius: 14, padding: "16px 24px", marginBottom: 22, maxWidth: 400,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {[
                { icon: "1️⃣", text: "Click anywhere to enter the lab" },
                { icon: "2️⃣", text: "Use W A S D keys to walk toward the glowing station" },
                { icon: "3️⃣", text: "Look around with your mouse" },
                { icon: "4️⃣", text: "Stand in front of any instrument and press E to use it" },
                { icon: "5️⃣", text: "The AI guide on the top-left will tell you what to do next" },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: "flex", alignItems: "center", gap: 12, color: "#b8d8f8", fontSize: 13 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: "linear-gradient(90deg, rgba(41,149,255,0.9), rgba(33,201,167,0.9))",
              color: "#fff", fontWeight: 700, fontSize: 15,
              padding: "12px 36px", borderRadius: 12,
              boxShadow: "0 0 24px rgba(40,160,255,0.35)",
              letterSpacing: "0.04em",
            }}>
              ▶ Click to Start
            </div>
            <div style={{ color: "rgba(120,170,220,0.5)", fontSize: 11, marginTop: 10 }}>
              Press Esc at any time to exit the lab view
            </div>
          </div>
        )}

        {/* ── Re-lock banner — shown when pointer lock is lost mid-session ── */}
        {!pointerLocked && (
          <div
            onClick={() => { const c = canvasContainerRef.current?.querySelector("canvas"); c?.requestPointerLock(); }}
            style={{
              position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
              background: "rgba(3,7,18,0.88)", border: "1px solid rgba(255,200,80,0.5)",
              borderRadius: 10, padding: "7px 18px", color: "#ffe599", fontSize: 12,
              fontWeight: 600, cursor: "pointer", pointerEvents: "auto",
              letterSpacing: "0.04em", backdropFilter: "blur(4px)",
              boxShadow: "0 0 16px rgba(255,180,50,0.2)",
              display: "flex", alignItems: "center", gap: 8,
              zIndex: 5,
            }}
          >
            <span>🖱</span> Click here to re-enter the lab and use keys
          </div>
        )}

        {/* ── Crosshair ── */}
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 14, height: 14, transform: `translate(-50%, -50%) translateY(${Math.sin(pulse * 2.6) * 0.6}px)`, border: `1px solid ${nearStation ? "#8ff8cc" : grabbedId ? "#ffd59f" : "#87b7df"}`, borderRadius: "50%", boxShadow: nearStation ? "0 0 18px rgba(143,248,204,0.6)" : grabbedId ? "0 0 18px rgba(255,213,159,0.6)" : "0 0 14px rgba(135,183,223,0.4)" }} />
        {/* Press E hint when near station and not yet interacting */}
        {nearStation && !grabbedId && (
          <div style={{ position: "absolute", left: "50%", top: "calc(50% + 22px)", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(143,248,204,0.5)", borderRadius: 6, padding: "3px 10px", color: "#8ff8cc", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
            Press E to interact
          </div>
        )}

        {/* ── GUIDE PANEL (top-left) ── */}
        <div style={{
          position: "absolute", left: 12, top: 10,
          background: "linear-gradient(135deg, rgba(5,18,36,0.92), rgba(8,24,46,0.88))",
          border: `1px solid ${mechanicalAlerts.length > 0 ? "rgba(255,180,80,0.55)" : nearStation ? "rgba(80,220,160,0.45)" : "rgba(80,150,220,0.38)"}`,
          padding: "12px 14px", borderRadius: 14,
          color: "#daf0ff", maxWidth: 330,
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          backdropFilter: "blur(6px)",
          boxShadow: mechanicalAlerts.length > 0
            ? "0 0 18px rgba(255,160,50,0.18)"
            : nearStation
              ? "0 0 18px rgba(50,220,140,0.12)"
              : "0 0 14px rgba(50,120,200,0.12)",
        }}>
          {/* Avatar + name row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: mechanicalAlerts.length > 0
                ? "linear-gradient(135deg,#ff9940,#ff5500)"
                : nearStation
                  ? "linear-gradient(135deg,#20d48a,#0099dd)"
                  : "linear-gradient(135deg,#3a8fe8,#6e40e0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
              boxShadow: "0 0 8px rgba(100,200,255,0.3)",
            }}>
              {mechanicalAlerts.length > 0 ? "⚠" : nearStation ? "🔬" : "🧭"}
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7, lineHeight: 1 }}>
                Lab Assistant
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: nearStation ? "#7eeac0" : "#88caff", lineHeight: 1.2, marginTop: 2 }}>
                {studentName
                  ? `Guiding ${studentName.split(" ")[0]}`
                  : "Guiding You"}
              </div>
            </div>
          </div>

          {/* Guide message */}
          <div style={{
            fontSize: 12.5, lineHeight: 1.55,
            color: mechanicalAlerts.length > 0 ? "#ffe0b0" : "#daf0ff",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8, padding: "8px 10px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {guideText}
          </div>

          {/* Quick tips strip */}
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "W/A/S/D", label: "Move" },
              { key: "Mouse", label: "Look" },
              { key: "E", label: "Interact" },
              { key: "Shift", label: "Sprint" },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, opacity: 0.65 }}>
                <span style={{ background: "rgba(120,170,214,0.22)", border: "1px solid rgba(120,170,214,0.4)", borderRadius: 4, padding: "1px 5px", fontWeight: 700, color: "#b0d4f0" }}>{key}</span>
                <span style={{ color: "#90b8d8" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── DIRECTION COMPASS / WAYPOINT ARROW (top-center) ── */}
        {!nearStation && (
          <div style={{
            position: "absolute", left: "50%", top: 12,
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            pointerEvents: "none",
          }}>
            {/* Arrow SVG rotated toward station */}
            <div style={{
              transform: `rotate(${stationAngleDeg}deg)`,
              transition: "transform 0.3s ease",
              filter: "drop-shadow(0 0 8px rgba(100,200,255,0.7))",
            }}>
              <svg width="28" height="36" viewBox="0 0 28 36">
                <polygon points="14,2 26,28 14,22 2,28" fill="#4ec9ff" fillOpacity="0.92" />
                <polygon points="14,2 26,28 14,22 2,28" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.5" />
              </svg>
            </div>
            {/* Distance label */}
            <div style={{
              background: "rgba(5,18,36,0.82)", border: "1px solid rgba(80,180,255,0.4)",
              borderRadius: 8, padding: "3px 10px",
              color: "#89d4ff", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
            }}>
              {station.name} · {Math.round(distanceToStation)}m away
            </div>
          </div>
        )}
        {nearStation && (
          <div style={{
            position: "absolute", left: "50%", top: 12,
            transform: "translateX(-50%)",
            background: "rgba(5,26,18,0.88)",
            border: "1px solid rgba(80,220,150,0.55)",
            borderRadius: 10, padding: "5px 14px",
            color: "#5aedb8", fontSize: 12, fontWeight: 700,
            letterSpacing: "0.08em",
            backdropFilter: "blur(4px)",
            boxShadow: "0 0 14px rgba(60,210,130,0.2)",
          }}>
            ✓ At {station.name}
          </div>
        )}

        {/* ── STATUS PANEL (top-right) — clean, student-friendly ── */}
        <div style={{
          position: "absolute", right: 12, top: 10,
          background: "linear-gradient(135deg, rgba(5,14,28,0.9), rgba(8,20,40,0.85))",
          border: "1px solid rgba(80,140,200,0.32)",
          padding: "10px 13px", borderRadius: 12, color: "#c8e8ff", fontSize: 11,
          backdropFilter: "blur(6px)", minWidth: 180,
        }}>
          <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.55, marginBottom: 8 }}>Experiment Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 10px", alignItems: "center" }}>
            <span style={{ opacity: 0.6 }}>Mode</span>
            <span style={{ fontWeight: 700, color: mode === "exam" ? "#ffca60" : mode === "research" ? "#c080ff" : "#60c8ff", textTransform: "capitalize" }}>{mode}</span>
            <span style={{ opacity: 0.6 }}>Station</span>
            <span style={{ fontWeight: 600 }}>{station.name}</span>
            <span style={{ opacity: 0.6 }}>Status</span>
            <span style={{ color: nearStation ? "#5aedb8" : "#88aacc", fontWeight: 600 }}>{nearStation ? "● Ready to use" : "○ Walk closer"}</span>
          </div>
          {/* Reaction progress — shown only when active */}
          {reactionLevel > 0.05 && (
            <div style={{ marginTop: 9, borderTop: "1px solid rgba(120,170,214,0.15)", paddingTop: 8 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Reaction progress</div>
              <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${reactionLevel * 100}%`, background: reactionLevel > 0.7 ? "#ff6060" : reactionLevel > 0.35 ? "#ffb040" : "#40d4a0", borderRadius: 4, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, opacity: 0.65, textAlign: "right", marginTop: 3 }}>{Math.round(reactionLevel * 100)}%</div>
            </div>
          )}
        </div>

        {/* ── EQUIPMENT HELP PANEL — only shown when there is an active alert ── */}
        {mechanicalAlerts.length > 0 && (
          <div style={{
            position: "absolute", right: 12, top: 218,
            background: "linear-gradient(135deg, rgba(28,12,4,0.94), rgba(40,18,6,0.9))",
            border: "1px solid rgba(255,160,60,0.45)",
            padding: "10px 13px", borderRadius: 12, color: "#ffe8c0", fontSize: 11,
            width: 226, pointerEvents: "auto",
            backdropFilter: "blur(6px)",
            boxShadow: "0 0 16px rgba(255,140,40,0.15)",
          }}>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.65, marginBottom: 7 }}>🔧 Fix Equipment</div>
            {/* Which instrument needs attention */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 8 }}>
              {(["microscope", "burette", "burner", "circuit"] as ApparatusId[]).filter((id) => riskScore(records[id]) > 0.25).map((id) => {
                const risk = riskScore(records[id]);
                const riskColor = risk > 0.6 ? "#ff8060" : "#ffb840";
                return (
                  <button key={id} onClick={() => setSelectedMaintenance(id)} style={{
                    padding: "6px 8px", borderRadius: 8,
                    border: `1px solid ${selectedMaintenance === id ? "rgba(255,180,80,0.7)" : "rgba(255,140,50,0.3)"}`,
                    background: selectedMaintenance === id ? "rgba(80,40,10,0.6)" : "rgba(30,12,4,0.7)",
                    color: selectedMaintenance === id ? "#ffd090" : "#c89060",
                    fontSize: 11, cursor: "pointer", textTransform: "capitalize",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                  }}>
                    <span style={{ fontWeight: 700 }}>{id}</span>
                    <span style={{ fontSize: 9, color: riskColor }}>⚠ needs fix</span>
                  </button>
                );
              })}
            </div>
            {/* One-tap fix actions — simple labels */}
            <div style={{ fontSize: 10, color: "#c8a070", marginBottom: 5 }}>Tap to fix <strong style={{ color: "#ffd080" }}>{selectedMaintenance}</strong>:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {([
                { action: "repair" as const, label: "🔧 Repair", desc: "Fix damage" },
                { action: "recalibrate" as const, label: "🎯 Recalibrate", desc: "Fine-tune" },
                { action: "clean" as const, label: "🧹 Clean", desc: "Remove spills" },
                { action: "stabilize" as const, label: "⚖ Stabilize", desc: "Stop shaking" },
                { action: "replace" as const, label: "🆕 Replace", desc: "Brand new" },
              ]).map(({ action, label, desc }) => (
                <button key={action} onClick={() => performMaintenance(action)} title={desc} style={{
                  padding: "5px 8px", borderRadius: 7,
                  border: "1px solid rgba(255,160,60,0.35)",
                  background: "rgba(40,16,4,0.85)",
                  color: "#ffcc88", fontSize: 10.5, cursor: "pointer",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── BOTTOM ACTION BAR ── */}
        <div style={{ position: "absolute", left: "50%", bottom: 50, transform: "translateX(-50%)", display: "flex", gap: 8, pointerEvents: "auto" }}>
          <button
            onClick={onRunResult}
            disabled={!nearStation}
            style={{
              padding: "10px 18px", borderRadius: 12,
              border: nearStation ? "1px solid rgba(80,220,160,0.5)" : "1px solid rgba(80,120,160,0.3)",
              background: nearStation ? "linear-gradient(90deg, rgba(41,149,255,0.88), rgba(33,201,167,0.88))" : "rgba(60,80,100,0.4)",
              color: "#fff", fontWeight: 700, cursor: nearStation ? "pointer" : "not-allowed",
              fontSize: 13, letterSpacing: "0.04em",
              boxShadow: nearStation ? "0 0 20px rgba(40,200,140,0.25)" : "none",
              transition: "all 0.2s",
            }}
          >
            {nearStation ? "▶ Execute Experiment" : "Walk to station first"}
          </button>
          <button
            onClick={() => { setRuntime(getDefaultRuntime()); setSourceFill(0.62); setTargetFill(0.22); setSpill(0); }}
            style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(80,140,200,0.35)", background: "rgba(10,24,48,0.8)", color: "#c0dcf0", fontWeight: 600, cursor: "pointer", fontSize: 12 }}
          >
            ↺ Reset Rig
          </button>
        </div>

        {/* ── GRAPHICS QUALITY ── */}
        <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 5, pointerEvents: "auto", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(140,180,220,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2 }}>Quality</span>
          {(["low", "medium", "high"] as GraphicsQuality[]).map((q) => {
            const cfg = QUALITY_CONFIG[q];
            const active = quality === q;
            return (
              <button
                key={q}
                onClick={() => setQuality(q)}
                style={{
                  padding: "5px 9px", borderRadius: 8,
                  border: `1px solid ${active ? "rgba(100,190,255,0.7)" : "rgba(80,130,180,0.3)"}`,
                  background: active ? "rgba(30,100,200,0.45)" : "rgba(5,14,28,0.72)",
                  color: active ? "#e0f0ff" : "rgba(140,180,220,0.55)",
                  fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
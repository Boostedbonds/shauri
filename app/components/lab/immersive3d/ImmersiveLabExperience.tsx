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
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
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
  maintain,
  riskScore,
  saveRecords,
  severity,
  summaryAlert,
  type ApparatusId,
  type ApparatusRecords,
} from "@/lib/lab/immersive/apparatusLifecycle";

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
  { id: "beaker-a", label: "Beaker", kind: "beaker", position: [-7.2, 2.5, -3.4], color: "#a6e0ff", mass: 0.8, gripOffset: [0.18, -0.16, -0.45], linearFollow: 7.2, angularDamping: 4.2 },
  { id: "flask-b", label: "Flask", kind: "flask", position: [-6.4, 2.8, -3.1], color: "#9ae6d0", mass: 0.95, gripOffset: [0.14, -0.2, -0.48], linearFollow: 6.6, angularDamping: 4.6 },
  { id: "pipette-p", label: "Pipette", kind: "pipette", position: [-5.6, 2.86, -3.7], color: "#f5f3ff", mass: 0.45, gripOffset: [0.24, -0.08, -0.58], linearFollow: 8.7, angularDamping: 5.2 },
  { id: "coil-core", label: "Coil Core", kind: "coil", position: [0.4, 2.6, -4.2], color: "#e8b3ff", mass: 1.4, gripOffset: [0.12, -0.24, -0.54], linearFollow: 5.9, angularDamping: 3.7 },
  { id: "slide-tray", label: "Slide Tray", kind: "slide", position: [6.5, 2.45, -3.4], color: "#b3ffd0", mass: 0.65, gripOffset: [0.16, -0.1, -0.5], linearFollow: 7.8, angularDamping: 4.9 },
];

function aiGuide(
  mode: LabModeType,
  subject: Subject,
  proximity: boolean,
  events: InteractionEvent[],
  grabbedLabel: string | null,
  transferActive: boolean
): string {
  const last = events[0]?.message;
  if (!proximity) return `Approach the ${subject} station to unlock contextual guidance and active tools.`;
  if (transferActive) return "Liquid transfer in progress. Maintain tilt and hold steady to avoid spill loss.";
  if (grabbedLabel) return `Stabilize ${grabbedLabel} using grip alignment before placement or activation.`;
  if (last?.toLowerCase().includes("unsafe")) return "Safety warning detected. Stabilize thermal/electrical state before continuing.";
  if (last?.toLowerCase().includes("missing")) return "Critical materials missing. Stage required apparatus and reagents first.";
  if (mode === "exam") return "Exam mode active. Execute controlled actions with minimal retries.";
  if (mode === "research") return "Research mode active. Vary one variable per run and track visual phase changes.";
  return "Proceed with controlled setup. Use reticle + E to interact with physical instruments.";
}

function LabRoom({ subject, pulse }: { subject: Subject; pulse: number }) {
  const tint = subject === "chemistry" ? "#1f4f78" : subject === "physics" ? "#3f2f7a" : "#1a675f";
  const blink = 0.55 + Math.sin(pulse * 3.4) * 0.25;
  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[48, 0.04, 48]} />
        <meshStandardMaterial color="#142233" roughness={0.25} metalness={0.45} />
      </mesh>
      <mesh position={[0, 7, -24]} receiveShadow><boxGeometry args={[48, 14, 0.2]} /><meshStandardMaterial color="#0e1623" roughness={0.55} /></mesh>
      <mesh position={[0, 7, 24]} receiveShadow><boxGeometry args={[48, 14, 0.2]} /><meshStandardMaterial color="#0e1623" roughness={0.55} /></mesh>
      <mesh position={[24, 7, 0]} receiveShadow><boxGeometry args={[0.2, 14, 48]} /><meshStandardMaterial color="#0b1320" roughness={0.52} /></mesh>
      <mesh position={[-24, 7, 0]} receiveShadow><boxGeometry args={[0.2, 14, 48]} /><meshStandardMaterial color="#0b1320" roughness={0.52} /></mesh>
      <mesh position={[0, 14, 0]}><boxGeometry args={[48, 0.2, 48]} /><meshStandardMaterial color="#070b12" /></mesh>
      <mesh position={[0, 13.8, 0]}><boxGeometry args={[18, 0.1, 4]} /><meshStandardMaterial emissive={new THREE.Color(tint)} emissiveIntensity={0.45 + blink * 0.2} color="#0b1018" /></mesh>
      {LAB_STATIONS.map((station, i) => (
        <group key={station.id} position={[station.x * 2.5, 0, station.z * 1.5]}>
          <mesh castShadow receiveShadow position={[0, 0.85, 0]}><boxGeometry args={[4.2, 1.7, 2.3]} /><meshStandardMaterial color="#2f3f54" metalness={0.45} roughness={0.36} /></mesh>
          <mesh position={[0, 1.9, 0]}><boxGeometry args={[1.4, 0.05, 1.4]} /><meshStandardMaterial emissive={new THREE.Color(tint)} emissiveIntensity={0.2 + Math.abs(Math.sin(pulse * 2 + i)) * 0.35} color="#1a2435" /></mesh>
        </group>
      ))}
      {[[-11, 3.1, -18.6], [11, 3.1, -18.6], [-11, 3.1, 18.6], [11, 3.1, 18.6]].map((p, i) => (
        <mesh key={`screen-${i}`} position={p as [number, number, number]}><boxGeometry args={[1.2, 0.7, 0.07]} /><meshStandardMaterial emissive="#6ed4ff" emissiveIntensity={0.5 + Math.sin(pulse * 2.6 + i) * 0.2} color="#0d2333" /></mesh>
      ))}
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

function PhysicsLayer({ highlightedId, grabbedId, onRegister, sourceFill, targetFill, reactionLevel, temperatureC, streamActive, streamPoints, jointControls }: {
  highlightedId: string | null;
  grabbedId: string | null;
  onRegister: (id: string, rb: RapierRigidBody | null) => void;
  sourceFill: number;
  targetFill: number;
  reactionLevel: number;
  temperatureC: number;
  streamActive: boolean;
  streamPoints: { source: THREE.Vector3; target: THREE.Vector3 };
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
      {Array.from({ length: 24 }).map((_, i) => (
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
          <group key={station.id} position={[station.x * 2.5, 2.75, station.z * 1.5]}>
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
  const t = useRef(0);
  const interactLatch = useRef(false);
  const objects = useMemo(() => LAB_STATIONS.map((s) => ({ id: s.id, pos: new THREE.Vector3(s.x * 2.5, 1.2, s.z * 1.5) })), []);

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
    camera.position.y = 1.68 + (moving ? Math.sin(t.current) * 0.02 : 0);

    setPlayerState({ pos: camera.position.clone(), forwardY });

    const target = objects.find((o) => o.id === targetStationId);
    setNearStation(Boolean(target && camera.position.distanceTo(target.pos) < 4.8));

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const meshes: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.userData?.stationId || o.userData?.grabbableId || o.userData?.apparatusPartId) meshes.push(o);
    });

    const hit = raycaster.intersectObjects(meshes, false)[0]?.object;
    const stationId = (hit?.userData?.stationId as string | undefined) ?? null;
    const grabbableId = (hit?.userData?.grabbableId as string | undefined) ?? null;
    const apparatusPartId = (hit?.userData?.apparatusPartId as string | undefined) ?? null;
    setHighlightedStationId(stationId ?? grabbableId ?? apparatusPartId ?? null);

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
          .add(direction.multiplyScalar(Math.abs(profile.gripOffset[2]) + 0.75))
          .add(new THREE.Vector3(profile.gripOffset[0], profile.gripOffset[1], 0));
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
  useEffect(() => {
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
        const distCenter = Math.min(1, playerPos.length() / 22);
        humGain.gain.value = 0.025 + (1 - distCenter) * 0.02;
        ventGain.gain.value = 0.018 + Math.abs(Math.sin(performance.now() * 0.0012)) * 0.01;
        reactGain.gain.value = 0.01 + reactionLevel * 0.06;
        react.frequency.value = 196 + reactionLevel * 60;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    init();

    return () => {
      cancelAnimationFrame(raf);
      try {
        hum?.stop();
        vent?.stop();
        react?.stop();
      } catch {}
      ctx?.close();
    };
  }, [playerPos, reactionLevel]);
}

export default function ImmersiveLabExperience({ subject, mode, experiment, onRunResult, runtime, setRuntime, eventFeed, lastOutcome }: {
  subject: Subject;
  mode: LabModeType;
  experiment: Experiment;
  onRunResult: () => void;
  runtime: ExperimentRuntime;
  setRuntime: React.Dispatch<React.SetStateAction<ExperimentRuntime>>;
  eventFeed: InteractionEvent[];
  lastOutcome: ExperimentOutcome | null;
}) {
  const [nearStation, setNearStation] = useState(false);
  const [highlightedStationId, setHighlightedStationId] = useState<string | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [grabbedLabel, setGrabbedLabel] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [reactionLevel, setReactionLevel] = useState(0);
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 1.7, 7));
  const [forwardY, setForwardY] = useState(0);
  const [sourceFill, setSourceFill] = useState(0.62);
  const [targetFill, setTargetFill] = useState(0.22);
  const [spill, setSpill] = useState(0);
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
  const guideText = useMemo(() => {
    if (mechanicalAlerts.length) return mechanicalAlerts[0];
    return aiGuide(mode, subject, nearStation, eventFeed, grabbedLabel, transferActive);
  }, [mode, subject, nearStation, eventFeed, grabbedLabel, transferActive, mechanicalAlerts]);

  useLabAudio(playerPos, reactionLevel);

  useEffect(() => {
    setRuntime(getDefaultRuntime());
  }, [subject, experiment.id, setRuntime]);

  useEffect(() => {
    if (!lastOutcome) return;
    setReactionLevel(lastOutcome.success ? 1 : 0.45);
  }, [lastOutcome]);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
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
      setApparatusHealth((h) => {
        const next = { ...h };
        if (mechanics.burnerKnobTarget > 0.86) {
          next.thermalStress = Math.min(1, next.thermalStress + 0.006);
          next.wear = Math.min(1, next.wear + 0.0012);
        } else {
          next.thermalStress = Math.max(0, next.thermalStress - 0.003);
        }
        if (mechanics.buretteValveTarget > 0.82 && mechanics.buretteClampTarget < 0.5) {
          next.pressureIntegrity = Math.max(0, next.pressureIntegrity - 0.0065);
        }
        if (mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget) {
          next.electricalStability = Math.max(0, next.electricalStability - 0.004);
        }
        if (spill > 0.15) next.contamination = Math.min(1, next.contamination + 0.004);
        if (grabbedId && Math.abs(forwardY) > 0.88) next.structuralStability = Math.max(0, next.structuralStability - 0.003);
        return next;
      });

      setRecords((prev) => {
        let next = { ...prev };
        next.microscope = applyStress(next.microscope, {
          wear: 0.00035,
          calibrationDrift: 0.00045 + Math.abs(mechanics.microscopeFocusTarget - mechanics.microscopeFocus) * 0.0006,
          structural: grabbedId === "slide-tray" ? 0.0005 : 0,
        });
        next.burette = applyStress(next.burette, {
          wear: 0.0004,
          pressure: mechanics.buretteValveTarget > 0.82 && mechanics.buretteClampTarget < 0.5 ? 0.004 : 0.0005,
          sealLoss: mechanics.buretteValveTarget > 0.9 ? 0.0015 : 0,
          contamination: spill > 0.12 ? 0.0022 : 0,
        });
        next.burner = applyStress(next.burner, {
          wear: mechanics.burnerKnobTarget > 0.65 ? 0.0012 : 0.0003,
          thermal: mechanics.burnerKnobTarget > 0.86 ? 0.0045 : 0.0006,
          structural: mechanics.burnerKnobTarget > 0.95 ? 0.0015 : 0,
        });
        next.circuit = applyStress(next.circuit, {
          wear: 0.00025,
          electrical: mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget ? 0.0042 : 0.0004,
          connectorLoss: mechanics.circuitSnapATarget !== mechanics.circuitSnapBTarget ? 0.0018 : 0.0002,
        });
        return next;
      });

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

  const sourcePoint = useMemo(() => new THREE.Vector3(-6.9, 2.8, -3.2), []);
  const targetPoint = useMemo(() => new THREE.Vector3(-5.9, 2.8, -3.2), []);

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
        if (next !== m.circuitSnapBTarget) setMechanicalAlerts((a) => ["Circuit polarity/continuity mismatch. Connector fault risk.", ...a].slice(0, 4));
        return { ...m, circuitSnapATarget: next };
      }
      if (partId === "circuit-socket-b") {
        const next = m.circuitSnapBTarget > 0.5 ? 0 : 1;
        const state: ApparatusState = next && m.circuitSnapATarget > 0.5 ? "active" : "aligned";
        setApparatusState((s) => ({ ...s, circuit: state }));
        if (next !== m.circuitSnapATarget) setMechanicalAlerts((a) => ["Circuit polarity/continuity mismatch. Connector fault risk.", ...a].slice(0, 4));
        return { ...m, circuitSnapBTarget: next };
      }
      return m;
    });
  };

  useEffect(() => {
    if (apparatusHealth.pressureIntegrity < 0.35) {
      setApparatusState((s) => ({ ...s, burette: "malfunctioning" }));
      setMechanicalAlerts((a) => ["Burette pressure integrity critical. Clamp and valve recalibration required.", ...a].slice(0, 4));
      setReactionLevel((r) => Math.max(r, 0.8));
    }
    if (apparatusHealth.thermalStress > 0.8) {
      setApparatusState((s) => ({ ...s, burner: "unstable" }));
      setMechanicalAlerts((a) => ["Thermal instability detected. Reduce flame to avoid apparatus damage.", ...a].slice(0, 4));
      setReactionLevel((r) => Math.max(r, 0.75));
    }
    if (apparatusHealth.electricalStability < 0.4) {
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
    if (alert) {
      setMechanicalAlerts((a) => [alert, ...a].slice(0, 4));
    }
    const emergency = Math.max(...all.map((r) => severity(r.stage)));
    if (emergency > 0.55) {
      setReactionLevel((r) => Math.max(r, 0.45 + emergency * 0.5));
    }
  }, [records]);

  return (
    <div style={{ position: "relative", height: 560, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(118,172,212,0.3)", background: "#040812" }}>
      <KeyboardControls map={KEYMAP as unknown as { name: string; keys: string[] }[]}>
        <Canvas shadows camera={{ position: [0, 1.7, 7], fov: 70 }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; }}>
          <color attach="background" args={["#030712"]} />
          <fog attach="fog" args={["#07101d", 15 - reactionLevel * 4, 60 - reactionLevel * 8]} />
          <ambientLight intensity={0.32} />
          <directionalLight position={[8, 11, 3]} intensity={1.15} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <pointLight position={[-8, 3.6, -10]} intensity={1.8 + reactionLevel * 0.9} color={subject === "chemistry" ? "#3ca8ff" : subject === "physics" ? "#8c5dff" : "#23d1af"} />
          <pointLight position={[-7.2, 2.8, -3.2]} intensity={0.4 + reactionLevel * 2.6} color="#ff9f54" />

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

          <EffectComposer multisampling={4}>
            <Bloom intensity={0.45 + reactionLevel * 0.5} luminanceThreshold={0.3} luminanceSmoothing={0.22} />
            <DepthOfField focusDistance={0.018} focalLength={0.018} bokehScale={1.4} height={360} />
            <Noise opacity={0.03} blendFunction={BlendFunction.SOFT_LIGHT} />
            <ChromaticAberration offset={new THREE.Vector2(0.00025 + reactionLevel * 0.0005, 0.00025 + reactionLevel * 0.0005)} />
            <Vignette eskil={false} offset={0.18} darkness={0.45} />
          </EffectComposer>

          <ContactShadows position={[0, -0.01, 0]} scale={42} opacity={0.42} blur={2.7} far={16} />
        </Canvas>
      </KeyboardControls>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 14, height: 14, transform: `translate(-50%, -50%) translateY(${Math.sin(pulse * 2.6) * 0.6}px)`, border: `1px solid ${nearStation ? "#8ff8cc" : grabbedId ? "#ffd59f" : "#87b7df"}`, borderRadius: "50%", boxShadow: nearStation ? "0 0 18px rgba(143,248,204,0.6)" : grabbedId ? "0 0 18px rgba(255,213,159,0.6)" : "0 0 14px rgba(135,183,223,0.4)" }} />

        <div style={{ position: "absolute", left: 12, top: 10, background: "rgba(5,13,24,0.78)", border: "1px solid rgba(120,170,214,0.35)", padding: "9px 10px", borderRadius: 10, color: "#daf0ff", maxWidth: 360 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.82 }}>AI Scientist</div>
          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>{guideText}</div>
          {mechanicalAlerts.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#ffc9a8" }}>
              Alert: {mechanicalAlerts[0]}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", right: 12, top: 10, background: "rgba(5,13,24,0.78)", border: "1px solid rgba(120,170,214,0.35)", padding: "9px 10px", borderRadius: 10, color: "#daf0ff", fontSize: 11 }}>
          <div>Mode: {mode}</div>
          <div>Station: {station.name}</div>
          <div>Status: {nearStation ? "Interactive" : "Navigate closer"}</div>
          <div>Reaction intensity: {Math.round(reactionLevel * 100)}%</div>
          <div>Source: {Math.round(sourceFill * 100)}% | Target: {Math.round(targetFill * 100)}%</div>
          <div>Spill loss: {Math.round(spill * 100)}%</div>
          <div>Microscope: {apparatusState.microscope}</div>
          <div>Burette: {apparatusState.burette}</div>
          <div>Burner: {apparatusState.burner}</div>
          <div>Circuit: {apparatusState.circuit}</div>
          <div style={{ marginTop: 4, opacity: 0.85 }}>Wear {Math.round(apparatusHealth.wear * 100)}% | Pressure {Math.round(apparatusHealth.pressureIntegrity * 100)}% | Thermal {Math.round(apparatusHealth.thermalStress * 100)}%</div>
          <div style={{ opacity: 0.85 }}>Electrical {Math.round(apparatusHealth.electricalStability * 100)}% | Structural {Math.round(apparatusHealth.structuralStability * 100)}% | Contamination {Math.round(apparatusHealth.contamination * 100)}%</div>
        </div>

        <div style={{ position: "absolute", right: 12, top: 188, background: "rgba(5,13,24,0.82)", border: "1px solid rgba(120,170,214,0.35)", padding: "9px 10px", borderRadius: 10, color: "#daf0ff", fontSize: 11, width: 280, pointerEvents: "auto" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.82, marginBottom: 6 }}>Maintenance Bay</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            {(["microscope", "burette", "burner", "circuit"] as ApparatusId[]).map((id) => (
              <button
                key={id}
                onClick={() => setSelectedMaintenance(id)}
                style={{
                  padding: "6px 7px",
                  borderRadius: 8,
                  border: "1px solid rgba(120,170,214,0.38)",
                  background: selectedMaintenance === id ? "rgba(69,146,230,0.35)" : "rgba(10,24,38,0.68)",
                  color: "#def2ff",
                  fontSize: 11,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {id}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 6, opacity: 0.86 }}>Stage: {records[selectedMaintenance].stage} | Risk {Math.round(riskScore(records[selectedMaintenance]) * 100)}%</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {(["repair", "recalibrate", "clean", "stabilize", "replace"] as const).map((action) => (
              <button
                key={action}
                onClick={() => performMaintenance(action)}
                style={{
                  padding: "6px 7px",
                  borderRadius: 8,
                  border: "1px solid rgba(120,170,214,0.38)",
                  background: "rgba(10,24,38,0.75)",
                  color: "#def2ff",
                  fontSize: 10,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", display: "flex", gap: 8, pointerEvents: "auto" }}>
          <button onClick={onRunResult} disabled={!nearStation} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(120,170,214,0.4)", background: nearStation ? "linear-gradient(90deg, rgba(41,149,255,0.85), rgba(33,201,167,0.85))" : "rgba(92,108,126,0.5)", color: "#fff", fontWeight: 700, cursor: nearStation ? "pointer" : "not-allowed" }}>Execute Experiment</button>
          <button onClick={() => { setRuntime(getDefaultRuntime()); setSourceFill(0.62); setTargetFill(0.22); setSpill(0); }} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(120,170,214,0.4)", background: "rgba(17,36,58,0.8)", color: "#d8efff", fontWeight: 600, cursor: "pointer" }}>Reset Rig</button>
        </div>

        <div style={{ position: "absolute", right: 12, bottom: 12, background: "rgba(5,13,24,0.76)", border: "1px solid rgba(120,170,214,0.35)", padding: "8px 10px", borderRadius: 10, color: "#daf0ff", fontSize: 11 }}>
          WASD move | mouse look | Shift sprint | E grab/release | tilt down to pour
        </div>
      </div>
    </div>
  );
}

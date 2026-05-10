"use client";

// ============================================================
// /components/lab/DiagramViewer.tsx — SHAURI Premium Redesign
// All SVG drawings preserved exactly. UI wrapper elevated.
// ============================================================

import React from "react";
import type { DiagramConfig } from "@/lib/lab/types";

// ── All original SVG components preserved exactly ───────────

function LitmusTestSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      <rect x="60" y="180" width="280" height="80" rx="6" fill="#f8f8f0" stroke="#ccc" strokeWidth="2" />
      <text x="200" y="275" textAnchor="middle" fontSize="11" fill="#888">White Tile</text>
      <rect x="100" y="155" width="60" height="30" rx="3" fill="#e85d5d" stroke="#c94040" strokeWidth="1.5" />
      <text x="130" y="148" textAnchor="middle" fontSize="10" fill="#c94040">Red Litmus</text>
      <rect x="240" y="155" width="60" height="30" rx="3" fill="#5d7fe8" stroke="#3a5ec9" strokeWidth="1.5" />
      <text x="270" y="148" textAnchor="middle" fontSize="10" fill="#3a5ec9">Blue Litmus</text>
      <ellipse cx="130" cy="80" rx="12" ry="20" fill="#d0eaff" stroke="#5a9fd4" strokeWidth="1.5" />
      <rect x="124" y="98" width="12" height="40" rx="3" fill="#5a9fd4" />
      <text x="130" y="55" textAnchor="middle" fontSize="10" fill="#2c6fa8">Dropper (HCl)</text>
      <ellipse cx="270" cy="80" rx="12" ry="20" fill="#ffe0d0" stroke="#d47a5a" strokeWidth="1.5" />
      <rect x="264" y="98" width="12" height="40" rx="3" fill="#d47a5a" />
      <text x="270" y="55" textAnchor="middle" fontSize="10" fill="#a84a2c">Dropper (NaOH)</text>
      <ellipse cx="130" cy="142" rx="4" ry="5" fill="#5a9fd4" opacity="0.7" />
      <ellipse cx="270" cy="142" rx="4" ry="5" fill="#d47a5a" opacity="0.7" />
    </svg>
  );
}

function TitrationSVG() {
  return (
    <svg viewBox="0 0 300 380" className="w-full h-full">
      <rect x="130" y="20" width="40" height="160" rx="4" fill="#cceeff" stroke="#5aabdd" strokeWidth="2" />
      <text x="150" y="14" textAnchor="middle" fontSize="11" fill="#2c7da0">Burette (HCl)</text>
      <rect x="132" y="22" width="36" height="80" rx="2" fill="#aaddff" opacity="0.7" />
      <rect x="120" y="175" width="60" height="10" rx="3" fill="#888" />
      <text x="188" y="183" fontSize="9" fill="#555">Stopcock</text>
      <line x1="150" y1="185" x2="150" y2="215" stroke="#5aabdd" strokeWidth="3" />
      <ellipse cx="150" cy="220" rx="4" ry="5" fill="#5aabdd" opacity="0.8" />
      <polygon points="120,240 180,240 200,310 100,310" fill="#fff5cc" stroke="#c8a800" strokeWidth="2" />
      <rect x="130" y="226" width="40" height="18" rx="4" fill="#fff5cc" stroke="#c8a800" strokeWidth="2" />
      <polygon points="122,285 178,285 195,308 105,308" fill="#ffb3d9" opacity="0.5" />
      <text x="150" y="298" textAnchor="middle" fontSize="9" fill="#c0006a">NaOH + Indicator</text>
      <rect x="85" y="310" width="130" height="18" rx="4" fill="#f0f0e8" stroke="#ccc" strokeWidth="1.5" />
      <text x="150" y="322" textAnchor="middle" fontSize="9" fill="#888">White Tile</text>
      <rect x="60" y="20" width="8" height="300" rx="2" fill="#aaa" />
      <rect x="50" y="316" width="200" height="8" rx="2" fill="#999" />
    </svg>
  );
}

function DisplacementSVG() {
  return (
    <svg viewBox="0 0 260 340" className="w-full h-full">
      <path d="M100,40 L100,240 Q100,270 130,270 Q160,270 160,240 L160,40 Z" fill="#cceeff" stroke="#5aabdd" strokeWidth="2.5" />
      <path d="M102,130 L102,240 Q102,268 130,268 Q158,268 158,240 L158,130 Z" fill="#4da6e8" opacity="0.6" />
      <ellipse cx="118" cy="255" rx="10" ry="6" fill="#b8b8b8" stroke="#888" strokeWidth="1" />
      <ellipse cx="140" cy="260" rx="8" ry="5" fill="#b8b8b8" stroke="#888" strokeWidth="1" />
      <ellipse cx="130" cy="250" rx="9" ry="5" fill="#b8b8b8" stroke="#888" strokeWidth="1" />
      <ellipse cx="120" cy="253" rx="6" ry="3" fill="#b87333" opacity="0.7" />
      <ellipse cx="142" cy="258" rx="5" ry="3" fill="#b87333" opacity="0.7" />
      <text x="130" y="30" textAnchor="middle" fontSize="11" fill="#2c7da0">Test Tube</text>
      <text x="195" y="175" fontSize="10" fill="#1a5fa8">Blue CuSO₄</text>
      <line x1="162" y1="170" x2="190" y2="170" stroke="#aaa" strokeWidth="1" strokeDasharray="4,2" />
      <text x="195" y="258" fontSize="10" fill="#8B4513">Cu deposit</text>
      <line x1="162" y1="255" x2="192" y2="255" stroke="#aaa" strokeWidth="1" strokeDasharray="4,2" />
      <text x="195" y="240" fontSize="10" fill="#666">Zn granules</text>
      <rect x="85" y="40" width="90" height="10" rx="3" fill="#999" />
      <rect x="88" y="50" width="8" height="60" rx="2" fill="#bbb" />
      <rect x="164" y="50" width="8" height="60" rx="2" fill="#bbb" />
    </svg>
  );
}

function DecompositionSVG() {
  return (
    <svg viewBox="0 0 320 340" className="w-full h-full">
      <rect x="40" y="40" width="8" height="260" rx="2" fill="#aaa" />
      <rect x="30" y="296" width="100" height="8" rx="2" fill="#999" />
      <rect x="48" y="100" width="60" height="12" rx="3" fill="#888" />
      <g transform="rotate(-30, 160, 150)">
        <rect x="120" y="80" width="45" height="170" rx="22" fill="#e8f4e8" stroke="#5aab5a" strokeWidth="2" />
        <rect x="128" y="220" width="29" height="22" rx="3" fill="#fff9c4" />
        <text x="143" y="235" textAnchor="middle" fontSize="8" fill="#a08000">Pb(NO₃)₂</text>
        <ellipse cx="143" cy="95" rx="18" ry="10" fill="#c8860a" opacity="0.4" />
        <ellipse cx="155" cy="82" rx="12" ry="8" fill="#c8860a" opacity="0.3" />
        <ellipse cx="135" cy="75" rx="10" ry="7" fill="#c8860a" opacity="0.25" />
      </g>
      <text x="210" y="80" fontSize="10" fill="#a05000">Brown NO₂</text>
      <text x="210" y="93" fontSize="10" fill="#a05000">fumes</text>
      <rect x="120" y="290" width="40" height="30" rx="4" fill="#555" />
      <rect x="134" y="270" width="12" height="25" rx="2" fill="#777" />
      <ellipse cx="140" cy="262" rx="10" ry="14" fill="#ff9900" opacity="0.8" />
      <ellipse cx="140" cy="258" rx="6" ry="9" fill="#ffdd00" opacity="0.9" />
      <text x="140" y="335" textAnchor="middle" fontSize="11" fill="#444">Bunsen Burner</text>
    </svg>
  );
}

function MagnesiumBurningSVG() {
  return (
    <svg viewBox="0 0 280 340" className="w-full h-full">
      <ellipse cx="140" cy="80" rx="20" ry="35" fill="#fffde0" stroke="#ffe066" strokeWidth="1" opacity="0.95" />
      <ellipse cx="140" cy="75" rx="12" ry="22" fill="white" opacity="0.95" />
      <text x="140" y="30" textAnchor="middle" fontSize="10" fill="#b8860b">Dazzling White Flame</text>
      <rect x="135" y="110" width="10" height="50" rx="2" fill="#d0d0d0" stroke="#aaa" strokeWidth="1.5" />
      <text x="170" y="138" fontSize="10" fill="#555">Mg ribbon</text>
      <line x1="130" y1="158" x2="100" y2="200" stroke="#777" strokeWidth="4" strokeLinecap="round" />
      <line x1="150" y1="158" x2="180" y2="200" stroke="#777" strokeWidth="4" strokeLinecap="round" />
      <text x="80" y="218" fontSize="10" fill="#555">Tongs</text>
      <ellipse cx="140" cy="245" rx="55" ry="14" fill="#f5f5f0" stroke="#ccc" strokeWidth="2" />
      <ellipse cx="140" cy="240" rx="55" ry="14" fill="#fafaf5" stroke="#ddd" strokeWidth="1.5" />
      <ellipse cx="140" cy="240" rx="30" ry="7" fill="white" stroke="#eee" strokeWidth="1" />
      <text x="140" y="268" textAnchor="middle" fontSize="10" fill="#888">China Dish (MgO ash)</text>
      <rect x="115" y="285" width="50" height="28" rx="4" fill="#555" />
      <rect x="133" y="268" width="14" height="20" rx="2" fill="#777" />
      <ellipse cx="140" cy="262" rx="12" ry="8" fill="#ff8800" opacity="0.7" />
      <text x="140" y="330" textAnchor="middle" fontSize="11" fill="#444">Bunsen Burner</text>
    </svg>
  );
}

function OhmsLawCircuitSVG() {
  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <rect x="40" y="50" width="340" height="180" rx="6" fill="none" stroke="#333" strokeWidth="2.5" />
      <line x1="40" y1="100" x2="40" y2="80" stroke="#333" strokeWidth="2.5" />
      <line x1="30" y1="80" x2="50" y2="80" stroke="#333" strokeWidth="3" />
      <line x1="33" y1="72" x2="47" y2="72" stroke="#333" strokeWidth="1.5" />
      <line x1="40" y1="72" x2="40" y2="50" stroke="#333" strokeWidth="2.5" />
      <text x="15" y="90" fontSize="10" fill="#333">+</text>
      <text x="15" y="78" fontSize="10" fill="#333">−</text>
      <text x="5" y="110" fontSize="10" fill="#1a5fa8">Battery</text>
      <circle cx="130" cy="50" r="5" fill="white" stroke="#333" strokeWidth="2" />
      <circle cx="160" cy="50" r="5" fill="white" stroke="#333" strokeWidth="2" />
      <line x1="135" y1="50" x2="158" y2="44" stroke="#333" strokeWidth="2" />
      <text x="145" y="35" textAnchor="middle" fontSize="10" fill="#1a5fa8">Switch (K)</text>
      <rect x="200" y="40" width="60" height="20" rx="4" fill="#fffbe6" stroke="#c8a800" strokeWidth="1.5" />
      <line x1="215" y1="50" x2="222" y2="44" stroke="#c8a800" strokeWidth="1.2" />
      <line x1="225" y1="50" x2="232" y2="44" stroke="#c8a800" strokeWidth="1.2" />
      <line x1="235" y1="50" x2="242" y2="44" stroke="#c8a800" strokeWidth="1.2" />
      <line x1="245" y1="50" x2="252" y2="44" stroke="#c8a800" strokeWidth="1.2" />
      <text x="230" y="35" textAnchor="middle" fontSize="10" fill="#a08000">Rheostat</text>
      <circle cx="350" cy="50" r="16" fill="white" stroke="#2ecc71" strokeWidth="2" />
      <text x="350" y="54" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2ecc71">A</text>
      <text x="350" y="35" textAnchor="middle" fontSize="10" fill="#1a8a4a">Ammeter</text>
      <rect x="368" y="110" width="12" height="60" rx="2" fill="#ffe0b2" stroke="#e65100" strokeWidth="1.5" />
      <text x="395" y="148" fontSize="10" fill="#e65100">R</text>
      <text x="395" y="160" fontSize="9" fill="#e65100">(Resistor)</text>
      <line x1="374" y1="170" x2="374" y2="220" stroke="#333" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="374" y1="220" x2="280" y2="220" stroke="#333" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="280" y1="220" x2="280" y2="230" stroke="#333" strokeWidth="1.5" strokeDasharray="5,3" />
      <circle cx="320" cy="228" r="16" fill="white" stroke="#e74c3c" strokeWidth="2" />
      <text x="320" y="232" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e74c3c">V</text>
      <text x="320" y="252" textAnchor="middle" fontSize="10" fill="#c0392b">Voltmeter</text>
    </svg>
  );
}

function ConcaveMirrorSVG() {
  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <line x1="30" y1="140" x2="390" y2="140" stroke="#ccc" strokeWidth="1.5" strokeDasharray="8,4" />
      <text x="395" y="144" fontSize="10" fill="#999">→</text>
      <path d="M60,60 Q20,140 60,220" fill="none" stroke="#2c7da0" strokeWidth="4" strokeLinecap="round" />
      <path d="M60,60 Q16,140 60,220" fill="none" stroke="#aaa" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
      <text x="12" y="145" fontSize="10" fill="#2c7da0">Mirror</text>
      <circle cx="180" cy="140" r="5" fill="#e74c3c" />
      <text x="180" y="130" textAnchor="middle" fontSize="11" fill="#e74c3c">C</text>
      <circle cx="240" cy="140" r="5" fill="#2ecc71" />
      <text x="240" y="130" textAnchor="middle" fontSize="11" fill="#2ecc71">F</text>
      <line x1="380" y1="100" x2="65" y2="100" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="380" y1="120" x2="65" y2="120" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="380" y1="140" x2="65" y2="140" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="65" y1="100" x2="240" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="65" y1="120" x2="240" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <rect x="236" y="108" width="8" height="64" rx="2" fill="#fffbe6" stroke="#c8a800" strokeWidth="1.5" />
      <text x="240" y="185" textAnchor="middle" fontSize="10" fill="#a08000">Screen</text>
      <line x1="65" y1="165" x2="240" y2="165" stroke="#2ecc71" strokeWidth="1.2" />
      <line x1="65" y1="160" x2="65" y2="170" stroke="#2ecc71" strokeWidth="1.2" />
      <line x1="240" y1="160" x2="240" y2="170" stroke="#2ecc71" strokeWidth="1.2" />
      <text x="152" y="180" textAnchor="middle" fontSize="11" fill="#2ecc71">f (focal length)</text>
    </svg>
  );
}

function ConvexLensSVG() {
  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <line x1="20" y1="140" x2="400" y2="140" stroke="#ccc" strokeWidth="1.5" strokeDasharray="8,4" />
      <ellipse cx="210" cy="140" rx="14" ry="80" fill="#cceeff" stroke="#2c7da0" strokeWidth="2.5" opacity="0.7" />
      <text x="210" y="30" textAnchor="middle" fontSize="11" fill="#2c7da0">Convex Lens</text>
      <line x1="210" y1="35" x2="210" y2="55" stroke="#2c7da0" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="30" y1="100" x2="196" y2="100" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="30" y1="120" x2="196" y2="120" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="30" y1="140" x2="196" y2="140" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="30" y1="160" x2="196" y2="160" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="30" y1="180" x2="196" y2="180" stroke="#f39c12" strokeWidth="1.8" />
      <line x1="224" y1="100" x2="310" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="224" y1="120" x2="310" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="224" y1="140" x2="310" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="224" y1="160" x2="310" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="224" y1="180" x2="310" y2="140" stroke="#e74c3c" strokeWidth="1.5" strokeDasharray="5,3" />
      <circle cx="310" cy="140" r="5" fill="#2ecc71" />
      <text x="310" y="130" textAnchor="middle" fontSize="11" fill="#2ecc71">F</text>
      <rect x="306" y="100" width="8" height="80" rx="2" fill="#fffbe6" stroke="#c8a800" strokeWidth="1.5" />
      <text x="310" y="198" textAnchor="middle" fontSize="10" fill="#a08000">Screen</text>
      <line x1="210" y1="218" x2="310" y2="218" stroke="#2ecc71" strokeWidth="1.2" />
      <line x1="210" y1="213" x2="210" y2="223" stroke="#2ecc71" strokeWidth="1.2" />
      <line x1="310" y1="213" x2="310" y2="223" stroke="#2ecc71" strokeWidth="1.2" />
      <text x="260" y="235" textAnchor="middle" fontSize="11" fill="#2ecc71">f (focal length)</text>
    </svg>
  );
}

function BarMagnetFieldSVG() {
  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <rect x="130" y="115" width="160" height="50" rx="5" fill="#ddd" stroke="#999" strokeWidth="2" />
      <rect x="130" y="115" width="80" height="50" rx="0" fill="#e74c3c" />
      <rect x="210" y="115" width="80" height="50" rx="0" fill="#3498db" />
      <text x="170" y="145" textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">N</text>
      <text x="250" y="145" textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">S</text>
      <path d="M130,140 Q80,80 210,60 Q290,50 290,140" fill="none" stroke="#e67e22" strokeWidth="1.5" opacity="0.7" />
      <path d="M130,140 Q60,40 210,20 Q320,10 290,140" fill="none" stroke="#e67e22" strokeWidth="1.5" opacity="0.5" />
      <path d="M290,140 Q340,180 210,200 Q110,210 130,140" fill="none" stroke="#e67e22" strokeWidth="1.5" opacity="0.7" />
      <path d="M290,140 Q360,220 210,240 Q80,255 130,140" fill="none" stroke="#e67e22" strokeWidth="1.5" opacity="0.5" />
      <text x="212" y="56" fontSize="10" fill="#e67e22">→</text>
      <text x="212" y="244" fontSize="10" fill="#e67e22">↓</text>
      <text x="210" y="18" textAnchor="middle" fontSize="10" fill="#c0392b">Field lines: N → S (outside)</text>
      <text x="210" y="270" textAnchor="middle" fontSize="10" fill="#888">Lines denser at poles = stronger field</text>
      <circle cx="355" cy="100" r="16" fill="white" stroke="#555" strokeWidth="1.5" />
      <line x1="355" y1="100" x2="355" y2="87" stroke="#e74c3c" strokeWidth="2" />
      <line x1="355" y1="100" x2="355" y2="113" stroke="#3498db" strokeWidth="2" />
      <text x="375" y="104" fontSize="9" fill="#555">Compass</text>
    </svg>
  );
}

function PhotosynthesisSVG() {
  return (
    <svg viewBox="0 0 380 280" className="w-full h-full">
      <ellipse cx="100" cy="130" rx="65" ry="85" fill="#c8e6c9" stroke="#4caf50" strokeWidth="2" />
      <line x1="100" y1="50" x2="100" y2="210" stroke="#4caf50" strokeWidth="2" />
      <line x1="100" y1="90" x2="140" y2="110" stroke="#4caf50" strokeWidth="1.2" />
      <line x1="100" y1="120" x2="55" y2="140" stroke="#4caf50" strokeWidth="1.2" />
      <line x1="100" y1="150" x2="138" y2="168" stroke="#4caf50" strokeWidth="1.2" />
      <ellipse cx="100" cy="130" rx="50" ry="68" fill="#1a1a4a" opacity="0.35" />
      <text x="100" y="232" textAnchor="middle" fontSize="10" fill="#1a1a4a" fontWeight="bold">Blue-black</text>
      <text x="100" y="245" textAnchor="middle" fontSize="9" fill="#555">(starch present)</text>
      <circle cx="100" cy="28" r="14" fill="#f9ca24" />
      {[0,45,90,135,180,225,270,315].map((angle,i) => (
        <line key={i}
          x1={100 + 17*Math.cos(angle*Math.PI/180)}
          y1={28 + 17*Math.sin(angle*Math.PI/180)}
          x2={100 + 24*Math.cos(angle*Math.PI/180)}
          y2={28 + 24*Math.sin(angle*Math.PI/180)}
          stroke="#f9ca24" strokeWidth="2" />
      ))}
      <text x="100" y="14" textAnchor="middle" fontSize="9" fill="#a08000">Sunlight</text>
      <ellipse cx="280" cy="130" rx="65" ry="85" fill="#f5f5f0" stroke="#bbb" strokeWidth="2" />
      <line x1="280" y1="50" x2="280" y2="210" stroke="#bbb" strokeWidth="2" />
      <rect x="248" y="52" width="64" height="160" rx="4" fill="#333" opacity="0.18" />
      <text x="280" y="36" textAnchor="middle" fontSize="9" fill="#888">Black paper</text>
      <ellipse cx="280" cy="130" rx="50" ry="68" fill="#e67e22" opacity="0.2" />
      <text x="280" y="232" textAnchor="middle" fontSize="10" fill="#a04000" fontWeight="bold">Orange-brown</text>
      <text x="280" y="245" textAnchor="middle" fontSize="9" fill="#555">(no starch)</text>
      <text x="190" y="138" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#999">VS</text>
    </svg>
  );
}

function RespirationSVG() {
  return (
    <svg viewBox="0 0 380 300" className="w-full h-full">
      <polygon points="100,80 160,80 190,200 70,200" fill="#e8f5e9" stroke="#4caf50" strokeWidth="2" />
      <rect x="110" y="64" width="50" height="20" rx="6" fill="#e8f5e9" stroke="#4caf50" strokeWidth="2" />
      <ellipse cx="115" cy="185" rx="10" ry="6" fill="#8d6e63" />
      <ellipse cx="132" cy="190" rx="9" ry="5" fill="#8d6e63" />
      <ellipse cx="148" cy="183" rx="8" ry="5" fill="#795548" />
      <text x="130" y="218" textAnchor="middle" fontSize="9" fill="#555">Germinating Seeds</text>
      <rect x="110" y="58" width="50" height="10" rx="3" fill="#888" />
      <path d="M135,58 Q135,30 200,30 Q250,30 250,70" fill="none" stroke="#888" strokeWidth="3" />
      <circle cx="220" cy="30" r="3" fill="#c8e6c9" stroke="#4caf50" strokeWidth="1" />
      <circle cx="240" cy="30" r="3" fill="#c8e6c9" stroke="#4caf50" strokeWidth="1" />
      <path d="M235,70 L235,200 Q235,225 255,225 Q275,225 275,200 L275,70 Z" fill="#fffde7" stroke="#f9ca24" strokeWidth="2" />
      <path d="M237,120 L237,200 Q237,223 255,223 Q273,223 273,200 L273,120 Z" fill="white" opacity="0.8" />
      <text x="255" y="245" textAnchor="middle" fontSize="9" fill="#888">Lime Water</text>
      <text x="255" y="258" textAnchor="middle" fontSize="9" fill="#a04000" fontWeight="bold">→ Milky (CO₂)</text>
      <text x="190" y="22" textAnchor="middle" fontSize="10" fill="#2ecc71">CO₂ →</text>
      <text x="190" y="280" textAnchor="middle" fontSize="9" fill="#555">CO₂ + Ca(OH)₂ → CaCO₃↓ (white)</text>
    </svg>
  );
}

function BinaryFissionSVG() {
  return (
    <svg viewBox="0 0 420 220" className="w-full h-full">
      <ellipse cx="65" cy="110" rx="48" ry="55" fill="#e3f2fd" stroke="#1976d2" strokeWidth="2" />
      <ellipse cx="65" cy="105" rx="20" ry="22" fill="#bbdefb" stroke="#1565c0" strokeWidth="1.5" />
      <text x="65" y="108" textAnchor="middle" fontSize="8" fill="#0d47a1">Nucleus</text>
      <text x="65" y="185" textAnchor="middle" fontSize="10" fill="#1976d2">Parent Cell</text>
      <text x="125" y="115" fontSize="18" fill="#888">→</text>
      <ellipse cx="195" cy="110" rx="38" ry="68" fill="#e8f5e9" stroke="#388e3c" strokeWidth="2" />
      <ellipse cx="195" cy="82" rx="16" ry="16" fill="#c8e6c9" stroke="#2e7d32" strokeWidth="1.5" />
      <ellipse cx="195" cy="138" rx="16" ry="16" fill="#c8e6c9" stroke="#2e7d32" strokeWidth="1.5" />
      <line x1="195" y1="98" x2="195" y2="122" stroke="#2e7d32" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="195" y="200" textAnchor="middle" fontSize="10" fill="#388e3c">Elongating</text>
      <text x="195" y="212" textAnchor="middle" fontSize="9" fill="#555">(nuclei divided)</text>
      <text x="248" y="115" fontSize="18" fill="#888">→</text>
      <ellipse cx="320" cy="80" rx="42" ry="42" fill="#fce4ec" stroke="#c2185b" strokeWidth="2" />
      <ellipse cx="320" cy="78" rx="18" ry="18" fill="#f8bbd0" stroke="#ad1457" strokeWidth="1.5" />
      <text x="320" y="136" textAnchor="middle" fontSize="9" fill="#c2185b">Daughter 1</text>
      <ellipse cx="375" cy="155" rx="38" ry="38" fill="#fce4ec" stroke="#c2185b" strokeWidth="2" />
      <ellipse cx="375" cy="153" rx="16" ry="16" fill="#f8bbd0" stroke="#ad1457" strokeWidth="1.5" />
      <text x="375" y="205" textAnchor="middle" fontSize="9" fill="#c2185b">Daughter 2</text>
    </svg>
  );
}

function BuddingYeastSVG() {
  return (
    <svg viewBox="0 0 380 240" className="w-full h-full">
      <ellipse cx="100" cy="120" rx="55" ry="65" fill="#fff9c4" stroke="#f9ca24" strokeWidth="2.5" />
      <ellipse cx="100" cy="115" rx="25" ry="28" fill="#fff176" stroke="#f57f17" strokeWidth="1.5" />
      <text x="100" y="118" textAnchor="middle" fontSize="8" fill="#6d4c00">Nucleus</text>
      <text x="100" y="204" textAnchor="middle" fontSize="10" fill="#f9a825">Parent Cell</text>
      <text x="168" y="125" fontSize="18" fill="#aaa">→</text>
      <ellipse cx="255" cy="135" rx="48" ry="58" fill="#fff9c4" stroke="#f9ca24" strokeWidth="2.5" />
      <ellipse cx="255" cy="130" rx="22" ry="24" fill="#fff176" stroke="#f57f17" strokeWidth="1.5" />
      <ellipse cx="295" cy="88" rx="28" ry="32" fill="#ffe082" stroke="#f9a825" strokeWidth="2" />
      <ellipse cx="295" cy="84" rx="12" ry="13" fill="#ffd54f" stroke="#e65100" strokeWidth="1.5" />
      <text x="295" y="87" textAnchor="middle" fontSize="7" fill="#6d4c00">Nucleus</text>
      <text x="295" y="55" textAnchor="middle" fontSize="9" fill="#e65100">Bud (smaller)</text>
      <text x="338" y="125" fontSize="18" fill="#aaa">→</text>
      <ellipse cx="372" cy="170" rx="24" ry="28" fill="#ffe082" stroke="#f9a825" strokeWidth="2" />
      <text x="372" y="208" textAnchor="middle" fontSize="8" fill="#e65100">Daughter</text>
      <text x="372" y="220" textAnchor="middle" fontSize="8" fill="#e65100">cell</text>
      <text x="190" y="218" textAnchor="middle" fontSize="9" fill="#888">Bud grows → separates → new yeast cell</text>
    </svg>
  );
}

function HomologousAnalogousSVG() {
  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <text x="210" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#333">Homologous Organs (same bones, different function)</text>
      <rect x="30" y="35" width="18" height="55" rx="5" fill="#90caf9" stroke="#1976d2" strokeWidth="1.5" />
      <rect x="25" y="92" width="10" height="40" rx="3" fill="#64b5f6" stroke="#1976d2" strokeWidth="1" />
      <rect x="37" y="92" width="10" height="40" rx="3" fill="#64b5f6" stroke="#1976d2" strokeWidth="1" />
      <text x="39" y="150" textAnchor="middle" fontSize="9" fill="#1565c0">Human Arm</text>
      <rect x="105" y="35" width="18" height="55" rx="5" fill="#90caf9" stroke="#1976d2" strokeWidth="1.5" />
      <rect x="98" y="92" width="34" height="35" rx="8" fill="#64b5f6" stroke="#1976d2" strokeWidth="1" />
      <text x="114" y="150" textAnchor="middle" fontSize="9" fill="#1565c0">Whale Flipper</text>
      <rect x="185" y="35" width="18" height="55" rx="5" fill="#90caf9" stroke="#1976d2" strokeWidth="1.5" />
      <rect x="189" y="92" width="10" height="50" rx="3" fill="#64b5f6" stroke="#1976d2" strokeWidth="1" />
      <text x="194" y="160" textAnchor="middle" fontSize="9" fill="#1565c0">Horse Leg</text>
      <rect x="265" y="35" width="18" height="55" rx="5" fill="#90caf9" stroke="#1976d2" strokeWidth="1.5" />
      <path d="M274,90 Q340,70 360,110 Q340,130 274,130 Z" fill="#bbdefb" stroke="#1976d2" strokeWidth="1" />
      <text x="315" y="150" textAnchor="middle" fontSize="9" fill="#1565c0">Bat Wing</text>
      <rect x="20" y="155" width="370" height="22" rx="4" fill="#e3f2fd" stroke="#90caf9" strokeWidth="1" />
      <text x="205" y="170" textAnchor="middle" fontSize="9" fill="#1565c0">All have: Humerus → Radius/Ulna → Carpals → Digits (same bone plan)</text>
      <line x1="20" y1="188" x2="400" y2="188" stroke="#ddd" strokeWidth="1.5" strokeDasharray="6,3" />
      <text x="210" y="204" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#e65100">Analogous Organs (different structure, same function: flight)</text>
      <path d="M60,218 Q120,205 150,240 Q120,255 60,250 Z" fill="#c8e6c9" stroke="#388e3c" strokeWidth="1.5" />
      <text x="105" y="268" textAnchor="middle" fontSize="9" fill="#388e3c">Bird Wing</text>
      <text x="105" y="278" textAnchor="middle" fontSize="8" fill="#555">(feathers + bones)</text>
      <path d="M250,218 Q310,208 340,238 Q310,252 250,248 Z" fill="#fff9c4" stroke="#f9ca24" strokeWidth="1.5" />
      <text x="295" y="268" textAnchor="middle" fontSize="9" fill="#a08000">Insect Wing</text>
      <text x="295" y="278" textAnchor="middle" fontSize="8" fill="#555">(chitinous veins)</text>
      <text x="196" y="238" textAnchor="middle" fontSize="11" fill="#bbb">≠</text>
    </svg>
  );
}

// ── SVG registry ────────────────────────────────────────────

const SVG_MAP: Record<string, React.FC> = {
  "litmus-test": LitmusTestSVG,
  "titration": TitrationSVG,
  "displacement": DisplacementSVG,
  "decomposition": DecompositionSVG,
  "magnesium-burning": MagnesiumBurningSVG,
  "ohms-law-circuit": OhmsLawCircuitSVG,
  "concave-mirror": ConcaveMirrorSVG,
  "convex-lens": ConvexLensSVG,
  "bar-magnet-field": BarMagnetFieldSVG,
  "photosynthesis": PhotosynthesisSVG,
  "respiration": RespirationSVG,
  "binary-fission": BinaryFissionSVG,
  "budding-yeast": BuddingYeastSVG,
  "homologous-analogous": HomologousAnalogousSVG,
};

// ── DiagramViewer ───────────────────────────────────────────

export default function DiagramViewer({ diagram }: { diagram: DiagramConfig }) {
  const SVGComponent = SVG_MAP[diagram.svgKey];

  if (!SVGComponent) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          border: "1.5px dashed #D4C4A0",
          borderRadius: 14,
          color: "#9B8A6E",
          fontSize: 13,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>📐</span>
        <span>Diagram not available for this experiment.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9B8A6E",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {diagram.title}
      </div>

      {/* SVG panel */}
      <div
        style={{
          background: "#FDFAF3",
          border: "1.5px solid #D4C4A0",
          borderRadius: 16,
          overflow: "hidden",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxHeight: 380,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SVGComponent />
        </div>
      </div>

      {/* Labels legend */}
      {diagram.labels.length > 0 && (
        <div
          style={{
            background: "#F5EED8",
            border: "1.5px solid #E0D0B0",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#9B8A6E",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Labels
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {diagram.labels.map((label) => (
              <span
                key={label.id}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#FDFAF3",
                  border: "1.5px solid #D4C4A0",
                  color: "#4A3C28",
                  borderRadius: 99,
                  padding: "4px 12px",
                }}
              >
                {label.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
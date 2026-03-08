"use client";

interface IconProps {
  size?: number;
}

function JavaIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#e76f00" />
      {/* Steam */}
      <rect x={4} y={1} width={1} height={2} fill="white" />
      <rect x={7} y={0} width={1} height={3} fill="white" />
      <rect x={10} y={1} width={1} height={2} fill="white" />
      {/* Cup rim */}
      <rect x={3} y={4} width={10} height={1} fill="#f0c040" />
      {/* Cup walls */}
      <rect x={3} y={5} width={1} height={7} fill="#f0c040" />
      <rect x={12} y={5} width={1} height={7} fill="#f0c040" />
      {/* Cup base */}
      <rect x={4} y={11} width={8} height={1} fill="#f0c040" />
      {/* Handle */}
      <rect x={13} y={6} width={2} height={1} fill="#f0c040" />
      <rect x={14} y={7} width={1} height={2} fill="#f0c040" />
      <rect x={13} y={9} width={2} height={1} fill="#f0c040" />
      {/* Coffee inside */}
      <rect x={4} y={5} width={8} height={6} fill="#4a2c0a" />
      {/* Saucer */}
      <rect x={2} y={12} width={12} height={1} fill="#f0c040" />
      <rect x={1} y={13} width={14} height={1} fill="#f0c040" />
    </svg>
  );
}

function ReactIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#20232a" />
      {/* Center dot */}
      <rect x={7} y={7} width={2} height={2} fill="#61dafb" />
      {/* Horizontal orbit */}
      <rect x={1} y={7} width={5} height={2} fill="#61dafb" />
      <rect x={10} y={7} width={5} height={2} fill="#61dafb" />
      {/* Diagonal orbit 1 */}
      <rect x={8} y={2} width={2} height={1} fill="#61dafb" />
      <rect x={10} y={3} width={1} height={2} fill="#61dafb" />
      <rect x={11} y={5} width={1} height={1} fill="#61dafb" />
      <rect x={4} y={11} width={1} height={1} fill="#61dafb" />
      <rect x={4} y={12} width={1} height={1} fill="#61dafb" />
      <rect x={5} y={13} width={2} height={1} fill="#61dafb" />
      {/* Diagonal orbit 2 */}
      <rect x={6} y={2} width={2} height={1} fill="#61dafb" />
      <rect x={4} y={3} width={1} height={2} fill="#61dafb" />
      <rect x={3} y={5} width={1} height={1} fill="#61dafb" />
      <rect x={11} y={11} width={1} height={1} fill="#61dafb" />
      <rect x={11} y={12} width={1} height={1} fill="#61dafb" />
      <rect x={9} y={13} width={2} height={1} fill="#61dafb" />
    </svg>
  );
}

function JsIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#f7df1e" />
      {/* J right half */}
      <rect x={9} y={2} width={5} height={2} fill="black" />
      <rect x={11} y={4} width={2} height={7} fill="black" />
      <rect x={8} y={11} width={3} height={1} fill="black" />
      <rect x={9} y={12} width={2} height={2} fill="black" />
      {/* S left half */}
      <rect x={1} y={2} width={6} height={2} fill="black" />
      <rect x={1} y={4} width={2} height={3} fill="black" />
      <rect x={1} y={7} width={6} height={2} fill="black" />
      <rect x={5} y={9} width={2} height={3} fill="black" />
      <rect x={1} y={12} width={6} height={2} fill="black" />
    </svg>
  );
}

function TsIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#3178c6" />
      {/* T left half */}
      <rect x={1} y={2} width={6} height={2} fill="white" />
      <rect x={3} y={4} width={2} height={10} fill="white" />
      {/* S right half */}
      <rect x={9} y={2} width={6} height={2} fill="white" />
      <rect x={9} y={4} width={2} height={3} fill="white" />
      <rect x={9} y={7} width={6} height={2} fill="white" />
      <rect x={13} y={9} width={2} height={3} fill="white" />
      <rect x={9} y={12} width={6} height={2} fill="white" />
    </svg>
  );
}

function DockerIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#2496ed" />
      {/* Whale body */}
      <rect x={1} y={6} width={10} height={6} fill="white" />
      {/* Container boxes */}
      <rect x={2} y={4} width={2} height={2} fill="white" />
      <rect x={5} y={4} width={2} height={2} fill="white" />
      <rect x={8} y={4} width={2} height={2} fill="white" />
      <rect x={5} y={2} width={2} height={2} fill="white" />
      {/* Tail */}
      <rect x={11} y={8} width={3} height={2} fill="white" />
      <rect x={12} y={7} width={2} height={1} fill="white" />
      <rect x={12} y={11} width={2} height={1} fill="white" />
      {/* Water squirt */}
      <rect x={13} y={5} width={1} height={2} fill="white" />
      <rect x={14} y={4} width={1} height={1} fill="white" />
      {/* Eye */}
      <rect x={3} y={7} width={1} height={1} fill="#2496ed" />
    </svg>
  );
}

function K8sIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#326ce5" />
      {/* Outer ring */}
      <rect x={5} y={1} width={6} height={1} fill="white" />
      <rect x={3} y={2} width={2} height={1} fill="white" />
      <rect x={11} y={2} width={2} height={1} fill="white" />
      <rect x={2} y={3} width={1} height={2} fill="white" />
      <rect x={13} y={3} width={1} height={2} fill="white" />
      <rect x={1} y={5} width={1} height={6} fill="white" />
      <rect x={14} y={5} width={1} height={6} fill="white" />
      <rect x={2} y={11} width={1} height={2} fill="white" />
      <rect x={13} y={11} width={1} height={2} fill="white" />
      <rect x={3} y={13} width={2} height={1} fill="white" />
      <rect x={11} y={13} width={2} height={1} fill="white" />
      <rect x={5} y={14} width={6} height={1} fill="white" />
      {/* Center hub */}
      <rect x={6} y={6} width={4} height={4} fill="white" />
      {/* 4 spokes */}
      <rect x={7} y={2} width={2} height={4} fill="white" />
      <rect x={7} y={10} width={2} height={4} fill="white" />
      <rect x={2} y={7} width={4} height={2} fill="white" />
      <rect x={10} y={7} width={4} height={2} fill="white" />
    </svg>
  );
}

function PgIcon({ size = 48 }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Background */}
      <rect x={0} y={0} width={16} height={16} fill="#336791" />
      {/* Head */}
      <rect x={3} y={2} width={8} height={8} fill="white" />
      {/* Right ear */}
      <rect x={11} y={2} width={2} height={4} fill="white" />
      <rect x={13} y={3} width={1} height={2} fill="white" />
      {/* Left ear */}
      <rect x={1} y={2} width={2} height={4} fill="white" />
      {/* Trunk */}
      <rect x={5} y={10} width={3} height={5} fill="white" />
      <rect x={6} y={14} width={3} height={1} fill="white" />
      {/* Eyes */}
      <rect x={5} y={4} width={1} height={1} fill="#336791" />
      <rect x={8} y={4} width={1} height={1} fill="#336791" />
      {/* Tusks */}
      <rect x={4} y={9} width={2} height={1} fill="#dddddd" />
      <rect x={9} y={9} width={2} height={1} fill="#dddddd" />
    </svg>
  );
}

function NodeIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#3c873a" />
      {/* Hexagon outline */}
      <rect x={4} y={1} width={8} height={1} fill="white" />
      <rect x={2} y={2} width={12} height={1} fill="white" />
      <rect x={1} y={3} width={1} height={10} fill="white" />
      <rect x={14} y={3} width={1} height={10} fill="white" />
      <rect x={2} y={13} width={12} height={1} fill="white" />
      <rect x={4} y={14} width={8} height={1} fill="white" />
      {/* N letter */}
      <rect x={3} y={4} width={2} height={8} fill="white" />
      <rect x={11} y={4} width={2} height={8} fill="white" />
      <rect x={5} y={4} width={1} height={2} fill="white" />
      <rect x={6} y={6} width={2} height={2} fill="white" />
      <rect x={8} y={8} width={2} height={2} fill="white" />
      <rect x={10} y={10} width={1} height={2} fill="white" />
    </svg>
  );
}

function OracleIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#c74634" />
      {/* Hollow O oval */}
      <rect x={3} y={3} width={10} height={2} fill="white" />
      <rect x={1} y={5} width={2} height={6} fill="white" />
      <rect x={13} y={5} width={2} height={6} fill="white" />
      <rect x={3} y={11} width={10} height={2} fill="white" />
    </svg>
  );
}

function CloudIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#5ba4cf" />
      {/* Cloud bumps */}
      <rect x={5} y={3} width={4} height={2} fill="white" />
      <rect x={9} y={2} width={4} height={3} fill="white" />
      <rect x={3} y={5} width={3} height={2} fill="white" />
      {/* Cloud body */}
      <rect x={1} y={7} width={14} height={5} fill="white" />
      <rect x={2} y={6} width={12} height={1} fill="white" />
    </svg>
  );
}

function DistributedIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#1a1a2e" />
      {/* Center node */}
      <rect x={6} y={6} width={4} height={4} fill="#00ff41" />
      {/* Corner nodes */}
      <rect x={0} y={0} width={3} height={3} fill="#ff69b4" />
      <rect x={13} y={0} width={3} height={3} fill="#ff69b4" />
      <rect x={0} y={13} width={3} height={3} fill="#ff69b4" />
      <rect x={13} y={13} width={3} height={3} fill="#ff69b4" />
      {/* Connection lines (diagonal steps) */}
      <rect x={3} y={3} width={1} height={1} fill="white" />
      <rect x={4} y={4} width={1} height={1} fill="white" />
      <rect x={5} y={5} width={1} height={1} fill="white" />
      <rect x={11} y={3} width={1} height={1} fill="white" />
      <rect x={10} y={4} width={1} height={1} fill="white" />
      <rect x={9} y={5} width={1} height={1} fill="white" />
      <rect x={3} y={12} width={1} height={1} fill="white" />
      <rect x={4} y={11} width={1} height={1} fill="white" />
      <rect x={5} y={10} width={1} height={1} fill="white" />
      <rect x={11} y={12} width={1} height={1} fill="white" />
      <rect x={10} y={11} width={1} height={1} fill="white" />
      <rect x={9} y={10} width={1} height={1} fill="white" />
    </svg>
  );
}

function DesignSystemIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#7c3aed" />
      {/* Header block */}
      <rect x={1} y={1} width={14} height={3} fill="white" />
      {/* Two column components */}
      <rect x={1} y={5} width={6} height={5} fill="white" />
      <rect x={9} y={5} width={6} height={5} fill="white" />
      {/* Footer block */}
      <rect x={1} y={11} width={14} height={2} fill="white" />
      {/* Inner detail lines */}
      <rect x={2} y={6} width={4} height={1} fill="#7c3aed" />
      <rect x={2} y={8} width={3} height={1} fill="#7c3aed" />
      <rect x={10} y={6} width={4} height={1} fill="#7c3aed" />
      <rect x={10} y={8} width={3} height={1} fill="#7c3aed" />
    </svg>
  );
}

function SpringIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#6db33f" />
      {/* S shape */}
      <rect x={4} y={2} width={8} height={2} fill="white" />
      <rect x={4} y={4} width={2} height={3} fill="white" />
      <rect x={4} y={7} width={8} height={2} fill="white" />
      <rect x={10} y={9} width={2} height={3} fill="white" />
      <rect x={4} y={12} width={8} height={2} fill="white" />
      {/* Leaf accent */}
      <rect x={11} y={13} width={3} height={2} fill="#4a7c2f" />
      <rect x={12} y={12} width={2} height={1} fill="#4a7c2f" />
      <rect x={13} y={11} width={1} height={1} fill="#4a7c2f" />
    </svg>
  );
}

function QuarkusIcon({ size = 48 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: "pixelated" }}>
      <rect x={0} y={0} width={16} height={16} fill="#1b1b1b" />
      {/* Left blue diamond half */}
      <rect x={7} y={1} width={1} height={2} fill="#4695eb" />
      <rect x={5} y={3} width={3} height={2} fill="#4695eb" />
      <rect x={3} y={5} width={5} height={2} fill="#4695eb" />
      <rect x={1} y={7} width={7} height={2} fill="#4695eb" />
      <rect x={3} y={9} width={5} height={2} fill="#4695eb" />
      <rect x={5} y={11} width={3} height={2} fill="#4695eb" />
      <rect x={7} y={13} width={1} height={2} fill="#4695eb" />
      {/* Right red diamond half */}
      <rect x={8} y={1} width={1} height={2} fill="#ff004a" />
      <rect x={8} y={3} width={3} height={2} fill="#ff004a" />
      <rect x={8} y={5} width={5} height={2} fill="#ff004a" />
      <rect x={8} y={7} width={7} height={2} fill="#ff004a" />
      <rect x={8} y={9} width={5} height={2} fill="#ff004a" />
      <rect x={8} y={11} width={3} height={2} fill="#ff004a" />
      <rect x={8} y={13} width={1} height={2} fill="#ff004a" />
    </svg>
  );
}

const TECH = [
  { name: "Java", Icon: JavaIcon },
  { name: "React", Icon: ReactIcon },
  { name: "JS", Icon: JsIcon },
  { name: "TS", Icon: TsIcon },
  { name: "Node", Icon: NodeIcon },
  { name: "Docker", Icon: DockerIcon },
  { name: "K8s", Icon: K8sIcon },
  { name: "Postgres", Icon: PgIcon },
  { name: "Oracle", Icon: OracleIcon },
  { name: "Cloud", Icon: CloudIcon },
  { name: "Distrib.", Icon: DistributedIcon },
  { name: "Design Sys", Icon: DesignSystemIcon },
  { name: "Spring", Icon: SpringIcon },
  { name: "Quarkus", Icon: QuarkusIcon },
];

interface Props {
  size?: number;
  showLabels?: boolean;
}

export default function PixelTechIcons({ size = 48, showLabels = true }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "flex-start",
      }}
    >
      {TECH.map(({ name, Icon }) => (
        <div
          key={name}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Icon size={size} />
          {showLabels && (
            <span
              style={{
                fontFamily: "var(--font-pixel), 'Courier New', monospace",
                fontSize: "6px",
                color: "var(--retro-heading)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {name}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

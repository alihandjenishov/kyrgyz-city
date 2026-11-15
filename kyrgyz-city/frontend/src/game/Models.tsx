import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Location, Lang } from "../types";
export function Box({
  at = [0, 0, 0],
  size = [1, 1, 1],
  color = "#fff",
  ...rest
}: {
  at?: [number, number, number];
  size?: [number, number, number];
  color?: string;
  [key: string]: unknown;
}) {
  return (
    <mesh position={at} castShadow receiveShadow {...rest}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}
export function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.4, 3.6, 6]} />
        <meshStandardMaterial color="#8c7962" />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <icosahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color="#7f9d71" flatShading />
      </mesh>
      <mesh position={[0.7, 5.5, 0.2]} castShadow>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial color="#9ab284" flatShading />
      </mesh>
    </group>
  );
}
export function Bench({ x, z, rotate = 0 }: { x: number; z: number; rotate?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotate, 0]}>
      {[-0.7, 0.7].map((v) => (
        <Box key={v} at={[v, 0.5, 0]} size={[0.2, 1, 1]} color="#55675d" />
      ))}
      {[-0.36, 0, 0.36].map((v) => (
        <Box key={v} at={[0, 1, v]} size={[2.7, 0.15, 0.24]} color="#a38968" />
      ))}
      <Box at={[0, 1.65, -0.45]} size={[2.7, 0.6, 0.14]} color="#a38968" />
    </group>
  );
}
export function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box at={[0, 2.9, 0]} size={[0.16, 5.8, 0.16]} color="#52655b" />
      <Box at={[0.7, 5.7, 0]} size={[1.6, 0.13, 0.13]} color="#52655b" />
      <Box at={[1.3, 5.5, 0]} size={[0.7, 0.22, 0.5]} color="#f0dab1" />
    </group>
  );
}
export function Person({
  color = "#cd7259",
  outfit = "jacket",
  walking = false,
  walkingRef,
  motion = true,
  npc = false,
}: {
  color?: string;
  outfit?: string;
  walking?: boolean;
  walkingRef?: { current: boolean };
  motion?: boolean;
  npc?: boolean;
}) {
  const limbs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (limbs.current) {
      limbs.current.children.forEach((l, i) => {
        l.rotation.x =
          (walkingRef?.current ?? walking) && motion
            ? Math.sin(clock.elapsedTime * 10 + (i % 2) * Math.PI) * 0.5
            : npc && motion && i === 0
              ? Math.sin(clock.elapsedTime * 1.5) * 0.12
              : 0;
      });
    }
  });
  return (
    <group>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 2.38, 0.4]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshBasicMaterial color="#3f4237" />
        </mesh>
      ))}
      <mesh position={[0, 2.35, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color="#dab591" />
      </mesh>
      <mesh position={[0, 2.62, -0.08]} castShadow>
        <sphereGeometry args={[0.43, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={npc ? "#57463c" : "#493f36"} />
      </mesh>
      <Box at={[0, 1.6, 0]} size={[0.82, 0.9, 0.48]} color={color} />
      {outfit === "vest" && <Box at={[0, 1.62, 0.26]} size={[0.19, 0.8, 0.05]} color="#ecd2a9" />}
      <group ref={limbs}>
        {[-1, 1].map((s, i) => (
          <group key={`a${i}`} position={[s * 0.56, 1.95, 0]}>
            <Box at={[0, -0.4, 0]} size={[0.23, 0.8, 0.28]} color={color} />
            <Box at={[0, -0.83, 0]} size={[0.22, 0.2, 0.23]} color="#dab591" />
          </group>
        ))}
        {[-1, 1].map((s, i) => (
          <group key={`l${i}`} position={[s * 0.24, 1.15, 0]}>
            <Box at={[0, -0.45, 0]} size={[0.31, 0.9, 0.35]} color="#465c60" />
            <Box at={[0, -0.94, 0.1]} size={[0.36, 0.18, 0.6]} color="#343f3a" />
          </group>
        ))}
      </group>
      {!npc && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#f6d581" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
function Windows({ w, d, h }: { w: number; d: number; h: number }) {
  const items = [];
  for (let y = 2.7; y < h - 1; y += 3)
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3) {
      items.push(
        <group key={`${x}${y}`}>
          <Box at={[x, y, d / 2 + 0.06]} size={[1.4, 1.6, 0.12]} color="#668f94" />
          <Box at={[x, y, d / 2 + 0.14]} size={[0.08, 1.6, 0.05]} color="#e7ddc7" />
          <Box at={[x, y - 0.85, d / 2 + 0.16]} size={[1.7, 0.14, 0.35]} color="#f6e8d4" />
        </group>,
      );
    }
  return <>{items}</>;
}
export function Building({
  loc,
  lang,
  onNavigate,
  active,
  visited,
}: {
  loc: Location;
  lang: Lang;
  onNavigate: (l: Location) => void;
  active: boolean;
  visited: boolean;
}) {
  const [x, z] = loc.position,
    [w, d] = loc.size;
  const h =
    loc.kind === "hotel"
      ? 14
      : loc.kind === "school"
        ? 9
        : loc.kind === "market"
          ? 5
          : loc.kind === "cafe"
            ? 5.5
            : 7;
  if (loc.kind === "park")
    return (
      <group>
        <Box at={[x, 0.12, z]} size={[22, 0.25, 22]} color="#adc293" />
        <Box at={[x, 0.3, z]} size={[4, 0.15, 24]} color="#dbceb0" />
        <Box at={[x, 0.3, z]} size={[24, 0.15, 4]} color="#dbceb0" />
        <mesh position={[x, 0.8, z]} receiveShadow castShadow>
          <cylinderGeometry args={[4, 4.4, 1, 32]} />
          <meshStandardMaterial color="#d4d3c0" />
        </mesh>
        <mesh position={[x, 1.35, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.7, 32]} />
          <meshStandardMaterial color="#8bb4b2" />
        </mesh>
        <mesh position={[x, 2.2, z]} castShadow>
          <cylinderGeometry args={[0.4, 0.8, 2, 12]} />
          <meshStandardMaterial color="#eee1c6" />
        </mesh>
        {[
          [-7, -7],
          [7, -7],
          [-7, 7],
          [7, 7],
        ].map(([a, b], i) => (
          <Tree key={i} x={a} z={b} scale={0.85} />
        ))}
        <Bench x={-5} z={5} />
        <Bench x={5} z={-5} rotate={Math.PI} />
        <Html position={[x, 6, z]} center>
          <button
            className={`place-marker ${active ? "active" : ""}`}
            onClick={() => onNavigate(loc)}
          >
            <span>✿</span>
            {loc.title[lang]}
          </button>
        </Html>
      </group>
    );
  if (loc.kind === "bus")
    return (
      <group position={[x, 0, z]}>
        <Box at={[0, 3, -1.3]} size={[7, 5, 0.15]} color="#91aeb1" />
        <Box at={[0, 5.5, 0]} size={[8, 0.35, 4]} color="#4c7978" />
        {[-3, 3].map((a) => (
          <Box key={a} at={[a, 2.7, 0.8]} size={[0.16, 5.4, 0.16]} color="#52665e" />
        ))}
        <Bench x={0} z={0} />
        <Box at={[5, 3, 0]} size={[0.15, 6, 0.15]} color="#56695e" />
        <Box at={[5, 5.5, 0]} size={[1.4, 1.5, 0.2]} color="#f4d28d" />
        <Html position={[0, 8, 0]} center>
          <button className="place-marker" onClick={() => onNavigate(loc)}>
            ↗ {loc.title[lang]}
          </button>
        </Html>
      </group>
    );
  return (
    <group position={[x, 0, z]}>
      <Box at={[0, 0.3, 0]} size={[w + 2, 0.6, d + 2]} color="#dbd1bb" />
      <Box at={[0, h / 2 + 0.6, 0]} size={[w, h, d]} color={loc.color} />
      <Box at={[0, h + 0.7, 0]} size={[w + 1, 0.4, d + 1]} color="#f2e3c9" />
      <Windows w={w} d={d} h={h + 0.6} />
      <Box at={[0, 2, d / 2 + 0.12]} size={[2.1, 3, 0.15]} color="#4c6b63" />
      <Box at={[0.65, 1.9, d / 2 + 0.25]} size={[0.09, 0.3, 0.12]} color="#e7bb71" />
      <Box at={[0, 0.3, d / 2 + 1.2]} size={[4, 0.5, 2]} color="#e3dbc8" />
      {loc.kind === "home" && (
        <>
          <mesh position={[0, h + 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[w * 0.76, 4, 4]} />
            <meshStandardMaterial color="#a56b59" />
          </mesh>
          <Box at={[4, h + 2, -2]} size={[1.5, 3.5, 1.5]} color="#d9b8a0" />
          <Box at={[-3, 1.9, d / 2 + 1.4]} size={[2, 0.5, 1]} color="#9a815f" />
        </>
      )}
      {loc.kind === "school" && (
        <>
          <Box at={[0, h + 1.3, d / 2 - 0.5]} size={[6, 2, 2]} color="#f1e2c5" />
          <mesh position={[0, h + 1.6, d / 2 + 0.56]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.75, 0.75, 0.12, 24]} />
            <meshStandardMaterial color="#fff7df" />
          </mesh>
          <Box at={[0, h + 1.75, d / 2 + 0.66]} size={[0.09, 0.6, 0.05]} color="#67796c" />
          <Box at={[0, h + 1.5, d / 2 + 0.66]} size={[0.5, 0.09, 0.05]} color="#67796c" />
          <Box at={[8, h + 3, 0]} size={[0.1, 6, 0.1]} color="#737c6e" />
          <Box at={[9, h + 5, 0]} size={[2, 1.2, 0.06]} color="#be5f4c" />
        </>
      )}
      {loc.kind === "clinic" && (
        <>
          <Box at={[0, h + 1.7, 0]} size={[3, 2.8, 1]} color="#e5e5ce" />
          <Box at={[0, h + 1.7, 0.55]} size={[0.55, 2, 0.12]} color="#bf6a59" />
          <Box at={[0, h + 1.7, 0.55]} size={[2, 0.55, 0.12]} color="#bf6a59" />
        </>
      )}
      {["market", "cafe"].includes(loc.kind) && (
        <>
          <Box at={[0, h - 0.5, d / 2 + 1.4]} size={[w, 0.25, 3]} color="#d18064" />
          {Array.from({ length: Math.floor(w) }, (_, i) => (
            <Box
              key={i}
              at={[-w / 2 + i + 0.5, h - 0.65, d / 2 + 1.4]}
              size={[0.5, 0.45, 3]}
              color="#f3dec0"
            />
          ))}
          {[-w / 2 + 0.5, w / 2 - 0.5].map((a) => (
            <Box key={a} at={[a, 2.2, d / 2 + 2.5]} size={[0.15, 4.4, 0.15]} color="#e2c49b" />
          ))}
        </>
      )}
      {loc.kind === "market" &&
        [-6, 6].map((a, i) => (
          <group key={a}>
            <Box at={[a, 1.6, d / 2 + 1]} size={[3.2, 1.4, 1.8]} color="#a59068" />
            {[-0.8, 0, 0.8].map((b, j) => (
              <mesh key={b} position={[a + b, 2.5, d / 2 + 1]} castShadow>
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial color={i ? "#d6b55d" : j ? "#b76e4f" : "#89a066"} />
              </mesh>
            ))}
          </group>
        ))}
      {loc.kind === "cafe" &&
        [-5, 5].map((a) => (
          <group key={a} position={[a, 0, d / 2 + 6]}>
            <mesh position={[0, 1.6, 0]} castShadow>
              <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
              <meshStandardMaterial color="#eddbb7" />
            </mesh>
            <Box at={[0, 0.8, 0]} size={[0.15, 1.6, 0.15]} color="#6e7d69" />
            <Box at={[0, 2.7, 0]} size={[0.1, 5.4, 0.1]} color="#7f806c" />
            <mesh position={[0, 4.5, 0]} castShadow>
              <coneGeometry args={[2.8, 1, 8]} />
              <meshStandardMaterial color="#e7be85" />
            </mesh>
          </group>
        ))}
      {["bank", "library"].includes(loc.kind) && (
        <>
          {[-w / 2 + 2, -w / 2 + 4, w / 2 - 4, w / 2 - 2].map((a) => (
            <mesh key={a} position={[a, 3.7, d / 2 + 1]} castShadow>
              <cylinderGeometry args={[0.4, 0.5, 6.5, 12]} />
              <meshStandardMaterial color="#f1e4cc" />
            </mesh>
          ))}
          <Box at={[0, 7.3, d / 2 + 1]} size={[w, 0.5, 3]} color="#f1e4cc" />
          {loc.kind === "library" && (
            <mesh position={[0, 8.5, d / 2 + 0.7]} rotation={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[w / 2, w / 2, 2, 3]} />
              <meshStandardMaterial color="#bda989" />
            </mesh>
          )}
        </>
      )}
      {loc.kind === "hotel" && (
        <>
          <Box at={[0, h + 1.2, 0]} size={[w - 3, 1.3, d - 3]} color="#b58b75" />
          {[-4, 4].map((a) => (
            <Box key={a} at={[a, 6.2, d / 2 + 0.7]} size={[3, 0.2, 1.5]} color="#e9d2b5" />
          ))}
        </>
      )}
      <Html position={[0, h + (loc.kind === "home" ? 6 : 4), 0]} center>
        <button
          className={`place-marker ${active ? "active" : ""}`}
          onClick={() => onNavigate(loc)}
        >
          <span>
            {visited
              ? "✓"
              : {
                  home: "⌂",
                  school: "▤",
                  market: "♧",
                  cafe: "☕",
                  clinic: "✚",
                  library: "▥",
                  bank: "▦",
                  hotel: "✦",
                }[loc.kind]}
          </span>
          {loc.title[lang]}
          {active && <i />}
        </button>
      </Html>
    </group>
  );
}
export function Car({
  x,
  z,
  color = "#b87b64",
  rotation = 0,
}: {
  x: number;
  z: number;
  color?: string;
  rotation?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <Box at={[0, 0.85, 0]} size={[2.2, 1, 4.5]} color={color} />
      <Box at={[0, 1.7, 0]} size={[2, 1, 2.5]} color={color} />
      <Box at={[0, 1.7, 1.28]} size={[1.8, 0.65, 0.04]} color="#829c9b" />
      {[-1.1, 1.1].flatMap((a) =>
        [-1.4, 1.4].map((b) => (
          <mesh key={`${a}${b}`} position={[a, 0.6, b]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.5, 0.5, 0.3, 12]} />
            <meshStandardMaterial color="#46534e" />
          </mesh>
        )),
      )}
    </group>
  );
}

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { Box, Tree, Bench, Lamp, Person, Building, Car } from "./Models";
import { findPath, obstacles, canWalk, type Point, type Rect } from "./navigation";
import type { Location, Progress, Lang, Word } from "../types";
import { movementKeys, objectSpecs } from "./shared";
function Item({ kind }: { kind: string }) {
  switch (kind) {
    case "door":
      return (
        <>
          <Box at={[0, 2, 0]} size={[2.1, 4, 0.2]} color="#9d8968" />
          <Box at={[0.7, 2, 0.2]} size={[0.13, 0.2, 0.1]} color="#e4c786" />
        </>
      );
    case "kitchen":
      return (
        <>
          <Box at={[0, 1.4, 0]} size={[5, 2.8, 2]} color="#96ab92" />
          <Box at={[0, 2.85, 0]} size={[5.2, 0.2, 2.2]} color="#e4dcc3" />
          <Box at={[-1.2, 2.98, 0]} size={[1.7, 0.05, 1.4]} color="#9faeaa" />
          <Box at={[1.1, 1.6, 1.05]} size={[1.6, 1.5, 0.08]} color="#657f76" />
          {[-0.3, 0.3].flatMap((a) =>
            [-0.35, 0.35].map((b) => (
              <mesh key={`${a}${b}`} position={[1.1 + a, 3.02, b]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.2, 12]} />
                <meshStandardMaterial color="#61736b" />
              </mesh>
            )),
          )}
        </>
      );
    case "window":
      return (
        <>
          <Box at={[0, 3, 0]} size={[3.5, 3, 0.18]} color="#a7c3c2" />
          <Box at={[0, 3, 0.15]} size={[0.14, 3, 0.1]} color="#eee4ca" />
          <Box at={[0, 3, 0.15]} size={[3.5, 0.14, 0.1]} color="#eee4ca" />
        </>
      );
    case "mirror":
      return (
        <>
          <Box at={[0, 3, 0]} size={[2.5, 3.5, 0.2]} color="#b1986b" />
          <Box at={[0, 3, 0.15]} size={[2.2, 3.2, 0.06]} color="#bacfc9" />
        </>
      );
    case "bed":
      return (
        <>
          <Box at={[0, 0.6, 0]} size={[3, 1, 5]} color="#b78e66" />
          <Box at={[0, 1.3, 0]} size={[3.1, 0.6, 4.8]} color="#e5dcc5" />
          <Box at={[0, 1.7, -0.6]} size={[3.15, 0.2, 3.3]} color="#799e91" />
          <Box at={[0, 1.8, 1.5]} size={[2.6, 0.4, 1]} color="#fff0d8" />
        </>
      );
    case "table":
      return (
        <>
          <Box at={[0, 2, 0]} size={[4, 0.3, 2.8]} color="#ba946b" />
          {[-1.6, 1.6].flatMap((x) =>
            [-1, 1].map((z) => (
              <Box key={`${x}${z}`} at={[x, 1, z]} size={[0.2, 2, 0.2]} color="#927856" />
            )),
          )}
        </>
      );
    case "chair":
      return <Bench x={0} z={0} />;
    case "shelf":
      return (
        <>
          <Box at={[0, 3, 0]} size={[3, 6, 1.5]} color="#a58d67" />
          {[1, 3, 5].flatMap((y) =>
            [-1, -0.5, 0, 0.5, 1].map((x, i) => (
              <Box
                key={`${y}${x}`}
                at={[x, y, 0.85]}
                size={[0.35, 1.2, 0.5]}
                color={["#b96651", "#769c8c", "#ddbf7b"][i % 3]}
              />
            )),
          )}
        </>
      );
    case "plant":
    case "flower":
      return (
        <>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.8, 0.5, 1.4, 8]} />
            <meshStandardMaterial color="#b58a69" />
          </mesh>
          <Tree x={0} z={0} scale={0.5} />
          {kind === "flower" && (
            <mesh position={[0, 3, 0]}>
              <icosahedronGeometry args={[0.7, 0]} />
              <meshStandardMaterial color="#e6c35c" />
            </mesh>
          )}
        </>
      );
    case "bus":
      return (
        <>
          <Box at={[0, 2, 0]} size={[3, 3.5, 7]} color="#dbb96f" />
          <Box at={[0, 2.7, 3.55]} size={[2.7, 1.5, 0.1]} color="#8da8a4" />
          {[-2, 0, 2].map((z) => (
            <Box key={z} at={[-1.55, 2.7, z]} size={[0.1, 1.5, 1.3]} color="#8da8a4" />
          ))}
        </>
      );
    case "clock":
      return (
        <>
          <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 0.2, 24]} />
            <meshStandardMaterial color="#faf0d5" />
          </mesh>
          <Box at={[0, 3.3, 0.2]} size={[0.1, 0.8, 0.1]} color="#425d50" />
          <Box at={[0.3, 3, 0.2]} size={[0.7, 0.1, 0.1]} color="#425d50" />
        </>
      );
    default:
      return (
        <>
          <Box at={[0, 1, 0]} size={[2.8, 2, 2]} color="#ccb99a" />
          {["water", "bottle"].includes(kind) ? (
            <>
              <mesh position={[0, 2.8, 0]}>
                <cylinderGeometry args={[0.4, 0.5, 1.5, 12]} />
                <meshStandardMaterial color={kind === "water" ? "#91b9bd" : "#eee6cc"} />
              </mesh>
              <Box at={[0, 3.6, 0]} size={[0.65, 0.2, 0.65]} color="#5d897b" />
            </>
          ) : kind === "tea" ? (
            <>
              <mesh position={[0, 2.4, 0]}>
                <cylinderGeometry args={[0.7, 0.45, 0.8, 16]} />
                <meshStandardMaterial color="#eee7ce" />
              </mesh>
              <mesh position={[0, 2.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.58, 16]} />
                <meshStandardMaterial color="#a57445" />
              </mesh>
            </>
          ) : kind === "bread" ? (
            <mesh position={[0, 2.4, 0]} scale={[1, 0.5, 0.7]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#d4a15f" />
            </mesh>
          ) : kind === "apple" ? (
            <mesh position={[0, 2.6, 0]}>
              <icosahedronGeometry args={[0.65, 2]} />
              <meshStandardMaterial color="#c07452" />
            </mesh>
          ) : (
            <Box
              at={[0, 2.2, 0]}
              size={kind === "pen" ? [0.15, 0.12, 1.6] : [1.6, 0.2, 1.2]}
              color={
                {
                  money: "#91a77d",
                  passport: "#8c5651",
                  key: "#d6ad58",
                  book: "#7a9a8c",
                  ticket: "#e4d49d",
                  towel: "#c8ddd1",
                }[kind] ?? "#e0c794"
              }
            />
          )}
        </>
      );
  }
}
function Interior({
  loc,
  words,
  onWord,
  onTalk,
  lang,
}: {
  loc: Location;
  words: Word[];
  onWord: (w: Word) => void;
  onTalk: () => void;
  lang: Lang;
}) {
  return (
    <group>
      <Box
        at={[0, -0.25, 0]}
        size={[22, 0.5, 22]}
        color={loc.kind === "park" ? "#b5c89e" : "#ddd1b6"}
      />
      {!["park", "bus"].includes(loc.kind) ? (
        <>
          <Box at={[0, 2.5, -10]} size={[22, 5, 0.4]} color={loc.color} />
          <Box at={[-10, 2.5, 0]} size={[0.4, 5, 20]} color={loc.color} />
          <Box at={[-10, 5.1, 0]} size={[0.6, 0.25, 20]} color="#eddfc4" />
          <Box at={[0, 5.1, -10]} size={[22, 0.25, 0.6]} color="#eddfc4" />
        </>
      ) : (
        <>
          <Tree x={-9} z={-8} />
          <Tree x={9} z={8} />
          <Bench x={-7} z={8} />
        </>
      )}
      <Box at={[0, 0.05, 3]} size={[8, 0.06, 7]} color="#c99b7a" />
      {[-2, 0, 2].map((x) => (
        <Box key={x} at={[x, 0.1, 3]} size={[0.12, 0.03, 7]} color="#dfbd93" />
      ))}
      <Box at={[9, 0.1, 8]} size={[2, 0.1, 3]} color="#9eb397" />
      {(objectSpecs[loc.id] ?? []).map((o) => {
        const word = words.find((w) => w.id === o.word);
        return (
          <group
            key={o.word}
            position={[o.x, 0, o.z]}
            onClick={(e) => {
              e.stopPropagation();
              if (word) onWord(word);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "auto")}
          >
            <Item kind={o.kind} />
            <Html position={[0, o.kind === "window" || o.kind === "mirror" ? 5.5 : 4, 0]} center>
              <button
                className="object-dot"
                aria-label={word?.translations[lang]}
                onClick={() => word && onWord(word)}
              >
                ＋
              </button>
            </Html>
          </group>
        );
      })}
      <group
        position={[0, 0, -6]}
        onClick={(e) => {
          e.stopPropagation();
          onTalk();
        }}
      >
        <Person npc color="#688e81" />
        <Html position={[0, 4, 0]} center>
          <button className="place-marker active" onClick={onTalk}>
            {loc.npc.name} <span>···</span>
          </button>
        </Html>
      </group>
      <Tree x={8} z={-7} scale={0.5} />
    </group>
  );
}
function Pedestrian({ index, motion }: { index: number; motion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const time = motion ? clock.elapsedTime : 0;
      ref.current.position.set(
        ((time * (index % 2 ? 1 : -1) * 1.3 + index * 17 + 500) % 88) - 44,
        0,
        index % 2 ? -22.3 : 22.3,
      );
      ref.current.rotation.y = index % 2 ? Math.PI / 2 : -Math.PI / 2;
    }
  });
  return (
    <group ref={ref}>
      <Person
        npc
        walking
        motion={motion}
        color={["#9b8b6b", "#718a82", "#b38169", "#82936e"][index % 4]}
      />
    </group>
  );
}
function City({
  locations,
  lang,
  onNavigate,
  visited,
  active,
  onGround,
  motion,
}: {
  locations: Location[];
  lang: Lang;
  onNavigate: (l: Location) => void;
  visited: string[];
  active: string;
  onGround: (e: ThreeEvent<MouseEvent>) => void;
  motion: boolean;
}) {
  return (
    <group>
      <Box at={[0, -1, 0]} size={[106, 2, 106]} color="#bac8aa" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onGround}>
        <planeGeometry args={[104, 104]} />
        <meshStandardMaterial color="#c8d2b5" />
      </mesh>
      {[-17, 17].map((v) => (
        <group key={v}>
          <Box at={[v, 0.02, 0]} size={[8, 0.04, 104]} color="#81918b" />
          <Box at={[0, 0.03, v]} size={[104, 0.04, 8]} color="#81918b" />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Box at={[v + s * 5, 0.13, 0]} size={[2, 0.25, 104]} color="#ddd7c2" />
              <Box at={[0, 0.13, v + s * 5]} size={[104, 0.25, 2]} color="#ddd7c2" />
            </group>
          ))}
          {Array.from({ length: 23 }, (_, i) => (
            <group key={i}>
              <Box at={[v, 0.06, -48 + i * 4.3]} size={[0.15, 0.06, 1.5]} color="#d2d4bc" />
              <Box at={[-48 + i * 4.3, 0.07, v]} size={[1.5, 0.06, 0.15]} color="#d2d4bc" />
            </group>
          ))}
        </group>
      ))}
      {[-17, 17].flatMap((x) =>
        [-17, 17].flatMap((z) =>
          [-1, 1].map((s) => (
            <group key={`${x}${z}${s}`}>
              {[-2.6, -1.3, 0, 1.3, 2.6].map((a) => (
                <group key={a}>
                  <Box at={[x + a, 0.1, z + s * 6.3]} size={[0.65, 0.06, 2]} color="#ede7cf" />
                  <Box at={[x + s * 6.3, 0.1, z + a]} size={[2, 0.06, 0.65]} color="#ede7cf" />
                </group>
              ))}
            </group>
          )),
        ),
      )}
      {Array.from({ length: 6 }, (_, index) => (
        <Pedestrian key={index} index={index} motion={motion} />
      ))}
      {locations.map((loc) => (
        <Building
          key={loc.id}
          loc={loc}
          lang={lang}
          onNavigate={onNavigate}
          active={active === loc.id}
          visited={visited.includes(loc.id)}
        />
      ))}
      {[-44, 44].flatMap((x) =>
        [-42, -25, -5, 15, 35, 47].map((z, i) => (
          <Tree key={`${x}${z}`} x={x} z={z} scale={0.8 + (i % 3) * 0.15} />
        )),
      )}
      {[-42, -30, 30, 42].flatMap((x) =>
        [-45, 46].map((z) => <Tree key={`${x}${z}`} x={x} z={z} scale={0.8} />),
      )}
      {[-23, 23].flatMap((x) =>
        [-42, -8, 29, 46].map((z) => <Lamp key={`${x}${z}`} x={x} z={z} />),
      )}
      <Bench x={7} z={44} />
      <Bench x={-7} z={-44} />
      <Car x={-18.8} z={5} color="#a6b5ab" />
      <Car x={18.8} z={-30} color="#ce9a78" />
      <Car x={32} z={18.8} color="#e3c087" rotation={Math.PI / 2} />
      <Car x={-37} z={-18.8} color="#819c9b" rotation={Math.PI / 2} />
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i} position={[-85 + i * 22, -4, -90 - (i % 2) * 15]}>
          <mesh rotation={[0, i * 0.5, 0]} castShadow>
            <coneGeometry args={[20 + (i % 3) * 4, 32 + (i % 4) * 6, 5]} />
            <meshStandardMaterial color={i % 2 ? "#aabdb2" : "#b7c7b9"} flatShading />
          </mesh>
          <mesh position={[0, 11, 0]} rotation={[0, i * 0.5, 0]}>
            <coneGeometry args={[6, 10, 5]} />
            <meshStandardMaterial color="#e6e9dc" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}
interface Props {
  paused: boolean;
  overview: boolean;
  locations: Location[];
  words: Word[];
  p: Progress;
  target: { point: Point; id: number } | null;
  center: number;
  active: string;
  onNavigate: (l: Location) => void;
  onPosition: (p: Point) => void;
  onWord: (w: Word) => void;
  onTalk: () => void;
  onBlocked: () => void;
}
function World(props: Props) {
  const { p, locations } = props;
  const size = useThree((state) => state.size);
  const indoor = locations.find((l) => l.id === p.location);
  const player = useRef<THREE.Group>(null);
  const controls = useRef<any>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const pos = useRef(
    new THREE.Vector3(...([p.position[0], 0, p.position[1]] as [number, number, number])),
  );
  const path = useRef<Point[]>([]);
  const moving = useRef(false);
  const limbs = useRef<THREE.Group>(null);
  const last = useRef(0);
  const follow = useRef(false);
  const rects = useMemo(() => obstacles(locations), [locations]);
  const furniture = useMemo<Rect[]>(
    () =>
      indoor
        ? (objectSpecs[indoor.id] ?? [])
            .filter((o) => !["window", "mirror", "clock", "door"].includes(o.kind))
            .map((o) => ({
              x: o.x,
              z: o.z,
              w: o.kind === "bed" ? 3.4 : 2.7,
              d: o.kind === "bed" ? 5.4 : 2,
            }))
        : [],
    [indoor],
  );
  useEffect(() => {
    pos.current.set(indoor ? 0 : p.position[0], 0, indoor ? 8 : p.position[1]);
    path.current = [];
    follow.current = false;
    const c = camera.current;
    if (c) {
      const look = indoor || props.overview ? new THREE.Vector3() : pos.current.clone();
      c.position.set((indoor ? 25 : 90) + look.x, indoor ? 26 : 90, (indoor ? 30 : 100) + look.z);
      c.zoom = indoor
        ? Math.max(8, Math.min(22, Math.min(size.width, size.height) / 35))
        : props.overview
          ? Math.max(2.5, Math.min(8, size.width / 145))
          : Math.max(4, Math.min(10, Math.min(size.width, size.height) / 65));
      controls.current?.target.copy(look);
      c.updateProjectionMatrix();
    }
  }, [p.location, size.width, size.height, props.overview]);
  useEffect(() => {
    if (!props.target || indoor) return;
    const route = findPath([pos.current.x, pos.current.z], props.target.point, rects);
    path.current = route;
    follow.current = true;
    if (!route.length) props.onBlocked();
  }, [props.target]);
  useEffect(() => {
    if (controls.current && props.center) {
      controls.current.target.set(pos.current.x, 0, pos.current.z);
      follow.current = true;
    }
  }, [props.center]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        (e.target as HTMLElement)?.closest("input,textarea,select,button") ||
        document.querySelector('[role="dialog"]')
      )
        return;
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
          e.key.toLowerCase(),
        )
      ) {
        if (e.type === "keydown") {
          movementKeys.add(e.key.toLowerCase());
          e.preventDefault();
        } else movementKeys.delete(e.key.toLowerCase());
      }
    }
    function clear() {
      movementKeys.clear();
    }
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);
  useFrame((state, dt) => {
    dt = Math.min(0.05, dt);
    const q = pos.current;
    if (player.current) player.current.position.copy(q);
    if (props.paused) {
      moving.current = false;
      return;
    }
    const dx =
        (movementKeys.has("d") || movementKeys.has("arrowright") ? 1 : 0) -
        (movementKeys.has("a") || movementKeys.has("arrowleft") ? 1 : 0),
      dz =
        (movementKeys.has("s") || movementKeys.has("arrowdown") ? 1 : 0) -
        (movementKeys.has("w") || movementKeys.has("arrowup") ? 1 : 0);
    let vx = dx,
      vz = dz;
    if (dx || dz) {
      path.current = [];
      follow.current = true;
    } else if (path.current.length) {
      const goal = path.current[0];
      vx = goal[0] - q.x;
      vz = goal[1] - q.z;
      if (Math.hypot(vx, vz) < 0.25) {
        path.current.shift();
        vx = 0;
        vz = 0;
      }
    }
    const norm = Math.hypot(vx, vz);
    moving.current = norm > 0.01;
    if (norm) {
      vx = (vx / norm) * dt * 9;
      vz = (vz / norm) * dt * 9;
      const rs = indoor ? furniture : rects,
        limit = indoor ? 9 : 48;
      if (canWalk(q.x + vx, q.z, rs, limit)) q.x += vx;
      if (canWalk(q.x, q.z + vz, rs, limit)) q.z += vz;
      if (player.current) player.current.rotation.y = Math.atan2(vx, vz);
    }
    if (player.current) player.current.position.copy(q);
    if (limbs.current)
      limbs.current.position.y =
        p.motion && norm ? Math.sin(state.clock.elapsedTime * 17) * 0.06 : 0;
    if (follow.current && controls.current && camera.current) {
      const target = controls.current.target as THREE.Vector3;
      const desired = new THREE.Vector3(q.x, 0, q.z);
      const change = desired
        .clone()
        .sub(target)
        .multiplyScalar(Math.min(1, dt * 2));
      target.add(change);
      camera.current.position.add(change);
      controls.current.update();
    }
    if (!indoor && state.clock.elapsedTime - last.current > 0.3) {
      last.current = state.clock.elapsedTime;
      props.onPosition([q.x, q.z]);
    }
  });
  const ground = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    path.current = findPath([pos.current.x, pos.current.z], [e.point.x, e.point.z], rects);
    follow.current = true;
    if (!path.current.length) props.onBlocked();
  };
  return (
    <>
      <color attach="background" args={["#dce4d1"]} />
      <fog attach="fog" args={["#dce4d1", 170, 330]} />
      <OrthographicCamera
        ref={camera}
        makeDefault
        position={[90, 90, 100]}
        zoom={7.5}
        near={0.1}
        far={500}
      />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI * 0.43}
        minPolarAngle={0.3}
        minZoom={2.5}
        maxZoom={35}
        onStart={() => (follow.current = false)}
      />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#fff6df", "#abbda3", 1.6]} />
      <directionalLight
        position={[-40, 70, 35]}
        intensity={2.5}
        castShadow={p.quality !== "low"}
        shadow-mapSize={p.quality === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-camera-far={180}
        shadow-bias={-0.001}
      />
      {indoor ? (
        <Interior
          loc={indoor}
          words={props.words}
          onWord={props.onWord}
          onTalk={props.onTalk}
          lang={p.lang}
        />
      ) : (
        <City
          locations={locations}
          lang={p.lang}
          onNavigate={props.onNavigate}
          visited={p.visited}
          active={props.active}
          onGround={ground}
          motion={p.motion}
        />
      )}
      <group ref={player}>
        <group ref={limbs}>
          <Person color={p.color} outfit={p.outfit} motion={p.motion} walkingRef={moving} />
        </group>
      </group>
    </>
  );
}
export default function CityScene(props: Props) {
  return (
    <Canvas
      shadows={props.p.quality !== "low"}
      dpr={props.p.quality === "low" ? 1 : props.p.quality === "high" ? [1, 2] : [1, 1.4]}
      gl={{
        antialias: props.p.quality !== "low",
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}

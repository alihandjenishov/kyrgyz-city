import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Mountain,
  Map,
  BookOpen,
  Bookmark,
  Flag,
  Mic,
  ChartNoAxesCombined,
  Settings,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Check,
  Star,
  Search,
  Sun,
  Compass,
  LocateFixed,
  Plus,
  Minus,
  HelpCircle,
  Home,
  Menu,
  X,
  Download,
  Volume2,
  Leaf,
  Sparkles,
  Shield,
} from "lucide-react";
import type { Catalogue, Progress, Lang, Location, Word, Lesson, Dialogue } from "./types";
import { t, languageNames } from "./localization";
import {
  restore,
  initialProgress,
  STORAGE_KEY,
  rewardOnce,
  applyEvent,
  scheduleReview,
} from "./state/progress";
import { Modal } from "./components/Modal";
import { WordCard, LessonPlayer, DialoguePlayer, MiniMap } from "./components/Learning";
import { Recorder } from "./audio/Recorder";
import { interiorWordIds, movementKeys } from "./game/shared";
import { canWalk, obstacles } from "./game/navigation";
const CityScene = lazy(() => import("./game/CityScene"));
type Page =
  | "home"
  | "city"
  | "lessons"
  | "dictionary"
  | "missions"
  | "practice"
  | "progress"
  | "about"
  | "privacy";
type Window =
  | { type: "word"; word: Word }
  | { type: "lesson"; lesson: Lesson }
  | { type: "dialogue"; dialogue: Dialogue; location: Location }
  | { type: "avatar" }
  | { type: "settings" }
  | { type: "help" }
  | { type: "map" }
  | null;
const nav = [
  ["city", Map],
  ["lessons", BookOpen],
  ["dictionary", Bookmark],
  ["missions", Flag],
  ["practice", Mic],
  ["progress", ChartNoAxesCombined],
] as const;
function currentPage(): Page {
  const hash = location.hash.slice(1);
  if (["dictionary", "missions", "practice", "progress"].includes(hash)) return hash as Page;
  const s = location.pathname;
  if (s.startsWith("/game")) return "city";
  if (s.startsWith("/lessons")) return "lessons";
  if (s === "/about") return "about";
  if (s === "/privacy") return "privacy";
  return "home";
}
class SceneBoundary extends Component<{ children: ReactNode; lang: Lang }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <Mountain size={60} />
        <p>{t("webglError", this.props.lang)}</p>
        <a className="btn primary" href={`/lessons/${this.props.lang}`}>
          {t("lessons", this.props.lang)}
        </a>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [data, setData] = useState<Catalogue | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const names = ["vocabulary", "lessons", "locations", "dialogues", "quests"] as const;
    Promise.all(
      names.map(async (n) => {
        const r = await fetch("/api/" + n);
        if (!r.ok) throw Error(n);
        return [n, await r.json()];
      }),
    )
      .then((rows) => setData(Object.fromEntries(rows) as Catalogue))
      .catch(() => setError(true));
  }, []);
  if (!data)
    return (
      <div className="loading-screen">
        <div className="brand-symbol">
          <Mountain />
        </div>
        <h1>Kyrgyz City</h1>
        <p>{t(error ? "loadError" : "loading", "ru")}</p>
        {error && (
          <button className="btn primary" onClick={() => location.reload()}>
            ↻
          </button>
        )}
      </div>
    );
  return <Application data={data} />;
}
function Application({ data }: { data: Catalogue }) {
  const [p, setP] = useState<Progress>(() => {
    let saved: Progress;
    try {
      saved = restore(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = initialProgress();
    }
    const routeLang =
      location.pathname.split("/")[2] || new URLSearchParams(location.search).get("lang");
    if (["ru", "en", "ky"].includes(routeLang ?? "")) saved.lang = routeLang as Lang;
    if (saved.location && !data.locations.some((l) => l.id === saved.location))
      saved.location = null;
    if (!canWalk(...saved.position, obstacles(data.locations))) saved.position = [-31, 40];
    return saved;
  });
  const [page, setPage] = useState<Page>(currentPage),
    [win, setWin] = useState<Window>(null),
    [toast, setToast] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [mobileMenu, setMobileMenu] = useState(false),
    [target, setTarget] = useState<{
      point: [number, number];
      id: number;
    } | null>(null),
    [center, setCenter] = useState(0),
    [selected, setSelected] = useState<Location | null>(null),
    [finding, setFinding] = useState(false),
    [saveError, setSaveError] = useState(false);
  const current = useRef(p);
  current.current = p;
  const L = p.lang;
  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.documentElement.lang = L;
    document.title = `Kyrgyz City — ${t(page === "home" ? "learn" : page, L)}`;
  }, [page, L]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, lastPlayed: Date.now() }));
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [p]);
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current.current));
      } catch {}
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  useEffect(() => {
    const listener = () => setPage(currentPage());
    window.addEventListener("popstate", listener);
    document.getElementById("text-lessons")?.classList.add("enhanced");
    const detail = location.pathname.split("/")[3];
    const lesson = data.lessons.find((l) => l.id === detail);
    if (lesson) setWin({ type: "lesson", lesson });
    return () => window.removeEventListener("popstate", listener);
  }, []);
  function go(next: Page) {
    setPage(next);
    setMobileMenu(false);
    setSearch("");
    setFilter("all");
    const url =
      next === "home"
        ? "/"
        : next === "city"
          ? "/game"
          : next === "lessons"
            ? `/lessons/${L}`
            : next === "about" || next === "privacy"
              ? `/${next}`
              : `/game#${next}`;
    history.pushState({}, "", url);
  }
  function update(fn: (p: Progress) => Progress) {
    setP((old) => fn(old));
  }
  function event(old: Progress, e: string, id: string) {
    const next = applyEvent(old, e, id, data.quests);
    if (next.completedQuests.length > old.completedQuests.length)
      setTimeout(() => notify(`${t("missionDone", L)} +60 XP`), 0);
    return next;
  }
  const quest = data.quests.find((q) => q.id === p.activeQuest) ?? data.quests[0],
    stepIndex = p.questSteps[quest.id] ?? 0,
    step = quest.steps[stepIndex];
  const indoor = data.locations.find((l) => l.id === p.location),
    near = !indoor
      ? data.locations.find(
          (l) => Math.hypot(p.position[0] - l.entrance[0], p.position[1] - l.entrance[1]) < 3.3,
        )
      : undefined;
  function start() {
    if (p.started) go("city");
    else setWin({ type: "avatar" });
  }
  function walk(loc: Location) {
    setSelected(loc);
    if (!p.started) {
      setWin({ type: "avatar" });
      return;
    }
    if (p.location) {
      update((old) => ({ ...old, location: null }));
    }
    go("city");
    setTimeout(() => setTarget({ point: loc.entrance, id: Date.now() }), 50);
    notify(t("routeReady", L));
  }
  function enter(loc: Location) {
    movementKeys.clear();
    update((old) =>
      event(
        {
          ...old,
          location: loc.id,
          position: loc.entrance,
          visited: Array.from(new Set([...old.visited, loc.id])),
        },
        "visit",
        loc.id,
      ),
    );
    setSelected(null);
    setTarget(null);
    setFinding(false);
  }
  function leave() {
    update((old) => ({ ...old, location: null }));
    setFinding(false);
  }
  function openWord(word: Word) {
    if (finding) {
      if (word.id === "home-3") {
        notify(t("findCorrect", L));
        setFinding(false);
        update((old) => event(rewardOnce(old, "learned", word.id, 5), "word", word.id));
      } else {
        notify(t("findWrong", L));
        return;
      }
    }
    setWin({ type: "word", word });
  }
  function talk() {
    if (indoor) {
      const dialogue = data.dialogues.find((d) => d.id === indoor.dialogue)!;
      setWin({ type: "dialogue", dialogue, location: indoor });
    }
  }
  const onPosition = useCallback((point: [number, number]) => {
    setP((old) =>
      Math.hypot(old.position[0] - point[0], old.position[1] - point[1]) > 0.05
        ? { ...old, position: point }
        : old,
    );
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (win || document.querySelector('[role="dialog"]')) return;
      if (e.key === "Escape") {
        movementKeys.clear();
        setWin({ type: "settings" });
      }
      if (e.key.toLowerCase() === "e" && page === "city") {
        if (indoor) talk();
        else if (near) enter(near);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [win, near?.id, indoor?.id, page]);
  useEffect(() => {
    if (win) movementKeys.clear();
  }, [win]);
  function answer(id: string, correct: boolean) {
    update((old) => ({
      ...(correct ? rewardOnce(old, "learned", id, 5) : old),
      reviews: {
        ...old.reviews,
        [id]: scheduleReview(old.reviews[id], correct),
      },
    }));
  }
  function completeLesson(lesson: Lesson) {
    update((old) => event(rewardOnce(old, "lessons", lesson.id, 30), "lesson", lesson.id));
  }
  function favorite(id: string) {
    update((old) => ({
      ...old,
      favorites: old.favorites.includes(id)
        ? old.favorites.filter((x) => x !== id)
        : [...old.favorites, id],
    }));
  }
  const due = data.vocabulary.filter(
    (w) => p.learned.includes(w.id) && (!p.reviews[w.id] || p.reviews[w.id].due <= Date.now()),
  );
  const activeTarget =
    step?.event === "visit" || step?.event === "dialogue"
      ? step.target
      : step?.event === "lesson"
        ? data.lessons.find((l) => l.id === step.target)?.location
        : "home";
  function changeLanguage(lang: Lang) {
    update((old) => ({ ...old, lang }));
    const url = new URL(location.href);
    if (url.pathname.startsWith("/lessons/")) {
      const parts = url.pathname.split("/");
      parts[2] = lang;
      url.pathname = parts.join("/");
    } else url.searchParams.set("lang", lang);
    history.replaceState({}, "", url.pathname + url.search + url.hash);
  }
  const languageSelect = (
    <select
      aria-label={t("language", L)}
      value={L}
      onChange={(e) => changeLanguage(e.target.value as Lang)}
    >
      {Object.entries(languageNames).map(([id, name]) => (
        <option key={id} value={id}>
          {name}
        </option>
      ))}
    </select>
  );
  const questCard = (
    <div className="quest-card">
      <div className="eyebrow">
        <span className="quest-dot" />
        {t("currentMission", L)}
        <Flag size={14} />
      </div>
      <h3>{quest.title[L]}</h3>
      {quest.steps.map((s, i) => (
        <div
          className={`quest-step ${i < stepIndex ? "done" : i === stepIndex ? "current" : ""}`}
          key={i}
        >
          <span>{i < stepIndex ? <Check size={12} /> : i + 1}</span>
          <p>{s.text[L]}</p>
        </div>
      ))}
      <footer>
        <span>✦ {quest.xp} XP</span>
        <button onClick={() => go("missions")}>
          {t("missions", L)}
          <ChevronRight size={14} />
        </button>
      </footer>
    </div>
  );
  function scene() {
    return (
      <SceneBoundary lang={L}>
        <Suspense fallback={<div className="scene-fallback">{t("loading", L)}</div>}>
          <CityScene
            paused={!!win || page === "home"}
            overview={page === "home"}
            locations={data.locations}
            words={data.vocabulary}
            p={page === "home" ? { ...p, location: null } : p}
            target={target}
            center={center}
            active={activeTarget ?? ""}
            onNavigate={walk}
            onPosition={page === "city" ? onPosition : () => {}}
            onWord={openWord}
            onTalk={talk}
            onBlocked={() => notify(t("noRoute", L))}
          />
        </Suspense>
      </SceneBoundary>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="brand-symbol">
            <Mountain size={25} />
          </span>
          <span>
            Kyrgyz
            <span className="brand-city">
              City<span className="brand-point">.</span>
            </span>
          </span>
        </a>
        <div className="sidebar-caption">LEARN THROUGH ADVENTURE</div>
        <nav>
          {nav.map(([id, Icon]) => (
            <button
              key={id}
              className={page === id || (page === "home" && id === "city") ? "active" : ""}
              onClick={() => go(id)}
            >
              <Icon size={20} />
              <span>{t(id, L)}</span>
              {id === "dictionary" && p.learned.length > 0 && <small>{p.learned.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Leaf size={20} />
            <strong>{t("firstSteps", L)}</strong>
            <span>{t("free", L)}</span>
          </div>
          <button onClick={() => setWin({ type: "settings" })}>
            <Settings size={18} />
            {t("settings", L)}
          </button>
          <button onClick={() => go("about")}>
            <HelpCircle size={18} />
            {t("about", L)}
          </button>
          <button className="privacy-link" onClick={() => go("privacy")}>
            {t("privacy", L)}
          </button>
        </div>
      </aside>
      {mobileMenu && <div className="sidebar-shade" onClick={() => setMobileMenu(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-toggle"
            aria-label="Menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            <span>Kyrgyz City</span>
            <ChevronRight size={13} />
            <strong>{t(page === "home" ? "welcome" : page, L)}</strong>
          </div>
          <div className="topbar-right">
            <div className="xp-pill">
              <Sparkles size={15} />
              <strong>{p.xp}</strong> XP
            </div>
            {languageSelect}
            <button
              className="avatar-button"
              aria-label={t("createAvatar", L)}
              onClick={() => setWin({ type: "avatar" })}
              style={{ background: p.color }}
            >
              {Array.from(p.name)[0]}
            </button>
          </div>
        </header>
        <main className={`main-content ${page === "city" ? "game-content" : ""}`}>
          {page === "home" && (
            <>
              <section className="hero">
                <div className="hero-scene">{scene()}</div>
                <div className="hero-gradient" />
                <div className="hero-copy">
                  <div className="overline">
                    <span /> {t("free", L)}
                  </div>
                  <h1>
                    {t("learn", L)}
                    <br />
                    <em>{t("live", L)}</em>
                  </h1>
                  <p>{t("hero", L)}</p>
                  <button className="btn primary large" onClick={start}>
                    {t(p.started ? "continue" : "play", L)}
                    <ArrowRight size={19} />
                  </button>
                  <button className="text-button" onClick={() => setWin({ type: "help" })}>
                    <span className="play-circle">▷</span>
                    {t("how", L)}
                  </button>
                  <div className="hero-facts">
                    <span>
                      <Map size={16} />
                      10 {t("allLocations", L).toLocaleLowerCase()}
                    </span>
                    <span>
                      <BookOpen size={16} />
                      18 {t("lessons", L).toLocaleLowerCase()}
                    </span>
                    <span>
                      <Star size={16} />
                      160 {t("words", L)}
                    </span>
                  </div>
                </div>
                <div className="hello-card">
                  <span>Салам!</span>
                  <small>{t("welcomesub", L)}</small>
                  <div className="ornament">⌘</div>
                </div>
                <div className="scene-caption">
                  <span>✦</span> БИШКЕКТЕН ШЫКТАНГАН <i />
                </div>
              </section>
              <section className="discovery">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{t("newAdventure", L)}</span>
                    <h2>{t("explore", L)}</h2>
                    <p>{t("exploreSub", L)}</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => {
                      go("city");
                      setWin({ type: "map" });
                    }}
                  >
                    {t("allLocations", L)}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="location-grid">
                  {data.locations.slice(0, 6).map((loc, i) => (
                    <button className="location-card" key={loc.id} onClick={() => walk(loc)}>
                      <LocationArt kind={loc.kind} color={loc.color} />
                      <div>
                        <span className="eyebrow">
                          {String(i + 1).padStart(2, "0")} · {loc.ky}
                        </span>
                        <h3>{loc.title[L]}</h3>
                        <span>
                          {data.lessons.filter((l) => l.location === loc.id).length}{" "}
                          {t("lessons", L).toLocaleLowerCase()} <ChevronRight size={16} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
              <section className="home-bottom">
                <div>
                  <span className="eyebrow">Ө · Ү · Ң</span>
                  <h2>{t("phonetics", L)}</h2>
                  <p>{t("recordPrivacy", L)}</p>
                  <button className="btn secondary" onClick={() => go("practice")}>
                    <Mic size={17} />
                    {t("practice", L)}
                  </button>
                </div>
                {questCard}
              </section>
            </>
          )}
          {page === "city" && (
            <div className="game-layout">
              <div className="game-scene">{scene()}</div>
              <div className="game-top-left">
                <span className="weather-chip">
                  <Sun size={17} />
                  {indoor ? indoor.title[L] : "Kyrgyz City"}
                  <span>·</span>
                  {indoor ? indoor.ky : "22°"}
                </span>
                {indoor && (
                  <button className="btn secondary compact" onClick={leave}>
                    <ArrowLeft size={16} />
                    {t("exit", L)}
                  </button>
                )}
              </div>
              <div className="game-quest">{questCard}</div>
              <div className="camera-tools">
                <button
                  className="icon-btn"
                  aria-label={t("center", L)}
                  onClick={() => setCenter((v) => v + 1)}
                >
                  <LocateFixed size={21} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={t("map", L)}
                  onClick={() => setWin({ type: "map" })}
                >
                  <Map size={21} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={t("how", L)}
                  onClick={() => setWin({ type: "help" })}
                >
                  <HelpCircle size={21} />
                </button>
              </div>
              <div className="game-minimap">
                <MiniMap
                  locations={data.locations}
                  position={p.position}
                  visited={p.visited}
                  onSelect={(id) => walk(data.locations.find((l) => l.id === id)!)}
                  lang={L}
                />
              </div>
              {!indoor && near && (
                <div className="enter-prompt">
                  <span className="keycap">E</span>
                  <div>
                    <strong>{near.ky}</strong>
                    <small>{near.title[L]}</small>
                  </div>
                  <button className="btn primary compact" onClick={() => enter(near)}>
                    {t("enter", L)}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {selected && !near && !indoor && (
                <div className="route-chip">
                  <Compass size={16} />
                  {selected.title[L]} <span>· {t("clickWalk", L)}</span>
                  <button
                    className="icon-btn"
                    aria-label={t("close", L)}
                    onClick={() => setSelected(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {indoor && (
                <div className="interior-dock">
                  <div>
                    <span className="eyebrow">{finding ? t("findStart", L) : t("objects", L)}</span>
                    <div className="object-buttons">
                      {interiorWordIds(indoor.id).map((id) => {
                        const w = data.vocabulary.find((w) => w.id === id);
                        return (
                          w && (
                            <button key={id} onClick={() => openWord(w)}>
                              {finding ? "?" : w.translations[L]}
                              <Plus size={13} />
                            </button>
                          )
                        );
                      })}
                    </div>
                  </div>
                  <div className="interior-actions">
                    <button className="btn primary" onClick={talk}>
                      <span>···</span>
                      {indoor.npc.name}
                    </button>
                    {indoor.id === "home" && (
                      <button className="btn secondary" onClick={() => setFinding(!finding)}>
                        {t("findObject", L)}
                      </button>
                    )}
                    <button
                      className="btn secondary"
                      onClick={() =>
                        setWin({
                          type: "lesson",
                          lesson: data.lessons.find((l) => l.location === indoor.id)!,
                        })
                      }
                    >
                      <BookOpen size={16} />
                      {t("lesson", L)}
                    </button>
                  </div>
                </div>
              )}
              <div className="mobile-dpad">
                {[
                  ["w", "↑"],
                  ["a", "←"],
                  ["s", "↓"],
                  ["d", "→"],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      movementKeys.add(k);
                    }}
                    onPointerUp={() => movementKeys.delete(k)}
                    onPointerCancel={() => movementKeys.delete(k)}
                    aria-label={label}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="game-hint">{t("controls", L)}</div>
            </div>
          )}
          {page === "lessons" && (
            <>
              <PageHeading eyebrow="A0 → A1" title={t("lessons", L)} text={t("firstSteps", L)} />
              <div className="filter-row">
                {["all", "A0", "A1"].map((f) => (
                  <button
                    className={`chip ${filter === f ? "active" : ""}`}
                    key={f}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? t("all", L) : f}
                  </button>
                ))}
                <span className="muted">{t("stages", L)}</span>
                <a className="text-button" href={`/lessons/${L}?text=1`}>
                  HTML ↗
                </a>
              </div>
              <div className="lesson-grid">
                {data.lessons
                  .filter((l) => filter === "all" || l.level === filter)
                  .map((lesson, i) => (
                    <button
                      key={lesson.id}
                      className="lesson-card"
                      onClick={() => setWin({ type: "lesson", lesson })}
                    >
                      <div className={`lesson-icon tone-${i % 4}`}>
                        <BookOpen size={24} />
                      </div>
                      <span className="tag">{lesson.level}</span>
                      <h3>{lesson.title[L]}</h3>
                      <p>
                        {lesson.word_ids.length} {t("words", L)} · {lesson.minutes}{" "}
                        {t("minutes", L)}
                      </p>
                      <div className="lesson-card-bottom">
                        {p.lessons.includes(lesson.id) ? (
                          <span className="green">
                            <Check size={16} />
                            {t("completed", L)}
                          </span>
                        ) : (
                          <span>
                            {t("start", L)}
                            <ArrowRight size={16} />
                          </span>
                        )}
                        <div className="star-row">
                          {[0, 1, 2].map((n) => (
                            <Star
                              size={13}
                              key={n}
                              fill={p.lessons.includes(lesson.id) ? "#d6ae57" : "none"}
                              color={p.lessons.includes(lesson.id) ? "#d6ae57" : "#cfcebf"}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
              <p className="notice">{t("editorial", L)}</p>
            </>
          )}
          {page === "dictionary" && (
            <>
              <PageHeading
                eyebrow={`${p.learned.length} / ${data.vocabulary.length}`}
                title={t("dictionary", L)}
                text={t("exploreSub", L)}
              />
              <div className="filter-row">
                <div className="search-input">
                  <Search size={18} />
                  <input
                    aria-label={t("search", L)}
                    placeholder={t("search", L)}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {["all", "learned", "favorites", "due"].map((f) => (
                  <button
                    key={f}
                    className={`chip ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {t(f, L)}
                    {f === "due" && ` · ${due.length}`}
                  </button>
                ))}
              </div>
              <div className="word-list">
                {data.vocabulary
                  .filter(
                    (w) =>
                      (filter === "all" ||
                        (filter === "learned" && p.learned.includes(w.id)) ||
                        (filter === "favorites" && p.favorites.includes(w.id)) ||
                        (filter === "due" && due.some((d) => d.id === w.id))) &&
                      `${w.ky} ${w.translations[L]}`
                        .toLocaleLowerCase()
                        .includes(search.toLocaleLowerCase()),
                  )
                  .map((w) => (
                    <div className="word-row" key={w.id}>
                      <button
                        className={`icon-btn ${p.favorites.includes(w.id) ? "gold" : ""}`}
                        aria-label={`${t("favorites", L)} ${w.ky}`}
                        onClick={() => favorite(w.id)}
                      >
                        <Star
                          size={17}
                          fill={p.favorites.includes(w.id) ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        className="word-main"
                        onClick={() => setWin({ type: "word", word: w })}
                      >
                        <strong lang="ky">{w.ky}</strong>
                        <span>{w.translations[L]}</span>
                      </button>
                      <small>{w.context[L]}</small>
                      {p.learned.includes(w.id) && <Check className="green" size={17} />}
                      <button
                        className="icon-btn"
                        aria-label={t("open", L)}
                        onClick={() => setWin({ type: "word", word: w })}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ))}
              </div>
              {due.length > 0 && (
                <button
                  className="btn primary floating-review"
                  onClick={() => {
                    const word = due[0];
                    const source = data.lessons.find((l) => l.word_ids.includes(word.id))!;
                    setWin({
                      type: "lesson",
                      lesson: {
                        ...source,
                        id: source.id,
                        word_ids: [word.id, ...source.word_ids.filter((id) => id !== word.id)],
                      },
                    });
                  }}
                >
                  {t("review", L)} · {due.length}
                  <ArrowRight size={17} />
                </button>
              )}
            </>
          )}
          {page === "missions" && (
            <>
              <PageHeading
                eyebrow={`${p.completedQuests.length} / ${data.quests.length}`}
                title={t("missions", L)}
                text={t("newAdventure", L)}
              />
              <div className="mission-grid">
                {data.quests.map((q, i) => (
                  <div
                    className={`mission-card ${p.activeQuest === q.id ? "selected" : ""}`}
                    key={q.id}
                  >
                    <div className="mission-number">
                      {p.completedQuests.includes(q.id) ? (
                        <Check />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </div>
                    <div>
                      <h3>{q.title[L]}</h3>
                      <p className="muted">
                        {q.steps.length} {t("task", L).toLocaleLowerCase()} · {q.xp} XP
                      </p>
                      {q.steps.map((s, n) => (
                        <p
                          className={`mission-step ${n < (p.questSteps[q.id] ?? 0) ? "green" : ""}`}
                          key={n}
                        >
                          {n < (p.questSteps[q.id] ?? 0) ? "✓" : "○"} {s.text[L]}
                        </p>
                      ))}
                      <button
                        className="btn secondary compact"
                        disabled={p.completedQuests.includes(q.id)}
                        onClick={() => {
                          update((old) => ({ ...old, activeQuest: q.id }));
                          go("city");
                        }}
                      >
                        {t(
                          p.completedQuests.includes(q.id)
                            ? "completed"
                            : p.activeQuest === q.id
                              ? "continue"
                              : "start",
                          L,
                        )}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {page === "practice" && (
            <>
              <PageHeading eyebrow="Ө · Ү · Ң" title={t("practice", L)} text={t("phonetics", L)} />
              <div className="practice-layout">
                <div className="practice-notes">
                  <div className="sound-letters">
                    <span>Ө</span>
                    <span>Ү</span>
                    <span>Ң</span>
                  </div>
                  <h3>{t("phonetics", L)}</h3>
                  <p>{data.lessons.find((l) => l.id === "sounds")!.note[L]}</p>
                  <p className="notice">{t("noAudio", L)}</p>
                  {data.vocabulary
                    .filter((w) => w.category === "sounds")
                    .map((w) => (
                      <button
                        className={`practice-word ${search === w.id ? "active" : ""}`}
                        onClick={() => setSearch(w.id)}
                        key={w.id}
                      >
                        <strong lang="ky">{w.ky}</strong>
                        <span>{w.translations[L]}</span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                </div>
                <div className="practice-record">
                  <span className="eyebrow">{t("record", L)}</span>
                  <h2 lang="ky">{data.vocabulary.find((w) => w.id === search)?.ky ?? "Өрүк"}</h2>
                  <p className="muted">
                    {data.vocabulary.find((w) => w.id === search)?.example ?? "Өрүк бышты."}
                  </p>
                  <Recorder lang={L} text={search || "Өрүк"} />
                </div>
              </div>
            </>
          )}
          {page === "progress" && (
            <>
              <PageHeading eyebrow={p.name} title={t("progress", L)} text={t("localSave", L)} />
              <div className="stats-grid">
                {[
                  [p.xp, "XP"],
                  [p.learned.length, t("words", L)],
                  [p.lessons.length, t("lessons", L)],
                  [p.visited.length, t("visited", L)],
                ].map(([value, label]) => (
                  <div className="stat" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="progress-columns">
                <section className="panel">
                  <h3>
                    {t("level", L)} {Math.floor(p.xp / 150) + 1}
                  </h3>
                  <div className="bar">
                    <i style={{ width: `${((p.xp % 150) / 150) * 100}%` }} />
                  </div>
                  <p className="muted">{p.xp % 150} / 150 XP</p>
                  <h3>{t("achievements", L)}</h3>
                  {[
                    ["aFirst", p.learned.length >= 1],
                    ["aTen", p.learned.length >= 10],
                    ["aTalk", p.dialogues.length >= 1],
                    ["aMission", p.completedQuests.length >= 1],
                    ["aExplore", p.visited.length >= 10],
                  ].map(([key, yes]) => (
                    <div className={`achievement ${yes ? "earned" : ""}`} key={String(key)}>
                      <span>
                        <Star size={19} />
                      </span>
                      <strong>{t(String(key), L)}</strong>
                      {yes && <Check size={18} />}
                    </div>
                  ))}
                </section>
                <section className="panel">
                  <h3>
                    {t("due", L)} · {due.length}
                  </h3>
                  <p className="muted">{t("noPunishment", L)}</p>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      go("dictionary");
                      setFilter("due");
                    }}
                  >
                    {t("review", L)}
                    <ArrowRight size={16} />
                  </button>
                  <h3>{t("recent", L)}</h3>
                  {p.activity.length ? (
                    p.activity.map((a, i) => {
                      const [kind, id] = a.split(":");
                      const title =
                        kind === "learned"
                          ? data.vocabulary.find((w) => w.id === id)?.ky
                          : kind === "lessons"
                            ? data.lessons.find((l) => l.id === id)?.title[L]
                            : data.locations.find((l) => l.id === id)?.title[L];
                      return (
                        <p className="activity" key={i}>
                          <Check size={15} />
                          {title}
                        </p>
                      );
                    })
                  ) : (
                    <p className="muted">{t("noActivity", L)}</p>
                  )}
                </section>
              </div>
            </>
          )}
          {(page === "about" || page === "privacy") && (
            <>
              <PageHeading
                eyebrow="KYRGYZ CITY"
                title={t(page === "about" ? "aboutTitle" : "privacy", L)}
                text={t(page === "about" ? "aboutText" : "recordPrivacy", L)}
              />
              <div className="about-panel">
                {page === "about" ? (
                  <>
                    <Mountain size={55} />
                    <p className="lead">{t("credits", L)}</p>
                    <div className="authors">
                      {["Шабданов Эмир", "Дженишов Алихан", "Исламбеков Алишер"].map((name, i) => (
                        <div key={name}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <strong>{name}</strong>
                        </div>
                      ))}
                    </div>
                    <p className="notice">{t("editorial", L)}</p>
                    <button className="btn primary" onClick={start}>
                      {t("play", L)}
                      <ArrowRight size={17} />
                    </button>
                  </>
                ) : (
                  <>
                    <Shield size={45} />
                    <p className="lead">{t("privacyText", L)}</p>
                    <button className="btn secondary" onClick={() => setWin({ type: "settings" })}>
                      {t("settings", L)}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          {page !== "city" && (
            <footer className="page-footer">
              <span>
                <Mountain size={16} />
                Kyrgyz City <span>© 2026</span>
              </span>
              <button onClick={() => go("about")}>{t("about", L)}</button>
              <span>{t("free", L)}</span>
            </footer>
          )}
        </main>
      </div>
      {saveError && (
        <div className="save-error" role="alert">
          {t("savingError", L)}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
        </div>
      )}
      {win && (
        <Modal
          title={
            win.type === "word"
              ? t("newWords", L)
              : win.type === "lesson"
                ? win.lesson.title[L]
                : win.type === "dialogue"
                  ? t("talk", L)
                  : t(
                      win.type === "avatar"
                        ? "createAvatar"
                        : win.type === "help"
                          ? "how"
                          : win.type === "map"
                            ? "map"
                            : "settings",
                      L,
                    )
          }
          lang={L}
          onClose={() => setWin(null)}
          wide={win.type === "map"}
        >
          {win.type === "word" && (
            <WordCard
              key={win.word.id}
              word={win.word}
              lang={L}
              learned={p.learned.includes(win.word.id)}
              review={p.reviews[win.word.id]}
              favorite={p.favorites.includes(win.word.id)}
              onFavorite={() => favorite(win.word.id)}
              onLearn={() =>
                update((old) =>
                  event(
                    {
                      ...rewardOnce(old, "learned", win.word.id, 5),
                      reviews: {
                        ...old.reviews,
                        [win.word.id]: old.reviews[win.word.id] ?? scheduleReview(undefined, true),
                      },
                    },
                    "word",
                    win.word.id,
                  ),
                )
              }
            />
          )}
          {win.type === "lesson" && (
            <LessonPlayer
              key={win.lesson.id}
              lesson={win.lesson}
              catalogue={data}
              lang={L}
              already={p.lessons.includes(win.lesson.id)}
              onAnswer={answer}
              onComplete={() => completeLesson(win.lesson)}
            />
          )}
          {win.type === "dialogue" && (
            <DialoguePlayer
              key={win.dialogue.id}
              dialogue={win.dialogue}
              location={win.location}
              lang={L}
              name={p.name}
              already={p.dialogues.includes(win.dialogue.id)}
              onComplete={() =>
                update((old) =>
                  event(
                    rewardOnce(old, "dialogues", win.dialogue.id, 25),
                    "dialogue",
                    win.dialogue.id,
                  ),
                )
              }
            />
          )}
          {win.type === "avatar" && (
            <AvatarForm
              p={p}
              lang={L}
              onSubmit={(name, color, outfit) => {
                update((old) => ({
                  ...old,
                  name,
                  color,
                  outfit,
                  started: true,
                }));
                setWin(null);
                go("city");
                if (selected)
                  setTimeout(() => setTarget({ point: selected.entrance, id: Date.now() }), 50);
              }}
            />
          )}
          {win.type === "settings" && (
            <div className="settings-form">
              <label>
                {t("language", L)}
                {languageSelect}
              </label>
              <label>
                {t("quality", L)}
                <select
                  value={p.quality}
                  onChange={(e) =>
                    update((old) => ({
                      ...old,
                      quality: e.target.value as Progress["quality"],
                    }))
                  }
                >
                  {["low", "medium", "high"].map((q) => (
                    <option key={q} value={q}>
                      {t(q, L)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toggle-label">
                {t("motion", L)}
                <input
                  type="checkbox"
                  checked={p.motion}
                  onChange={(e) => update((old) => ({ ...old, motion: e.target.checked }))}
                />
              </label>
              <p className="notice">{t("localSave", L)}</p>
              <button
                className="btn secondary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(p, null, 2)], {
                      type: "application/json",
                    }),
                    url = URL.createObjectURL(blob),
                    a = document.createElement("a");
                  a.href = url;
                  a.download = "kyrgyz-city-progress.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                <Download size={16} />
                {t("export", L)}
              </button>
              <button
                className="text-button error-text"
                onClick={() => {
                  if (window.confirm(t("resetConfirm", L))) {
                    setP(initialProgress());
                    setWin(null);
                    go("home");
                  }
                }}
              >
                {t("reset", L)}
              </button>
            </div>
          )}
          {win.type === "help" && (
            <div className="help-content">
              <div className="help-icons">
                <Compass />
                <BookOpen />
                <Mic />
              </div>
              <p className="lead">{t("keyboardHelp", L)}</p>
              <p className="notice">{t("controls", L)}</p>
              <p className="muted">{t("noPunishment", L)}</p>
              <button
                className="btn primary"
                onClick={() => {
                  setWin(null);
                  start();
                }}
              >
                {t("play", L)}
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {win.type === "map" && (
            <div className="map-modal">
              <MiniMap
                locations={data.locations}
                position={p.position}
                visited={p.visited}
                lang={L}
                onSelect={(id) => {
                  setWin(null);
                  walk(data.locations.find((l) => l.id === id)!);
                }}
              />
              <div className="map-locations">
                {data.locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setWin(null);
                      walk(loc);
                    }}
                  >
                    <span style={{ background: loc.color }}>
                      {p.visited.includes(loc.id) ? "✓" : "⌂"}
                    </span>
                    <div>
                      <strong>{loc.title[L]}</strong>
                      <small>{loc.ky}</small>
                    </div>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function PageHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function LocationArt({ kind, color }: { kind: string; color: string }) {
  return (
    <div
      className={`location-art art-${kind}`}
      style={{ "--building": color } as React.CSSProperties}
    >
      <div className="art-sun" />
      <div className="art-tree left" />
      <div className="art-building">
        <div className="art-roof" />
        <div className="art-windows">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <i key={n} />
          ))}
        </div>
        <div className="art-door" />
        {kind === "clinic" && <div className="art-cross">✚</div>}
        {kind === "cafe" && <div className="art-awning" />}
      </div>
      <div className="art-tree right" />
      <div className="art-ground" />
    </div>
  );
}
function AvatarForm({
  p,
  lang,
  onSubmit,
}: {
  p: Progress;
  lang: Lang;
  onSubmit: (name: string, color: string, outfit: string) => void;
}) {
  const [name, setName] = useState(p.name),
    [color, setColor] = useState(p.color),
    [outfit, setOutfit] = useState(p.outfit);
  return (
    <form
      className="avatar-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit(name.trim(), color, outfit);
      }}
    >
      <p className="muted">{t("avatarHelp", lang)}</p>
      <div className="avatar-preview">
        <div className="avatar-head" />
        <div className={`avatar-body ${outfit}`} style={{ background: color }} />
        <div className="avatar-legs" />
        <div className="avatar-shadow" />
      </div>
      <label>
        {t("nickname", lang)}
        <input
          value={name}
          maxLength={24}
          required
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label>
        {t("outfit", lang)}
        <select value={outfit} onChange={(e) => setOutfit(e.target.value)}>
          <option value="jacket">{t("jacket", lang)}</option>
          <option value="vest">{t("vest", lang)}</option>
        </select>
      </label>
      <label>{t("color", lang)}</label>
      <div className="color-options">
        {["#cd7259", "#527e70", "#587f9a", "#b99555", "#9a7b9f"].map((c) => (
          <button
            type="button"
            key={c}
            style={{ background: c }}
            className={color === c ? "selected" : ""}
            aria-label={c}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
          >
            {color === c && <Check size={18} />}
          </button>
        ))}
      </div>
      <button className="btn primary full" disabled={!name.trim()}>
        {t(p.started ? "save" : "go", lang)}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}

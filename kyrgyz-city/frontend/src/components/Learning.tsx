import { useMemo, useState } from "react";
import { ArrowRight, Check, Star, Volume2, RotateCcw } from "lucide-react";
import type {
  Catalogue,
  Lang,
  Word,
  Lesson,
  Dialogue,
  Progress,
  Review,
} from "../types";
import { t } from "../localization";
import { Recorder } from "../audio/Recorder";
export function WordCard({
  word,
  lang,
  learned,
  review,
  favorite,
  onLearn,
  onFavorite,
}: {
  word: Word;
  lang: Lang;
  learned: boolean;
  review?: Review;
  favorite: boolean;
  onLearn: () => void;
  onFavorite: () => void;
}) {
  const [audioMsg, setAudioMsg] = useState(false);
  return (
    <>
      <div className="word-heading">
        <div>
          <span className="eyebrow">
            {word.context[lang]} · {word.level}
          </span>
          <h3 lang="ky">{word.ky}</h3>
          <p>{word.translations[lang]}</p>
        </div>
        <button
          className={`icon-btn ${favorite ? "gold" : ""}`}
          onClick={onFavorite}
          aria-label={t("favorites", lang)}
        >
          <Star size={23} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="example">
        <span>{t("example", lang)}</span>
        <p lang="ky">{word.example}</p>
      </div>
      <div className="row">
        <button
          className="btn secondary"
          onClick={() => {
            if (word.audio) {
              new Audio(word.audio).play().catch(() => setAudioMsg(true));
            } else setAudioMsg(true);
          }}
        >
          <Volume2 size={17} />
          {t("audio", lang)}
        </button>
        <button className="btn primary" onClick={onLearn}>
          {learned ? <Check size={17} /> : <Star size={17} />}{" "}
          {t(learned ? "learned" : "learnWord", lang)}
          {!learned && " +5 XP"}
        </button>
      </div>
      {audioMsg && (
        <p className="notice" role="status">
          {t("noAudio", lang)}
        </p>
      )}
      {review && (
        <p className="tiny muted">
          {t("nextReview", lang)}:{" "}
          {new Intl.DateTimeFormat(
            lang === "ky" ? "ky-KG" : lang === "en" ? "en-GB" : "ru-RU",
            { dateStyle: "medium", timeZone: "Asia/Bishkek" },
          ).format(review.due)}
        </p>
      )}
      <Recorder lang={lang} text={word.ky} />
    </>
  );
}
function shuffle<T>(a: T[]): T[] {
  return [...a].sort(() => Math.random() - 0.5);
}
export function LessonPlayer({
  lesson,
  catalogue,
  lang,
  onAnswer,
  onComplete,
  already,
}: {
  lesson: Lesson;
  catalogue: Catalogue;
  lang: Lang;
  onAnswer: (id: string, correct: boolean) => void;
  onComplete: () => void;
  already: boolean;
}) {
  const words = lesson.word_ids
    .map((id) => catalogue.vocabulary.find((w) => w.id === id)!)
    .filter(Boolean);
  const [stage, setStage] = useState(0),
    [chosen, setChosen] = useState(""),
    [typed, setTyped] = useState(""),
    [tokens, setTokens] = useState<number[]>([]),
    [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null),
    [done, setDone] = useState(false);
  const [wasAlready] = useState(already);
  const max = words.length + 1;
  const word = words[(stage > 2 ? stage - 1 : stage) % words.length];
  const type =
    stage === 2
      ? "sentence"
      : stage % 3 === 2
        ? "input"
        : stage % 3 === 1
          ? "reverse"
          : "choice";
  const options = useMemo(() => {
    const other = catalogue.vocabulary.filter(
      (v) => v.id !== word.id && v.category === word.category,
    );
    return shuffle([word, ...shuffle(other).slice(0, 3)]);
  }, [word.id, catalogue]);
  const pool = useMemo(
    () => shuffle(lesson.sentence.map((text, id) => ({ text, id }))),
    [lesson.id],
  );
  function check(value?: string) {
    if (feedback === "correct") return;
    let correct = false;
    if (type === "sentence")
      correct =
        tokens.map((i) => pool[i].text).join(" ") === lesson.sentence.join(" ");
    else if (type === "input")
      correct =
        typed
          .trim()
          .toLocaleLowerCase()
          .replace(/[.!?]+$/, "") ===
        word.ky.toLocaleLowerCase().replace(/[.!?]+$/, "");
    else correct = value === word.id;
    setChosen(value ?? "");
    setFeedback(correct ? "correct" : "incorrect");
    if (type !== "sentence") onAnswer(word.id, correct);
  }
  function next() {
    if (stage === max - 1) {
      onComplete();
      setDone(true);
    } else {
      setStage((n) => n + 1);
      setChosen("");
      setTyped("");
      setTokens([]);
      setFeedback(null);
    }
  }
  if (done)
    return (
      <div className="completion">
        <div className="completion-icon">✦</div>
        <h3>{t("lessonDone", lang)}</h3>
        <p>{wasAlready ? t("doneBefore", lang) : "+30 XP"}</p>
        <p className="muted">{lesson.note[lang]}</p>
        <button
          className="btn secondary"
          onClick={() => {
            setStage(0);
            setDone(false);
            setFeedback(null);
            setTokens([]);
          }}
        >
          <RotateCcw size={17} />
          {t("repeatLesson", lang)}
        </button>
      </div>
    );
  return (
    <>
      <div className="lesson-meta">
        <span>
          {lesson.level} · {stage + 1} / {max}
        </span>
        <span>
          {lesson.minutes} {t("minutes", lang)}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${(stage / max) * 100}%` }} />
      </div>
      <p className="notice">{lesson.note[lang]}</p>
      <span className="eyebrow">
        {t(
          type === "sentence"
            ? "buildSentence"
            : type === "input"
              ? "typeWord"
              : type === "reverse"
                ? "chooseWord"
                : "chooseTranslation",
          lang,
        )}
      </span>
      <h3 className="question" lang={type === "choice" ? "ky" : undefined}>
        {type === "sentence"
          ? lesson.sentence_translation[lang]
          : type === "choice"
            ? word.ky
            : word.translations[lang]}
      </h3>
      {type === "sentence" ? (
        <>
          <div className="sentence-answer">
            {tokens.map((idx, i) => (
              <button
                className="word-token"
                key={i}
                onClick={() => {
                  setTokens(tokens.filter((_, n) => n !== i));
                  setFeedback(null);
                }}
              >
                {pool[idx].text}
              </button>
            ))}
          </div>
          <div className="token-pool">
            {pool.map((item, i) => (
              <button
                className="word-token"
                key={item.id}
                disabled={tokens.includes(i)}
                onClick={() => {
                  setTokens([...tokens, i]);
                  setFeedback(null);
                }}
              >
                {item.text}
              </button>
            ))}
          </div>
          <button
            className="btn primary"
            disabled={tokens.length !== pool.length}
            onClick={() => check()}
          >
            {t("check", lang)}
          </button>
        </>
      ) : type === "input" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            aria-label={t("typeWord", lang)}
            lang="ky"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setFeedback(null);
            }}
            autoComplete="off"
          />
          <div className="token-pool">
            {["ө", "ү", "ң"].map((c) => (
              <button
                key={c}
                type="button"
                className="word-token"
                onClick={() => setTyped(typed + c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={!typed.trim()}>
            {t("check", lang)}
          </button>
        </form>
      ) : (
        <div className="answers">
          {options.map((o, i) => (
            <button
              key={o.id}
              disabled={feedback === "correct"}
              className={`answer ${chosen === o.id ? feedback : ""}`}
              onClick={() => check(o.id)}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {type === "reverse" ? o.ky : o.translations[lang]}
            </button>
          ))}
        </div>
      )}
      {feedback && (
        <div className={`feedback ${feedback}`} role="status">
          <strong>{t(feedback, lang)}</strong>
          {feedback === "incorrect" && (
            <p>
              {type === "sentence"
                ? lesson.sentence.join(" ")
                : `${word.ky} — ${word.translations[lang]}`}
              <br />
              {word.example}
            </p>
          )}
          {feedback === "correct" && (
            <button className="btn primary" onClick={next}>
              {t("next", lang)}
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      )}
      <p className="tiny muted">{t("noPunishment", lang)}</p>
    </>
  );
}
export function DialoguePlayer({
  dialogue,
  location,
  lang,
  name,
  onComplete,
  already,
}: {
  dialogue: Dialogue;
  location: Catalogue["locations"][number];
  lang: Lang;
  name: string;
  onComplete: () => void;
  already: boolean;
}) {
  const [wasAlready] = useState(already);
  const [node, setNode] = useState("0"),
    [feedback, setFeedback] = useState(""),
    [done, setDone] = useState(false);
  const current = dialogue.nodes.find((n) => n.id === node)!;
  const [order] = useState(() =>
    Object.fromEntries(dialogue.nodes.map((n) => [n.id, shuffle(n.options)])),
  );
  if (done)
    return (
      <div className="completion">
        <div className="completion-icon">☺</div>
        <h3>{t("dialogueDone", lang)}</h3>
        <p>{wasAlready ? t("doneBefore", lang) : "+25 XP"}</p>
        <p className="muted">{t("noPunishment", lang)}</p>
      </div>
    );
  return (
    <>
      <div className="npc-header">
        <div className="npc-avatar">{location.npc.name[0]}</div>
        <div>
          <strong>{location.npc.name}</strong>
          <p className="muted">{location.npc.role[lang]}</p>
        </div>
        <span className="tag">{Number(node) + 1}/3</span>
      </div>
      <div className="speech">
        <h3 lang="ky">{current.text}</h3>
        <p>{current.translation[lang]}</p>
      </div>
      <div className="answers">
        {order[node].map((option, i) => (
          <button
            className="answer"
            key={i}
            onClick={() => {
              if (!option.correct) {
                setFeedback(current.explanation[lang]);
                return;
              }
              setFeedback("");
              if (option.next !== null) setNode(option.next);
              else {
                onComplete();
                setDone(true);
              }
            }}
          >
            <span>{i + 1}</span>
            {option.text.replace("{name}", name)}
          </button>
        ))}
      </div>
      {feedback && (
        <p className="feedback incorrect" role="status">
          {feedback}
        </p>
      )}
      <p className="tiny muted">{t("noPunishment", lang)}</p>
    </>
  );
}
export function MiniMap({
  locations,
  position,
  visited,
  onSelect,
  lang,
}: {
  locations: Catalogue["locations"];
  position: [number, number];
  visited: string[];
  onSelect: (id: string) => void;
  lang: Lang;
}) {
  return (
    <div className="mini-map" aria-label={t("map", lang)}>
      <svg viewBox="0 0 106 106" role="img">
        <rect width="106" height="106" rx="12" fill="#e1e6d5" />
        {[-17, 17].map((v) => (
          <g key={v}>
            <rect x={v + 50} y={3} width={6} height={100} fill="#bac7ba" />
            <rect x={3} y={v + 50} width={100} height={6} fill="#bac7ba" />
          </g>
        ))}
        {locations.map((l) => (
          <g
            key={l.id}
            role="button"
            tabIndex={0}
            aria-label={l.title[lang]}
            onClick={() => onSelect(l.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(l.id);
            }}
          >
            <rect
              x={l.position[0] + 53 - l.size[0] / 2}
              y={l.position[1] + 53 - l.size[1] / 2}
              width={l.size[0]}
              height={l.size[1]}
              rx={2}
              fill={visited.includes(l.id) ? "#769a86" : l.color}
            />
          </g>
        ))}
        <circle
          cx={position[0] + 53}
          cy={position[1] + 53}
          r={4}
          stroke="#fff9e9"
          strokeWidth={2}
          fill="#c86d52"
        />
      </svg>
      <span>
        <i />
        {t("you", lang)}
      </span>
    </div>
  );
}

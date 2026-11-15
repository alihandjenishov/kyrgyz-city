import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { t } from "../localization";
import type { Lang } from "../types";
export function Recorder({ lang, text }: { lang: Lang; text: string }) {
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const media = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    currentURL = useRef(""),
    mounted = useRef(true),
    request = useRef(0);
  function cleanup() {
    request.current++;
    if (timer.current) clearTimeout(timer.current);
    if (media.current?.state === "recording") media.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    if (currentURL.current) URL.revokeObjectURL(currentURL.current);
    currentURL.current = "";
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanup();
    };
  }, []);
  useEffect(() => {
    cleanup();
    setRecording(false);
    setBusy(false);
    setUrl("");
    setError("");
  }, [text]);
  async function start() {
    if (busy || recording) return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("micUnsupported");
      return;
    }
    setBusy(true);
    const rid = ++request.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || rid !== request.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const chunks: Blob[] = [];
      const r = new MediaRecorder(s);
      media.current = r;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onerror = () => {
        if (mounted.current) setError("micError");
        stop();
      };
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (!mounted.current || rid !== request.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: r.mimeType });
        if (blob.size < 100) {
          setError("emptyRecording");
          return;
        }
        if (currentURL.current) URL.revokeObjectURL(currentURL.current);
        currentURL.current = URL.createObjectURL(blob);
        setUrl(currentURL.current);
      };
      r.start(250);
      setRecording(true);
      timer.current = setTimeout(stop, 30000);
    } catch (e) {
      const name = (e as DOMException).name;
      setError(
        name === "NotAllowedError"
          ? "micDenied"
          : name === "NotFoundError"
            ? "micMissing"
            : "micError",
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function stop() {
    if (media.current?.state === "recording") media.current.stop();
  }
  return (
    <div className="recorder">
      <p className="muted">{t("recordPrivacy", lang)}</p>
      <button
        className={`btn ${recording ? "danger" : "primary"}`}
        disabled={busy}
        onClick={recording ? stop : start}
      >
        {recording ? <Square size={17} /> : <Mic size={17} />}{" "}
        {recording ? t("stop", lang) : t("record", lang)}
      </button>
      {recording && (
        <p className="record-live" role="status">
          ● {t("recording", lang)}
        </p>
      )}
      {error && (
        <p role="alert" className="error-text">
          {t(error, lang)}
        </p>
      )}
      {url && (
        <div className="record-result">
          <label>
            {t("yourRecording", lang)}
            <audio controls src={url} />
          </label>
          <button
            className="icon-btn"
            aria-label={t("deleteRecording", lang)}
            onClick={() => {
              URL.revokeObjectURL(url);
              currentURL.current = "";
              setUrl("");
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
      <p className="notice">{t("noScore", lang)}</p>
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "../localization";
import type { Lang } from "../types";
export function Modal({
  title,
  children,
  onClose,
  lang,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  lang: Lang;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const nodes = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,a[href],audio[controls]",
        ) ?? [],
      );
    nodes()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const ns = nodes(),
          first = ns[0],
          last = ns.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-shade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <header>
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label={t("close", lang)}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

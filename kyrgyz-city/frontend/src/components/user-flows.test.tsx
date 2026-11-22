// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { LessonPlayer } from "./Learning";
import { Recorder } from "../audio/Recorder";
import vocabulary from "../../../backend/content/vocabulary.json";
import lessons from "../../../backend/content/lessons.json";
import locations from "../../../backend/content/locations.json";
import dialogues from "../../../backend/content/dialogues.json";
import quests from "../../../backend/content/quests.json";
import type { Catalogue, Lesson } from "../types";
import { STORAGE_KEY } from "../state/progress";
const data = {
  vocabulary,
  lessons,
  locations,
  dialogues,
  quests,
} as unknown as Catalogue;
vi.mock("../game/CityScene", () => ({
  default: (props: any) => (
    <div data-testid="city-scene">
      <button
        onClick={() =>
          props.onPosition(locations.find((l) => l.id === "market")!.entrance)
        }
      >
        Test walk market
      </button>
      <button
        onClick={() =>
          props.onPosition(locations.find((l) => l.id === "home")!.entrance)
        }
      >
        Test walk home
      </button>
    </div>
  ),
}));
beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, "", "/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => data[url.replace("/api/", "") as keyof Catalogue],
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function answerDialogue(id: string) {
  for (const node of data.dialogues.find((d) => d.id === id)!.nodes) {
    const correct = node.options
      .find((o) => o.correct)!
      .text.replace("{name}", "");
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(correct.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      }),
    );
  }
}
describe("actual UI flows with the 3D renderer replaced by a test scene", () => {
  it("creates a character and completes the four-step first-day mission, then restores XP", async () => {
    const view = render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Начать приключение/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /Пойдём/ }));
    await screen.findByTestId("city-scene");
    await userEvent.click(screen.getByRole("button", { name: /Войти/ }));
    await userEvent.click(screen.getByRole("button", { name: /Айжан/ }));
    // A wrong answer gives context and keeps the same dialogue node.
    await userEvent.click(screen.getByRole("button", { name: /Кош болуңуз/ }));
    expect(
      screen.getByText("При знакомстве сначала здороваются."),
    ).toBeTruthy();
    await answerDialogue("home");
    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    await userEvent.click(screen.getByRole("button", { name: /На улицу/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Test walk market" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /Войти/ }));
    await userEvent.click(screen.getByRole("button", { name: /Айгүл/ }));
    await answerDialogue("market");
    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    await userEvent.click(screen.getByRole("button", { name: /На улицу/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Test walk home" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: /Войти/ }));
    await screen.findByText(/Миссия завершена! \+60 XP/);
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).completedQuests,
      ).toEqual(["first-day"]),
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(110);
    view.unmount();
    render(<App />);
    await screen.findByTestId("city-scene");
    expect(screen.getByText("110")).toBeTruthy();
  });
  it("switches the English interface and keeps dictionary favorites", async () => {
    render(<App />);
    await screen.findByRole("button", { name: /Начать приключение/ });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Язык обучения" }),
      "en",
    );
    expect(
      screen.getByRole("button", { name: /Start your adventure/ }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "My dictionary" }),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search words…"),
      "window",
    );
    expect(screen.getByText("Терезе")).toBeTruthy();
    expect(screen.getByText("Window")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Favorites Терезе" }),
    );
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).favorites,
      ).toContain("home-3"),
    );
    expect(screen.queryByText("Найти слово…")).toBeNull();
  });
  it("lets a learner finish every word in a lesson and gives useful retry feedback", async () => {
    const onComplete = vi.fn(),
      onAnswer = vi.fn();
    const lesson = data.lessons.find((l) => l.id === "home")!;
    render(
      <LessonPlayer
        lesson={lesson}
        catalogue={data}
        lang="en"
        onComplete={onComplete}
        onAnswer={onAnswer}
        already={false}
      />,
    );
    for (let stage = 0; stage < lesson.word_ids.length + 1; stage++) {
      const word = data.vocabulary.find(
        (w) => w.id === lesson.word_ids[stage > 2 ? stage - 1 : stage],
      )!;
      if (stage === 2) {
        for (const token of lesson.sentence) {
          await userEvent.click(screen.getByRole("button", { name: token }));
        }
        await userEvent.click(screen.getByRole("button", { name: "Check" }));
      } else if (stage % 3 === 2) {
        await userEvent.type(screen.getByRole("textbox"), word.ky);
        await userEvent.click(screen.getByRole("button", { name: "Check" }));
      } else {
        const answer = stage % 3 === 1 ? word.ky : word.translations.en;
        const buttons = screen
          .getAllByRole("button")
          .filter((b) => b.classList.contains("answer"));
        if (stage === 0) {
          await userEvent.click(
            buttons.find((b) => !b.textContent!.endsWith(answer))!,
          );
          expect(screen.getByText(/Not quite/)).toBeTruthy();
        }
        await userEvent.click(
          buttons.find((b) => b.textContent!.endsWith(answer))!,
        );
      }
      await userEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText("+30 XP")).toBeTruthy();
    const correctIds = new Set(
      onAnswer.mock.calls.filter(([, ok]) => ok).map(([id]) => id),
    );
    expect(correctIds.size).toBe(lesson.word_ids.length);
  });
});
describe("microphone privacy and error handling", () => {
  it("shows unsupported recording clearly", async () => {
    render(<Recorder lang="en" text="Өрүк" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Record your voice" }),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Recording is unsupported",
    );
  });
  it("handles denied permission", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue({ name: "NotAllowedError" }),
      },
    });
    vi.stubGlobal("MediaRecorder", class {});
    render(<Recorder lang="en" text="Өрүк" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Record your voice" }),
    );
    await screen.findByText(/Microphone access was denied/);
  });
  it("records and plays locally, releases microphone tracks and never uploads", async () => {
    const stopTrack = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
      },
    });
    class FakeRecorder {
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: any;
      onstop: any;
      onerror: any;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voice".repeat(100)]) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    URL.createObjectURL = vi.fn(() => "blob:local-audio");
    URL.revokeObjectURL = vi.fn();
    const view = render(<Recorder lang="en" text="Өрүк" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Record your voice" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Stop recording" }),
    );
    const audio = view.container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe("blob:local-audio");
    expect(stopTrack).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Automatic pronunciation scoring is not available/),
    ).toBeTruthy();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-audio");
  });
});

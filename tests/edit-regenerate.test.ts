import { afterEach, expect, it, vi } from "vitest";
import { useChat } from "../src/hooks/useChat";
import { migrateModelConfigs } from "../src/lib/model-configs";
import { DEFAULT_SETTINGS, type Settings } from "../src/types";

// Exercise the hook's command boundary without mounting its presentation state.
vi.mock("react", () => ({
  useCallback: (fn: unknown) => fn,
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: vi.fn(),
}));
afterEach(() => vi.unstubAllGlobals());

it.each([
  { connectionMode: "proxy", proxyUrl: "" },
  { connectionMode: "proxy", proxyUrl: "http://proxy.example" },
  { connectionMode: "direct", requestLimit: 32 },
] as const)(
  "keeps the editor and original reply when request preflight fails: %j",
  (options) => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      baseUrl: "https://relay.example/v1",
      apiKey: "test-key",
      model: "model-a",
      ...options,
    };
    const workspace = migrateModelConfigs({
      settings,
      activeId: "chat",
      prompts: [],
      conversations: [
        {
          id: "chat",
          title: "Original",
          createdAt: 1,
          updatedAt: 2,
          messages: [
            { id: "u", role: "user", text: "Original question", createdAt: 1 },
            {
              id: "a",
              role: "assistant",
              text: "Valuable original reply",
              createdAt: 2,
              status: "done",
            },
          ],
        },
      ],
    });
    const update = vi.fn();
    const onError = vi.fn();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const chat = useChat(
      update,
      onError,
      async () => true,
      "requestLimit" in options ? options.requestLimit : undefined,
      false,
    );
    expect(
      chat.editAndRegenerate(
        workspace,
        workspace.conversations[0],
        "u",
        "New question",
      ),
    ).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  },
);

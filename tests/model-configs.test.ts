import { expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/types";
import {
  migrateModelConfigs,
  createModelConfig,
  selectModelConfig,
  workspaceForStorage,
} from "../src/lib/model-configs";
const legacy = () => ({
  conversations: [],
  prompts: [],
  activeId: null,
  settings: {
    ...DEFAULT_SETTINGS,
    baseUrl: "https://a.example/v1",
    apiKey: "session-a",
    accessCode: "code-a",
    model: "model-a",
  },
});
it("migrates the existing connection without losing session credentials or history", () => {
  const old = legacy();
  const migrated = migrateModelConfigs(old);
  expect(migrated.modelConfigs).toHaveLength(1);
  expect(migrated.modelConfigs[0]).toMatchObject({
    model: "model-a",
    apiKey: "session-a",
  });
  expect(migrated.activeModelConfigId).toBe(migrated.modelConfigs[0].id);
  expect(migrated.conversations).toBe(old.conversations);
  expect(migrateModelConfigs(migrated)).toEqual(migrated);
});
it("switches the complete connection and keeps global preferences and the active chat", () => {
  const a = migrateModelConfigs(legacy());
  const b = {
    ...createModelConfig("第二套"),
    baseUrl: "https://b.example/v1",
    model: "model-b",
    apiKey: "key-b",
    connectionMode: "proxy" as const,
    proxyUrl: "https://proxy.example",
    stream: false,
    maxTokens: 8192,
  };
  const workspace = {
    ...a,
    activeId: "chat",
    settings: { ...a.settings, theme: "dark" as const, systemPrompt: "中文" },
    modelConfigs: [...a.modelConfigs, b],
  };
  const selected = selectModelConfig(workspace, b.id);
  expect(selected.settings).toMatchObject({
    model: "model-b",
    apiKey: "key-b",
    baseUrl: b.baseUrl,
    proxyUrl: b.proxyUrl,
    stream: false,
    maxTokens: 8192,
    theme: "dark",
    systemPrompt: "中文",
  });
  expect(selected.activeId).toBe("chat");
  expect(
    selectModelConfig(selected, a.activeModelConfigId).settings.apiKey,
  ).toBe("session-a");
  expect(selectModelConfig(selected, "missing")).toBe(selected);
});
it("only persists secrets for configurations that opt in, including inactive ones", () => {
  const a = migrateModelConfigs(legacy());
  const b = {
    ...createModelConfig("记住"),
    rememberKey: true,
    apiKey: "saved-key",
    accessCode: "saved-code",
  };
  const workspace = { ...a, modelConfigs: [...a.modelConfigs, b] };
  const saved = workspaceForStorage(workspace);
  expect(saved.settings.apiKey).toBe("");
  expect(saved.settings.accessCode).toBe("");
  expect(saved.modelConfigs[0].apiKey).toBe("");
  expect(saved.modelConfigs[0].accessCode).toBe("");
  expect(saved.modelConfigs[1].apiKey).toBe("saved-key");
  expect(saved.modelConfigs[1].accessCode).toBe("saved-code");
  expect(workspace.modelConfigs[0].apiKey).toBe("session-a");
  const switched = workspaceForStorage(selectModelConfig(workspace, b.id));
  expect(switched.settings.apiKey).toBe("saved-key");
  expect(migrateModelConfigs(switched).activeModelConfigId).toBe(b.id);
});
it("new profiles start without another profile's credentials", () => {
  const config = createModelConfig("新增");
  expect(config).toMatchObject({
    name: "新增",
    apiKey: "",
    accessCode: "",
    rememberKey: false,
  });
  expect(createModelConfig("新增").id).not.toBe(config.id);
});

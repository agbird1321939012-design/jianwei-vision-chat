import {
  DEFAULT_SETTINGS,
  type ModelConfig,
  type ModelConnection,
  type Settings,
  type Workspace,
} from "../types";

export function modelConnection(settings: ModelConnection): ModelConnection {
  const {
    connectionMode,
    proxyUrl,
    baseUrl,
    apiKey,
    model,
    accessCode,
    rememberKey,
    stream,
    maxTokens,
  } = settings;
  return {
    connectionMode,
    proxyUrl,
    baseUrl,
    apiKey,
    model,
    accessCode,
    rememberKey,
    stream,
    maxTokens,
  };
}

export function createModelConfig(name = "新配置"): ModelConfig {
  return {
    ...modelConnection(DEFAULT_SETTINGS),
    id: crypto.randomUUID(),
    name,
  };
}

// The first version stored only settings. Upgrade it without changing chat IDs or secrets.
export function migrateModelConfigs(
  workspace: Omit<Workspace, "modelConfigs" | "activeModelConfigId"> &
    Partial<Pick<Workspace, "modelConfigs" | "activeModelConfigId">>,
): Workspace {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...workspace.settings };
  const modelConfigs = workspace.modelConfigs?.length
    ? workspace.modelConfigs
    : [
        {
          ...createModelConfig(settings.model || "默认配置"),
          ...modelConnection(settings),
        },
      ];
  const active =
    modelConfigs.find(
      (config) => config.id === workspace.activeModelConfigId,
    ) || modelConfigs[0];
  return {
    ...workspace,
    modelConfigs,
    activeModelConfigId: active.id,
    settings: { ...settings, ...modelConnection(active) },
  };
}

export function selectModelConfig(workspace: Workspace, id: string): Workspace {
  const config = workspace.modelConfigs.find((item) => item.id === id);
  if (!config) return workspace;
  return {
    ...workspace,
    activeModelConfigId: id,
    settings: { ...workspace.settings, ...modelConnection(config) },
  };
}

function withoutSessionSecrets<T extends ModelConnection>(value: T): T {
  return {
    ...value,
    apiKey: value.rememberKey ? value.apiKey : "",
    accessCode: value.rememberKey ? value.accessCode : "",
  };
}

export function workspaceForStorage(workspace: Workspace): Workspace {
  return {
    ...workspace,
    settings: withoutSessionSecrets(workspace.settings),
    modelConfigs: workspace.modelConfigs.map(withoutSessionSecrets),
  };
}

import { useEffect, useRef, useState, useCallback } from "react";
import { DEFAULT_SETTINGS, DEFAULT_PROMPTS, type Workspace } from "../types";
import { loadWorkspace, saveWorkspace } from "../lib/storage";
import { migrateModelConfigs } from "../lib/model-configs";
const initial = (): Workspace =>
  migrateModelConfigs({
    conversations: [],
    prompts: DEFAULT_PROMPTS,
    activeId: null,
    settings: DEFAULT_SETTINGS,
    modelConfigs: [],
    activeModelConfigId: "",
  });
export function useWorkspace(onError: (text: string) => void) {
  const [workspace, setWorkspace] = useState<Workspace>(initial);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(workspace);
  const writable = useRef(true);
  const persistQueue = useRef<Promise<unknown>>(Promise.resolve());
  const update = useCallback((fn: (old: Workspace) => Workspace) => {
    const next = fn(current.current);
    current.current = next;
    setWorkspace(next);
  }, []);
  const flush = useCallback(async () => {
    if (!writable.current) return false;
    const snapshot = current.current;
    const pending = persistQueue.current
      .catch(() => {})
      .then(() => saveWorkspace(snapshot))
      .then(() => true)
      .catch(() => {
        onError(
          "本机保存失败：可能存储空间不足。请到设置导出备份，避免丢失记录。",
        );
        return false;
      });
    persistQueue.current = pending;
    return pending;
  }, [onError]);
  useEffect(() => {
    let cancelled = false;
    loadWorkspace()
      .then((stored) => {
        if (cancelled) return;
        if (stored) {
          const restored = {
            ...migrateModelConfigs(stored),
            conversations: stored.conversations.map((c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.status === "generating"
                  ? { ...m, status: "stopped" as const }
                  : m,
              ),
            })),
          };
          current.current = restored;
          setWorkspace(restored);
        }
      })
      .catch(() => {
        writable.current = false;
        onError(
          "无法读取本机记录。当前为临时会话，请检查浏览器存储权限并导出备份。",
        );
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => void flush(), 350);
    return () => clearTimeout(timer);
  }, [workspace, loaded, flush]);
  useEffect(() => {
    if (!loaded) return;
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const pagehide = () => void flush();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [loaded, flush]);
  return { workspace, update, loaded, flush };
}

import { openDB } from "idb";
import type { Workspace } from "../types";
import { workspaceForStorage } from "./model-configs";
const database = () =>
  openDB("jianwei-v1", 1, {
    upgrade(db) {
      db.createObjectStore("workspace");
    },
  });
export async function loadWorkspace(): Promise<Workspace | undefined> {
  return (await database()).get("workspace", "current");
}
export async function saveWorkspace(value: Workspace) {
  const safe = workspaceForStorage(value);
  await (await database()).put("workspace", safe, "current");
}
export async function requestPersistentStorage() {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* Browser may deny, backup remains available. */
  }
}

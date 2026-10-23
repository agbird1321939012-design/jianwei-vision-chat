import { useCallback, useRef, useState, useEffect } from "react";
import {
  createConversation,
  type Workspace,
  type Conversation,
  type ImageAttachment,
  type Message,
  type Settings,
} from "../types";
import { buildMessages, consumeResponse } from "../lib/protocol";
import { openChat } from "../lib/transport";
import { normalizeEndpoint } from "../lib/endpoint";
import { requestPersistentStorage } from "../lib/storage";
export function useChat(
  update: (fn: (old: Workspace) => Workspace) => void,
  onError: (text: string) => void,
  flush: () => Promise<boolean>,
  requestLimit = 18_000_000,
  localProxy = true,
) {
  const controller = useRef<AbortController | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const stop = useCallback(() => controller.current?.abort(), []);
  const generate = async (conversation: Conversation, settings: Settings) => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusyId(conversation.id);
    const assistant: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "",
      createdAt: Date.now(),
      status: "generating",
    };
    const patch = (fn: (message: Message) => Message) =>
      update((old) => ({
        ...old,
        conversations: old.conversations.map((c) =>
          c.id === conversation.id
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistant.id ? fn(m) : m,
                ),
              }
            : c,
        ),
      }));
    update((old) => ({
      ...old,
      conversations: old.conversations.map((c) =>
        c.id === conversation.id
          ? { ...conversation, messages: [...conversation.messages, assistant] }
          : c,
      ),
    }));
    try {
      const response = await openChat(
        settings,
        buildMessages(conversation.messages, settings.systemPrompt),
        { localProxy, signal: abort.signal, requestLimit },
      );
      await consumeResponse(response, (event) =>
        patch((message) =>
          event.type === "text"
            ? { ...message, text: message.text + event.value }
            : event.type === "reasoning"
              ? {
                  ...message,
                  reasoning: (message.reasoning || "") + event.value,
                }
              : { ...message, finishReason: event.value },
        ),
      );
      patch((message) => ({ ...message, status: "done" }));
    } catch (error) {
      if (abort.signal.aborted)
        patch((message) => ({ ...message, status: "stopped" }));
      else
        patch((message) => ({
          ...message,
          status: "error",
          error:
            error instanceof TypeError
              ? "网络连接失败，请检查网络与服务地址"
              : error instanceof Error
                ? error.message
                : "请求失败，请重试",
        }));
    } finally {
      await flush();
      controller.current = null;
      setBusyId(null);
    }
  };
  const validate = (settings: Settings) => {
    try {
      normalizeEndpoint(settings.baseUrl);
      if (!settings.apiKey.trim() || !settings.model.trim())
        throw new Error("请先填写 API 密钥、接口地址和模型名称");
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : "请检查设置");
      return false;
    }
  };
  const send = (
    workspace: Workspace,
    text: string,
    images: ImageAttachment[],
  ) => {
    if (controller.current || (!text.trim() && !images.length)) return false;
    if (!validate(workspace.settings)) return false;
    const existing = workspace.conversations.find(
      (c) => c.id === workspace.activeId,
    );
    const original = existing || createConversation();
    if (original.messages.length >= 198) {
      onError("当前对话已达 200 条上下文限制，请新建对话");
      return false;
    }
    const title = original.messages.length
      ? original.title
      : (text.trim() || images[0]?.name || "图片对话").slice(0, 30);
    const message: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      images: images.length ? images : undefined,
      createdAt: Date.now(),
    };
    const conversation = {
      ...original,
      title,
      updatedAt: Date.now(),
      messages: [...original.messages, message],
    };
    update((old) => ({
      ...old,
      activeId: conversation.id,
      conversations: existing
        ? old.conversations.map((c) =>
            c.id === conversation.id ? conversation : c,
          )
        : [conversation, ...old.conversations],
    }));
    void requestPersistentStorage();
    void generate(conversation, workspace.settings);
    return true;
  };
  const regenerate = (workspace: Workspace, conversation: Conversation) => {
    if (controller.current || !validate(workspace.settings)) return;
    const messages = [...conversation.messages];
    if (messages.at(-1)?.role === "assistant") messages.pop();
    if (!messages.length) return;
    void generate({ ...conversation, messages }, workspace.settings);
  };
  return { busyId, send, regenerate, stop };
}

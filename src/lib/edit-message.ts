import type { Conversation } from "../types";

export function editLatestUserMessage(
  conversation: Conversation,
  messageId: string,
  text: string,
): Conversation {
  const index = conversation.messages
    .map((message) => message.role)
    .lastIndexOf("user");
  const message = conversation.messages[index];
  if (!message || message.id !== messageId)
    throw new Error("只能编辑最新一条用户消息");
  if (!text.trim() && !message.images?.length)
    throw new Error("请输入消息内容或保留图片");
  return {
    ...conversation,
    updatedAt: Date.now(),
    messages: [
      ...conversation.messages.slice(0, index),
      { ...message, text: text.trim() },
    ],
  };
}

import { expect, it } from "vitest";
import type { Conversation } from "../src/types";
import { editLatestUserMessage } from "../src/lib/edit-message";
const conversation = (): Conversation => ({
  id: "chat",
  title: "手动命名",
  createdAt: 1,
  updatedAt: 1,
  messages: [
    { id: "u1", role: "user", text: "第一轮", createdAt: 1 },
    { id: "a1", role: "assistant", text: "第一轮回答", createdAt: 2 },
    {
      id: "u2",
      role: "user",
      text: "原问题",
      createdAt: 3,
      images: [
        {
          id: "img",
          name: "test.png",
          width: 1,
          height: 1,
          dataUrl: "data:image/png;base64,AA==",
        },
      ],
    },
    {
      id: "a2",
      role: "assistant",
      text: "旧回复",
      reasoning: "旧思考",
      status: "error",
      error: "旧错误",
      createdAt: 4,
    },
  ],
});
it("edits the latest question, preserving its attachments and earlier context while replacing the old reply", () => {
  const original = conversation();
  const edited = editLatestUserMessage(original, "u2", "  新问题  ");
  expect(edited.messages).toHaveLength(3);
  expect(edited.messages.slice(0, 2)).toEqual(original.messages.slice(0, 2));
  expect(edited.messages[2]).toMatchObject({
    id: "u2",
    text: "新问题",
    createdAt: 3,
  });
  expect(edited.messages[2].images).toBe(original.messages[2].images);
  expect(edited.title).toBe("手动命名");
  expect(original.messages).toHaveLength(4);
  expect(original.messages[2].text).toBe("原问题");
});
it("rejects older, missing, and assistant messages", () => {
  for (const id of ["u1", "a2", "missing"])
    expect(() => editLatestUserMessage(conversation(), id, "新问题")).toThrow(
      /最新/,
    );
});
it("supports an image-only edited question but rejects a completely empty question", () => {
  expect(
    editLatestUserMessage(conversation(), "u2", " ").messages.at(-1)?.text,
  ).toBe("");
  const textOnly = conversation();
  delete textOnly.messages[2].images;
  expect(() => editLatestUserMessage(textOnly, "u2", " ")).toThrow(/内容/);
});
it("can edit the latest user message even when it has no reply yet", () => {
  const pending = conversation();
  pending.messages.pop();
  expect(
    editLatestUserMessage(pending, "u2", "新问题").messages.at(-1)?.text,
  ).toBe("新问题");
});

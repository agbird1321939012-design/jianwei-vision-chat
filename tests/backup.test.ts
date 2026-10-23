import { it, expect } from "vitest";
import { parseBackup, createBackup } from "../src/lib/backup";
it("exports conversations and prompts without any API configuration or secret", () => {
  const result = createBackup({
    conversations: [],
    prompts: [{ id: "p", title: "预设", content: "内容" }],
    settings: { apiKey: "secret" },
  } as any);
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(parseBackup(JSON.stringify(result)).prompts[0].title).toBe("预设");
});
it("rejects malformed backups and non-image attachment URLs before importing", () => {
  expect(() =>
    parseBackup('{"version":1,"conversations":{},"prompts":[]}'),
  ).toThrow();
  expect(() =>
    parseBackup(
      JSON.stringify({
        version: 1,
        prompts: [],
        conversations: [
          {
            id: "c",
            title: "c",
            createdAt: 1,
            updatedAt: 1,
            messages: [
              {
                id: "m",
                role: "user",
                text: "x",
                createdAt: 1,
                images: [
                  {
                    id: "i",
                    name: "x",
                    width: 1,
                    height: 1,
                    dataUrl: "https://evil.example/track",
                  },
                ],
              },
            ],
          },
        ],
      }),
    ),
  ).toThrow();
});

export type ImageAttachment = {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images?: ImageAttachment[];
  reasoning?: string;
  createdAt: number;
  status?: "generating" | "done" | "stopped" | "error";
  error?: string;
  finishReason?: string;
};
export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};
export type Prompt = { id: string; title: string; content: string };
export type Settings = {
  connectionMode: "auto" | "direct" | "proxy";
  proxyUrl: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  accessCode: string;
  rememberKey: boolean;
  stream: boolean;
  systemPrompt: string;
  theme: "light" | "dark" | "system";
  maxTokens: number;
  imageSize: number;
};
export type Workspace = {
  conversations: Conversation[];
  prompts: Prompt[];
  activeId: string | null;
  settings: Settings;
};
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
};
export const DEFAULT_SETTINGS: Settings = {
  connectionMode: "auto",
  proxyUrl: "",
  baseUrl: "",
  apiKey: "",
  model: "",
  accessCode: "",
  rememberKey: false,
  stream: true,
  systemPrompt: "",
  theme: "system",
  maxTokens: 4096,
  imageSize: 1600,
};
export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "describe",
    title: "读懂图片",
    content:
      "请仔细观察这张图片，描述画面主体、细节和场景。区分你能直接看到的内容与推测，不确定的地方请明确说明。",
  },
  {
    id: "ocr",
    title: "提取文字",
    content:
      "请准确提取图片中的所有可辨认文字，尽量保留原始段落和表格结构。模糊或无法辨认的内容请用［无法辨认］标注，不要猜测。",
  },
  {
    id: "analyze",
    title: "深入分析",
    content:
      "请深入分析这张图片：先概括内容，再逐项解释值得关注的细节，最后给出结论与依据。对于图片不能支持的判断，请说明局限。",
  },
];
export const createConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "新对话",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

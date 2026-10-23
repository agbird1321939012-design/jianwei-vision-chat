import { useRef, useEffect, useState, useDeferredValue } from "react";
import {
  Image,
  ScanText,
  ScanEye,
  ArrowUpRight,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ArrowDown,
  LoaderCircle,
  Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Conversation, Message, Prompt, ImageAttachment } from "../types";
import { BrandMark } from "./Brand";
import { Modal } from "./Modal";
const plugins = [remarkGfm];
function Markdown({ text }: { text: string }) {
  const deferred = useDeferredValue(text);
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={plugins}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: () => null,
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {deferred}
      </ReactMarkdown>
    </div>
  );
}
export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const success = document.execCommand("copy");
  input.remove();
  if (!success) throw new Error("复制失败，请长按选择文字");
}
function AssistantMessage({
  message,
  onRegenerate,
  canRegenerate,
  onError,
}: {
  message: Message;
  onRegenerate: () => void;
  canRegenerate: boolean;
  onError: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="assistant-message">
      <div className="assistant-identity">
        <span className="assistant-avatar">
          <BrandMark />
        </span>
        <strong>见微</strong>
        {message.status === "generating" ? (
          <span className="generating-label">
            <LoaderCircle className="spin" size={12} />
            正在思考
          </span>
        ) : null}
      </div>
      <div className="assistant-body">
        {message.reasoning ? (
          <details className="reasoning">
            <summary>
              <ChevronDown size={14} />
              思考过程
            </summary>
            <p>{message.reasoning}</p>
          </details>
        ) : null}
        {message.text ? (
          <Markdown text={message.text} />
        ) : message.status === "generating" ? (
          <div className="typing-indicator">
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {message.finishReason === "length" ? (
          <div className="message-note">
            已达到模型输出长度限制。可以继续追问，或在偏好中调高输出长度。
          </div>
        ) : null}
        {message.finishReason === "content_filter" ? (
          <div className="message-note">
            接口报告了内容限制，已保留收到的内容。
          </div>
        ) : null}
        {message.status === "stopped" ? (
          <div className="message-note">已停止生成，已收到的内容已保留。</div>
        ) : null}
        {message.error ? (
          <div className="message-error" role="alert">
            {message.error}
          </div>
        ) : null}
        {message.status !== "generating" ? (
          <div className="message-actions">
            {message.text ? (
              <button
                onClick={() => {
                  void copyText(message.text)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    })
                    .catch((e) => onError(e.message));
                }}
                aria-label="复制回复"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? "已复制" : "复制"}</span>
              </button>
            ) : null}
            {canRegenerate ? (
              <button onClick={onRegenerate} aria-label="重新生成">
                <RotateCcw size={15} />
                <span>重新生成</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
export function ChatView({
  conversation,
  prompts,
  onPrompt,
  onSettings,
  configured,
  busy,
  onRegenerate,
  onEdit,
  onError,
}: {
  conversation?: Conversation;
  prompts: Prompt[];
  onPrompt: (content: string) => void;
  onSettings: () => void;
  configured: boolean;
  busy: boolean;
  onRegenerate: () => void;
  onEdit: (messageId: string) => void;
  onError: (text: string) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const [showDown, setShowDown] = useState(false);
  const [preview, setPreview] = useState<ImageAttachment | null>(null);
  useEffect(() => {
    nearBottom.current = true;
    setShowDown(false);
    requestAnimationFrame(() => {
      viewport.current?.scrollTo({ top: viewport.current.scrollHeight });
    });
  }, [conversation?.id]);
  useEffect(() => {
    if (nearBottom.current) {
      const el = viewport.current;
      el?.scrollTo({ top: el.scrollHeight });
    }
  }, [conversation?.messages]);
  const hasMessages = Boolean(conversation?.messages.length);
  const latestUserIndex = conversation?.messages
    .map((message) => message.role)
    .lastIndexOf("user");
  return (
    <div
      className={`chat-scroll ${!hasMessages ? "chat-empty" : ""}`}
      ref={viewport}
      onScroll={() => {
        const el = viewport.current;
        if (!el) return;
        nearBottom.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        setShowDown(!nearBottom.current);
      }}
    >
      {!hasMessages ? (
        <div className="welcome">
          <div className="welcome-mark">
            <BrandMark />
          </div>
          <div className="welcome-eyebrow">看见更多，想得更远</div>
          <h1>
            从一张图片，
            <br className="mobile-only" />
            开始对话<span>。</span>
          </h1>
          <p>
            带上图片和好奇心，
            <br className="mobile-only" />
            其余的交给你选择的 AI。
          </p>
          <div className="starter-grid">
            {[
              {
                title: "读懂图片",
                description: "发现画面里的每个细节",
                icon: Image,
              },
              {
                title: "提取文字",
                description: "把图片里的文字留下来",
                icon: ScanText,
              },
              {
                title: "深入分析",
                description: "从看见，到理解",
                icon: ScanEye,
              },
            ].map((item, index) => (
              <button
                className="starter"
                key={item.title}
                onClick={() =>
                  onPrompt(
                    prompts.find(
                      (p) => p.id === ["describe", "ocr", "analyze"][index],
                    )?.content ||
                      [
                        "请描述这张图片的内容与细节。",
                        "请提取图片中的所有文字。",
                        "请深入分析这张图片，并说明依据。",
                      ][index],
                  )
                }
              >
                <span className={`starter-icon starter-icon-${index}`}>
                  <item.icon size={21} strokeWidth={1.65} />
                </span>
                <strong>
                  {item.title}
                  <ArrowUpRight size={15} />
                </strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
          {!configured ? (
            <button className="setup-link" onClick={onSettings}>
              首次使用，先连接你的 API <ArrowUpRight size={14} />
            </button>
          ) : (
            <div className="welcome-ready">
              <span className="tiny-dot" />
              准备好了，随时开始
            </div>
          )}
        </div>
      ) : (
        <div className="conversation-content">
          {conversation?.messages.map((message, index) =>
            message.role === "user" ? (
              <div className="user-message" key={message.id}>
                {message.images?.length ? (
                  <div className="message-images">
                    {message.images.map((image) => (
                      <button
                        onClick={() => setPreview(image)}
                        key={image.id}
                        aria-label={`查看图片 ${image.name}`}
                      >
                        <img
                          src={image.dataUrl}
                          alt={image.name}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.text ? (
                  <div className="user-text">{message.text}</div>
                ) : null}
                {index === latestUserIndex ? (
                  <div className="message-actions user-message-actions">
                    <button
                      aria-label="编辑最新消息"
                      disabled={busy}
                      onClick={() => onEdit(message.id)}
                    >
                      <Pencil size={14} />
                      <span>编辑</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
                canRegenerate={
                  !busy && index === conversation.messages.length - 1
                }
                onError={onError}
              />
            ),
          )}
        </div>
      )}
      {showDown ? (
        <button
          className="scroll-down icon-button"
          onClick={() => {
            nearBottom.current = true;
            viewport.current?.scrollTo({
              top: viewport.current.scrollHeight,
              behavior: "smooth",
            });
          }}
          aria-label="滚动到底部"
        >
          <ArrowDown size={18} />
        </button>
      ) : null}
      {preview ? (
        <Modal title={preview.name} onClose={() => setPreview(null)} wide>
          <div className="image-lightbox">
            <img src={preview.dataUrl} alt={preview.name} />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

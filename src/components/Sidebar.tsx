import {
  Plus,
  BookMarked,
  Settings2,
  Download,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { Conversation } from "../types";
import { Brand } from "./Brand";
export function Sidebar({
  conversations,
  activeId,
  busyId,
  open,
  onClose,
  onNew,
  onSelect,
  onDelete,
  onPrompts,
  onSettings,
  onInstall,
  configured,
}: {
  conversations: Conversation[];
  activeId: string | null;
  busyId: string | null;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPrompts: () => void;
  onSettings: () => void;
  onInstall: () => void;
  configured: boolean;
}) {
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 800px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const sync = () => setMobile(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const filtered = conversations
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <>
      <div
        className={`sidebar-shade ${open ? "visible" : ""}`}
        onClick={onClose}
      />
      <aside
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        aria-label="对话导航"
        inert={!open && mobile ? true : undefined}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={onClose}
            aria-label="关闭对话列表"
          >
            <PanelLeftClose size={19} />
          </button>
        </div>
        <nav className="primary-nav">
          <button className="new-chat" onClick={onNew}>
            <Plus size={19} />
            <span>新建对话</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="nav-button" onClick={onPrompts}>
            <BookMarked size={18} />
            <span>提示词库</span>
            <span className="nav-hint">常用灵感</span>
          </button>
        </nav>
        <div className="history-label">
          <span>最近对话</span>
          <span>{conversations.length ? conversations.length : ""}</span>
        </div>
        {conversations.length > 5 ? (
          <label className="history-search">
            <Search size={15} />
            <input
              placeholder="搜索对话"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索对话"
            />
          </label>
        ) : null}
        <div className="history-list">
          {filtered.length ? (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`history-row ${c.id === activeId ? "active" : ""}`}
              >
                <button className="history-item" onClick={() => onSelect(c.id)}>
                  {c.id === busyId ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <MessageSquare size={16} />
                  )}
                  <span>{c.title}</span>
                </button>
                <button
                  className="delete-chat icon-button"
                  aria-label={`删除对话 ${c.title}`}
                  onClick={() => onDelete(c.id)}
                  disabled={c.id === busyId}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="history-empty">
              <MessageSquare size={25} strokeWidth={1.4} />
              <p>{search ? "没有匹配的对话" : "还没有对话"}</p>
              <span>
                {search ? "换个关键词试试" : "从一张图片，或一个问题开始"}
              </span>
            </div>
          )}
        </div>
        <div className="sidebar-bottom">
          <button className="connection-card" onClick={onSettings}>
            <span className={`connection-dot ${configured ? "ready" : ""}`} />
            <div>
              <strong>{configured ? "API 已配置" : "连接你的 AI"}</strong>
              <span>
                {configured ? "管理接口与模型" : "填写接口，开启第一段对话"}
              </span>
            </div>
            <Settings2 size={17} />
          </button>
          <button className="nav-button install-button" onClick={onInstall}>
            <Download size={17} />
            <span>添加到主屏幕</span>
            <span className="ios-badge">iOS</span>
          </button>
          <div className="sidebar-footnote">
            <span className="tiny-dot" />
            独立空间 · 自选模型
          </div>
        </div>
      </aside>
    </>
  );
}

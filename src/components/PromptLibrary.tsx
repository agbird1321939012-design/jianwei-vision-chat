import { useState } from "react";
import {
  Plus,
  Search,
  BookMarked,
  ArrowUpRight,
  Pencil,
  Trash2,
  ArrowLeft,
  Check,
} from "lucide-react";
import type { Prompt } from "../types";
import { Modal } from "./Modal";
export function PromptLibrary({
  prompts,
  onChange,
  onUse,
  onClose,
  draft,
}: {
  prompts: Prompt[];
  onChange: (value: Prompt[]) => void;
  onUse: (value: string) => void;
  onClose: () => void;
  draft: string;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Prompt | null>(null);
  const filtered = prompts.filter((p) =>
    (p.title + " " + p.content).toLowerCase().includes(query.toLowerCase()),
  );
  const create = () =>
    setEditing({ id: crypto.randomUUID(), title: "", content: draft });
  const save = () => {
    if (!editing?.title.trim() || !editing.content.trim()) return;
    const value = {
      ...editing,
      title: editing.title.trim(),
      content: editing.content.trim(),
    };
    onChange(
      prompts.some((p) => p.id === value.id)
        ? prompts.map((p) => (p.id === value.id ? value : p))
        : [...prompts, value],
    );
    setEditing(null);
  };
  return (
    <Modal
      title={editing ? "编辑提示词" : "提示词库"}
      subtitle={
        editing
          ? "把好用的提问方式，留给下一次。"
          : "收藏一次，随时调用。你的灵感不必重复输入。"
      }
      onClose={onClose}
      wide
    >
      <div className="modal-body prompt-body">
        {editing ? (
          <div className="prompt-editor">
            <button className="text-button" onClick={() => setEditing(null)}>
              <ArrowLeft size={16} />
              返回列表
            </button>
            <label className="field">
              <span>名称</span>
              <input
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                placeholder="例如：摄影构图分析"
                maxLength={100}
              />
            </label>
            <label className="field">
              <span>提示词内容</span>
              <textarea
                value={editing.content}
                onChange={(e) =>
                  setEditing({ ...editing, content: e.target.value })
                }
                placeholder="写下你想让 AI 如何理解图片…"
                rows={8}
                maxLength={30000}
              />
            </label>
            <button
              className="button primary"
              onClick={save}
              disabled={!editing.title.trim() || !editing.content.trim()}
            >
              <Check size={17} />
              保存提示词
            </button>
          </div>
        ) : (
          <>
            <div className="prompt-toolbar">
              <label className="search-field">
                <Search size={17} />
                <input
                  placeholder="搜索提示词…"
                  aria-label="搜索提示词"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button className="button primary" onClick={create}>
                <Plus size={17} />
                <span>新建</span>
              </button>
            </div>
            <div className="prompt-list">
              {filtered.map((p) => (
                <article className="prompt-card" key={p.id}>
                  <div className="prompt-card-head">
                    <span className="prompt-card-icon">
                      <BookMarked size={18} />
                    </span>
                    <strong>{p.title}</strong>
                    <div className="prompt-actions">
                      <button
                        className="icon-button"
                        aria-label={`编辑提示词 ${p.title}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`删除提示词 ${p.title}`}
                        onClick={() => {
                          if (confirm(`删除提示词“${p.title}”？`))
                            onChange(
                              prompts.filter((item) => item.id !== p.id),
                            );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p>{p.content}</p>
                  <button
                    className="prompt-use"
                    onClick={() => {
                      onUse(p.content);
                      onClose();
                    }}
                  >
                    插入输入框
                    <ArrowUpRight size={15} />
                  </button>
                </article>
              ))}
            </div>
            {!filtered.length ? (
              <div className="library-empty">
                <BookMarked size={34} />
                <p>{query ? "没有找到相关提示词" : "还没有收藏的提示词"}</p>
                <span>
                  {query
                    ? "试试其他关键词"
                    : "点击“新建”，保存你的第一个提示词"}
                </span>
              </div>
            ) : null}
            <div className="subtle-note">
              调用提示词会追加到当前输入内容，方便你继续修改。
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

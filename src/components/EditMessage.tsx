import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Message } from "../types";
import { Modal } from "./Modal";

export function EditMessage({
  message,
  modelName,
  busy,
  onSave,
  onClose,
}: {
  message: Message;
  modelName: string;
  busy: boolean;
  onSave: (text: string) => boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState(message.text);
  return (
    <Modal
      title="编辑最新消息"
      subtitle="保存后，将替换这条消息后面的 AI 回复。"
      onClose={onClose}
    >
      <form
        className="edit-message-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && onSave(text)) onClose();
        }}
      >
        <div className="modal-body">
          <label className="field">
            <span>消息内容</span>
            <textarea
              aria-label="编辑消息内容"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={7}
              autoFocus
              maxLength={30000}
            />
          </label>
          {message.images?.length ? (
            <div className="edit-message-images">
              {message.images.map((image) => (
                <img key={image.id} src={image.dataUrl} alt={image.name} />
              ))}
              <small>保留原来的 {message.images.length} 张图片</small>
            </div>
          ) : null}
          <p className="subtle-note">
            使用当前模型：{modelName || "请先配置模型"}
          </p>
        </div>
        <footer className="modal-footer edit-message-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="button primary"
            disabled={busy || (!text.trim() && !message.images?.length)}
          >
            <RotateCcw size={16} />
            保存并重新生成
          </button>
        </footer>
      </form>
    </Modal>
  );
}

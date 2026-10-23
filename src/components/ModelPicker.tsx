import { Check, SlidersHorizontal } from "lucide-react";
import type { ModelConfig } from "../types";
import { Modal } from "./Modal";

export function ModelPicker({
  configs,
  activeId,
  onSelect,
  onManage,
  onClose,
}: {
  configs: ModelConfig[];
  activeId: string;
  onSelect: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title="切换模型"
      subtitle="选择后用于下一次发送或重新生成。"
      onClose={onClose}
    >
      <div className="modal-body model-config-list">
        {configs.map((config) => (
          <button
            key={config.id}
            className={`model-config-option ${config.id === activeId ? "selected" : ""}`}
            onClick={() => onSelect(config.id)}
            aria-label={`切换到 ${config.name}`}
            aria-pressed={config.id === activeId}
          >
            <span>
              <strong>{config.name}</strong>
              <small>{config.model || "尚未填写模型"}</small>
              <small>
                {config.baseUrl || "尚未填写接口地址"}
                {!config.apiKey ? " · 需要填写密钥" : ""}
              </small>
            </span>
            {config.id === activeId ? <Check size={18} /> : null}
          </button>
        ))}
      </div>
      <footer className="modal-footer">
        <span>切换模型后会继续使用当前对话上下文</span>
        <button className="button primary" onClick={onManage}>
          <SlidersHorizontal size={16} />
          管理模型配置
        </button>
      </footer>
    </Modal>
  );
}

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Resource } from "@knowhere/shared";
import { useData } from "../contexts/DataContext";

type Milestone = {
  id: string;
  text: string;
  completed: boolean;
};

type Props = {
  resource: Resource;
};

export function MilestoneChecklist({ resource }: Props) {
  const { updateResource } = useData();
  const [newText, setNewText] = useState("");
  const milestones: Milestone[] = (resource as any).milestones ?? [];

  const total = milestones.length;
  const done = milestones.filter(m => m.completed).length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  const save = (updated: Milestone[]) => {
    updateResource(resource.id, { milestones: updated } as any);
  };

  const toggle = (id: string) => {
    save(milestones.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };

  const add = () => {
    const text = newText.trim();
    if (!text) return;
    const newMilestone: Milestone = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text,
      completed: false
    };
    save([...milestones, newMilestone]);
    setNewText("");
  };

  const remove = (id: string) => {
    save(milestones.filter(m => m.id !== id));
  };

  return (
    <div className="milestone-checklist">
      <div className="milestone-header">
        <span className="milestone-title">Milestones</span>
        {total > 0 && (
          <span className="milestone-count">{done}/{total}</span>
        )}
      </div>

      {total > 0 && (
        <div className="milestone-progress-bar">
          <div className="milestone-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <ul className="milestone-list">
        {milestones.map(m => (
          <li key={m.id} className={`milestone-item ${m.completed ? "completed" : ""}`}>
            <button
              type="button"
              className="milestone-check"
              onClick={() => toggle(m.id)}
              aria-label={m.completed ? "Mark incomplete" : "Mark complete"}
            >
              {m.completed && <Check size={10} />}
            </button>
            <span className="milestone-text">{m.text}</span>
            <button
              type="button"
              className="milestone-delete"
              onClick={() => remove(m.id)}
              aria-label="Remove milestone"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>

      <div className="milestone-add">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a milestone..."
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="milestone-add-input"
        />
        <button
          type="button"
          className="button secondary milestone-add-btn"
          onClick={add}
          disabled={!newText.trim()}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

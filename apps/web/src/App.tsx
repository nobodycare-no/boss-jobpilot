import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Edit3, LibraryBig, Plus, Radar, RefreshCw, Save, Trash2, X } from "lucide-react";

import type { ExperienceItem, ExperienceItemCreateInput } from "@boss-jobpilot/shared";

import { createExperience, deleteExperience, listExperiences, updateExperience } from "./api";
import { JobPool } from "./JobPool";

type ExperienceFormState = {
  type: ExperienceItem["type"];
  title: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  summary: string;
  techStack: string;
  responsibilities: string;
  achievements: string;
  metrics: string;
  evidenceLevel: ExperienceItem["evidenceLevel"];
  ownershipLevel: ExperienceItem["ownershipLevel"];
  tags: string;
};

const emptyForm: ExperienceFormState = {
  type: "project",
  title: "",
  organization: "",
  role: "",
  startDate: "",
  endDate: "",
  summary: "",
  techStack: "",
  responsibilities: "",
  achievements: "",
  metrics: "",
  evidenceLevel: "can_explain_briefly",
  ownershipLevel: "participated",
  tags: ""
};

const experienceTypeLabels: Record<ExperienceItem["type"], string> = {
  project: "项目",
  internship: "实习",
  work: "工作",
  open_source: "开源",
  education: "教育"
};

const evidenceLabels: Record<ExperienceItem["evidenceLevel"], string> = {
  deep_interview_ready: "可深入讲",
  can_explain_briefly: "可简单讲",
  familiar_only: "了解",
  do_not_use: "不可写"
};

const ownershipLabels: Record<ExperienceItem["ownershipLevel"], string> = {
  led: "主导",
  owned: "负责",
  participated: "参与",
  assisted: "协助"
};

export function App() {
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [form, setForm] = useState<ExperienceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSkills = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.techStack))).slice(0, 12),
    [items]
  );

  async function refreshExperiences() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listExperiences();
      setItems(response.items);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "经历库加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshExperiences();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const input = formToInput(form);

    try {
      if (editingId) {
        await updateExperience(editingId, input);
      } else {
        await createExperience(input);
      }

      setForm(emptyForm);
      setEditingId(null);
      await refreshExperiences();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "经历保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);

    try {
      await deleteExperience(id);
      await refreshExperiences();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "经历删除失败");
    }
  }

  function handleEdit(item: ExperienceItem) {
    setEditingId(item.id);
    setForm(experienceToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">
            <Radar size={16} />
            AI 求职代理
          </p>
          <h1>boss-jobpilot</h1>
          <p className="hero-copy">
            本地优先的求职工作台，用结构化经历库匹配岗位 JD 和公司要求，生成精准投递包。
          </p>
        </div>
        <div className="status-panel" aria-label="当前里程碑">
          <span>Milestone 1</span>
          <strong>经历库 MVP</strong>
          <small>{items.length} 条经历素材</small>
        </div>
      </section>

      {error ? <div className="notice">{error}</div> : null}

      <section className="workspace-grid">
        <form className="editor-panel" onSubmit={handleSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <LibraryBig size={16} />
                经历素材
              </p>
              <h2>{editingId ? "编辑经历" : "新增经历"}</h2>
            </div>
            {editingId ? (
              <button className="icon-button" type="button" onClick={resetForm} title="取消编辑">
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="form-grid">
            <label>
              类型
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as ExperienceItem["type"]
                  }))
                }
              >
                {Object.entries(experienceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              真实性
              <select
                value={form.evidenceLevel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    evidenceLevel: event.target.value as ExperienceItem["evidenceLevel"]
                  }))
                }
              >
                {Object.entries(evidenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide">
              标题
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="例如：AI 求职代理系统"
              />
            </label>

            <label>
              组织
              <input
                value={form.organization}
                onChange={(event) =>
                  setForm((current) => ({ ...current, organization: event.target.value }))
                }
                placeholder="公司 / 学校 / 个人项目"
              />
            </label>

            <label>
              角色
              <input
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value }))
                }
                placeholder="全栈开发"
              />
            </label>

            <label>
              开始时间
              <input
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
                placeholder="2025-03"
              />
            </label>

            <label>
              结束时间
              <input
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
                placeholder="至今"
              />
            </label>

            <label>
              负责程度
              <select
                value={form.ownershipLevel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ownershipLevel: event.target.value as ExperienceItem["ownershipLevel"]
                  }))
                }
              >
                {Object.entries(ownershipLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="wide">
              技术栈
              <input
                value={form.techStack}
                onChange={(event) =>
                  setForm((current) => ({ ...current, techStack: event.target.value }))
                }
                placeholder="React, TypeScript, Node.js"
              />
            </label>

            <label className="wide">
              摘要
              <textarea
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
                placeholder="这段经历解决了什么问题，和求职目标有什么关系。"
              />
            </label>

            <label className="wide">
              职责
              <textarea
                value={form.responsibilities}
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsibilities: event.target.value }))
                }
                placeholder="每行一条，例如：负责经历库数据建模和录入流程"
              />
            </label>

            <label className="wide">
              成果
              <textarea
                value={form.achievements}
                onChange={(event) =>
                  setForm((current) => ({ ...current, achievements: event.target.value }))
                }
                placeholder="每行一条，可以写真实指标、上线结果或可讲产出"
              />
            </label>

            <label>
              指标
              <input
                value={form.metrics}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metrics: event.target.value }))
                }
                placeholder="交付周期, 性能指标"
              />
            </label>

            <label>
              标签
              <input
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="AI, 简历, 自动化"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {isSaving ? "保存中" : editingId ? "保存修改" : "新增经历"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void refreshExperiences()}
            >
              <RefreshCw size={18} />
              刷新
            </button>
          </div>
        </form>

        <section className="library-panel" aria-label="经历库列表">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <LibraryBig size={16} />
                素材库
              </p>
              <h2>已保存经历</h2>
            </div>
            <span className="count-pill">{items.length}</span>
          </div>

          {activeSkills.length > 0 ? (
            <div className="skill-strip">
              {activeSkills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          ) : null}

          {isLoading ? <p className="empty-state">正在加载经历库...</p> : null}

          {!isLoading && items.length === 0 ? (
            <p className="empty-state">还没有经历素材。先录入一个项目或实习经历。</p>
          ) : null}

          <div className="experience-list">
            {items.map((item) => (
              <article className="experience-card" key={item.id}>
                <div className="experience-card__header">
                  <div>
                    <span className="type-pill">{experienceTypeLabels[item.type]}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleEdit(item)}
                      title="编辑"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => void handleDelete(item.id)}
                      title="删除"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <p className="experience-meta">
                  {[item.organization, item.role, ownershipLabels[item.ownershipLevel]]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {item.summary ? <p>{item.summary}</p> : null}
                {item.techStack.length > 0 ? (
                  <div className="tag-row">
                    {item.techStack.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                ) : null}
                <div className="truth-row">
                  <span>{evidenceLabels[item.evidenceLevel]}</span>
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <JobPool />
    </main>
  );
}

function formToInput(form: ExperienceFormState): ExperienceItemCreateInput {
  return {
    type: form.type,
    title: form.title.trim(),
    organization: optionalText(form.organization),
    role: optionalText(form.role),
    startDate: optionalText(form.startDate),
    endDate: optionalText(form.endDate),
    summary: optionalText(form.summary),
    techStack: splitTokens(form.techStack),
    responsibilities: splitLines(form.responsibilities),
    achievements: splitLines(form.achievements),
    metrics: splitTokens(form.metrics),
    evidenceLevel: form.evidenceLevel,
    ownershipLevel: form.ownershipLevel,
    tags: splitTokens(form.tags)
  };
}

function experienceToForm(item: ExperienceItem): ExperienceFormState {
  return {
    type: item.type,
    title: item.title,
    organization: item.organization ?? "",
    role: item.role ?? "",
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    summary: item.summary ?? "",
    techStack: item.techStack.join(", "),
    responsibilities: item.responsibilities.join("\n"),
    achievements: item.achievements.join("\n"),
    metrics: item.metrics.join(", "),
    evidenceLevel: item.evidenceLevel,
    ownershipLevel: item.ownershipLevel,
    tags: item.tags.join(", ")
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function splitTokens(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

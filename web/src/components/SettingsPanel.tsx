import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { LOOP_PHASES } from '../types.ts';
import type { GardenerConfig, LoopSkillStep, LoopStepPhase } from '../types.ts';

interface SettingsPanelProps {
  visible: boolean;
  config: GardenerConfig;
  onClose: () => void;
  onConfigChange: (config: GardenerConfig) => void;
}

const PHASE_NAMES: Record<LoopStepPhase, string> = {
  observe: 'observe / 观察',
  diagnose: 'diagnose / 诊断',
  plan: 'plan / 规划',
  act: 'act / 行动',
  verify: 'verify / 验证',
  learn: 'learn / 学习',
  decide: 'decide / 决策',
};

export default function SettingsPanel({
  visible,
  config,
  onClose,
  onConfigChange,
}: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const steps = useMemo(
    () => localConfig.loop.steps.slice(0, localConfig.loop.stepLimit),
    [localConfig.loop.stepLimit, localConfig.loop.steps],
  );

  if (!visible) return null;

  const scheduleTime = parseCronTime(localConfig.schedule.cron);
  const stepLimit = localConfig.loop.stepLimit;
  const canAddStep = steps.length < stepLimit;

  const commit = (newConfig: GardenerConfig) => {
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const update = (path: string[], value: unknown) => {
    const newConfig = structuredClone(localConfig);
    let obj: Record<string, unknown> = newConfig as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;
    commit(newConfig);
  };

  const updateCronTime = (part: 'minute' | 'hour', value: number) => {
    const minute = part === 'minute' ? value : scheduleTime.minute;
    const hour = part === 'hour' ? value : scheduleTime.hour;
    update(['schedule', 'cron'], buildCronTime(localConfig.schedule.cron, minute, hour));
  };

  const commitSteps = (nextSteps: LoopSkillStep[]) => {
    const normalized = nextSteps.slice(0, stepLimit).map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`,
    }));
    const newConfig = structuredClone(localConfig);
    newConfig.loop.steps = normalized;

    const phaseSkills = { ...newConfig.loop.phaseSkills };
    for (const phase of LOOP_PHASES) {
      phaseSkills[phase] = {
        skill: phaseSkills[phase]?.skill ?? 'context-gardener',
        enabled: false,
      };
    }
    for (const step of normalized) {
      phaseSkills[step.phase] = {
        skill: step.skill,
        enabled: step.enabled,
      };
    }
    newConfig.loop.phaseSkills = phaseSkills;
    commit(newConfig);
  };

  const updateStep = (index: number, patch: Partial<LoopSkillStep>) => {
    commitSteps(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  };

  const addStep = () => {
    if (!canAddStep) return;
    const used = new Set(steps.map((step) => step.phase));
    const phase = LOOP_PHASES.find((candidate) => !used.has(candidate)) ?? 'observe';
    commitSteps([
      ...steps,
      {
        id: `step-${Date.now()}`,
        phase,
        skill: `gardener-${phase}`,
        enabled: true,
      },
    ]);
  };

  const deleteStep = (index: number) => {
    commitSteps(steps.filter((_, i) => i !== index));
  };

  return (
    <div style={styles.panel} data-testid="settings-panel">
      <div style={styles.header}>
        <span style={styles.title}>规则设置</span>
        <button
          type="button"
          onClick={onClose}
          style={styles.iconButton}
          data-testid="settings-close"
          aria-label="关闭设置"
        >
          x
        </button>
      </div>

      <div style={styles.body}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>定时任务</h2>
          <label style={styles.row}>
            <span>启用</span>
            <input
              data-testid="schedule-enabled"
              type="checkbox"
              checked={localConfig.schedule.enabled}
              onChange={(event) => update(['schedule', 'enabled'], event.target.checked)}
            />
          </label>
          <label style={styles.row}>
            <span>分钟</span>
            <input
              data-testid="schedule-minute"
              style={styles.numberInput}
              type="number"
              min={0}
              max={59}
              value={scheduleTime.minute}
              onChange={(event) => updateCronTime('minute', clamp(parseInt(event.target.value) || 0, 0, 59))}
            />
          </label>
          <label style={styles.row}>
            <span>小时</span>
            <input
              data-testid="schedule-hour"
              style={styles.numberInput}
              type="number"
              min={0}
              max={23}
              value={scheduleTime.hour}
              onChange={(event) => updateCronTime('hour', clamp(parseInt(event.target.value) || 0, 0, 23))}
            />
          </label>
          <label style={styles.row}>
            <span>Cron</span>
            <input
              data-testid="schedule-cron"
              style={styles.textInput}
              value={localConfig.schedule.cron}
              onChange={(event) => update(['schedule', 'cron'], event.target.value)}
            />
          </label>
          <label style={styles.row}>
            <span>Run window</span>
            <input
              data-testid="schedule-window"
              style={styles.numberInput}
              type="number"
              min={1}
              value={localConfig.schedule.runWindowMinutes}
              onChange={(event) => update(['schedule', 'runWindowMinutes'], Math.max(1, parseInt(event.target.value) || 1))}
            />
          </label>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Loop 停止策略</h2>
          <label style={styles.row}>
            <span>启用 Loop</span>
            <input
              data-testid="loop-enabled"
              type="checkbox"
              checked={localConfig.loop.enabled}
              onChange={(event) => update(['loop', 'enabled'], event.target.checked)}
            />
          </label>
          <label style={styles.row}>
            <span>健康目标</span>
            <input
              data-testid="health-target"
              style={styles.numberInput}
              type="number"
              min={0}
              max={100}
              value={localConfig.loop.exitCondition.healthTarget}
              onChange={(event) => update(['loop', 'exitCondition', 'healthTarget'], parseInt(event.target.value) || 0)}
            />
          </label>
          <label style={styles.row}>
            <span>全健康后停止</span>
            <input
              data-testid="stop-when-healthy"
              type="checkbox"
              checked={localConfig.loop.stop.stopWhenAllLayersHealthy}
              onChange={(event) => update(['loop', 'stop', 'stopWhenAllLayersHealthy'], event.target.checked)}
            />
          </label>
          <label style={styles.row}>
            <span>允许手动停止</span>
            <input
              data-testid="scan-interval-hours"
              style={styles.numberInput}
              type="number"
              min={1}
              value={localConfig.loop.scanIntervalHours}
              onChange={(event) => update(['loop', 'scanIntervalHours'], Math.max(1, parseInt(event.target.value) || 1))}
            />
          </label>
          <label style={styles.row}>
            <span>Runtime hours</span>
            <input
              data-testid="max-runtime-hours"
              style={styles.numberInput}
              type="number"
              min={0}
              value={localConfig.loop.maxRuntimeHours}
              onChange={(event) => update(['loop', 'maxRuntimeHours'], Math.max(0, parseInt(event.target.value) || 0))}
            />
          </label>
          <label style={styles.row}>
            <span>Allow manual stop</span>
            <input
              data-testid="allow-manual-stop"
              type="checkbox"
              checked={localConfig.loop.stop.allowManualStop}
              onChange={(event) => update(['loop', 'stop', 'allowManualStop'], event.target.checked)}
            />
          </label>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Skill 装配</h2>
            <span style={styles.stepCounter}>{steps.length}/{stepLimit}</span>
          </div>

          <div style={styles.stepList}>
            {steps.map((step, index) => (
              <div key={step.id} style={styles.stepItem}>
                <div style={styles.stepTopLine}>
                  <span style={styles.stepBadge}>Step {index + 1}</span>
                  <label style={styles.enableInline}>
                    <input
                      data-testid={`skill-enabled-${index}`}
                      type="checkbox"
                      checked={step.enabled}
                      onChange={(event) => updateStep(index, { enabled: event.target.checked })}
                    />
                    启用
                  </label>
                  <button
                    type="button"
                    style={styles.deleteButton}
                    data-testid={`skill-delete-${index}`}
                    onClick={() => deleteStep(index)}
                    aria-label={`删除 Step ${index + 1}`}
                  >
                    删除
                  </button>
                </div>
                <label style={styles.stackLabel}>
                  <span>阶段</span>
                  <select
                    data-testid={`skill-phase-${index}`}
                    style={styles.fullInput}
                    value={step.phase}
                    onChange={(event) => updateStep(index, { phase: event.target.value as LoopStepPhase })}
                  >
                    {LOOP_PHASES.map((phase) => (
                      <option key={phase} value={phase}>{PHASE_NAMES[phase]}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.stackLabel}>
                  <span>Skill</span>
                  <input
                    data-testid={`skill-name-${index}`}
                    style={styles.fullInput}
                    value={step.skill}
                    onChange={(event) => updateStep(index, { skill: event.target.value })}
                  />
                </label>
              </div>
            ))}
          </div>

          <button
            type="button"
            style={canAddStep ? styles.primaryButton : styles.primaryButtonDisabled}
            data-testid="skill-add-step"
            onClick={addStep}
            disabled={!canAddStep}
          >
            添加 Step
          </button>
        </section>
      </div>
    </div>
  );
}

function parseCronTime(cron: string): { minute: number; hour: number } {
  const parts = cron.trim().split(/\s+/);
  return {
    minute: parseCronPart(parts[0], 0, 59),
    hour: parseCronPart(parts[1], 0, 23),
  };
}

function parseCronPart(value: string | undefined, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return min;
  return clamp(parsed, min, max);
}

function buildCronTime(cron: string, minute: number, hour: number): string {
  const parts = cron.trim().split(/\s+/);
  while (parts.length < 5) parts.push('*');
  parts[0] = String(clamp(minute, 0, 59));
  parts[1] = String(clamp(hour, 0, 23));
  return parts.slice(0, 5).join(' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const styles: Record<string, CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 380,
    height: '100%',
    background: 'rgba(30,40,30,0.94)',
    zIndex: 20,
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.12)',
    color: '#E8F5E9',
    fontFamily: 'Consolas, monospace',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },
  iconButton: {
    width: 28,
    height: 28,
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    color: '#E8F5E9',
    cursor: 'pointer',
  },
  body: {
    padding: 12,
  },
  section: {
    marginBottom: 10,
    padding: 12,
    background: 'rgba(255,255,255,0.055)',
    borderRadius: 6,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    margin: 0,
    color: '#A5D6A7',
    fontSize: 13,
  },
  stepCounter: {
    color: '#C8E6C9',
    fontSize: 12,
    fontWeight: 700,
  },
  row: {
    minHeight: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    color: '#C8E6C9',
    fontSize: 12,
  },
  textInput: {
    width: 180,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    padding: '4px 6px',
    fontSize: 12,
  },
  numberInput: {
    width: 72,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    padding: '4px 6px',
    fontSize: 12,
    textAlign: 'right',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stepItem: {
    padding: 10,
    border: '1px solid rgba(200,230,201,0.16)',
    borderRadius: 6,
    background: 'rgba(0,0,0,0.14)',
  },
  stepTopLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepBadge: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: 700,
  },
  enableInline: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#C8E6C9',
    fontSize: 11,
    marginLeft: 'auto',
  },
  deleteButton: {
    height: 24,
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.06)',
    color: '#E8F5E9',
    cursor: 'pointer',
    fontSize: 11,
  },
  stackLabel: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr',
    alignItems: 'center',
    gap: 8,
    color: '#C8E6C9',
    fontSize: 11,
    marginTop: 6,
  },
  fullInput: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    padding: '4px 6px',
    fontSize: 12,
  },
  primaryButton: {
    width: '100%',
    marginTop: 10,
    height: 30,
    border: '1px solid rgba(200,230,201,0.45)',
    borderRadius: 5,
    background: 'rgba(76,175,80,0.26)',
    color: '#E8F5E9',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  },
  primaryButtonDisabled: {
    width: '100%',
    marginTop: 10,
    height: 30,
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(232,245,233,0.42)',
    cursor: 'not-allowed',
    fontSize: 12,
    fontWeight: 700,
  },
};

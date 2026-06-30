/**
 * SettingsPanel — collapsible rule configuration panel.
 * Rendered as a React overlay on the right side.
 */

import { useState } from 'react';
import type { GardenerConfig } from '../types.ts';

interface SettingsPanelProps {
  visible: boolean;
  config: GardenerConfig;
  onClose: () => void;
  onConfigChange: (config: GardenerConfig) => void;
}

export default function SettingsPanel({
  visible,
  config,
  onClose,
  onConfigChange,
}: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);

  if (!visible) return null;

  const update = (path: string[], value: unknown) => {
    const newConfig = structuredClone(localConfig);
    let obj: Record<string, unknown> = newConfig as unknown as Record<string, unknown>;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]] as Record<string, unknown>;
    }
    obj[path[path.length - 1]] = value;
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 4,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  };

  const labelStyle: React.CSSProperties = {
    color: '#C8E6C9',
    fontSize: 11,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  };

  const inputStyle: React.CSSProperties = {
    width: 60,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    color: '#fff',
    padding: '2px 6px',
    fontSize: 11,
    textAlign: 'right',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 300,
        height: '100%',
        background: 'rgba(30,40,30,0.92)',
        zIndex: 20,
        overflowY: 'auto',
        padding: '16px 0',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{ color: '#E8F5E9', fontSize: 16, fontWeight: 'bold' }}>
          ⚙ 规则设置
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#C8E6C9',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {/* ⏱ Schedule */}
        <div style={sectionStyle}>
          <div style={{ color: '#A5D6A7', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            ⏱ 调度
          </div>
          <div style={labelStyle}>
            <span>启用</span>
            <input
              type="checkbox"
              checked={localConfig.schedule.enabled}
              onChange={(e) => update(['schedule', 'enabled'], e.target.checked)}
            />
          </div>
          <div style={labelStyle}>
            <span>Cron</span>
            <input
              style={{ ...inputStyle, width: 120 }}
              value={localConfig.schedule.cron}
              onChange={(e) => update(['schedule', 'cron'], e.target.value)}
            />
          </div>
        </div>

        {/* 📏 Thresholds */}
        <div style={sectionStyle}>
          <div style={{ color: '#A5D6A7', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            📏 阈值
          </div>
          <div style={labelStyle}>
            <span>枯萎阈值</span>
            <input
              style={inputStyle}
              type="number"
              value={localConfig.thresholds.staleDays}
              onChange={(e) => update(['thresholds', 'staleDays'], parseInt(e.target.value) || 0)}
            />
          </div>
          <div style={labelStyle}>
            <span>膨胀行数</span>
            <input
              style={inputStyle}
              type="number"
              value={localConfig.thresholds.maxLines}
              onChange={(e) => update(['thresholds', 'maxLines'], parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* 🔍 Detection */}
        <div style={sectionStyle}>
          <div style={{ color: '#A5D6A7', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            🔍 检测
          </div>
          <div style={labelStyle}>
            <span>枯萎检测</span>
            <input
              type="checkbox"
              checked={localConfig.detection.stale}
              onChange={(e) => update(['detection', 'stale'], e.target.checked)}
            />
          </div>
          <div style={labelStyle}>
            <span>矛盾检测</span>
            <input
              type="checkbox"
              checked={localConfig.detection.contradiction}
              onChange={(e) => update(['detection', 'contradiction'], e.target.checked)}
            />
          </div>
        </div>

        {/* ⚡ Action */}
        <div style={sectionStyle}>
          <div style={{ color: '#A5D6A7', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            ⚡ 策略
          </div>
          <div style={labelStyle}>
            <span>模式</span>
            <select
              style={{ ...inputStyle, width: 100 }}
              value={localConfig.action.mode}
              onChange={(e) => update(['action', 'mode'], e.target.value)}
            >
              <option value="ask">询问后执行</option>
              <option value="auto">自动执行</option>
              <option value="report-only">仅报告</option>
            </select>
          </div>
        </div>

        {/* 🔄 Loop */}
        <div style={sectionStyle}>
          <div style={{ color: '#A5D6A7', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
            🔄 Loop 流程
          </div>
          <div style={labelStyle}>
            <span>停止目标</span>
            <span style={{ color: '#E8F5E9' }}>
              ≥{localConfig.loop.exitCondition.healthTarget} 分
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

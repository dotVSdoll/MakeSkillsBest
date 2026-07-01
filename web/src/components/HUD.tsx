import { COLORS } from '../constants.ts';

interface HUDProps {
  health: number;
  issueCount: number;
  onToggleSettings: () => void;
}

export default function HUD({ health, issueCount, onToggleSettings }: HUDProps) {
  const barColor =
    health >= 70 ? COLORS.HEALTH_GREEN :
    health >= 40 ? COLORS.HEALTH_YELLOW :
    COLORS.HEALTH_RED;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 16px',
        background: 'rgba(30,40,30,0.82)',
        borderRadius: 8,
        minWidth: 260,
      }}
    >
      <div style={{ color: '#E8F5E9', fontSize: 20, fontWeight: 'bold' }}>
        Little Gardener
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#C8E6C9', fontSize: 14 }}>
          健康度:
        </span>
        <span style={{ color: barColor, fontSize: 14, fontWeight: 'bold' }}>
          {health}/100
        </span>
        <button
          type="button"
          onClick={onToggleSettings}
          data-testid="settings-toggle"
          style={{
            marginLeft: 'auto',
            minWidth: 64,
            height: 28,
            background: 'rgba(76,175,80,0.22)',
            border: '1px solid rgba(200,230,201,0.55)',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            color: '#C8E6C9',
          }}
          title="设置 (S)"
        >
          设置
        </button>
      </div>

      <div
        style={{
          width: '100%',
          height: 12,
          background: '#444',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${health}%`,
            height: '100%',
            background: barColor,
            borderRadius: 6,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <span style={{ color: '#C8E6C9', fontSize: 12 }}>
        问题: {issueCount} 个
      </span>
    </div>
  );
}

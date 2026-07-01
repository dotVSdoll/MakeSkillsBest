import { useEffect, useMemo, useRef, useState } from 'react';
import { getSpriteSheets, preloadSprites } from '../sprites/images.ts';

interface PointerCell {
  col: number;
  row: number;
  x: number;
  y: number;
}

export default function SpriteInspector() {
  const sheets = useMemo(() => getSpriteSheets(), []);
  const sheetIds = Object.keys(sheets);
  const [selectedId, setSelectedId] = useState(sheetIds[0] ?? '');
  const [pointerCell, setPointerCell] = useState<PointerCell | null>(null);
  const [copied, setCopied] = useState('');
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selected = sheets[selectedId];
  const scale = selected && Math.max(selected.gridW, selected.gridH) <= 16 ? 4 : 3;

  useEffect(() => {
    void preloadSprites().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 84, 84, 0.82)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= img.naturalWidth; x += selected.gridW) {
        ctx.beginPath();
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= img.naturalHeight; y += selected.gridH) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(canvas.width, y * scale + 0.5);
        ctx.stroke();
      }

      ctx.fillStyle = '#fff36b';
      ctx.font = '10px Consolas, monospace';
      const rows = Math.floor(img.naturalHeight / selected.gridH);
      const cols = Math.floor(img.naturalWidth / selected.gridW);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.fillText(`${col},${row}`, col * selected.gridW * scale + 3, row * selected.gridH * scale + 11);
        }
      }
    };
    img.src = selected.url;
  }, [ready, scale, selected]);

  const copyCell = async () => {
    if (!selected || !pointerCell) return;
    const text = `frame('name', ${pointerCell.col}, ${pointerCell.row})`;
    await navigator.clipboard.writeText(text);
    setCopied(text);
  };

  const updatePointer = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selected) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / scale);
    const y = Math.floor((event.clientY - rect.top) / scale);
    setPointerCell({
      x,
      y,
      col: Math.floor(x / selected.gridW),
      row: Math.floor(y / selected.gridH),
    });
  };

  if (!selected) {
    return <div style={styles.page}>No sprite sheets found.</div>;
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <h1 style={styles.title}>Sprite Inspector</h1>
        <div style={styles.meta}>Grid: {selected.gridW}x{selected.gridH}</div>
        <div style={styles.meta}>
          Cell: {pointerCell ? `${pointerCell.col}, ${pointerCell.row}` : '-'}
        </div>
        <div style={styles.meta}>
          Pixel: {pointerCell ? `${pointerCell.x}, ${pointerCell.y}` : '-'}
        </div>
        <button
          type="button"
          onClick={copyCell}
          disabled={!pointerCell}
          style={styles.button}
        >
          Copy frame()
        </button>
        {copied && <div style={styles.copied}>{copied}</div>}

        <div style={styles.sheetList}>
          {sheetIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSelectedId(id);
                setPointerCell(null);
                setCopied('');
              }}
              style={{
                ...styles.sheetButton,
                ...(id === selectedId ? styles.sheetButtonActive : null),
              }}
            >
              {sheets[id].label}
            </button>
          ))}
        </div>

        <h2 style={styles.subhead}>Named Frames</h2>
        <div style={styles.frames}>
          {selected.frames.map((item) => (
            <code key={item.name} style={styles.frameCode}>
              {item.name}: x {item.x}, y {item.y}, {item.w}x{item.h}
            </code>
          ))}
        </div>
      </aside>

      <main style={styles.stage}>
        <canvas
          ref={canvasRef}
          onMouseMove={updatePointer}
          onMouseLeave={() => setPointerCell(null)}
          onClick={copyCell}
          style={styles.canvas}
        />
      </main>
    </div>
  );
}

const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    background: '#161b22',
    color: '#edf6e5',
    fontFamily: 'Consolas, monospace',
  },
  sidebar: {
    overflow: 'auto',
    padding: 16,
    borderRight: '1px solid rgba(255,255,255,0.12)',
    background: '#202820',
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
  },
  subhead: {
    fontSize: 13,
    margin: '18px 0 8px',
    color: '#a9d18e',
  },
  meta: {
    fontSize: 12,
    marginBottom: 6,
    color: '#cbd8c1',
  },
  button: {
    width: '100%',
    height: 34,
    marginTop: 8,
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 6,
    background: '#2f6f4f',
    color: '#f6fff1',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  copied: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    background: 'rgba(0,0,0,0.24)',
    color: '#ffe082',
    fontSize: 11,
    overflowWrap: 'anywhere' as const,
  },
  sheetList: {
    display: 'grid',
    gap: 6,
    marginTop: 16,
  },
  sheetButton: {
    minHeight: 32,
    padding: '6px 8px',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 6,
    background: '#293429',
    color: '#e9f5df',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
  },
  sheetButtonActive: {
    borderColor: '#ffe082',
    background: '#3d4d32',
  },
  frames: {
    display: 'grid',
    gap: 6,
  },
  frameCode: {
    padding: 6,
    borderRadius: 5,
    background: 'rgba(0,0,0,0.22)',
    fontSize: 11,
    whiteSpace: 'normal' as const,
  },
  stage: {
    overflow: 'auto',
    padding: 24,
  },
  canvas: {
    imageRendering: 'pixelated' as const,
    boxShadow: '0 16px 48px rgba(0,0,0,0.32)',
    cursor: 'crosshair',
  },
};

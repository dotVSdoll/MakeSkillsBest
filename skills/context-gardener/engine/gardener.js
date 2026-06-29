/**
 * Context Gardener — Scanner & Analyser
 *
 * Usage:
 *   node gardener.js <project-path> [options]
 *
 * Options:
 *   --staleDays N     Staleness threshold in days (default: 30)
 *   --maxLines N      Bloat threshold in lines (default: 200)
 *   --maxWords N      Bloat threshold in words (default: 1000)
 *   --output <file>   Write output to file (default: stdout)
 *   --memory <file>   Path to .gardener-memory.json (optional)
 *
 * Output: Gardener report JSON matching .gardener-state.json schema
 *
 * Dependencies: None (uses only Node.js built-in modules)
 */

const fs = require('fs');
const path = require('path');

// ─── Config ───
const args = process.argv.slice(2);
const projectPath = args.find(a => !a.startsWith('--')) || '.';
const staleDays = parseInt(args.find(a => a.startsWith('--staleDays'))?.split('=')[1] || '30', 10);
const maxLines  = parseInt(args.find(a => a.startsWith('--maxLines'))?.split('=')[1] || '200', 10);
const maxWords  = parseInt(args.find(a => a.startsWith('--maxWords'))?.split('=')[1] || '1000', 10);
const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];
const memoryFile = args.find(a => a.startsWith('--memory='))?.split('=')[1];

// ─── Helpers ───
function walkDir(dir, patterns) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...walkDir(fullPath, patterns));
    } else if (entry.isFile() && patterns.some(p => fullPath.endsWith(p))) {
      results.push(fullPath);
    }
  }
  return results;
}

function countSections(content) {
  return (content.match(/^##\s/gm) || []).length;
}

function hasFrontmatter(content) {
  return content.startsWith('---');
}

function extractKeyTerms(content, projectName) {
  const terms = [];
  const words = content.split(/\s+/);
  const freq = {};
  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z一-鿿-]/g, '');
    if (clean.length < 3) continue;
    freq[clean] = (freq[clean] || 0) + 1;
  }
  // Return top 10 most frequent terms
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
}

function readMemory(memoryPath) {
  try {
    if (memoryPath && fs.existsSync(memoryPath)) {
      return JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    }
  } catch (e) {
    // Memory file not available or corrupted — start fresh
  }
  return { sessions: [], patterns: { commonIssues: [], userPreferences: {} }, falsePositives: [] };
}

// ─── Scan ───
function scan(projectPath, memory) {
  const resolvedPath = path.resolve(projectPath || '.');
  const projectName = path.basename(resolvedPath);
  const ignoredPaths = memory?.patterns?.userPreferences?.ignoredPaths || [];
  const now = Date.now();

  // Find context files
  const contextPatterns = [
    '/CLAUDE.md', '/CLAUDE_EN.md',
    '.claude/memory.md',
    '.claude/rules.md',
    '.cursor/rules.md',
    '.github/copilot-instructions.md',
  ];
  const mdFiles = walkDir(resolvedPath, ['.md']);

  // Filter for context files
  const contextFiles = mdFiles.filter(f => {
    const rel = path.relative(resolvedPath, f).replace(/\\/g, '/');
    // Match known context file patterns
    const isContext =
      rel === 'CLAUDE.md' || rel === 'CLAUDE_EN.md' ||
      rel.startsWith('.claude/memory/') ||
      rel.startsWith('.claude/rules/') ||
      rel === '.claude/memory.md' ||
      rel.startsWith('.cursor/rules/') ||
      rel.startsWith('.github/') ||
      rel.startsWith('.claude/commands/');
    // Skip ignored paths
    const isIgnored = ignoredPaths.some(ip => rel.startsWith(ip));
    return isContext && !isIgnored;
  });

  if (contextFiles.length === 0) {
    return { files: [], summary: { totalFiles: 0, totalSize: 0, avgAgeDays: 0 } };
  }

  const files = contextFiles.map(f => {
    const stat = fs.statSync(f);
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const ageMs = now - stat.mtimeMs;
    const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));

    return {
      path: path.relative(resolvedPath, f).replace(/\\/g, '/'),
      size: stat.size,
      lines: lines.length,
      words: wordCount,
      sections: countSections(content),
      hasFrontmatter: hasFrontmatter(content),
      lastModified: stat.mtime.toISOString(),
      ageDays,
      keyTerms: extractKeyTerms(content, projectName),
    };
  });

  const totalFiles = files.length;
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const avgAgeDays = Math.round(files.reduce((s, f) => s + f.ageDays, 0) / totalFiles);

  return {
    files,
    summary: { totalFiles, totalSize, avgAgeDays }
  };
}

// ─── Analyse ───
function analyse(scanned, config) {
  const issues = [];

  for (const file of scanned.files) {
    // D1: Stale
    if (file.ageDays > config.staleDays) {
      const sev = file.ageDays > config.staleDays * 3 ? 'P1' : file.ageDays > config.staleDays * 2 ? 'P2' : 'P3';
      issues.push({
        id: `stale-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'stale',
        severity: sev,
        file: file.path,
        detail: `${file.ageDays} 天未更新（阈值：${config.staleDays} 天）`,
        suggestion: file.ageDays > 90 ? '审查文件内容，更新过时信息或归档' : '检查是否有新的约定需要补充',
        requiresConfirmation: sev === 'P1',
      });
    }

    // D3: Bloat
    let bloatReasons = [];
    if (file.lines > config.maxLines) bloatReasons.push(`${file.lines} 行（阈值：${config.maxLines} 行）`);
    if (file.words > config.maxWords) bloatReasons.push(`${file.words} 字（阈值：${config.maxWords} 字）`);

    if (bloatReasons.length > 0) {
      const sev = file.lines > config.maxLines * 2 ? 'P1' : 'P2';
      issues.push({
        id: `bloat-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'bloat',
        severity: sev,
        file: file.path,
        detail: bloatReasons.join('；'),
        suggestion: '考虑拆分为多个主题文件，或移除不再需要的内容',
        requiresConfirmation: sev === 'P1',
      });
    }
  }

  // D2: Contradictions — look for conflicting pairs
  const allContents = {};
  for (const file of scanned.files) {
    try {
      allContents[file.path] = fs.readFileSync(path.resolve(projectPath, file.path), 'utf-8').toLowerCase();
    } catch (e) {
      allContents[file.path] = '';
    }
  }

  const contradictionPairs = [
    ['use tabs', 'use spaces'],
    ['camelcase', 'snake_case'],
    ['camel_case', 'snake_case'],
    ['2 spaces', '4 spaces'],
    ['single quote', 'double quote'],
    ['semicolon', 'no semicolon'],
    ['trailing comma', 'no trailing comma'],
  ];

  const paths = Object.keys(allContents);
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      for (const [a, b] of contradictionPairs) {
        const hasA_i = allContents[paths[i]].includes(a);
        const hasA_j = allContents[paths[j]].includes(a);
        const hasB_i = allContents[paths[i]].includes(b);
        const hasB_j = allContents[paths[j]].includes(b);
        if ((hasA_i && hasB_j) || (hasB_i && hasA_j)) {
          issues.push({
            id: `contra-${i}-${j}-${a.replace(/\s+/g, '-')}`,
            type: 'contradiction',
            severity: 'P0',
            files: [paths[i], paths[j]],
            file: `${paths[i]} ↔ ${paths[j]}`,
            detail: `"${a}" 与 "${b}" 在两个文件中同时出现，可能互相矛盾`,
            suggestion: '统一规则，确保两个文件所述一致',
            requiresConfirmation: true,
          });
        }
      }
    }
  }

  // D5: Orphan — check if memory files reference deleted code
  const sourceExtensions = ['.js', '.ts', '.py', '.go', '.rs', '.java', '.rb', '.php'];
  for (const file of scanned.files) {
    if (!file.path.includes('memory')) continue;
    try {
      const content = fs.readFileSync(path.resolve(projectPath, file.path), 'utf-8');
      // Extract referenced filenames from memory file
      const refs = content.match(/\b[a-zA-Z0-9_-]+\.(js|ts|py|go|rs|java|rb|php)\b/g) || [];
      const uniqueRefs = [...new Set(refs)];
      for (const ref of uniqueRefs) {
        // Check if referenced file still exists in the project
        const refExists = fs.existsSync(path.resolve(projectPath, ref)) ||
          walkDir(projectPath, sourceExtensions).some(f => f.endsWith(ref));
        if (!refExists) {
          issues.push({
            id: `orphan-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}-${ref.replace(/[^a-zA-Z0-9]/g, '-')}`,
            type: 'orphan',
            severity: 'P0',
            file: file.path,
            detail: `引用了已不存在的文件：${ref}`,
            suggestion: `更新引用或移除相关段落。文件 ${ref} 可能已被删除或重命名`,
            requiresConfirmation: true,
          });
        }
      }
    } catch (e) {
      // skip unreadable files
    }
  }

  // Deduplicate contradictions by normalising the pair
  const seen = new Set();
  const deduped = issues.filter(issue => {
    const key = `${issue.type}:${issue.file.replace(/\s/g, '')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Compute health score
  let score = 100;
  for (const issue of deduped) {
    if (issue.severity === 'P0') score -= 25;
    else if (issue.severity === 'P1') score -= 10;
    else if (issue.severity === 'P2') score -= 5;
    else if (issue.severity === 'P3') score -= 2;
  }
  score = Math.max(0, score);

  const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0 };
  deduped.forEach(i => { bySeverity[i.severity]++; });

  return {
    issues: deduped,
    summary: {
      totalIssues: deduped.length,
      bySeverity,
      gardenHealthScore: score,
    }
  };
}

// ─── Main ───
function main() {
  const startTime = Date.now();
  const memory = readMemory(memoryFile);
  const scanned = scan(projectPath, memory);

  if (scanned.files.length === 0) {
    const report = {
      repo: path.basename(path.resolve(projectPath)),
      timestamp: new Date().toISOString(),
      duration: '0m 0s',
      health: { current: 100, previous: null },
      files: [],
      issues: [],
      comparison: null,
      summary: { message: '⚠️ 未找到上下文文件。Gardener 管理的是 .claude/ 下的指令和记忆文件' }
    };
    outputReport(report);
    return;
  }

  const analysed = analyse(scanned, { staleDays, maxLines, maxWords });

  const report = {
    repo: path.basename(path.resolve(projectPath)),
    timestamp: new Date().toISOString(),
    duration: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    health: {
      current: analysed.summary.gardenHealthScore,
      previous: null,
      issuesResolved: null,
      issuesRemaining: analysed.summary.totalIssues,
    },
    files: scanned.files.map(f => ({
      path: f.path,
      score: Math.max(0, 100 - (analysed.issues.filter(i => i.file === f.path || i.files?.includes(f.path)).length * 15)),
      lines: f.lines,
      ageDays: f.ageDays,
      issues: analysed.issues.filter(i => i.file === f.path || (i.files && i.files.includes(f.path)))
        .map(i => ({ severity: i.severity, type: i.type, detail: i.detail })),
    })),
    issues: analysed.issues.map(i => ({
      id: i.id,
      severity: i.severity,
      type: i.type,
      file: i.file,
      detail: i.detail,
      suggestion: i.suggestion,
    })),
    comparison: null,
    improvements: []
  };

  outputReport(report);
}

function outputReport(report) {
  const json = JSON.stringify(report, null, 2);
  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), json, 'utf-8');
    console.log(`📝 Garden report written to ${outputFile}`);
  } else {
    console.log(json);
  }
}

main();

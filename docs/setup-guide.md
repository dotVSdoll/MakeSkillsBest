# 安装指南 — 如何在不同 AI Coding 工具中加载 MakeSkillsBest

## Claude Code（推荐）

### 方式 1: Marketplace（支持自动更新）

```bash
# 在 Claude Code 会话中
/plugin marketplace add https://github.com/dotVSdoll/MakeSkillsBest.git
/plugin install MakeSkillsBest@make-skills-best
```

Marketplace 安装会自动处理版本更新。运行 `claude plugin update make-skills-best@make-skills-best` 强制检查。

### 方式 2: npx skills

```bash
npx skills add https://github.com/dotVSdoll/MakeSkillsBest.git -g -a claude-code
```

`-g` 全局安装，所有项目可用。

### 方式 3: 手动符号链接

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git ~/MakeSkillsBest
ln -s ~/MakeSkillsBest/skills/repo-decompose ~/.claude/skills/repo-decompose
ln -s ~/MakeSkillsBest/skills/knowledge-graph ~/.claude/skills/knowledge-graph
ln -s ~/MakeSkillsBest/skills/semantic-rag ~/.claude/skills/semantic-rag
ln -s ~/MakeSkillsBest/skills/mvp-approach ~/.claude/skills/mvp-approach
```

### 使用

```bash
# 管道模式
/decompose https://github.com/immerjs/immer
/mvp

# 独立模式
/explain https://github.com/immerjs/immer in Chinese
/graph src/
```

---

## Codex

```bash
npx skills add https://github.com/dotVSdoll/MakeSkillsBest.git -g -a codex
```

更新：
```bash
npx skills update make-skills-best -g
```

Codex 中的 skill 调用方式取决于 Codex 的 skill 触发机制。Skill 的 `name` 字段（如 `repo-decompose`）即为调用名。

---

## Cursor

### 方式 1: 复制到 .cursor/rules/

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git /tmp/MakeSkillsBest

# 为每个 skill 创建 Cursor rule
cp /tmp/MakeSkillsBest/skills/repo-decompose/SKILL.md .cursor/rules/repo-decompose.md
cp /tmp/MakeSkillsBest/skills/knowledge-graph/SKILL.md .cursor/rules/knowledge-graph.md
cp /tmp/MakeSkillsBest/skills/semantic-rag/SKILL.md .cursor/rules/semantic-rag.md
cp /tmp/MakeSkillsBest/skills/mvp-approach/SKILL.md .cursor/rules/mvp-approach.md
```

### 方式 2: npx skills

```bash
npx skills add https://github.com/dotVSdoll/MakeSkillsBest.git -a cursor
```

### 使用

在 Cursor 中通过 `/` 命令或直接对话触发。Skill 的 `triggers` 关键词会自动匹配。

---

## Gemini CLI

### 方式 1: Gemini Skills Install

```bash
gemini skills install https://github.com/dotVSdoll/MakeSkillsBest.git --path skills
```

### 方式 2: npx skills

```bash
npx skills add https://github.com/dotVSdoll/MakeSkillsBest.git -g -a gemini-cli
```

---

## Windsurf

将每个 SKILL.md 的内容复制到 Windsurf 的 Rules 配置中：

1. 打开 Windsurf → Settings → Rules
2. 为每个 skill 创建一个 Rule
3. 将对应的 SKILL.md 内容粘贴进去
4. 设置 Rule 类型为 "Always" 或 "Manual"

---

## GitHub Copilot

### 作为自定义指令

将需要始终生效的 skill 内容合并到 `.github/copilot-instructions.md`：

```bash
cat skills/mvp-approach/SKILL.md >> .github/copilot-instructions.md
```

### 作为 Agent 定义

Copilot 支持自定义 agent persona。将 `agents/` 目录下的定义复制到 `.github/agents/`。

---

## 手动安装（适用于任何接受系统提示词的 Agent）

```bash
git clone https://github.com/dotVSdoll/MakeSkillsBest.git

# 将 SKILL.md 内容注入到你的 agent 系统提示词中
# 或者将仓库路径配置为 skill 目录
```

---

## 验证安装

安装完成后，运行以下命令验证：

```bash
# Claude Code
/decompose --help    # 应显示 skill 描述

# 其他工具
# 输入 "explain this repo in Chinese" → 应触发 semantic-rag
# 输入 "map the dependencies in src/" → 应触发 knowledge-graph
```

---

## 卸载

```bash
# npx skills
npx skills remove make-skills-best -g

# Claude Code Marketplace
/plugin uninstall MakeSkillsBest@make-skills-best

# 手动
rm -rf ~/.claude/skills/repo-decompose
rm -rf ~/.claude/skills/knowledge-graph
rm -rf ~/.claude/skills/semantic-rag
rm -rf ~/.claude/skills/mvp-approach
```

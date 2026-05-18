# 🦞 AI 注释生成器

> 选中代码，右键一键 AI 生成注释。支持 JS/TS/React/Vue/CSS/Python。

[![VSCode](https://img.shields.io/badge/VSCode-1.85+-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ 功能

- **选中生成** — 选中代码 → 右键 → 「AI 生成注释」，3 秒搞定
- **两种风格** — 简洁注释（一句话） / 详细注释（JSDoc / docstring）
- **整文件注释** — 右键 「AI 为整个文件添加注释」，自动识别未注释的函数
- **保存时自动补** — 开启后每次保存自动添加注释（设置中开关）
- **多语言支持** — 自动识别注释风格

| 语言 | 简洁 | 详细 |
|------|------|------|
| JavaScript / TypeScript | `//` | `/** */` |
| React (JSX / TSX) | `//` | `/** */` |
| CSS / SCSS / Less | `/* */` | `/* 多行 */` |
| HTML / Vue 模板 | `<!-- -->` | `<!-- -->` |
| Python / Ruby | `#` | `"""docstring"""` |

- **中文/英文** — 设置中自由切换
- **基于 DeepSeek** — 速度快、成本低

## 📦 安装

### 从 VSCode 插件商店安装（即将上架）

搜索 `AI 注释生成器` 或 `ai-comment-gen`。

### 手动安装

1. 下载 [最新 .vsix](https://github.com/1552394362/ai-comment-gen/releases)
2. VSCode → 扩展 → 右上角 `...` → 从 VSIX 安装

## 🚀 使用

### 选中代码生成注释

```
1. 选中代码
2. 右键 → 「AI 生成注释」（简洁） / 「AI 生成详细注释」（JSDoc）
3. AI 自动插入注释
```

### 全文件注释

```
1. 打开文件
2. 右键 → 「AI 为整个文件添加注释」
3. 插件自动扫描未注释的函数并批量生成
```

### 保存时自动补注释

```
1. Ctrl + , 打开设置
2. 搜索 `autoCommentOnSave`
3. 勾选开启
```

## ⚙️ 配置

| 配置项 | 说明 | 默认值 |
|-------|------|--------|
| `aiCommentGen.apiKey` | DeepSeek API Key（必填） | `""` |
| `aiCommentGen.locale` | 注释语言 | `zh-CN` |
| `aiCommentGen.style` | 注释风格（简洁/详细） | `concise` |
| `aiCommentGen.autoCommentOnSave` | 保存时自动补注释 | `false` |
| `aiCommentGen.batchLimit` | 整文件一次最多注释数 | `5` |

## 🏗 技术栈

- VSCode Extension API
- DeepSeek API（兼容 OpenAI 格式）
- Node.js

## 📄 License

[MIT](LICENSE)

## 👨‍💻 作者

[朱景坤](https://github.com/1552394362) - 10 年前端开发者

---

如果觉得有用，欢迎 ⭐ Star 支持！

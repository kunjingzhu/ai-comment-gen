# 🦞 AI 注释生成�?
> 选中代码，右键一�?AI 生成注释。支�?JS/TS/React/Vue/CSS/Python�?
[![VSCode](https://img.shields.io/badge/VSCode-1.85+-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.7-blue)](https://github.com/kunjingzhu/ai-comment-gen/releases)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4F46E5)](https://deepseek.com)

## �?功能

- **选中生成** �?选中代码 �?右键 �?「AI 生成注释」，3 秒搞�?- **两种风格** �?简洁注释（一句话�? 详细注释（JSDoc / docstring�?- **整文件注�?* �?右键「AI 为整个文件添加注释」，自动扫描未注释的函数并批量生�?- **保存时自动补** �?开启后每次保存自动添加注释（设置中开关）
- **多语言支持** �?自动识别注释风格

| 语言 | 简�?| 详细 |
|------|------|------|
| JavaScript / TypeScript | `// 一句话` | `/** JSDoc */` |
| React (JSX / TSX) | `// 一句话` | `/** JSDoc */` |
| CSS / SCSS / Less | `/* 一句话 */` | `/* 多行 */` |
| HTML / Vue 模板 | `<!-- 一句话 -->` | `<!-- 多行 -->` |
| Python / Ruby | `# 一句话` | `"""docstring"""` |

- **中文/英文** �?设置中自由切�?- **基于 DeepSeek** �?速度快、成本低，百�?token 只要几块�?
## 📦 安装

### �?VSCode 插件商店安装（即将上架）

搜索 `AI 注释生成器` �?`ai-comment-gen`�?
### 手动安装（推荐）

1. 下载最�?`.vsix` 文件�?   - [GitHub Releases](https://github.com/kunjingzhu/ai-comment-gen/releases) �?下载最新的 `ai-comment-gen-x.x.x.vsix`
2. VSCode �?扩展 �?右上�?`...` �?�?VSIX 安装
3. 设置 DeepSeek API Key（见下方配置�?
## 🚀 使用

### 选中代码生成注释

```
1. 选中代码
2. 右键 �?「AI 生成注释」（简洁） / 「AI 生成详细注释」（JSDoc�?3. AI 自动在选中代码上方插入注释
```

### 全文件注�?
```
1. 打开文件
2. 右键 �?「AI 为整个文件添加注释�?3. 插件自动扫描未注释的函数，逐个生成详细注释
```

### 保存时自动补注释

```
1. Ctrl + , 打开设置
2. 搜索 `autoCommentOnSave`
3. 勾选开启（需要先设置 API Key�?```

## ⚙️ 配置

| 配置�?| 说明 | 默认�?|
|-------|------|--------|
| `aiCommentGen.apiKey` | DeepSeek API Key（必填） | `""` |
| `aiCommentGen.apiUrl` | API 地址（兼�?OpenAI 格式�?| `https://api.deepseek.com/v1/chat/completions` |
| `aiCommentGen.model` | 模型名称 | `deepseek-chat` |
| `aiCommentGen.locale` | 注释语言（zh-CN / en�?| `zh-CN` |
| `aiCommentGen.style` | 注释风格（concise / detailed�?| `concise` |
| `aiCommentGen.autoCommentOnSave` | 保存时自动补注释 | `false` |
| `aiCommentGen.batchLimit` | 整文件一次最多注释数 | `5` |

> 💡 **获取 API Key**：注�?[DeepSeek](https://platform.deepseek.com/) �?创建 API Key �?新用户赠�?500 �?token 免费额度

## 🏗 技术栈

- VSCode Extension API
- DeepSeek API（兼�?OpenAI 格式�?- Node.js

## 📄 License

[MIT](LICENSE)

## 👨‍�?作�?
[朱景坤](https://github.com/kunjingzhu) - 10 年前端开发�?
---

如果觉得有用，欢�?�?Star 支持�?

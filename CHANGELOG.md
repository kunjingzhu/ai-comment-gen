# Changelog

## [0.1.8] - 2026-05-18

### Added
- 插件图标（128x128 PNG）
- README 添加 Star 徽章和掘金/知乎文章链接
- 新增 `apiUrl` 和 `model` 配置项

### Changed
- 更新 README 文档

## [0.1.7] - 2026-05-18

### Fixed
- 优化 `candidates` 扫描逻辑，跳过控制流语句、匿名回调和箭头函数参数

### Added
- 项目文档更新

## [0.1.6] - 2026-05-18

### Added
- `extractCommentBlock` 智能提取纯注释内容

### Fixed
- 修复全文件注释插入重复代码问题
- 修复 Markdown 包裹绕过后端注释检查的问题

## [0.1.5] - 2026-05-18

### Fixed
- 修复多行注释只给第一行加 `//` 的问题
- 优化 `formatComment` 多行分支处理

## [0.1.4] - 2026-05-18

### Fixed
- 修复 `formatComment` 选中代码时注释插入位置错误
- 注释现在插入到选中代码上方而非末尾

## [0.1.3] - 2026-05-18

### Added
- 右键菜单分组排序
- 右键 "AI 为整个文件添加注释" 功能

### Changed
- 优化命令菜单显示

## [0.1.2] - 2026-05-16

### Added
- `autoCommentOnSave` 保存时自动补注释功能
- `batchLimit` 配置项

### Fixed
- 优化 Batch 操作策略

## [0.1.1] - 2026-05-16

### Added
- 新增 Python / CSS / HTML 语言支持
- 英文注释支持（locale 配置）
- "AI 生成详细注释（JSDoc）" 命令

### Changed
- 优化 DeepSeek prompt 设计

## [0.1.0] - 2026-05-16

### Added
- 初始版本发布
- 选中代码 → AI 生成注释
- 支持 JavaScript / TypeScript / React (JSX/TSX) / Vue
- 简洁注释和详细 JSDoc 两种风格
- DeepSeek API 集成
- GitHub 仓库初始化

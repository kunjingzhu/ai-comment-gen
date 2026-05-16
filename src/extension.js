const vscode = require('vscode');
const { generateComment } = require('./ai');

/**
 * 插件激活入口
 */
function activate(context) {
  console.log('✅ AI 注释生成器已激活');

  // ── 右键菜单：生成简洁注释 ──
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment-gen.addComment', async () => {
      await handleSelectionComment('concise');
    })
  );

  // ── 右键菜单：生成详细注释 ──
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment-gen.addCommentDetailed', async () => {
      await handleSelectionComment('detailed');
    })
  );

  // ── 命令：为整个文件生成注释 ──
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-comment-gen.addFileComments', async () => {
      await handleFileComment();
    })
  );

  // ── 保存时自动补注释（可开关） ──
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      const config = vscode.workspace.getConfiguration('aiCommentGen');
      if (!config.get('autoCommentOnSave')) return;
      await handleFileComment(true);
    })
  );
}

// ──────────────────── 选中的代码生成注释 ────────────────────

async function handleSelectionComment(style) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showWarningMessage('请先打开一个文件');

  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);
  if (!selectedText.trim()) return vscode.window.showWarningMessage('请先选中要生成注释的代码');

  const config = vscode.workspace.getConfiguration('aiCommentGen');
  const apiKey = await ensureApiKey(config);
  if (!apiKey) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '🤖 AI 正在生成注释...', cancellable: false },
    async () => {
      try {
        const language = editor.document.languageId;
        const prompt = buildSelectionPrompt(selectedText, language, style, config);
        const comment = await generateComment(prompt, config);
        if (!comment) return vscode.window.showErrorMessage('AI 未能生成注释');

        await editor.edit((editBuilder) => {
          editBuilder.insert(selection.start, formatComment(comment, language, style));
        });
        vscode.window.showInformationMessage('✅ 注释已生成');
      } catch (err) {
        vscode.window.showErrorMessage('生成失败: ' + err.message);
      }
    }
  );
}

// ──────────────────── 整个文件生成注释 ────────────────────

async function handleFileComment(isAutoSave = false) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;
  const fullText = document.getText();
  if (!fullText.trim()) return;

  const config = vscode.workspace.getConfiguration('aiCommentGen');
  const apiKey = await ensureApiKey(config, isAutoSave);
  if (!apiKey) return;

  // 如果是在自动保存时触发，且没有更改则不处理
  if (isAutoSave) {
    const lastHash = fileHash.get(document.uri.toString());
    const currentHash = simpleHash(fullText);
    if (lastHash === currentHash) return;
    fileHash.set(document.uri.toString(), currentHash);
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '🤖 AI 正在分析整个文件...', cancellable: true },
    async (progress, token) => {
      try {
        const language = document.languageId;
        const lines = fullText.split('\n');

        // 找出还没有注释的函数/方法（简单启发式：找到 function / def / const xxx = 开头的行）
        const candidates = [];
        const commentPattern = /^\s*(\/\/|#|\/\*|<!--|""")/;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // 跳过空行、注释行、import/export
          if (!line || commentPattern.test(line)) continue;
          if (/^(import|export|from|require|package|using)/.test(line)) continue;
          if (/^[{\[\]})]/.test(line)) continue;

          // 匹配函数/方法定义
          if (
            /^(export\s+)?(async\s+)?function\s+\w/.test(line) ||
            /^(export\s+)?(async\s+)?const\s+\w+\s*=/.test(line) ||
            /^def\s+\w/.test(line) ||
            /^(public|private|protected)\s+(async\s+)?\w+\s*\(/.test(line) ||
            /^\w+\s*\(/.test(line)
          ) {
            // 检查上一行是否已有注释
            if (i > 0 && commentPattern.test(lines[i - 1].trim())) continue;
            candidates.push({ lineNum: i, text: line });
          }
        }

        if (candidates.length === 0) {
          if (!isAutoSave) vscode.window.showInformationMessage('所有函数已有注释，无需生成');
          return;
        }

        // 告诉用户找到多少候选
        if (!isAutoSave) {
          vscode.window.showInformationMessage(`找到 ${candidates.length} 个待注释的函数`);
        }

        // 批量生成注释（只取前5个，避免API调用太多）
        const batch = candidates.slice(0, 5);
        const edits = [];

        for (const c of batch) {
          const prompt = buildSelectionPrompt(c.text, language, 'detailed', config);
          try {
            const comment = await generateComment(prompt, config);
            if (comment) {
              edits.push({ lineNum: c.lineNum, comment: formatComment(comment, language, 'detailed') });
            }
          } catch {
            // 单个失败不影响其他的
          }
        }

        // 从后往前插入（避免行号偏移）
        edits.sort((a, b) => b.lineNum - a.lineNum);
        await editor.edit((editBuilder) => {
          for (const e of edits) {
            editBuilder.insert(new vscode.Position(e.lineNum, 0), e.comment);
          }
        });

        const successCount = edits.length;
        if (successCount > 0) {
          vscode.window.showInformationMessage(`✅ 已为 ${successCount} 个函数添加注释`);
        }
      } catch (err) {
        if (!isAutoSave) vscode.window.showErrorMessage('批处理失败: ' + err.message);
      }
    }
  );
}

// ──────────────────── 辅助函数 ────────────────────

const fileHash = new Map();

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function ensureApiKey(config, isAutoSave = false) {
  let apiKey = config.get('apiKey');
  if (!apiKey && !isAutoSave) {
    apiKey = await vscode.window.showInputBox({
      prompt: '请输入你的 DeepSeek API Key',
      password: true,
      placeHolder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      ignoreFocusOut: true,
    });
    if (apiKey) {
      await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
    }
  }
  return apiKey;
}

// ──────────────────── Prompt 构建 ────────────────────

function buildSelectionPrompt(code, language, style, config) {
  const locale = config.get('locale');
  const isZh = locale === 'zh-CN';

  const styleDesc = isZh
    ? (style === 'detailed' ? '详细 JSDoc 风格注释，每行参数都标注' : '简洁的行注释，一句话概括代码逻辑')
    : (style === 'detailed' ? 'Detailed JSDoc style, annotate every parameter' : 'Concise line comment, one sentence summary');

  const langHint = isZh
    ? `代码语言: ${language}${language === 'python' ? '，如果生成详细注释请用 reStructuredText 或 Google 风格的 docstring 格式' : ''}`
    : `Language: ${language}${language === 'python' ? ', use reStructuredText or Google style docstring for detailed comments' : ''}`;

  return `${isZh ? '你是一个资深前端工程师，请为以下代码生成注释。' : 'You are a senior frontend engineer. Generate comments for the following code.'}
${styleDesc}
${langHint}
${isZh ? '只返回注释内容，不要多余的解释。用' : 'Return only the comment, no extra explanation. Use'} ${isZh ? '中文' : 'English'}

\`\`\`${language}
${code}
\`\`\``;
}

// ──────────────────── 格式化注释 ────────────────────

function formatComment(comment, language, style) {
  if (comment.startsWith('//') || comment.startsWith('/*') || comment.startsWith('#') || comment.startsWith('<!--') || comment.startsWith('"""')) {
    return comment + '\n';
  }

  if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(language)) {
    if (style === 'detailed' || comment.includes('@param') || comment.includes('@returns')) {
      return '/**\n * ' + comment.split('\n').join('\n * ') + '\n */\n';
    }
    return '// ' + comment.trim() + '\n';
  }

  if (['python', 'ruby'].includes(language)) {
    if (style === 'detailed' || comment.includes(':param') || comment.includes(':return')) {
      return '"""\n' + comment.trim() + '\n"""\n';
    }
    return '# ' + comment.trim() + '\n';
  }

  if (['css', 'scss', 'less', 'sass', 'stylus', 'postcss'].includes(language)) {
    if (style === 'detailed') {
      return '/*\n * ' + comment.split('\n').join('\n * ') + '\n */\n';
    }
    return '/* ' + comment.trim() + ' */\n';
  }

  if (['html', 'xml', 'svg', 'vue'].includes(language)) {
    return '<!-- ' + comment.trim() + ' -->\n';
  }

  return '// ' + comment.trim() + '\n';
}

function deactivate() {}

module.exports = { activate, deactivate };

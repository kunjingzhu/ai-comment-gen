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

        // 将注释插入到选中区域的正上方一行
        const insertLine = new vscode.Position(selection.start.line, 0);
        await editor.edit((editBuilder) => {
          editBuilder.insert(insertLine, formatComment(comment, language, style));
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

        // 找出还没有注释的函数/方法
        const candidates = [];
        const commentPattern = /^\s*(\/\/|#|\/\*|<!--|""")/;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // 跳过空行、注释行、import/export
          if (!line || commentPattern.test(line)) continue;
          if (/^(import|export|from|require|package|using)/.test(line)) continue;
          if (/^[{\[\]})]/.test(line)) continue;
          // 跳过：if/else/for/while/return/switch/case/try/catch/function(匿名)/箭头函数参数等
          if (/^(if|else|for|while|return|switch|case|try|catch|finally|break|continue|throw|new|typeof|delete|void|yield|await|async|static|get|set)\b/.test(line)) continue;
          // 跳过回调函数（前一行不是空行且缩进较深）
          if (/^function\s*\(/.test(line) && i > 0 && lines[i-1].trim() !== '') continue;
          // 跳过只有括号和箭头函数参数的行，如 (str, a, b) =>
          if (/^\([^)]*\)\s*=>/.test(line)) continue;
          // 跳过字符串和正则开头的行
          if (/^['"`/]/.test(line)) continue;

          // 匹配函数/方法定义（排除了控制流语句、回调等）
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
            let comment = await generateComment(prompt, config);
            if (comment) {
              // 清理 AI 返回中可能混入的代码内容（只保留注释部分）
              comment = cleanCommentOnly(comment);
              if (comment) {
                edits.push({ lineNum: c.lineNum, comment: formatComment(comment, language, 'detailed') });
              }
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
${isZh ? '只返回注释内容，不要多余的解释，不要用 markdown 代码块包裹。用' : 'Return only the comment, no extra explanation, do NOT wrap it in markdown code blocks. Use'} ${isZh ? '中文' : 'English'}

\`\`\`${language}
${code}
\`\`\``;
}

// ──────────────────── 格式化注释 ────────────────────

function formatComment(comment, language, style) {
  let text = comment.trim();

  // 清理 AI 返回时可能带的 markdown 代码块包裹
  text = text.replace(/^```\w*\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

  // 如果 AI 返回的内容以注释开头但后面混入了代码，只提取注释部分
  if (text.startsWith('/*') || text.startsWith('//') || text.startsWith('#') || text.startsWith('<!--') || text.startsWith('"""')) {
    // 检查是否混入了代码（注释结束之后还有非空行不是注释）
    const cleaned = extractCommentBlock(text, language);
    if (cleaned !== text) {
      // 混入了代码，只取注释部分
      return cleaned + '\n';
    }
    return text + '\n';
  }

  const lines = text.split('\n').filter(l => l.trim());

  if (lines.length > 1) {
    if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(language)) {
      if (style === 'detailed') {
        return '/**\n * ' + lines.join('\n * ') + '\n */\n';
      }
      return lines.map(l => '// ' + l).join('\n') + '\n';
    }
    if (['python', 'ruby'].includes(language)) {
      if (style === 'detailed') {
        return '"""\n' + text + '\n"""\n';
      }
      return lines.map(l => '# ' + l).join('\n') + '\n';
    }
    if (['css', 'scss', 'less', 'sass'].includes(language)) {
      if (style === 'detailed') {
        return '/*\n * ' + lines.join('\n * ') + '\n */\n';
      }
      return lines.map(l => '/* ' + l + ' */').join('\n') + '\n';
    }
    if (['html', 'xml', 'svg', 'vue'].includes(language)) {
      return lines.map(l => '<!-- ' + l + ' -->').join('\n') + '\n';
    }
    return lines.map(l => '// ' + l).join('\n') + '\n';
  }

  const line = lines[0] || text;

  if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(language)) {
    if (style === 'detailed' || line.includes('@param') || line.includes('@returns')) {
      return '/**\n * ' + line + '\n */\n';
    }
    return '// ' + line + '\n';
  }

  if (['python', 'ruby'].includes(language)) {
    if (style === 'detailed' || line.includes(':param') || line.includes(':return')) {
      return '"""\n' + line + '\n"""\n';
    }
    return '# ' + line + '\n';
  }

  if (['css', 'scss', 'less', 'sass', 'stylus', 'postcss'].includes(language)) {
    if (style === 'detailed') {
      return '/*\n * ' + line + '\n */\n';
    }
    return '/* ' + line + ' */\n';
  }

  if (['html', 'xml', 'svg', 'vue'].includes(language)) {
    return '<!-- ' + line + ' -->\n';
  }

  return '// ' + line + '\n';
}

/**
 * 从 AI 返回的内容中提取纯注释部分，去掉混入的代码
 * 防止 AI 在详细模式下把整段代码（含注释）一起返回
 */
/**
 * 提取纯注释内容，去掉混入的后续代码
 * 例如 AI 返回了 JSDoc + 函数体，只取 JSDoc 部分
 */
function extractCommentBlock(text, language) {
  // 如果以 /* 开头，尝试找到闭合的 */
  if (/^\/\*/.test(text)) {
    const endIdx = text.indexOf('*/');
    if (endIdx !== -1) {
      const commentPart = text.slice(0, endIdx + 2);
      const rest = text.slice(endIdx + 2).trim();
      // 如果后面还有内容且不是纯注释，说明混入了代码
      if (rest) {
        return commentPart;
      }
    }
  }

  // 如果以 // 或 # 开头，检查是否每行都是注释
  if (/^(\/\/|#)/m.test(text)) {
    const lines = text.split('\n').filter(l => l.trim());
    const allComments = lines.every(l => /^\s*(\/\/|#)/.test(l.trim()));
    if (!allComments) {
      // 只取注释行
      return lines.filter(l => /^\s*(\/\/|#)/.test(l.trim())).join('\n');
    }
  }

  return text;
}

function cleanCommentOnly(text) {
  // 尝试提取第一个完整的注释块 /* ... */
  const blockMatch = text.match(/\/\*[\s\S]*?\*\//);
  if (blockMatch) {
    // 检查是否只有注释块（没有后续代码再出现）
    const after = text.slice(blockMatch.index + blockMatch[0].length).trim();
    if (!after || /^\s*\/\//.test(after) || /^\s*\/\*/.test(after)) {
      // 后面只有注释或空白，说明AI返回的是纯注释
      return text;
    }
    // 后面有代码 → 只取第一个注释块
    return blockMatch[0];
  }

  // 尝试提取单行注释集合 // ...
  const lines = text.split('\n').filter(l => l.trim());
  const commentLines = lines.filter(l => /^\s*(\/\/|#|<!--)/.test(l.trim()));
  if (commentLines.length > 0 && commentLines.length === lines.length) {
    return text; // 全部是注释行
  }
  if (commentLines.length > 0) {
    return commentLines.join('\n'); // 只取注释行
  }

  return text;
}

function deactivate() {}

module.exports = { activate, deactivate };

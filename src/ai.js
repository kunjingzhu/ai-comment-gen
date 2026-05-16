const vscode = require('vscode');

/**
 * 调用 AI API 生成注释
 */
async function generateComment(prompt, config) {
  const apiKey = config.get('apiKey');
  const apiUrl = config.get('apiUrl');
  const model = config.get('model');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('API 返回为空');
  }

  return content;
}

module.exports = { generateComment };

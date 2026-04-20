# reddit-stocks-translator

一个自用的 Chrome 扩展，用来把 Reddit 里的**帖子相关内容**自动翻译成中文，并尽量保留原始英文内容方便对照阅读。

---

## 中文说明（默认）

### 当前支持范围
本插件目前支持：

- Reddit 首页：`https://www.reddit.com/`
- 任意 subreddit 列表页：`https://www.reddit.com/r/<subreddit>/`
- 任意帖子详情页：
  - `https://www.reddit.com/comments/...`
  - `https://www.reddit.com/r/<subreddit>/comments/...`

### 主要翻译内容
插件主要翻译**帖子相关内容**：

- 帖子标题
- 列表摘要
- 正文内容
- 评论内容

### 尽量不翻译的内容
插件会尽量避开这些站点 UI：

- 顶部导航
- 按钮
- 侧边栏
- 工具性标签
- 明显广告 / promoted 文案

---

## 显示效果

- 原始英文保留
- 插件插入的翻译块：**浅蓝背景 + 红色文字**
- 正文中已经出现的中文内容：也会尽量显示为**红色**

---

## 当前实现方式

### 技术方案
- Chrome Manifest V3
- Google Cloud Translation Basic v2（自用直连 API Key）
- 混合识别策略：
  - 先匹配强特征（如 `/comments/` 链接、帖子/评论正文容器）
  - 不够时再回退到可见文本扫描
- 使用 `chrome.storage.local` 做本地缓存
- 设置页中可以查看调试日志

### 主要文件
- `manifest.json` — 扩展元数据和权限
- `content.js` — Reddit 页面扫描、翻译请求、DOM 注入、正文中文着色、调试日志
- `shared.js` — URL 识别、过滤规则、批处理、调试辅助函数
- `options.html` / `options.js` — API Key 设置和日志查看
- `styles.css` — 翻译块样式和正文中文红色样式
- `tests/shared.test.js` — 核心辅助逻辑测试
- `docs/superpowers/specs/` — 设计文档
- `docs/superpowers/plans/` — 实现计划文档

---

## 本地开发

### 1. 克隆仓库
```bash
git clone https://github.com/changdaye/reddit-stocks-translator.git
cd reddit-stocks-translator
```

### 2. 运行测试
```bash
npm test
```

预期结果：所有 Node 测试通过。

---

## 加载到 Chrome

### 1. 打开扩展页
在 Chrome 中打开：

```text
chrome://extensions/
```

### 2. 打开开发者模式
开启右上角 **Developer mode / 开发者模式**。

### 3. 加载已解压扩展
点击：

```text
Load unpacked
```

然后选择项目目录：

```text
/Users/changdaye/Documents/reddit-stocks-translator
```

### 4. 打开插件设置页
加载后找到 **Reddit Stocks Translator**：
- 点击 `Details`
- 点击 `Extension options`

### 5. 配置 API Key
在设置页中：

- 填入 Google Cloud Translation Basic v2 的 API Key
- 保持 `自动翻译` 开启
- 如需翻译评论，保持 `翻译评论` 开启
- 建议保持 `启用本地缓存` 开启
- 调试阶段建议保持 `记录调试日志` 开启
- 点击 `保存设置`

---

## 手动测试清单

### Reddit 首页
打开：
- `https://www.reddit.com/`

预期：
- 首页中的帖子卡片可被翻译
- 帖子相关中文尽量显示为红色
- 站点导航等 UI 尽量不受影响

### subreddit 列表页
打开：
- `https://www.reddit.com/r/stocks/`
- 或其他 subreddit 页面

预期：
- 帖子标题和摘要可以翻译
- 翻译块显示在对应内容下方

### 帖子详情页
打开任意帖子详情页。

预期：
- 标题翻译
- 正文翻译
- 评论逐步翻译

### 刷新测试
刷新已经翻译过的页面。

预期：
- 缓存减少重复请求
- 已翻译内容出现更快

---

## 调试日志
设置页里带有调试日志查看器。

常见日志事件：
- `script.loaded`
- `script.process_start`
- `scan.candidates`
- `cache.summary`
- `translate.request`
- `translate.success`
- `translate.failed`
- `mutation.process`

如果页面没有翻译，优先先看这里。

---

## 常见问题

### 页面上没有任何变化
请检查：
- 扩展是否启用
- 修改代码后是否点击了 `Reload / 重新加载`
- 是否保存了有效 API Key
- 当前页面是否属于支持的 Reddit 内容页

### 页面提示缺少 API Key
解决方法：
- 打开扩展设置页
- 重新填入 API Key
- 点击保存
- 刷新 Reddit 页面

### 页面里出现黑色中文而不是红色中文
这通常说明该中文不是本插件渲染的，而是来自其他翻译层（例如 Chrome 网页翻译）。

### 仍然出现重复翻译
请先重新加载最新的 unpacked extension。当前版本已经减少标题/正文重复插入，但 Reddit DOM 变化仍可能需要继续调整。

---

## 安全说明
本项目是**个人自用**方案。

由于浏览器扩展直接使用 Google Translation API Key：

- 不要公开暴露你的真实 API Key
- 不要把同一个 Key 用在敏感生产环境
- 建议在 Google Cloud Console 里尽量收紧 Key 的限制策略

---

## English summary (optional)

This is a self-use Chrome extension for translating Reddit post-related content into Chinese.

Current scope:
- Reddit homepage
- subreddit feed pages
- post detail pages

It focuses on:
- post titles
- excerpts
- post bodies
- comments

It tries to avoid translating generic UI such as navigation, buttons, sidebars, and obvious ads.

Repository:
- https://github.com/changdaye/reddit-stocks-translator

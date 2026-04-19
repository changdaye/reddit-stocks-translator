# Reddit r/stocks Chrome 自用翻译插件设计

日期：2026-04-19
状态：待用户审阅
目标浏览器：Google Chrome
目标站点：https://www.reddit.com/r/stocks/

## 1. 目标
为 Reddit `r/stocks` 及其帖子详情页提供自动翻译能力，主要翻译：
- 帖子标题
- 帖子正文
- 评论内容

翻译展示采用“中英对照”：
- 保留原英文
- 在原文下方插入中文翻译

本插件仅供个人自用，不考虑公开发布。

## 2. 约束与前提
- 浏览器：Chrome Manifest V3
- 翻译来源：Google Cloud Translation Basic v2
- 调用方式：插件前端直接使用 API Key 调用 Google Translation
- 安全前提：仅个人自用，接受 API Key 存在扩展中的风险
- 页面行为：Reddit 页面为动态加载，评论可能懒加载，需要增量翻译

## 3. 方案选择
### 候选方案
1. 逐条即时翻译
2. 批量翻译 + 本地缓存
3. 仅翻译可视区域

### 采用方案
采用 **批量翻译 + 本地缓存**。

### 选择原因
- 比逐条翻译更省请求数
- 比仅翻译可视区域实现更稳定
- 更适合 Reddit 评论区动态追加内容的场景

## 4. 用户体验设计
### 4.1 自动触发
进入以下页面后自动执行翻译：
- `https://www.reddit.com/r/stocks/`
- `https://www.reddit.com/r/stocks/comments/*`
- 也可兼容一般 Reddit 帖子详情页结构，只要内容结构匹配即可

### 4.2 展示方式
每段被翻译的内容显示为：
- 第一行：原英文
- 第二行：中文翻译

中文翻译样式建议：
- 较小字号或与正文相同字号
- 浅灰背景或左侧边框
- 上边距 4~8px
- 可明显区分原文与译文，但不破坏 Reddit 原排版

### 4.3 自用配置
插件提供一个简单 options 页面，允许填写：
- Google API Key
- 是否开启自动翻译
- 是否翻译评论
- 是否启用缓存

## 5. 架构设计
## 5.1 文件结构
建议结构如下：

```text
reddit-stocks-translator/
  manifest.json
  content.js
  background.js
  options.html
  options.js
  styles.css
  icons/
```

## 5.2 模块职责
### manifest.json
- 定义 Manifest V3 扩展
- 声明匹配 Reddit 页面
- 注入 content script
- 配置 options 页面
- 配置必要权限（storage 等）

### content.js
负责：
- 扫描帖子标题、正文、评论节点
- 提取待翻译文本
- 过滤不需要翻译的内容
- 批量发送翻译请求
- 将中文翻译插入 DOM
- 监听动态加载内容并增量翻译

### background.js
负责：
- 承接内容脚本的请求（可选）
- 统一管理 API 调用节流与失败重试（如需要）

### options.html / options.js
负责：
- 保存/读取 API Key
- 配置功能开关

### styles.css
负责：
- 中文翻译块视觉样式
- 防止翻译内容与原内容混淆

## 6. 页面识别与翻译流程
### 6.1 内容识别范围
优先识别：
- 列表页帖子标题
- 帖子详情页主标题
- 帖子正文
- 评论正文

### 6.2 文本过滤规则
以下内容尽量跳过或保护：
- 股票代码，如 `$AAPL`、`TSLA`
- 用户名
- subreddit 名称，如 `r/stocks`
- URL
- 纯数字
- 极短无意义片段
- 已翻译过的节点

### 6.3 翻译处理流程
1. 页面加载后扫描目标节点
2. 提取原始文本
3. 去重
4. 先查本地缓存
5. 对未命中的文本进行批量翻译
6. 将结果写回缓存
7. 把中文插入原文下方
8. 监听新增节点并重复增量流程

## 7. Google Translation 调用设计
### 7.1 API 选择
使用：Cloud Translation Basic v2

原因：
- 支持 API Key
- 便于插件前端直连

### 7.2 请求方式
内容脚本或 background 脚本向 Google Translation API 发送 HTTPS 请求。

每批请求包含多个文本项，减少请求次数。

### 7.3 失败处理
- 单次请求失败时，短暂延迟后重试一次
- 如果仍失败，则跳过本批并在控制台输出错误
- 不应阻塞页面浏览

## 8. 缓存策略
### 8.1 缓存位置
使用 `chrome.storage.local`

### 8.2 缓存键
建议使用原文文本内容本身，或其 hash 作为 key。

### 8.3 缓存策略
- 同一段英文只翻译一次
- 新页面复用既有缓存
- 可在 options 页中提供“清空缓存”按钮

## 9. Reddit 动态内容处理
Reddit 页面经常动态更新评论与帖子内容，因此需要：
- 使用 `MutationObserver` 监听页面新增节点
- 对新增节点做去重处理
- 仅翻译新内容，避免重复翻译

## 10. 风险与限制
### 10.1 安全风险
由于 API Key 保存在扩展配置中，因此：
- 不适合公开发布
- 不适合多人共享
- 仅建议个人自用

### 10.2 页面结构风险
Reddit DOM 结构可能变化，导致选择器失效；后续可能需要手动调整选择器。

### 10.3 成本与额度
评论区内容较多，若长时间使用，可能增加 Translation API 字符消耗。

## 11. 测试策略
至少验证以下场景：
1. `r/stocks` 列表页标题自动翻译
2. 帖子详情页标题与正文自动翻译
3. 评论区自动翻译
4. 新加载评论可增量翻译
5. 页面刷新后缓存生效
6. API Key 缺失时给出明确提示
7. 请求失败时不导致页面异常

## 12. 实施顺序
1. 搭建 Manifest V3 插件骨架
2. 完成 options 页面与 API Key 存储
3. 完成列表页标题翻译
4. 完成帖子正文翻译
5. 完成评论翻译
6. 加入 MutationObserver 增量翻译
7. 加入缓存与简单容错
8. 进行自测和样式优化

## 13. 最终结论
本设计采用：
- Chrome Manifest V3
- Google Cloud Translation Basic v2
- 插件前端直连 API Key
- 自动翻译
- 中英对照展示
- 批量翻译 + 本地缓存
- MutationObserver 处理 Reddit 动态评论

该方案最适合“个人自用、尽快可用、接受密钥暴露风险”的场景。

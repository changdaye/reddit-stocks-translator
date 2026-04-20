# 更新日志

本文件记录 `reddit-stocks-translator` 的版本更新情况。

## v0.1.3 - 2026-04-20

### 本次更新
- merge: add Chinese release notes and changelog support
- fix: make changelog generation idempotent
- ci: add Chinese release notes and changelog automation

## v0.1.2 - 2026-04-20

### 新增
- 支持 Reddit 首页、subreddit 列表页、帖子详情页的帖子相关内容翻译
- 支持正文中中文内容自动显示为红色
- 新增调试日志查看能力
- 新增自动发版工作流：自动 bump 版本号、打 tag、打 zip、创建 GitHub Release

### 改进
- 改进帖子标题、摘要、正文、评论的识别策略
- 减少重复翻译块插入
- README 改为中文优先说明

## v0.1.0 - 2026-04-20

### 初始版本
- Chrome Manifest V3 扩展基础结构
- Google Cloud Translation Basic v2 直连翻译
- 设置页、缓存、基础翻译块渲染

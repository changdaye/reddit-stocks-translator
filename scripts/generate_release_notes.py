#!/usr/bin/env python3
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'manifest.json'
CHANGELOG = ROOT / 'CHANGELOG.md'
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)
TITLE = '# 更新日志'
INTRO = '本文件记录 `reddit-stocks-translator` 的版本更新情况。'


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def current_version() -> str:
    return json.loads(MANIFEST.read_text())['version']


def latest_tag() -> str:
    tags = run('git', 'tag', '--list', 'v*', '--sort=-version:refname').splitlines()
    return tags[0] if tags else ''


def commit_subjects(previous_tag: str) -> list[str]:
    if previous_tag:
        rng = f'{previous_tag}..HEAD'
        lines = run('git', 'log', '--pretty=format:%s', rng).splitlines()
    else:
        lines = run('git', 'log', '--pretty=format:%s').splitlines()
    filtered = []
    for line in lines:
        if not line:
            continue
        if line.startswith('chore(release): bump version to'):
            continue
        filtered.append(line)
    return filtered


def normalize_subject(subject: str) -> str:
    return subject.strip().lower()


def map_subject_to_bullet(subject: str) -> str | None:
    s = normalize_subject(subject)

    # Hide merge commits in user-facing notes when more specific commits exist.
    if s.startswith('merge:'):
        if 'lazy-loaded reddit content' in s:
            return '支持在下拉滚动后继续翻译懒加载出来的 Reddit 内容。'
        if 'chinese release notes and changelog support' in s:
            return '自动发版流程已支持中文发布说明和更新日志同步。'
        return None

    mapping = [
        (r'lazy-loaded reddit content', '修复滚动加载、懒加载内容不能及时翻译的问题。'),
        (r'mutation roots', '改进 DOM 变更去重逻辑，减少重复重扫。'),
        (r'chinese release notes and changelog automation', '自动发版时会生成中文发布说明，并同步维护 CHANGELOG。'),
        (r'changelog generation idempotent', '修复 CHANGELOG 自动生成重复写入的问题。'),
        (r'chinese-first', 'README 调整为中文优先，英文说明作为补充。'),
        (r'inline chinese text', '正文中的中文内容会自动显示为红色。'),
        (r'body targeting and dedupe', '改进帖子正文/摘要识别，并减少重复翻译块。'),
        (r'translation text color to red', '插件插入的翻译文字调整为红色。'),
        (r'homepage and mixed reddit content detection', '支持 Reddit 首页、subreddit 列表页和帖子页的帖子相关内容翻译。'),
        (r'post title links', '改进帖子标题链接识别，提高标题翻译命中率。'),
        (r'visible reddit text containers', '改为更稳健的正文容器扫描策略，减少对固定选择器的依赖。'),
        (r'persistent debug logging', '新增持久化调试日志，便于排查页面未翻译的问题。'),
        (r'reddit\.com urls', '支持 `reddit.com` 与 `www.reddit.com` 两种域名。'),
        (r'translation errors in page notices', '翻译失败时会直接在页面中提示错误原因。'),
        (r'local test guide', '补充本地加载和测试说明。'),
        (r'chrome translator extension mvp', '完成 Chrome 扩展 MVP 脚手架与基础翻译能力。'),
    ]

    for pattern, bullet in mapping:
        if re.search(pattern, s):
            return bullet

    if s.startswith('fix:'):
        return '修复了一项稳定性或兼容性问题。'
    if s.startswith('feat:'):
        return '新增了一项面向用户的功能改进。'
    if s.startswith('docs:'):
        return '补充或更新了项目文档说明。'
    if s.startswith('ci:'):
        return '改进了自动化流程与发版体验。'
    if s.startswith('style:'):
        return '优化了页面翻译显示样式。'
    if s.startswith('chore:'):
        return '完成了一项维护性更新。'
    return None


def to_bullets(commits: list[str]) -> list[str]:
    bullets = []
    seen = set()
    for commit in commits:
        bullet = map_subject_to_bullet(commit)
        if not bullet or bullet in seen:
            continue
        seen.add(bullet)
        bullets.append(f'- {bullet}')
    if not bullets:
        return ['- 维护性更新与自动发版同步。']
    return bullets


def changelog_section(version: str, bullets: list[str]) -> str:
    date = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d')
    lines = [f'## v{version} - {date}', '', '### 本次更新']
    lines.extend(bullets)
    return '\n'.join(lines).rstrip() + '\n'


def prepend_changelog(version: str, section: str):
    if not CHANGELOG.exists():
        CHANGELOG.write_text(f'{TITLE}\n\n{INTRO}\n\n{section}\n')
        return

    original = CHANGELOG.read_text().strip()
    if f'## v{version} ' in original or f'## v{version}\n' in original:
        return

    lines = original.splitlines()
    rest = original
    if lines and lines[0].strip() == TITLE:
        rest = '\n'.join(lines[1:]).lstrip('\n')
        if rest.startswith(INTRO):
            rest = rest[len(INTRO):].lstrip('\n')
    new_text = f'{TITLE}\n\n{INTRO}\n\n{section}\n{rest.lstrip()}'
    CHANGELOG.write_text(new_text.rstrip() + '\n')


def write_release_notes(version: str, bullets: list[str]):
    notes = [
        f'# v{version}',
        '',
        '## 中文发布说明',
        '',
        '### 本次更新',
        *bullets,
        '',
        '### 安装方式',
        '1. 下载 zip 包',
        '2. 解压缩',
        '3. 打开 `chrome://extensions/`',
        '4. 开启开发者模式',
        '5. 选择 **Load unpacked / 加载已解压的扩展程序**',
        '6. 选择解压后的目录',
        '',
        '### 说明',
        '- README 默认中文说明',
        '- CHANGELOG.md 会同步记录版本变化',
    ]
    path = DIST / 'RELEASE_NOTES.md'
    path.write_text('\n'.join(notes) + '\n')
    return path


def main():
    version = current_version()
    previous_tag = latest_tag()
    bullets = to_bullets(commit_subjects(previous_tag))
    section = changelog_section(version, bullets)
    prepend_changelog(version, section)
    notes_path = write_release_notes(version, bullets)
    print(notes_path)


if __name__ == '__main__':
    main()

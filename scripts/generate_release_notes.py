#!/usr/bin/env python3
import json
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
      if not line or line.startswith('chore(release): bump version to'):
        continue
      filtered.append(line)
    return filtered


def to_bullets(commits: list[str]) -> list[str]:
    if not commits:
      return ['- 维护性更新与自动发版同步。']
    return [f'- {item}' for item in commits]


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

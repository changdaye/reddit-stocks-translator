#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

FILES = [Path('manifest.json'), Path('package.json')]


def parse_version(value: str):
    parts = value.split('.')
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        raise ValueError(f'Unsupported semantic version: {value}')
    return tuple(int(part) for part in parts)


def format_version(parts):
    return '.'.join(str(part) for part in parts)


def bump_patch(version: str) -> str:
    major, minor, patch = parse_version(version)
    return format_version((major, minor, patch + 1))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    docs = []
    for path in FILES:
        docs.append((path, json.loads(path.read_text())))

    current_version = docs[0][1]['version']
    next_version = bump_patch(current_version)

    if args.dry_run:
        print(next_version)
        return

    for path, data in docs:
        data['version'] = next_version
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

    print(next_version)


if __name__ == '__main__':
    main()

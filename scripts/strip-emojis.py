#!/usr/bin/env python3
"""NumbahWan Emoji Stripper v5 - safe emoji removal."""
import re, os

EMOJI_RE = re.compile(
    '['
    '\U0001F300-\U0001FAFF'
    '\U00002600-\U000027BF'
    '\U0000FE00-\U0000FE0F'
    '\U0000200D'
    '\U000020E3'
    '\U0000231A-\U000023FA'
    '\U00002934-\U00002935'
    '\U000025AA-\U000025FE'
    '\U00002614-\U00002615'
    '\U00002648-\U00002653'
    '\U0000267F'
    '\U00002693'
    '\U000026A0-\U000026A1'
    '\U000026AA-\U000026AB'
    '\U000026BD-\U000026BE'
    '\U000026C4-\U000026C5'
    '\U000026CE-\U000026CF'
    '\U000026D4'
    '\U000026EA'
    '\U000026F2-\U000026F3'
    '\U000026F5'
    '\U000026FA'
    '\U000026FD'
    '\U00002702'
    '\U00002705'
    '\U00002708-\U0000270D'
    '\U0000270F'
    '\U00002712'
    '\U00002714'
    '\U00002716'
    '\U0000271D'
    '\U00002721'
    '\U00002728'
    '\U00002733-\U00002734'
    '\U00002744'
    '\U00002747'
    '\U0000274C'
    '\U0000274E'
    '\U00002753-\U00002755'
    '\U00002757'
    '\U00002763-\U00002764'
    '\U00002795-\U00002797'
    '\U000027A1'
    '\U000027B0'
    '\U00002B00-\U00002BFF'
    '\U0000203C'
    '\U00002049'
    ']'
)

# Match: emoji(s) optionally followed by FE0F/ZWJ, then optional trailing space
# This removes the emoji AND the space that was separating it from text
EMOJI_PLUS_SPACE = re.compile(
    '['
    '\U0001F300-\U0001FAFF'
    '\U00002600-\U000027BF'
    '\U0000FE00-\U0000FE0F'
    '\U0000200D'
    '\U000020E3'
    '\U0000231A-\U000023FA'
    '\U00002934-\U00002935'
    '\U000025AA-\U000025FE'
    '\U00002614-\U00002615'
    '\U00002648-\U00002653'
    '\U0000267F'
    '\U00002693'
    '\U000026A0-\U000026A1'
    '\U000026AA-\U000026AB'
    '\U000026BD-\U000026BE'
    '\U000026C4-\U000026C5'
    '\U000026CE-\U000026CF'
    '\U000026D4'
    '\U000026EA'
    '\U000026F2-\U000026F3'
    '\U000026F5'
    '\U000026FA'
    '\U000026FD'
    '\U00002702'
    '\U00002705'
    '\U00002708-\U0000270D'
    '\U0000270F'
    '\U00002712'
    '\U00002714'
    '\U00002716'
    '\U0000271D'
    '\U00002721'
    '\U00002728'
    '\U00002733-\U00002734'
    '\U00002744'
    '\U00002747'
    '\U0000274C'
    '\U0000274E'
    '\U00002753-\U00002755'
    '\U00002757'
    '\U00002763-\U00002764'
    '\U00002795-\U00002797'
    '\U000027A1'
    '\U000027B0'
    '\U00002B00-\U00002BFF'
    '\U0000203C'
    '\U00002049'
    ']+ ?'  # one or more emoji chars, then optional single space
)

def strip_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        orig = f.read()
    if not EMOJI_RE.search(orig):
        return False, 0
    count = len(EMOJI_RE.findall(orig))
    result = EMOJI_PLUS_SPACE.sub('', orig)
    if result != orig:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result)
        return True, count
    return False, count

total_f = total_e = 0
for root, dirs, files in os.walk('public'):
    dirs[:] = [d for d in dirs if d not in ('node_modules','.git','images')]
    for fn in sorted(files):
        if not fn.endswith(('.html','.js','.css')): continue
        fp = os.path.join(root, fn)
        changed, ct = strip_file(fp)
        if changed:
            total_f += 1; total_e += ct
            print(f'  [{ct:3d}] {fp}')

print(f'\nDone: {total_f} files, {total_e} emojis stripped')

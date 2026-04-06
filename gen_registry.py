#!/usr/bin/env python3
"""Generate registry entries from .md files."""
import re
from pathlib import Path

CONTENT_DIR = Path("/home/prime/.openclaw/workspace/universal-transmissions/src/data/blog-content/old-squarespace")

def get_frontmatter(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            fm[key.strip()] = val.strip().strip('"')
    return fm

def slug_to_js_name(slug):
    """Convert slug to valid JS identifier."""
    return slug.replace('-', '_').replace('.', '_') + '_raw'

entries = []
for md_file in sorted(CONTENT_DIR.glob('*.md')):
    slug = md_file.stem
    fm = get_frontmatter(md_file)
    title = fm.get('title', slug)
    date = fm.get('publishedAt', '').strip('"')
    excerpt = fm.get('excerpt', '').strip('"')
    read_time = fm.get('readTime', '').strip('"')
    tags_raw = fm.get('tags', '["journal", "art", "process"]')
    
    # Determine tradition from tags
    content_lower = slug.lower()
    if 'vortex' in content_lower or 'chakra' in content_lower:
        tradition = "vortex"
    elif 'codex' in content_lower or 'kickstarter' in content_lower or 'ethera' in content_lower or 'nft' in content_lower:
        tradition = "codex"
    elif 'tapestr' in content_lower:
        tradition = "artworks"
    elif 'tantra' in content_lower or 'toroidal' in content_lower:
        tradition = "tantra"
    elif 'trivium' in content_lower:
        tradition = "education"
    elif 'transmission' in content_lower and 'viii' in content_lower:
        tradition = "general"
    elif 'translinguistic' in content_lower or 'alphabet' in content_lower or 'linguistic' in content_lower:
        tradition = "xenolinguistics"
    elif 'spirit' in content_lower or 'vitruvian' in content_lower:
        tradition = "general"
    elif 'polarity' in content_lower or 'union' in content_lower:
        tradition = "general"
    elif 'making-of' in content_lower or 'making' in content_lower:
        tradition = "process"
    elif 'twilight' in content_lower:
        tradition = "general"
    elif 'honorarium' in content_lower:
        tradition = "general"
    elif 'immaculate' in content_lower:
        tradition = "general"
    elif 'resonator' in content_lower:
        tradition = "general"
    elif 'motion' in content_lower:
        tradition = "general"
    else:
        tradition = "general"
    
    entries.append({
        'slug': slug,
        'title': title,
        'date': date,
        'excerpt': excerpt,
        'read_time': read_time,
        'tags_raw': tags_raw,
        'tradition': tradition,
    })

# Generate imports
print("=== IMPORTS ===")
for e in entries:
    print(f"import {slug_to_js_name(e['slug'])} from \"./old-squarespace/{e['slug']}.md\";")

print("\n=== REGISTRY ENTRIES ===")
for e in entries:
    # Parse tags
    tags_match = re.match(r'\[(.*?)\]', e['tags_raw'])
    if tags_match:
        tags_str = "[" + tags_match.group(1) + "]"
    else:
        tags_str = '["journal", "art", "process"]'
    
    print(f"""  {{
    slug: "{e['slug']}",
    title: "{e['title']}",
    publishedAt: "{e['date']}",
    author: "Hakan Hisim",
    excerpt: "{e['excerpt']}",
    readTime: "{e['read_time']}",
    hero_gradient: "from-purple-950 via-fuchsia-900 to-black",
    tags: {tags_str},
    tradition: "{e['tradition']}",
    content: stripFrontmatter({slug_to_js_name(e['slug'])}),
  }},""")

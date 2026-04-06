#!/usr/bin/env python3
"""Parse Squarespace export files and create blog post markdown files."""

import re
import os
import urllib.request
import urllib.error
from pathlib import Path

# Paths
UT_ROOT = Path("/home/prime/.openclaw/workspace/universal-transmissions")
CONTENT_DIR = UT_ROOT / "src/data/blog-content/old-squarespace"
PUBLIC_JOURNAL = UT_ROOT / "public/journal"

FILES = [
    "/home/prime/.openclaw/workspace/memory/01-Projects/ut-website/old-blog-journal-1.md",
    "/home/prime/.openclaw/workspace/memory/01-Projects/ut-website/old-blog-journal-2.md",
    "/home/prime/.openclaw/workspace/memory/01-Projects/ut-website/old-blog-journal-3.md",
]

def slugify(title):
    """Convert title to slug."""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug

def parse_date(date_str):
    """Parse date like 'October 19, 2017' to '2017-10-19'."""
    months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    m = re.match(r'(\w+)\s+(\d+),\s+(\d+)', date_str.strip())
    if m:
        month = months.get(m.group(1).lower(), '01')
        day = m.group(2).zfill(2)
        year = m.group(3)
        return f"{year}-{month}-{day}"
    return date_str

def estimate_read_time(text):
    """Estimate read time from word count."""
    words = len(text.split())
    minutes = max(1, round(words / 200))
    return f"{minutes} min"

def clean_body(text):
    """Clean HTML and normalize markdown."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove comment lines like [3 Comments](url)
    text = re.sub(r'\[\d+\s+Comments?\]\([^)]+\)', '', text)
    # Remove comment lines like [Comment](url)
    text = re.sub(r'\[Comment\]\([^)]+\)', '', text)
    # Remove links like [text](url) but keep text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove hashtags that are just link references (trailing URLs)
    text = re.sub(r'#\w+\s*$', '', text, flags=re.MULTILINE)
    # Clean up multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Preserve ### headings (already in markdown)
    # Preserve **bold** and *italic*
    return text.strip()

def extract_images(body_lines):
    """Extract Squarespace image URLs from body lines."""
    images = []
    for line in body_lines:
        # Match ![alt](url) or ![](url)
        matches = re.findall(r'!\[.*?\]\((https://images\.squarespace-cdn\.com/content/[^)]+)\)', line)
        images.extend(matches)
    return images

def build_body(body_lines, image_map):
    """Build cleaned body text with local image paths."""
    lines = []
    for line in body_lines:
        # Skip comment lines
        if re.match(r'\s*\[(\d+\s+)?Comments?\]\(', line):
            continue
        # Replace Squarespace image URLs with local paths
        for sq_url, local_path in image_map.items():
            if sq_url in line:
                ext = os.path.splitext(sq_url.split('?')[0])[1] or '.jpg'
                line = line.replace(sq_url, local_path)
        lines.append(line)
    body = '\n'.join(lines)
    # Clean HTML
    body = clean_body(body)
    return body

def get_excerpt(body, max_chars=150):
    """Get first ~150 chars of body text, no markdown."""
    # Remove markdown
    text = re.sub(r'[#*_`\[\]()!>]', '', body)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > max_chars:
        return text[:max_chars].rsplit(' ', 1)[0] + '…'
    return text

def download_image(url, dest_path):
    """Download image if it doesn't exist."""
    if dest_path.exists():
        print(f"  Already exists: {dest_path.name}")
        return True
    try:
        print(f"  Downloading: {url.split('/')[-1][:50]}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(dest_path, 'wb') as f:
                f.write(response.read())
        print(f"  Saved: {dest_path.name}")
        return True
    except Exception as e:
        print(f"  Failed to download {url}: {e}")
        return False

def parse_posts():
    """Parse all posts from all files."""
    all_content = ""
    for f in FILES:
        with open(f, 'r', encoding='utf-8') as fh:
            all_content += fh.read() + "\n"

    # Split by post headers: # [Title](url)
    # But not ## headings within posts
    parts = re.split(r'\n# \[([^\]]+)\]\((https?://[^\)]+)\)\n', all_content)
    
    posts = []
    # parts[0] is before first header (frontmatter, ignore)
    # Then: title, url, content, title, url, content...
    i = 1
    while i < len(parts):
        if i + 2 >= len(parts):
            break
        title = parts[i]
        url = parts[i+1]
        content = parts[i+2] if i+2 < len(parts) else ""
        
        # Extract date from content
        date_match = re.search(r'\n(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}\n', content)
        date_str = date_match.group(0).strip() if date_match else "Unknown"
        date = parse_date(date_str)
        
        # Extract body lines (everything after date)
        if date_match:
            body_start = date_match.end()
            body_text = content[body_start:]
        else:
            body_text = content
        
        # Split into lines
        body_lines = body_text.split('\n')
        
        # Remove leading empty lines
        while body_lines and not body_lines[0].strip():
            body_lines.pop(0)
        # Remove trailing empty lines
        while body_lines and not body_lines[-1].strip():
            body_lines.pop()
        
        # Extract images
        image_urls = extract_images(body_lines)
        
        posts.append({
            'title': title,
            'url': url,
            'date': date,
            'body_lines': body_lines,
            'image_urls': image_urls,
        })
        i += 3
    
    return posts

def create_post_files(posts):
    """Create .md files for each post."""
    created = 0
    
    for post in posts:
        title = post['title']
        slug = slugify(title)
        date = post['date']
        body_lines = post['body_lines']
        image_urls = post['image_urls']
        
        print(f"\n=== {title} ===")
        print(f"  Date: {date}")
        print(f"  Slug: {slug}")
        print(f"  Images: {len(image_urls)}")
        
        # Download images
        image_map = {}
        for idx, url in enumerate(image_urls):
            # Get extension from URL
            ext = os.path.splitext(url.split('?')[0])[1] or '.jpg'
            local_name = f"{slug}-{idx+1}{ext}"
            dest_path = PUBLIC_JOURNAL / local_name
            ok = download_image(url, dest_path)
            if ok:
                image_map[url] = f"/journal/{local_name}"
        
        # Build body
        body = build_body(body_lines, image_map)
        
        # Get excerpt
        excerpt = get_excerpt(body)
        
        # Estimate read time
        read_time = estimate_read_time(body)
        
        # Determine tags based on content
        tags = ["journal", "art", "process"]
        content_lower = body.lower()
        if any(k in content_lower for k in ['chakra', 'vortex', 'bio-energetic', 'kundalini']):
            tags.extend(["chakra", "energy", "vortex"])
        if any(k in content_lower for k in ['codex', 'xenolinguistic', 'alphabet', 'morpheme']):
            tags.extend(["codex", "xenolinguistics"])
        if any(k in content_lower for k in ['sacred geometry', 'cymatic', 'frequency']):
            tags.extend(["sacred-geometry", "cymatics"])
        if any(k in content_lower for k in ['nft', 'ethereum', 'opensea']):
            tags.extend(["nft", "crypto"])
        if any(k in content_lower for k in ['tapestry', 'print', 'store']):
            tags.extend(["store", "merchandise"])
        if any(k in content_lower for k in ['kickstarter', 'crowdfunding']):
            tags.extend(["kickstarter", "codex"])
        if any(k in content_lower for k in ['tantra', 'toroidal', 'torus']):
            tags.extend(["tantra", "torus"])
        if any(k in content_lower for k in ['sufism', 'dervish', 'whirling', 'rumi']):
            tags.extend(["sufism", " mysticism"])
        if any(k in content_lower for k in ['trivium', 'quadrivium']):
            tags.extend(["trivium", "education"])
        tags = list(set(tags))[:8]  # dedupe, limit
        
        # Write .md file
        md_content = f"""---
slug: {slug}
title: {title}
publishedAt: "{date}"
author: "Hakan Hisim"
excerpt: "{excerpt}"
readTime: "{read_time}"
hero_gradient: "from-purple-950 via-fuchsia-900 to-black"
tags: {tags}
---

{body}
"""
        
        out_path = CONTENT_DIR / f"{slug}.md"
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(md_content)
        
        print(f"  Wrote: {out_path.name}")
        created += 1
    
    return created

if __name__ == '__main__':
    print("Parsing posts...")
    posts = parse_posts()
    print(f"Found {len(posts)} posts")
    print("Creating files...")
    created = create_post_files(posts)
    print(f"\nDone! Created {created} post files.")
    print(f"Content dir: {CONTENT_DIR}")
    print(f"Journal images dir: {PUBLIC_JOURNAL}")

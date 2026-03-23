"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple markdown parser that handles the key elements in our blog posts
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Split content into blocks (paragraphs, headers, blockquotes, code blocks, lists, hr)
  const blocks = parseBlocks(content);

  return (
    <div className={`markdown-body ${className}`}>
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

// ─── Block types ────────────────────────────────────────────────────────────────

type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "hr" }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code", lang, text: codeLines.join("\n") });
      i++; // skip closing ```
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect until blank line
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith(">") && !lines[i].startsWith("```") && !lines[i].match(/^[-*]\s/) && !lines[i].match(/^\d+\.\s/) && !/^---+$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

// ─── Block renderer ────────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <HeadingRenderer level={block.level} text={block.text} />;
    case "paragraph":
      return <p className="font-body text-lg leading-relaxed mb-6" style={{ color: "var(--ut-white-dim)" }} dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />;
    case "blockquote":
      return (
        <blockquote className="border-l-2 pl-6 my-6" style={{ borderColor: "var(--ut-cyan)", background: "rgba(0,229,255,0.03)", padding: "1rem 1.5rem" }}>
          <p className="font-body italic text-lg leading-relaxed mb-0" style={{ color: "var(--ut-white-dim)" }} dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="bg-black/60 border overflow-x-auto my-6 p-4 font-mono text-sm" style={{ borderColor: "rgba(0,229,255,0.1)", color: "var(--ut-cyan)" }}>
          <code>{block.text}</code>
        </pre>
      );
    case "hr":
      return <div className="sacred-divider my-12" />;
    case "ul":
      return (
        <ul className="list-disc list-inside space-y-2 mb-6" style={{ color: "var(--ut-white-dim)" }}>
          {block.items.map((item, idx) => (
            <li key={idx} className="font-body text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal list-inside space-y-2 mb-6" style={{ color: "var(--ut-white-dim)" }}>
          {block.items.map((item, idx) => (
            <li key={idx} className="font-body text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ol>
      );
    default:
      return null;
  }
}

// ─── Heading renderer ──────────────────────────────────────────────────────────

function HeadingRenderer({ level, text }: { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }) {
  const sizeClasses: Record<number, string> = {
    1: "text-3xl",
    2: "text-2xl",
    3: "text-xl",
    4: "text-lg",
    5: "text-base",
    6: "text-sm",
  };

  const colors: Record<number, string> = {
    1: "var(--ut-cyan)",
    2: "var(--ut-magenta)",
    3: "var(--ut-gold)",
    4: "var(--ut-cyan)",
    5: "var(--ut-white-dim)",
    6: "var(--ut-white-dim)",
  };

  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag
      className={`font-display ${sizeClasses[level]} mb-4 mt-10 first:mt-0 tracking-wide`}
      style={{ color: colors[level] }}
      dangerouslySetInnerHTML={{ __html: renderInline(text) }}
    />
  );
}

// ─── Inline renderer (bold, italic, inline code, links) ───────────────────────

function renderInline(text: string): string {
  return text
    // Bold + italic: ***text***
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic: *text*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code: `code`
    .replace(/`(.+?)`/g, "<code class=\"font-mono text-sm px-1 py-0.5\" style=\"background:rgba(0,229,255,0.08);color:var(--ut-cyan)\">$1</code>")
    // Links: [text](url) — sanitize but keep basic href
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="underline hover:opacity-80 transition-opacity" style="color:var(--ut-cyan)">$1</a>')
    // ***text*** → handled above
    ;
}

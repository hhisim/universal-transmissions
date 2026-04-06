"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-3xl mb-4 mt-10 tracking-wide" style={{ color: "var(--ut-cyan)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-2xl mb-4 mt-10 tracking-wide" style={{ color: "var(--ut-magenta)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-xl mb-3 mt-8 tracking-wide" style={{ color: "var(--ut-gold)" }}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-display text-lg mb-3 mt-6 tracking-wide" style={{ color: "var(--ut-cyan)" }}>
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="font-display text-base mb-2 mt-6" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="font-display text-sm mb-2 mt-4" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="font-body text-[1.1875rem] leading-[1.85] mb-6" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-6 my-8 italic"
              style={{
                borderColor: "var(--ut-gold)",
                background: "rgba(255,215,0,0.03)",
                padding: "1rem 1.5rem",
              }}
            >
              <p className="font-body text-[1.1875rem] leading-[1.85] mb-0" style={{ color: "var(--ut-white-dim)" }}>
                {children}
              </p>
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <pre
                  className="font-mono text-sm overflow-x-auto my-6 p-4 border"
                  style={{
                    background: "#0a0a0f",
                    borderColor: "rgba(0,229,255,0.1)",
                    color: "var(--ut-cyan)",
                  }}
                >
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code
                className="font-mono text-sm px-1.5 py-0.5"
                style={{
                  background: "rgba(0,229,255,0.08)",
                  color: "var(--ut-cyan)",
                }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              className="font-mono text-sm overflow-x-auto my-6 p-4 border"
              style={{
                background: "#0a0a0f",
                borderColor: "rgba(0,229,255,0.1)",
                color: "var(--ut-cyan)",
              }}
            >
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-2 mb-6 pl-6" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-2 mb-6 pl-6" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="font-body text-[1.1875rem] leading-[1.85]" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: "var(--ut-white)" }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic" style={{ color: "var(--ut-white-dim)" }}>
              {children}
            </em>
          ),
          hr: () => (
            <div
              className="my-12 h-px"
              style={{
                background: "linear-gradient(to right, transparent, rgba(0,229,255,0.2), rgba(217,70,239,0.2), transparent)",
              }}
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline hover:opacity-80 transition-opacity"
              style={{ color: "var(--ut-cyan)" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

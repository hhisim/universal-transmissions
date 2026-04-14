"use client";

import { useState, useEffect, useCallback } from "react";

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  visitor_id: string;
}

interface CommentSectionProps {
  itemId: string;
  itemType?: "gallery" | "journal" | "artwork" | "codex2";
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  const key = "ut_visitor_id";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentSection({ itemId, itemType = "gallery" }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  const visitorId = getVisitorId();

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?item_type=${itemType}&item_id=${itemId}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType]);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible, fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, visitor_id: visitorId, author_name: authorName, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to post comment");
        return;
      }
      setComments([data.comment, ...comments]);
      setContent("");
      setAuthorName("");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("Delete your comment?")) return;
    try {
      await fetch(`/api/comments?id=${commentId}&visitor_id=${visitorId}`, { method: "DELETE" });
      setComments(comments.filter((c) => c.id !== commentId));
    } catch {}
  }

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <button
        onClick={() => setVisible(!visible)}
        className="text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white/70 transition-colors"
      >
        {visible ? "Hide" : "Show"} Comments {comments.length > 0 && `(${comments.length})`}
      </button>

      {visible && (
        <div className="mt-4 space-y-4">
          {/* Comment form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={100}
              className="w-full bg-black/20 border border-white/10 px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={2000}
              rows={3}
              className="w-full bg-black/20 border border-white/10 px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-white/5 border border-white/10 text-xs font-mono tracking-widest uppercase text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </form>

          {/* Comments list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-1">
                  <div className="h-3 bg-white/5 rounded w-1/4" />
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs font-mono text-white/30 py-4 text-center">No comments yet. Be the first.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                      {comment.author_name || "Anonymous"}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      {timeAgo(comment.created_at)}
                      {comment.visitor_id === visitorId && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="ml-2 text-red-400/50 hover:text-red-400 transition-colors"
                        >
                          delete
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/70 leading-relaxed mt-1">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

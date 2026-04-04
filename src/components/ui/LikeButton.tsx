"use client";

import { useState, useEffect, useCallback } from "react";

interface LikeButtonProps {
  initialCount?: number;
  initialLiked?: boolean;
  itemId: string;
  itemType?: "gallery" | "journal" | "codex" | "artwork";
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

export default function LikeButton({
  initialCount = 0,
  initialLiked = false,
  itemId,
  itemType = "gallery",
}: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const visitorId = getVisitorId();
    fetch(`/api/likes?item_type=${itemType}&item_id=${itemId}&visitor_id=${visitorId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.likeCount !== undefined) setCount(data.likeCount);
        if (data.userLiked !== undefined) setLiked(data.userLiked);
      })
      .catch(() => {});
  }, [itemId, itemType]);

  const toggleLike = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const visitorId = getVisitorId();
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, visitor_id: visitorId }),
      });
      if (!res.ok) {
        setLiked(!newLiked);
        setCount(count);
      }
    } catch {
      setLiked(!newLiked);
      setCount(count);
    } finally {
      setLoading(false);
    }
  }, [liked, count, loading, itemId, itemType]);

  return (
    <button
      onClick={toggleLike}
      disabled={loading}
      className="inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-all group disabled:opacity-50"
      style={{
        borderColor: liked ? "var(--ut-magenta)" : "rgba(217,70,239,0.15)",
        color: liked ? "var(--ut-magenta)" : "var(--ut-white-dim)",
        background: liked ? "rgba(217,70,239,0.06)" : "transparent",
      }}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        className="transition-all"
        style={{ transform: liked ? "scale(1.15)" : "scale(1)" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{count}</span>
      <span style={{ opacity: 0.6 }}>{liked ? "Liked" : "Like"}</span>
    </button>
  );
}

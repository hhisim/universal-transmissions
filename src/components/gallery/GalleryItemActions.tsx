"use client";

import LikeButton from "@/components/ui/LikeButton";

interface GalleryItemActionsProps {
  slug: string;
}

export default function GalleryItemActions({ slug }: GalleryItemActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <LikeButton itemId={`gallery-${slug}`} />
    </div>
  );
}

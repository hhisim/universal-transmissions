"use client";

interface PinterestGridProps {
  boardSlug?: string;
  title?: string;
  subtitle?: string;
}

export default function PinterestGrid({
  boardSlug = "hakanhisim/typography-symbols",
  title,
  subtitle,
}: PinterestGridProps) {
  const boardUrl = `https://www.pinterest.com/${boardSlug}/embed/`;

  return (
    <div className="w-full">
      {title && (
        <div className="mb-6 text-center">
          <h2 className="font-heading text-2xl text-oracle-gold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-oracle-gold/60">{subtitle}</p>}
        </div>
      )}

      <iframe
        data-pin-do="embedBoard"
        src={boardUrl}
        width="1400"
        height="800"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        className="w-full max-w-full"
      />
    </div>
  );
}

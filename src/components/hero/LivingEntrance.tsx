import Link from "next/link";
import Image from "next/image";

/**
 * THE THRESHOLD — the entrance to the Living Grimoire.
 *
 * The artwork is not decoration here; it is the architecture. The plate is cut as a portal
 * (masked arcs, clipped by the viewport edge) so the visitor meets a place rather than a card.
 * Three depth planes: an ink field carrying the artwork's own spectral light, the plate itself,
 * and the address which is lit from the same side as the plate.
 *
 * Motion is CSS only — a slow spectral drift on the field and a negligible plate settle.
 * No particle loop, no canvas, no new image request beyond the plate the page needs.
 */
export function LivingEntrance({
  image,
  title,
  medium,
  year,
  records,
}: {
  image: string;
  title: string;
  medium: string;
  year: number | string;
  records: number;
}) {
  return (
    <section className="lgx-threshold" aria-label="Universal Transmissions — entrance">
      <div className="lgx-field" aria-hidden="true" />
      <div className="lgx-rings" aria-hidden="true" />

      <figure className="lgx-portal">
        <div className="lgx-portal-clip">
          <Image
            src={image}
            alt={`${title} — ${medium}`}
            width={1200}
            height={1200}
            priority
            sizes="(max-width: 760px) 92vw, (max-width: 1180px) 58vw, 720px"
            className="lgx-plate"
          />
          <span className="lgx-refract" aria-hidden="true" />
        </div>
        <span className="lgx-arc lgx-arc--a" aria-hidden="true" />
        <span className="lgx-arc lgx-arc--b" aria-hidden="true" />
        <figcaption className="lgx-caption">
          <span className="lgx-caption-kicker">I · Transmission</span>
          <span className="lgx-caption-title">{title}</span>
          <span className="lgx-caption-meta">
            {medium} · {year}
          </span>
        </figcaption>
      </figure>

      <div className="lgx-address">
        <p className="lgx-kicker">
          <span>Vault of Arcana</span>
          <span className="lgx-rule" aria-hidden="true" />
          <span>{records} records</span>
        </p>

        <h1 className="lgx-title">
          Universal
          <br />
          <span className="lgx-title-soft">Transmissions</span>
        </h1>

        <p className="lgx-tagline">
          Decoding the source code of reality — <em>one transmission at a time.</em>
        </p>

        <div className="lgx-actions">
          <Link href="/codex" className="lgx-action lgx-action--gold">
            Discover the Codex
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/gallery" className="lgx-action lgx-action--quiet">
            Enter the Gallery
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="lgx-note">
          The artistic project of Hakan Hisim — paintings, archival prints and a manuscript ten
          years in the making.
        </p>
      </div>

      <nav className="lgx-rail" aria-label="Continue into the archive">
        <Link href="/codex">
          <span className="lgx-rail-num">II</span>
          <span className="lgx-rail-name">The Codex</span>
          <span className="lgx-rail-sub">156 pages · Vol. I</span>
        </Link>
        <Link href="/gallery">
          <span className="lgx-rail-num">III</span>
          <span className="lgx-rail-name">The Gallery</span>
          <span className="lgx-rail-sub">Works in full</span>
        </Link>
        <Link href="/codex/archive">
          <span className="lgx-rail-num">IV</span>
          <span className="lgx-rail-name">Correspondence</span>
          <span className="lgx-rail-sub">The archive</span>
        </Link>
        <Link href="/paths">
          <span className="lgx-rail-num">V</span>
          <span className="lgx-rail-name">Guided descent</span>
          <span className="lgx-rail-sub">Follow a thread</span>
        </Link>
      </nav>
    </section>
  );
}

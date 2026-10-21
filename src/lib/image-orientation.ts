import fs from "node:fs";
import path from "node:path";

/** Read intrinsic dimensions from a local public asset without loading the whole file. */
function readPngSize(fd: number): { width: number; height: number } | null {
  const head = Buffer.alloc(33);
  if (fs.readSync(fd, head, 0, 33, 0) < 24) return null;
  if (head.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) { i += 1; continue; }
    const marker = buffer[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return null;
}

/**
 * True when an article cover is meaningfully taller than it is wide.
 * Remote or unreadable sources return false, leaving the standard wide treatment in place.
 */
export function isTallCover(heroImage: string | undefined): boolean {
  if (!heroImage || !heroImage.startsWith("/")) return false;
  const file = path.join(process.cwd(), "public", heroImage);
  let fd: number | undefined;
  try {
    fd = fs.openSync(file, "r");
    const size = readPngSize(fd);
    if (size) return size.height > size.width * 1.15;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  try {
    const size = readJpegSize(fs.readFileSync(file));
    return size ? size.height > size.width * 1.15 : false;
  } catch {
    return false;
  }
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number;
  comparePrice?: number;
  description: string;
  images: string[];
  available: boolean;
  category: string;
  tags: string[];
}

export const products: Product[] = [
  {
    id: "codex-physical",
    slug: "universal-transmissions-codex-vol1-physical",
    title: "Universal Transmissions Codex Vol.1 — Physical Edition",
    price: 215,
    originalPrice: 225,
    description:
      "The long-awaited first volume of the Universal Transmissions Codex — 150 pages of bizarre beauty, a remarkable book unlike any other. Some liken it to The Voynich Manuscript and Codex Seraphanius. It is more than a book; the Universal Transmissions Codex is a condensed collection of 150 high quality art prints bound together in a 10-year labor of love.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716030627-DA8VQAVV957PCTDR65HG/07+-+web.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716028160-GLGK345HL9EDGQT5VO2A/06+-+web.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716022944-4KZHZAT7PLZ1LQB8EP1V/02+-+web.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695716011205-95Z64JF0N4JOSXFYJ13T/03+-+web.jpg",
    ],
    available: true,
    category: "Codex",
    tags: ["codex", "physical", "book", "limited-edition", "art-print"],
  },
  {
    id: "codex-digital",
    slug: "universal-transmissions-codex-vol1-digital",
    title: "Universal Transmissions Codex Vol.1 — Digital Edition",
    price: 99,
    originalPrice: 150,
    description:
      "PDF Edition of the Universal Transmissions Codex Vol.1. 'The Unwritten Book that cannot be read.' 150 pages of the same bizarre beauty as the physical edition — a book not written but woven into existence with childlike fascination towards linguistics, etymology, semiotics, and visionary experience. Not an ordinary PDF, something special.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695718351745-8WJJ4R9DM3N4VD3IHFHR/cover.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695718380540-INT53Y12EC86JNY3N7TP/Page+146.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1695718380177-R3IZR6CY7OA8V7TFD90V/Page+145.jpg",
    ],
    available: true,
    category: "Codex",
    tags: ["codex", "digital", "PDF", "download"],
  },
  {
    id: "chakra-4k",
    slug: "chakra-4k-loop-pack",
    title: "Chakra 4K Loop Pack",
    price: 99,
    originalPrice: 149,
    description:
      "First Loop Pack in a set of 7. Created from the animated versions of the Universal Transmissions series Chakra works. 13 videos, 30 second loops, 4K and 2K resolutions, Alpha Channel Loops, DXV3 + Mp4 Codec. Infused with deep resonant energy and meticulous detail.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/f860f891-74e7-4bdc-9403-76bf9fe4a17d/SCREEN+-+SQUARE.jpg",
    ],
    available: true,
    category: "Loop Packs",
    tags: ["loop-pack", "4K", "chakra", "video", "animation"],
  },
  {
    id: "chakra-8k",
    slug: "chakra-8k-loop-pack",
    title: "Chakra 8K Loop Pack",
    price: 99,
    originalPrice: 149,
    description:
      "Second Loop Pack in a set of 7. Created from the animated versions of the Universal Transmissions series Chakra works. Brought to life with meticulous detail and infused with deep resonant energy. Includes 16 videos, 60 second loops, 8K, 4K and 2K resolutions, Alpha Channel Loops, DXV3 + Mp4 Codec.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/ed18c68d-4afd-4c1e-94bf-9592de773bfa/SCREEN+-+SQUARE.jpg",
    ],
    available: true,
    category: "Loop Packs",
    tags: ["loop-pack", "8K", "chakra", "video", "animation"],
  },
  {
    id: "hexahedron-cube",
    slug: "xeno-frequency-hexahedron-art-cube",
    title: "Xeno Frequency Hexahedron Art Cube",
    price: 109,
    description:
      "First prototype of a real functional Rubik's Cube in the Universal Transmissions style. Collector's Edition Prototype Run — only 10 Art Cubes exist. Second iteration βCube will commence R&D once all 10 prototypes are claimed. Ships up to 10 days after order — requires personal inspection and signing of Certificate of Authenticity.",
    images: [
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1618494214551-FIFTLDAUJJ354X88YRIT/rubix+02+-+web.jpg",
      "https://images.squarespace-cdn.com/content/v1/587faaa8db29d66d9a26b202/1618494215048-JFGXF3R6GMNYD09IQSSO/rUB%C4%B0X+-+WEB.jpg",
    ],
    available: false,
    category: "Art Objects",
    tags: ["art-cube", "hexahedron", "rubix", "limited-edition", "collectors"],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getAvailableProducts(): Product[] {
  return products.filter((p) => p.available);
}

// prisma/seed.ts
import 'dotenv/config';
import { prisma } from '../lib/prisma';

type SeedProduct = {
  handle: string;
  title: string;
  description: string;
  priceVnd: number;
  currency: string;
  images: string[];
  available: boolean;
  tags: string[];
};

// Demo imagery from picsum.photos (seeded → stable URL per product).
// Replace with real photographs of your prints before launching.
const img = (slug: string): string[] => [
  `https://picsum.photos/seed/polytoys-${slug}-1/1200/1200`,
  `https://picsum.photos/seed/polytoys-${slug}-2/1200/1200`,
  `https://picsum.photos/seed/polytoys-${slug}-3/1200/1200`,
];

const products: SeedProduct[] = [
  {
    handle: 'articulated-dragon',
    title: 'Articulated Dragon — Forest Green',
    description:
      'A 38-segment print-in-place dragon with a fully poseable spine, hinged jaw, and gently flapping wings. Printed in matte forest-green PLA on a 0.2 mm layer height for crisp scales.',
    priceVnd: 320_000,
    currency: 'VND',
    images: img('dragon'),
    available: true,
    tags: ['figures', 'articulated', 'kids', 'all'],
  },
  {
    handle: 'modular-mech-robot',
    title: 'Modular Mech — Titan Mk II',
    description:
      'Build-your-own mech that snaps together from 24 modular parts. Swappable shoulder cannons, articulated knees, and a magnetic cockpit. Recommended for ages 8+.',
    priceVnd: 690_000,
    currency: 'VND',
    images: img('mech'),
    available: true,
    tags: ['figures', 'mech', 'kits', 'all'],
  },
  {
    handle: 'glow-octopus',
    title: 'Glow-in-the-Dark Octopus',
    description:
      'Eight flexible TPU tentacles printed in glow-in-the-dark filament. Charges under any light and softly glows for ~20 minutes. Squishy, splash-proof, completely silent.',
    priceVnd: 250_000,
    currency: 'VND',
    images: img('octopus'),
    available: true,
    tags: ['flexi', 'glow', 'kids', 'all'],
  },
  {
    handle: 'cosmic-dice-set',
    title: 'Cosmic Dice Set — 7-piece RPG',
    description:
      'A full polyhedral set (d4 – d20 + percentile) printed in galaxy-resin and hand-finished. Numbers are inked in gold metallic ink for tabletop readability.',
    priceVnd: 420_000,
    currency: 'VND',
    images: img('dice'),
    available: true,
    tags: ['dice', 'tabletop', 'collectibles', 'all'],
  },
  {
    handle: 'fidget-gear-spinner',
    title: 'Gear-Mesh Fidget Spinner',
    description:
      'Six interlocking gears that all turn from a single thumb push. Print-in-place — no assembly, no bearings, no failure points. Perfect desk companion.',
    priceVnd: 180_000,
    currency: 'VND',
    images: img('spinner'),
    available: true,
    tags: ['fidget', 'desk', 'all'],
  },
  {
    handle: 'castle-playset',
    title: 'Mini Castle Playset — Stoneblock Series',
    description:
      'Four printable wall sections, two towers, a drawbridge, and 12 mini-figures. Walls magnetically attach so you can rebuild the keep into any layout.',
    priceVnd: 990_000,
    currency: 'VND',
    images: img('castle'),
    available: true,
    tags: ['playsets', 'kids', 'kits', 'all'],
  },
  {
    handle: 'print-in-place-fox',
    title: 'Print-in-Place Fox — Russet',
    description:
      'A 14-piece articulated fox printed in one go on the bed — no supports, no glue. Tail wags, paws hinge, ears nod. Hand-painted highlights on the muzzle.',
    priceVnd: 290_000,
    currency: 'VND',
    images: img('fox'),
    available: true,
    tags: ['figures', 'articulated', 'collectibles', 'all'],
  },
  {
    handle: 'geometric-puzzle-cube',
    title: 'Geometric Puzzle Cube',
    description:
      'Twelve interlocking polygons that slot together into a perfect cube — only one solution. Printed in dual-color PETG that survives backpacks and drops.',
    priceVnd: 240_000,
    currency: 'VND',
    images: img('cube'),
    available: true,
    tags: ['puzzles', 'desk', 'all'],
  },
];

async function main(): Promise<void> {
  // Tidy: remove legacy clothing products that were originally seeded.
  await prisma.product.deleteMany({
    where: {
      handle: {
        in: ['ao-thun-co-ban', 'quan-jeans-slim', 'giay-sneaker-trang', 'tui-tote-canvas'],
      },
    },
  });

  for (const product of products) {
    await prisma.product.upsert({
      where: { handle: product.handle },
      update: product,
      create: product,
    });
  }

  const count = await prisma.product.count();
  console.log(`Seeded ${products.length} 3D-printed toys (${count} total in database).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

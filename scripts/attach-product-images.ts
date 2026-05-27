// scripts/attach-product-images.ts — download images and attach to an existing Payload product
import { config as loadEnv } from 'dotenv';

loadEnv();

const F22_IMAGES = {
  slug: 'mo-hinh-f-22-raptor',
  title: 'Mô hình F-22 Raptor',
  /** Clean product-style aircraft shot */
  primary: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Lockheed_Martin_F-22_Raptor_%2709-191_-_FF%27_%2827585261174%29.jpg/1280px-Lockheed_Martin_F-22_Raptor_%2709-191_-_FF%27_%2827585261174%29.jpg',
    alt: 'Mô hình F-22 Raptor — góc trưng bày',
    filename: 'f22-raptor-product.jpg',
  },
  /** Secondary scene / alternate angle for carousel gallery */
  gallery: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/A_F-22_Raptor_performs_a_vertical_take_off_%2833048702564%29.jpg/1280px-A_F-22_Raptor_performs_a_vertical_take_off_%2833048702564%29.jpg',
    alt: 'F-22 Raptor — không gian trưng bày hobby',
    filename: 'f22-raptor-scene.jpg',
  },
} as const;

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimetype: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { 'User-Agent': 'LoHobby-Seed/1.0' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const mimetype = response.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimetype };
}

async function createMedia(
  payload: import('payload').Payload,
  input: { url: string; alt: string; filename: string },
): Promise<number> {
  const { buffer, mimetype } = await fetchImageBuffer(input.url);
  const doc = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: input.alt },
    file: {
      data: buffer,
      mimetype,
      name: input.filename,
      size: buffer.length,
    },
  });
  return doc.id as number;
}

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const { loadMediaDoc, mediaDocToStored } = await import('@/lib/product-image-snapshot');

  const payload = await getPayload({ config });
  const { slug, title, primary, gallery } = F22_IMAGES;

  const result = await payload.find({
    collection: 'products',
    where: {
      or: [{ slug: { equals: slug } }, { title: { equals: title } }],
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
    depth: 1,
  });

  const product = result.docs[0];
  if (!product) {
    throw new Error(`Product not found: ${slug}`);
  }

  console.log(`[attach-images] Uploading images for "${title}"…`);

  const primaryId = await createMedia(payload, primary);
  const galleryId = await createMedia(payload, gallery);

  const primaryMedia = await loadMediaDoc(payload, primaryId);
  const galleryMedia = await loadMediaDoc(payload, galleryId);
  const storedImage = mediaDocToStored(primaryMedia, primary.alt);
  const storedGalleryItem = mediaDocToStored(galleryMedia, gallery.alt);

  await payload.update({
    collection: 'products',
    id: product.id,
    overrideAccess: true,
    data: {
      image: primaryId,
      gallery: [{ media: galleryId }],
      storedImage: storedImage ?? undefined,
      storedGallery: storedGalleryItem ? [storedGalleryItem] : undefined,
    },
  });

  console.log(`[attach-images] Updated product id=${product.id} (${slug})`);
  console.log(`  primary media id: ${primaryId}`);
  console.log(`  gallery media id: ${galleryId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[attach-images] Failed: ${message}`);
  process.exit(1);
});

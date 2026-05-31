// app/products/[handle]/page.tsx — legacy route; canonical product URLs live at /product/{slug}
import { permanentRedirect } from 'next/navigation';

type Params = Promise<{ handle: string }>;

export default async function LegacyProductRedirect(props: {
  params: Params;
}): Promise<never> {
  const { handle } = await props.params;
  permanentRedirect(`/product/${handle}`);
}

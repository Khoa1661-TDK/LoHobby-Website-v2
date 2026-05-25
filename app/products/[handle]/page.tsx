// app/products/[handle]/page.tsx — backwards-compat redirect to Commerce route
import { permanentRedirect } from 'next/navigation';

type Params = Promise<{ handle: string }>;

export default async function LegacyProductRedirect(props: { params: Params }): Promise<never> {
  const { handle } = await props.params;
  permanentRedirect(`/product/${handle}`);
}

// app/(payload)/admin/[[...segments]]/page.tsx
import config from '@payload-config';
import type { Metadata } from 'next';
import { generatePageMetadata, RootPage } from '@payloadcms/next/views';
import { importMap } from '../importMap.js';

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const Page = (props: Args): Promise<React.ReactNode> =>
  RootPage({ ...props, config, importMap });

export default Page;

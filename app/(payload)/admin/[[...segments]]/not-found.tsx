// app/(payload)/admin/[[...segments]]/not-found.tsx
import config from '@payload-config';
import type { Metadata } from 'next';
import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views';
import { importMap } from '../importMap.js';

type Args = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const NotFound = (props: Args): Promise<React.ReactNode> =>
  NotFoundPage({ ...props, config, importMap });

export default NotFound;

// lib/prisma.ts
// Prisma singleton for application code, guarded against client bundling.
//
// The client itself lives in `./prisma-client`; this module only adds the
// 'server-only' guard on top. Keep importing THIS module from app code — the
// guard is what turns an accidental import from a Client Component into a build
// error. Only code that must run outside Next's `react-server` condition (the
// Payload storage adapter, scripts/) may import `./prisma-client` directly, and
// it must say why.
import 'server-only';

import prisma from './prisma-client';

export { prisma };
export default prisma;

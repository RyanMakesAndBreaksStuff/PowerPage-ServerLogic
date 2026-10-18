import type { View } from '@/types/http';

// FR-1: the released pages, fixed at build time (VITE_RELEASED_PAGES, default all three).
const starter: readonly View[] = __PAGE_STARTER__ ? ['starter'] : [];
const objects: readonly View[] = __PAGE_OBJECTS__ ? ['objects'] : [];
const inspector: readonly View[] = __PAGE_INSPECTOR__ ? ['inspector'] : [];

export const RELEASED_PAGES: readonly View[] = [...starter, ...objects, ...inspector];

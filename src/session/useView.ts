import { createContext, use } from 'react';
import type { View } from '@/types/http';

export const ViewContext = createContext<[View, (v: View) => void] | null>(null);

export function useView(): [View, (v: View) => void] {
  const value = use(ViewContext);
  if (value === null) throw new Error('useView must be used inside the App');
  return value;
}

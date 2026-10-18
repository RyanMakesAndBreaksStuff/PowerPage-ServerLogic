import type { Connection, PptbHost } from '@/services/pptb/host.types';
import type { SiteFacts, SiteRef } from '@/types/inspector';

export function runScan(
  _host: PptbHost,
  _connection: Connection,
  _site: SiteRef,
  _scanId: string,
  _onProgress: (scanned: number, total: number) => void,
): Promise<SiteFacts> {
  throw new Error('not implemented: phase 15');
}

export function listSites(_host: PptbHost): Promise<readonly SiteRef[]> {
  throw new Error('not implemented: phase 15');
}

// Paste this entire script into Tool DevTools in PPTB. Installing it makes NO host calls.
// Run the named operations manually. Export only `s2Evidence`: it holds types, counts, booleans,
// error names and statuses. No source text, filename, path, ID, URL, token or setting value is recorded.
(() => {
  const evidence = [];
  const record = (item, result) => {
    evidence.push({ item, ...result });
    console.table(evidence);
  };
  const shape = (value) => ({
    type: typeof value,
    constructor: value?.constructor?.name ?? null,
    keys: value && typeof value === 'object' ? Object.keys(value).length : 0,
    bytes: value?.byteLength ?? value?.length ?? null,
  });
  const probe = async (item, call, inspect = shape) => {
    try {
      const value = await call();
      record(item, { outcome: 'returned', ...inspect(value) });
      return value;
    } catch (error) {
      record(item, {
        outcome: 'rejected',
        errorName: error?.name ?? typeof error,
        status: Number.isInteger(error?.status) ? error.status : null,
      });
      return null;
    }
  };
  const read = (path, headers = {}) => window.dataverseAPI.queryData(path, undefined, headers);
  const literal = (value) =>
    `'${encodeURIComponent(value.replaceAll("'", "''")).replaceAll("'", '%27')}'`;
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const requireValue = (condition) => {
    if (!condition) throw new Error('Unexpected probe response.');
  };
  const rows = (value) => {
    requireValue(object(value) && Array.isArray(value.value) && !value['@odata.nextLink']);
    return value.value;
  };
  const relative = (url) => url.replace(/^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//u, '');
  const bytesOf = (value) => {
    if (value instanceof Uint8Array) return new Uint8Array(value);
    if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
    requireValue(object(value) && value.type === 'Buffer' && Array.isArray(value.data));
    requireValue(value.data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255));
    return new Uint8Array(value.data);
  };
  const decodeBlock = (value, count) => {
    requireValue(typeof value === 'string' && value.length % 4 === 0);
    requireValue(!/[^A-Za-z0-9+/=]/u.test(value));
    const binary = atob(value);
    requireValue(btoa(binary) === value && binary.length === count);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  };
  const textOf = (bytes) =>
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/u, '');
  const BLOCK = 4 * 1024 * 1024;
  const PAGE_CAP = 5;

  window.s2Versions = (host, runtime) => {
    requireValue([host, runtime].every((v) => typeof v === 'string' && /^[0-9][0-9A-Za-z.+_-]{0,79}$/u.test(v)));
    record('versions', { host, runtime });
  };

  window.s2Connection = async () => {
    await probe('connection', () => window.toolboxAPI.connections.getActiveConnection(), (value) => ({
      ...shape(value),
      hasId: typeof value?.id === 'string',
      hasName: typeof value?.name === 'string',
      hasUrl: typeof value?.url === 'string',
      environmentKnown: ['Dev', 'Test', 'UAT', 'Production'].includes(value?.environment),
      disconnected: value === null,
    }));
  };

  let eventCount = 0;
  let stoppedAt = null;
  let dispose = null;
  const listener = (eventArg, payloadArg) => {
    const payload = typeof payloadArg?.event === 'string' ? payloadArg : eventArg;
    if (['connection:created', 'connection:updated', 'connection:deleted'].includes(payload?.event)) {
      eventCount += 1;
      record('connection event', {
        event: payload.event,
        firstArgument: shape(eventArg),
        secondArgument: shape(payloadArg),
        payloadKeyCount: Object.keys(payload).length,
        hasData: object(payload.data),
        hasTimestamp: typeof payload.timestamp === 'string',
        dataHasId: typeof payload.data?.id === 'string',
        dataHasUrl: typeof payload.data?.url === 'string',
      });
    }
  };
  window.s2StartEvents = () => {
    if (dispose !== null) return;
    const result = window.toolboxAPI.events.on(listener);
    const offAvailable = typeof window.toolboxAPI.events.off === 'function';
    dispose = typeof result === 'function' ? result : () => window.toolboxAPI.events.off(listener);
    stoppedAt = null;
    record('event subscription', { disposerType: typeof result, offAvailable });
  };
  window.s2StopEvents = () => {
    if (dispose !== null) dispose();
    dispose = null;
    stoppedAt = eventCount;
  };
  window.s2CheckStopped = () =>
    record('unsubscribe check', {
      outcome: stoppedAt === null ? 'pending' : eventCount === stoppedAt ? 'passed' : 'failed',
    });

  let secondPath = null;
  window.s2Paging = async (siteId) => {
    requireValue(typeof siteId === 'string' && guid.test(siteId));
    secondPath = null;
    await probe('paging', async () => {
      let path = `powerpagecomponents?$select=powerpagecomponentid&$filter=powerpagecomponenttype eq 35 and _powerpagesiteid_value eq ${siteId}&$orderby=powerpagecomponentid`;
      let pages = 0;
      let count = 0;
      let terminalFull = false;
      let capped = false;
      const seen = new Set();
      while (path !== null) {
        requireValue(!seen.has(path));
        seen.add(path);
        const page = await read(path, { Prefer: 'odata.maxpagesize=1' });
        requireValue(object(page) && Array.isArray(page.value));
        pages += 1;
        count += page.value.length;
        const next = page['@odata.nextLink'];
        if (next === null || next === undefined || next === '') {
          terminalFull = page.value.length === 1;
          path = null;
        } else {
          requireValue(typeof next === 'string');
          path = relative(next);
          requireValue(path.startsWith('powerpagecomponents?'));
          if (pages === 1) secondPath = path;
          if (pages >= PAGE_CAP) {
            capped = true;
            path = null;
          }
        }
      }
      return { pages, rows: count, terminalFull, capped, wireCheck: 'pending' };
    }, (value) => value);
  };

  window.s2Literal = async () => {
    await probe('apostrophe/space literal', () => read(
      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
    ), (value) => ({ rows: value?.value?.length ?? null, wireCheck: 'pending' }));
  };

  window.s2VerifyWire = (kind, actualUrl) => {
    requireValue((kind === 'nextLink' || kind === 'literal') && typeof actualUrl === 'string' && actualUrl !== '');
    let outcome;
    if (kind === 'nextLink') {
      outcome = secondPath === null ? 'pending' : relative(actualUrl) === secondPath ? 'passed' : 'failed';
    } else {
      outcome = actualUrl.includes('S2%20O%27%27Brien%20name') && !actualUrl.includes('%2527') && !actualUrl.includes('%2520')
        ? 'passed' : 'failed';
    }
    record(`${kind} wire`, { outcome });
  };

  window.s2DownloadKnown = async (id) => {
    await probe('known populated handler', async () => {
      requireValue(typeof id === 'string' && guid.test(id));
      const connection = await window.toolboxAPI.connections.getActiveConnection();
      requireValue(object(connection) && typeof connection.id === 'string' && typeof connection.url === 'string');
      const metadata = rows(await read(
        `powerpagecomponents?$select=powerpagecomponentid,powerpagecomponenttype,filecontent_name&$filter=powerpagecomponentid eq ${id}&$expand=powerpagecomponent_FileAttachments($select=regardingfieldname,filename,filesizeinbytes,mimetype)`,
      ));
      requireValue(metadata.length === 1 && metadata[0].powerpagecomponenttype === 35);
      const row = metadata[0];
      const attachments = Array.isArray(row.powerpagecomponent_FileAttachments) ? row.powerpagecomponent_FileAttachments : [];
      const populated = attachments.some((a) => object(a) && a.regardingfieldname === 'filecontent' &&
        a.filename === row.filecontent_name && Number.isSafeInteger(a.filesizeinbytes) && a.filesizeinbytes > 0);
      record('file metadata', {
        fileNameType: typeof row.filecontent_name,
        attachmentRows: attachments.length,
        attachmentTypes: attachments.map((a) => ({
          regardingfieldname: typeof a?.regardingfieldname, filename: typeof a?.filename,
          size: typeof a?.filesizeinbytes, mimetype: typeof a?.mimetype,
        })),
        matchingPopulatedAttachment: populated,
      });
      requireValue(populated);
      const path = await window.toolboxAPI.fileSystem.selectPath({
        type: 'file', title: 'Select the local copy of that stored handler',
        filters: [{ name: 'Server logic', extensions: ['sl', 'js'] }],
      });
      if (path === null) return { outcome: 'cancelled' };
      const binary = await window.toolboxAPI.fileSystem.readBinary(path);
      record('local binary shape', {
        type: typeof binary, constructor: binary?.constructor?.name ?? null,
        typedArray: binary instanceof Uint8Array, arrayBuffer: binary instanceof ArrayBuffer,
        bytes: binary?.byteLength ?? (Array.isArray(binary?.data) ? binary.data.length : null),
      });
      const local = bytesOf(binary);
      const init = await window.dataverseAPI.execute({
        operationName: 'InitializeFileBlocksDownload', operationType: 'action',
        parameters: { Target: { '@odata.type': 'Microsoft.Dynamics.CRM.powerpagecomponent', powerpagecomponentid: id }, FileAttributeName: 'filecontent' },
      });
      record('file initializer', { types: Object.fromEntries(
        ['FileContinuationToken', 'FileSizeInBytes', 'FileName', 'IsChunkingSupported'].map((key) => [key, typeof init?.[key]]),
      ) });
      requireValue(object(init) && typeof init.FileContinuationToken === 'string' && init.FileContinuationToken !== '' &&
        Number.isSafeInteger(init.FileSizeInBytes) && init.FileSizeInBytes > 0 && init.FileSizeInBytes <= 128 * 1024 * 1024 &&
        typeof init.IsChunkingSupported === 'boolean');
      const downloaded = new Uint8Array(init.FileSizeInBytes);
      let blocks = 0;
      for (let offset = 0; offset < downloaded.length;) {
        const length = init.IsChunkingSupported ? Math.min(BLOCK, downloaded.length - offset) : downloaded.length;
        const block = await window.dataverseAPI.execute({
          operationName: 'DownloadBlock', operationType: 'action',
          parameters: { FileContinuationToken: init.FileContinuationToken, Offset: offset, BlockLength: length },
        });
        if (blocks === 0) record('file block shape', { dataType: typeof block?.Data, keys: object(block) ? Object.keys(block).length : 0 });
        downloaded.set(decodeBlock(block?.Data, length), offset);
        offset += length;
        blocks += 1;
      }
      const current = await window.toolboxAPI.connections.getActiveConnection();
      requireValue(current?.id === connection.id && current?.url === connection.url);
      let textMatch = false;
      try {
        textMatch = textOf(downloaded) === textOf(local);
      } catch {
        record('utf8 decode', { outcome: 'failed' });
      }
      return {
        bytes: downloaded.length, localBytes: local.length, blocks, chunked: init.IsChunkingSupported,
        bytesMatch: downloaded.length === local.length && downloaded.every((b, i) => b === local[i]),
        textMatch,
      };
    }, (value) => value);
  };

  window.s2Environment = async (scenario, schema) => {
    requireValue(['current', 'default', 'missing', 'denied', 'secret'].includes(scenario) &&
      typeof schema === 'string' && schema.trim() !== '');
    await probe(`environment ${scenario}`, async () => {
      const definitions = rows(await read(
        `environmentvariabledefinitions?$select=environmentvariabledefinitionid,type&$filter=schemaname eq ${literal(schema)}&$orderby=environmentvariabledefinitionid`,
      ));
      if (definitions.length === 0) return { definitionRows: 0, resolved: 'missing', valueRead: false };
      requireValue(definitions.length === 1);
      const definition = definitions[0];
      if (definition.type === 100000005) return { definitionRows: 1, resolved: 'secret', valueRead: false };
      requireValue(Number.isInteger(definition.type));
      requireValue(guid.test(definition.environmentvariabledefinitionid));
      const withDefault = rows(await read(
        `environmentvariabledefinitions?$select=environmentvariabledefinitionid,defaultvalue&$filter=environmentvariabledefinitionid eq ${definition.environmentvariabledefinitionid}`,
      ));
      requireValue(withDefault.length === 1);
      const values = rows(await read(
        `environmentvariablevalues?$select=environmentvariablevalueid,value&$filter=_environmentvariabledefinitionid_value eq ${definition.environmentvariabledefinitionid} and statecode eq 0&$orderby=environmentvariablevalueid`,
      ));
      requireValue(values.length <= 1);
      const current = values[0]?.value;
      requireValue(current === null || current === undefined || typeof current === 'string');
      return {
        definitionRows: 1, valueRows: values.length, valueRead: true, typeCode: definition.type,
        resolved: typeof current === 'string' ? 'current' : typeof withDefault[0].defaultvalue === 'string' ? 'default' : 'missing',
      };
    }, (value) => value);
  };

  window.s2ReadFailure = async (label) => {
    requireValue(['network drop', 'expired sign-in', '403 denial'].includes(label));
    await probe(label, () => read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid', { Prefer: 'odata.maxpagesize=1' }));
  };

  window.s2SaveBytes = () =>
    probe('Uint8Array save', () =>
      window.toolboxAPI.fileSystem.saveFile('s2-bytes.bin', new Uint8Array([0, 1, 127, 128, 255]), [
        { name: 'Binary', extensions: ['bin'] },
      ]),
    );
  window.s2Copy = () =>
    probe('clipboard', () => window.toolboxAPI.utils.copyToClipboard('S2 clipboard probe'));

  window.s2Evidence = evidence;
  console.info(
    'Installed only; nothing has been called. Run: s2Versions(host, runtime); await s2Connection(); s2StartEvents(); await s2Paging(siteId); await s2Literal(); s2VerifyWire("nextLink"|"literal", actualUrlFromNetworkPanel); await s2DownloadKnown(recordId); await s2Environment("current"|"default"|"missing"|"denied"|"secret", schemaName); await s2ReadFailure("network drop"|"expired sign-in"|"403 denial"); s2StopEvents(); then change a connection and s2CheckStopped(). s2SaveBytes() and s2Copy() remain available. Export only s2Evidence.',
  );
})();

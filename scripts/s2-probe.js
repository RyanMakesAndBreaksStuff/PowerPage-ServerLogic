// Paste this entire script into Tool DevTools in PPTB. It performs read calls only.
// The two save/copy probes use owner-chosen local files and the clipboard.
(async () => {
  const evidence = [];
  const record = (item, result) => {
    evidence.push({ item, ...result });
    console.table(evidence);
  };
  const shape = (value) => ({
    type: typeof value,
    constructor: value?.constructor?.name ?? null,
    keys: value && typeof value === 'object' ? Object.keys(value) : [],
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
  await probe(
    'connection',
    () => window.toolboxAPI.connections.getActiveConnection(),
    (value) => ({
      ...shape(value),
      hasId: typeof value?.id === 'string',
      hasName: typeof value?.name === 'string',
      hasUrl: typeof value?.url === 'string',
      environment: value?.environment ?? null,
    }),
  );
  record('events.off', { available: typeof window.toolboxAPI.events.off === 'function' });
  const listener = (eventArg, payloadArg) => {
    const payload = typeof payloadArg?.event === 'string' ? payloadArg : eventArg;
    if (typeof payload?.event === 'string' && payload.event.startsWith('connection:'))
      record('connection event', {
        event: payload.event,
        firstArgument: shape(eventArg),
        secondArgument: shape(payloadArg),
        payloadKeys: Object.keys(payload),
        dataShape: shape(payload.data),
        dataHasId: typeof payload.data?.id === 'string',
        dataHasUrl: typeof payload.data?.url === 'string',
      });
  };
  window.toolboxAPI.events.on(listener);
  window.s2StopEvents = () => window.toolboxAPI.events.off(listener);
  const first = await probe(
    'paging first',
    () =>
      read('powerpagecomponents?$select=powerpagecomponentid&$orderby=powerpagecomponentid', {
        Prefer: 'odata.maxpagesize=1',
      }),
    (value) => ({
      ...shape(value),
      rows: value?.value?.length ?? null,
      nextLink: typeof value?.['@odata.nextLink'] === 'string',
    }),
  );
  if (typeof first?.['@odata.nextLink'] === 'string') {
    const next = first['@odata.nextLink'].replace(
      /^https?:\/\/[^/]+\/api\/data\/v\d+(?:\.\d+)?\//,
      '',
    );
    await probe('paging second unchanged', () => read(next, { Prefer: 'odata.maxpagesize=1' }));
  }
  const logic = await probe('code inventory', () =>
    read(
      'powerpagecomponents?$select=powerpagecomponentid&$filter=powerpagecomponenttype eq 35&$orderby=powerpagecomponentid&$top=1',
    ),
  );
  const id = logic?.value?.[0]?.powerpagecomponentid;
  if (typeof id === 'string')
    await probe('filecontent/$value', () => read(`powerpagecomponents(${id})/filecontent/$value`));
  else record('filecontent/$value', { outcome: 'not run', reason: 'No type-35 record found' });
  await probe('environment definitions', () =>
    read(
      'environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,type,defaultvalue&$orderby=environmentvariabledefinitionid&$top=1',
    ),
  );
  await probe('environment values', () =>
    read(
      'environmentvariablevalues?$select=environmentvariablevalueid,_environmentvariabledefinitionid_value,value&$orderby=environmentvariablevalueid&$top=1',
    ),
  );
  await probe('apostrophe/space literal', () =>
    read(
      `powerpagecomponents?$select=powerpagecomponentid&$filter=name eq ${literal("S2 O'Brien name")}&$orderby=powerpagecomponentid`,
    ),
  );
  window.s2ReadFailure = (label) =>
    probe(label, () =>
      read('powerpagesites?$select=powerpagesiteid&$orderby=powerpagesiteid&$top=1'),
    );
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
    'Now change another connection and rename/relabel the active one; record event shapes. Run s2SaveBytes() then verify exact bytes; run s2Copy() then paste locally. Drop network then run s2ReadFailure("network drop"); restore network, expire sign-in using the host UI, then run s2ReadFailure("expired sign-in"). Restore connection and call s2StopEvents(). Export only the shape table; no setting values, IDs, URLs, tokens or handler text are printed. Record PPTB/host version manually.',
  );
})();

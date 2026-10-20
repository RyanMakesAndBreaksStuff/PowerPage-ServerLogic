import { describe, expect, it } from 'vitest';
import { SERVER_OBJECTS } from '@/services/catalogue/serverObjects';
import { DEFAULT_SELECTION, listObjects, nextMember, reselect, selected } from './objectList';

const NONE: ReadonlyMap<string, readonly string[]> = new Map();
const paths = (query: string, filter: 'all' | 'used' | 'connectors' = 'all', used = NONE) =>
  listObjects(query, filter, used).map((l) => l.object.path);

describe('listObjects (AC-6.3, AC-6.4)', () => {
  it('lists all nine objects with no search', () => {
    expect(paths('')).toEqual(SERVER_OBJECTS.map((o) => o.path));
  });

  it('matches object and member names, case-insensitive', () => {
    expect(paths('LOGGER')).toEqual(['Server.Logger']);
    expect(paths('retrievemultiple')).toEqual(['Server.Connector.Dataverse']);
    expect(paths('  async ')).toEqual([
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
    expect(paths('nothing like this')).toEqual([]);
  });

  it('records the first matching member (AC-6.4a)', () => {
    expect(listObjects('record', 'all', NONE)).toEqual([
      expect.objectContaining({ memberMatch: 'CreateRecord' }),
    ]);
    expect(listObjects('', 'all', NONE)[0]?.memberMatch).toBeNull();
  });

  it('filters to used objects or connectors', () => {
    const used = new Map([
      ['Server.Logger', ['Log']],
      ['Server.Connector.Dataverse', []],
    ]);
    expect(paths('', 'used', used)).toEqual(['Server.Logger', 'Server.Connector.Dataverse']);
    expect(paths('', 'connectors')).toEqual([
      'Server.Connector.Dataverse',
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
    expect(paths('log', 'connectors')).toEqual([]);
  });
});

describe('reselect (AC-6.4a)', () => {
  const dataverse = { path: 'Server.Connector.Dataverse', member: 'DeleteRecord', variant: 0 };

  it('keeps a selection that is still listed', () => {
    expect(reselect(listObjects('', 'connectors', NONE), dataverse, '')).toBe(dataverse);
  });

  it('selects the first listed object when the selection is filtered out', () => {
    expect(reselect(listObjects('', 'all', NONE).slice(1), DEFAULT_SELECTION, '')).toEqual({
      path: 'Server.Context',
      member: 'ActivityId',
      variant: 0,
    });
  });

  it('selects the first matching member when the search matches members', () => {
    expect(reselect(listObjects('Retrieve', 'all', NONE), dataverse, 'Retrieve')).toEqual({
      path: 'Server.Connector.Dataverse',
      member: 'RetrieveRecord',
      variant: 0,
    });
    expect(reselect(listObjects('Retrieve', 'all', NONE), DEFAULT_SELECTION, 'Retrieve')).toEqual({
      path: 'Server.Connector.Dataverse',
      member: 'RetrieveRecord',
      variant: 0,
    });
  });

  it('keeps a selected member the search matches', () => {
    const selection = { ...dataverse, member: 'RetrieveMultipleRecords' };
    expect(reselect(listObjects('Retrieve', 'all', NONE), selection, 'Retrieve')).toBe(selection);
  });

  it('keeps the selection when nothing is listed, and selected() reports no results', () => {
    expect(reselect([], dataverse, 'zzz')).toBe(dataverse);
    expect(selected([], dataverse)).toBeNull();
  });
});

describe('nextMember (AC-6.9)', () => {
  const logger = SERVER_OBJECTS[0];
  if (logger === undefined) throw new Error('no objects');

  it("wraps round in Learn's order", () => {
    const [log, warn, error] = logger.members;
    expect(nextMember(logger, log)?.name).toBe(warn?.name);
    if (error === undefined) throw new Error('no Error member');
    expect(nextMember(logger, error)?.name).toBe('Log');
  });

  it('is null for a one-member object', () => {
    const user = SERVER_OBJECTS.find((o) => o.path === 'Server.User');
    if (user === undefined) throw new Error('no Server.User');
    expect(nextMember(user, user.members[0])).toBeNull();
  });
});

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerObjectsPage } from './ServerObjectsPage';
import { renderObjects } from './objectsTestHarness';

const list = (): HTMLElement => screen.getByRole('region', { name: 'Server objects' });
const detail = (): HTMLElement => screen.getByRole('region', { name: 'Object detail' });
const listed = (): string[] =>
  within(list())
    .getAllByRole('button')
    .map((b) => b.querySelector('.objects-item__path')?.textContent ?? '');
const pick = (path: string): HTMLElement =>
  within(list()).getByRole('button', { name: new RegExp(`^${path.replaceAll('.', '\\.')}`) });
const insert = (): HTMLElement => screen.getByRole('button', { name: 'Insert into handler' });
const signatures = (): string[] =>
  within(screen.getByRole('list', { name: 'Signatures' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

const HANDLER = 'function get() {\n  Server.Logger.Log("hi");\n  return "{}";\n}\n';
const LEARN = 'https://learn.microsoft.com/power-pages/configure/server-objects';

describe('Server Objects page (Story 6)', () => {
  it('shows the list, the detail and the context column (AC-6.1)', () => {
    renderObjects(<ServerObjectsPage />);
    expect(list()).toBeTruthy();
    expect(detail()).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Used in customer-summary' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Permissions needed' })).toBeTruthy();
  });

  it('shows "Not documented on Learn" for Server.User.fullname, not an invented return type (AC-6.5)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.User'));
    expect(detail().textContent).toContain('Returns: Not documented on Learn');
  });

  it('exposes the code sample as a named group (a11y)', () => {
    renderObjects(<ServerObjectsPage />);
    expect(within(detail()).getAllByRole('group', { name: /sample$/ })).toHaveLength(1);
  });

  it('links the Learn reference through the host, never a new window (FR-1)', async () => {
    const { host, user } = renderObjects(<ServerObjectsPage />);
    const link = within(detail()).getByRole('link', { name: 'Server objects on Microsoft Learn' });
    expect(link.getAttribute('href')).toBe(LEARN);
    expect(link.getAttribute('target')).toBeNull();
    await user.click(link);
    expect(host.callsOf('openExternal')).toHaveLength(1);
    expect(host.callsOf('openExternal')[0]?.url).toBe(LEARN);
  });

  it('announces how many objects the list shows (a11y)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    const count = (): string => within(list()).getByRole('status').textContent;
    expect(count()).toBe('9 objects listed');
    await user.type(screen.getByRole('searchbox', { name: 'Search objects and methods' }), 'zzz');
    expect(count()).toBe('0 objects listed');
  });

  it('says what the used mark means (a11y)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    expect(pick('Server.Logger').textContent).toContain('used by the current handler');
  });

  it('lists the nine objects with description and count, and marks used ones (AC-6.2)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    expect(listed()).toHaveLength(9);
    expect(pick('Server.Context').textContent).toContain('9 properties');
    expect(pick('Server.Logger').textContent).toContain('3 methods');
    expect(within(pick('Server.Logger')).queryByText('used')).toBeNull();
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    expect(within(pick('Server.Logger')).getByText('used')).toBeTruthy();
    expect(within(pick('Server.Context')).queryByText('used')).toBeNull();
  });

  it('ignores mentions in comments when marking used (FR-6)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({
      type: 'editServer',
      text: '// Server.Logger.Log\nfunction get() {}\n',
      cursor: null,
    });
    expect(within(pick('Server.Logger')).queryByText('used')).toBeNull();
  });

  it('filters by search, synchronously on each keystroke (AC-6.3, NFR 100 ms)', () => {
    renderObjects(<ServerObjectsPage />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search objects and methods' }), {
      target: { value: 'httpclient' },
    });
    expect(listed()).toEqual(['Server.Connector.HttpClient']);
  });

  it('filters to used objects and connectors (AC-6.4)', async () => {
    const { user, dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    await user.click(screen.getByRole('radio', { name: 'Used here' }));
    expect(listed()).toEqual(['Server.Logger']);
    await user.click(screen.getByRole('radio', { name: 'Connectors' }));
    expect(listed()).toEqual([
      'Server.Connector.Dataverse',
      'Server.Connector.HttpClient',
      'Server.Connector.CloudFlow',
    ]);
  });

  it('reselects when the list changes, and shows no results (AC-6.4a, Error Scenarios)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    expect(within(detail()).getByRole('heading', { name: 'Logger' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'Connectors' }));
    expect(within(detail()).getByRole('heading', { name: 'Dataverse' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    const search = screen.getByRole('searchbox', { name: 'Search objects and methods' });
    await user.type(search, 'Update');
    expect(
      within(detail()).getByRole('radio', { name: 'UpdateRecord' }).getAttribute('aria-checked'),
    ).toBe('true');
    await user.clear(search);
    await user.type(search, 'zzz');
    expect(within(detail()).getByRole('status').textContent).toBe(
      "No objects or members match 'zzz'",
    );
    await user.click(within(detail()).getByRole('button', { name: 'Clear search' }));
    expect(listed()).toHaveLength(9);
  });

  it('shows breadcrumb, type pill, members, signature, return type and the table (AC-6.5)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.Dataverse'));
    const nav = within(detail()).getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav.textContent).toBe('Server.Connector›DataverseConnector');
    expect(within(detail()).getAllByRole('radio')).toHaveLength(6);
    expect(signatures()).toEqual(['CreateRecord(entitySetName, payload)']);
    expect(detail().textContent).toContain('Returns: Connector result');
    expect(detail().textContent).toContain('Synchronous');
    const table = within(detail()).getByRole('table', { name: 'All methods' });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(
      within(table).getByRole('button', { name: 'CreateRecord' }).getAttribute('aria-current'),
    ).toBe('true');

    await user.click(pick('Server.Logger'));
    expect(within(detail()).getByRole('navigation').textContent).toBe('Server›LoggerObject');
    expect(detail().textContent).toContain('Returns: Not documented on Learn');
  });

  it('marks Context members by invocation context (FR-6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Context'));
    expect(detail().textContent).toContain('HTTP and Liquid');
    await user.click(within(detail()).getByRole('radio', { name: 'Input' }));
    expect(detail().textContent).toContain('Liquid only');
    expect(within(detail()).getByRole('table', { name: 'All properties' })).toBeTruthy();
  });

  it('updates signature and sample from a member pill or a table row (AC-6.6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.Dataverse'));
    await user.click(within(detail()).getByRole('radio', { name: 'RetrieveRecord' }));
    expect(signatures()).toHaveLength(3);
    expect(screen.getByLabelText('RetrieveRecord sample').textContent).toContain('RetrieveRecord(');
    await user.click(within(detail()).getByRole('button', { name: 'DeleteRecord' }));
    expect(signatures()).toEqual(['DeleteRecord(entitySetName, id)']);
    expect(screen.getByLabelText('DeleteRecord sample').textContent).toContain('DeleteRecord(');
  });

  it('switches sample variants (FR-6)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    await user.type(
      screen.getByRole('searchbox', { name: 'Search objects and methods' }),
      'RetrieveMultiple',
    );
    const sample = (): string =>
      screen.getByLabelText('RetrieveMultipleRecords sample').textContent;
    expect(sample()).toContain('$filter');
    await user.click(screen.getByRole('radio', { name: 'Top N' }));
    expect(sample()).toContain('$top=3');
  });

  it('copies the sample with the "Code copied" toast (AC-6.7)', async () => {
    const { host, user } = renderObjects(<ServerObjectsPage />);
    await user.click(screen.getByRole('button', { name: 'Copy sample' }));
    await waitFor(() => {
      expect(host.callsOf('notify')).toEqual([
        { method: 'notify', notice: { title: 'Code copied', body: '', type: 'success' } },
      ]);
    });
    expect(host.callsOf('copyText')).toEqual([
      { method: 'copyText', text: 'Server.Logger.Log("Information message");' },
    ]);
  });

  it('inserts into the handler as one change, keeps the cursor and opens Logic Starter (AC-6.8)', async () => {
    const { user, session, views } = renderObjects(<ServerObjectsPage />);
    await user.click(pick('Server.Connector.HttpClient'));
    await user.click(insert());
    const { serverText, cursor } = session().state;
    expect(serverText.startsWith('async function get() {\n  const url =')).toBe(true);
    expect(serverText.slice(0, cursor ?? 0).endsWith('HttpClient.GetAsync(url, headers);\n')).toBe(
      true,
    );
    expect(session().derived.checks).toEqual({ hits: [], parseFailed: false });
    expect(views).toEqual(['starter']);
  });

  it('disables Insert with the reason and keeps Copy (AC-6.8 fixture)', async () => {
    const { dispatch, views, user } = renderObjects(<ServerObjectsPage />);
    const code = 'function get(){ /* cursor */ return "{}"; }';
    dispatch({ type: 'editServer', text: code, cursor: code.indexOf('cursor') });
    expect(insert().getAttribute('aria-disabled')).toBe('true');
    fireEvent.focus(insert());
    expect(
      screen.getByText('Move the cursor between statements inside a function, or use Copy'),
    ).toBeTruthy();
    await user.click(insert());
    expect(views).toEqual([]);
    expect(
      screen.getByRole('button', { name: 'Copy sample' }).getAttribute('aria-disabled'),
    ).toBeNull();
  });

  it('says why when the code has no function or the insert would break it (AC-6.8)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: 'const x = ;', cursor: null });
    fireEvent.focus(insert());
    expect(screen.getByText('No function to insert into; use Copy')).toBeTruthy();
  });

  it('shows used members, permissions and another sample (AC-6.9)', async () => {
    const { dispatch, user } = renderObjects(<ServerObjectsPage />);
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    const used = screen.getByRole('region', { name: 'Used in customer-summary' });
    expect(used.textContent).toContain('Server.Logger');
    expect(within(used).getByText('Log')).toBeTruthy();

    const permissions = screen.getByRole('region', { name: 'Permissions needed' });
    expect(permissions.textContent).toContain('contact · Read');
    expect(permissions.textContent).toContain('Not reviewed yet');
    dispatch({ type: 'markReviewed' });
    expect(permissions.textContent).toContain('Checklist reviewed');

    const another = screen.getByRole('region', { name: 'Another sample' });
    expect(within(another).getByLabelText('Warn sample').textContent).toContain('Warn(');
    await user.click(pick('Server.User'));
    expect(screen.queryByRole('region', { name: 'Another sample' })).toBeNull();
  });

  it('lists outbound domains and site settings for the selected recipe (AC-3.6)', () => {
    const { dispatch } = renderObjects(<ServerObjectsPage />);
    const permissions = screen.getByRole('region', { name: 'Permissions needed' });
    expect(within(permissions).queryByText('Outbound domains')).toBeNull();
    dispatch({ type: 'selectRecipe', recipe: 'R7' });
    expect(within(permissions).getByText('graph.microsoft.com')).toBeTruthy();
    expect(within(permissions).getByText('CLIENT_SECRET')).toBeTruthy();
  });

  it('keeps the still-listed object when Used here shrinks and All is chosen (AC-6.4a)', async () => {
    const { dispatch, user } = renderObjects(<ServerObjectsPage />);
    dispatch({
      type: 'editServer',
      text: 'function get() {\n  Server.Connector.HttpClient.GetAsync(url, headers);\n  return "{}";\n}\n',
      cursor: null,
    });
    await user.click(screen.getByRole('radio', { name: 'Used here' }));
    expect(within(detail()).getByRole('heading', { name: 'HttpClient' })).toBeTruthy();
    dispatch({ type: 'editServer', text: HANDLER, cursor: null });
    expect(within(detail()).getByRole('heading', { name: 'Logger' })).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    expect(within(detail()).getByRole('heading', { name: 'Logger' })).toBeTruthy();
  });

  it('keeps the member match after a row click and a cleared search (AC-6.4a)', async () => {
    const { user } = renderObjects(<ServerObjectsPage />);
    const search = screen.getByRole('searchbox', { name: 'Search objects and methods' });
    await user.type(search, 'Update');
    expect(
      within(detail()).getByRole('radio', { name: 'UpdateRecord' }).getAttribute('aria-checked'),
    ).toBe('true');
    await user.click(pick('Server.Connector.Dataverse'));
    await user.clear(search);
    expect(
      within(detail()).getByRole('radio', { name: 'UpdateRecord' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('goes back to Create Logic (AC-6.10)', async () => {
    const { user, views } = renderObjects(<ServerObjectsPage />);
    await user.click(screen.getByRole('button', { name: 'Back to Create Logic' }));
    expect(views).toEqual(['starter']);
  });
});

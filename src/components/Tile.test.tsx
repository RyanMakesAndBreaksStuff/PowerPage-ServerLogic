// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tile } from './Tile';

describe('Tile', () => {
  it('is a plain container without a heading', () => {
    const { container } = render(<Tile>body</Tile>);
    expect(screen.queryByRole('region')).toBeNull();
    expect(container.firstElementChild?.className).toBe('ui-tile');
  });

  it('becomes a named region with a caption and an aside when it has a heading', () => {
    render(
      <Tile heading="Recipe" aside={<span>10 recipes</span>}>
        <p>content</p>
      </Tile>,
    );
    const region = screen.getByRole('region', { name: 'Recipe' });
    expect(within(region).getByText('10 recipes')).toBeTruthy();
    expect(within(region).getByText('content')).toBeTruthy();
  });

  it('supports flush tiles and extra classes', () => {
    const { container } = render(
      <Tile flush className="pane">
        x
      </Tile>,
    );
    expect(container.firstElementChild?.className).toBe('ui-tile ui-tile--flush pane');
  });
});

const ALLOWED_KEYS = new Set(['name', 'operation', 'input', 'output']);

type LiquidTag = { name: string; body: string };

/** Decision 11: tags close, if/comment balance, and serverlogic keys. Not a Liquid parser. */
export function checkLiquidSyntax(source: string): void {
  const tags = liquidTags(source);
  const stack: string[] = [];
  for (const tag of tags) {
    if (tag.name === 'if') stack.push('if');
    else if (tag.name === 'elsif' || tag.name === 'else') {
      if (stack.at(-1) !== 'if') throw new Error('unbalanced if');
    } else if (tag.name === 'endif') {
      if (stack.pop() !== 'if') throw new Error('unbalanced if');
    } else if (tag.name === 'comment') stack.push('comment');
    else if (tag.name === 'endcomment') {
      if (stack.pop() !== 'comment') throw new Error('unbalanced comment');
    }
  }
  if (stack.length > 0) {
    throw new Error(stack.at(-1) === 'if' ? 'unbalanced if' : 'unbalanced comment');
  }
  for (const snippet of source.split('\n\n')) {
    const assigned = new Set<string>();
    for (const tag of liquidTags(snippet)) {
      if (tag.name === 'assign') {
        const match = /^assign\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*'[^']*'$/.exec(tag.body);
        const variable = match?.[1];
        if (variable !== undefined) assigned.add(variable);
      }
      if (tag.name === 'serverlogic') checkServerlogic(tag.body, assigned);
    }
  }
}

function liquidTags(source: string): LiquidTag[] {
  const tags: LiquidTag[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('{%', cursor);
    if (open === -1) return tags;
    const close = source.indexOf('%}', open + 2);
    if (close === -1) throw new Error('unclosed {%');
    const body = source.slice(open + 2, close).trim();
    const name = /^([A-Za-z]+)/.exec(body)?.[1];
    if (name === undefined) throw new Error('unclosed {%');
    tags.push({ name, body });
    cursor = close + 2;
  }
  return tags;
}

function checkServerlogic(body: string, assigned: ReadonlySet<string>): void {
  const rest = body.replace(/^\s*serverlogic\s*/, '');
  const pairs = new Map<string, string>();
  for (const part of splitTopLevel(rest)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(\S(?:.*\S)?)$/.exec(part.trim());
    const key = match?.[1];
    const value = match?.[2];
    if (key === undefined || value === undefined) throw new Error('bad attribute');
    if (!ALLOWED_KEYS.has(key)) throw new Error(`unknown attribute ${key}`);
    if (pairs.has(key)) throw new Error(`duplicate attribute ${key}`);
    pairs.set(key, value);
  }
  for (const key of ['name', 'operation', 'output']) {
    if (!pairs.has(key)) throw new Error(`missing ${key}`);
  }
  const name = pairs.get('name');
  const operation = pairs.get('operation');
  if (name === undefined || !/^'[^']*'$/.test(name)) throw new Error('name must be single-quoted');
  if (operation === undefined || !/^'[^']*'$/.test(operation)) {
    throw new Error('operation must be single-quoted');
  }
  const input = pairs.get('input');
  if (input !== undefined) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(input)) throw new Error('input must be a variable');
    if (!assigned.has(input)) throw new Error('input has no earlier assign');
  }
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  for (const ch of text) {
    if (quote !== null) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') parts.push(current);
  return parts;
}

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

/** Comments legitimately *discuss* db.products.put(), so they must not count as calls. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Regression guard for the catalog write path.
 *
 * `db.products.put()` / `db.products.delete()` bypass the private-ID derivation in
 * catalogService, in two different ways:
 *   - put() without `productId` throws a ConstraintError at runtime. The type system
 *     catches this now that `Product.productId` is required.
 *   - delete(bareBarcode) SILENTLY matches nothing, because the real primary key is
 *     '#' + barcode. Types cannot catch this — both values are strings — so the rule
 *     is guarded here instead.
 *
 * Five screens shipped with exactly these two bugs in the schema-v11 change, so this
 * is worth pinning rather than trusting review to catch it again.
 */
describe('catalog write path', () => {
  it('nothing outside catalogService writes to the catalog table directly', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.endsWith('catalogService.ts'))
      .filter((file) => !file.includes('__tests__'))
      .filter((file) => /db\.products\.(put|delete|add)\(/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(SRC.length + 1).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });
});

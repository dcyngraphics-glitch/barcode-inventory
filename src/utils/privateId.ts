/**
 * Dexie Cloud gives every user a private realm, but it does NOT namespace primary
 * keys for you. Its best-practices doc: "primary keys has to be globally unique
 * strings in Dexie Cloud". The escape hatch is a '#'-prefixed *private ID*, which
 * the server keeps in a per-user namespace and which "cannot collide with other
 * user's".
 *
 * Anything this app keys by a real-world shared identifier (a barcode) or by a
 * fixed singleton name (settings) must go through here, or two accounts on the same
 * database will collide on the same key.
 */
export function privateId(value: string): string {
  return value.startsWith('#') ? value : `#${value}`;
}

/** Catalog rows are keyed per account, never by the globally-shared barcode itself. */
export function productIdFor(barcode: string): string {
  return privateId(barcode);
}

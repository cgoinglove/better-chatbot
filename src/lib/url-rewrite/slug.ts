import { customAlphabet } from "nanoid";
import {
  URL_REWRITE_SLUG_LENGTH,
  URL_REWRITE_SLUG_PATTERN,
} from "app-types/url-rewrite";

/**
 * Lowercase only, and without characters that are easy to mistake for one
 * another when a link is read out loud or copied from print (0/o, 1/l/i).
 */
const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const nanoid = customAlphabet(SLUG_ALPHABET, URL_REWRITE_SLUG_LENGTH);

export function generateSlug(length = URL_REWRITE_SLUG_LENGTH): string {
  return nanoid(length);
}

/** Slugs are compared and stored lowercase so `/goto/AbC123` resolves too. */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  return URL_REWRITE_SLUG_PATTERN.test(slug.trim());
}

/**
 * Generates a slug that is not taken yet. Collisions are vanishingly rare at
 * this alphabet size, but a burst of links should never fail on one.
 */
export async function generateUniqueSlug(
  exists: (slug: string) => Promise<boolean>,
  attempts = 5,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const slug = generateSlug();
    if (!(await exists(slug))) return slug;
  }
  // Widen the keyspace rather than give up.
  return generateSlug(URL_REWRITE_SLUG_LENGTH + 2);
}

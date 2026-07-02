import "server-only";

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "h2", "h3", "h4", "a",
];

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title"],
    ALLOW_DATA_ATTR: false,
  });
}

export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, " ")
    .trim();
}


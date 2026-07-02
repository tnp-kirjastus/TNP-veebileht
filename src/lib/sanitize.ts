import "server-only";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u", "s", "blockquote",
  "ul", "ol", "li", "h2", "h3", "h4", "a",
];

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<([a-z][a-z0-9]*)(?:\s[^>]*)?(\/?)>/gi, (_match, tag, selfClose) => {
      const lower = tag.toLowerCase();
      if (ALLOWED_TAGS.includes(lower)) return `<${lower}>`;
      if (selfClose) return "";
      return "";
    })
    .replace(/<\/([a-z][a-z0-9]*)>/gi, (_match, tag) => {
      return ALLOWED_TAGS.includes(tag.toLowerCase()) ? `</${tag.toLowerCase()}>` : "";
    })
    .replace(/<a /gi, '<a ')
    .replace(/href="([^"]*)"/gi, 'href="$1"')
    .replace(/title="([^"]*)"/gi, 'title="$1"')
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/on\w+=[^\s>]*/gi, "");
}

export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

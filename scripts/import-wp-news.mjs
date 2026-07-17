import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const sqlDumpPath = "D:\\WORKS\\TNP\\htdocs\\DB\\d1640_4585762457.sql";
const outputPath = resolve(projectRoot, "supabase", "migrations", "024_seed_wp_news.sql");

if (!existsSync(sqlDumpPath)) {
  console.error("SQL dump not found:", sqlDumpPath);
  process.exit(1);
}

console.log("Reading SQL dump...");
const sql = readFileSync(sqlDumpPath, "utf-8");
console.log("Parsing posts...");

const postRows = [];
const postmetaRows = [];
const attachments = new Map();

// Parse all INSERT INTO t2n1p_posts rows
const postColumnsRe = /INSERT INTO `t2n1p_posts` \(`ID`, `post_author`, `post_date`, `post_date_gmt`, `post_content`, `post_title`, `post_excerpt`, `post_status`, `comment_status`, `ping_status`, `post_password`, `post_name`, `to_ping`, `pinged`, `post_modified`, `post_modified_gmt`, `post_content_filtered`, `post_parent`, `guid`, `menu_order`, `post_type`, `post_mime_type`, `comment_count`\) VALUES\n/;
// Build one big regex to match individual value rows
const postValueRe = /\((\d+),\s*(\d+),\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',\s*'((?:(?:[^'\\]|\\.)*?))',\s*'((?:(?:[^'\\]|\\.)*?))',\s*'((?:(?:[^'\\]|\\.)*?))',\s*'(publish|draft|inherit|pending|private|trash|auto-draft|future)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'((?:(?:[^'\\]|\\.)*?))',\s*'([^']*)',\s*'([^']*)',\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',\s*'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})',\s*'((?:(?:[^'\\]|\\.)*?))',\s*(\d+),\s*'([^']*)',\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;

function unescapeSql(str) {
  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\0/g, "\0");
}

function escapePgString(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function stripHtmlTags(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}

function cleanContent(content) {
  let cleaned = content;

  // Remove WordPress Gutenberg block comments (<!-- wp:... -->, <!-- /wp:... -->, <!-- wp:... /-->)
  cleaned = cleaned.replace(/<!-- \/?wp:.*?-->/g, "");

  // Remove MS Office XML namespaces and tags
  cleaned = cleaned.replace(/<\?xml:namespace[^?]*\?>/gi, "");
  cleaned = cleaned.replace(/<o:p>\s*<\/o:p>/gi, "");
  cleaned = cleaned.replace(/<\/?o:p>/gi, "");

  // Remove Visual Composer wrapper shortcodes (keep inner content)
  const wrappers = ["vc_row", "vc_column", "vc_column_text", "vc_row_inner", "vc_column_inner"];
  for (const tag of wrappers) {
    cleaned = cleaned.replace(new RegExp(`\\[${tag}[^\\]]*\\]`, "gi"), "");
    cleaned = cleaned.replace(new RegExp(`\\[/${tag}\\]`, "gi"), "");
  }

  // Remove other common shortcodes entirely (including their content)
  const removeAll = [
    "vc_single_image", "vc_gallery", "vc_video", "vc_message",
    "vc_btn", "vc_cta", "vc_pie", "vc_progress_bar", "vc_tour",
    "vc_tta_tabs", "vc_tta_section", "vc_tta_accordion",
    "vc_empty_space", "vc_custom_heading", "vc_line_chart",
    "vc_round_chart", "vc_basic_grid", "vc_masonry_grid",
    "vc_media_grid", "vc_masonry_media_grid", "vc_icon",
    "vc_separator", "vc_text_separator", "vc_zigzag",
    "vc_hoverbox", "vc_section", "vc_toggle",
  ];
  for (const tag of removeAll) {
    cleaned = cleaned.replace(new RegExp(`\\[${tag}[^\\]]*\\](?:[\\s\\S]*?)\\[/${tag}\\]`, "gi"), "");
  }

  // Remove self-closing shortcodes
  const selfClosing = ["vc_single_image", "vc_empty_space", "vc_separator", "vc_text_separator", "vc_zigzag", "vc_icon"];
  for (const tag of selfClosing) {
    cleaned = cleaned.replace(new RegExp(`\\[${tag}[^\\]\\[]*?/?\\]`, "gi"), "");
    cleaned = cleaned.replace(new RegExp(`\\[/${tag}\\]`, "gi"), "");
  }

  // Remove any remaining shortcodes [anything]
  cleaned = cleaned.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*(?:\s[^\]]*)?\]/g, "");
  cleaned = cleaned.replace(/\[\/[a-zA-Z_][a-zA-Z0-9_-]*\]/g, "");

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*(&nbsp;)*\s*<\/p>/gi, "");
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, "");

  // Remove multiple consecutive empty lines / blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Decode common WordPress escaped characters
  cleaned = cleaned.replace(/&nbsp;/gi, " ");
  cleaned = cleaned.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  cleaned = cleaned.replace(/&#[xX]([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));

  // Remove multiple consecutive spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Process posts block by block using a simpler approach
function parsePosts() {
  // We'll split the file by INSERT INTO t2n1p_posts and process each block
  const blocks = sql.split(/INSERT INTO `t2n1p_posts` .*? VALUES\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    // Find value rows in this block
    const matches = block.matchAll(postValueRe);
    for (const m of matches) {
      const id = parseInt(m[1], 10);
      const postAuthor = parseInt(m[2], 10);
      const postDate = m[3];
      const postDateGmt = m[4];
      const postContent = unescapeSql(m[5]);
      const postTitle = unescapeSql(m[6]);
      const postExcerpt = unescapeSql(m[7]);
      const postStatus = m[8];
      const postName = unescapeSql(m[12]);
      const postParent = parseInt(m[18], 10);
      const guid = m[19];
      const postType = m[21];
      const postMimeType = m[22];

      if (!postName || !postTitle) continue;

      if (postType === "post" && postStatus === "publish") {
        postRows.push({
          id,
          slug: postName,
          title: postTitle,
          excerpt: postExcerpt || null,
          content: postContent || null,
          publishedAt: postDateGmt || postDate,
          guid,
        });
      } else if (postType === "attachment" && (postMimeType || "").startsWith("image/")) {
        attachments.set(id, {
          id,
          parentId: postParent,
          guid,
          mimeType: postMimeType,
        });
      }
    }
  }
}

// Parse t2n1p_postmeta for _thumbnail_id
function parsePostmeta() {
  const blocks = sql.split(/INSERT INTO `t2n1p_postmeta` .*? VALUES\n/);

  for (const block of blocks) {
    const matches = block.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)',\s*'((?:(?:[^'\\]|\\.)*?))'\)/g);
    for (const m of matches) {
      const postId = parseInt(m[2], 10);
      const metaKey = m[3];
      const metaValue = unescapeSql(m[4]);

      if (metaKey === "_thumbnail_id") {
        postmetaRows.push({ postId, thumbnailId: parseInt(metaValue, 10) || metaValue });
      } else if (metaKey === "_yoast_wpseo_title") {
        postmetaRows.push({ postId, yoastSeoTitle: metaValue });
      } else if (metaKey === "_yoast_wpseo_metadesc") {
        postmetaRows.push({ postId, yoastSeoDesc: metaValue });
      }
    }
  }
}

console.log("Parsing...");
parsePosts();
parsePostmeta();

console.log(`Found ${postRows.length} publish posts`);
console.log(`Found ${postmetaRows.length} postmeta entries`);
console.log(`Found ${attachments.size} image attachments`);

// Build thumbnail lookup
const thumbnailMap = new Map();
for (const row of postmetaRows) {
  if (row.thumbnailId) {
    thumbnailMap.set(row.postId, row.thumbnailId);
  }
}

// Build Yoast SEO lookup
const yoastTitleMap = new Map();
const yoastDescMap = new Map();
for (const row of postmetaRows) {
  if (row.yoastSeoTitle) {
    yoastTitleMap.set(row.postId, row.yoastSeoTitle);
  }
  if (row.yoastSeoDesc) {
    yoastDescMap.set(row.postId, row.yoastSeoDesc);
  }
}

// Old WordPress domain for URL rewriting
const oldDomains = [
  "https://kirjastus.tnp.ee",
  "http://kirjastus.tnp.ee",
  "https://www.kirjastus.tnp.ee",
  "http://www.kirjastus.tnp.ee",
];

function rewriteUrls(content) {
  if (!content) return content;
  let c = content;
  for (const domain of oldDomains) {
    c = c.replace(new RegExp(domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  }
  return c;
}

// Build import records
const importRecords = [];
let skippedNoContent = 0;
let skippedNoSlug = 0;

for (const post of postRows) {
  if (!post.slug) {
    skippedNoSlug++;
    continue;
  }

  const cleanedContent = cleanContent(rewriteUrls(post.content || ""));
  if (!cleanedContent && !post.excerpt) {
    skippedNoContent++;
    continue;
  }

  // Resolve thumbnail
  let imageUrl = null;
  const thumbnailId = thumbnailMap.get(post.id);
  if (thumbnailId) {
    const attachment = attachments.get(typeof thumbnailId === "number" ? thumbnailId : null);
    if (attachment?.guid) {
      // Strip old domain from image URL
      imageUrl = attachment.guid;
      for (const domain of oldDomains) {
        if (imageUrl.startsWith(domain)) {
          imageUrl = imageUrl.slice(domain.length);
        }
      }
      // If it's a relative path without domain, leave as is (may need manual fixing)
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = null; // Can't verify if still hosted
      }
    }
  }

  // Strip HTML tags from title and excerpt
  const cleanTitle = stripHtmlTags(post.title);
  const cleanExcerpt = post.excerpt ? stripHtmlTags(post.excerpt) : null;

  // Escape for PostgreSQL
  const escapedSlug = escapePgString(post.slug);
  const escapedTitle = escapePgString(cleanTitle);
  const escapedExcerpt = cleanExcerpt ? escapePgString(cleanExcerpt) : null;
  const escapedContent = cleanedContent ? escapePgString(cleanedContent) : null;
  const escapedImageUrl = imageUrl ? escapePgString(imageUrl) : null;
  const escapedSeoTitle = yoastTitleMap.get(post.id) ? escapePgString(yoastTitleMap.get(post.id)) : null;
  const escapedSeoDesc = yoastDescMap.get(post.id) ? escapePgString(yoastDescMap.get(post.id)) : null;

  // Normalize published date to ISO format
  let publishedAt = post.publishedAt;
  if (publishedAt && !publishedAt.endsWith("Z") && !publishedAt.includes("+")) {
    publishedAt = publishedAt.replace(" ", "T") + "+00";
  }

  importRecords.push({
    slug: escapedSlug,
    title: escapedTitle,
    excerpt: escapedExcerpt,
    content: escapedContent,
    imageUrl: escapedImageUrl,
    publishedAt,
    seoTitle: escapedSeoTitle,
    seoDesc: escapedSeoDesc,
  });
}

console.log(`Import records: ${importRecords.length} (skipped: ${skippedNoSlug} no-slug, ${skippedNoContent} no-content)`);

// Generate SQL migration
const rows = importRecords.map((r) => {
  const parts = [
    `'${r.slug}'`,
    `'${r.title}'`,
    r.excerpt ? `'${r.excerpt}'` : "NULL",
    r.content ? `'${r.content}'` : "NULL",
    r.imageUrl ? `'${r.imageUrl}'` : "NULL",
    `'${r.publishedAt}'::timestamptz`,
    r.seoTitle ? `'${r.seoTitle}'` : "NULL",
    r.seoDesc ? `'${r.seoDesc}'` : "NULL",
    "true",
  ];
  return `  (${parts.join(", ")})`;
});

const sqlOutput = `-- Migration 024: Import historical WordPress news posts
-- Generated by scripts/import-wp-news.mjs
-- Source: D:\\WORKS\\TNP\\htdocs\\DB\\d1640_4585762457.sql
-- Posts imported: ${importRecords.length}

INSERT INTO content.posts (slug, title_et, excerpt_et, content_et, image_url, published_at, seo_title, seo_description, is_published)
VALUES
${rows.join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  title_et = EXCLUDED.title_et,
  excerpt_et = EXCLUDED.excerpt_et,
  content_et = EXCLUDED.content_et,
  image_url = COALESCE(EXCLUDED.image_url, content.posts.image_url),
  published_at = EXCLUDED.published_at,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  is_published = true;

`;

writeFileSync(outputPath, sqlOutput, "utf-8");
console.log(`Migration written to: ${outputPath}`);
console.log("Done.");

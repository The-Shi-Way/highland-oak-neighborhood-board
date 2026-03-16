import sanitizeHtmlLib from "sanitize-html";

/**
 * Strips all HTML tags from a string, returning plain text.
 */
export function sanitizeText(str) {
  if (!str || typeof str !== "string") return str;
  return sanitizeHtmlLib(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Allows a safe subset of HTML tags suitable for markdown-rendered content.
 */
export function sanitizeHtml(str) {
  if (!str || typeof str !== "string") return str;
  return sanitizeHtmlLib(str, {
    allowedTags: [
      "p",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "br",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
  });
}

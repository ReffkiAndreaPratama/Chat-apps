/**
 * Component untuk render text pesan dengan fitur:
 * - Auto-detect dan linkify URLs
 * - Bold text dengan *text*
 * - Italic text dengan _text_
 * - Monospace dengan `text`
 */
export default function MessageText({ text }) {
  if (!text) return null;

  const parts = parseMessage(text);

  return (
    <span className="message-text">
      {parts.map((part, i) => {
        switch (part.type) {
          case "link":
            return (
              <a key={i} href={part.href} target="_blank" rel="noopener noreferrer">
                {part.text}
              </a>
            );
          case "bold":
            return <strong key={i}>{part.text}</strong>;
          case "italic":
            return <em key={i}>{part.text}</em>;
          case "code":
            return (
              <code key={i} style={{
                background: "rgba(0,0,0,0.06)",
                padding: "1px 4px",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: "0.9em",
              }}>
                {part.text}
              </code>
            );
          default:
            return <span key={i}>{part.text}</span>;
        }
      })}
    </span>
  );
}

function parseMessage(text) {
  const parts = [];
  // URL regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  // Split by URLs first
  const segments = text.split(urlRegex);

  segments.forEach((segment) => {
    if (urlRegex.test(segment)) {
      // Reset lastIndex after test
      urlRegex.lastIndex = 0;
      parts.push({ type: "link", text: segment, href: segment });
    } else {
      // Parse formatting within non-URL segments
      const formatted = parseFormatting(segment);
      parts.push(...formatted);
    }
  });

  return parts;
}

function parseFormatting(text) {
  const parts = [];
  // Simple regex-based formatting
  const formatRegex = /(\*[^*]+\*)|(_[^_]+_)|(`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    const content = match[0];
    if (content.startsWith("*") && content.endsWith("*")) {
      parts.push({ type: "bold", text: content.slice(1, -1) });
    } else if (content.startsWith("_") && content.endsWith("_")) {
      parts.push({ type: "italic", text: content.slice(1, -1) });
    } else if (content.startsWith("`") && content.endsWith("`")) {
      parts.push({ type: "code", text: content.slice(1, -1) });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", text });
  }

  return parts;
}

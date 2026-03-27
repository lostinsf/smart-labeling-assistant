function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "\n").replace(/\u00a0/g, " ").trim();
}

function toKeyValueSentence(text: string) {
  const tokens = text
    .split(/\t+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 4 || tokens.length % 2 !== 0) {
    return "";
  }

  const pairs: string[] = [];

  for (let index = 0; index < tokens.length; index += 2) {
    pairs.push(`${tokens[index]}: ${tokens[index + 1]}`);
  }

  return pairs.join(", ");
}

export function cleanProductDescription(raw: string) {
  const normalized = normalizeWhitespace(raw);

  if (!normalized) {
    return "";
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => toKeyValueSentence(line) || line.replace(/\s+/g, " "));

  return lines.join(" / ");
}

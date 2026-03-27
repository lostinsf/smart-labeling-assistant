import type { ProductInput } from "../types/labeling";

const nameHeaders = [
  "상품명",
  "상품이름",
  "제품명",
  "title",
  "name",
  "product_name"
];

const descriptionHeaders = [
  "상품설명",
  "설명",
  "제품설명",
  "description",
  "desc",
  "product_description"
];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function splitRecords(text: string) {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '""';
        index += 1;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }

      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      if (current.trim()) {
        records.push(current.trim());
      }

      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    records.push(current.trim());
  }

  return records;
}

export function parseTabularText(text: string): ProductInput[] {
  const records = splitRecords(text.replace(/^\uFEFF/, ""));

  if (records.length === 0) {
    return [];
  }

  const delimiter = records[0].includes("\t") ? "\t" : ",";
  const headerCells = parseDelimitedLine(records[0], delimiter).map(normalizeHeader);

  const nameIndex = headerCells.findIndex((header) => nameHeaders.includes(header));
  const descriptionIndex = headerCells.findIndex((header) =>
    descriptionHeaders.includes(header)
  );
  const startIndex = nameIndex !== -1 || descriptionIndex !== -1 ? 1 : 0;

  return records
    .slice(startIndex)
    .map((record) => parseDelimitedLine(record, delimiter))
    .map((cells) => ({
      name: cells[nameIndex !== -1 ? nameIndex : 0] || "",
      description: cells[descriptionIndex !== -1 ? descriptionIndex : 1] || ""
    }))
    .filter((item) => item.name || item.description);
}

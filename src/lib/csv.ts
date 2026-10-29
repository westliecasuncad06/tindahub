/** UTF-8 BOM for Excel, RFC 4180 quoting, and text formula neutralization. */
export function toCSV(
  headers: string[],
  rows: (string | number | null)[][],
): string {
  const cell = (value: string | number | null) => {
    let content = String(value ?? "");
    if (
      typeof value === "string" &&
      (/^[\s]*[=+\-@]/.test(content) || /^[\t\r\n]/.test(content))
    )
      content = "'" + content;
    return '"' + content.replaceAll('"', '""') + '"';
  };
  return (
    "\ufeff" +
    [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
  );
}

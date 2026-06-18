// @ts-ignore
import writeXlsxFile from "write-excel-file/browser";

export type ExportCol<T> = {
  header: string;
  value: (row: T) => unknown;
};

export async function exportToExcel<T>(
  rows: T[],
  cols: ExportCol<T>[],
  filename: string,
) {
  const headerRow = cols.map(col => ({
    value: col.header,
    type: String,
    backgroundColor: "#1E3A5F",
    color: "#FFFFFF",
    fontWeight: "bold" as const,
    align: "center" as const,
  }));

  const dataRows = rows.map(row =>
    cols.map(col => ({
      value: col.value(row) == null ? "" : String(col.value(row)),
      type: String,
      color: "#000000",
      backgroundColor: "#FFFFFF",
    })),
  );

  const columns = cols.map(col => ({
    width: Math.min(
      Math.max(col.header.length + 4, ...rows.map(r => String(col.value(r) ?? "").length + 2)),
      45,
    ),
  }));

  const result = await (writeXlsxFile as any)([headerRow, ...dataRows], { columns });
  await result.toFile(`${filename}.xlsx`);
}

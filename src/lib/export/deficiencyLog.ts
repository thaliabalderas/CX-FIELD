import "server-only";

import ExcelJS from "exceljs";

import type { Project, SavedObservation } from "@/types";

/**
 * The Parkhill Commissioning Deficiency Log workbook: one observation per row.
 *
 * Columns follow the Parkhill template. Everything the app records is filled
 * in. What the app does not know - priority, responsible party - is left blank
 * for the engineer, and Status starts at the template's default of "Open".
 * Nothing is guessed. Priority and Status are dropdowns with the template's
 * colouring, which follows whatever the engineer picks.
 *
 * Cell values are written as plain strings, which Excel never evaluates, so
 * field text that begins with `=` cannot become a formula.
 */

const RED = "FFA6192E";
const DARK = "FF333333";
const WHITE = "FFFFFFFF";
const BAND_BLUE = "FFBDE3F4";
const BAND_GREY = "FFF2F2F2";
const PINK = "FFFCE4E6";
const YELLOW = "FFFFF2CC";
const GREEN = "FFE2EFDA";
const BORDER = "FF7FC9E8";

const COLUMNS: { header: string; width: number }[] = [
  { header: "ID", width: 6 },
  { header: "Date Identified", width: 16 },
  { header: "Building / Area", width: 22 },
  { header: "Room / Equipment", width: 24 },
  { header: "System / Test", width: 32 },
  { header: "Deficiency Description", width: 56 },
  { header: "Priority", width: 12 },
  { header: "Status", width: 14 },
  { header: "Responsible Party", width: 24 },
  { header: "Resolution / Notes", width: 48 },
  { header: "Recommended Diagnostic Checks", width: 56 },
];

const LAST_COLUMN = COLUMNS.length;

function numbered(items: { text: string }[]): string {
  return items.map((item, index) => `${index + 1}. ${item.text}`).join("\n");
}

/** `yyyy-mm-dd` to a UTC-midnight date, so the cell
 *  shows the same calendar day in every timezone. */
function excelDate(isoDate: string): Date | string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day));
}

export async function buildDeficiencyLog(
  project: Pick<Project, "projectNumber" | "name">,
  observations: SavedObservation[],
): Promise<Buffer> {
  // Field order, as in the printed report.
  const rows = [...observations].sort(
    (a, b) =>
      a.observedDate.localeCompare(b.observedDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Parkhill CX Field";
  const sheet = workbook.addWorksheet("Deficiency Log", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "4:4",
    },
  });
  sheet.columns = COLUMNS.map((column) => ({ width: column.width }));

  // Row 1: title bar.
  sheet.mergeCells(1, 1, 1, LAST_COLUMN);
  const title = sheet.getCell(1, 1);
  title.value = "COMMISSIONING DEFICIENCY LOG";
  title.font = { name: "Calibri", size: 20, bold: true, color: { argb: WHITE } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
  title.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 32;

  // Row 2: project line.
  sheet.mergeCells(2, 1, 2, LAST_COLUMN);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = `${project.projectNumber} | ${project.name} | Functional Performance Testing / Field Observations`;
  subtitle.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
  subtitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  subtitle.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(2).height = 20;

  // Row 4: column headers (row 3 is a spacer, as in the template).
  const header = sheet.getRow(4);
  COLUMNS.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  header.height = 26;

  rows.forEach((observation, index) => {
    const row = sheet.getRow(5 + index);
    const band = index % 2 === 0 ? BAND_BLUE : BAND_GREY;

    const systemTest = [observation.system, observation.activity]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" / ");

    const values: (string | number | Date)[] = [
      index + 1,
      excelDate(observation.observedDate),
      observation.location,
      observation.equipment,
      systemTest,
      observation.observation,
      "", // Priority - the engineer's call
      "Open",
      "", // Responsible party - not recorded by the app
      observation.actions.length > 0
        ? `Suggested corrective actions:\n${numbered(observation.actions)}`
        : "",
      numbered(observation.causes),
    ];

    values.forEach((value, column) => {
      const cell = row.getCell(column + 1);
      cell.value = value;
      cell.font = { name: "Calibri", size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: band } };
      cell.alignment = {
        vertical: "top",
        wrapText: true,
        horizontal: column <= 1 ? "left" : undefined,
      };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
      };
    });
    row.getCell(2).numFmt = "m/d/yyyy";

    // Wrapped rows do not auto-size when generated, so estimate the height
    // from the longest wrapped cell.
    const lines = Math.max(
      ...values.map((value, column) =>
        typeof value === "string"
          ? value
              .split("\n")
              .reduce(
                (total, line) =>
                  total + Math.max(1, Math.ceil(line.length / (COLUMNS[column].width * 1.05))),
                0,
              )
          : 1,
      ),
    );
    row.height = Math.min(409, Math.max(30, lines * 15 + 4));

    row.getCell(7).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"High,Medium,Low"'],
    };
    row.getCell(8).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Open,In Progress,Closed"'],
    };
  });

  // Priority / Status colouring follows the dropdown value.
  if (rows.length > 0) {
    const last = 4 + rows.length;
    const fill = (argb: string) => ({
      type: "pattern" as const,
      pattern: "solid" as const,
      bgColor: { argb },
    });
    sheet.addConditionalFormatting({
      ref: `G5:G${last}`,
      rules: [
        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"High"'],
          priority: 1,
          style: { font: { bold: true, color: { argb: RED } }, fill: fill(PINK) },
        },
      ],
    });
    sheet.addConditionalFormatting({
      ref: `H5:H${last}`,
      rules: [
        { type: "cellIs", operator: "equal", formulae: ['"Open"'], priority: 2, style: { fill: fill(PINK) } },
        { type: "cellIs", operator: "equal", formulae: ['"In Progress"'], priority: 3, style: { fill: fill(YELLOW) } },
        { type: "cellIs", operator: "equal", formulae: ['"Closed"'], priority: 4, style: { fill: fill(GREEN) } },
      ],
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

import { parse, format, isValid } from "date-fns";
import { it, enUS } from "date-fns/locale";

export default async (req, res) => {
  const { items, props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode, joinColumns, selectedColumns } = props;
  const allowedTokens = ["dd","MM","MMMM","yyyy","HH","hh","mm","ss","a","SSS","XXX","z"];

  if (formatType === "custom") {
    const isPatternValid =
      typeof customPattern === "string" && customPattern.trim() !== "" &&
      allowedTokens.some((token) => customPattern.includes(token));

    if (!isPatternValid) {
      throw new Error("Error: Invalid custom pattern. Allowed tokens: dd, MM, MMMM, yyyy, HH, hh, mm, a, ss, SSS, XXX, z.");
    }
  }

  let pattern;
  switch (formatType) {
    case "iso": pattern = "yyyy-MM-dd"; break;
    case "european": pattern = "dd/MM/yyyy"; break;
    case "us": pattern = "MM/dd/yyyy"; break;
    case "custom": pattern = customPattern; break;
  }

  switch (detailLevel) {
    case "year": pattern = "yyyy"; break;
    case "monthNumber": pattern = "MM"; break;
    case "monthText": pattern = "MMMM"; break;
    case "day": pattern = "dd"; break;
    case "monthYear": pattern = "MM-yyyy"; break;
    case "date": break;
    case "hourMinutes": pattern += " HH:mm"; break;
    case "seconds": pattern += " HH:mm:ss"; break;
    case "milliseconds": pattern += " HH:mm:ss.SSS"; break;
    case "timezone": pattern += " HH:mm:ss XXX"; break;
  }

  function isTimeOnly(value) {
    if (!value) return false;
    const inputFormats = ["HH:mm","hh:mm a","HH:mm:ss","hh:mm:ss a","HH:mm:ss.SSS","HH:mm:ss.SSS XXX","HH:mm:ss z"];
    for (const fmt of inputFormats) {
      const parsed = parse(value, fmt, new Date());
      if (isValid(parsed)) {
        return true;
      }
    }
    return false;
  }

  function toFormattedDate(value, pattern) {
    if (!value) return { value: null };
    const strValue = String(value).trim().split(",")[0];

    if (isTimeOnly(strValue)) return { value: strValue, valid: true };

    const inputFormats = [
      "yyyy-MM-dd","yyyy/MM/dd","yyyy.MM.dd","yyyyMMdd", "dd-MM-yyyy","dd/MM/yyyy","dd.MM.yyyy","ddMMyyyy",
      "MM-dd-yyyy","MM/dd/yyyy","MM.dd.yyyy","MMddyyyy", "d MMMM yyyy","dd MMMM yyyy", "MMMM d, yyyy","MMMM dd, yyyy",
    ];

    let date = null;
    for (const fmt of inputFormats) {
      const parsedEn = parse(strValue, fmt, new Date(), { locale: enUS });
      if (isValid(parsedEn)) { date = parsedEn; break; }

      const parsedIt = parse(strValue, fmt, new Date(), { locale: it });
      if (isValid(parsedIt)) { date = parsedIt; break; }
    }

    if (!date || !isValid(date)) {
      throw new Error("Error: Column(s) contains invalid date values");
    }

    const formatted = format(date, pattern);
    return { value: formatted, valid: true };
  }

  let response = { columns: {}, meta: {} };
  if (joinColumns && selectedColumns && selectedColumns.length > 1) {
    const columnsData = selectedColumns.map((col) => items[col]);
    const newColumnName = `joined_${selectedColumns.join("_")}`;
    response.columns[newColumnName] = {
      label: `${newColumnName}`,
      kind: "literal",
      metadata: [],
      cells: {},
    };

    const rowIds = Object.keys(columnsData[0]);

    rowIds.forEach(id => {
      const formattedValues = columnsData.map(col => {
        const value = col[id];
        const result = toFormattedDate(value, pattern);
        return result.value;
      });
      const joinedValue = formattedValues.join("; ");
      response.columns[newColumnName].cells[id] = { label: joinedValue, metadata: [] };
    });
  } else {
    const columnToProcess = Object.keys(items)[0];
    const columnData = items[columnToProcess];
    const newColumnName = outputMode === "edit"
        ? columnToProcess
        : `formatted_${columnToProcess}`;

    response.columns[newColumnName] = {
      label: outputMode === "edit" ? columnToProcess : `${newColumnName} (${pattern})`,
      kind: "literal",
      metadata: [],
      cells: {},
    };

    Object.keys(columnData).forEach(id => {
      const value = columnData[id];
      const result = toFormattedDate(value, pattern);
      response.columns[newColumnName].cells[id] = {
        label: result.value,
        metadata: [],
      };
    });
  }

  return response;
};

import { parse, format, isValid } from "date-fns";
import { it, enUS } from "date-fns/locale";

export default async (req, res) => {
  const {items, props} = req.original;
  const columnToProcess = Object.keys(items)[0];
  const columnData = items[columnToProcess];

  const { formatType, customPattern, detailLevel, outputMode } = props;

  if (formatType === "custom") {
    const allowedTokens = ["dd", "MM", "MMMM", "yyyy", "HH", "mm", "ss", "SSS", "XXX"];

    const isPatternValid =
      typeof customPattern === "string" && customPattern.trim() !== "" &&
      allowedTokens.some((token) => customPattern.includes(token));

    if (!isPatternValid) {
      throw new Error("Error: Invalid custom pattern. Allowed tokens: dd, MM, MMMM, yyyy, HH, mm, ss, SSS, XXX.");
    }
  }

  let pattern;
  switch (formatType) {
    case "iso":
      pattern = "yyyy-MM-dd";
      break;
    case "european":
      pattern = "dd/MM/yyyy";
      break;
    case "us":
      pattern = "MM/dd/yyyy";
      break;
    case "custom":
      pattern = customPattern;
      break;
  }

  switch (detailLevel) {
    case "year":
      pattern = "yyyy";
      break;
    case "monthNumber":
      pattern = "MM";
      break;
    case "monthText":
      pattern = "MMMM";
      break;
    case "day":
      pattern = "dd";
      break;
    case "monthYear":
      pattern = "MM-yyyy";
      break;
    case "date":
      pattern;
      break;
    case "hour":
      pattern += " HH";
      break;
    case "minutes":
      pattern += " HH:mm";
      break;
    case "seconds":
      pattern += " HH:mm:ss";
      break;
    case "milliseconds":
      pattern += " HH:mm:ss.SSS";
      break;
    case "timezone":
      pattern += " HH:mm:ss XXX";
      break;
  }

  function toFormattedDate(value, pattern) {
    if (!value) return { value: null };
    const strValue = String(value).trim().split(",")[0];

    const inputFormats = [
      "yyyy-MM-dd","yyyy/MM/dd","yyyy.MM.dd","yyyyMMdd",
      "dd-MM-yyyy","dd/MM/yyyy","dd.MM.yyyy","ddMMyyyy",
      "MM-dd-yyyy","MM/dd/yyyy","MM.dd.yyyy","MMddyyyy",
      "d MMMM yyyy","dd MMMM yyyy",
      "MMMM d, yyyy","MMMM dd, yyyy"
    ];

    let date = null;

    try {
      for (const fmt of inputFormats) {
        const parsedEn = parse(strValue, fmt, new Date(), { locale: enUS });
        if (isValid(parsedEn)) { date = parsedEn; break; }

        const parsedIt = parse(strValue, fmt, new Date(), { locale: it });
        if (isValid(parsedIt)) { date = parsedIt; break; }
      }

      if (!date || !isValid(date)) {
        throw new Error("Error: Column contains invalid date values");
      }

      const formatted = format(date, pattern);
      return { value: formatted };
    } catch (err) {
      throw new Error("Error: Column contains invalid date values");
    }
  }

  const newColumnName = outputMode === "edit"
      ?  columnToProcess
      : `formatted_${columnToProcess}`;

  const response = {
    columns: {
      [newColumnName]: {
        label: outputMode === "edit"
          ? `${columnToProcess}`
          : `${newColumnName} (${pattern})`,
        kind: "literal",
        metadata: [],
        cells: {},
      },
    },
    meta: { columnInvalid: false },
  };

  Object.keys(columnData).forEach((id) => {
    const value = columnData[id];
    const result = toFormattedDate(value, pattern);
    response.columns[newColumnName].cells[id] = {
      label: result.value,
      metadata: [],
    };
    if (result.error) {
      response.meta.columnInvalid = true;
    }
  });

  return response;
};

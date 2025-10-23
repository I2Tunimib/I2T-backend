import { parse, format, isValid } from "date-fns";
import { it, enUS } from "date-fns/locale";

export default async (req, res) => {
  const { items, props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode, joinColumns, selectedColumns, columnType, separator } = props;
  const allowedTokens = ["dd","MM","MMMM","yyyy","HH","hh","mm","ss","a","SSS","XXX","z"];

  const dateFormats = [
    "yyyy-MM-dd","yyyy/MM/dd","yyyy.MM.dd","yyyyMMdd",
    "yyyy-MM-dd","yyyy/MM/dd","yyyy.MM.dd","yyyyMMdd",
    "dd-MM-yyyy","dd/MM/yyyy","dd.MM.yyyy","ddMMyyyy",
    "MM-dd-yyyy","MM/dd/yyyy","MM.dd.yyyy","MMddyyyy",
    "d MMMM yyyy","dd MMMM yyyy","MMMM d, yyyy","MMMM dd, yyyy",
  ];

  const timeFormats = ["HH:mm","hh:mm a","HH:mm:ss","hh:mm:ss a","HH:mm:ss.SSS","HH:mm:ssXXX","HH:mm:ss z"];

  const dateTimeFormats = [];
  for (const d of dateFormats) {
    for (const t of timeFormats) {
      dateTimeFormats.push(`${d} ${t}`);
    }
  }

  function buildPattern({ formatType, customPattern, detailLevel, columnType, joinColumns }) {
    console.log("buildPattern columnType", columnType);
    let pattern = "";
    switch(formatType) {
      case "iso": pattern = "yyyy-MM-dd"; break;
      case "european": pattern = "dd/MM/yyyy"; break;
      case "us": pattern = "MM/dd/yyyy"; break;
      case "custom": pattern = customPattern; break;
    }

    //Validation custom
    if (formatType === "custom") {
      const timeAllowedTokens = ["HH","hh","mm","ss","a","SSS","XXX","z"];
      const tokens = columnType === "time" ? timeAllowedTokens : allowedTokens;
      const isPatternValid =
        typeof customPattern === "string" && customPattern.trim() !== "" &&
        tokens.some((token) => customPattern.includes(token));

      if (!isPatternValid) {
        throw new Error(`Error: Invalid custom pattern. Allowed tokens: ${tokens.join(", ")}.`);
      }
      return customPattern;
    }

    const datePatterns = {year: "yyyy", monthNumber: "MM", monthText: "MMMM", day: "dd",
      monthYear: "MM-yyyy", date: pattern};

    const timePatterns = {
      hourMinutes: "HH:mm",            // 12:30
      hourMinutes12: "hh:mm a",        // 12:30 PM
      seconds: "HH:mm:ss",             // 12:30:45
      seconds12: "hh:mm:ss a",         // 12:30:45 PM
      milliseconds: "HH:mm:ss.SSS",    // 12:30:45.123
      timezone: "HH:mm:ssXXX",         // 12:30:45+02:00
      timezoneAbbr: "HH:mm:ss z",      // 12:30:45 GMT+2
    };

    const dateLevels = Object.keys(datePatterns);
    const timeLevels = Object.keys(timePatterns);
    const sep = formatType === "iso" ? "'T'" : " ";

    if (columnType === "date") {
      // Apply detailLevel selected refering to date
      if (dateLevels.includes(detailLevel)) {
        pattern = datePatterns[detailLevel];
      } else if (timeLevels.includes(detailLevel) && !joinColumns) {
        // Append detailLevel selected refering to time to the date part, only if NOT joining multiple columns
        const timePattern = timePatterns[detailLevel];
        pattern = `${pattern}${sep}${timePattern}`;
      }
    } else if (columnType === "time" && timeLevels.includes(detailLevel)) {
      // Apply detailLevel selected refering to time (no information about date)
      pattern = timePatterns[detailLevel];
    } else if (columnType === "datetime") {
      // Build both date and time parts depending on the selected detail level
      if (dateLevels.includes(detailLevel)) {
        // Apply detailLevel selected refering to date
        pattern = datePatterns[detailLevel];
      } else if (timeLevels.includes(detailLevel)) {
        // Apply detailLevel selected refering to time
        const timePattern = timePatterns[detailLevel];
        pattern = `${pattern}${sep}${timePattern}`;
      }
    }

    return pattern;
  }


  function formatDateOnly(strValue, { formatType, customPattern, detailLevel, locales, joinColumns }) {
    for (const fmt of dateFormats) {
      for (const locale of locales) {
        const parsed = parse(strValue, fmt, new Date(), {locale});
        if (isValid(parsed)) {
          const pattern = buildPattern({formatType, customPattern, detailLevel, hasTime: false, columnType: "date", joinColumns });
          return format(parsed, pattern);
        }
      }
    }
    return null;
  }

  function formatTimeOnly(strValue, { formatType, customPattern, detailLevel, joinColumns }) {
    for (const fmt of timeFormats) {
      const parsed = parse(strValue, fmt, new Date());
      if (isValid(parsed)) {
        const pattern = buildPattern({ formatType, customPattern, detailLevel, hasTime: true, columnType: "time", joinColumns });
        return format(parsed, pattern);
      }
    }
    return null;
  }

  function formatDateTime(strValue, { formatType, customPattern, detailLevel, locales, joinColumns }) {
    for (const fmt of dateTimeFormats) {
      for (const locale of locales) {
        const parsed = parse(strValue, fmt, new Date(), {locale});
        if (isValid(parsed)) {
          const pattern = buildPattern({formatType, customPattern, detailLevel, hasTime: true, columnType: "datetime", joinColumns });
          return format(parsed, pattern);
        }
      }
    }
    return null;
  }

  function toFormatted(value, columnType) {
    if (!value) return { value: null };
    const strValue = String(value).trim().replace("T", " ").split(",")[0];
    const locales = [enUS, it];
    let formatted = null;
    try {
      switch (columnType) {
        case "date":
          formatted = formatDateOnly(strValue, { formatType, customPattern, detailLevel, locales });
          break;
        case "time":
          formatted = formatTimeOnly(strValue, { formatType, customPattern, detailLevel });
          break;
        case "datetime":
          formatted = formatDateTime(strValue, { formatType, customPattern, detailLevel, locales });
          break;
      }
      if (!formatted) throw new Error();
      return { value: formatted, valid: true };
    } catch {
      throw new Error("Error: Column(s) contains invalid date values");
    }
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
    const locales = [enUS, it];

    rowIds.forEach(id => {
      const dateParts = [];
      const timeParts = [];
      selectedColumns.forEach((col, index) => {
        const raw = columnsData[index][id]?.[0];
        if (!raw) return;
        try {
          if (raw.includes(":")) {
            const time = formatTimeOnly(raw, { formatType, customPattern, detailLevel, joinColumns: true });
            if (!time) throw new Error("Error: Column(s) contains invalid date values");
            timeParts.push(time);
          } else {
            const date = formatDateOnly(raw, { formatType, customPattern, detailLevel, locales, joinColumns: true });
            if (!date) throw new Error("Error: Column(s) contains invalid date values");
            dateParts.push(date);
          }
        } catch {
          throw new Error("Error: Column(s) contains invalid date values");
        }
      });
      let joinedValue = "";
      if (dateParts.length && timeParts.length) {
        const sep = formatType === "iso" ? "T" : " ";
        joinedValue = dateParts[0] + sep + timeParts[0];
      } else {
        joinedValue = [...dateParts, ...timeParts].join(separator);
      }
      response.columns[newColumnName].cells[id] = { label: joinedValue, metadata: [] };
    });
  } else {
    const columnToProcess = Object.keys(items)[0];
    const columnData = items[columnToProcess];
    const newColumnName = outputMode === "edit" ? columnToProcess : `formatted_${columnToProcess}`;

    response.columns[newColumnName] = {
      label: outputMode === "edit" ? columnToProcess : `${newColumnName}`,
      kind: "literal",
      metadata: [],
      cells: {},
    };

    Object.keys(columnData).forEach(id => {
      const value = columnData[id];
      const result = toFormatted(value, columnType);
      response.columns[newColumnName].cells[id] = {
        label: result.value,
        metadata: [],
      };
    });
  }

  return response;
};

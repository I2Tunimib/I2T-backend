import { parse, format, isValid } from "date-fns";
import { it, enUS } from "date-fns/locale";

export default async (req, res) => {
  const { items, props } = req.original;
  const { formatType, customPattern, detailLevel, outputMode, columnToJoin, joinColumns, selectedColumns, columnType,
    separator, splitDatetime } = props;
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

  let pattern = "";
  switch(formatType) {
    case "iso": pattern = "yyyy-MM-dd"; break;
    case "european": pattern = "dd/MM/yyyy"; break;
    case "us": pattern = "MM/dd/yyyy"; break;
    case "custom": pattern = customPattern; break;
  }

  const datePatterns = {year: "yyyy", monthNumber: "MM", monthText: "MMMM", day: "dd",
    monthYear: "MM-yyyy", date: pattern};

  const timePatterns = {
    hour: "HH",
    hour12: "hh a",
    minutes: "mm",
    seconds: "ss",
    milliseconds: "SSS",
    hourMinutes: "HH:mm",            // 12:30
    hourMinutes12: "hh:mm a",        // 12:30 PM
    hourSeconds: "HH:mm:ss",             // 12:30:45
    hourSecondsUTC: "HH:mm:ss'Z'",       // 12:30:45Z
    hourSeconds12: "hh:mm:ss a",         // 12:30:45 PM
    hourMilliseconds: "HH:mm:ss.SSS",    // 12:30:45.123
    timezone: "HH:mm:ssXXX",         // 12:30:45+02:00
    timezoneAbbr: "HH:mm:ss z",      // 12:30:45 GMT+2
  };

  const dateLevels = Object.keys(datePatterns);
  const timeLevels = Object.keys(timePatterns);
  const locales = [enUS, it];

  function buildPattern({ formatType, customPattern, detailLevel, columnType, joinColumns, columnToJoin }) {
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
    let patternToUse = pattern;
    const sep = formatType === "iso" ? "'T'" : " ";

    if (columnType === "date") {
      // Apply detailLevel selected refering to date
      if (dateLevels.includes(detailLevel)) {
        patternToUse = datePatterns[detailLevel];
      } else if (timeLevels.includes(detailLevel)) {
        const hasColumnToJoin = columnToJoin && Object.values(columnToJoin)[0]?.[2];
        const timePattern = timePatterns[detailLevel];
        //No join
        if (!joinColumns || !columnToJoin) {
          //Append date formatted to time (detailLevel)
          patternToUse = `${patternToUse}${sep}${timePattern}`;
        }
        //More than one column selected and checkbox join selected
        if (joinColumns && selectedColumns.length > 1) {
          //Append date formatted to time (detailLevel), and then append other values columns
          patternToUse;
        }
        //Just one single column selected and column selected in the columnToJoin field
        if (hasColumnToJoin && selectedColumns.length === 1) {
          //Append date formatted to time (detailLevel)
          patternToUse = `${patternToUse}${sep}${timePattern}`;
        }
      }
    } else if (columnType === "time" && timeLevels.includes(detailLevel)) {
      // Apply detailLevel selected refering to time (no information about date)
      patternToUse = timePatterns[detailLevel];
    } else if (columnType === "datetime") {
      if (timeLevels.includes(detailLevel)) {
        // Apply detailLevel selected refering to time
        const timePattern = timePatterns[detailLevel];
        patternToUse = `${patternToUse}${sep}${timePattern}`;
      }
    }

    return patternToUse;
  }

  function formatDateOnly(strValue, { formatType, customPattern, detailLevel, locales, joinColumns, columnToJoin }) {
    for (const fmt of dateFormats) {
      for (const locale of locales) {
        const parsed = parse(strValue, fmt, new Date(), {locale});
        if (isValid(parsed)) {
          const pattern = buildPattern({formatType, customPattern, detailLevel, columnType: "date", joinColumns, columnToJoin });
          return format(parsed, pattern);
        }
      }
    }
    return null;
  }

  function formatTimeOnly(strValue, { formatType, customPattern, detailLevel, joinColumns, columnToJoin }) {
    for (const fmt of timeFormats) {
      const parsed = parse(strValue, fmt, new Date());
      if (isValid(parsed)) {
        const pattern = buildPattern({ formatType, customPattern, detailLevel, columnType: "time", joinColumns, columnToJoin });
        return format(parsed, pattern);
      }
    }
    return null;
  }

  function formatDateTime(strValue, { formatType, customPattern, detailLevel, locales, joinColumns, columnToJoin }) {
    for (const fmt of dateTimeFormats) {
      for (const locale of locales) {
        const parsed = parse(strValue, fmt, new Date(), {locale});
        if (isValid(parsed)) {
          const pattern = buildPattern({formatType, customPattern, detailLevel, columnType: "datetime", joinColumns, columnToJoin });
          return format(parsed, pattern);
        }
      }
    }
    return null;
  }

  function toFormatted(value, columnType) {
    if (!value) return { value: null };
    const strValue = String(value).trim().replace("T", " ").split(",")[0];
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
  let joinColName = "";
  if ((joinColumns && selectedColumns && selectedColumns.length > 1) || columnToJoin) {
    let allColumnsToJoin = [];
    if (joinColumns && selectedColumns && selectedColumns.length > 1) {
      allColumnsToJoin = selectedColumns;
    } else if (columnToJoin) {
      joinColName = Object.values(columnToJoin)[0]?.[2];
      allColumnsToJoin = [...selectedColumns, joinColName];
    }

    const columnsData = allColumnsToJoin.map((col) => {
      if (items[col]) return items[col];
      if (columnToJoin && typeof columnToJoin === "object" && Object.values(columnToJoin)[0]?.[2] === col) {
        return columnToJoin;
      }
      return undefined;
    });
    const newColumnName = `${allColumnsToJoin.join("_")}`;
    response.columns[newColumnName] = {
      label: `${newColumnName}`,
      kind: "literal",
      metadata: [],
      cells: {},
    };
    const rowIds = Object.keys(columnsData[0]);
    const locales = [enUS, it];

    rowIds.forEach((id) => {
      const dateParts = [];
      const timeParts = [];
      allColumnsToJoin.forEach((col, index) => {
        const raw = columnsData[index][id]?.[0];
        if (!raw) return;
        try {
          if (raw.includes(":")) {
            //Time column
            const time = formatTimeOnly(raw, { formatType, customPattern, detailLevel, joinColumns: true, columnToJoin });
            timeParts.push(time);
          } else {
            //Date column
            const date = formatDateOnly(raw, { formatType, customPattern, detailLevel, locales, joinColumns: true, columnToJoin});
            dateParts.push(date);
          }
        } catch {
          throw new Error("Error: Column(s) contains invalid date values");
        }
      });
      let joinedValue = "";
      const sep = separator || (formatType === "iso" ? "T" : " ");
      if (dateParts.length && timeParts.length) {
        //Date part splitted T and append time part
        const [dateOnly] = dateParts[0].split("T");
        joinedValue = `${dateOnly}${sep}${timeParts[0]}`;
      } else if (dateParts.length) {
        //Date only, maintain T00:00 if present
        joinedValue = [...dateParts].join(separator);
      } else if (timeParts.length) {
        //Time only
        joinedValue = [...timeParts].join(separator);
      }
      response.columns[newColumnName].cells[id] = { label: joinedValue, metadata: [] };
    });
  } else if (splitDatetime && columnType === "datetime" && selectedColumns.length === 1) {
    const colName = selectedColumns[0];
    const dateColName = "date";
    const timeColName = "time";

    response.columns[dateColName] = {
      label: dateColName,
      kind: "literal",
      metadata: [],
      cells: {}
    };
    response.columns[timeColName] = {
      label: timeColName,
      kind: "literal",
      metadata: [],
      cells: {}
    };

    Object.entries(items[colName]).forEach(([rowId, valueArr]) => {
      const raw = valueArr[0];
      if (!raw) return;
      const [datePart, timePart] = raw.split(/T| /);
      const formattedDate = formatDateOnly(datePart, { formatType, customPattern, detailLevel: "dateOnly", locales });
      let formattedTime = null;
      if (timePart) {
        for (const fmt of timeFormats) {
          const parsed = parse(timePart, fmt, new Date());
          if (isValid(parsed)) {
            const pattern = buildPattern({ formatType, customPattern, detailLevel, columnType: "time" });
            formattedTime =  format(parsed, pattern);
          }
        }
      }

      response.columns[dateColName].cells[rowId] = {
        label: formattedDate,
        metadata: []
      };
      response.columns[timeColName].cells[rowId] = {
        label: formattedTime,
        metadata: []
      };
    });
  } else {
    const columnToProcess = selectedColumns[0];
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

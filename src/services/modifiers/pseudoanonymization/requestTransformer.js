import config from "./index.js";
import axios from "axios";

const { endpoint } = config.private;

async function makeEncryptionRequest(valueToEncrypt) {
  try {
    const res = await axios({
      method: "post",
      url: `${endpoint}/transit/encrypt`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        fieldToEncrypt: valueToEncrypt,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error encrypting value:", valueToEncrypt, error);
    return {
      fieldToEncrypt: valueToEncrypt,
      vaultKey: null,
      error: error.message,
    };
  }
}

async function makeDecryptionRequest(valueToDecrypt) {
  try {
    const res = await axios({
      method: "post",
      url: `${endpoint}/transit/decrypt`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        fieldToDecrypt: valueToDecrypt,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error decrypting value:", valueToDecrypt, error);
    return {
      fieldToDecrypt: valueToDecrypt,
      decryptedData: null,
      error: error.message,
    };
  }
}

export default async (req) => {
  const { items, props } = req.original;
  const operation =
    props.decrypt && props.decrypt.length > 0 ? "decrypt" : "encrypt";
  const columnToProcess = props.selectedColumns[0];
  // Get the first column (the one to be processed)
  const columnData = items[columnToProcess];
  console.log(
    "**number of rows to anonymize***",
    Object.keys(columnData).length,
  );
  // Make requests for all rows based on operation
  const processingPromises = Object.keys(columnData).map(async (rowId) => {
    const originalValue = columnData[rowId][0] || columnData[rowId];
    let result;

    if (operation === "encrypt") {
      result = await makeEncryptionRequest(originalValue);
      return {
        rowId: rowId,
        originalValue: originalValue,
        processedData: result,
        operation: "encrypt",
      };
    } else if (operation === "decrypt") {
      result = await makeDecryptionRequest(originalValue);
      return {
        rowId: rowId,
        originalValue: originalValue,
        processedData: result,
        operation: "decrypt",
      };
    } else {
      return {
        rowId: rowId,
        originalValue: originalValue,
        processedData: { error: "Invalid operation" },
        operation: operation,
      };
    }
  });

  const results = await Promise.all(processingPromises);

  return {
    columnName: columnToProcess,
    operation: operation,
    results: results,
  };
};

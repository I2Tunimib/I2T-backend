import FileSystemService from '../datasets/datasets.service';
import ExportService from '../export/export.service';
import ParseW3C from '../parse/parse-w3c.service';
import {nanoid} from 'nanoid';
import {writeFile, readFile} from 'fs/promises';
import {createReadStream} from 'fs';
import {concatLimit, queue} from 'async';
import FormData from 'form-data';
import axios from 'axios';
import path from 'path';
import {KG_INFO} from '../../../utils/constants'
import config from '../../../config/index';
import {log} from '../../../utils/log';
import {table} from 'console';

const __dirname = path.resolve();
const TAGS = {
    LIT: 'literal',
    SUBJ: 'entity',
    NE: 'entity'
}

function getCurrentTime() {
    // Create a new Date object
    const currentDate = new Date();

    // Get the current time components
    let currentHours = currentDate.getHours();
    let currentMinutes = currentDate.getMinutes();
    let currentSeconds = currentDate.getSeconds();
    let currentMilliseconds = currentDate.getMilliseconds();

    // Format the time components with leading zeros if necessary
    currentHours = currentHours < 10 ? "0" + currentHours : currentHours;
    currentMinutes = currentMinutes < 10 ? "0" + currentMinutes : currentMinutes;
    currentSeconds = currentSeconds < 10 ? "0" + currentSeconds : currentSeconds;
    currentMilliseconds = currentMilliseconds < 10 ? "00" + currentMilliseconds : currentMilliseconds < 100 ? "0" + currentMilliseconds : currentMilliseconds;

    // Return the current time in the format "hh:mm:ss:ms"
    return `${currentHours}:${currentMinutes}:${currentSeconds}:${currentMilliseconds}`;
}

const getAnnotationRequest = (idDataset, idTable, {rows, columns, table}) => {
    const rowsData = Object.values(rows).flatMap((row, rowIndex) => {
        return {
            idRow: rowIndex,
            data: Object.values(row.cells).map((cell) => cell.label)
        }
    })
    return [{
        datasetName: idDataset,
        tableName: idTable,
        header: Object.keys(columns),
        rows: rowsData,
        kgReference: 'wikidata'
    }]
}
const transformMetadata = (table, metadata) => {
    const columnKeys = Object.keys(table.columns);
    const {column} = metadata;
    column.forEach((item, index) => {
        const {idColumn, tag} = item;
        table.columns[columnKeys[idColumn]] = {
            ...table.columns[columnKeys[idColumn]],
            ...(tag === 'SUBJ' && {role: 'subject'}),
            kind: TAGS[tag]
        }
    });
    return table;
}
const transformCTA = (table, cta) => {
    const columnKeys = Object.keys(table.columns);
    cta.forEach((item, index) => {
        const types = item.types.map((type) => ({
            id: `wd:${type}`,
            match: index === 0,
            name: `wd:${type}`,
            score: 1
        }))
        table.columns[columnKeys[item.idColumn]].metadata = [{
            type: types,
            property: []
        }]
    });
    return table;
}
const getCEAMetadata = (entities) => {
    let lowestScore = 0;
    let highestScore = 0;
    let match = null;
    if (entities.length > 0) {
        match = entities[0]["match"] ? {
            value: true,
            reason: 'reconciliator'
        } : {
            value: false,
            reason: 'reconciliator'
        };
    } else {
        match = {value: false};
    }
    const meta = entities.map((entity, index) => {
        const {id: entityId, score, type, name, match, ...rest} = entity;
        const id = `wd:${entityId}`;
        if (index === 0) {
            lowestScore = score;
            highestScore = score;
        } else {
            lowestScore = score < lowestScore ? score : lowestScore;
            highestScore = score > highestScore ? score : highestScore;
        }
        return {
            id,
            type: type.map((item) => {
                return {
                    ...item,
                    id: `wd:${item.id}`
                }
            }),
            score,
            ...rest,
            match: match,
            name: {
                value: name,
                uri: `${KG_INFO.wd.uri}${entityId}`
            }
        }
    })
    return {
        metadata: meta,
        highestScore,
        lowestScore,
        match
    }
}
const transformCPA = (table, cpa) => {
    const columnKeys = Object.keys(table.columns);
    cpa.forEach((item, index) => {
        const {idSourceColumn, idTargetColumn, predicate} = item;
        const propertyItem = {
            id: `wd:${predicate}`,
            obj: columnKeys[idTargetColumn],
            name: `wd:${predicate}`,
            match: true,
            score: 1
        }
        table.columns[columnKeys[idSourceColumn]].metadata[0] = {
            ...table.columns[columnKeys[idSourceColumn]].metadata[0],
            property: [
                ...table.columns[columnKeys[idSourceColumn]].metadata[0].property,
                propertyItem
            ]
        }
    });
    return table;
}
const transformCEA = (table, cea) => {
    const columnKeys = Object.keys(table.columns);
    columnKeys.forEach((colId) => {
        table.columns[colId] = {
            ...table.columns[colId],
            context: {
                wd: {
                    prefix: 'wd:',
                    uri: 'https://www.wikidata.org/entity/',
                    total: table.columns[colId].kind === 'entity' ? Object.keys(table.rows).length : 0,
                    reconciliated: 0
                }
            }
        }
    });
    let minMetaScore = 0;
    let maxMetaScore = 0;
    cea.forEach((item) => {
        const {idRow, idColumn, entity} = item;
        const {metadata, highestScore, lowestScore, match} = getCEAMetadata(entity);
        if (match.value) {
            table.columns[columnKeys[idColumn]].context.wd.reconciliated += 1;
        }
        minMetaScore = lowestScore < minMetaScore ? lowestScore : minMetaScore;
        maxMetaScore = highestScore > maxMetaScore ? highestScore : maxMetaScore;
        table.rows[`r${idRow}`].cells[columnKeys[idColumn]] = {
            ...table.rows[`r${idRow}`].cells[columnKeys[idColumn]],
            metadata,
            annotationMeta: {
                ...(table.columns[columnKeys[idColumn]].kind === 'entity' && {
                    annotated: true
                }),
                match,
                lowestScore,
                highestScore
            }
        }
    });
    const nCellsReconciliated = Object.values(table.columns).reduce((accTotal, col) => {
        const totalContext = Object.values(col.context).reduce((acc, ctx) => acc + ctx.reconciliated, 0);
        return accTotal + totalContext;
    }, 0);
    return {
        ...table,
        table: {
            ...table.table,
            nCellsReconciliated,
            mantisStatus: 'DONE',
            minMetaScore,
            maxMetaScore
        }
    }
}
const {
    MANTIS,
    MANTIS_AUTH_TOKEN,
    mantisObjs: {
        cronsMap
    },
    helpers: {
        getDatasetDbPath,
        getTablesDbPath,
        getDatasetFilesPath
    }
} = config;
// create queue so that writes to file are not lost or are conflicting
const writeQueue = queue(async (task, completed) => {
    await task();
}, 1);
const handleAnnotationCompletion = async ({idDataset, idTable}) => {
    // get table data
    const table = await FileSystemService.findTable(idDataset, idTable);
    // get mantis table data
    const mantisTable = await MantisService.getTable(idDataset, idTable);
    let data;
    // save table
    await writeQueue.push(async () => {
        try {
            const {metadata} = mantisTable;
            const {cea, cta, cpa} = mantisTable.semanticAnnotations;
            let tableData = table;
            tableData = transformMetadata(tableData, metadata);
            tableData = transformCTA(tableData, cta);
            tableData = transformCPA(tableData, cpa);
            tableData = transformCEA(tableData, cea);
            const {
                table: tableInfo,
                columns,
                rows
            } = tableData;
            ParseW3C.updateColumnsStatus(columns, rows);
            // update db entry
            const {meta, tables} = JSON.parse(await readFile(getTablesDbPath()))
            tables[idTable] = {
                ...tableInfo,
                lastModifiedDate: new Date().toISOString()
            }
            await writeFile(getTablesDbPath(), JSON.stringify({meta, tables}, null, 2));
            // update table data
            await writeFile(`${getDatasetFilesPath()}/${idDataset}/${idTable}.json`, JSON.stringify({columns, rows}));
            data = {
                table: tables[idTable],
                columns,
                rows
            }
        } catch (err) {
            console.log(err);
        }
    })
    return data;
}
const clearCron = (cronId) => {
    const cron = cronsMap[cronId];
    clearInterval(cron);
    delete cronsMap[cronId];
    log('mantis', `Finished tracking for ${cronId} - current time: ${getCurrentTime()}`)
}
const startCron = ({idDataset, idTable, io}) => {
    log('mantis', `Started tracking for ${idDataset}_${idTable} - current time: ${getCurrentTime()}`)
    // check every 30 seconds
    const intervalId = setInterval(async () => {
        const result = await MantisService.getTable(idDataset, idTable);
        // if annotation is done add to queue to stop the cronjob
        if (result && result.status === 'DONE') {
            // remove cron
            clearCron(`${idDataset}_${idTable}`);
            // process and save annotated table
            const annotatedTable = await handleAnnotationCompletion({
                idDataset,
                idTable
            });
            // emit to client annotated table
            io.emit('done', annotatedTable);
        }
    }, 30000);
    cronsMap[`${idDataset}_${idTable}`] = intervalId;
}
const MantisService = {
    getTable: async (idDataset, idTable) => {
        // const result = await axios.get(`${MANTIS}/dataset/${idDataset}/table/${idTable}?stringId=true&token=${MANTIS_AUTH_TOKEN}`)
        const result = await axios.get(`${MANTIS}/dataset/${idDataset}/table/${idTable}?page=1&per_page=90&token=${MANTIS_AUTH_TOKEN}`)
        return result.data.data;
    },
    checkPendingTable: async (io) => {
        // if there are table pending the server stopped while Mantis
        // annotation processes were undergoing
        const pendingTables = await FileSystemService.findTables((table) => table.mantisStatus === 'PENDING');
        log('mantis', `There are ${pendingTables.length} pending tables`)
        for (const table of pendingTables) {
            const {id: idTable, idDataset} = table;
            // const { mantisId: mantisDatasetId } = await FileSystemService.findOneDataset(localDatasetId);
            const result = await MantisService.getTable(idDataset, idTable);
            if (result) {
                if (result.status === 'DONE') {
                    const annotatedTable = await handleAnnotationCompletion({
                        idDataset,
                        idTable
                    });
                    // emit to client annotated table
                    io.emit('done', annotatedTable);
                } else {
                    startCron({idDataset, idTable, io});
                }
            }
        }
    },
    annotate: async (idDataset, idTable, data) => {
        const req = getAnnotationRequest(idDataset, idTable, data);

        const result = await axios.post(`${MANTIS}/dataset/createWithArray?token=${MANTIS_AUTH_TOKEN}`, req)
        return result.data;
    },
    trackAnnotationStatus: async ({
                                      idDataset,
                                      idTable,
                                      ...rest
                                  }) => {
        // start cron to check annotation status every 30 seconds
        startCron({idDataset, idTable, ...rest});
        // update status to pending
        const {meta, tables} = JSON.parse(await readFile(getTablesDbPath()))
        tables[idTable] = {
            ...tables[idTable],
            mantisStatus: 'PENDING'
        }
        await writeFile(getTablesDbPath(), JSON.stringify({meta, tables}, null, 2));
    },
}
export default MantisService;
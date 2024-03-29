function getElementCodeFromUrl(url) {
    const url_split = url.split('/');
    if (url_split[2] === 'www.wikidata.org') {
        return url_split[url_split.length - 1];
    }
    return undefined
}

function getCellMetadata(entityid, entityName) {
    let metadata = [];
    if (entityid === undefined || entityName === undefined) {
        return [];
    }
    entityid = getElementCodeFromUrl(entityid)
    if (entityid === undefined) return [];
    metadata = [{
        id: "wd:" + entityid,
        name: entityName,
        score: 100,
        match: true
    }];
    return metadata;
}

//PREPARO UN DIZIONARIO PER TROVARE I VALORI DI UNA RISPOSTA
function getResponseDict(res, items, colIndex, property) {
    const responseDict = []
    Object.keys(items[colIndex]).forEach((id) => {
        let [prefix, id_code] = id.split(':');

        [property].forEach((prop) => {
            let propertyLabel = "";
            const value = [];
            const valueLabel = [];
            res.forEach((resRow) => {
                if (id_code === getElementCodeFromUrl(resRow.values.value)
                    && prop === getElementCodeFromUrl(resRow[prop].value)) {
                    propertyLabel = resRow[prop + "Label"].value;
                    if (resRow["values" + prop] !== undefined) {
                        value.push(resRow["values" + prop].value);
                        valueLabel.push(resRow["values" + prop + "Label"].value);
                    }
                }
            });
            responseDict.push({
                'id': id_code,
                'property': prop,
                'property_label': propertyLabel,
                'value': value,
                'value_label': valueLabel
            });
        });
    });

    return responseDict;
}

function getTypes(res, property) {
    const typeDict = [];
    let id_seen = [];
    res = res[0];
    res.forEach((message) => {
        let instance = message["instance" + property]
        let instanceLabel = message["instance" + property + "Label"]
        if (instance != undefined && id_seen.includes(instance.value) == false) {
            id_seen.push(instance.value);
            typeDict.push({
                "id": "wd:" + getElementCodeFromUrl(instance.value),
                "obj": instanceLabel.value,
                "match": true,
                "name": instanceLabel.value,
                "score": 100
            });
        }
    });
    if(typeDict === []){
        
    }


    return typeDict
}



export default async (req, res) => {
    const { items, props } = req.processed;
    const inputColumns = Object.keys(items);

    let response = {
        columns: {},
        meta: {}
    };

    res.forEach((serviceResponse, colIndex) => {
        const prop = serviceResponse.pop().prop;
        const responseDict = getResponseDict(serviceResponse, items, inputColumns[colIndex], prop);

        [prop].forEach((property) => {

            const propertyLabel = (responseDict.find(item => {
                return item.property === property;
            }).property_label);


            const colProperty = [{ 
                id: 'wd:P144',
                obj: inputColumns[colIndex],
                match: true,
                name: 'based on',
                score: 100
              }];

            const colId = propertyLabel;

            response.columns[colId] = {
                label: colId+"_"+inputColumns[colIndex],
                metadata: [],
                cells: {},
                kind : "literal",
            }

            response.meta = {
                ...response.meta,
                [colId]: inputColumns[colIndex]
            }

            response.columns[colId].metadata[0] = {
                "id": "wd:" + property,
                "name": propertyLabel+ "_"+inputColumns[colIndex],
                "entity": [],
                "property": colProperty,
                "type": []
            }
            const rows = req.original.items[inputColumns[colIndex]];

            Object.keys(rows).forEach((id) => {
                let entityid = rows[id].split(':')[1];
                let row_label = "";
                let metadata_row = [];

                const entityData = (responseDict.find(item => {
                    return item.id === entityid && item.property === property;
                }));


                if (entityData.value[0] !== undefined) {
                    row_label = entityData.value_label[0];
                    metadata_row = getCellMetadata(entityData.value[0], entityData.value_label[0]);
                }
                response.columns[colId].cells[id] = {
                    label: row_label,
                    metadata: metadata_row
                }
            });
        });
    });
    return response;

}
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

function getResponseDict(res, items, colIndex, property) {
    const responseDict = []
    Object.keys(items[colIndex]).forEach((id) => {
        let [prefix, id_code] = id.split(':');

        property.forEach((prop) => {
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

export default async (req, res) => {
    const { items, props } = req.processed;
    //let  prop  = props.property;



    const inputColumns = Object.keys(items);

    let response = {
        columns: {},
        meta: {}
    };

    res.forEach((serviceResponse, colIndex) => {
        const prop = serviceResponse.pop().prop;
        const responseDict = getResponseDict(serviceResponse, items, inputColumns[colIndex], prop);

        const colProperty = [{ 
            id: 'wd:P144',
            obj: inputColumns[colIndex],
            match: true,
            name: 'based on',
            score: 100
          }];


        prop.forEach((property) => {

            let colKind = '';
            let colEntity = [];
            let colType = [];
            let colMetadata =[];

            switch (property) {
                case 'P625':
                    colKind = 'literal';
                    colEntity = [{
                        id: 'wd:Q29934236',
                        description: 'Wikidata coordinates datatype',
                        name: 'GlobeCoordinate',
                        match: true, score: 100,
                        type: []
                    }];
                    colType = [{
                        id: 'wd:Q29934236',
                        match: true,
                        name: 'GlobeCoordinate',
                        score: 100
                    }];
                    colMetadata.push({
                        id: 'wd:Q29934236',
                        name: 'Globe Coordinate',
                        entity: colEntity,
                        property: colProperty,
                        type: colType
                      });
                    break;
                case 'P421':
                    colKind = 'entity';
                    colEntity = [{
                        id: 'wd:Q12143',
                        description: 'Wikidata coordinates datatype',
                        name: 'time zone',
                        match: true, score: 100,
                        type: []
                    }];
                    colType = [{
                        id: 'wd:Q17272482',
                        match: true,
                        name: 'time zone named for a UTC offset',
                        score: 100
                    }];
                    colMetadata.push({
                        id: 'wd:Q12143',
                        name: 'Time Zone',
                        entity: colEntity,
                        property: colProperty,
                        type: colType
                      });
                    break;
                case 'P281':
                    colKind = 'literal';
                    colEntity = [{
                        id: 'wd:Q37447',
                        description: 'series of letters and digits for sorting mail',
                        name: 'postal code',
                        match: true, score: 100,
                        type: []
                    }];
                    colType = [{
                        id: 'wd:Q36205316',
                        match: true,
                        name: 'administrative territorial entity identifier',
                        score: 100
                    }];
                    colMetadata.push({
                        id: 'wd:Q37447',
                        name: 'postal code',
                        entity: colEntity,
                        property: colProperty,
                        type: colType
                      });
                    break;
            }


            const propertyLabel = (responseDict.find(item => {
                return item.property === property;
            }).property_label);

            const colId = inputColumns[colIndex] + "_" + propertyLabel;


            // create columns
            response.columns[colId] = {
                label: colId,
                kind : colKind, 
                metadata: colMetadata,
                cells: {}
            }

            response.meta = {
                ...response.meta,
                [colId]: inputColumns[colIndex]
            }

            //recupero tutti i rows id per poi riempire le celle
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
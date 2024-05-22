import config from './index.js';
import fs from "fs";

function extractIdRow(inputString) {
    const dollarIndex = inputString.indexOf('$');
    if (dollarIndex !== -1) {
        const idRow = inputString.substring(1, dollarIndex);
        return Number(idRow);
    } else {
        return -1;
    }
}

export default async (req, res) => {
    // fs.writeFile('../../fileSemTUI/response-Alligator.json', JSON.stringify(res), function (err) {
    //     if (err) throw err;
    //     console.log('File ../../fileSemTUI/response-Alligator.json saved!');
    // });
    const { items } = req.original;
    const prefix = config.public.prefix;
    const { cea, cta, cpa } = res.semanticAnnotations;
    // console.log(`*** response alligator *** items: ${JSON.stringify(items)}`);
    // console.log(`*** response alligator *** cea: ${JSON.stringify(cea)}`);
    const response = [];

    // NOTE: the header properties are not addressed by the frontend, types are computed by the frontend
    const header = {
        id: items.find(item => !item.id.includes('$')).id,
        metadata: [
            {
                id: `${prefix}:Q35120`,
                description: "anything that can be considered, discussed, or observed",
                match: false,
                name: "entity",
                score: 0,
                property: [
                    {
                        id: `${prefix}:P131`,
                        name: "located in the administrative territorial entity",
                        obj: "State",
                        match: true,
                        score: 100
                    }
                ]
            }
        ]
    }
    console.log(`*** response alligator *** header: ${JSON.stringify(header)}`)
    response.push(header);

    for (let mention of items) {
        let idRow = extractIdRow(mention.id);
        // console.log(`*** response alligator *** idRow: ${JSON.stringify(idRow)}`);
        if (idRow !== -1) {
            const foundObj = cea.find((obj) => obj.idRow === (idRow+1) && obj.idColumn === 0);
            // console.log(`*** response alligator *** foundObj: ${JSON.stringify(foundObj)}`);
            if (foundObj !== undefined) {
                const metadata = foundObj.entity;
                const semTUIMetadata = metadata.map(({ delta, ...rest }) => ({
                    ...rest,
                    // type: [], // Add the "type" field with an empty array
                    id: `${prefix}:${rest.id}` // Add 'wd:' in front of the id
                }));
                const cellAnnotation = {
                    id: mention.id,
                    metadata: semTUIMetadata
                };
                // console.log(`*** response alligator *** foundObj.entity: ${JSON.stringify(foundObj.entity)}`);
                response.push(cellAnnotation);
            }
        }
    }
    // fs.writeFile('../../fileSemTUI/responseREC-SemTUI-Alligator.json', JSON.stringify(response), function (err) {
    //     if (err) throw err;
    //     console.log('File ../../fileSemTUI/responseREC-SemTUI-Alligator.json saved!');
    // });

    return response;
}
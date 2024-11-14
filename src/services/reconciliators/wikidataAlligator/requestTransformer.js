import config from './index.js';
import axios from 'axios';
import fs from "fs";

const { endpoint } = config.private; // https://alligator.hel.sintef.cloud
const { access_token } = config.private;
const { relativeUrl } = config.public; // /dataset

export default async (req) => {
    // fs.writeFile('../../fileSemTUI/requestREC-UI-Alligator.json', JSON.stringify(req), function (err) {
    //     if (err) throw err;
    //     console.log('File ../../fileSemTUI/requestREC-UI-Alligator.json saved!');
    // });
    const timestamp = new Date().getTime(); // Get the current timestamp
    const randomId = Math.floor(Math.random() * 1000); // Generate a random number
    const tableName = "SN-BC-" + timestamp + randomId;
    const bodyAlligatorRequestTemplate = [
        {
            "datasetName": "EMD-BC",
            "tableName": tableName,
            "header": [],
            "rows": [],
            "semanticAnnotations": {
                "cea": [],
                "cta": [],
                "cpa": []
            },
            "metadata": {},
            "kgReference": "wikidata"
        }
    ];

    // create the header for the request to alligator
    const header = req.original.items // the column1 to reconcile
        .filter(item => !item.id.includes('$')) // Filter items without "$" in id
        .map(item => item.label); // Extract labels
    for (const key of ["column2", "column3", "column4"]) {
        const part = req.original.props[key];
        // console.log(`*** request alligator *** key: ${JSON.stringify(key)}
        //  *** part: ${JSON.stringify(part)}
        //  *** part && part.hasOwnProperty("r0"): ${part && part.hasOwnProperty("r0")}`);
        if (part && part.hasOwnProperty("r0")) {
            header.push(part.r0[2]);
        }
    }
//    console.log(`*** request alligator *** header from items and props: ${JSON.stringify(header)}`);
    bodyAlligatorRequestTemplate[0].header = header;

    //create the rows for the request to alligator
    const rows = req.original.items // rows from column 1
        .filter(item => item.id.includes('$')) // Filter items with "$" in id
        .map(item => {
            const idMatch = item.id.match(/r(\d+)\$/);
            return {
                idRow: idMatch ? Number(idMatch[1])+1 : null, // Extract the number between "r" and "$"
                data: [item.label] // Create an array with the label
            };
        });
    for (const key of rows) {
        for (const column in req.original.props) {
            key.data.push(req.original.props[column]['r'+(key.idRow-1)][0]);
        }
    }
//    console.log(`*** request alligator *** rows from items and props: ${JSON.stringify(rows)}`);
    bodyAlligatorRequestTemplate[0].rows = rows;

    // console.log(`*** request alligator *** bodyAlligatorRequestTemplate: ${JSON.stringify(bodyAlligatorRequestTemplate)}`);
    // https://alligator.hel.sintef.cloud/dataset/createWithArray
    const postUrl = endpoint + relativeUrl + "/createWithArray";
    // https://alligator.hel.sintef.cloud/dataset/createWithArray?token=alligator_demo_2023
    console.log(`*** request alligator *** postUrl to alligator: ${postUrl}?token=${access_token} *** tableName: ${tableName}`);
    // fs.writeFile('../../fileSemTUI/bodyAlligatorRequest.json',
    //     JSON.stringify(bodyAlligatorRequestTemplate), function (err) {
    //     if (err) throw err;
    //     console.log('File ../../fileSemTUI/bodyAlligatorRequest.json saved!');
    // });

    const res = await axios.post(postUrl + "?token=" + access_token, bodyAlligatorRequestTemplate);
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    if (res.status !== 202) {
        console.log (`*** request alligator ### ERROR status code returned by alligator is: ${res.status} `);
    } else {
        console.log (`*** request alligator ### OK status code returned by alligator is: ${res.status} `);
        const getUrl = endpoint + relativeUrl + "/EMD-BC/table/" + tableName;
	const itemsPerPage = req.original.items.length;
        console.log(`*** request alligator *** getUrl to alligator: ${getUrl}?page=1&per_page=${itemsPerPage}&token=${access_token}`);
        let annotation;
        let status = "DOING";
        while ( status !== "DONE") {
            await delay(3000);
            annotation = await axios.get(`${getUrl}?page=1&per_page=${itemsPerPage}&token=${access_token}`);
            status = annotation.data.data.status;
            // console.log(`*** get Alligator: status ${annotation.data.data.status}`);
        }
	// console.log(`*** get Alligator: done`);
        return annotation.data.data;
    }
}

import config from './index.js';
import axios from 'axios';
import fs from "fs";

const { endpoint } = config.private;
const { token } = config.private;
const { relativeUrl } = config.public;

export default async (req) => {
    // fs.writeFile('/../../fileSemTUI/requestEXT-UI-labels.json', JSON.stringify(req), function (err) {
    //     if (err) throw err;
    //     console.log('File ../../fileSemTUI/requestEXT-UI-labels.json saved!');
    // });
    const { items, props } = req.processed;
    const idArray = Object.keys(items.buyer).map(key => key.replace("wd:", ""));
    // console.log(`*** labels *** keyArray: ${idArray}`);

    const bodyReqLabels = { "json": idArray };

    // https://lamapi.hel.sintef.cloud/entity/labels?token=SINTEF2023!&kg=wikidata&lang=en
    const postUrl = endpoint + relativeUrl + "?token=" + token + "&kg=wikidata&lang=en";
    // console.log(`*** request labels *** postUrl to LamAPI: ${postUrl}`);
    // console.log(`*** request labels *** bodyReqLabels: ${JSON.stringify(bodyReqLabels)}`);
    const res = await axios.post(postUrl, bodyReqLabels);
    if (res.status !== 200) {
        console.log (`*** request labels ### ERROR status code returned by LamAPI is: ${res.status} `);
        return {};
    } else {
        console.log (`*** request labels ### status code returned by LamAPI is: ${res.status} `);
        // fs.writeFile('../../fileSemTUI/responseEXT-LamAPI-labels.json',
        //     JSON.stringify(res.data), function (err) {
        //     if (err) throw err;
        //     console.log('File ../../fileSemTUI/responseEXT-LamAPI-labels.json saved!');
        // });
        return res.data;
    }
}

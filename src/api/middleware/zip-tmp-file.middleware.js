import isEligibleRequest from "express-fileupload/lib/isEligibleRequest";
import FileSystemService from "../services/datasets/datasets.service";
import { rm } from 'fs/promises';

const VALID_TYPES = ['application/x-zip-compressed'];

const isZipFile = (mimetype) => VALID_TYPES.includes(mimetype);

export default async (req, res, next) => {
  // check if upload request
  if (isEligibleRequest(req)) {
    const { files } = req;  
  
    for (const file of Object.keys(files)) {
      const { mimetype, tempFilePath } = files[file]

      if (!isZipFile(mimetype)) {
        await FileSystemService.zip(tempFilePath, tempFilePath)
        // remove old file
        await rm(tempFilePath);
        // change path to the zipped file
        req.files[file].tempFilePath = `${tempFilePath}.zip`
      }
    }
  }
  
  
  next();
}
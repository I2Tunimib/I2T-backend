import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const safeWriteFileToPath = async (pathAndFileName, data) => {
  // resolve the full path and get just the directory, ignoring the file and extension
  const passedPath = path.dirname(path.resolve(pathAndFileName))
  // make the directory, recursively. Theoretically, if every directory in the path exists, this won't do anything.
  await mkdir(passedPath, { recursive: true })
  // write the file to the newly created directory
  await writeFile(path.resolve(pathAndFileName), data)
}
import { PassThrough } from 'stream';
import ReadableStreamClone from 'readable-stream-clone'

export const cloneStream = (stream, n) => {
  if (n != null) {
    return new Array(new ReadableStreamClone(stream));
  }
  return new ReadableStreamClone(stream);
}
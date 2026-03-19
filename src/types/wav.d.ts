declare module 'wav' {
  import { Writable } from 'stream';

  export class Writer extends Writable {
    constructor(options?: {
      channels?: number;
      sampleRate?: number;
      bitDepth?: number;
    });
  }
  
  const content: any;
  export default content;
}

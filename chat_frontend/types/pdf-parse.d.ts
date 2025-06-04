declare module 'pdf-parse/lib/pdf-parse.js' {
  import { PDFData } from 'pdf-parse'
  import { Buffer } from 'buffer'

  export default function pdfParse(
    dataBuffer: Buffer
  ): Promise<PDFData>
}

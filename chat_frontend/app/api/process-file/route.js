// app/api/process-file/route.js
import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

export const runtime = 'nodejs'  // NECESSARIO per usare Buffer e librerie Node

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    console.log('File ricevuto:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })
    console.log('Buffer length:', buffer.length)

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'File vuoto o corrotto' }, { status: 400 })
    }

    let content = ''

    // .txt / .md
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      content = buffer.toString('utf-8') || '[File di testo vuoto]'
    }

    // .docx
    else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer })
      content = result.value || '[DOCX] - Nessun testo estratto'
    }

    // .pdf
    else if (fileName.endsWith('.pdf')) {
      const result = await pdfParse(buffer)
      content = result.text.trim() || '[PDF] - Nessun testo rilevato'
    }

    // .xlsx / .xls
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      let out = ''

      workbook.eachSheet((sheet) => {
        out += `\n[Foglio: ${sheet.name}]\n`
        sheet.eachRow((row, rowIndex) => {
          const rowData = row.values.slice(1).map(cell => (cell ?? '')).join(' | ')
          out += `Riga ${rowIndex}: ${rowData}\n`
        })
      })

      content = out || '[Excel vuoto]'
    }

    // .csv
    else if (fileName.endsWith('.csv')) {
      const csvText = buffer.toString('utf-8')
      const lines = csvText.split('\n').filter(Boolean)
      const separator = [',', ';', '\t'].reduce((best, sep) => {
        return lines[0]?.split(sep).length > best.columns ? { sep, columns: lines[0].split(sep).length } : best
      }, { sep: ',', columns: 0 }).sep

      const rows = lines.map((line, i) => `Riga ${i + 1}: ${line.split(separator).join(' | ')}`)
      content = rows.slice(0, 20).join('\n') + (rows.length > 20 ? `\n...[mostrate 20 di ${rows.length} righe]` : '')
    }

    // .json
    else if (fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(buffer.toString('utf-8'))
        content = JSON.stringify(parsed, null, 2)
      } catch {
        content = '[JSON non valido]'
      }
    }

    // Tipo non supportato
    else {
      content = `[${fileName}] - Tipo non supportato.

File: ${file.name}
Dimensione: ${(file.size / 1024).toFixed(1)} KB

Formati supportati: txt, md, docx, pdf, xlsx, xls, csv, json.`
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      content,
    })

  } catch (err) {
    console.error('Errore nella process-file API:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

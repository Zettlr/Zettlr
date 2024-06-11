// This file can extract the Script part of Vue SFCs.
// NOTE: This is a helper script for the translation extraction script, since
// xgettext is unable to extract script-tags from Vue SFCs on its own.
const fs = require('fs')
const path = require('path')

// Reads in any .vue-file from source and output .vue.ts-files into source/tmp
const INDIR = path.resolve(__dirname, '../source')
const OUTDIR = path.resolve(__dirname, '../source/tmp')

// Helper function for traversing the directory
function walkDir (dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const absPath = path.join(dir, f)
    if (fs.statSync(absPath).isDirectory()) {
      walkDir(absPath, callback)
    } else {
      callback(path.join(dir, f))
    }
  })
}

// Ensure the outdir exists
try {
  fs.statSync(OUTDIR)
} catch (err) {
  fs.mkdirSync(OUTDIR)
}

// Now extract the script tags from every .vue-file and put them into separate
// files that will be read by xgettext.
walkDir(INDIR, absPath => {
  if (absPath.endsWith('.vue') === false) {
    return
  }

  const contents = fs.readFileSync(absPath, 'utf-8')
  const match = /^<script[^\n\r]*>$(.+)^<\/script>$/ms.exec(contents)
  if (match === null) {
    return
  }

  const script = match[1]
  // Retain the relative path so that (except for the /tmp at the beginning) the
  // file paths correspond.
  const relativePath = path.relative(INDIR, absPath) + '.ts'
  const outPath = path.join(OUTDIR, relativePath)
  // Ensure the folder exists
  try {
    fs.statSync(path.dirname(outPath))
  } catch (err) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
  }

  fs.writeFileSync(outPath, script, 'utf-8')
  console.log(`Extracting Vue TS: ${absPath} --> ${outPath}`)
})

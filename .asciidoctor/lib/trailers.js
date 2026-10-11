// Reads the trailer block at the end of a diff.me post as part of the
// document. A post is a git commit whose message is AsciiDoc; the relations it
// carries (who it replies to, what it quotes, a content warning) are plain git
// trailers, "Key: value" lines in the last paragraph. Without this extension a
// renderer shows that paragraph as one run-on line; with it, each trailer is
// an entry of a description list, as the configuration of this repository asks
// (.asciidoctorconfig). Nothing is read from disk or the network.
'use strict'

// A git trailer: a token (letters, digits and hyphens), a colon, a value.
const TRAILER = /^([A-Za-z][A-Za-z0-9-]*): (\S.*)$/

// The keys diff.me defines. Other paragraphs that look like trailers are the
// author's words and are left alone.
const KEYS = new Set([
  'reply-to', 'quotes', 'reposts', 'edits', 'retracts', 'cw', 'co-authored-by',
  'draft-of', 'recommends', 'context', 'withdraws', 'to',
])

// The last paragraph of the document, when every line of it is a trailer of a
// key diff.me defines and something precedes it, as a description list: each
// "Key: value" becomes "Key:: value". Any other document is returned as it came.
function readTrailers (lines) {
  let end = lines.length
  while (end > 0 && lines[end - 1].trim() === '') end--
  let start = end
  while (start > 0 && lines[start - 1].trim() !== '') start--
  const block = lines.slice(start, end)
  const isTrailerBlock = start > 0 && block.length > 0 && block.every((line) => {
    const m = TRAILER.exec(line)
    return m !== null && KEYS.has(m[1].toLowerCase())
  })
  if (isTrailerBlock) {
    for (let i = start; i < end; i++) {
      const m = TRAILER.exec(lines[i])
      lines[i] = m[1] + ':: ' + m[2]
    }
  }
  return lines
}

function register (registry) {
  registry.preprocessor(function () {
    this.process(function (_doc, reader) {
      // Asciidoctor.js 4 reads a document's lines asynchronously, yet a
      // preprocessor must answer at once. The rewrite changes lines and never
      // their number, so it assigns them where they stand: reader.lines is the
      // remaining lines, and an element assigned there is the line read next.
      // Earlier versions (the editors that read .asciidoctorconfig use them)
      // read the lines at once and put them back.
      if (reader.readLines.constructor.name === 'AsyncFunction') {
        readTrailers(reader.lines)
      } else {
        reader.restoreLines(readTrailers(reader.readLines()))
      }
      return reader
    })
  })
}

module.exports.register = register

--[[
A collection of type annotations to ease the development
of Pandoc Lua filters and custom readers/writers
with [Lua Language Server](https://luals.github.io).

Just put the following line in your sources to get help about types by LuaLs:
---@module "pandoc-types-annotations"

You can look for updates of this file at:
https://raw.githubusercontent.com/massifrg/pandoc-luals-annotations/main/src/pandoc-types-annotations.lua
]] --

---@alias Predicate<T> fun(t: T): boolean
---@alias MapFunction<T,U> fun(t: T): U
---@alias Comparator<T> fun(a: T, b: T): boolean

---@class List<T>: {[integer]: T} A Pandoc List.
---@field at fun(self: List<`T`>, index: integer, default?: `T`): `T`
---@field clone fun(self: List<`T`>): List<`T`>
---@field extend fun(self: List<`T`>, list: List<`T`>)
---@field find fun(self: List<`T`>, needle: `T`, init?: integer): `T`|nil,integer|nil
---@field find_if fun(self: List<`T`>, predicate: Predicate<`T`>, init?: integer): `T`|nil,integer|nil
---@field filter fun(self: List<`T`>, predicate: Predicate<`T`>): List<`T`>
---@field includes fun(self: List<`T`>, needle: `T`, init?: integer): boolean
---@field insert fun(self: List<`T`>, pos: integer, value: `T`)
---@field insert fun(self: List<`T`>, value: `T`)
---@field iter fun(self: List<`T`>, step?: integer): IteratorFunction
---@field map fun(self: List<`T`>, f: MapFunction<`T`,`U`>): List<`U`>
---@field new fun(self: List<`T`>, t?: table<`T`>):List<`T`>
---@field remove fun(self: List<`T`>, pos?: integer)
---@field sort fun(self: List<`T`>, comparator: Comparator<`T`>)

---@class EmptyList An empty List.

---@class Attr A Pandoc `Attr` data structure.
---@field identifier string
---@field classes    List<string>
---@field attributes table<string,string>

---@class WithTag
---@field tag string The elements's tag.
---@field t   string The elements's tag.

---@class WithAttr: Attr
---@field attr Attr

---@class Block: WithTag A Pandoc `Block`.
---@field content List The content of the Block.
---@field walk fun(self: Block, filter: Filter)

---@class Inline: WithTag A Pandoc `Inline`.
---@field content List The content of the Inline.
---@field walk fun(self: Inline, filter: Filter)

---@class Blocks: List<Block>
---@field walk fun(self: Blocks, filter: Filter)

---@class Inlines: List<Inlines>
---@field walk fun(self: Inlines, filter: Filter)

---@alias BlockWithAttr Header|Div|Figure|Table|CodeBlock
---@alias InlineWithAttr Span|Code|Link|Image

---@class Plain: Block A Pandoc `Plain`.
---@field content Inlines

---@class Para: Block A Pandoc `Para`.
---@field content Inlines

---@class LineBlock: Block A Pandoc `LineBlock`
---@field content List<Inlines>

---@class CodeBlock: Block,WithAttr A Pandoc `CodeBlock`
---@field text string

---@class RawBlock: Block A Pandoc `RawBlock`
---@field format string
---@field text string

---@class BlockQuote: Block A Pandoc `BlockQuote`
---@field content Blocks

---@alias ListNumberStyle "DefaultStyle"|"Example"|"Decimal"|"LowerRoman"|"UpperRoman"|"LowerAlpha"|"UpperAlpha"
---@alias ListNumberDelim "DefaultDelim"|"Period"|"OneParen"|"TwoParens"

---@class ListAttributes
---@field start integer Number of the first list item.
---@field style ListNumberStyle Style of list numbers.
---@field delimiter ListNumberDelim Delimiter of list numbers.

---@class OrderedList: Block,ListAttributes A Pandoc `OrderedList`
---@field content List<Blocks>
---@field listAttributes ListAttributes|nil
---@field start integer
---@field style string
---@field delimiter string

---@class BulletList: Block A Pandoc `BulletList`
---@field content List<Blocks>

---@class DefinitionListItem
---@field term Inlines
---@field data List<Blocks>

---@class DefinitionList: Block A Pandoc `DefinitionList`
---@field content List<DefinitionListItem>

---@class Header: Block,WithAttr A Pandoc `Header`
---@field level integer
---@field content Inlines

---@class HorizontalRule: Block A Pandoc `HorizontalRule`.

---@class Caption A Pandoc `Table` or `Figure` caption
---@field long Blocks
---@field short Inlines|nil

---@alias Alignment "AlignLeft"|"AlignRight"|"AlignCenter"|"AlignDefault"

---@class Cell: WithAttr A Pandoc `Table` cell
---@field alignment Alignment
---@field contents Blocks
---@field col_span integer
---@field row_span integer

---@class Row: WithAttr A Pandoc `Table` row
---@field cells List<Cell>

---@class TableHead: WithAttr A Pandoc `Table` head
---@field rows List<Row>

---@class TableFoot: WithAttr A Pandoc `Table` foot
---@field rows List<Row>

---@class TableBody: WithAttr A Pandoc `Table` body
---@field body List<Row> table body rows.
---@field head List<Row> intermediate head.
---@field row_head_columns integer number of columns taken up by the row head of each row.

---@alias ColSpec [[alignment: Alignment], [colWidth: number]] A pair of cell alignment and relative width.

---@class Table: Block,WithAttr A Pandoc `Table`
---@field caption Caption
---@field colspecs List<ColSpec>
---@field head TableHead
---@field bodies List<TableBody>
---@field foot TableFoot

---@alias SimpleCell Blocks

---@class SimpleTable: Block,WithAttr A Pandoc `SimpleTable` (tables in pre pandoc 2.10)
---@field caption Caption Table caption.
---@field aligns List<Alignment> Alignments of every column.
---@field widths number[] Column widths.
---@field headers List<SimpleCell> Table header row.
---@field rows List<List<SimpleCell>> Table body.

---@class Figure: Block,WithAttr A Pandoc `Figure`.
---@field content Blocks
---@field caption Caption

---@class Div: Block,WithAttr A Pandoc `Div`.
---@field content Blocks

---@class Str: Inline A Pandoc `Str`.
---@field text string

---@class Emph: Inline A Pandoc `Emph`.
---@field content Inlines

---@class Underline: Inline A Pandoc `Underline`.
---@field content Inlines

---@class Strong: Inline A Pandoc `Strong`.
---@field content Inlines

---@class Strikeout: Inline A Pandoc `Strikeout`.
---@field content Inlines

---@class Superscript: Inline A Pandoc `Superscript`.
---@field content Inlines

---@class Subscript: Inline A Pandoc `Subscript`.
---@field content Inlines

---@class SmallCaps: Inline A Pandoc `SmallCaps`.
---@field content Inlines

---@alias QuoteType "SingleQuote"|"DoubleQuote"

---@class Quoted: Inline A Pandoc `Quoted`.
---@field quotetype QuoteType
---@field content Inlines

---@alias CitationMode "AuthorInText"|"SuppressAuthor"|"NormalCitation"

---@class Citation
---@field id string
---@field mode CitationMode
---@field prefix Inlines
---@field suffix Inlines
---@field note_num integer
---@field hash integer

---@class Cite: Inline A Pandoc `Cite`.
---@field content Inlines
---@field citations List<Citation>

---@class Code: Inline,WithAttr A Pandoc `Code`.
---@field text string

---@class Space: Inline A Pandoc `Space`.

---@class SoftBreak: Inline A Pandoc `SoftBreak`.

---@class LineBreak: Inline A Pandoc `LineBreak`.

---@alias MathType "DisplayMath"|"InlineMath"

---@class Math: Inline A Pandoc `Math`.
---@field mathtype MathType
---@field text string

---@class RawInline: Inline A Pandoc `RawInline`.
---@field format string
---@field text string

---@class Link: Inline,WithAttr A Pandoc `Link`.
---@field content Inlines
---@field target string
---@field title string

---@class Image: Inline,WithAttr A Pandoc `Image`.
---@field caption Inlines
---@field src string
---@field title string

---@class Note: Inline A Pandoc `Note`.
---@field content Blocks

---@class Span: Inline,WithAttr A Pandoc `Span`.
---@field content Inlines

---@alias Meta table<string,MetaValue>

---@class MetaBool
---@field bool boolean

---@class MetaString
---@field str string

---@class MetaInlines
---@field inlines Inlines

---@class MetaBlocks
---@field blocks Blocks

---@class MetaList
---@field meta_values List<MetaValue>

---@class MetaMap
---@field key_value_map table<string,MetaValue>

---@alias MetaValue MetaBool | MetaString | MetaInlines | MetaBlocks | MetaList | MetaMap

---@class Pandoc
---@field blocks Blocks
---@field meta Meta
---@field walk fun(self: Pandoc, filter: Filter)

---@class ChunkedDoc
---@field chunks Chunk[] List of chunks that make up the document.
---@field meta Meta The document’s metadata.
---@field toc table Table of contents information.

---@class Chunk
---@field heading Inline[] Heading text.
---@field id string Identifier.
---@field level integer Level of topmost heading in chunk.
---@field number integer Chunk number.
---@field section_number string Hierarchical section number.
---@field path string Target filepath for this chunk.
---@field up Chunk|nil Link to the enclosing section, if any.
---@field prev Chunk|nil Link to the previous section, if any.
---@field next Chunk|nil Link to the next section, if any.
---@field unlisted boolean Whether the section in this chunk should be listed in the TOC even if the chunk has no section number.
---@field contents Block[] The chunk’s block contents.

---@alias InlineFilterResult nil|Inline|Inlines|EmptyList|List<Inlines>
---@alias BlockFilterResult nil|Block|Blocks|EmptyList|List<Blocks>

---@class Filter
---@field traverse?       "topdown"|"typewise" Traversal order of this filter (default: `typewise`).
---@field Pandoc?         fun(doc: Pandoc, meta?: Meta): Pandoc|nil `nil` = leave untouched.
---@field Blocks?         fun(blocks: Blocks): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Inlines?        fun(inlines: Inlines): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Plain?          fun(plain: Plain): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Para?           fun(para: Para): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field LineBlock?      fun(lineblock: LineBlock): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field RawBlock?       fun(rawblock: RawBlock): BlockFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field CodeBlock?      fun(codeblock: CodeBlock): BlockFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field OrderedList?    fun(orderedlist: OrderedList): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field BulletList?     fun(bulletlist: BulletList): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field DefinitionList? fun(definitionlist: DefinitionList): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Header?         fun(header: Header): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete. `nil` = leave untouched, `EmptyList` = delete.
---@field HorizontalRule? fun(): BlockFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field Table?          fun(table: Table): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Figure?         fun(figure: Figure): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Div?            fun(div: Div): BlockFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Str?            fun(str: Str): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field Emph?           fun(emph: Emph): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Underline?      fun(underline: Underline): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Strong?         fun(strong: Strong): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Strikeout?      fun(strikeout: Strikeout): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Superscript?    fun(superscript: Superscript): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Subscript?      fun(subscript: Subscript): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field SmallCaps?      fun(smallcaps: SmallCaps): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Quoted?         fun(quoted: Quoted): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Cite?           fun(cite: Cite): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Code?           fun(code: Code): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field Space?          fun(): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field SoftBreak?      fun(): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field LineBreak?      fun(): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field Math?           fun(math: Math): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field RawInline?      fun(rawinline: RawInline): InlineFilterResult `nil` = leave untouched, `EmptyList` = delete.
---@field Link?           fun(link: Link): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Image?          fun(image: Image): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Note?           fun(note: Note): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.
---@field Span?           fun(span: Span): InlineFilterResult,boolean? `nil` = leave untouched, `EmptyList` = delete.

---@class Template An opaque object holding a compiled template.

---@class LogMessage A pandoc log message. It has no fields, but can be converted to a string via `tostring`.
---@alias VerbosityLevelType "INFO"|"WARNING"|"ERROR"

---@class CommonState The state used by pandoc to collect information and make it available to readers and writers.
---@field input_files? string[] List of input files from command line.
---@field output_file? string|nil Output file from command line.
---@field log? LogMessage[] A list of log messages in reverse order.
---@field request_headers? table Headers to add for HTTP requests; table with header names as keys and header contents as value.
---@field resource_path? string[] Path to search for resources like included images.
---@field source_url? string|nil Absolute URL or directory of first source file.
---@field user_data_dir? string|nil Directory to search for data files.
---@field trace? boolean Whether tracing messages are issued.
---@field verbosity? VerbosityLevelType Verbosity level; one of INFO, WARNING, ERROR.

---@class ReaderOptions
---@field abbreviations? string[] Set of known abbreviations.
---@field columns? integer Number of columns in terminal.
---@field default_image_extension? string Default extension for images.
---@field extensions? string[] String representation of the syntax extensions bit field.
---@field indented_code_classes? string[] Default classes for indented code blocks.
---@field standalone? boolean Whether the input was a standalone document with header.
---@field strip_comments? boolean HTML comments are stripped instead of parsed as raw HTML.
---@field tab_stop? integer Width (i.e. equivalent number of spaces) of tab stops.
---@field track_changes? string Track changes setting for docx; one of accept-changes, reject-changes, and all-changes.

---@class Input The raw input to be parsed by a custom `Reader`, as a list of sources. Use `tostring` to get a string version of the input.

---@alias Reader fun(input: Input, options?: ReaderOptions): Pandoc

---@alias CiteMethodType "citeproc"|"natbib"|"biblatex"
---@alias EmailObfuscationType "none"|"references"|"javascript"
---@alias HtmlMathMethodType "plain"|"gladtex"|"webtex"|"mathml"|"mathjax"
---@alias ReferenceLocationType "end-of-block"|"end-of-section"|"end-of-document"|"block"|"section"|"document"
---@alias TopLevelDivisionType "top-level-part"|"top-level-chapter"|"top-level-section"|"top-level-default"|"part"|"chapter"|"section"|"default"
---@alias WrapTextType "wrap-auto"|"wrap-none"|"wrap-preserve"|"auto"|"none"|"preserve"

---@class WriterOptions
---@field chunk_template? string Template used to generate chunked HTML filenames.
---@field cite_method? string How to print cites – one of `citeproc`, `natbib`, or `biblatex`.
---@field columns? integer Characters in a line (for text wrapping).
---@field dpi? integer DPI for pixel to/from inch/cm conversions.
---@field email_obfuscation? string How to obfuscate emails – one of `none`, `references`, or `javascript`.
---@field epub_chapter_level? integer Header level for chapters, i.e., how the document is split into separate files.
---@field epub_fonts? string[] Paths to fonts to embed (sequence of strings).
---@field epub_metadata? string|nil Metadata to include in EPUB.
---@field epub_subdirectory? string Subdir for epub in OCF.
---@field extensions? string[] Markdown extensions that can be used.
---@field highlight_style? table|nil Style to use for highlighting; see the output of pandoc `--print-highlight-style=...` for an example structure. The value nil means that no highlighting is used.
---@field html_math_method? HtmlMathMethodType|table How to print math in HTML; one `plain`, `gladtex`, `webtex`, `mathml`, `mathjax`, or a table with keys method and url.
---@field html_q_tags? boolean Use `<q>` tags for quotes in HTML.
---@field identifier_prefix? string Prefix for section & note ids in HTML and for footnote marks in markdown.
---@field incremental? boolean True if lists should be incremental.
---@field listings? boolean Use listings package for code.
---@field number_offset? integer[] Starting number for section, subsection, …
---@field number_sections? boolean Number sections in LaTeX.
---@field prefer_ascii? boolean Prefer ASCII representations of characters when possible.
---@field reference_doc? string Path to reference document if specified.
---@field reference_links? boolean Use reference links in writing markdown, rst.
---@field reference_location? ReferenceLocationType Location of footnotes and references for writing markdown; one of `end-of-block`, `end-of-section`, `end-of-document`. The common prefix may be omitted when setting this value.
---@field section_divs? boolean Put sections in div tags in HTML.
---@field setext_headers? boolean Use setext headers for levels 1-2 in markdown.
---@field slide_level integer Force header level of slides.
---@field tab_stop? integer Tabstop for conversion btw spaces and tabs.
---@field table_of_contents? boolean Include table of contents.
---@field template? Template Template to use.
---@field toc_depth? integer Number of levels to include in TOC.
---@field top_level_division? TopLevelDivisionType Type of top-level divisions; one of `top-level-part`, `top-level-chapter`, `top-level-section`, or `top-level-default`. The prefix `top-level` may be omitted when setting this value.
---@field variables? table Variables to set in template; string-indexed table.
---@field wrap_text? WrapTextType Option for wrapping text; one of `wrap-auto`, `wrap-none`, or `wrap-preserve`. The `wrap-` prefix may be omitted when setting this value.

---@alias Writer fun(doc: Pandoc, options: WriterOptions): string

---The state of an extension (enabled, disabled, or default state)
---@alias ExtensionState
---| '"enable"'  # extension enabled
---| true        # extension enabled
---| '"disable"' # extension disabled
---| false       # extension disabled
---| nil         # default state

---@class FormatTable Used as eventual second argument of `pandoc.read`.
---@field format string
---@field extensions table<string,ExtensionState>

---A document source (local file path or URI)
---@alias Source string

---@class pandoc
---@field AlignCenter string
---@field AlignDefault string
---@field AlignLeft string
---@field AlignRight string
---@field Attr fun(identifier?: string, classes?: string[], attributes: table<string,string>): Attr `Attr` constructor.
---field AttributeList fun(attributes: table<string,string>): userdata
---@field AuthorInText string
---field Block
---@field BlockQuote fun(content: Blocks): BlockQuote `BlockQuote` constructor.
---@field Blocks fun(blocks: Block[]): Blocks Creates a `Blocks` list.
---@field BulletList fun(items: List<Blocks>): BulletList `BulletList` constructor.
---@field Cell fun(content: Blocks): Cell `Cell` (of `Table`) constructor.
---@field Citation fun()
---@field Cite fun(content: Inlines, citations: List<Citation>): Cite `Cite` constructor.
---@field Code fun(text: string, attr?: Attr): Code `Code` constructor.
---@field CodeBlock fun(text: string, attr?: Attr): CodeBlock `CodeBlock` constructor.
---@field Decimal string
---@field DefaultDelim string
---@field DefaultStyle string
---@field DefinitionList fun(content: List<DefinitionListItem>): DefinitionList `DefinitionList` constructor.
---@field DisplayMath string
---@field Div fun(content: Blocks, attr?: Attr): Div `Div` constructor.
---@field DoubleQuote string
---@field Emph fun(content: Inlines): Emph `Emph` constructor.
---@field Example string
---@field Figure fun(content: Blocks, caption?: Caption, attr?: Attr): Figure `Figure` constructor.
---@field Header fun(level: integer, content: Inlines, attr?: Attr): Header `Header` constructor.
---@field HorizontalRule fun(): HorizontalRule `HorizontalRule` constructor.
---@field Image fun(caption: Inlines, src: string, title?: string, attr?: Attr): Image `Image` constructor.
---field Inline
---@field InlineMath string
---@field Inlines fun(inlines: Inline[]): Inlines Creates an `Inlines` list.
---@field LineBlock fun(content: List<Inlines>): LineBlock `LineBlock` constructor.
---@field LineBreak fun(): LineBreak `LineBreak` constructor.
---@field Link fun(content: Inlines, target: string, title?: string, attr?: Attr): Link `Link` constructor.
---@field List fun(items?: table): List `List` constructor
---@field ListAttributes fun(start?: integer, style?: ListNumberStyle, delimiter?: ListNumberDelim): ListAttributes `ListAttributes` constructor.
---@field LowerAlpha string
---@field LowerRoman string
---@field Math fun(mathtype: MathType): Math `Math` constructor.
---@field Meta fun(meta_maps: table<string,MetaValue>):Meta `Meta` object constructor.
---@field MetaBlocks fun(blocks: Blocks): MetaBlocks `MetaBlocks` constructor.
---@field MetaBool fun(bool: boolean): MetaBool `MetaBool` constructor.
---@field MetaInlines fun(inlines: Inlines): MetaInlines `MetaInlines` constructor.
---@field MetaList fun(meta_values: List<MetaValue>): MetaList `MetaList` constructor.
---@field MetaMap fun(key_value_map: table<string,MetaValue>): MetaMap `MetaMap` constructor.
---@field MetaString fun(str: string): MetaString `MetaString` constructor.
---@field NormalCitation string
---@field Note fun(content: Blocks): Note `Note` constructor.
---@field OneParen string
---@field OrderedList fun(items: List<Blocks>, listAttributes?: ListAttributes): OrderedList `OrderedList` constructor.
---@field Pandoc fun(blocks: Blocks, meta?: Meta): Pandoc Pandoc document constructor.
---@field Para fun(content: Inlines): Para `Para` constructor.
---@field Period string
---@field Plain fun(content: Inlines): Plain `Plain` constructor.
---@field Quoted fun(quotetype: QuoteType, content: Inlines): Quoted `Quoted` constructor.
---@field RawBlock fun(format: string, text: string): RawBlock `RawBlock` constructor.
---@field RawInline fun(format: string, text: string): RawInline `RawInline` constructor.
---@field ReaderOptions fun(opts: ReaderOptions): ReaderOptions `ReaderOptions` constructor.
---@field Row fun(cells: List<Cell>, attr?: Attr): Row `Table` row constructor.
---@field SimpleTable fun(caption: Caption, aligns: List<Alignment>, widths: List<number>, headers: List<Blocks>, rows: List<List<Blocks>>): SimpleTable `SimpleTable` (pre Pandoc 2.10) constructor.
---@field SingleQuote string
---@field SmallCaps fun(content: Inlines): SmallCaps `SmallCaps` constructor.
---@field SoftBreak fun(): SoftBreak `SoftBreak` constructor.
---@field Space fun(): Space `Space` constructor.
---@field Span fun(content: Inlines, attr?: Attr): Span `Span` constructor.
---@field Str fun(text: string): Str `Str` constructor.
---@field Strikeout fun(content: Inlines): Strikeout `Strikeout` constructor.
---@field Strong fun(content: Inlines): Strong `Strong` constructor.
---@field Subscript fun(content: Inlines): Subscript `Subscript` constructor.
---@field Superscript fun(content: Inlines): Superscript `Superscript` constructor.
---@field SuppressAuthor string
---@field Table fun(caption: Caption, colspecs: List<ColSpec>, head: TableHead, bodies: List<TableBody>, foot: TableFoot, attr?: Attr): Table `Table` constructor.
---@field TableFoot fun(rows?: List<Row>, attr?: Attr): TableFoot `TableFoot` constructor.
---@field TableHead fun(rows?: List<Row>, attr?: Attr): TableHead `TableHead` constructor.
---@field TwoParens string
---@field Underline fun(content: Inlines): Strikeout `Strikeout` constructor.
---@field UpperAlpha string
---@field UpperRoman string
---@field WriterOptions fun(opts: WriterOptions): WriterOptions `WriterOptions` constructor.
---@field cli PandocCliModule
---@field format PandocFormatModule
---@field json PandocJsonModule
---@field layout PandocLayoutModule
---@field log PandocLogModule
---@field mediabag PandocMediabagModule
---@field path PandocPathModule
---@field pipe fun(command: string, args: string[], input: string): string
---@field read fun(markup: string|Source[], format?: string|FormatTable, reader_options?: ReaderOptions): Pandoc Parse the given string into a Pandoc document.
---@field readers table<string,boolean> Set of formats that pandoc can parse. All keys in this table can be used as the `format` value in `pandoc.read`.
---@field scaffolding PandocScaffoldingModule
---@field sha1 fun(input: string): string Computes the SHA1 hash of the given string input.
---@field structure PandocStructureModule
---@field system PandocSystemModule
---@field template PandocTemplateModule
---@field text PandocTextModule
---@field types PandocTypesModule
---@field utils PandocUtilsModule
---@field walk_block fun(element: Block, filter: Filter): BlockFilterResult
---@field walk_inline fun(element: Inline, filter: Filter): InlineFilterResult
---@field write fun(doc: Pandoc, format?:string|FormatTable, writer_options?: WriterOptions): string Converts a document to the given target format.
---@field write_classic fun(doc: Pandoc, writer_options?: WriterOptions): string Runs a classic custom Lua writer, using the functions defined in the current environment.
---@field writers table<string,boolean> Set of formats that pandoc can generate. All keys in this table can be used as the `format` value in `pandoc.write`.
---@field zip PandocZipModule

---Command line options and argument parsing.
---@class PandocCliModule
---@field default_options table<string,any> Default CLI options, using a JSON-like representation.
---@field parse_options fun(args: string[]): table<string,string> Parses command line arguments into pandoc options. Typically this function will be used in stand-alone pandoc Lua scripts, taking the list of arguments from the global `arg`.
---@field repl fun(env: table<string,string>): any Starts a read-eval-print loop (REPL). The function returns all values of the last evaluated input.

---This module exposes internal pandoc functions and utility functions.
---@class PandocUtilsModule
---@field blocks_to_inlines fun(blocks: Blocks, sep?: Inlines): Inlines Squash a list of blocks into a list of inlines.
---@field citeproc fun(doc: Pandoc): Pandoc Process the citations in the file, replacing them with rendered citations and adding a bibliography.
---@field equals fun(element1: any, element2: any): boolean Test equality of AST elements. __This function is deprecated__.
---@field from_simple_table fun(simple_tbl: SimpleTable): Table Creates a `Table` block element from a `SimpleTable`.
---@field make_sections fun(number_sections: boolean, baselevel: integer|nil, blocks: Blocks): Blocks Converts a list of Block elements into sections. `Div`s will be created beginning at each `Header` and containing following content until the next Header of comparable level.
---@field normalize_date fun(date: string): string|nil Parse a date and convert (if possible) to “YYYY-MM-DD” format. Returns `nil` if normalization fails.
---@field references fun(doc: Pandoc): table Get references defined inline in the metadata and via an external bibliography.
---@field run_json_filter fun(doc: Pandoc, filter?: string, args?: string[]): Pandoc Filter the given doc by passing it through a JSON filter.
---@field sha1 fun(input: string): string Computes the SHA1 hash of the given string input.
---@field stringify fun(element: Pandoc|Meta|Block|Inline): string Converts the given element (Pandoc, Meta, Block, or Inline) into a string with all formatting removed.
---@field to_roman_numeral fun(n: integer): string Converts an integer < 4000 to uppercase roman numeral.
---@field to_simple_table fun(tbl: Table): SimpleTable Converts a table into an old/simple table.
---@field type fun(value: any): string Pandoc-friendly version of Lua’s default type function, returning type information similar to what is presented in the manual.
---@field Version fun(v: string|integer[]|integer): integer[] Creates a Version object.

---Information about the formats supported by pandoc.
---@class PandocFormatModule
---@field all_extensions fun(format: string): string[] Returns the list of all valid extensions for a format. No distinction is made between input and output; an extension can have an effect when reading a format but not when writing it, or _vice versa_.
---@field default_extensions fun(format: string): string[] Returns the list of default extensions of the given format; this function does not check if the format is supported, it will return a fallback list of extensions even for unknown formats.
---@field extensions fun(format: string): table<string,ExtensionState> Returns the extension configuration for the given format. The configuration is represented as a table with all supported extensions as keys and their default status as value, with `true` indicating that the extension is enabled by default, while `false` marks a supported extension that’s disabled.
---@field from_path fun(path: string|string[]): string|nil Try to determine the format of file(s) by heuristic.

---JSON module to work with JSON; based on the Aeson Haskell package.
---@class PandocJsonModule
---@field decode fun(str: string, pandoc_types?: boolean): any Creates a Lua object from a JSON string. The function returns an `Inline`, `Block`, `Pandoc`, `Inlines`, or `Blocks` element if the input can be decoded into represent any of those types. Otherwise the default decoding is applied, using tables, booleans, numbers, and `null` to represent the JSON value.
---@field encode fun(object: any): string Encodes a Lua object as JSON string.
---@field null userdata Userdata representing a JSON `null`.

---Plain-text document layouting.
---@class PandocLayoutModule
---@field after_break fun(text: string): Doc Creates a `Doc` which is conditionally included only if it comes at the beginning of a line.
---@field before_non_blank fun(doc: Doc): Doc Conditionally includes the given `doc` unless it is followed by a blank space.
---@field blankline userdata Inserts a blank line unless one exists already.
---@field blanklines fun(n: integer): Doc Inserts blank lines unless they exist already.
---@field braces fun(doc: Doc): Doc Puts the `doc` in curly braces.
---@field brackets fun(doc: Doc): Doc Puts the `doc` in square brackets.
---@field cblock fun(doc: Doc, width: integer): Doc Creates a block with the given width and content, aligned centered.
---@field chomp fun(doc: Doc): Doc Chomps trailing blank space off of the `doc`.
---@field concat fun(docs: Doc[], sep?: Doc): Doc Concatenates a list of `Doc`s.
---@field cr userdata A carriage return. Does nothing if we're at the beginning of a line; otherwise inserts a newline.
---@field double_quotes fun(doc: Doc): Doc Wraps a `Doc` in double quotes.
---@field empty Doc The empty document.
---@field flush fun(doc: Doc): Doc Makes a `Doc` flush against the left margin.
---@field hang fun(doc: Doc, ind: integer, start: Doc): Doc Creates a hanging indent. The resulting `Doc` has `start` on the first line, and subsequent lines indented by `ind` spaces.
---@field height fun(doc: Doc): integer|string Returns the height of a block or other `Doc`.
---@field inside fun(contents: Doc, start: Doc, end: Doc): Doc Encloses a `Doc` inside a `start` and `end` `Doc`.
---@field is_empty fun(doc: Doc): boolean Checks whether a `doc` is empty (equal to pandoc.layout.empty).
---@field lblock fun(doc: Doc, width: integer): Doc Creates a block with the given width and content, aligned to the left.
---@field literal fun(text: string): Doc Creates a `Doc` from a string.
---@field min_offset fun(doc: Doc): integer|string Returns the minimal width of a `Doc` when reflowed at breakable spaces.
---@field nest fun(doc: Doc, ind: integer): Doc Indents a `Doc` by the specified number of spaces.
---@field nestle fun(doc: Doc): Doc Removes leading blank lines from a `Doc`.
---@field nowrap fun(doc: Doc): Doc Makes a `Doc` non-reflowable.
---@field offset fun(doc: Doc): integer|string Returns the width of a `Doc` as number of characters.
---@field parens fun(doc: Doc): Doc Puts the `Doc` in parentheses.
---@field prefixed fun(doc: Doc, prefix: string): Doc Uses the specified string as a prefix for every line of the inside document (except the first, if not at the beginning of the line).
---@field quotes fun(doc: Doc): Doc Wraps a `Doc` in single quotes.
---@field rblock fun(doc: Doc, width: integer): Doc Creates a block with the given width and content, aligned to the right.
---@field real_length fun(str: string): integer|string Returns the real length of a string in a monospace font: `0` for a combining character, `1` for a regular character, `2` for an East Asian wide character.
---@field render fun(doc: Doc, colwidth: integer): Doc Render `Doc`. The text is reflowed on breakable spaces to match the given line length. Text is not reflowed if the line length parameter is omitted or `nil`.
---@field space userdata A breaking (reflowable) space.
---@field update_column fun(doc: Doc, i: integer): integer|string Returns the column that would be occupied by the last laid out character, starting from `i`.
---@field vfill fun(border: string): Doc An expandable border that, when placed next to a box, expands to the height of the box. Strings cycle through the list provided.

---@class PandocLogModule
---@field info fun(message: string) Reports a ScriptingInfo message to pandoc’s logging system.
---@field silence fun(fn: function): List<string> Applies the function to the given arguments while preventing log messages from being added to the log. 
---@field warn fun(message: string) Reports a ScriptingWarning to pandoc’s logging system. The warning will be printed to stderr unless logging verbosity has been set to ERROR.

---@class IteratorState An opaque value to be passed to the iterator function.

---@class IteratorValue Current value of an iterator.

---@alias IteratorFunction fun(state: IteratorState, value: IteratorValue)

---@class MediabagItemSummary
---@field path string Filepath of a Mediabag entry.
---@field type string MIME type of a Mediabag entry.
---@field length integer Length of contents of a Mediabag entry in bytes.

---The `pandoc.mediabag` module allows accessing pandoc’s media storage. The "media bag" is used when `pandoc` is called with the `--extract-media` or (for HTML only) `--embed-resources` option.
---@class PandocMediabagModule
---@field delete fun(filepath: string) Removes a single entry from the media bag.
---@field empty fun() Clear-out the media bag, deleting all items.
---@field fetch fun(source: Source): string,string|nil,nil Fetches the given source from a URL or local file. Returns two values: the contents of the file and the MIME type (or an empty string).
---@field fill fun(doc: Pandoc): Pandoc Fills the mediabag with the images in the given document. An image that cannot be retrieved will be replaced with a `Span` of class "image" that contains the image description.
---@field insert fun(filepath: string, mimetype: string, contents: string) Adds a new entry to pandoc’s media bag. Replaces any existing media bag entry the same `filepath`.
---@field items fun(): IteratorFunction,IteratorState,IteratorValue Returns an iterator triple to be used with Lua’s generic `for` statement.
---@field list fun(): MediabagItemSummary[] Get a summary of the current media bag contents.
---@field lookup fun(filepath: string): string,string|nil,nil Lookup a media item in the media bag, and return its MIME type and contents.
---@field write fun(dir: string, fp?: string) Writes the contents of mediabag to the given target directory. If `fp` is given, then only the resource with the given name will be extracted.

---Module for file path manipulations.
---@class PandocPathModule
---@field directory fun(filepath: string): string Gets the directory name, i.e., removes the last directory separator and everything after from the given path.
---@field filename fun(filepath: string): string Get the file name.
---@field is_absolute fun(filepath: string): boolean Checks whether a path is absolute, i.e. not fixed to a root.
---@field is_relative fun(filepath: string): boolean Checks whether a path is relative or fixed to a root.
---@field join fun(filepaths: string[]): string Join path elements back together by the directory separator.
---@field make_relative fun(path: string, root: string, unsafe?: boolean): string Contract a filename, based on a relative path. Note that the resulting path will never introduce `..` paths, as the presence of symlinks means `../b` may not reach `a/b` if it starts from `a/c`.
---@field normalize fun(filepath: string): string Normalizes a path.
---@field search_path_separator string The character that is used to separate the entries in the `PATH` environment variable.
---@field separator string The character that separates directories.
---@field split fun(filepath: string): string[] Splits a path by the directory separator.
---@field split_extension fun(filepath: string): string,string Splits the last extension from a file path and returns the parts. The extension, if present, includes the leading separator; if the path has no extension, then the empty string is returned as the extension.
---@field split_search_path fun(search_path: string): string[] Takes a string and splits it on the search_path_separator character. Blank items are ignored on Windows, and converted to `.` on Posix. On Windows path elements are stripped of quotes.
---@field treat_strings_as_paths fun() Augment the string module such that strings can be used as path objects.

---Scaffolding for custom writers.
---@class PandocScaffoldingModule
---@field Writer table An object to be used as a `Writer` function; the construct handles most of the boilerplate, expecting only render functions for all AST elements.

---Options for the second argument of `pandoc.structure.make_sections`.
---@class MakeSectionsOptions: table
---@field number_sections? boolean When `true`, a number attribute containing the section number will be added to each `Header`.
---@field base_level? integer When set, `Header` levels will be reorganized so that there are no gaps, with numbering levels shifted by the given value.
---@field slide_level? integer When set, triggers the creation of slides at that heading level.

---Options for the second argument of `pandoc.structure.split_into_chunks`.
---@class SplitIntoChunksOptions: table
---@field path_template? string Template used to generate the chunks' filepaths. `%n` will be replaced with the chunk number (padded with leading 0s to 3 digits), `%s` with the section number of the heading, `%h` with the (stringified) heading text, `%i` with the section identifier. For example, `"section-%s-%i.html"` might be resolved to `"section-1.2-introduction.html"`. Default is `"chunk-%n"`.
---@field number_sections? boolean Whether sections should be numbered; default is `false`.
---@field chunk_level? integer The heading level the document should be split into chunks. The default is to split at the top-level, i.e., `1`.
---@field base_heading_level? integer|nil The base level to be used for numbering. Default is `nil`

---Access to the higher-level document structure, including hierarchical sections and the table of contents.
---@class PandocStructureModule
---@field make_sections fun(blocks: Blocks, opts?: MakeSectionsOptions): Blocks Puts `Blocks` into a hierarchical structure: a list of sections (each a `Div` with class "section" and first element a `Header`).
---@field slide_level fun(blocks: Blocks|Pandoc): integer Find level of header that starts slides (defined as the least header level that occurs before a non-header/non-hrule in the blocks).
---@field split_into_chunks fun(doc: Pandoc, opts?: SplitIntoChunksOptions): ChunkedDoc Converts a `Pandoc` document into a `ChunkedDoc`.
---@field table_of_contents fun(toc_source: Blocks|Pandoc|ChunkedDoc, opts?: WriterOptions): BulletList Generates a table of contents for the given object.

---@class CallbackResults The results of a callback when calling `pandoc.system.with_environment`, `pandoc.system.with_temporary_directory` and `pandoc.system.with_working_directory`.

---Access to the system’s information and file functionality.
---@class PandocSystemModule
---@field arch string The machine architecture on which the program is running.
---@field cputime fun(): integer Returns the number of picoseconds CPU time used by the current program. The precision of this result may vary in different versions and on different platforms.
---@field environment fun(): table<string,string> Retrieves the entire environment as a string-indexed table.
---@field get_working_directory fun(): string Obtain the current working directory as an absolute path.
---@field list_directory fun(directory?: string): string[] List the contents of a directory.
---@field make_directory fun(dirname: string, create_parent?: boolean) Create a new directory which is initially empty, or as near to empty as the operating system allows. The function throws an error if the directory cannot be created, e.g., if the parent directory does not exist or if a directory of the same name is already present.
---@field os string The operating system on which the program is running.
---@field remove_directory fun(dirname: string, recursive?: boolean) Remove an existing, empty directory. If `recursive` is given, then delete the directory and its contents recursively.
---@field with_environment fun(environment: table<string,string>, callback: fun()): CallbackResults Run an action within a custom environment. Only the environment variables given by `environment` will be set, when `callback` is called. The original environment is restored after this function finishes, even if an error occurs while running the callback action.
---@field with_temporary_directory fun(parent_dir: string, templ: string, callback: fun()): CallbackResults Create and use a temporary directory inside the given directory. The directory is deleted after the callback returns.
---@field with_working_directory fun(directory: string, callback: fun()): CallbackResults Run an action within a different directory. This function will change the working directory to `directory`, execute `callback`, then switch back to the original working directory, even if an error occurs while running the callback action.

---UTF-8 aware text manipulation functions, implemented in Haskell.
---@class PandocTextModule
---@field fromencoding fun(s: string, encoding?: string): string Converts a string to UTF-8.
---@field len fun(s: string): integer Returns the length of a UTF-8 string, i.e., the number of characters.
---@field lower fun(s: string): string Returns a copy of a UTF-8 string, converted to lowercase.
---@field reverse fun(s: string): string Returns a copy of a UTF-8 string, with characters reversed.
---@field sub fun(s: string, i: integer, j?: integer): string Returns a substring of a UTF-8 string, using Lua’s string indexing rules.
---@field toencoding fun(s: string, encoding?: string): string Converts a UTF-8 string to a different encoding. The `encoding` parameter defaults to the current ANSI code page on Windows; on other platforms it will try to guess the file system’s encoding.
---@field upper fun(s: string): string Returns a copy of a UTF-8 string, converted to uppercase.

---@class Doc Reflowable plain-text document. A `Doc` value can be rendered and reflown to fit a given column width.
---@alias BlocksWriter fun(blocks: Blocks): Doc
---@alias InlinesWriter fun(inlines: Inlines): Doc

---Handle pandoc templates.
---@class PandocTemplateModule
---@field apply fun(template: Template, context: table): Doc Applies a context with variable assignments to a template, returning the rendered template. The context parameter must be a table with variable names as keys and `Doc`, `string`, `boolean`, or `table` as values, where the table can be either be a list of the aforementioned types, or a nested context.
---@field compile fun(template: string, templates_path?: string[]): Template Compiles a template string into a Template object usable by pandoc. If the `templates_path` parameter is specified, should be the file path associated with the template. It is used when checking for partials. Partials will be taken only from the default data files if this parameter is omitted.
---@field default fun(writer?: string): string Returns the default template for a given writer as a string. An error if no such template can be found. `writer` defaults to the global `FORMAT`.
---@field get fun(filename: string): string Retrieve text for a template. This function first checks the resource paths for a file of this name; if none is found, the templates directory in the user data directory is checked. Returns the content of the file, or throws an error if no file is found.
---@field meta_to_context fun(meta: Meta, blocks_writer: BlocksWriter, inlines_writer: InlinesWriter) Creates template context from the document’s Meta data, using the given functions to convert `Blocks` and `Inlines` to `Doc` values.

---Constructors for types which are not part of the pandoc AST.
---@class PandocTypesModule
---@field Version fun(v: string|integer[]|integer): integer[] Creates a Version object.

---@class ZipArchive A zip Archive.
---@field entries ZipEntry[] Files in this zip archive.
---@field bytestring fun(self: ZipArchive): string Returns the raw binary `string` representation of the archive.
---@field extract fun(self: ZipArchive, opts?: ZipOptions) Extract all files from this archive, creating directories as needed. Note that the last-modified time is set correctly only in POSIX, not in Windows. This function fails if encrypted entries are present.

---@class ZipEntry An entry in a `ZipArchive`.
---@field modtime integer Modification time (seconds since unix epoch).
---@field path string Relative path, using `/` as separator.
---@field contents fun(self: ZipEntry, password?: string): string Binary contents of this entry.

---@class ZipOptions
---@field recursive? boolean Recurse directories when set to `true`.
---@field verbose? boolean Print info messages to stdout.
---@field destination? string The directory in which to extract.
---@field location? string It is used as path name, defining where files are placed.
---@field preserve_symlinks? boolean Whether symbolic links are preserved as such. This option is ignored on Windows.

---Functions to create, modify, and extract files from zip archives.
---@class PandocZipModule Functions to create, modify, and extract files from zip archives. The module can be called as a function, in which case it behaves like its `zip` function.
---@field Archive fun(bytestring_or_entries?: string|ZipEntry[]): ZipArchive Reads an Archive structure from a raw zip archive or a list of Entry items; throws an error if the given string cannot be decoded into an archive. The argument defaults to an empty list of `ZipEntry`.
---@field Entry fun(path: string, contents: string, modtime?: integer): ZipEntry Generates a `ZipEntry` from a filepath, uncompressed content, and the file’s modification time.
---@field read_entry fun(filepath: string, opts?: ZipOptions): ZipEntry Generates a ZipEntry from a file or directory.
---@field zip fun(filepaths: string[], opts: ZipOptions): ZipArchive Package and compress the given files into a new Archive.

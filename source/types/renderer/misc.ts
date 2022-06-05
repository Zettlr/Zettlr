export interface RelatedFile {
  file: string
  path: string
  tags: string[]
  link: 'inbound'|'outbound'|'bidirectional'|'none'
}

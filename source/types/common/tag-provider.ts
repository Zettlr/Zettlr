export interface ColouredTag {
  name: string
  color: string
  desc: string
}

export interface TagRecord {
  text: string
  count: number
  className: string
}

export interface TagDatabase {
  [name: string]: TagRecord
}

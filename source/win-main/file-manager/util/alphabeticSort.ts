import { MDFileMeta, CodeFileMeta, DirMeta } from '@dts/common/fsal'

export default function alphabeticSort (dirArray: any, sortBy: string): DirMeta[] {
  function compare (a: MDFileMeta | CodeFileMeta | DirMeta, b: MDFileMeta | CodeFileMeta | DirMeta): number {
    let nameA = a.name.toLowerCase()
    let nameB = b.name.toLowerCase()

    // if workspaces have the same name, compare their parent's name
    if (nameA === nameB) {
      let dirA = a.dir.toLowerCase()
      let dirB = b.dir.toLowerCase()
      if (dirA < dirB) {
        return -1
      }
      if (dirA > dirB) {
        return 1
      }
    }
    return 0
  }
  // let temp = this.getFilteredTree.filter(item => item.type === 'directory');
  if (sortBy === 'desc') {
    return dirArray.sort(compare).reverse() as DirMeta[]
  }
  return dirArray.sort(compare) as DirMeta[]
}

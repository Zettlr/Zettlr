import { MDFileMeta, CodeFileMeta, DirMeta } from '@dts/common/fsal'

export default function alphabeticSort(dirArray: any, sortBy: string): DirMeta[] {
    function compare(a: any, b: any) {

      let nameA = a.name.toLowerCase(), nameB = b.name.toLowerCase();

      // if workspaces have the same name, compare their parent's name
      if (nameA == nameB) {
        let dirA = a.dir.toLowerCase(), dirB = b.dir.toLowerCase();
        if (dirA < dirB)
          return -1;
        if (dirA > dirB)
          return 1;
      }
             
      // sort by workspace's name
      else {
        if (nameA < nameB) {
          return -1
        }
        if (nameA > nameB) {
          return 1
        }
      }
      return 0;
    }
    
    if (sortBy == "desc") return dirArray.sort(compare).reverse() as DirMeta[];
    return dirArray.sort(compare) as DirMeta[];
  }
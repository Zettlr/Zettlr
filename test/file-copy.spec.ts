import {strictEqual} from 'assert'

let destination = ''

function CopyTo(source: string, dest: string) {
    destination = dest + '/' + source.split('/').pop()
}


describe('file-copy', function () {
    it('The file is copied to the destination folder', function () {
        //The File source and targeted destination
        const source = '/notes/reading.md'
        const dest   = '/projects/essay'
        
        //calling the method
        CopyTo(source, dest);

        strictEqual(destination, '/projects/essay/reading.md')
    })

    it('The file is still present in the source folder', function () {
        
        const source = '/notes/reading.md'
        const dest   = '/projects/essay'
        
        //calling the method
        CopyTo(source, dest);

        strictEqual(source, '/notes/reading.md')
    })
})
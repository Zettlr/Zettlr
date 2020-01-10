/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractBibTexAttachments tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const extractBibTexAttachments = require('../source/common/util/extract-bibtex-attachments')
const assert = require('assert')

const validBibTexFile = `
% Encoding: UTF-8

@InProceedings{Szegedy2014a,
  author    = {Christian Szegedy and Wojciech Zaremba and Ilya Sutskever and Joan Bruna},
  title     = {Intriguing properties of neural networks},
  year      = {2014},
  file      = {:References_HE/0x04 Neural Networks, Machine Learning, General AI/Szegedy, Zaremba, Sutskever, Bruna, Erhan, Goodfellow, Fergus 2014 - Intriguing properties of neural networks.pdf:PDF},
  timestamp = {2019-12-07},
}

@Article{Javadnejad2019a,
  author    = {Farid Javadnejad and Daniel T. Gillins and Christopher E. Parrish and Richard K. Slocum},
  title     = {{A} photogrammetric approach to fusing natural colour and thermal infrared {UAS} imagery in {3D} point cloud generation},
  journal   = {International Journal of Remote Sensing},
  year      = {2019},
  month     = jul,
  doi       = {10.1080/01431161.2019.1641241},
  file      = {:References_HE/0x02 Sensors and Sensor Analysis/Javadnejad, Gillins, Parrish, Slocum 2019 - A photogrammetric approach to fusing natural colour and thermal infrared UAS imagery in 3D point cloud generation.pdf:PDF;:References_HE/Weblinks.md:md},
  timestamp = {2020-01-10},
}

@Article{NoFiles2020,
  author    = {Author Name},
  title     = {{S}ome {T}itle},
  journal   = {A Journal Name},
  timestamp = {2020-01-10},
}

@Comment{jabref-meta: databaseType:bibtex;}
`

const validResults = {
  'Szegedy2014a': ['References_HE/0x04 Neural Networks, Machine Learning, General AI/Szegedy, Zaremba, Sutskever, Bruna, Erhan, Goodfellow, Fergus 2014 - Intriguing properties of neural networks.pdf'],
  'Javadnejad2019a': [
    'References_HE/0x02 Sensors and Sensor Analysis/Javadnejad, Gillins, Parrish, Slocum 2019 - A photogrammetric approach to fusing natural colour and thermal infrared UAS imagery in 3D point cloud generation.pdf',
    'References_HE/Weblinks.md'
  ],
  'NoFiles2020': false
}

const invalidBibTexFile = `
% Encoding: UTF-8

@InProceedingsSzegedy2014a,
  author    Christian Szegedy and Wojciech Zaremba and Ilya Sutskever and Joan Bruna},
  title     = {Intriguing properties of neural networks},
  year      = {2014},
  file      = {:References_HE/0x04 Neural Networks, Machine Learning, General AI/Szegedy, Zaremba, Sutskever, Bruna, Erhan, Goodfellow, Fergus 2014 - Intriguing properties of neural networks.pdf:PDF},
  timestamp = {2019-12-07},
}

@Comment{jabref-meta: databaseType:bibtex;}
`

describe('Utility#extractBibTexAttachments()', function () {
  it('should successfully parse a valid BibTex file', function () {
    let files = extractBibTexAttachments(validBibTexFile)
    assert.deepStrictEqual(Object.keys(files), Object.keys(validResults), 'The parsed results do not contain the same keys!')
    for (let key in files) {
      assert.deepStrictEqual(files[key], validResults[key], `Key ${key} differs from the expected result!`)
    }
  })

  it('should throw an error due to invalid BibTex entries', function () {
    assert.throws(() => {
      extractBibTexAttachments(invalidBibTexFile)
    })
  })
})

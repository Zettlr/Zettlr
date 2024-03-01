<template>
  <div id="font-license-text">
    <p>
      Zettlr ships with three font faces, Crimson Text, Liberation, and
      Inconsolata. To comply with the SIL Open Font License, we provide the full
      license terms here.
    </p>
    <p>
      Below follow the individual Copyright statements for the fonts Crimson Text
      and Liberation. Afterwards follows the text of the SIL Open Font License,
      which is shared by all fonts used by Zettlr.
    </p>
    <h2>Crimson Text</h2>
    <p>
      Copyright (c) 2010, Sebastian Kosch (sebastian@aldusleaf.org), with Reserved Font Name "Crimson Text".
    </p>

    <h2>Liberation</h2>
    <p>Copyright (c) 2012 Red Hat, Inc. with Reserved Font Name Liberation.</p>

    <h2>SIL Open Font License</h2>

    <div id="sil-1-1-text">
      <p>
        This Font Software is licensed under the SIL Open Font License, Version 1.1.
        This license is copied below, and is also available with a FAQ at:
        <a href="http://scripts.sil.org/OFL">http://scripts.sil.org/OFL</a>
      </p>

      <h2>SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007</h2>
      <h3>PREAMBLE</h3>
      <p>The goals of the Open Font License (OFL) are to stimulate worldwide development of collaborative font projects, to support the font creation efforts of academic and linguistic communities, and to provide a free and open framework in which fonts may be shared and improved in partnership with others.</p>
      <p>The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves. The fonts, including any derivative works, can be bundled, embedded, redistributed and/or sold with any software provided that any reserved names are not used by derivative works. The fonts and derivatives, however, cannot be released under any other type of license. The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives.</p>
      <h3>DEFINITIONS</h3>
      <p>"Font Software" refers to the set of files released by the Copyright Holder(s) under this license and clearly marked as such. This may include source files, build scripts and documentation.</p>
      <p>"Reserved Font Name" refers to any names specified as such after the copyright statement(s).</p>
      <p>"Original Version" refers to the collection of Font Software components as distributed by the Copyright Holder(s).</p>
      <p>"Modified Version" refers to any derivative made by adding to, deleting, or substituting -- in part or in whole -- any of the components of the Original Version, by changing formats or by porting the Font Software to a new environment.</p>
      <p>"Author" refers to any designer, engineer, programmer, technical writer or other person who contributed to the Font Software.</p>
      <h3>PERMISSION & CONDITIONS</h3>
      <p>Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software, subject to the following conditions:</p>
      <ol>
        <li>Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself.</li>
        <li>Original or Modified Versions of the Font Software may be bundled, redistributed and/or sold with any software, provided that each copy contains the above copyright notice and this license. These can be included either as stand-alone text files, human-readable headers or in the appropriate machine-readable metadata fields within text or binary files as long as those fields can be easily viewed by the user.</li>
        <li>No Modified Version of the Font Software may use the Reserved Font Name(s) unless explicit written permission is granted by the corresponding Copyright Holder. This restriction only applies to the primary font name as presented to the users.</li>
        <li>The name(s) of the Copyright Holder(s) or the Author(s) of the Font Software shall not be used to promote, endorse or advertise any Modified Version, except to acknowledge the contribution(s) of the Copyright Holder(s) and the Author(s) or with their explicit written permission.</li>
        <li>The Font Software, modified or unmodified, in part or in whole, must be distributed entirely under this license, and must not be distributed under any other license. The requirement for fonts to remain under this license does not apply to any document created using the Font Software.</li>
      </ol>
      <h3>TERMINATION</h3>
      <p>This license becomes null and void if any of the above conditions are not met.</p>
      <h3>DISCLAIMER</h3>
      <p>THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FontLicenseTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the SIL Open Font License terms.
 *
 * END HEADER
 */
</script>

<style lang="less">
// Restore the margin which is being taken away by the generics rule in the geometry css
div#font-license-text * {
  margin: revert;
}

div#sil-1-1-text {
  font-family: monospace;
}
</style>

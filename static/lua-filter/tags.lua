-- ZETTLR ZETTELKASTEN-TAG FILTER
--
-- (c) 2021 Hendrik Erz
--
-- This filter is able to remove tags based on the corresponding metadata value.
-- If the metadata value zettlr.strip_tags is set to true either in the YAML
-- frontmatter section of a file or the metadata section of a defaults file,
-- this filter will remove anything that looks like a tag. Since Lua does not
-- have a RegExp implementation, it will try its best, but it cannot be
-- guaranteed that anything will be removed or kept as it's visually indicated
-- in the editor. Notably, escaped tags such as \#this-is-not-a-tag will be
-- considered tags nevertheless because Pandoc removes backslashes in front of
-- the #-sign, so we cannot check for that.

-- Allowed characters before a hashtag (note we're not checking for whitespace
-- since that's already being removed by Pandoc)
local pattern_before = "([%(%[{]+)"
-- The actual tag pattern; a stripped-down version of the RegExp we're using
-- internally (see the getZknTagRE-property in regular-expressions.js).
local tag_pattern = "#(#?[^%s,.:;…!?\"'`»«“”‘’—–@%$%%&*#^+~÷\\/|<=>[%](){}]+#?)"
-- This variable will be set to true if the user has set the corresponding
-- option in the preferences.
local strip_tags = false

return {
  {
    -- First, extract our metadata property
    Meta = function (meta)
      if meta.zettlr and meta.zettlr.strip_tags == true then
        strip_tags = true
      end
      return meta
    end
  },
  {
    -- Then, iterate over all Str elements and remove those that look like tags.
    -- NOTE: Due to Pandoc stripping away escape characters, any \# will become
    -- just # in the AST. If you use \\, then we will have \# here, *but* also
    -- in the output. So it's best to avoid any situation where you have to
    -- write (whitespace)#(non-whitespace) since that *will* also be removed.
    Str = function (elem)
      if not strip_tags then
        -- Do not alter if we shouldn't remove tags.
        return nil
      end

      -- I've asked Albert and he mentioned "Str" classes literally match
      -- words separated by whitespace within Inlines (so the textual contents
      -- of headings, paragraphs, links, etc ...)
      if elem.text:match(pattern_before .. tag_pattern) then
        -- The tag was preceeded by one or more allowed characters (opening brackets)
        elem.text = elem.text:gsub(tag_pattern, "%1")
      elseif elem.text:match("^" .. tag_pattern) then
        -- The tag literally makes up the Str element
        elem.text = elem.text:gsub(tag_pattern, "")
      end
      return elem
    end,
  }
}

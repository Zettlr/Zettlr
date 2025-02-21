-- ZETTLR ZETTELKASTEN-LINK FILTER
--
-- (c) 2025 (2021) Hendrik Erz
--
-- This Lua-filter can unlink or remove internal links as they are being used by
-- Zettlr based on preferences set in the program.
-- Two important notes for this file:
-- 1.) The corresponding wikilink extension MUST be active, as this filter only
--     looks for "Link" type inlines. Zettlr's exporter will already do this.
--     If you wish to use this filter elsewhere, ensure to enable the extension
--     manually.
-- 2.) This filter requires at least Pandoc 3.6.3, since it will distinguish
--     wikilinks from regular links by looking up the classes list, which before
--    3.6.3 was in the title value of the Link.
-- 3.) You can programmatically steer this filter on a per-file basis (even
--     inside Zettlr) by setting the YAML frontmatter property
--     `zettlr.strip_links` to either "no", "full", or "unlink".

-- Prepare our setting variable
local strip_links = 'no' -- Can be 'full'|'unlink'|'no'

return {
  {
    Meta = function (meta)
      -- Retrieve the option required for this filter if they exist.
      if meta.zettlr then
        if meta.zettlr.strip_links then
          strip_links = meta.zettlr.strip_links
        end
      end
      return meta
    end
  },
  {
    -- Zettelkasten/internal/wiki links are represent as Link nodes on Pandoc's
    -- AST.
    Link = function (elem)
      -- NOTE: Wikilinks are distinguished from regular links by having the
      -- class "wikilink" (cf. https://github.com/jgm/pandoc/commit/97b36ecb7703b434ed4325cc128402a9eb32418d)
      if strip_links == 'no' or elem.classes[1] ~= "wikilink" then
        -- nothing to do -> return `nil` as per the documentation
        -- (cf. https://pandoc.org/lua-filters.html#lua-filter-structure)
        return nil
      elseif strip_links == 'unlink' then
        -- Return the content for the link (a list of inlines), thereby
        -- unlinking it.
        return elem.content
      elseif strip_links == 'full' then
        -- Remove the link altogether by returning an empty list
        return {}
      end
    end,
  }
}

-- ZETTLR ZETTELKASTEN-LINK FILTER
--
-- (c) 2021 Hendrik Erz
--
-- This Lua-filter can unlink or remove internal links as they are being used by
-- Zettlr based on preferences set in the program. Since we have to pass these
-- preferences options somehow, we are using the defaults metadata section.
-- Zettlr will write three variables into that section, strip_link, link_start
-- and link_end, which are being used by this program to unlink or remove such
-- links if the user wishes so.
-- These variables can be overridden on a per-file basis by setting the property
-- "zettlr" in the YAML frontmatter section and adding the properties to that
-- property, since YAML frontmatter values override defaults metadata values.

-- Prepare the defaults for these variables
local strip_links = 'no' -- Can be 'full'|'unlink'|'no'
local link_start = '[['
local link_end = ']]'

return {
  {
    Meta = function (meta)
      -- Retrieve the options required for this filter if they exist.
      if meta.zettlr then
        if meta.zettlr.strip_links then
          strip_links = meta.zettlr.strip_links
        end
        
        if meta.zettlr.link_start then
          link_start = meta.zettlr.link_start
        end

        if meta.zettlr.link_end then
          link_end = meta.zettlr.link_end
        end
      end
      return meta
    end
  },
  {
    Para = function (paragraph)
      -- Since links can contain whitespace, we need to walk a full paragraph at
      -- a time and remember where we are

      local in_link = false

      return pandoc.walk_block(paragraph, {
        Str = function (elem)
          -- Do we have the start of a link?
          if elem.text:sub(1, #link_start) == link_start then
            -- Begin a link
            in_link = true
            if strip_links == 'unlink' then
              elem.text = elem.text:sub(#link_start + 1)
            end
          -- Do we have the end of a link?
          elseif elem.text:sub(#elem.text - #link_end + 1) == link_end then
            -- End a link
            in_link = false
            if strip_links == 'unlink' then
              elem.text = elem.text:sub(1, #elem.text - #link_end)
            elseif strip_links == 'full' then
              -- Since in_link will be false below, we have to return early
              return pandoc.Null()
            end
          end

          if in_link and strip_links == 'full' then
            return pandoc.Null()
          else
            return elem
          end
        end,
      })
    end
  }
}

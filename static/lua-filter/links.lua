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
      end
      return meta
    end
  },
  {
    -- Since links can contain whitespace, we need to walk a full paragraph at
    -- a time and remember where we are
    Para = function (paragraph)
      if strip_links == 'no' then
        return paragraph -- nothing to do
      end

      local in_link = false

      return pandoc.walk_block(paragraph, {
        -- Str is whitespace-separated text
        Str = function (elem)

          -- We know that we must either unlink or remove internal links
          local has_link_start = elem.text:sub(1, #link_start) == link_start
          local has_link_end = elem.text:sub(#elem.text - #link_end + 1) == link_end

          if strip_links == 'unlink' then
            -- Unlink internal links
            if has_link_start then
              -- Only beginning of link
              elem.text = elem.text:sub(#link_start + 1)
            end
            if has_link_end then
              -- Only ending of link
              elem.text = elem.text:sub(1, #elem.text - #link_end)
            end

            -- In any case: Return the (modified) elem
            return elem
          else
            -- Remove internal links
            if has_link_start and not has_link_end then
              in_link = true
            elseif has_link_end and not has_link_start then
              in_link = false
            end

            -- Remove beginnings, endings, or anything in between
            if has_link_start or has_link_end or in_link then
              return pandoc.Str("")
            end
          end
        end,
      })
    end
  }
}

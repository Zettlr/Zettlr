module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"formatting\">\n  <a href=\"#\" class=\"markdownHeading1\" id=\"header-formatting\">\n    <span class=\"markdownHeading1\">#</span>\n    <span class=\"markdownHeading2\">#</span>\n    <span class=\"markdownHeading3\">#</span>\n    <span class=\"markdownHeading4\">#</span>\n    <span class=\"markdownHeading5\">#</span>\n    <span class=\"markdownHeading6\">#</span>\n  </a>\n  <a href=\"#\" class=\"markdownBold\"><clr-icon shape=\"bold\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.bold",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":10,"column":69},"end":{"line":10,"column":99}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownItalic\"><clr-icon shape=\"italic\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.italic",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":73},"end":{"line":11,"column":105}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownCode\"><clr-icon shape=\"code-alt\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.code",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":12,"column":73},"end":{"line":12,"column":103}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownComment\"><clr-icon shape=\"code\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.comment",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":13,"column":72},"end":{"line":13,"column":105}}}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownLink\"><clr-icon shape=\"link\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.link",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":15,"column":69},"end":{"line":15,"column":99}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownImage\"><clr-icon shape=\"image\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.image",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":16,"column":71},"end":{"line":16,"column":102}}}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownBlockquote\"><clr-icon shape=\"block-quote\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.blockquote",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":18,"column":82},"end":{"line":18,"column":118}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownMakeOrderedList\"><clr-icon shape=\"number-list\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.ol",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":19,"column":87},"end":{"line":19,"column":115}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownMakeUnorderedList\"><clr-icon shape=\"bullet-list\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.ul",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":20,"column":89},"end":{"line":20,"column":117}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownMakeTaskList\"><clr-icon shape=\"checkbox-list\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.tasklist",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":21,"column":86},"end":{"line":21,"column":120}}}))
    + "</a>\n  <a href=\"#\" class=\"markdownInsertTable\"><clr-icon shape=\"table\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.insert_table",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":22,"column":77},"end":{"line":22,"column":115}}}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownDivider\"><clr-icon shape=\"minus\"></clr-icon>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.divider",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":24,"column":73},"end":{"line":24,"column":106}}}))
    + "</a>\n  <a href=\"#\" class=\"insertFootnote\"><span class=\"fn-icon\">x<sup>2</sup></span>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.footnote",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":25,"column":79},"end":{"line":25,"column":113}}}))
    + "</a>\n  <a href=\"#\" class=\"removeFootnote\"><span class=\"fn-icon\" style=\"text-decoration: line-through\">x<sup>2</sup></span>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.formatting.remove_footnote",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":26,"column":117},"end":{"line":26,"column":158}}}))
    + "</a>\n</div>\n";
},"useData":true}
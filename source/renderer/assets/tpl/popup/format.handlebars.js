module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"formatting\">\n  <a href=\"#\" class=\"markdownHeading1\" id=\"header-formatting\">\n    <span class=\"markdownHeading1\">#</span>\n    <span class=\"markdownHeading2\">#</span>\n    <span class=\"markdownHeading3\">#</span>\n    <span class=\"markdownHeading4\">#</span>\n    <span class=\"markdownHeading5\">#</span>\n    <span class=\"markdownHeading6\">#</span>\n  </a>\n  <hr>\n  <a href=\"#\" class=\"markdownBold\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.bold",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"markdownItalic\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.italic",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"markdownCode\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.code",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownLink\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.link",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"markdownImage\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.image",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownBlockquote\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.blockquote",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"markdownMakeOrderedList\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.ol",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"markdownMakeUnorderedList\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.ul",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"markdownDivider\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.divider",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <hr>\n  <a href=\"#\" class=\"insertFootnote\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.footnote",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n  <a href=\"#\" class=\"removeFootnote\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.formatting.remove_footnote",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n</div>\n";
},"useData":true}
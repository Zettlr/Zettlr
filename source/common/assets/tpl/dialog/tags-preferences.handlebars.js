module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "              <div>\n                <input type=\"text\" name=\"prefs-tags-name\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":11,"column":65},"end":{"line":11,"column":73}}}) : helper)))
    + "\" placeholder=\""
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tags.name_desc",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":88},"end":{"line":11,"column":120}}}))
    + "\">\n                <input type=\"color\" name=\"prefs-tags-color\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"color") || (depth0 != null ? lookupProperty(depth0,"color") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"color","hash":{},"data":data,"loc":{"start":{"line":12,"column":67},"end":{"line":12,"column":76}}}) : helper)))
    + "\" placeholder=\""
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tags.color_desc",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":12,"column":91},"end":{"line":12,"column":124}}}))
    + "\">\n                <input type=\"text\" name=\"prefs-tags-desc\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"desc") || (depth0 != null ? lookupProperty(depth0,"desc") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"desc","hash":{},"data":data,"loc":{"start":{"line":13,"column":65},"end":{"line":13,"column":73}}}) : helper)))
    + "\" placeholder=\""
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tags.desc_desc",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":13,"column":88},"end":{"line":13,"column":120}}}))
    + "\">\n                <button type=\"button\" onclick=\"$(this).parent().detach()\">-</button></div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tags.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":36}}}))
    + "</h1>\n    <form  action=\"\" method=\"GET\" id=\"dialog\">\n        <div>\n            <p>\n                "
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tags.description",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":6,"column":16},"end":{"line":6,"column":50}}}))
    + "\n            </p>\n            <div id=\"prefs-taglist\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,depth0,{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":9,"column":14},"end":{"line":15,"column":23}}})) != null ? stack1 : "")
    + "            </div>\n        </div>\n        <button type=\"button\" id=\"addTagLine\" class=\"icon\"><clr-icon shape=\"plus\"></clr-icon></button>\n        <button type=\"submit\" id=\"pref-save\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.save",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":19,"column":45},"end":{"line":19,"column":74}}}))
    + "</button>\n        <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.cancel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":20,"column":27},"end":{"line":20,"column":58}}}))
    + "</button>\n    </form>\n</div>\n";
},"useData":true}
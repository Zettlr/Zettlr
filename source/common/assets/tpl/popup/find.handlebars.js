module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"search\">\n  <div class=\"row\">\n    <input type=\"text\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.find.find_placeholder",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":36},"end":{"line":3,"column":75}}}))
    + "\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"search") || (depth0 != null ? lookupProperty(depth0,"search") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"search","hash":{},"data":data,"loc":{"start":{"line":3,"column":84},"end":{"line":3,"column":96}}}) : helper)))
    + "\" id=\"searchWhat\">\n    <button id=\"searchNext\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.find.find_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":4,"column":28},"end":{"line":4,"column":61}}}))
    + "</button>\n  </div>\n  <div class=\"row\">\n    <input type=\"text\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.find.replace_placeholder",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":7,"column":36},"end":{"line":7,"column":78}}}))
    + "\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"replace") || (depth0 != null ? lookupProperty(depth0,"replace") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"replace","hash":{},"data":data,"loc":{"start":{"line":7,"column":87},"end":{"line":7,"column":100}}}) : helper)))
    + "\" id=\"replaceWhat\">\n    <button id=\"replaceNext\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.find.replace_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":8,"column":29},"end":{"line":8,"column":65}}}))
    + "</button>\n    <button id=\"replaceAll\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.find.replace_all_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":9,"column":28},"end":{"line":9,"column":68}}}))
    + "</button>\n  </div>\n</div>\n";
},"useData":true}
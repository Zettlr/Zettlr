module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <span class=\"tag\" data-tag=\"#"
    + alias4(((helper = (helper = lookupProperty(helpers,"text") || (depth0 != null ? lookupProperty(depth0,"text") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data,"loc":{"start":{"line":7,"column":37},"end":{"line":7,"column":47}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"text") || (depth0 != null ? lookupProperty(depth0,"text") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"text","hash":{},"data":data,"loc":{"start":{"line":7,"column":49},"end":{"line":7,"column":59}}}) : helper)))
    + " <small>"
    + alias4(((helper = (helper = lookupProperty(helpers,"count") || (depth0 != null ? lookupProperty(depth0,"count") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"count","hash":{},"data":data,"loc":{"start":{"line":7,"column":67},"end":{"line":7,"column":78}}}) : helper)))
    + "<clr-icon shape=\"times\"></clr-icon></small></span>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tag_cloud.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":42}}}))
    + "</h1>\n    <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tag_cloud.info",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":7},"end":{"line":3,"column":40}}}))
    + "</p>\n    <p><input type=\"text\" id=\"filter-tags\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.filter_tags",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":4,"column":56},"end":{"line":4,"column":85}}}))
    + "\"></p>\n    <p>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"tags") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":8},"end":{"line":8,"column":17}}})) != null ? stack1 : "")
    + "    </p>\n    <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.close",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":10,"column":23},"end":{"line":10,"column":53}}}))
    + "</button>\n    <button id=\"copy-to-clipboard\" class=\"copy-clipboard\" data-copy-clipboard=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"tag_list") || (depth0 != null ? lookupProperty(depth0,"tag_list") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"tag_list","hash":{},"data":data,"loc":{"start":{"line":11,"column":79},"end":{"line":11,"column":93}}}) : helper)))
    + "\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.tag_cloud.copy",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":95},"end":{"line":11,"column":127}}}))
    + "</button>\n</div>\n";
},"useData":true}
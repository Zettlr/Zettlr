module.exports = {"1":function(container,depth0,helpers,partials,data) {
    return " selected=\"selected\"";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<form action=\"#\" method=\"GET\" class=\"set-target\">\n  <input type=\"number\" min=\"0\" name=\"count\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"count") || (depth0 != null ? lookupProperty(depth0,"count") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"count","hash":{},"data":data,"loc":{"start":{"line":2,"column":51},"end":{"line":2,"column":62}}}) : helper)))
    + "\">\n  <select name=\"mode\">\n    <option value=\"words\""
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"mode") : depth0),"=","words",{"name":"ifCond","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":4,"column":25},"end":{"line":4,"column":84}}})) != null ? stack1 : "")
    + ">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.target.words",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":4,"column":85},"end":{"line":4,"column":115}}}))
    + "</option>\n    <option value=\"chars\""
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"mode") : depth0),"=","chars",{"name":"ifCond","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":5,"column":25},"end":{"line":5,"column":84}}})) != null ? stack1 : "")
    + ">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.target.chars",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":5,"column":85},"end":{"line":5,"column":115}}}))
    + "</option>\n  </select>\n  <button type=\"submit\" class=\"button\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.target.set",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":7,"column":39},"end":{"line":7,"column":67}}}))
    + "</button>\n</form>\n";
},"useData":true}
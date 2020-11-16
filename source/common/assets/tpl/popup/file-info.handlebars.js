module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias3(((helper = (helper = lookupProperty(helpers,"words_sel") || (depth0 != null ? lookupProperty(depth0,"words_sel") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"words_sel","hash":{},"data":data,"loc":{"start":{"line":17,"column":41},"end":{"line":17,"column":54}}}) : helper)))
    + "</strong></td>\n    <td>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.file_words_sel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":18,"column":8},"end":{"line":18,"column":37}}}))
    + "</td>\n  </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias3(((helper = (helper = lookupProperty(helpers,"chars_sel") || (depth0 != null ? lookupProperty(depth0,"chars_sel") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"chars_sel","hash":{},"data":data,"loc":{"start":{"line":24,"column":41},"end":{"line":24,"column":54}}}) : helper)))
    + "</strong></td>\n    <td>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.file_chars_sel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":25,"column":8},"end":{"line":25,"column":37}}}))
    + "</td>\n  </tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<table>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"words") || (depth0 != null ? lookupProperty(depth0,"words") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"words","hash":{},"data":data,"loc":{"start":{"line":3,"column":41},"end":{"line":3,"column":50}}}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.file_words",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":4,"column":8},"end":{"line":4,"column":33}}}))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"chars") || (depth0 != null ? lookupProperty(depth0,"chars") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chars","hash":{},"data":data,"loc":{"start":{"line":7,"column":41},"end":{"line":7,"column":50}}}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.file_chars",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":8,"column":33}}}))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"chars_wo_spaces") || (depth0 != null ? lookupProperty(depth0,"chars_wo_spaces") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chars_wo_spaces","hash":{},"data":data,"loc":{"start":{"line":11,"column":41},"end":{"line":11,"column":60}}}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.file_chars_wo_spaces",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":12,"column":8},"end":{"line":12,"column":43}}}))
    + "</td>\n  </tr>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"words_sel") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":15,"column":2},"end":{"line":20,"column":9}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"chars_sel") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":2},"end":{"line":27,"column":9}}})) != null ? stack1 : "")
    + "</table>\n";
},"useData":true}
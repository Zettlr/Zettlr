module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n    <h1>"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":19}}}) : helper)))
    + "</h1>\n    <p>"
    + alias4(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"message","hash":{},"data":data,"loc":{"start":{"line":3,"column":7},"end":{"line":3,"column":20}}}) : helper)))
    + "</p>\n    <div class=\"code\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"additionalInfo") || (depth0 != null ? lookupProperty(depth0,"additionalInfo") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"additionalInfo","hash":{},"data":data,"loc":{"start":{"line":4,"column":22},"end":{"line":4,"column":42}}}) : helper)))
    + "</div>\n    <button id=\"abort\">"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.close",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":5,"column":23},"end":{"line":5,"column":53}}}))
    + "</button>\n</div>\n";
},"useData":true}
module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div>\n  <form action=\"#\" method=\"GET\">\n    <input type=\"text\" class=\"small\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"val") || (depth0 != null ? lookupProperty(depth0,"val") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"val","hash":{},"data":data,"loc":{"start":{"line":3,"column":44},"end":{"line":3,"column":51}}}) : helper)))
    + "\" placeholder=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"placeholder") || (depth0 != null ? lookupProperty(depth0,"placeholder") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"placeholder","hash":{},"data":data,"loc":{"start":{"line":3,"column":66},"end":{"line":3,"column":81}}}) : helper)))
    + "\" name=\"name\" required>\n  </form>\n</div>\n";
},"useData":true}
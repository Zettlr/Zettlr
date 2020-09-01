module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n  <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.custom_css.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":6},"end":{"line":2,"column":41}}}))
    + "</h1>\n  <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.custom_css.info",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":5},"end":{"line":3,"column":39}}}))
    + "</p>\n  <textarea id=\"custom-css\">"
    + alias3(((helper = (helper = lookupProperty(helpers,"styles") || (depth0 != null ? lookupProperty(depth0,"styles") : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"styles","hash":{},"data":data,"loc":{"start":{"line":4,"column":28},"end":{"line":4,"column":40}}}) : helper)))
    + "</textarea>\n  <div>\n    <button id=\"save\" class=\"btn-default\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.save",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":6,"column":42},"end":{"line":6,"column":71}}}))
    + "</button>\n    <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.cancel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":7,"column":23},"end":{"line":7,"column":54}}}))
    + "</button>\n  </div>\n</div>\n";
},"useData":true}
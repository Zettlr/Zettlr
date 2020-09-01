module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"pomodoro\">\n  <p><span id=\"pomodoro-phase-type\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"type") || (depth0 != null ? lookupProperty(depth0,"type") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data,"loc":{"start":{"line":2,"column":36},"end":{"line":2,"column":44}}}) : helper)))
    + "</span></p>\n  <p><span id=\"pomodoro-time-remaining\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"time") || (depth0 != null ? lookupProperty(depth0,"time") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"time","hash":{},"data":data,"loc":{"start":{"line":3,"column":40},"end":{"line":3,"column":48}}}) : helper)))
    + "</span></p>\n  <button id=\"pomodoro-stop-button\">"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"pomodoro.stop",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":4,"column":36},"end":{"line":4,"column":60}}}))
    + "</button>\n</div>\n";
},"useData":true}
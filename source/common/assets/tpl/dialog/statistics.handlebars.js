module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n  <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":6},"end":{"line":2,"column":40}}}))
    + "</h1>\n  <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":5},"end":{"line":3,"column":39}}}))
    + "</p>\n  <div style=\"text-align: center;\">\n    <span id=\"prev-sheet\">\n      <clr-icon shape=\"caret left\"></clr-icon>\n    </span>\n    <select id=\"data-mode\">\n      <option value=\"week\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.week",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":9,"column":27},"end":{"line":9,"column":60}}}))
    + "</option>\n      <option value=\"month\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.month",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":10,"column":28},"end":{"line":10,"column":62}}}))
    + "</option>\n      <option value=\"year\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.year",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":27},"end":{"line":11,"column":60}}}))
    + "</option>\n    </select>\n    <span id=\"next-sheet\">\n      <clr-icon shape=\"caret right\"></clr-icon>\n    </span>\n    <br>\n    <progress id=\"current-sheet-info\" value=\"0\" max=\"0\"></progress>\n  </div>\n  <canvas id=\"canvas\"></canvas>\n  <div class=\"cb-group\">\n    <label class=\"cb-toggle\">\n      <input type=\"checkbox\" value=\"yes\" id=\"data-compare\">\n      <div class=\"toggle\"></div>\n    </label>\n    <label for=\"data-compare\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.statistics.compare",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":25,"column":30},"end":{"line":25,"column":66}}}))
    + "</label>\n    <p><small>"
    + alias3(((helper = (helper = lookupProperty(helpers,"days") || (depth0 != null ? lookupProperty(depth0,"days") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"days","hash":{},"data":data,"loc":{"start":{"line":26,"column":14},"end":{"line":26,"column":24}}}) : helper)))
    + " days logged since "
    + alias3(((helper = (helper = lookupProperty(helpers,"firstDay") || (depth0 != null ? lookupProperty(depth0,"firstDay") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"firstDay","hash":{},"data":data,"loc":{"start":{"line":26,"column":43},"end":{"line":26,"column":57}}}) : helper)))
    + ".</small></p>\n  </div>\n  <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.close",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":28,"column":21},"end":{"line":28,"column":51}}}))
    + "</button>\n</div>\n";
},"useData":true}
module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<form class=\"pomodoro\" method=\"GET\" action=\"#\">\n  <input type=\"number\" class=\"pomodoro-task\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"duration_task") || (depth0 != null ? lookupProperty(depth0,"duration_task") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_task","hash":{},"data":data,"loc":{"start":{"line":2,"column":52},"end":{"line":2,"column":69}}}) : helper)))
    + "\" name=\"task\" min=\"1\" max=\"100\" required>\n  <input type=\"number\" class=\"pomodoro-short\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"duration_short") || (depth0 != null ? lookupProperty(depth0,"duration_short") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_short","hash":{},"data":data,"loc":{"start":{"line":3,"column":53},"end":{"line":3,"column":71}}}) : helper)))
    + "\" name=\"short\" min=\"1\" max=\"100\" required>\n  <input type=\"number\" class=\"pomodoro-long\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"duration_long") || (depth0 != null ? lookupProperty(depth0,"duration_long") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_long","hash":{},"data":data,"loc":{"start":{"line":4,"column":52},"end":{"line":4,"column":69}}}) : helper)))
    + "\" name=\"long\" min=\"1\" max=\"100\" required>\n  <div class=\"pomodoro-sound-container\">\n    <clr-icon shape=\"music-note\" class=\"is-solid\"></clr-icon>\n    <span id=\"pomodoro-volume-level\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"volume") || (depth0 != null ? lookupProperty(depth0,"volume") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"volume","hash":{},"data":data,"loc":{"start":{"line":8,"column":37},"end":{"line":8,"column":49}}}) : helper)))
    + "%</span>\n  </div>\n  <input type=\"range\" id=\"pomodoro-volume-range\" name=\"volume\" min=\"0\" max=\"100\" value=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"volume") || (depth0 != null ? lookupProperty(depth0,"volume") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"volume","hash":{},"data":data,"loc":{"start":{"line":10,"column":88},"end":{"line":10,"column":98}}}) : helper)))
    + "\">\n  <input type=\"submit\" value=\""
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"pomodoro.start",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":30},"end":{"line":11,"column":55}}}))
    + "\">\n</form>\n";
},"useData":true}
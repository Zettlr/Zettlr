module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p><strong>"
    + container.escapeExpression((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"gui.avg_surpassed",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":29,"column":11},"end":{"line":29,"column":39}}}))
    + "</strong></p>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"cmpToday") : depth0),"<=",(depth0 != null ? lookupProperty(depth0,"cmpAvg") : depth0),{"name":"ifCond","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":33,"column":0},"end":{"line":35,"column":11}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p><strong>"
    + container.escapeExpression((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"gui.avg_close_to",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":34,"column":11},"end":{"line":34,"column":38}}}))
    + "</strong></p>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p><strong>"
    + container.escapeExpression((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"gui.avg_not_reached",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":39,"column":11},"end":{"line":39,"column":41}}}))
    + "</strong></p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<table>\n  <tr>\n    <td style=\"text-align:right\">\n      <strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"displaySum") || (depth0 != null ? lookupProperty(depth0,"displaySum") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"displaySum","hash":{},"data":data,"loc":{"start":{"line":4,"column":14},"end":{"line":4,"column":30}}}) : helper)))
    + "</strong>\n    </td>\n    <td>\n      "
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.words_last_month",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":7,"column":37}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\">\n      <strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"avgMonth") || (depth0 != null ? lookupProperty(depth0,"avgMonth") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"avgMonth","hash":{},"data":data,"loc":{"start":{"line":12,"column":14},"end":{"line":12,"column":28}}}) : helper)))
    + "</strong>\n    </td>\n    <td>\n      "
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.avg_words",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":15,"column":6},"end":{"line":15,"column":30}}}))
    + "\n    </td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\">\n      <strong>"
    + alias4(((helper = (helper = lookupProperty(helpers,"today") || (depth0 != null ? lookupProperty(depth0,"today") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"today","hash":{},"data":data,"loc":{"start":{"line":20,"column":14},"end":{"line":20,"column":25}}}) : helper)))
    + "</strong>\n    </td>\n    <td>\n      "
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.today_words",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":23,"column":6},"end":{"line":23,"column":32}}}))
    + "\n    </td>\n  </tr>\n</table>\n\n"
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"cmpToday") : depth0),">",(depth0 != null ? lookupProperty(depth0,"cmpAvg") : depth0),{"name":"ifCond","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":28,"column":0},"end":{"line":30,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"cmpToday") : depth0),">",(depth0 != null ? lookupProperty(depth0,"cmpAvgHalf") : depth0),{"name":"ifCond","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":32,"column":0},"end":{"line":36,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,(depth0 != null ? lookupProperty(depth0,"cmpToday") : depth0),"<=",(depth0 != null ? lookupProperty(depth0,"cmpAvgHalf") : depth0),{"name":"ifCond","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":38,"column":0},"end":{"line":40,"column":11}}})) != null ? stack1 : "")
    + "\n<p><a class=\"button\" id=\"more-stats\">"
    + alias4((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"gui.statistics_more",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":42,"column":37},"end":{"line":42,"column":67}}}))
    + "</a></p>\n";
},"useData":true}
module.exports = {"1":function(container,depth0,helpers,partials,data) {
    return "    <div class=\"alert warning\">\n      This is a beta release.\n    </div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4="function", lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.update.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":38}}}))
    + ": "
    + alias3(((helper = (helper = lookupProperty(helpers,"newVer") || (depth0 != null ? lookupProperty(depth0,"newVer") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"newVer","hash":{},"data":data,"loc":{"start":{"line":2,"column":40},"end":{"line":2,"column":50}}}) : helper)))
    + "</h1>\n    <p><strong>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.update.current_version",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":15},"end":{"line":3,"column":55}}}))
    + ": "
    + alias3(((helper = (helper = lookupProperty(helpers,"curVer") || (depth0 != null ? lookupProperty(depth0,"curVer") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"curVer","hash":{},"data":data,"loc":{"start":{"line":3,"column":57},"end":{"line":3,"column":67}}}) : helper)))
    + "</strong></p>\n    <p>\n        "
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.update.notification",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":5,"column":8},"end":{"line":5,"column":45}}}))
    + "\n    </p>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isBeta") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":7,"column":4},"end":{"line":11,"column":11}}})) != null ? stack1 : "")
    + "    <div class=\"changelog\">\n        "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"changelog") || (depth0 != null ? lookupProperty(depth0,"changelog") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"changelog","hash":{},"data":data,"loc":{"start":{"line":13,"column":8},"end":{"line":13,"column":23}}}) : helper))) != null ? stack1 : "")
    + "\n    </div>\n    <a href=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"downloadLink") || (depth0 != null ? lookupProperty(depth0,"downloadLink") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"downloadLink","hash":{},"data":data,"loc":{"start":{"line":15,"column":13},"end":{"line":15,"column":29}}}) : helper)))
    + "\" target=\"_blank\" class=\"button\" onclick=\"require('electron').shell.openExternal(this.getAttribute('href')); return false;\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.update.release_url",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":15,"column":153},"end":{"line":15,"column":189}}}))
    + "</a>\n    <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.close",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":16,"column":23},"end":{"line":16,"column":53}}}))
    + "</button>\n</div>\n";
},"useData":true}
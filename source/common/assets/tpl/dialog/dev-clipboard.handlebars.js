module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <img src=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"clipboardImage") || (depth0 != null ? lookupProperty(depth0,"clipboardImage") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clipboardImage","hash":{},"data":data,"loc":{"start":{"line":22,"column":14},"end":{"line":22,"column":34}}}) : helper)))
    + "\">\n    <span class=\"info\">Image dimensions: "
    + alias4(((helper = (helper = lookupProperty(helpers,"imgWidth") || (depth0 != null ? lookupProperty(depth0,"imgWidth") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"imgWidth","hash":{},"data":data,"loc":{"start":{"line":23,"column":41},"end":{"line":23,"column":55}}}) : helper)))
    + "&times;"
    + alias4(((helper = (helper = lookupProperty(helpers,"imgHeight") || (depth0 != null ? lookupProperty(depth0,"imgHeight") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"imgHeight","hash":{},"data":data,"loc":{"start":{"line":23,"column":62},"end":{"line":23,"column":77}}}) : helper)))
    + "</span>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "    <pre style=\"white-space: pre-wrap\"><code style=\"display: block\">The Clipboard does not contain an image.</code></pre>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n  <h1>Inspect Clipboard</h1>\n  <p>\n    Here you can inspect the current contents of the clipboard.\n    <strong>Note</strong>: This is a developer feature.\n  </p>\n  <h2>HTML Contents</h2>\n  <p>\n    <pre style=\"white-space: pre-wrap\"><code style=\"display: block\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"clipboardHTML") || (depth0 != null ? lookupProperty(depth0,"clipboardHTML") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clipboardHTML","hash":{},"data":data,"loc":{"start":{"line":9,"column":68},"end":{"line":9,"column":87}}}) : helper)))
    + "</code></pre>\n  </p>\n  <h2>Text Contents</h2>\n  <p>\n    <pre style=\"white-space: pre-wrap\"><code style=\"display: block\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"clipboardText") || (depth0 != null ? lookupProperty(depth0,"clipboardText") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clipboardText","hash":{},"data":data,"loc":{"start":{"line":13,"column":68},"end":{"line":13,"column":87}}}) : helper)))
    + "</code></pre>\n  </p>\n  <h2>RichText Contents</h2>\n  <p>\n    <pre style=\"white-space: pre-wrap\"><code style=\"display: block\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"clipboardRTF") || (depth0 != null ? lookupProperty(depth0,"clipboardRTF") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"clipboardRTF","hash":{},"data":data,"loc":{"start":{"line":17,"column":68},"end":{"line":17,"column":86}}}) : helper)))
    + "</code></pre>\n  </p>\n  <h2>Image</h2>\n  <p>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"clipboardImage") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":21,"column":4},"end":{"line":26,"column":11}}})) != null ? stack1 : "")
    + "  </p>\n  <div>\n    <button id=\"abort\">Close</button>\n  </div>\n</div>\n";
},"useData":true}
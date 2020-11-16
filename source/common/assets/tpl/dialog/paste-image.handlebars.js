module.exports = {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4="function", alias5=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n  <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":6},"end":{"line":2,"column":42}}}))
    + "</h1>\n  <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.info",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":3,"column":5},"end":{"line":3,"column":40}}}))
    + "</p>\n  <p>\n    <img class=\"image-preview\" src=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"img") || (depth0 != null ? lookupProperty(depth0,"img") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"img","hash":{},"data":data,"loc":{"start":{"line":5,"column":36},"end":{"line":5,"column":45}}}) : helper)))
    + "\">\n  </p>\n  <div class=\"box-left\">\n    <p>\n      "
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.dimensions",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":9,"column":6},"end":{"line":9,"column":46}}}))
    + ": <strong>"
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"width") : stack1), depth0))
    + "&times;"
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"height") : stack1), depth0))
    + "px</strong>\n    </p>\n    <label for=\"img-name\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.name_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":11,"column":26},"end":{"line":11,"column":66}}}))
    + "</label>\n    <input type=\"text\" id=\"img-name\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"imageName") || (depth0 != null ? lookupProperty(depth0,"imageName") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"imageName","hash":{},"data":data,"loc":{"start":{"line":12,"column":44},"end":{"line":12,"column":59}}}) : helper)))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.name_placeholder",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":12,"column":74},"end":{"line":12,"column":120}}}))
    + "\">\n  </div>\n  <div class=\"box-right\">\n    <p>\n      <label for=\"img-width\">Resize image to</label>\n      <input type=\"number\" id=\"img-width\" max=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"width") : stack1), depth0))
    + "\" min=\"1\" placeholder=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"width") : stack1), depth0))
    + "\">\n      <input type=\"number\" id=\"img-height\" max=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"height") : stack1), depth0))
    + "\" min=\"1\" placeholder=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"size") : depth0)) != null ? lookupProperty(stack1,"height") : stack1), depth0))
    + "\">\n      <input type=\"hidden\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"aspect") || (depth0 != null ? lookupProperty(depth0,"aspect") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"aspect","hash":{},"data":data,"loc":{"start":{"line":19,"column":34},"end":{"line":19,"column":46}}}) : helper)))
    + "\" id=\"aspect-ratio\">\n    </p>\n    <div class=\"cb-group\">\n      <label class=\"cb-toggle\">\n        <input type=\"checkbox\" value=\"yes\" id=\"aspect\" checked=\"checked\">\n        <div class=\"toggle\"></div>\n      </label>\n      <label for=\"aspect\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.retain_aspect_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":26,"column":26},"end":{"line":26,"column":75}}}))
    + "</label>\n    </div>\n  </div>\n  <div class=\"clearfix\">\n    <button id=\"save-cwd\" class=\"btn-default\" data-default-action=\"data-default-action\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.paste_image.save_cwd",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":30,"column":88},"end":{"line":30,"column":126}}}))
    + "</button>\n    <button id=\"save-other\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.choose_path",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":31,"column":28},"end":{"line":31,"column":64}}}))
    + "</button>\n    <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.close",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":32,"column":23},"end":{"line":32,"column":53}}}))
    + "</button>\n  </div>\n</div>\n";
},"useData":true}
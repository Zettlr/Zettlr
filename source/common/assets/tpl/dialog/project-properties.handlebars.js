module.exports = {"1":function(container,depth0,helpers,partials,data) {
    return "checked=\"checked\"";
},"3":function(container,depth0,helpers,partials,data) {
    return "selected=\"selected\"";
},"5":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <option value=\""
    + alias2(alias1(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"=",(depths[1] != null ? lookupProperty(depths[1],"format") : depths[1]),{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":57,"column":37},"end":{"line":57,"column":97}}})) != null ? stack1 : "")
    + ">"
    + alias2(alias1(depth0, depth0))
    + "</option>\n";
},"7":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <option value=\""
    + alias2(alias1(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"margin_unit") : stack1),{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":90,"column":37},"end":{"line":90,"column":106}}})) != null ? stack1 : "")
    + ">"
    + alias2(alias1(depth0, depth0))
    + "</option>\n";
},"9":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <option value=\""
    + alias2(alias1(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"papertype") : stack1),{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":97,"column":37},"end":{"line":97,"column":104}}})) != null ? stack1 : "")
    + ">"
    + alias2(alias1(depth0, depth0))
    + "</option>\n";
},"11":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : (container.nullContext || {}), alias3=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "            <option value=\""
    + alias1(container.lambda(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias3).call(alias2,depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"pagenumbering") : stack1),{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":104,"column":37},"end":{"line":104,"column":108}}})) != null ? stack1 : "")
    + ">"
    + alias1((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias3).call(alias2,"dialog.preferences.pdf.pagenumbering_",depth0,{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":104,"column":109},"end":{"line":104,"column":163}}}))
    + "</option>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4="function", alias5=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n  <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.project.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":6},"end":{"line":2,"column":49}}}))
    + ": "
    + alias3(((helper = (helper = lookupProperty(helpers,"projectDirectory") || (depth0 != null ? lookupProperty(depth0,"projectDirectory") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"projectDirectory","hash":{},"data":data,"loc":{"start":{"line":2,"column":51},"end":{"line":2,"column":71}}}) : helper)))
    + "</h1>\n  <form action=\"\" method=\"GET\" id=\"dialog\">\n    <!-- Transmit the project's hash as well. -->\n    <input type=\"hidden\" name=\"projectHash\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"hash") || (depth0 != null ? lookupProperty(depth0,"hash") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"hash","hash":{},"data":data,"loc":{"start":{"line":5,"column":51},"end":{"line":5,"column":59}}}) : helper)))
    + "\">\n    <div id=\"prefs-tabs\" class=\"clear\">\n      <ul>\n        <li><a href=\"#prefs-tabs-general\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.metadata",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":8,"column":42},"end":{"line":8,"column":84}}}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-page\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.page",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":9,"column":39},"end":{"line":9,"column":77}}}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-font\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.font",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":10,"column":39},"end":{"line":10,"column":77}}}))
    + "</a></li>\n      </ul>\n      <!-- Metadata for PDF files -->\n      <div id=\"prefs-tabs-general\">\n        <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.metadata_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":14,"column":11},"end":{"line":14,"column":59}}}))
    + "</p>\n        <div class=\"box-left\">\n          <label for=\"title\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.project.title_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":16,"column":29},"end":{"line":16,"column":78}}}))
    + "</label>\n          <input type=\"text\" name=\"title\" id=\"title\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":17,"column":60},"end":{"line":17,"column":69}}}) : helper)))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.project.title_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":17,"column":84},"end":{"line":17,"column":133}}}))
    + "\">\n          <label for=\"pdf.author\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.author_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":18,"column":34},"end":{"line":18,"column":80}}}))
    + "</label>\n          <input type=\"text\" name=\"pdf.author\" id=\"pdf.author\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"author") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.author",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":19,"column":99},"end":{"line":19,"column":139}}}))
    + "\">\n          <label for=\"pdf.keywords\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.keywords_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":20,"column":36},"end":{"line":20,"column":84}}}))
    + "</label>\n          <input type=\"text\" name=\"pdf.keywords\" if=\"pdf.keywords\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"keywords") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.keywords",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":21,"column":105},"end":{"line":21,"column":147}}}))
    + "\">\n          <hr>\n          <label for=\"textpl\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.textpl",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":23,"column":30},"end":{"line":23,"column":70}}}))
    + "</label>\n          <div class=\"input-button-group\">\n            <input type=\"text\" name=\"pdf.textpl\" id=\"textpl\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"textpl") : stack1), depth0))
    + "\">\n            <button type=\"button\" class=\"request-file\"\n            data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.choose_file",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":27,"column":32},"end":{"line":27,"column":73}}}))
    + "\"\n            data-request-name=\"TeX Template File\"\n            data-request-ext=\"tex\"\n            data-request-target=\"#textpl\"><clr-icon shape=\"file\"></clr-icon></button>\n          </div>\n        </div>\n        <div class=\"box-right\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" value=\"yes\" name=\"pdf.titlepage\" id=\"pdf.titlepage\" "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"titlepage") : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":87},"end":{"line":35,"column":132}}})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"pdf.titlepage\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.titlepage_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":38,"column":37},"end":{"line":38,"column":86}}}))
    + "</label>\n          <div class=\"clearfix\"></div>\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" value=\"yes\" name=\"pdf.toc\" id=\"pdf.toc\" "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"toc") : stack1),{"name":"if","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":41,"column":75},"end":{"line":41,"column":114}}})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"pdf.toc\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.toc_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":44,"column":31},"end":{"line":44,"column":74}}}))
    + "</label>\n          <select name=\"pdf.tocDepth\">\n            <option value=\"1\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",1,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":46,"column":30},"end":{"line":46,"column":90}}})) != null ? stack1 : "")
    + ">1</option>\n            <option value=\"2\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",2,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":47,"column":30},"end":{"line":47,"column":90}}})) != null ? stack1 : "")
    + ">2</option>\n            <option value=\"3\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",3,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":48,"column":30},"end":{"line":48,"column":90}}})) != null ? stack1 : "")
    + ">3</option>\n            <option value=\"4\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",4,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":49,"column":30},"end":{"line":49,"column":90}}})) != null ? stack1 : "")
    + ">4</option>\n            <option value=\"5\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",5,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":50,"column":30},"end":{"line":50,"column":90}}})) != null ? stack1 : "")
    + ">5</option>\n            <option value=\"6\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias2).call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tocDepth") : stack1),"=",6,{"name":"ifCond","hash":{},"fn":container.program(3, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":51,"column":30},"end":{"line":51,"column":90}}})) != null ? stack1 : "")
    + ">6</option>\n          </select>\n          <hr>\n          <label for=\"format\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.project.format",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":54,"column":30},"end":{"line":54,"column":74}}}))
    + "</label>\n          <select name=\"format\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"availableExportFormats") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":56,"column":12},"end":{"line":58,"column":21}}})) != null ? stack1 : "")
    + "          </select>\n          <hr>\n          <label for=\"cslStyle\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.project.csl_style",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":61,"column":32},"end":{"line":61,"column":79}}}))
    + "</label>\n          <div class=\"input-button-group\">\n            <input type=\"text\" name=\"cslStyle\" id=\"cslStyle\" value=\""
    + alias3(((helper = (helper = lookupProperty(helpers,"cslStyle") || (depth0 != null ? lookupProperty(depth0,"cslStyle") : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"cslStyle","hash":{},"data":data,"loc":{"start":{"line":63,"column":68},"end":{"line":63,"column":80}}}) : helper)))
    + "\">\n            <button type=\"button\" class=\"request-file\"\n              data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.choose_file",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":65,"column":34},"end":{"line":65,"column":75}}}))
    + "\"\n              data-request-name=\"Citation Style Language File\"\n              data-request-ext=\"csl\"\n              data-request-target=\"#cslStyle\"><clr-icon shape=\"file\"></clr-icon></button>\n          </div>\n          <div class=\"clearfix\"></div>\n        </div>\n      </div>\n      <!-- Page layout -->\n      <div id=\"prefs-tabs-page\">\n        <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.page_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":75,"column":11},"end":{"line":75,"column":55}}}))
    + "</p>\n        <hr>\n        <div class=\"clear\"></div>\n        <div class=\"box-left\">\n          <div class=\"paper a4paper\">\n            <input class=\"tmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.tmargin\" id=\"pdf.tmargin\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.tmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":80,"column":152},"end":{"line":80,"column":193}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.tmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":80,"column":215},"end":{"line":80,"column":262}}}))
    + "\">\n            <input class=\"rmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.rmargin\" id=\"pdf.rmargin\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"rmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.rmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":81,"column":152},"end":{"line":81,"column":193}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.rmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":81,"column":215},"end":{"line":81,"column":262}}}))
    + "\">\n            <input class=\"bmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.bmargin\" id=\"pdf.bmargin\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"bmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.bmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":82,"column":152},"end":{"line":82,"column":193}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.bmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":82,"column":215},"end":{"line":82,"column":262}}}))
    + "\">\n            <input class=\"lmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.lmargin\" id=\"pdf.lmargin\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"lmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":83,"column":152},"end":{"line":83,"column":193}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":83,"column":215},"end":{"line":83,"column":262}}}))
    + "\">\n          </div>\n        </div>\n        <div class=\"box-right\">\n          <label for=\"pdf.margin_unit\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.unit_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":87,"column":39},"end":{"line":87,"column":83}}}))
    + "</label>\n          <select name=\"pdf.margin_unit\" id=\"pdf.margin_unit\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"availableMarginUnits") : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":89,"column":12},"end":{"line":91,"column":21}}})) != null ? stack1 : "")
    + "          </select>\n          <hr>\n          <label for=\"pdf.papertype\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.papertype",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":94,"column":37},"end":{"line":94,"column":80}}}))
    + "</label>\n          <select name=\"pdf.papertype\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"supportedPapertypes") : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":96,"column":12},"end":{"line":98,"column":21}}})) != null ? stack1 : "")
    + "          </select>\n          <hr>\n          <label for=\"pdf.pagenumbering\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.pagenumbering_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":101,"column":41},"end":{"line":101,"column":94}}}))
    + "</label>\n          <select name=\"pdf.pagenumbering\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"availablePageNumberingSystems") : depth0),{"name":"each","hash":{},"fn":container.program(11, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":103,"column":12},"end":{"line":105,"column":21}}})) != null ? stack1 : "")
    + "          </select>\n        </div>\n        <div class=\"clear\"></div>\n      </div>\n      <!-- Font options -->\n      <div id=\"prefs-tabs-font\">\n        <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.font_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":112,"column":11},"end":{"line":112,"column":55}}}))
    + "</p>\n        <div class=\"box-left\">\n          <label for=\"pdf.mainfont\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.mainfont_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":114,"column":36},"end":{"line":114,"column":84}}}))
    + "</label>\n          <input type=\"text\" name=\"pdf.mainfont\" id=\"mainfont\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"mainfont") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.mainfont",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":115,"column":101},"end":{"line":115,"column":143}}}))
    + "\">\n          <label for=\"pdf.sansfont\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.sansfont_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":116,"column":36},"end":{"line":116,"column":84}}}))
    + "</label>\n          <input type=\"text\" name=\"pdf.sansfont\" id=\"sansfont\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"sansfont") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.sansfont",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":117,"column":101},"end":{"line":117,"column":143}}}))
    + "\">\n          <label for=\"pdf.fontsize\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.fontsize_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":118,"column":36},"end":{"line":118,"column":84}}}))
    + "</label>\n          <input type=\"number\" min=\"0\" max=\"10000\" step=\"1\" name=\"pdf.fontsize\" id=\"fontsize\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"fontsize") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.fontsize",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":119,"column":132},"end":{"line":119,"column":174}}}))
    + "\">\n          <label for=\"pdf.lineheight\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lineheight_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":120,"column":38},"end":{"line":120,"column":88}}}))
    + "</label>\n          <input type=\"number\" min=\"0\" max=\"1000\" step=\"1\" name=\"pdf.lineheight\" id=\"lineheight\" value=\""
    + alias3(alias5(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"lineheight") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lineheight",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":121,"column":137},"end":{"line":121,"column":181}}}))
    + "\">\n        </div>\n        <div class=\"box-right\">\n          <!-- This is the preview tab. It shows how everything will look afterwards. -->\n          <h1 class=\"pdf-preview\">Lorem Ipsum Dolor</h1>\n          <p class=\"pdf-preview\">\n            Lorem ipsum dolor sit amet, consectetur adipisici elit,\n            sed eiusmod tempor incidunt ut labore et dolore magna\n            aliqua. Ut enim ad minim veniam, quis nostrud\n            exercitation ullamco laboris nisi ut aliquid ex ea\n            commodi consequat. Quis aute iure reprehenderit in\n            voluptate velit esse cillum dolore eu fugiat nulla\n            pariatur. Excepteur sint obcaecat cupiditat non proident,\n            sunt in culpa qui officia deserunt mollit anim id est\n            laborum.\n          </p>\n        </div>\n      </div>\n    </div>\n    <div class=\"clearfix\">\n      <button type=\"submit\" id=\"pref-save\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.save",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":141,"column":43},"end":{"line":141,"column":72}}}))
    + "</button>\n      <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.cancel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":142,"column":25},"end":{"line":142,"column":56}}}))
    + "</button>\n      <span class=\"error-info\"></span>\n    </div>\n  </form>\n</div>\n";
},"useData":true,"useDepths":true}
module.exports = {"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <option value=\""
    + alias2(alias1(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"margin_unit") : stack1),{"name":"ifCond","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":45,"column":49},"end":{"line":45,"column":118}}})) != null ? stack1 : "")
    + ">"
    + alias2(alias1(depth0, depth0))
    + "</option>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "selected=\"selected\"";
},"4":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <option value=\""
    + alias2(alias1(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"papertype") : stack1),{"name":"ifCond","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":52,"column":49},"end":{"line":52,"column":116}}})) != null ? stack1 : "")
    + ">"
    + alias2(alias1(depth0, depth0))
    + "</option>\n";
},"6":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : (container.nullContext || {}), alias3=container.hooks.helperMissing, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                        <option value=\""
    + alias1(container.lambda(depth0, depth0))
    + "\" "
    + ((stack1 = (lookupProperty(helpers,"ifCond")||(depth0 && lookupProperty(depth0,"ifCond"))||alias3).call(alias2,depth0,"=",((stack1 = (depths[1] != null ? lookupProperty(depths[1],"pdf") : depths[1])) != null ? lookupProperty(stack1,"pagenumbering") : stack1),{"name":"ifCond","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":59,"column":49},"end":{"line":59,"column":120}}})) != null ? stack1 : "")
    + ">"
    + alias1((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias3).call(alias2,"dialog.preferences.pdf.pagenumbering_",depth0,{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":59,"column":121},"end":{"line":59,"column":175}}}))
    + "</option>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3=container.escapeExpression, alias4=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.title",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":2,"column":8},"end":{"line":2,"column":47}}}))
    + "</h1>\n    <form action=\"\" method=\"GET\" id=\"dialog\">\n        <div id=\"prefs-tabs\" class=\"clear\">\n            <ul>\n                <li><a href=\"#prefs-tabs-general\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.metadata",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":6,"column":50},"end":{"line":6,"column":92}}}))
    + "</a></li>\n                <li><a href=\"#prefs-tabs-page\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.page",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":7,"column":47},"end":{"line":7,"column":85}}}))
    + "</a></li>\n                <li><a href=\"#prefs-tabs-font\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.font",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":8,"column":47},"end":{"line":8,"column":85}}}))
    + "</a></li>\n            </ul>\n            <!-- Metadata for PDF files -->\n            <div id=\"prefs-tabs-general\">\n                <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.metadata_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":12,"column":19},"end":{"line":12,"column":67}}}))
    + "</p>\n                <label for=\"pdf.author\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.author_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":13,"column":40},"end":{"line":13,"column":86}}}))
    + "</label>\n                <input type=\"text\" name=\"pdf.author\" id=\"pdf.author\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"author") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.author",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":14,"column":105},"end":{"line":14,"column":145}}}))
    + "\">\n                <label for=\"pdf.keywords\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.keywords_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":15,"column":42},"end":{"line":15,"column":90}}}))
    + "</label>\n                <input type=\"text\" name=\"pdf.keywords\" if=\"pdf.keywords\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"keywords") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.keywords",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":16,"column":111},"end":{"line":16,"column":153}}}))
    + "\">\n                <hr>\n                <label for=\"textpl\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.textpl",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":18,"column":36},"end":{"line":18,"column":76}}}))
    + "</label>\n                <div class=\"input-button-group\">\n                  <input type=\"text\" name=\"pdf.textpl\" id=\"textpl\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"textpl") : stack1), depth0))
    + "\">\n                  <button type=\"button\" class=\"request-file\"\n                  data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.choose_file",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":22,"column":38},"end":{"line":22,"column":79}}}))
    + "\"\n                  data-request-name=\"TeX Template File\"\n                  data-request-ext=\"tex\"\n                  data-request-target=\"#textpl\"><clr-icon shape=\"file\"></clr-icon></button>\n                </div>\n            </div>\n            <!-- Page layout -->\n            <div id=\"prefs-tabs-page\">\n                <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.page_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":30,"column":19},"end":{"line":30,"column":63}}}))
    + "</p>\n                <hr>\n                <div class=\"clear\"></div>\n                <div class=\"box-left\">\n                    <div class=\"paper a4paper\">\n                        <input class=\"tmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.tmargin\" id=\"pdf.tmargin\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"tmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.tmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":35,"column":164},"end":{"line":35,"column":205}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.tmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":35,"column":227},"end":{"line":35,"column":274}}}))
    + "\">\n                        <input class=\"rmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.rmargin\" id=\"pdf.rmargin\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"rmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.rmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":36,"column":164},"end":{"line":36,"column":205}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.rmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":36,"column":227},"end":{"line":36,"column":274}}}))
    + "\">\n                        <input class=\"bmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.bmargin\" id=\"pdf.bmargin\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"bmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.bmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":37,"column":164},"end":{"line":37,"column":205}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.bmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":37,"column":227},"end":{"line":37,"column":274}}}))
    + "\">\n                        <input class=\"lmargin\" type=\"number\" min=\"0\" max=\"9999\" step=\"0.1\" name=\"pdf.lmargin\" id=\"pdf.lmargin\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"lmargin") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lmargin",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":38,"column":164},"end":{"line":38,"column":205}}}))
    + "\" data-tippy-content=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lmargin_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":38,"column":227},"end":{"line":38,"column":274}}}))
    + "\">\n                    </div>\n                </div>\n                <div class=\"box-right\">\n                    <label for=\"pdf.margin_unit\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.unit_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":42,"column":49},"end":{"line":42,"column":93}}}))
    + "</label>\n                    <select name=\"pdf.margin_unit\" id=\"pdf.margin_-unit\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"availableMarginUnits") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":44,"column":22},"end":{"line":46,"column":31}}})) != null ? stack1 : "")
    + "                    </select>\n                    <hr>\n                    <label for=\"pdf.papertype\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.papertype",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":49,"column":47},"end":{"line":49,"column":90}}}))
    + "</label>\n                    <select name=\"pdf.papertype\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"supportedPapertypes") : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":51,"column":22},"end":{"line":53,"column":31}}})) != null ? stack1 : "")
    + "                    </select>\n                    <hr>\n                    <label for=\"pdf.pagenumbering\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.pagenumbering_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":56,"column":51},"end":{"line":56,"column":104}}}))
    + "</label>\n                    <select name=\"pdf.pagenumbering\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"availablePageNumberingSystems") : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0, blockParams, depths),"inverse":container.noop,"data":data,"loc":{"start":{"line":58,"column":22},"end":{"line":60,"column":31}}})) != null ? stack1 : "")
    + "                    </select>\n                </div>\n                <div class=\"clear\"></div>\n            </div>\n            <!-- Font options -->\n            <div id=\"prefs-tabs-font\">\n                <p>"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.font_intro",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":67,"column":19},"end":{"line":67,"column":63}}}))
    + "</p>\n                <div class=\"box-left\">\n                    <label for=\"pdf.mainfont\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.mainfont_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":69,"column":46},"end":{"line":69,"column":94}}}))
    + "</label>\n                    <input type=\"text\" name=\"pdf.mainfont\" id=\"mainfont\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"mainfont") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.mainfont",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":70,"column":111},"end":{"line":70,"column":153}}}))
    + "\">\n                    <label for=\"pdf.sansfont\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.sansfont_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":71,"column":46},"end":{"line":71,"column":94}}}))
    + "</label>\n                    <input type=\"text\" name=\"pdf.sansfont\" id=\"sansfont\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"sansfont") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.sansfont",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":72,"column":111},"end":{"line":72,"column":153}}}))
    + "\">\n                    <label for=\"pdf.fontsize\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.fontsize_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":73,"column":46},"end":{"line":73,"column":94}}}))
    + "</label>\n                    <input type=\"number\" min=\"0\" max=\"10000\" step=\"1\" name=\"pdf.fontsize\" id=\"fontsize\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"fontsize") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.fontsize",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":74,"column":142},"end":{"line":74,"column":184}}}))
    + "\">\n                    <label for=\"pdf.lineheight\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lineheight_label",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":75,"column":48},"end":{"line":75,"column":98}}}))
    + "</label>\n                    <input type=\"number\" min=\"0\" max=\"1000\" step=\"1\" name=\"pdf.lineheight\" id=\"lineheight\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? lookupProperty(depth0,"pdf") : depth0)) != null ? lookupProperty(stack1,"lineheight") : stack1), depth0))
    + "\" placeholder=\""
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.preferences.pdf.lineheight",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":76,"column":147},"end":{"line":76,"column":191}}}))
    + "\">\n                </div>\n                <div class=\"box-right\">\n                    <!-- This is the preview tab. It shows how everything will look afterwards. -->\n                    <h1 class=\"pdf-preview\">Lorem Ipsum Dolor</h1>\n                    <p class=\"pdf-preview\">\n                        Lorem ipsum dolor sit amet, consectetur adipisici elit,\n                        sed eiusmod tempor incidunt ut labore et dolore magna\n                        aliqua. Ut enim ad minim veniam, quis nostrud\n                        exercitation ullamco laboris nisi ut aliquid ex ea\n                        commodi consequat. Quis aute iure reprehenderit in\n                        voluptate velit esse cillum dolore eu fugiat nulla\n                        pariatur. Excepteur sint obcaecat cupiditat non proident,\n                        sunt in culpa qui officia deserunt mollit anim id est\n                        laborum.\n                    </p>\n                </div>\n            </div>\n        </div>\n        <div class=\"clearfix\">\n            <button type=\"submit\" id=\"pref-save\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.save",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":96,"column":49},"end":{"line":96,"column":78}}}))
    + "</button>\n            <button id=\"abort\">"
    + alias3((lookupProperty(helpers,"i18n")||(depth0 && lookupProperty(depth0,"i18n"))||alias2).call(alias1,"dialog.button.cancel",{"name":"i18n","hash":{},"data":data,"loc":{"start":{"line":97,"column":31},"end":{"line":97,"column":62}}}))
    + "</button>\n            <span class=\"error-info\"></span>\n        </div>\n    </form>\n</div>\n";
},"useData":true,"useDepths":true}
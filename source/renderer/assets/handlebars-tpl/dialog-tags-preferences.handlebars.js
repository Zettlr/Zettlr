module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "              <div>\n                <input type=\"text\" name=\"prefs-tags-name\" value=\""
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\">\n                <input type=\"color\" name=\"prefs-tags-color\" value=\""
    + alias4(((helper = (helper = helpers.color || (depth0 != null ? depth0.color : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"color","hash":{},"data":data}) : helper)))
    + "\">\n                <input type=\"text\" name=\"prefs-tags-desc\" value=\""
    + alias4(((helper = (helper = helpers.desc || (depth0 != null ? depth0.desc : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"desc","hash":{},"data":data}) : helper)))
    + "\">\n                <button type=\"button\" onclick=\"$(this).parent().detach()\">-</button></div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"tags.title",{"name":"i18n","hash":{},"data":data}))
    + "</h1>\n    <form  action=\"\" method=\"GET\" id=\"dialog\">\n        <div>\n            <p>\n                "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"tags.description",{"name":"i18n","hash":{},"data":data}))
    + "\n            </p>\n            <div id=\"prefs-taglist\">\n"
    + ((stack1 = helpers.each.call(alias1,depth0,{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </div>\n        </div>\n        <button type=\"button\" onclick=\"addTagLine()\">+</button>\n        <button type=\"submit\" id=\"pref-save\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"preferences.save",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n        <button id=\"abort\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"preferences.cancel",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n    </form>\n<script>\n/* global $ */\nfunction addTagLine () {\n  $('#prefs-taglist').append(\n    `<div>\n        <input type=\"text\" name=\"prefs-tags-name\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"tags.name_desc",{"name":"i18n","hash":{},"data":data}))
    + "\">\n        <input type=\"color\" name=\"prefs-tags-color\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"tags.color_desc",{"name":"i18n","hash":{},"data":data}))
    + "\">\n        <input type=\"text\" name=\"prefs-tags-desc\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"tags.desc_desc",{"name":"i18n","hash":{},"data":data}))
    + "\">\n        <button type=\"button\" onclick=\"$(this).parent().detach()\">-</button>\n        </div>`\n  )\n}\n</script>\n</div>\n";
},"useData":true}
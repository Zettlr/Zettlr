module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression, alias4="function";

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.title",{"name":"i18n","hash":{},"data":data}))
    + ": "
    + alias3(((helper = (helper = helpers.newVer || (depth0 != null ? depth0.newVer : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"newVer","hash":{},"data":data}) : helper)))
    + "</h1>\n    <p><strong>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.current_version",{"name":"i18n","hash":{},"data":data}))
    + ": "
    + alias3(((helper = (helper = helpers.curVer || (depth0 != null ? depth0.curVer : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"curVer","hash":{},"data":data}) : helper)))
    + "</strong></p>\n    <p>\n        "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.notification",{"name":"i18n","hash":{},"data":data}))
    + "\n    </p>\n    <div class=\"changelog\">\n        "
    + ((stack1 = ((helper = (helper = helpers.changelog || (depth0 != null ? depth0.changelog : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"changelog","hash":{},"data":data}) : helper))) != null ? stack1 : "")
    + "\n    </div>\n    <a href=\""
    + alias3(((helper = (helper = helpers.downloadLink || (depth0 != null ? depth0.downloadLink : depth0)) != null ? helper : alias2),(typeof helper === alias4 ? helper.call(alias1,{"name":"downloadLink","hash":{},"data":data}) : helper)))
    + "\" target=\"_blank\" class=\"button\" onclick=\"require('electron').shell.openExternal(this.getAttribute('href')); return false;\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.release_url",{"name":"i18n","hash":{},"data":data}))
    + "</a>\n    <button id=\"abort\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.close",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n</div>\n";
},"useData":true}
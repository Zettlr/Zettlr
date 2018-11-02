module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"pomodoro\">\n  <p><span id=\"pomodoro-phase-type\">"
    + alias4(((helper = (helper = helpers.type || (depth0 != null ? depth0.type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data}) : helper)))
    + "</span></p>\n  <p><span id=\"pomodoro-time-remaining\">"
    + alias4(((helper = (helper = helpers.time || (depth0 != null ? depth0.time : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"time","hash":{},"data":data}) : helper)))
    + "</span></p>\n  <button id=\"pomodoro-stop-button\">"
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"pomodoro.stop",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n</div>\n";
},"useData":true}
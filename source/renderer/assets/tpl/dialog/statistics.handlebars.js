module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div class=\"dialog\">\n    <h1>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.statistics.title",{"name":"i18n","hash":{},"data":data}))
    + "</h1>\n    <p>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.statistics.intro",{"name":"i18n","hash":{},"data":data}))
    + "</p>\n    <canvas id=\"canvas\"></canvas>\n    <button id=\"abort\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.update.close",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n</div>\n";
},"useData":true}
module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "<div>\n  <form class=\"search\">\n    <div class=\"row\">\n      <input type=\"text\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.find.find_placeholder",{"name":"i18n","hash":{},"data":data}))
    + "\" value=\"\" id=\"searchWhat\">\n      <button id=\"searchNext\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.find.find_label",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n    </div>\n    <div class=\"row\">\n      <input type=\"text\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.find.replace_placeholder",{"name":"i18n","hash":{},"data":data}))
    + "\" value=\"\" id=\"replaceWhat\">\n      <button id=\"replaceNext\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.find.replace_label",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n      <button id=\"replaceAll\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.find.replace_all_label",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n    </div>\n  </form>\n</div>\n";
},"useData":true}
module.exports = {"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias3(((helper = (helper = helpers.words_sel || (depth0 != null ? depth0.words_sel : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"words_sel","hash":{},"data":data}) : helper)))
    + "</strong></td>\n    <td>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.file_words_sel",{"name":"i18n","hash":{},"data":data}))
    + "</td>\n  </tr>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression;

  return "  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias3(((helper = (helper = helpers.chars_sel || (depth0 != null ? depth0.chars_sel : depth0)) != null ? helper : alias2),(typeof helper === "function" ? helper.call(alias1,{"name":"chars_sel","hash":{},"data":data}) : helper)))
    + "</strong></td>\n    <td>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.file_chars_sel",{"name":"i18n","hash":{},"data":data}))
    + "</td>\n  </tr>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<table>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = helpers.words || (depth0 != null ? depth0.words : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"words","hash":{},"data":data}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.file_words",{"name":"i18n","hash":{},"data":data}))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = helpers.chars || (depth0 != null ? depth0.chars : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chars","hash":{},"data":data}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.file_chars",{"name":"i18n","hash":{},"data":data}))
    + "</td>\n  </tr>\n  <tr>\n    <td style=\"text-align:right\"><strong>"
    + alias4(((helper = (helper = helpers.chars_wo_spaces || (depth0 != null ? depth0.chars_wo_spaces : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"chars_wo_spaces","hash":{},"data":data}) : helper)))
    + "</strong></td>\n    <td>"
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"gui.file_chars_wo_spaces",{"name":"i18n","hash":{},"data":data}))
    + "</td>\n  </tr>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.words_sel : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.chars_sel : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</table>\n";
},"useData":true}
module.exports = {"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.escapeExpression, alias2=depth0 != null ? depth0 : (container.nullContext || {}), alias3=helpers.helperMissing;

  return "            <option value=\""
    + alias1(container.lambda(depth0, depth0))
    + "\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias3).call(alias2,depth0,"=",(depths[1] != null ? depths[1].app_lang : depths[1]),{"name":"ifCond","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">"
    + alias1((helpers.i18n || (depth0 && depth0.i18n) || alias3).call(alias2,"dialog.preferences.app_lang.",depth0,{"name":"i18n","hash":{},"data":data}))
    + "</option>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "selected=\"selected\"";
},"4":function(container,depth0,helpers,partials,data) {
    return "checked=\"checked\"";
},"6":function(container,depth0,helpers,partials,data) {
    var alias1=container.escapeExpression;

  return "              <li data-value=\""
    + alias1(container.lambda(depth0, depth0))
    + "\" class=\"dicts-list-item\">"
    + alias1((helpers.i18n || (depth0 && depth0.i18n) || helpers.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"dialog.preferences.app_lang.",depth0,{"name":"i18n","hash":{},"data":data}))
    + "</li>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "              <div class=\"selected-dict\"><input type=\"hidden\" value=\""
    + alias2(alias1(depth0, depth0))
    + "\" name=\"selectedDicts\" id=\""
    + alias2(alias1(depth0, depth0))
    + "\">"
    + alias2((helpers.i18n || (depth0 && depth0.i18n) || helpers.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"dialog.preferences.app_lang.",depth0,{"name":"i18n","hash":{},"data":data}))
    + "</div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3=container.escapeExpression, alias4=container.lambda, alias5="function";

  return "<div class=\"dialog\">\n  <h1>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.title",{"name":"i18n","hash":{},"data":data}))
    + "</h1>\n  <form  action=\"\" method=\"GET\" id=\"dialog\">\n    <div id=\"prefs-tabs\">\n      <ul>\n        <li><a href=\"#prefs-tabs-general\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.general",{"name":"i18n","hash":{},"data":data}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-editor\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.editor",{"name":"i18n","hash":{},"data":data}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-export\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.title",{"name":"i18n","hash":{},"data":data}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-zkn\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.title",{"name":"i18n","hash":{},"data":data}))
    + "</a></li>\n        <li><a href=\"#prefs-tabs-advanced\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.advanced",{"name":"i18n","hash":{},"data":data}))
    + "</a></li>\n      </ul>\n      <!-- General settings -->\n      <div id=\"prefs-tabs-general\">\n        <label for=\"app-lang\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.app_lang.title",{"name":"i18n","hash":{},"data":data}))
    + "\n        </label>\n        <select name=\"app_lang\" id=\"app-lang\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.supportedLangs : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </select>\n        <div class=\"cb-group\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" name=\"darkTheme\" value=\"yes\" id=\"darkTheme\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.darkTheme : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"darkTheme\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.nightmode",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n        <div class=\"cb-group\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" name=\"snippets\" value=\"yes\" id=\"snippets\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.snippets : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"snippets\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.snippets",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n        <hr>\n        <p>\n          "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.combiner_explanation",{"name":"i18n","hash":{},"data":data}))
    + "\n        </p>\n        <div class=\"cb-group\">\n          <input type=\"radio\" name=\"combinerState\" value=\"collapsed\" id=\"pref-comb-state-coll\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,(depth0 != null ? depth0.combinerState : depth0),"=","collapsed",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n          <label for=\"pref-comb-state-coll\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.combiner_collapsed",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n        <div class=\"cb-group\">\n          <input type=\"radio\" name=\"combinerState\" value=\"expanded\" id=\"pref-comb-state-exp\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,(depth0 != null ? depth0.combinerState : depth0),"=","expanded",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n          <label for=\"pref-comb-state-exp\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.combiner_expanded",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n      </div>\n      <!-- Editor related options -->\n      <div id=\"prefs-tabs-editor\">\n        <div class=\"clear\"></div>\n        <div class=\"box-left\">\n          <input type=\"text\" class=\"dicts-list-search\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.spellcheck_search_placeholder",{"name":"i18n","hash":{},"data":data}))
    + "\">\n          <ul class=\"dicts-list\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.availableDicts : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "          </ul>\n        </div>\n        <div class=\"box-right\">\n          <p>\n            "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.spellcheck",{"name":"i18n","hash":{},"data":data}))
    + "\n          </p>\n          <p>\n            "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.spellcheck_warning",{"name":"i18n","hash":{},"data":data}))
    + "\n          </p>\n          <hr>\n          <div class=\"selected-dictionaries\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.selectedDicts : depth0),{"name":"each","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "          </div>\n        </div>\n        <div class=\"clear\"></div>\n        <hr>\n        <div class=\"cb-group\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" name=\"muteLines\" value=\"yes\" id=\"muteLines\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.muteLines : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"muteLines\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.mute_lines",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n        <div class=\"cb-group\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" name=\"editor.autoCloseBrackets\" value=\"yes\" id=\"autoCloseBrackets\" "
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.editor : depth0)) != null ? stack1.autoCloseBrackets : stack1),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"autoCloseBrackets\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.autoCloseBrackets",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n      </div>\n      <!-- Export related options (except pandoc+xelatex) -->\n      <div id=\"prefs-tabs-export\">\n        <div class=\"box-left\">\n          <p>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.stripping",{"name":"i18n","hash":{},"data":data}))
    + "</p>\n          <p>\n            <div class=\"cb-group\">\n              <label class=\"cb-toggle\">\n                <input type=\"checkbox\" name=\"export.stripIDs\" value=\"yes\" id=\"export.stripIDs\" "
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.stripIDs : stack1),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n                <div class=\"toggle\"></div>\n              </label>\n              <label for=\"export.stripIDs\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.strip_id_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n            </div>\n            <div class=\"cb-group\">\n              <label class=\"cb-toggle\">\n                <input type=\"checkbox\" name=\"export.stripTags\" value=\"yes\" id=\"export.stripTags\" "
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.stripTags : stack1),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n                <div class=\"toggle\"></div>\n              </label>\n              <label for=\"export.stripTags\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.strip_tags_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n            </div>\n          </p>\n          <hr>\n          <div class=\"cb-group\">\n            <input type=\"radio\" name=\"export.stripLinks\" value=\"full\" id=\"pref-export-strip-link-full\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.stripLinks : stack1),"=","full",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label for=\"pref-export-strip-link-full\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.strip_links_full_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          </div>\n          <div class=\"cb-group\">\n            <input type=\"radio\" name=\"export.stripLinks\" value=\"unlink\" id=\"pref-export-strip-link-unlink\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.stripLinks : stack1),"=","unlink",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label for=\"pref-export-strip-link-unlink\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.strip_links_unlink_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          </div>\n          <div class=\"cb-group\">\n            <input type=\"radio\" name=\"export.stripLinks\" value=\"no\" id=\"pref-export-strip-link-no\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.stripLinks : stack1),"=","no",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label for=\"pref-export-strip-link-no\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.strip_links_no_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          </div>\n        </div>\n        <div class=\"box-right\">\n          <p>\n            "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.dest",{"name":"i18n","hash":{},"data":data}))
    + "\n          </p>\n          <div class=\"cb-group\">\n            <input type=\"radio\" name=\"export.dir\" value=\"temp\" id=\"pref-export-temp\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.dir : stack1),"=","temp",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label for=\"pref-export-temp\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.dest_temp_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          </div>\n          <div class=\"cb-group\">\n            <input type=\"radio\" name=\"export.dir\" value=\"cwd\" id=\"pref-export-cwd\" "
    + ((stack1 = (helpers.ifCond || (depth0 && depth0.ifCond) || alias2).call(alias1,((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.dir : stack1),"=","cwd",{"name":"ifCond","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <label for=\"pref-export-cwd\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.export.dest_cwd_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          </div>\n          <hr>\n          <label for=\"cslLibrary\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.csl_database",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <div class=\"file-select-group\">\n            <input type=\"text\" name=\"export.cslLibrary\" id=\"cslLibrary\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.cslLibrary : stack1), depth0))
    + "\">\n            <button type=\"button\" class=\"request-file\"\n              data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.choose_file",{"name":"i18n","hash":{},"data":data}))
    + "\"\n              data-request-name=\"Citation Style Language JSON Data File\"\n              data-request-ext=\"json\"\n              data-request-target=\"#cslLibrary\"></button>\n          </div>\n          <label for=\"cslStyle\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.project.csl_style",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <div class=\"file-select-group\">\n            <input type=\"text\" name=\"export.cslStyle\" id=\"cslStyle\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0["export"] : depth0)) != null ? stack1.cslStyle : stack1), depth0))
    + "\">\n            <button type=\"button\" class=\"request-file\"\n              data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.choose_file",{"name":"i18n","hash":{},"data":data}))
    + "\"\n              data-request-name=\"Citation Style Language File\"\n              data-request-ext=\"csl\"\n              data-request-target=\"#cslStyle\"></button>\n          </div>\n        </div>\n      </div>\n      <!-- Zettelkasten options -->\n      <div id=\"prefs-tabs-zkn\">\n        <div class=\"box-left form-inline-buttons\">\n          <label for=\"pref-zkn-free-id\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.id_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <input type=\"text\" id=\"pref-zkn-free-id\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.zkn : depth0)) != null ? stack1.idRE : stack1), depth0))
    + "\" name=\"zkn.idRE\">\n          <button type=\"button\" id=\"reset-id-regex\" data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.reset_default_id",{"name":"i18n","hash":{},"data":data}))
    + "\">&#9003;</button>\n          <label for=\"pref-zkn-free-linkstart\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.linkstart_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <input type=\"text\" id=\"pref-zkn-free-linkstart\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.zkn : depth0)) != null ? stack1.linkStart : stack1), depth0))
    + "\" name=\"zkn.linkStart\">\n          <button type=\"button\" id=\"reset-linkstart-regex\" data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.reset_default_linkstart",{"name":"i18n","hash":{},"data":data}))
    + "\">&#9003;</button>\n          <label for=\"pref-zkn-free-linkend\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.linkend_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <input type=\"text\" id=\"pref-zkn-free-linkend\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.zkn : depth0)) != null ? stack1.linkEnd : stack1), depth0))
    + "\" name=\"zkn.linkEnd\">\n          <button type=\"button\" id=\"reset-linkend-regex\" data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.reset_default_linkend",{"name":"i18n","hash":{},"data":data}))
    + "\">&#9003;</button>\n          <label for=\"pref-zkn-id-gen\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.id_generator_label",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n          <input type=\"text\" id=\"pref-zkn-id-gen\" value=\""
    + alias3(alias4(((stack1 = (depth0 != null ? depth0.zkn : depth0)) != null ? stack1.idGen : stack1), depth0))
    + "\" name=\"zkn.idGen\">\n          <button type=\"button\" id=\"reset-id-generator\" data-tippy-content=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.reset_default_generator",{"name":"i18n","hash":{},"data":data}))
    + "\">&#9003;</button>\n          <hr>\n          <p>\n            <button type=\"button\" id=\"generate-id\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.test_id_generator",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n          </p>\n          <p>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.generated_id",{"name":"i18n","hash":{},"data":data}))
    + ": <strong><span id=\"generator-tester\"></span></strong></p>\n          <p><span id=\"pass-check\"></span></p>\n        </div>\n        <div class=\"box-right\">\n          <p>\n            "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.intro",{"name":"i18n","hash":{},"data":data}))
    + "\n            <ul>\n              <li><strong>%Y</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_year",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n              <li><strong>%M</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_month",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n              <li><strong>%D</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_day",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n              <li><strong>%h</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_hour",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n              <li><strong>%m</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_minute",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n              <li><strong>%s</strong>: "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.var_second",{"name":"i18n","hash":{},"data":data}))
    + "</li>\n            </ul>\n          </p>\n        </div>\n      </div>\n      <!-- Export/seldomly used options -->\n      <div id=\"prefs-tabs-advanced\">\n        <p>"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.attachments_info",{"name":"i18n","hash":{},"data":data}))
    + "</p>\n        <textarea id=\"attachmentExtensions\" name=\"attachmentExtensions\">"
    + alias3(((helper = (helper = helpers.attachmentExtensions || (depth0 != null ? depth0.attachmentExtensions : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"attachmentExtensions","hash":{},"data":data}) : helper)))
    + "</textarea>\n\n        <hr>\n\n        <label for=\"pandoc\">\n          "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.pandoc",{"name":"i18n","hash":{},"data":data}))
    + "\n        </label>\n        <input type=\"text\" id=\"pandoc\" name=\"pandoc\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.pandoc_default",{"name":"i18n","hash":{},"data":data}))
    + "\" value=\""
    + alias3(((helper = (helper = helpers.pandoc || (depth0 != null ? depth0.pandoc : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"pandoc","hash":{},"data":data}) : helper)))
    + "\">\n\n        <label for=\"xelatex\">\n          "
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.xelatex",{"name":"i18n","hash":{},"data":data}))
    + "\n        </label>\n        <input type=\"text\" id=\"xelatex\" name=\"xelatex\" placeholder=\""
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.xelatex_default",{"name":"i18n","hash":{},"data":data}))
    + "\" value=\""
    + alias3(((helper = (helper = helpers.xelatex || (depth0 != null ? depth0.xelatex : depth0)) != null ? helper : alias2),(typeof helper === alias5 ? helper.call(alias1,{"name":"xelatex","hash":{},"data":data}) : helper)))
    + "\">\n\n        <hr>\n\n        <div class=\"cb-group\">\n          <label class=\"cb-toggle\">\n            <input type=\"checkbox\" name=\"debug\" value=\"yes\" id=\"debug\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n            <div class=\"toggle\"></div>\n          </label>\n          <label for=\"debug\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.debug",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n        </div>\n      </div>\n    </div>\n    <div class=\"prefs-submit-group\">\n      <button type=\"submit\" id=\"pref-save\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.save",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n      <button id=\"abort\">"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.cancel",{"name":"i18n","hash":{},"data":data}))
    + "</button>\n      <span class=\"error-info\"></span>\n    </div>\n  </form>\n</div>\n<script type=\"text/javascript\">\n/* global $ */\n// Functions for the search field of the dictionary list.\n$('.dicts-list-search').on('keyup', (e) => {\n  let val = $('.dicts-list-search').val().toLowerCase()\n  $('.dicts-list').find('li').each(function (i) {\n    if ($(this).text().toLowerCase().indexOf(val) === -1) {\n      $(this).hide()\n    } else {\n      $(this).show()\n    }\n  })\n})\n\n$('.dicts-list').on('click', (e) => {\n  let elem = $(e.target)\n  if (elem.is('li') && elem.hasClass('dicts-list-item')) {\n    let selection = $(`<div class=\"selected-dict\"><input type=\"hidden\" value=\"${elem.attr('data-value')}\" name=\"selectedDicts\" id=\"${elem.attr('data-value')}\">${elem.text()}</div>`)\n    $('.selected-dictionaries').append(selection)\n    elem.detach()\n    $('.dicts-list-search').val('').focus().trigger('keyup') // Next search\n  }\n})\n\n$('.selected-dictionaries').on('click', (e) => {\n  let elem = $(e.target)\n  if (elem.is('div') && elem.hasClass('selected-dict')) {\n    let selection = $(`<li data-value=\"${elem.children('input').first().val()}\" class=\"dicts-list-item\">${elem.text()}</li>`)\n    let length = $('.dicts-list').find('li').length\n    if (length === 0) {\n      $('.dicts-list').append(selection)\n    } else {\n      $('.dicts-list').find('li').each(function (i) {\n        if ($(this).text() > elem.text()) {\n          selection.insertBefore($(this))\n          return false // Break out of the loop\n        } else if (i === length - 1) {\n          selection.insertAfter($(this))\n        }\n      })\n    }\n    elem.detach()\n  }\n})\n// END searchfield functions.\n\n// Begin: functions for the zkn regular expression fields\n$('#reset-id-regex').on('click', (e) => {\n  $('#pref-zkn-free-id').val('(\\\\d{14})')\n})\n$('#reset-linkstart-regex').on('click', (e) => {\n  $('#pref-zkn-free-linkstart').val('[[')\n})\n$('#reset-linkend-regex').on('click', (e) => {\n  $('#pref-zkn-free-linkend').val(']]')\n})\n$('#reset-id-generator').on('click', (e) => {\n  $('#pref-zkn-id-gen').val('%Y%M%D%h%m%s')\n})\n\n$('#generate-id').on('click', (e) => {\n  let id = require('../../common/zettlr-helpers.js').generateId($('#pref-zkn-id-gen').val())\n  let re = new RegExp('^' + $('#pref-zkn-free-id').val() + '$')\n  $('#generator-tester').text(id)\n  if (re.test(id)) {\n    $('#pass-check').text('"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.pass_check_yes",{"name":"i18n","hash":{},"data":data}))
    + "')\n  } else {\n    $('#pass-check').text('"
    + alias3((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"dialog.preferences.zkn.pass_check_no",{"name":"i18n","hash":{},"data":data}))
    + "')\n  }\n})\n\n</script>\n";
},"useData":true,"useDepths":true}
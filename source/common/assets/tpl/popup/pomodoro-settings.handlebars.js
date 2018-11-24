module.exports = {"1":function(container,depth0,helpers,partials,data) {
    return "checked=\"checked\"";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<form class=\"pomodoro\" method=\"GET\" action=\"#\">\n  <input type=\"number\" class=\"pomodoro-task\" value=\""
    + alias4(((helper = (helper = helpers.duration_task || (depth0 != null ? depth0.duration_task : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_task","hash":{},"data":data}) : helper)))
    + "\" name=\"task\" min=\"1\" max=\"100\" required>\n  <input type=\"number\" class=\"pomodoro-short\" value=\""
    + alias4(((helper = (helper = helpers.duration_short || (depth0 != null ? depth0.duration_short : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_short","hash":{},"data":data}) : helper)))
    + "\" name=\"short\" min=\"1\" max=\"100\" required>\n  <input type=\"number\" class=\"pomodoro-long\" value=\""
    + alias4(((helper = (helper = helpers.duration_long || (depth0 != null ? depth0.duration_long : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"duration_long","hash":{},"data":data}) : helper)))
    + "\" name=\"long\" min=\"1\" max=\"100\" required>\n  <div class=\"cb-group\">\n    <label class=\"cb-toggle\">\n      <input type=\"checkbox\" name=\"mute\" id=\"mute\" "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.mute : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n      <div class=\"toggle\"></div>\n    </label>\n    <label for=\"mute\">"
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"pomodoro.mute",{"name":"i18n","hash":{},"data":data}))
    + "</label>\n  </div>\n  <input type=\"range\" name=\"volume\" min=\"0\" max=\"100\" value=\""
    + alias4(((helper = (helper = helpers.volume || (depth0 != null ? depth0.volume : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"volume","hash":{},"data":data}) : helper)))
    + "\">\n  <input type=\"submit\" value=\""
    + alias4((helpers.i18n || (depth0 && depth0.i18n) || alias2).call(alias1,"pomodoro.start",{"name":"i18n","hash":{},"data":data}))
    + "\">\n</form>\n";
},"useData":true}
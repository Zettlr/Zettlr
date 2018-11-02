module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"quicklook\">\n    <div class=\"title\">\n        <h1></h1>\n        <div class=\"find\">\n          <input type=\"text\" id=\"searchWhat\" placeholder=\""
    + container.escapeExpression((helpers.i18n || (depth0 && depth0.i18n) || helpers.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"dialog.find.find_placeholder",{"name":"i18n","hash":{},"data":data}))
    + "\">\n        </div>\n        <div class=\"close\"></div>\n    </div>\n    <div class=\"body\">\n        <textarea></textarea>\n    </div>\n</div>\n";
},"useData":true}
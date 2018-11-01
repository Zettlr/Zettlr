module.exports = {"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"quicklook\">\n    <div class=\"title\">\n        <h1></h1>\n        <div class=\"find\">\n          <input type=\"text\" id=\"searchWhat\" placeholder=\""
    + container.escapeExpression(((helper = (helper = helpers.findPlaceholder || (depth0 != null ? depth0.findPlaceholder : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"findPlaceholder","hash":{},"data":data}) : helper)))
    + "\">\n        </div>\n        <div class=\"close\"></div>\n    </div>\n    <div class=\"body\">\n        <textarea></textarea>\n    </div>\n</div>\n";
},"useData":true}
var CLOSURE_NO_DEPS = true;
var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.TRUSTED_SITE = true;
goog.provide = function(name) {
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];
    var namespace = name;
    while (namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }
  goog.exportPath_(name);
};
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if (!COMPILED) {
  goog.isProvided_ = function(name) {
    return!goog.implicitNamespaces_[name] && !!goog.getObjectByName(name);
  };
  goog.implicitNamespaces_ = {};
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0]);
  }
  for (var part;parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object;
    } else {
      if (cur[part]) {
        cur = cur[part];
      } else {
        cur = cur[part] = {};
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for (var part;part = parts.shift();) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for (var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0;require = requires[j];j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};
goog.ENABLE_DEBUG_LOADER = true;
goog.require = function(name) {
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return;
    }
    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return;
      }
    }
    var errorMessage = "goog.require could not find: " + name;
    if (goog.global.console) {
      goog.global.console["error"](errorMessage);
    }
    throw Error(errorMessage);
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(opt_returnValue, var_args) {
  return opt_returnValue;
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};
goog.instantiatedSingletons_ = [];
if (!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc;
  };
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else {
      if (!goog.inHtmlDocument_()) {
        return;
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for (var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      if (doc.readyState == "complete") {
        var isDeps = /\bdeps.js$/.test(src);
        if (isDeps) {
          return false;
        } else {
          throw Error('Cannot write "' + src + '" after document load');
        }
      }
      doc.write('\x3cscript type\x3d"text/javascript" src\x3d"' + src + '"\x3e\x3c/' + "script\x3e");
      return true;
    } else {
      return false;
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if (path in deps.written) {
        return;
      }
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }
      deps.visited[path] = true;
      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }
    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }
    for (var i = 0;i < scripts.length;i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };
  goog.findBasePath_();
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js");
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == "object") {
    if (value) {
      if (value instanceof Array) {
        return "array";
      } else {
        if (value instanceof Object) {
          return s;
        }
      }
      var className = Object.prototype.toString.call((value));
      if (className == "[object Window]") {
        return "object";
      }
      if (className == "[object Array]" || typeof value.length == "number" && (typeof value.splice != "undefined" && (typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")))) {
        return "array";
      }
      if (className == "[object Function]" || typeof value.call != "undefined" && (typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call"))) {
        return "function";
      }
    } else {
      return "null";
    }
  } else {
    if (s == "function" && typeof value.call == "undefined") {
      return "object";
    }
  }
  return s;
};
goog.isDef = function(val) {
  return val !== undefined;
};
goog.isNull = function(val) {
  return val === null;
};
goog.isDefAndNotNull = function(val) {
  return val != null;
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array";
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number";
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function";
};
goog.isString = function(val) {
  return typeof val == "string";
};
goog.isBoolean = function(val) {
  return typeof val == "boolean";
};
goog.isNumber = function(val) {
  return typeof val == "number";
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function";
};
goog.isObject = function(val) {
  var type = typeof val;
  return type == "object" && val != null || type == "function";
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};
goog.removeUid = function(obj) {
  if ("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + (Math.random() * 1E9 >>> 0);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == "object" || type == "array") {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == "array" ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }
  return obj;
};
goog.bindNative_ = function(fn, selfObj, var_args) {
  return(fn.call.apply(fn.bind, arguments));
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error;
  }
  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };
  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if (Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }
};
goog.now = goog.TRUSTED_SITE && Date.now || function() {
  return+new Date;
};
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, "JavaScript");
  } else {
    if (goog.global.eval) {
      if (goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ \x3d 1;");
        if (typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true;
        } else {
          goog.evalWorksForGlobals_ = false;
        }
      }
      if (goog.evalWorksForGlobals_) {
        goog.global.eval(script);
      } else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt);
      }
    } else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for (var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join("-");
  };
  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }
  if (opt_modifier) {
    return className + "-" + rename(opt_modifier);
  } else {
    return rename(className);
  }
};
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};
goog.global.CLOSURE_CSS_NAME_MAPPING;
if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value);
  }
  return str;
};
goog.getMsgWithFallback = function(a, b) {
  return a;
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor;
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1));
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else {
      if (foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args);
      }
    }
  }
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global);
};
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0;
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};
goog.string.subs = function(str, var_args) {
  for (var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement);
  }
  return str;
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "");
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str);
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str);
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str);
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str);
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str);
};
goog.string.isSpace = function(ch) {
  return ch == " ";
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && (ch >= " " && ch <= "~") || ch >= "\u0080" && ch <= "\ufffd";
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ");
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n");
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ");
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ");
};
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "");
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "");
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "");
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "");
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if (test1 < test2) {
    return-1;
  } else {
    if (test1 == test2) {
      return 0;
    } else {
      return 1;
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return-1;
  }
  if (!str2) {
    return 1;
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for (var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if (a != b) {
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }
  return str1 < str2 ? -1 : 1;
};
goog.string.urlEncode = function(str) {
  return encodeURIComponent(String(str));
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "));
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "\x3cbr /\x3e" : "\x3cbr\x3e");
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "\x26amp;").replace(goog.string.ltRe_, "\x26lt;").replace(goog.string.gtRe_, "\x26gt;").replace(goog.string.quotRe_, "\x26quot;");
  } else {
    if (!goog.string.allRe_.test(str)) {
      return str;
    }
    if (str.indexOf("\x26") != -1) {
      str = str.replace(goog.string.amperRe_, "\x26amp;");
    }
    if (str.indexOf("\x3c") != -1) {
      str = str.replace(goog.string.ltRe_, "\x26lt;");
    }
    if (str.indexOf("\x3e") != -1) {
      str = str.replace(goog.string.gtRe_, "\x26gt;");
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "\x26quot;");
    }
    return str;
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, "\x26")) {
    if ("document" in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {"\x26amp;":"\x26", "\x26lt;":"\x3c", "\x26gt;":"\x3e", "\x26quot;":'"'};
  var div = document.createElement("div");
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    var value = seen[s];
    if (value) {
      return value;
    }
    if (entity.charAt(0) == "#") {
      var n = Number("0" + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    if (!value) {
      div.innerHTML = s + " ";
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    return seen[s] = value;
  });
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return "\x26";
      case "lt":
        return "\x3c";
      case "gt":
        return "\x3e";
      case "quot":
        return'"';
      default:
        if (entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        return s;
    }
  });
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " \x26#160;"), opt_xml);
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }
  if (str.length > chars) {
    str = str.substring(0, chars - 3) + "...";
  }
  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }
  return str;
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }
  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint);
  } else {
    if (str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos);
    }
  }
  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }
  return str;
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\b":"\\b", "\f":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join("");
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join("");
};
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }
  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    if (cc < 256) {
      rv = "\\x";
      if (cc < 16 || cc > 256) {
        rv += "0";
      }
    } else {
      rv = "\\u";
      if (cc < 4096) {
        rv += "0";
      }
    }
    rv += cc.toString(16).toUpperCase();
  }
  return goog.string.jsEscapeCache_[c] = rv;
};
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if (index >= 0 && (index < s.length && stringLength > 0)) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "");
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "");
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08");
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string);
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s;
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj);
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "");
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for (var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || (goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2]));
    } while (order == 0);
  }
  return order;
};
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return-1;
  } else {
    if (left > right) {
      return 1;
    }
  }
  return 0;
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return "goog_" + goog.string.uniqueStringCounter_++;
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};
goog.string.toCamelCase = function(str) {
  return String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase();
  });
};
goog.string.toSelectorCase = function(str) {
  return String(str).replace(/([A-Z])/g, "-$1").toLowerCase();
};
goog.string.toTitleCase = function(str, opt_delimiters) {
  var delimiters = goog.isString(opt_delimiters) ? goog.string.regExpEscape(opt_delimiters) : "\\s";
  delimiters = delimiters ? "|[" + delimiters + "]+" : "";
  var regexp = new RegExp("(^" + delimiters + ")([a-z])", "g");
  return str.replace(regexp, function(all, p1, p2) {
    return p1 + p2.toUpperCase();
  });
};
goog.string.parseInt = function(value) {
  if (isFinite(value)) {
    value = String(value);
  }
  if (goog.isString(value)) {
    return/^\s*-?0x/i.test(value) ? parseInt(value, 16) : parseInt(value, 10);
  }
  return NaN;
};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, goog.debug.Error);
  } else {
    this.stack = (new Error).stack || "";
  }
  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if (givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs;
  } else {
    if (defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs;
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return(value);
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3));
  }
  return(value);
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = goog.TRUSTED_SITE;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1];
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex);
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if (goog.isString(arr)) {
    if (!goog.isString(obj) || obj.length != 1) {
      return-1;
    }
    return arr.indexOf(obj, fromIndex);
  }
  for (var i = fromIndex;i < arr.length;i++) {
    if (i in arr && arr[i] === obj) {
      return i;
    }
  }
  return-1;
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex);
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if (fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex);
  }
  if (goog.isString(arr)) {
    if (!goog.isString(obj) || obj.length != 1) {
      return-1;
    }
    return arr.lastIndexOf(obj, fromIndex);
  }
  for (var i = fromIndex;i >= 0;i--) {
    if (i in arr && arr[i] === obj) {
      return i;
    }
  }
  return-1;
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = l - 1;i >= 0;--i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      var val = arr2[i];
      if (f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val;
      }
    }
  }
  return res;
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr);
    }
  }
  return res;
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if (arr.reduce) {
    if (opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduce(f, val);
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if (arr.reduceRight) {
    if (opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduceRight(f, val);
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true;
    }
  }
  return false;
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj);
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false;
    }
  }
  return true;
};
goog.array.count = function(arr, f, opt_obj) {
  var count = 0;
  goog.array.forEach(arr, function(element, index, arr) {
    if (f.call(opt_obj, element, index, arr)) {
      ++count;
    }
  }, opt_obj);
  return count;
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = 0;i < l;i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return-1;
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for (var i = l - 1;i >= 0;i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return-1;
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};
goog.array.clear = function(arr) {
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1;i >= 0;i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if (rv = i >= 0) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1;
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments);
};
goog.array.toArray = function(object) {
  var length = object.length;
  if (length > 0) {
    var rv = new Array(length);
    for (var i = 0;i < length;i++) {
      rv[i] = object[i];
    }
    return rv;
  }
  return[];
};
goog.array.clone = goog.array.toArray;
goog.array.extend = function(arr1, var_args) {
  for (var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if (goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && Object.prototype.hasOwnProperty.call(arr2, "callee")) {
      arr1.push.apply(arr1, arr2);
    } else {
      if (isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for (var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j];
        }
      } else {
        arr1.push(arr2);
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1));
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if (arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start);
  } else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end);
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target);
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj);
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while (left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      compareResult = compareFn(opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      found = !compareResult;
    }
  }
  return found ? left : ~left;
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare);
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  }
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value;
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key]);
  });
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || (!goog.isArrayLike(arr2) || arr1.length != arr2.length)) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0;i < l;i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn);
};
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for (var i = 0;i < l;i++) {
    var result = compare(arr1[i], arr2[i]);
    if (result != 0) {
      return result;
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length);
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false;
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for (var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if (goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }
  return buckets;
};
goog.array.toObject = function(arr, keyFunc, opt_obj) {
  var ret = {};
  goog.array.forEach(arr, function(element, index) {
    ret[keyFunc.call(opt_obj, element, index, arr)] = element;
  });
  return ret;
};
goog.array.range = function(startOrEnd, opt_end, opt_step) {
  var array = [];
  var start = 0;
  var end = startOrEnd;
  var step = opt_step || 1;
  if (opt_end !== undefined) {
    start = startOrEnd;
    end = opt_end;
  }
  if (step * (end - start) < 0) {
    return[];
  }
  if (step > 0) {
    for (var i = start;i < end;i += step) {
      array.push(i);
    }
  } else {
    for (var i = start;i > end;i += step) {
      array.push(i);
    }
  }
  return array;
};
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0;i < n;i++) {
    array[i] = value;
  }
  return array;
};
goog.array.flatten = function(var_args) {
  var result = [];
  for (var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element));
    } else {
      result.push(element);
    }
  }
  return result;
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if (array.length) {
    n %= array.length;
    if (n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n));
    } else {
      if (n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n));
      }
    }
  }
  return array;
};
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return[];
  }
  var result = [];
  for (var i = 0;true;i++) {
    var value = [];
    for (var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if (i >= arr.length) {
        return result;
      }
      value.push(arr[i]);
    }
    result.push(value);
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for (var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for (var key in obj) {
    f.call(opt_obj, obj[key], key, obj);
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key];
    }
  }
  return res;
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};
goog.object.some = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      return true;
    }
  }
  return false;
};
goog.object.every = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (!f.call(opt_obj, obj[key], key, obj)) {
      return false;
    }
  }
  return true;
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};
goog.object.getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};
goog.object.getAnyValue = function(obj) {
  for (var key in obj) {
    return obj[key];
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val);
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = key;
  }
  return res;
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for (var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if (!goog.isDef(obj)) {
      break;
    }
  }
  return obj;
};
goog.object.containsKey = function(obj, key) {
  return key in obj;
};
goog.object.containsValue = function(obj, val) {
  for (var key in obj) {
    if (obj[key] == val) {
      return true;
    }
  }
  return false;
};
goog.object.findKey = function(obj, f, opt_this) {
  for (var key in obj) {
    if (f.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key];
};
goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};
goog.object.clear = function(obj) {
  for (var i in obj) {
    delete obj[i];
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if (rv = key in obj) {
    delete obj[key];
  }
  return rv;
};
goog.object.add = function(obj, key, val) {
  if (key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val);
};
goog.object.get = function(obj, key, opt_val) {
  if (key in obj) {
    return obj[key];
  }
  return opt_val;
};
goog.object.set = function(obj, key, value) {
  obj[key] = value;
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value;
};
goog.object.clone = function(obj) {
  var res = {};
  for (var key in obj) {
    res[key] = obj[key];
  }
  return res;
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if (type == "object" || type == "array") {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == "array" ? [] : {};
    for (var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key]);
    }
    return clone;
  }
  return obj;
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for (var key in obj) {
    transposed[obj[key]] = key;
  }
  return transposed;
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for (var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for (key in source) {
      target[key] = source[key];
    }
    for (var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }
  if (argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for (var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1];
  }
  return rv;
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }
  var rv = {};
  for (var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true;
  }
  return rv;
};
goog.object.createImmutableView = function(obj) {
  var result = obj;
  if (Object.isFrozen && !Object.isFrozen(obj)) {
    result = Object.create(obj);
    Object.freeze(result);
  }
  return result;
};
goog.object.isImmutableView = function(obj) {
  return!!Object.isFrozen && Object.isFrozen(obj);
};
goog.provide("goog.string.StringBuffer");
goog.string.StringBuffer = function(opt_a1, var_args) {
  if (opt_a1 != null) {
    this.append.apply(this, arguments);
  }
};
goog.string.StringBuffer.prototype.buffer_ = "";
goog.string.StringBuffer.prototype.set = function(s) {
  this.buffer_ = "" + s;
};
goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
  this.buffer_ += a1;
  if (opt_a2 != null) {
    for (var i = 1;i < arguments.length;i++) {
      this.buffer_ += arguments[i];
    }
  }
  return this;
};
goog.string.StringBuffer.prototype.clear = function() {
  this.buffer_ = "";
};
goog.string.StringBuffer.prototype.getLength = function() {
  return this.buffer_.length;
};
goog.string.StringBuffer.prototype.toString = function() {
  return this.buffer_;
};
goog.provide("cljs.core");
goog.require("goog.array");
goog.require("goog.array");
goog.require("goog.object");
goog.require("goog.object");
goog.require("goog.string.StringBuffer");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
goog.require("goog.string");
cljs.core._STAR_clojurescript_version_STAR_ = "0.0-2138";
cljs.core._STAR_unchecked_if_STAR_ = false;
cljs.core._STAR_print_fn_STAR_ = function _STAR_print_fn_STAR_(_) {
  throw new Error("No *print-fn* fn set for evaluation environment");
};
cljs.core.set_print_fn_BANG_ = function set_print_fn_BANG_(f) {
  return cljs.core._STAR_print_fn_STAR_ = f;
};
cljs.core._STAR_flush_on_newline_STAR_ = true;
cljs.core._STAR_print_newline_STAR_ = true;
cljs.core._STAR_print_readably_STAR_ = true;
cljs.core._STAR_print_meta_STAR_ = false;
cljs.core._STAR_print_dup_STAR_ = false;
cljs.core._STAR_print_length_STAR_ = null;
cljs.core._STAR_print_level_STAR_ = null;
cljs.core.pr_opts = function pr_opts() {
  return new cljs.core.PersistentArrayMap(null, 5, [new cljs.core.Keyword(null, "flush-on-newline", "flush-on-newline", 4338025857), cljs.core._STAR_flush_on_newline_STAR_, new cljs.core.Keyword(null, "readably", "readably", 4441712502), cljs.core._STAR_print_readably_STAR_, new cljs.core.Keyword(null, "meta", "meta", 1017252215), cljs.core._STAR_print_meta_STAR_, new cljs.core.Keyword(null, "dup", "dup", 1014004081), cljs.core._STAR_print_dup_STAR_, new cljs.core.Keyword(null, "print-length", "print-length", 
  3960797560), cljs.core._STAR_print_length_STAR_], null);
};
cljs.core.enable_console_print_BANG_ = function enable_console_print_BANG_() {
  cljs.core._STAR_print_newline_STAR_ = false;
  return cljs.core._STAR_print_fn_STAR_ = function() {
    var G__43829__delegate = function(args) {
      return console.log.apply(console, cljs.core.into_array.call(null, args));
    };
    var G__43829 = function(var_args) {
      var args = null;
      if (arguments.length > 0) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
      }
      return G__43829__delegate.call(this, args);
    };
    G__43829.cljs$lang$maxFixedArity = 0;
    G__43829.cljs$lang$applyTo = function(arglist__43830) {
      var args = cljs.core.seq(arglist__43830);
      return G__43829__delegate(args);
    };
    G__43829.cljs$core$IFn$_invoke$arity$variadic = G__43829__delegate;
    return G__43829;
  }();
};
cljs.core.truth_ = function truth_(x) {
  return x != null && x !== false;
};
cljs.core.not_native = null;
cljs.core.identical_QMARK_ = function identical_QMARK_(x, y) {
  return x === y;
};
cljs.core.nil_QMARK_ = function nil_QMARK_(x) {
  return x == null;
};
cljs.core.array_QMARK_ = function array_QMARK_(x) {
  return x instanceof Array;
};
cljs.core.number_QMARK_ = function number_QMARK_(n) {
  return typeof n === "number";
};
cljs.core.not = function not(x) {
  if (cljs.core.truth_(x)) {
    return false;
  } else {
    return true;
  }
};
cljs.core.object_QMARK_ = function object_QMARK_(x) {
  if (!(x == null)) {
    return x.constructor === Object;
  } else {
    return false;
  }
};
cljs.core.string_QMARK_ = function string_QMARK_(x) {
  return goog.isString(x);
};
cljs.core.native_satisfies_QMARK_ = function native_satisfies_QMARK_(p, x) {
  var x__$1 = x == null ? null : x;
  if (p[goog.typeOf(x__$1)]) {
    return true;
  } else {
    if (p["_"]) {
      return true;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return false;
      } else {
        return null;
      }
    }
  }
};
cljs.core.is_proto_ = function is_proto_(x) {
  return x.constructor.prototype === x;
};
cljs.core._STAR_main_cli_fn_STAR_ = null;
cljs.core.type = function type(x) {
  if (x == null) {
    return null;
  } else {
    return x.constructor;
  }
};
cljs.core.missing_protocol = function missing_protocol(proto, obj) {
  var ty = cljs.core.type.call(null, obj);
  var ty__$1 = cljs.core.truth_(function() {
    var and__3388__auto__ = ty;
    if (cljs.core.truth_(and__3388__auto__)) {
      return ty.cljs$lang$type;
    } else {
      return and__3388__auto__;
    }
  }()) ? ty.cljs$lang$ctorStr : goog.typeOf(obj);
  return new Error(["No protocol method ", proto, " defined for type ", ty__$1, ": ", obj].join(""));
};
cljs.core.type__GT_str = function type__GT_str(ty) {
  var temp__4090__auto__ = ty.cljs$lang$ctorStr;
  if (cljs.core.truth_(temp__4090__auto__)) {
    var s = temp__4090__auto__;
    return s;
  } else {
    return[cljs.core.str(ty)].join("");
  }
};
cljs.core.make_array = function() {
  var make_array = null;
  var make_array__1 = function(size) {
    return new Array(size);
  };
  var make_array__2 = function(type, size) {
    return make_array.call(null, size);
  };
  make_array = function(type, size) {
    switch(arguments.length) {
      case 1:
        return make_array__1.call(this, type);
      case 2:
        return make_array__2.call(this, type, size);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  make_array.cljs$core$IFn$_invoke$arity$1 = make_array__1;
  make_array.cljs$core$IFn$_invoke$arity$2 = make_array__2;
  return make_array;
}();
cljs.core.aclone = function aclone(arr) {
  var len = arr.length;
  var new_arr = new Array(len);
  var n__4242__auto___43831 = len;
  var i_43832 = 0;
  while (true) {
    if (i_43832 < n__4242__auto___43831) {
      new_arr[i_43832] = arr[i_43832];
      var G__43833 = i_43832 + 1;
      i_43832 = G__43833;
      continue;
    } else {
    }
    break;
  }
  return new_arr;
};
cljs.core.array = function array(var_args) {
  return Array.prototype.slice.call(arguments);
};
cljs.core.aget = function() {
  var aget = null;
  var aget__2 = function(array, i) {
    return array[i];
  };
  var aget__3 = function() {
    var G__43834__delegate = function(array, i, idxs) {
      return cljs.core.apply.call(null, aget, aget.call(null, array, i), idxs);
    };
    var G__43834 = function(array, i, var_args) {
      var idxs = null;
      if (arguments.length > 2) {
        idxs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__43834__delegate.call(this, array, i, idxs);
    };
    G__43834.cljs$lang$maxFixedArity = 2;
    G__43834.cljs$lang$applyTo = function(arglist__43835) {
      var array = cljs.core.first(arglist__43835);
      arglist__43835 = cljs.core.next(arglist__43835);
      var i = cljs.core.first(arglist__43835);
      var idxs = cljs.core.rest(arglist__43835);
      return G__43834__delegate(array, i, idxs);
    };
    G__43834.cljs$core$IFn$_invoke$arity$variadic = G__43834__delegate;
    return G__43834;
  }();
  aget = function(array, i, var_args) {
    var idxs = var_args;
    switch(arguments.length) {
      case 2:
        return aget__2.call(this, array, i);
      default:
        return aget__3.cljs$core$IFn$_invoke$arity$variadic(array, i, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  aget.cljs$lang$maxFixedArity = 2;
  aget.cljs$lang$applyTo = aget__3.cljs$lang$applyTo;
  aget.cljs$core$IFn$_invoke$arity$2 = aget__2;
  aget.cljs$core$IFn$_invoke$arity$variadic = aget__3.cljs$core$IFn$_invoke$arity$variadic;
  return aget;
}();
cljs.core.aset = function() {
  var aset = null;
  var aset__3 = function(array, i, val) {
    return array[i] = val;
  };
  var aset__4 = function() {
    var G__43836__delegate = function(array, idx, idx2, idxv) {
      return cljs.core.apply.call(null, aset, array[idx], idx2, idxv);
    };
    var G__43836 = function(array, idx, idx2, var_args) {
      var idxv = null;
      if (arguments.length > 3) {
        idxv = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__43836__delegate.call(this, array, idx, idx2, idxv);
    };
    G__43836.cljs$lang$maxFixedArity = 3;
    G__43836.cljs$lang$applyTo = function(arglist__43837) {
      var array = cljs.core.first(arglist__43837);
      arglist__43837 = cljs.core.next(arglist__43837);
      var idx = cljs.core.first(arglist__43837);
      arglist__43837 = cljs.core.next(arglist__43837);
      var idx2 = cljs.core.first(arglist__43837);
      var idxv = cljs.core.rest(arglist__43837);
      return G__43836__delegate(array, idx, idx2, idxv);
    };
    G__43836.cljs$core$IFn$_invoke$arity$variadic = G__43836__delegate;
    return G__43836;
  }();
  aset = function(array, idx, idx2, var_args) {
    var idxv = var_args;
    switch(arguments.length) {
      case 3:
        return aset__3.call(this, array, idx, idx2);
      default:
        return aset__4.cljs$core$IFn$_invoke$arity$variadic(array, idx, idx2, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  aset.cljs$lang$maxFixedArity = 3;
  aset.cljs$lang$applyTo = aset__4.cljs$lang$applyTo;
  aset.cljs$core$IFn$_invoke$arity$3 = aset__3;
  aset.cljs$core$IFn$_invoke$arity$variadic = aset__4.cljs$core$IFn$_invoke$arity$variadic;
  return aset;
}();
cljs.core.alength = function alength(array) {
  return array.length;
};
cljs.core.into_array = function() {
  var into_array = null;
  var into_array__1 = function(aseq) {
    return into_array.call(null, null, aseq);
  };
  var into_array__2 = function(type, aseq) {
    return cljs.core.reduce.call(null, function(a, x) {
      a.push(x);
      return a;
    }, [], aseq);
  };
  into_array = function(type, aseq) {
    switch(arguments.length) {
      case 1:
        return into_array__1.call(this, type);
      case 2:
        return into_array__2.call(this, type, aseq);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  into_array.cljs$core$IFn$_invoke$arity$1 = into_array__1;
  into_array.cljs$core$IFn$_invoke$arity$2 = into_array__2;
  return into_array;
}();
cljs.core.Fn = function() {
  var obj43839 = {};
  return obj43839;
}();
cljs.core.IFn = function() {
  var obj43841 = {};
  return obj43841;
}();
cljs.core._invoke = function() {
  var _invoke = null;
  var _invoke__1 = function(this$) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$1;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$1(this$);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$);
    }
  };
  var _invoke__2 = function(this$, a) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$2;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$2(this$, a);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a);
    }
  };
  var _invoke__3 = function(this$, a, b) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$3;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$3(this$, a, b);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b);
    }
  };
  var _invoke__4 = function(this$, a, b, c) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$4;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$4(this$, a, b, c);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c);
    }
  };
  var _invoke__5 = function(this$, a, b, c, d) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$5;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$5(this$, a, b, c, d);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d);
    }
  };
  var _invoke__6 = function(this$, a, b, c, d, e) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$6;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$6(this$, a, b, c, d, e);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e);
    }
  };
  var _invoke__7 = function(this$, a, b, c, d, e, f) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$7;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$7(this$, a, b, c, d, e, f);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f);
    }
  };
  var _invoke__8 = function(this$, a, b, c, d, e, f, g) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$8;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$8(this$, a, b, c, d, e, f, g);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g);
    }
  };
  var _invoke__9 = function(this$, a, b, c, d, e, f, g, h) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$9;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$9(this$, a, b, c, d, e, f, g, h);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h);
    }
  };
  var _invoke__10 = function(this$, a, b, c, d, e, f, g, h, i) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$10;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$10(this$, a, b, c, d, e, f, g, h, i);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i);
    }
  };
  var _invoke__11 = function(this$, a, b, c, d, e, f, g, h, i, j) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$11;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$11(this$, a, b, c, d, e, f, g, h, i, j);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j);
    }
  };
  var _invoke__12 = function(this$, a, b, c, d, e, f, g, h, i, j, k) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$12;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$12(this$, a, b, c, d, e, f, g, h, i, j, k);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k);
    }
  };
  var _invoke__13 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$13;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$13(this$, a, b, c, d, e, f, g, h, i, j, k, l);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l);
    }
  };
  var _invoke__14 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$14;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$14(this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
    }
  };
  var _invoke__15 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$15;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$15(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
    }
  };
  var _invoke__16 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$16;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$16(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
    }
  };
  var _invoke__17 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$17;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$17(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
    }
  };
  var _invoke__18 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$18;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$18(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
    }
  };
  var _invoke__19 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$19;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$19(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
    }
  };
  var _invoke__20 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$20;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$20(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
    }
  };
  var _invoke__21 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    if (function() {
      var and__3388__auto__ = this$;
      if (and__3388__auto__) {
        return this$.cljs$core$IFn$_invoke$arity$21;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$21(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest);
    } else {
      var x__4021__auto__ = this$ == null ? null : this$;
      return function() {
        var or__3400__auto__ = cljs.core._invoke[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._invoke["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest);
    }
  };
  _invoke = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    switch(arguments.length) {
      case 1:
        return _invoke__1.call(this, this$);
      case 2:
        return _invoke__2.call(this, this$, a);
      case 3:
        return _invoke__3.call(this, this$, a, b);
      case 4:
        return _invoke__4.call(this, this$, a, b, c);
      case 5:
        return _invoke__5.call(this, this$, a, b, c, d);
      case 6:
        return _invoke__6.call(this, this$, a, b, c, d, e);
      case 7:
        return _invoke__7.call(this, this$, a, b, c, d, e, f);
      case 8:
        return _invoke__8.call(this, this$, a, b, c, d, e, f, g);
      case 9:
        return _invoke__9.call(this, this$, a, b, c, d, e, f, g, h);
      case 10:
        return _invoke__10.call(this, this$, a, b, c, d, e, f, g, h, i);
      case 11:
        return _invoke__11.call(this, this$, a, b, c, d, e, f, g, h, i, j);
      case 12:
        return _invoke__12.call(this, this$, a, b, c, d, e, f, g, h, i, j, k);
      case 13:
        return _invoke__13.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l);
      case 14:
        return _invoke__14.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
      case 15:
        return _invoke__15.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
      case 16:
        return _invoke__16.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
      case 17:
        return _invoke__17.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
      case 18:
        return _invoke__18.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
      case 19:
        return _invoke__19.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
      case 20:
        return _invoke__20.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
      case 21:
        return _invoke__21.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _invoke.cljs$core$IFn$_invoke$arity$1 = _invoke__1;
  _invoke.cljs$core$IFn$_invoke$arity$2 = _invoke__2;
  _invoke.cljs$core$IFn$_invoke$arity$3 = _invoke__3;
  _invoke.cljs$core$IFn$_invoke$arity$4 = _invoke__4;
  _invoke.cljs$core$IFn$_invoke$arity$5 = _invoke__5;
  _invoke.cljs$core$IFn$_invoke$arity$6 = _invoke__6;
  _invoke.cljs$core$IFn$_invoke$arity$7 = _invoke__7;
  _invoke.cljs$core$IFn$_invoke$arity$8 = _invoke__8;
  _invoke.cljs$core$IFn$_invoke$arity$9 = _invoke__9;
  _invoke.cljs$core$IFn$_invoke$arity$10 = _invoke__10;
  _invoke.cljs$core$IFn$_invoke$arity$11 = _invoke__11;
  _invoke.cljs$core$IFn$_invoke$arity$12 = _invoke__12;
  _invoke.cljs$core$IFn$_invoke$arity$13 = _invoke__13;
  _invoke.cljs$core$IFn$_invoke$arity$14 = _invoke__14;
  _invoke.cljs$core$IFn$_invoke$arity$15 = _invoke__15;
  _invoke.cljs$core$IFn$_invoke$arity$16 = _invoke__16;
  _invoke.cljs$core$IFn$_invoke$arity$17 = _invoke__17;
  _invoke.cljs$core$IFn$_invoke$arity$18 = _invoke__18;
  _invoke.cljs$core$IFn$_invoke$arity$19 = _invoke__19;
  _invoke.cljs$core$IFn$_invoke$arity$20 = _invoke__20;
  _invoke.cljs$core$IFn$_invoke$arity$21 = _invoke__21;
  return _invoke;
}();
cljs.core.ICloneable = function() {
  var obj43843 = {};
  return obj43843;
}();
cljs.core._clone = function _clone(value) {
  if (function() {
    var and__3388__auto__ = value;
    if (and__3388__auto__) {
      return value.cljs$core$ICloneable$_clone$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return value.cljs$core$ICloneable$_clone$arity$1(value);
  } else {
    var x__4021__auto__ = value == null ? null : value;
    return function() {
      var or__3400__auto__ = cljs.core._clone[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._clone["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ICloneable.-clone", value);
        }
      }
    }().call(null, value);
  }
};
cljs.core.ICounted = function() {
  var obj43845 = {};
  return obj43845;
}();
cljs.core._count = function _count(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ICounted$_count$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ICounted$_count$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._count[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._count["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ICounted.-count", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.IEmptyableCollection = function() {
  var obj43847 = {};
  return obj43847;
}();
cljs.core._empty = function _empty(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._empty[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._empty["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEmptyableCollection.-empty", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.ICollection = function() {
  var obj43849 = {};
  return obj43849;
}();
cljs.core._conj = function _conj(coll, o) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ICollection$_conj$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ICollection$_conj$arity$2(coll, o);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._conj[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._conj["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ICollection.-conj", coll);
        }
      }
    }().call(null, coll, o);
  }
};
cljs.core.IIndexed = function() {
  var obj43851 = {};
  return obj43851;
}();
cljs.core._nth = function() {
  var _nth = null;
  var _nth__2 = function(coll, n) {
    if (function() {
      var and__3388__auto__ = coll;
      if (and__3388__auto__) {
        return coll.cljs$core$IIndexed$_nth$arity$2;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$2(coll, n);
    } else {
      var x__4021__auto__ = coll == null ? null : coll;
      return function() {
        var or__3400__auto__ = cljs.core._nth[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._nth["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n);
    }
  };
  var _nth__3 = function(coll, n, not_found) {
    if (function() {
      var and__3388__auto__ = coll;
      if (and__3388__auto__) {
        return coll.cljs$core$IIndexed$_nth$arity$3;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$3(coll, n, not_found);
    } else {
      var x__4021__auto__ = coll == null ? null : coll;
      return function() {
        var or__3400__auto__ = cljs.core._nth[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._nth["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n, not_found);
    }
  };
  _nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return _nth__2.call(this, coll, n);
      case 3:
        return _nth__3.call(this, coll, n, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _nth.cljs$core$IFn$_invoke$arity$2 = _nth__2;
  _nth.cljs$core$IFn$_invoke$arity$3 = _nth__3;
  return _nth;
}();
cljs.core.ASeq = function() {
  var obj43853 = {};
  return obj43853;
}();
cljs.core.ISeq = function() {
  var obj43855 = {};
  return obj43855;
}();
cljs.core._first = function _first(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISeq$_first$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISeq$_first$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._first[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._first["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-first", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core._rest = function _rest(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISeq$_rest$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISeq$_rest$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._rest[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._rest["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-rest", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.INext = function() {
  var obj43857 = {};
  return obj43857;
}();
cljs.core._next = function _next(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$INext$_next$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$INext$_next$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._next[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._next["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "INext.-next", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.ILookup = function() {
  var obj43859 = {};
  return obj43859;
}();
cljs.core._lookup = function() {
  var _lookup = null;
  var _lookup__2 = function(o, k) {
    if (function() {
      var and__3388__auto__ = o;
      if (and__3388__auto__) {
        return o.cljs$core$ILookup$_lookup$arity$2;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$2(o, k);
    } else {
      var x__4021__auto__ = o == null ? null : o;
      return function() {
        var or__3400__auto__ = cljs.core._lookup[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._lookup["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k);
    }
  };
  var _lookup__3 = function(o, k, not_found) {
    if (function() {
      var and__3388__auto__ = o;
      if (and__3388__auto__) {
        return o.cljs$core$ILookup$_lookup$arity$3;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$3(o, k, not_found);
    } else {
      var x__4021__auto__ = o == null ? null : o;
      return function() {
        var or__3400__auto__ = cljs.core._lookup[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._lookup["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k, not_found);
    }
  };
  _lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return _lookup__2.call(this, o, k);
      case 3:
        return _lookup__3.call(this, o, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _lookup.cljs$core$IFn$_invoke$arity$2 = _lookup__2;
  _lookup.cljs$core$IFn$_invoke$arity$3 = _lookup__3;
  return _lookup;
}();
cljs.core.IAssociative = function() {
  var obj43861 = {};
  return obj43861;
}();
cljs.core._contains_key_QMARK_ = function _contains_key_QMARK_(coll, k) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2(coll, k);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._contains_key_QMARK_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._contains_key_QMARK_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-contains-key?", coll);
        }
      }
    }().call(null, coll, k);
  }
};
cljs.core._assoc = function _assoc(coll, k, v) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IAssociative$_assoc$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, k, v);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._assoc[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._assoc["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-assoc", coll);
        }
      }
    }().call(null, coll, k, v);
  }
};
cljs.core.IMap = function() {
  var obj43863 = {};
  return obj43863;
}();
cljs.core._dissoc = function _dissoc(coll, k) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IMap$_dissoc$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IMap$_dissoc$arity$2(coll, k);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._dissoc[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._dissoc["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMap.-dissoc", coll);
        }
      }
    }().call(null, coll, k);
  }
};
cljs.core.IMapEntry = function() {
  var obj43865 = {};
  return obj43865;
}();
cljs.core._key = function _key(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IMapEntry$_key$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IMapEntry$_key$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._key[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._key["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-key", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core._val = function _val(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IMapEntry$_val$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IMapEntry$_val$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._val[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._val["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-val", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.ISet = function() {
  var obj43867 = {};
  return obj43867;
}();
cljs.core._disjoin = function _disjoin(coll, v) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISet$_disjoin$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISet$_disjoin$arity$2(coll, v);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._disjoin[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._disjoin["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISet.-disjoin", coll);
        }
      }
    }().call(null, coll, v);
  }
};
cljs.core.IStack = function() {
  var obj43869 = {};
  return obj43869;
}();
cljs.core._peek = function _peek(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IStack$_peek$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IStack$_peek$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._peek[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._peek["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IStack.-peek", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core._pop = function _pop(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IStack$_pop$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IStack$_pop$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._pop[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._pop["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IStack.-pop", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.IVector = function() {
  var obj43871 = {};
  return obj43871;
}();
cljs.core._assoc_n = function _assoc_n(coll, n, val) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IVector$_assoc_n$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IVector$_assoc_n$arity$3(coll, n, val);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._assoc_n[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._assoc_n["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IVector.-assoc-n", coll);
        }
      }
    }().call(null, coll, n, val);
  }
};
cljs.core.IDeref = function() {
  var obj43873 = {};
  return obj43873;
}();
cljs.core._deref = function _deref(o) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IDeref$_deref$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IDeref$_deref$arity$1(o);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._deref[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._deref["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IDeref.-deref", o);
        }
      }
    }().call(null, o);
  }
};
cljs.core.IDerefWithTimeout = function() {
  var obj43875 = {};
  return obj43875;
}();
cljs.core._deref_with_timeout = function _deref_with_timeout(o, msec, timeout_val) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3(o, msec, timeout_val);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._deref_with_timeout[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._deref_with_timeout["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IDerefWithTimeout.-deref-with-timeout", o);
        }
      }
    }().call(null, o, msec, timeout_val);
  }
};
cljs.core.IMeta = function() {
  var obj43877 = {};
  return obj43877;
}();
cljs.core._meta = function _meta(o) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IMeta$_meta$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IMeta$_meta$arity$1(o);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._meta[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._meta["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMeta.-meta", o);
        }
      }
    }().call(null, o);
  }
};
cljs.core.IWithMeta = function() {
  var obj43879 = {};
  return obj43879;
}();
cljs.core._with_meta = function _with_meta(o, meta) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IWithMeta$_with_meta$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IWithMeta$_with_meta$arity$2(o, meta);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._with_meta[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._with_meta["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWithMeta.-with-meta", o);
        }
      }
    }().call(null, o, meta);
  }
};
cljs.core.IReduce = function() {
  var obj43881 = {};
  return obj43881;
}();
cljs.core._reduce = function() {
  var _reduce = null;
  var _reduce__2 = function(coll, f) {
    if (function() {
      var and__3388__auto__ = coll;
      if (and__3388__auto__) {
        return coll.cljs$core$IReduce$_reduce$arity$2;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$2(coll, f);
    } else {
      var x__4021__auto__ = coll == null ? null : coll;
      return function() {
        var or__3400__auto__ = cljs.core._reduce[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._reduce["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f);
    }
  };
  var _reduce__3 = function(coll, f, start) {
    if (function() {
      var and__3388__auto__ = coll;
      if (and__3388__auto__) {
        return coll.cljs$core$IReduce$_reduce$arity$3;
      } else {
        return and__3388__auto__;
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$3(coll, f, start);
    } else {
      var x__4021__auto__ = coll == null ? null : coll;
      return function() {
        var or__3400__auto__ = cljs.core._reduce[goog.typeOf(x__4021__auto__)];
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = cljs.core._reduce["_"];
          if (or__3400__auto____$1) {
            return or__3400__auto____$1;
          } else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f, start);
    }
  };
  _reduce = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return _reduce__2.call(this, coll, f);
      case 3:
        return _reduce__3.call(this, coll, f, start);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _reduce.cljs$core$IFn$_invoke$arity$2 = _reduce__2;
  _reduce.cljs$core$IFn$_invoke$arity$3 = _reduce__3;
  return _reduce;
}();
cljs.core.IKVReduce = function() {
  var obj43883 = {};
  return obj43883;
}();
cljs.core._kv_reduce = function _kv_reduce(coll, f, init) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IKVReduce$_kv_reduce$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IKVReduce$_kv_reduce$arity$3(coll, f, init);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._kv_reduce[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._kv_reduce["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IKVReduce.-kv-reduce", coll);
        }
      }
    }().call(null, coll, f, init);
  }
};
cljs.core.IEquiv = function() {
  var obj43885 = {};
  return obj43885;
}();
cljs.core._equiv = function _equiv(o, other) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IEquiv$_equiv$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IEquiv$_equiv$arity$2(o, other);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._equiv[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._equiv["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEquiv.-equiv", o);
        }
      }
    }().call(null, o, other);
  }
};
cljs.core.IHash = function() {
  var obj43887 = {};
  return obj43887;
}();
cljs.core._hash = function _hash(o) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IHash$_hash$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IHash$_hash$arity$1(o);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._hash[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._hash["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IHash.-hash", o);
        }
      }
    }().call(null, o);
  }
};
cljs.core.ISeqable = function() {
  var obj43889 = {};
  return obj43889;
}();
cljs.core._seq = function _seq(o) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$ISeqable$_seq$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$ISeqable$_seq$arity$1(o);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._seq[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._seq["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISeqable.-seq", o);
        }
      }
    }().call(null, o);
  }
};
cljs.core.ISequential = function() {
  var obj43891 = {};
  return obj43891;
}();
cljs.core.IList = function() {
  var obj43893 = {};
  return obj43893;
}();
cljs.core.IRecord = function() {
  var obj43895 = {};
  return obj43895;
}();
cljs.core.IReversible = function() {
  var obj43897 = {};
  return obj43897;
}();
cljs.core._rseq = function _rseq(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IReversible$_rseq$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IReversible$_rseq$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._rseq[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._rseq["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IReversible.-rseq", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.ISorted = function() {
  var obj43899 = {};
  return obj43899;
}();
cljs.core._sorted_seq = function _sorted_seq(coll, ascending_QMARK_) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISorted$_sorted_seq$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq$arity$2(coll, ascending_QMARK_);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._sorted_seq[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._sorted_seq["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq", coll);
        }
      }
    }().call(null, coll, ascending_QMARK_);
  }
};
cljs.core._sorted_seq_from = function _sorted_seq_from(coll, k, ascending_QMARK_) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISorted$_sorted_seq_from$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq_from$arity$3(coll, k, ascending_QMARK_);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._sorted_seq_from[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._sorted_seq_from["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq-from", coll);
        }
      }
    }().call(null, coll, k, ascending_QMARK_);
  }
};
cljs.core._entry_key = function _entry_key(coll, entry) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISorted$_entry_key$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISorted$_entry_key$arity$2(coll, entry);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._entry_key[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._entry_key["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-entry-key", coll);
        }
      }
    }().call(null, coll, entry);
  }
};
cljs.core._comparator = function _comparator(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$ISorted$_comparator$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$ISorted$_comparator$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._comparator[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._comparator["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-comparator", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.IWriter = function() {
  var obj43901 = {};
  return obj43901;
}();
cljs.core._write = function _write(writer, s) {
  if (function() {
    var and__3388__auto__ = writer;
    if (and__3388__auto__) {
      return writer.cljs$core$IWriter$_write$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return writer.cljs$core$IWriter$_write$arity$2(writer, s);
  } else {
    var x__4021__auto__ = writer == null ? null : writer;
    return function() {
      var or__3400__auto__ = cljs.core._write[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._write["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWriter.-write", writer);
        }
      }
    }().call(null, writer, s);
  }
};
cljs.core._flush = function _flush(writer) {
  if (function() {
    var and__3388__auto__ = writer;
    if (and__3388__auto__) {
      return writer.cljs$core$IWriter$_flush$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return writer.cljs$core$IWriter$_flush$arity$1(writer);
  } else {
    var x__4021__auto__ = writer == null ? null : writer;
    return function() {
      var or__3400__auto__ = cljs.core._flush[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._flush["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWriter.-flush", writer);
        }
      }
    }().call(null, writer);
  }
};
cljs.core.IPrintWithWriter = function() {
  var obj43903 = {};
  return obj43903;
}();
cljs.core._pr_writer = function _pr_writer(o, writer, opts) {
  if (function() {
    var and__3388__auto__ = o;
    if (and__3388__auto__) {
      return o.cljs$core$IPrintWithWriter$_pr_writer$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return o.cljs$core$IPrintWithWriter$_pr_writer$arity$3(o, writer, opts);
  } else {
    var x__4021__auto__ = o == null ? null : o;
    return function() {
      var or__3400__auto__ = cljs.core._pr_writer[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._pr_writer["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IPrintWithWriter.-pr-writer", o);
        }
      }
    }().call(null, o, writer, opts);
  }
};
cljs.core.IPending = function() {
  var obj43905 = {};
  return obj43905;
}();
cljs.core._realized_QMARK_ = function _realized_QMARK_(d) {
  if (function() {
    var and__3388__auto__ = d;
    if (and__3388__auto__) {
      return d.cljs$core$IPending$_realized_QMARK_$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return d.cljs$core$IPending$_realized_QMARK_$arity$1(d);
  } else {
    var x__4021__auto__ = d == null ? null : d;
    return function() {
      var or__3400__auto__ = cljs.core._realized_QMARK_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._realized_QMARK_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IPending.-realized?", d);
        }
      }
    }().call(null, d);
  }
};
cljs.core.IWatchable = function() {
  var obj43907 = {};
  return obj43907;
}();
cljs.core._notify_watches = function _notify_watches(this$, oldval, newval) {
  if (function() {
    var and__3388__auto__ = this$;
    if (and__3388__auto__) {
      return this$.cljs$core$IWatchable$_notify_watches$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return this$.cljs$core$IWatchable$_notify_watches$arity$3(this$, oldval, newval);
  } else {
    var x__4021__auto__ = this$ == null ? null : this$;
    return function() {
      var or__3400__auto__ = cljs.core._notify_watches[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._notify_watches["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-notify-watches", this$);
        }
      }
    }().call(null, this$, oldval, newval);
  }
};
cljs.core._add_watch = function _add_watch(this$, key, f) {
  if (function() {
    var and__3388__auto__ = this$;
    if (and__3388__auto__) {
      return this$.cljs$core$IWatchable$_add_watch$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return this$.cljs$core$IWatchable$_add_watch$arity$3(this$, key, f);
  } else {
    var x__4021__auto__ = this$ == null ? null : this$;
    return function() {
      var or__3400__auto__ = cljs.core._add_watch[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._add_watch["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-add-watch", this$);
        }
      }
    }().call(null, this$, key, f);
  }
};
cljs.core._remove_watch = function _remove_watch(this$, key) {
  if (function() {
    var and__3388__auto__ = this$;
    if (and__3388__auto__) {
      return this$.cljs$core$IWatchable$_remove_watch$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return this$.cljs$core$IWatchable$_remove_watch$arity$2(this$, key);
  } else {
    var x__4021__auto__ = this$ == null ? null : this$;
    return function() {
      var or__3400__auto__ = cljs.core._remove_watch[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._remove_watch["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-remove-watch", this$);
        }
      }
    }().call(null, this$, key);
  }
};
cljs.core.IEditableCollection = function() {
  var obj43909 = {};
  return obj43909;
}();
cljs.core._as_transient = function _as_transient(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IEditableCollection$_as_transient$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IEditableCollection$_as_transient$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._as_transient[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._as_transient["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEditableCollection.-as-transient", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.ITransientCollection = function() {
  var obj43911 = {};
  return obj43911;
}();
cljs.core._conj_BANG_ = function _conj_BANG_(tcoll, val) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._conj_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._conj_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-conj!", tcoll);
        }
      }
    }().call(null, tcoll, val);
  }
};
cljs.core._persistent_BANG_ = function _persistent_BANG_(tcoll) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1(tcoll);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._persistent_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._persistent_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-persistent!", tcoll);
        }
      }
    }().call(null, tcoll);
  }
};
cljs.core.ITransientAssociative = function() {
  var obj43913 = {};
  return obj43913;
}();
cljs.core._assoc_BANG_ = function _assoc_BANG_(tcoll, key, val) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, key, val);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._assoc_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._assoc_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientAssociative.-assoc!", tcoll);
        }
      }
    }().call(null, tcoll, key, val);
  }
};
cljs.core.ITransientMap = function() {
  var obj43915 = {};
  return obj43915;
}();
cljs.core._dissoc_BANG_ = function _dissoc_BANG_(tcoll, key) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientMap$_dissoc_BANG_$arity$2(tcoll, key);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._dissoc_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._dissoc_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientMap.-dissoc!", tcoll);
        }
      }
    }().call(null, tcoll, key);
  }
};
cljs.core.ITransientVector = function() {
  var obj43917 = {};
  return obj43917;
}();
cljs.core._assoc_n_BANG_ = function _assoc_n_BANG_(tcoll, n, val) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3(tcoll, n, val);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._assoc_n_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._assoc_n_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-assoc-n!", tcoll);
        }
      }
    }().call(null, tcoll, n, val);
  }
};
cljs.core._pop_BANG_ = function _pop_BANG_(tcoll) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientVector$_pop_BANG_$arity$1(tcoll);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._pop_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._pop_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientVector.-pop!", tcoll);
        }
      }
    }().call(null, tcoll);
  }
};
cljs.core.ITransientSet = function() {
  var obj43919 = {};
  return obj43919;
}();
cljs.core._disjoin_BANG_ = function _disjoin_BANG_(tcoll, v) {
  if (function() {
    var and__3388__auto__ = tcoll;
    if (and__3388__auto__) {
      return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return tcoll.cljs$core$ITransientSet$_disjoin_BANG_$arity$2(tcoll, v);
  } else {
    var x__4021__auto__ = tcoll == null ? null : tcoll;
    return function() {
      var or__3400__auto__ = cljs.core._disjoin_BANG_[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._disjoin_BANG_["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "ITransientSet.-disjoin!", tcoll);
        }
      }
    }().call(null, tcoll, v);
  }
};
cljs.core.IComparable = function() {
  var obj43921 = {};
  return obj43921;
}();
cljs.core._compare = function _compare(x, y) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$IComparable$_compare$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$IComparable$_compare$arity$2(x, y);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._compare[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._compare["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IComparable.-compare", x);
        }
      }
    }().call(null, x, y);
  }
};
cljs.core.IChunk = function() {
  var obj43923 = {};
  return obj43923;
}();
cljs.core._drop_first = function _drop_first(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IChunk$_drop_first$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IChunk$_drop_first$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._drop_first[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._drop_first["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IChunk.-drop-first", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.IChunkedSeq = function() {
  var obj43925 = {};
  return obj43925;
}();
cljs.core._chunked_first = function _chunked_first(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_first$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._chunked_first[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._chunked_first["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-first", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core._chunked_rest = function _chunked_rest(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IChunkedSeq$_chunked_rest$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._chunked_rest[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._chunked_rest["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IChunkedSeq.-chunked-rest", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.IChunkedNext = function() {
  var obj43927 = {};
  return obj43927;
}();
cljs.core._chunked_next = function _chunked_next(coll) {
  if (function() {
    var and__3388__auto__ = coll;
    if (and__3388__auto__) {
      return coll.cljs$core$IChunkedNext$_chunked_next$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return coll.cljs$core$IChunkedNext$_chunked_next$arity$1(coll);
  } else {
    var x__4021__auto__ = coll == null ? null : coll;
    return function() {
      var or__3400__auto__ = cljs.core._chunked_next[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._chunked_next["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IChunkedNext.-chunked-next", coll);
        }
      }
    }().call(null, coll);
  }
};
cljs.core.INamed = function() {
  var obj43929 = {};
  return obj43929;
}();
cljs.core._name = function _name(x) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$INamed$_name$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$INamed$_name$arity$1(x);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._name[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._name["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "INamed.-name", x);
        }
      }
    }().call(null, x);
  }
};
cljs.core._namespace = function _namespace(x) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$INamed$_namespace$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$INamed$_namespace$arity$1(x);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._namespace[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._namespace["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "INamed.-namespace", x);
        }
      }
    }().call(null, x);
  }
};
cljs.core.StringBufferWriter = function(sb) {
  this.sb = sb;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 1073741824;
};
cljs.core.StringBufferWriter.cljs$lang$type = true;
cljs.core.StringBufferWriter.cljs$lang$ctorStr = "cljs.core/StringBufferWriter";
cljs.core.StringBufferWriter.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/StringBufferWriter");
};
cljs.core.StringBufferWriter.prototype.cljs$core$IWriter$_write$arity$2 = function(_, s) {
  var self__ = this;
  var ___$1 = this;
  return self__.sb.append(s);
};
cljs.core.StringBufferWriter.prototype.cljs$core$IWriter$_flush$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return null;
};
cljs.core.__GT_StringBufferWriter = function __GT_StringBufferWriter(sb) {
  return new cljs.core.StringBufferWriter(sb);
};
cljs.core.pr_str_STAR_ = function pr_str_STAR_(obj) {
  var sb = new goog.string.StringBuffer;
  var writer = new cljs.core.StringBufferWriter(sb);
  cljs.core._pr_writer.call(null, obj, writer, cljs.core.pr_opts.call(null));
  cljs.core._flush.call(null, writer);
  return[cljs.core.str(sb)].join("");
};
cljs.core.instance_QMARK_ = function instance_QMARK_(t, o) {
  return o instanceof t;
};
cljs.core.symbol_QMARK_ = function symbol_QMARK_(x) {
  return x instanceof cljs.core.Symbol;
};
cljs.core.hash_symbol = function hash_symbol(sym) {
  return cljs.core.hash_combine.call(null, cljs.core.hash.call(null, sym.ns), cljs.core.hash.call(null, sym.name));
};
cljs.core.compare_symbols = function compare_symbols(a, b) {
  if (cljs.core.truth_(cljs.core._EQ_.call(null, a, b))) {
    return 0;
  } else {
    if (cljs.core.truth_(function() {
      var and__3388__auto__ = cljs.core.not.call(null, a.ns);
      if (and__3388__auto__) {
        return b.ns;
      } else {
        return and__3388__auto__;
      }
    }())) {
      return-1;
    } else {
      if (cljs.core.truth_(a.ns)) {
        if (cljs.core.not.call(null, b.ns)) {
          return 1;
        } else {
          var nsc = cljs.core.compare.call(null, a.ns, b.ns);
          if (nsc === 0) {
            return cljs.core.compare.call(null, a.name, b.name);
          } else {
            return nsc;
          }
        }
      } else {
        if (new cljs.core.Keyword(null, "default", "default", 2558708147)) {
          return cljs.core.compare.call(null, a.name, b.name);
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.Symbol = function(ns, name, str, _hash, _meta) {
  this.ns = ns;
  this.name = name;
  this.str = str;
  this._hash = _hash;
  this._meta = _meta;
  this.cljs$lang$protocol_mask$partition0$ = 2154168321;
  this.cljs$lang$protocol_mask$partition1$ = 4096;
};
cljs.core.Symbol.cljs$lang$type = true;
cljs.core.Symbol.cljs$lang$ctorStr = "cljs.core/Symbol";
cljs.core.Symbol.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Symbol");
};
cljs.core.Symbol.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(o, writer, _) {
  var self__ = this;
  var o__$1 = this;
  return cljs.core._write.call(null, writer, self__.str);
};
cljs.core.Symbol.prototype.cljs$core$INamed$_name$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.name;
};
cljs.core.Symbol.prototype.cljs$core$INamed$_namespace$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.ns;
};
cljs.core.Symbol.prototype.cljs$core$IHash$_hash$arity$1 = function(sym) {
  var self__ = this;
  var sym__$1 = this;
  var h__3811__auto__ = self__._hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_symbol.call(null, sym__$1);
    self__._hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.Symbol.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(_, new_meta) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Symbol(self__.ns, self__.name, self__.str, self__._hash, new_meta);
};
cljs.core.Symbol.prototype.cljs$core$IMeta$_meta$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__._meta;
};
cljs.core.Symbol.prototype.call = function() {
  var G__43931 = null;
  var G__43931__2 = function(self__, coll) {
    var self__ = this;
    var self____$1 = this;
    var sym = self____$1;
    return cljs.core._lookup.call(null, coll, sym, null);
  };
  var G__43931__3 = function(self__, coll, not_found) {
    var self__ = this;
    var self____$1 = this;
    var sym = self____$1;
    return cljs.core._lookup.call(null, coll, sym, not_found);
  };
  G__43931 = function(self__, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__43931__2.call(this, self__, coll);
      case 3:
        return G__43931__3.call(this, self__, coll, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__43931;
}();
cljs.core.Symbol.prototype.apply = function(self__, args43930) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args43930)));
};
cljs.core.Symbol.prototype.cljs$core$IFn$_invoke$arity$1 = function(coll) {
  var self__ = this;
  var sym = this;
  return cljs.core._lookup.call(null, coll, sym, null);
};
cljs.core.Symbol.prototype.cljs$core$IFn$_invoke$arity$2 = function(coll, not_found) {
  var self__ = this;
  var sym = this;
  return cljs.core._lookup.call(null, coll, sym, not_found);
};
cljs.core.Symbol.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(_, other) {
  var self__ = this;
  var ___$1 = this;
  if (other instanceof cljs.core.Symbol) {
    return self__.str === other.str;
  } else {
    return false;
  }
};
cljs.core.Symbol.prototype.cljs$core$ICloneable$ = true;
cljs.core.Symbol.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Symbol(self__.ns, self__.name, self__.str, self__._hash, self__._meta);
};
cljs.core.Symbol.prototype.toString = function() {
  var self__ = this;
  var _ = this;
  return self__.str;
};
cljs.core.__GT_Symbol = function __GT_Symbol(ns, name, str, _hash, _meta) {
  return new cljs.core.Symbol(ns, name, str, _hash, _meta);
};
cljs.core.symbol = function() {
  var symbol = null;
  var symbol__1 = function(name) {
    if (name instanceof cljs.core.Symbol) {
      return name;
    } else {
      return symbol.call(null, null, name);
    }
  };
  var symbol__2 = function(ns, name) {
    var sym_str = !(ns == null) ? [cljs.core.str(ns), cljs.core.str("/"), cljs.core.str(name)].join("") : name;
    return new cljs.core.Symbol(ns, name, sym_str, null, null);
  };
  symbol = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return symbol__1.call(this, ns);
      case 2:
        return symbol__2.call(this, ns, name);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  symbol.cljs$core$IFn$_invoke$arity$1 = symbol__1;
  symbol.cljs$core$IFn$_invoke$arity$2 = symbol__2;
  return symbol;
}();
cljs.core.clone = function clone(value) {
  return cljs.core._clone.call(null, value);
};
cljs.core.seq = function seq(coll) {
  if (coll == null) {
    return null;
  } else {
    if (function() {
      var G__43933 = coll;
      if (G__43933) {
        var bit__4037__auto__ = G__43933.cljs$lang$protocol_mask$partition0$ & 8388608;
        if (bit__4037__auto__ || G__43933.cljs$core$ISeqable$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._seq.call(null, coll);
    } else {
      if (coll instanceof Array) {
        if (coll.length === 0) {
          return null;
        } else {
          return new cljs.core.IndexedSeq(coll, 0);
        }
      } else {
        if (typeof coll === "string") {
          if (coll.length === 0) {
            return null;
          } else {
            return new cljs.core.IndexedSeq(coll, 0);
          }
        } else {
          if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeqable, coll)) {
            return cljs.core._seq.call(null, coll);
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              throw new Error([cljs.core.str(coll), cljs.core.str("is not ISeqable")].join(""));
            } else {
              return null;
            }
          }
        }
      }
    }
  }
};
cljs.core.first = function first(coll) {
  if (coll == null) {
    return null;
  } else {
    if (function() {
      var G__43935 = coll;
      if (G__43935) {
        var bit__4037__auto__ = G__43935.cljs$lang$protocol_mask$partition0$ & 64;
        if (bit__4037__auto__ || G__43935.cljs$core$ISeq$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._first.call(null, coll);
    } else {
      var s = cljs.core.seq.call(null, coll);
      if (s == null) {
        return null;
      } else {
        return cljs.core._first.call(null, s);
      }
    }
  }
};
cljs.core.rest = function rest(coll) {
  if (!(coll == null)) {
    if (function() {
      var G__43937 = coll;
      if (G__43937) {
        var bit__4037__auto__ = G__43937.cljs$lang$protocol_mask$partition0$ & 64;
        if (bit__4037__auto__ || G__43937.cljs$core$ISeq$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._rest.call(null, coll);
    } else {
      var s = cljs.core.seq.call(null, coll);
      if (s) {
        return cljs.core._rest.call(null, s);
      } else {
        return cljs.core.List.EMPTY;
      }
    }
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.next = function next(coll) {
  if (coll == null) {
    return null;
  } else {
    if (function() {
      var G__43939 = coll;
      if (G__43939) {
        var bit__4037__auto__ = G__43939.cljs$lang$protocol_mask$partition0$ & 128;
        if (bit__4037__auto__ || G__43939.cljs$core$INext$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._next.call(null, coll);
    } else {
      return cljs.core.seq.call(null, cljs.core.rest.call(null, coll));
    }
  }
};
cljs.core._EQ_ = function() {
  var _EQ_ = null;
  var _EQ___1 = function(x) {
    return true;
  };
  var _EQ___2 = function(x, y) {
    if (x == null) {
      return y == null;
    } else {
      return x === y || cljs.core._equiv.call(null, x, y);
    }
  };
  var _EQ___3 = function() {
    var G__43940__delegate = function(x, y, more) {
      while (true) {
        if (_EQ_.call(null, x, y)) {
          if (cljs.core.next.call(null, more)) {
            var G__43941 = y;
            var G__43942 = cljs.core.first.call(null, more);
            var G__43943 = cljs.core.next.call(null, more);
            x = G__43941;
            y = G__43942;
            more = G__43943;
            continue;
          } else {
            return _EQ_.call(null, y, cljs.core.first.call(null, more));
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__43940 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__43940__delegate.call(this, x, y, more);
    };
    G__43940.cljs$lang$maxFixedArity = 2;
    G__43940.cljs$lang$applyTo = function(arglist__43944) {
      var x = cljs.core.first(arglist__43944);
      arglist__43944 = cljs.core.next(arglist__43944);
      var y = cljs.core.first(arglist__43944);
      var more = cljs.core.rest(arglist__43944);
      return G__43940__delegate(x, y, more);
    };
    G__43940.cljs$core$IFn$_invoke$arity$variadic = G__43940__delegate;
    return G__43940;
  }();
  _EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ___1.call(this, x);
      case 2:
        return _EQ___2.call(this, x, y);
      default:
        return _EQ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _EQ_.cljs$lang$maxFixedArity = 2;
  _EQ_.cljs$lang$applyTo = _EQ___3.cljs$lang$applyTo;
  _EQ_.cljs$core$IFn$_invoke$arity$1 = _EQ___1;
  _EQ_.cljs$core$IFn$_invoke$arity$2 = _EQ___2;
  _EQ_.cljs$core$IFn$_invoke$arity$variadic = _EQ___3.cljs$core$IFn$_invoke$arity$variadic;
  return _EQ_;
}();
cljs.core.ICounted["null"] = true;
cljs.core._count["null"] = function(_) {
  return 0;
};
Date.prototype.cljs$core$IEquiv$ = true;
Date.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var o__$1 = this;
  return other instanceof Date && o__$1.toString() === other.toString();
};
cljs.core.IEquiv["number"] = true;
cljs.core._equiv["number"] = function(x, o) {
  return x === o;
};
cljs.core.IMeta["function"] = true;
cljs.core._meta["function"] = function(_) {
  return null;
};
cljs.core.Fn["function"] = true;
cljs.core.IHash["_"] = true;
cljs.core._hash["_"] = function(o) {
  return goog.getUid(o);
};
cljs.core.inc = function inc(x) {
  return x + 1;
};
cljs.core.Reduced = function(val) {
  this.val = val;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32768;
};
cljs.core.Reduced.cljs$lang$type = true;
cljs.core.Reduced.cljs$lang$ctorStr = "cljs.core/Reduced";
cljs.core.Reduced.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Reduced");
};
cljs.core.Reduced.prototype.cljs$core$IDeref$_deref$arity$1 = function(o) {
  var self__ = this;
  var o__$1 = this;
  return self__.val;
};
cljs.core.__GT_Reduced = function __GT_Reduced(val) {
  return new cljs.core.Reduced(val);
};
cljs.core.reduced = function reduced(x) {
  return new cljs.core.Reduced(x);
};
cljs.core.reduced_QMARK_ = function reduced_QMARK_(r) {
  return r instanceof cljs.core.Reduced;
};
cljs.core.ci_reduce = function() {
  var ci_reduce = null;
  var ci_reduce__2 = function(cicoll, f) {
    var cnt = cljs.core._count.call(null, cicoll);
    if (cnt === 0) {
      return f.call(null);
    } else {
      var val = cljs.core._nth.call(null, cicoll, 0);
      var n = 1;
      while (true) {
        if (n < cnt) {
          var nval = f.call(null, val, cljs.core._nth.call(null, cicoll, n));
          if (cljs.core.reduced_QMARK_.call(null, nval)) {
            return cljs.core.deref.call(null, nval);
          } else {
            var G__43945 = nval;
            var G__43946 = n + 1;
            val = G__43945;
            n = G__43946;
            continue;
          }
        } else {
          return val;
        }
        break;
      }
    }
  };
  var ci_reduce__3 = function(cicoll, f, val) {
    var cnt = cljs.core._count.call(null, cicoll);
    var val__$1 = val;
    var n = 0;
    while (true) {
      if (n < cnt) {
        var nval = f.call(null, val__$1, cljs.core._nth.call(null, cicoll, n));
        if (cljs.core.reduced_QMARK_.call(null, nval)) {
          return cljs.core.deref.call(null, nval);
        } else {
          var G__43947 = nval;
          var G__43948 = n + 1;
          val__$1 = G__43947;
          n = G__43948;
          continue;
        }
      } else {
        return val__$1;
      }
      break;
    }
  };
  var ci_reduce__4 = function(cicoll, f, val, idx) {
    var cnt = cljs.core._count.call(null, cicoll);
    var val__$1 = val;
    var n = idx;
    while (true) {
      if (n < cnt) {
        var nval = f.call(null, val__$1, cljs.core._nth.call(null, cicoll, n));
        if (cljs.core.reduced_QMARK_.call(null, nval)) {
          return cljs.core.deref.call(null, nval);
        } else {
          var G__43949 = nval;
          var G__43950 = n + 1;
          val__$1 = G__43949;
          n = G__43950;
          continue;
        }
      } else {
        return val__$1;
      }
      break;
    }
  };
  ci_reduce = function(cicoll, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return ci_reduce__2.call(this, cicoll, f);
      case 3:
        return ci_reduce__3.call(this, cicoll, f, val);
      case 4:
        return ci_reduce__4.call(this, cicoll, f, val, idx);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  ci_reduce.cljs$core$IFn$_invoke$arity$2 = ci_reduce__2;
  ci_reduce.cljs$core$IFn$_invoke$arity$3 = ci_reduce__3;
  ci_reduce.cljs$core$IFn$_invoke$arity$4 = ci_reduce__4;
  return ci_reduce;
}();
cljs.core.array_reduce = function() {
  var array_reduce = null;
  var array_reduce__2 = function(arr, f) {
    var cnt = arr.length;
    if (arr.length === 0) {
      return f.call(null);
    } else {
      var val = arr[0];
      var n = 1;
      while (true) {
        if (n < cnt) {
          var nval = f.call(null, val, arr[n]);
          if (cljs.core.reduced_QMARK_.call(null, nval)) {
            return cljs.core.deref.call(null, nval);
          } else {
            var G__43951 = nval;
            var G__43952 = n + 1;
            val = G__43951;
            n = G__43952;
            continue;
          }
        } else {
          return val;
        }
        break;
      }
    }
  };
  var array_reduce__3 = function(arr, f, val) {
    var cnt = arr.length;
    var val__$1 = val;
    var n = 0;
    while (true) {
      if (n < cnt) {
        var nval = f.call(null, val__$1, arr[n]);
        if (cljs.core.reduced_QMARK_.call(null, nval)) {
          return cljs.core.deref.call(null, nval);
        } else {
          var G__43953 = nval;
          var G__43954 = n + 1;
          val__$1 = G__43953;
          n = G__43954;
          continue;
        }
      } else {
        return val__$1;
      }
      break;
    }
  };
  var array_reduce__4 = function(arr, f, val, idx) {
    var cnt = arr.length;
    var val__$1 = val;
    var n = idx;
    while (true) {
      if (n < cnt) {
        var nval = f.call(null, val__$1, arr[n]);
        if (cljs.core.reduced_QMARK_.call(null, nval)) {
          return cljs.core.deref.call(null, nval);
        } else {
          var G__43955 = nval;
          var G__43956 = n + 1;
          val__$1 = G__43955;
          n = G__43956;
          continue;
        }
      } else {
        return val__$1;
      }
      break;
    }
  };
  array_reduce = function(arr, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return array_reduce__2.call(this, arr, f);
      case 3:
        return array_reduce__3.call(this, arr, f, val);
      case 4:
        return array_reduce__4.call(this, arr, f, val, idx);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  array_reduce.cljs$core$IFn$_invoke$arity$2 = array_reduce__2;
  array_reduce.cljs$core$IFn$_invoke$arity$3 = array_reduce__3;
  array_reduce.cljs$core$IFn$_invoke$arity$4 = array_reduce__4;
  return array_reduce;
}();
cljs.core.counted_QMARK_ = function counted_QMARK_(x) {
  var G__43958 = x;
  if (G__43958) {
    var bit__4044__auto__ = G__43958.cljs$lang$protocol_mask$partition0$ & 2;
    if (bit__4044__auto__ || G__43958.cljs$core$ICounted$) {
      return true;
    } else {
      if (!G__43958.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ICounted, G__43958);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ICounted, G__43958);
  }
};
cljs.core.indexed_QMARK_ = function indexed_QMARK_(x) {
  var G__43960 = x;
  if (G__43960) {
    var bit__4044__auto__ = G__43960.cljs$lang$protocol_mask$partition0$ & 16;
    if (bit__4044__auto__ || G__43960.cljs$core$IIndexed$) {
      return true;
    } else {
      if (!G__43960.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IIndexed, G__43960);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IIndexed, G__43960);
  }
};
cljs.core.IndexedSeq = function(arr, i) {
  this.arr = arr;
  this.i = i;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 166199550;
};
cljs.core.IndexedSeq.cljs$lang$type = true;
cljs.core.IndexedSeq.cljs$lang$ctorStr = "cljs.core/IndexedSeq";
cljs.core.IndexedSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/IndexedSeq");
};
cljs.core.IndexedSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.hash_coll.call(null, coll__$1);
};
cljs.core.IndexedSeq.prototype.cljs$core$INext$_next$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  if (self__.i + 1 < self__.arr.length) {
    return new cljs.core.IndexedSeq(self__.arr, self__.i + 1);
  } else {
    return null;
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.IndexedSeq.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var c = cljs.core._count.call(null, coll__$1);
  if (c > 0) {
    return new cljs.core.RSeq(coll__$1, c - 1, null);
  } else {
    return null;
  }
};
cljs.core.IndexedSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_reduce.call(null, self__.arr, f, self__.arr[self__.i], self__.i + 1);
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_reduce.call(null, self__.arr, f, start, self__.i);
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1;
};
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.arr.length - self__.i;
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.arr[self__.i];
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  if (self__.i + 1 < self__.arr.length) {
    return new cljs.core.IndexedSeq(self__.arr, self__.i + 1);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.IndexedSeq.prototype.cljs$core$ICloneable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.IndexedSeq(self__.arr, self__.i);
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var self__ = this;
  var coll__$1 = this;
  var i__$1 = n + self__.i;
  if (i__$1 < self__.arr.length) {
    return self__.arr[i__$1];
  } else {
    return null;
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var self__ = this;
  var coll__$1 = this;
  var i__$1 = n + self__.i;
  if (i__$1 < self__.arr.length) {
    return self__.arr[i__$1];
  } else {
    return not_found;
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.List.EMPTY;
};
cljs.core.__GT_IndexedSeq = function __GT_IndexedSeq(arr, i) {
  return new cljs.core.IndexedSeq(arr, i);
};
cljs.core.prim_seq = function() {
  var prim_seq = null;
  var prim_seq__1 = function(prim) {
    return prim_seq.call(null, prim, 0);
  };
  var prim_seq__2 = function(prim, i) {
    if (i < prim.length) {
      return new cljs.core.IndexedSeq(prim, i);
    } else {
      return null;
    }
  };
  prim_seq = function(prim, i) {
    switch(arguments.length) {
      case 1:
        return prim_seq__1.call(this, prim);
      case 2:
        return prim_seq__2.call(this, prim, i);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  prim_seq.cljs$core$IFn$_invoke$arity$1 = prim_seq__1;
  prim_seq.cljs$core$IFn$_invoke$arity$2 = prim_seq__2;
  return prim_seq;
}();
cljs.core.array_seq = function() {
  var array_seq = null;
  var array_seq__1 = function(array) {
    return cljs.core.prim_seq.call(null, array, 0);
  };
  var array_seq__2 = function(array, i) {
    return cljs.core.prim_seq.call(null, array, i);
  };
  array_seq = function(array, i) {
    switch(arguments.length) {
      case 1:
        return array_seq__1.call(this, array);
      case 2:
        return array_seq__2.call(this, array, i);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  array_seq.cljs$core$IFn$_invoke$arity$1 = array_seq__1;
  array_seq.cljs$core$IFn$_invoke$arity$2 = array_seq__2;
  return array_seq;
}();
cljs.core.RSeq = function(ci, i, meta) {
  this.ci = ci;
  this.i = i;
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374862;
};
cljs.core.RSeq.cljs$lang$type = true;
cljs.core.RSeq.cljs$lang$ctorStr = "cljs.core/RSeq";
cljs.core.RSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/RSeq");
};
cljs.core.RSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.hash_coll.call(null, coll__$1);
};
cljs.core.RSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.RSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.RSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(col, f) {
  var self__ = this;
  var col__$1 = this;
  return cljs.core.seq_reduce.call(null, f, col__$1);
};
cljs.core.RSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(col, f, start) {
  var self__ = this;
  var col__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, col__$1);
};
cljs.core.RSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.RSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.i + 1;
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, self__.ci, self__.i);
};
cljs.core.RSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.i > 0) {
    return new cljs.core.RSeq(self__.ci, self__.i - 1, null);
  } else {
    return null;
  }
};
cljs.core.RSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.RSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.RSeq(self__.ci, self__.i, new_meta);
};
cljs.core.RSeq.prototype.cljs$core$ICloneable$ = true;
cljs.core.RSeq.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.RSeq(self__.ci, self__.i, self__.meta);
};
cljs.core.RSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.RSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_RSeq = function __GT_RSeq(ci, i, meta) {
  return new cljs.core.RSeq(ci, i, meta);
};
cljs.core.second = function second(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll));
};
cljs.core.ffirst = function ffirst(coll) {
  return cljs.core.first.call(null, cljs.core.first.call(null, coll));
};
cljs.core.nfirst = function nfirst(coll) {
  return cljs.core.next.call(null, cljs.core.first.call(null, coll));
};
cljs.core.fnext = function fnext(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll));
};
cljs.core.nnext = function nnext(coll) {
  return cljs.core.next.call(null, cljs.core.next.call(null, coll));
};
cljs.core.last = function last(s) {
  while (true) {
    var sn = cljs.core.next.call(null, s);
    if (!(sn == null)) {
      var G__43961 = sn;
      s = G__43961;
      continue;
    } else {
      return cljs.core.first.call(null, s);
    }
    break;
  }
};
cljs.core.IEquiv["_"] = true;
cljs.core._equiv["_"] = function(x, o) {
  return x === o;
};
cljs.core.conj = function() {
  var conj = null;
  var conj__2 = function(coll, x) {
    if (!(coll == null)) {
      return cljs.core._conj.call(null, coll, x);
    } else {
      return cljs.core._conj.call(null, cljs.core.List.EMPTY, x);
    }
  };
  var conj__3 = function() {
    var G__43962__delegate = function(coll, x, xs) {
      while (true) {
        if (cljs.core.truth_(xs)) {
          var G__43963 = conj.call(null, coll, x);
          var G__43964 = cljs.core.first.call(null, xs);
          var G__43965 = cljs.core.next.call(null, xs);
          coll = G__43963;
          x = G__43964;
          xs = G__43965;
          continue;
        } else {
          return conj.call(null, coll, x);
        }
        break;
      }
    };
    var G__43962 = function(coll, x, var_args) {
      var xs = null;
      if (arguments.length > 2) {
        xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__43962__delegate.call(this, coll, x, xs);
    };
    G__43962.cljs$lang$maxFixedArity = 2;
    G__43962.cljs$lang$applyTo = function(arglist__43966) {
      var coll = cljs.core.first(arglist__43966);
      arglist__43966 = cljs.core.next(arglist__43966);
      var x = cljs.core.first(arglist__43966);
      var xs = cljs.core.rest(arglist__43966);
      return G__43962__delegate(coll, x, xs);
    };
    G__43962.cljs$core$IFn$_invoke$arity$variadic = G__43962__delegate;
    return G__43962;
  }();
  conj = function(coll, x, var_args) {
    var xs = var_args;
    switch(arguments.length) {
      case 2:
        return conj__2.call(this, coll, x);
      default:
        return conj__3.cljs$core$IFn$_invoke$arity$variadic(coll, x, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  conj.cljs$lang$maxFixedArity = 2;
  conj.cljs$lang$applyTo = conj__3.cljs$lang$applyTo;
  conj.cljs$core$IFn$_invoke$arity$2 = conj__2;
  conj.cljs$core$IFn$_invoke$arity$variadic = conj__3.cljs$core$IFn$_invoke$arity$variadic;
  return conj;
}();
cljs.core.empty = function empty(coll) {
  if (coll == null) {
    return null;
  } else {
    return cljs.core._empty.call(null, coll);
  }
};
cljs.core.accumulating_seq_count = function accumulating_seq_count(coll) {
  var s = cljs.core.seq.call(null, coll);
  var acc = 0;
  while (true) {
    if (cljs.core.counted_QMARK_.call(null, s)) {
      return acc + cljs.core._count.call(null, s);
    } else {
      var G__43967 = cljs.core.next.call(null, s);
      var G__43968 = acc + 1;
      s = G__43967;
      acc = G__43968;
      continue;
    }
    break;
  }
};
cljs.core.count = function count(coll) {
  if (!(coll == null)) {
    if (function() {
      var G__43970 = coll;
      if (G__43970) {
        var bit__4037__auto__ = G__43970.cljs$lang$protocol_mask$partition0$ & 2;
        if (bit__4037__auto__ || G__43970.cljs$core$ICounted$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._count.call(null, coll);
    } else {
      if (coll instanceof Array) {
        return coll.length;
      } else {
        if (typeof coll === "string") {
          return coll.length;
        } else {
          if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ICounted, coll)) {
            return cljs.core._count.call(null, coll);
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return cljs.core.accumulating_seq_count.call(null, coll);
            } else {
              return null;
            }
          }
        }
      }
    }
  } else {
    return 0;
  }
};
cljs.core.linear_traversal_nth = function() {
  var linear_traversal_nth = null;
  var linear_traversal_nth__2 = function(coll, n) {
    while (true) {
      if (coll == null) {
        throw new Error("Index out of bounds");
      } else {
        if (n === 0) {
          if (cljs.core.seq.call(null, coll)) {
            return cljs.core.first.call(null, coll);
          } else {
            throw new Error("Index out of bounds");
          }
        } else {
          if (cljs.core.indexed_QMARK_.call(null, coll)) {
            return cljs.core._nth.call(null, coll, n);
          } else {
            if (cljs.core.seq.call(null, coll)) {
              var G__43971 = cljs.core.next.call(null, coll);
              var G__43972 = n - 1;
              coll = G__43971;
              n = G__43972;
              continue;
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                throw new Error("Index out of bounds");
              } else {
                return null;
              }
            }
          }
        }
      }
      break;
    }
  };
  var linear_traversal_nth__3 = function(coll, n, not_found) {
    while (true) {
      if (coll == null) {
        return not_found;
      } else {
        if (n === 0) {
          if (cljs.core.seq.call(null, coll)) {
            return cljs.core.first.call(null, coll);
          } else {
            return not_found;
          }
        } else {
          if (cljs.core.indexed_QMARK_.call(null, coll)) {
            return cljs.core._nth.call(null, coll, n, not_found);
          } else {
            if (cljs.core.seq.call(null, coll)) {
              var G__43973 = cljs.core.next.call(null, coll);
              var G__43974 = n - 1;
              var G__43975 = not_found;
              coll = G__43973;
              n = G__43974;
              not_found = G__43975;
              continue;
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                return not_found;
              } else {
                return null;
              }
            }
          }
        }
      }
      break;
    }
  };
  linear_traversal_nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return linear_traversal_nth__2.call(this, coll, n);
      case 3:
        return linear_traversal_nth__3.call(this, coll, n, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  linear_traversal_nth.cljs$core$IFn$_invoke$arity$2 = linear_traversal_nth__2;
  linear_traversal_nth.cljs$core$IFn$_invoke$arity$3 = linear_traversal_nth__3;
  return linear_traversal_nth;
}();
cljs.core.nth = function() {
  var nth = null;
  var nth__2 = function(coll, n) {
    if (coll == null) {
      return null;
    } else {
      if (function() {
        var G__43980 = coll;
        if (G__43980) {
          var bit__4037__auto__ = G__43980.cljs$lang$protocol_mask$partition0$ & 16;
          if (bit__4037__auto__ || G__43980.cljs$core$IIndexed$) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }()) {
        return cljs.core._nth.call(null, coll, n);
      } else {
        if (coll instanceof Array) {
          if (n < coll.length) {
            return coll[n];
          } else {
            return null;
          }
        } else {
          if (typeof coll === "string") {
            if (n < coll.length) {
              return coll[n];
            } else {
              return null;
            }
          } else {
            if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IIndexed, coll)) {
              return cljs.core._nth.call(null, coll, n);
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                if (function() {
                  var G__43981 = coll;
                  if (G__43981) {
                    var bit__4044__auto__ = G__43981.cljs$lang$protocol_mask$partition0$ & 64;
                    if (bit__4044__auto__ || G__43981.cljs$core$ISeq$) {
                      return true;
                    } else {
                      if (!G__43981.cljs$lang$protocol_mask$partition0$) {
                        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__43981);
                      } else {
                        return false;
                      }
                    }
                  } else {
                    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__43981);
                  }
                }()) {
                  return cljs.core.linear_traversal_nth.call(null, coll, n);
                } else {
                  throw new Error([cljs.core.str("nth not supported on this type "), cljs.core.str(cljs.core.type__GT_str.call(null, cljs.core.type.call(null, coll)))].join(""));
                }
              } else {
                return null;
              }
            }
          }
        }
      }
    }
  };
  var nth__3 = function(coll, n, not_found) {
    if (!(coll == null)) {
      if (function() {
        var G__43982 = coll;
        if (G__43982) {
          var bit__4037__auto__ = G__43982.cljs$lang$protocol_mask$partition0$ & 16;
          if (bit__4037__auto__ || G__43982.cljs$core$IIndexed$) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }()) {
        return cljs.core._nth.call(null, coll, n, not_found);
      } else {
        if (coll instanceof Array) {
          if (n < coll.length) {
            return coll[n];
          } else {
            return not_found;
          }
        } else {
          if (typeof coll === "string") {
            if (n < coll.length) {
              return coll[n];
            } else {
              return not_found;
            }
          } else {
            if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IIndexed, coll)) {
              return cljs.core._nth.call(null, coll, n);
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                if (function() {
                  var G__43983 = coll;
                  if (G__43983) {
                    var bit__4044__auto__ = G__43983.cljs$lang$protocol_mask$partition0$ & 64;
                    if (bit__4044__auto__ || G__43983.cljs$core$ISeq$) {
                      return true;
                    } else {
                      if (!G__43983.cljs$lang$protocol_mask$partition0$) {
                        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__43983);
                      } else {
                        return false;
                      }
                    }
                  } else {
                    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__43983);
                  }
                }()) {
                  return cljs.core.linear_traversal_nth.call(null, coll, n, not_found);
                } else {
                  throw new Error([cljs.core.str("nth not supported on this type "), cljs.core.str(cljs.core.type__GT_str.call(null, cljs.core.type.call(null, coll)))].join(""));
                }
              } else {
                return null;
              }
            }
          }
        }
      }
    } else {
      return not_found;
    }
  };
  nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return nth__2.call(this, coll, n);
      case 3:
        return nth__3.call(this, coll, n, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  nth.cljs$core$IFn$_invoke$arity$2 = nth__2;
  nth.cljs$core$IFn$_invoke$arity$3 = nth__3;
  return nth;
}();
cljs.core.get = function() {
  var get = null;
  var get__2 = function(o, k) {
    if (o == null) {
      return null;
    } else {
      if (function() {
        var G__43986 = o;
        if (G__43986) {
          var bit__4037__auto__ = G__43986.cljs$lang$protocol_mask$partition0$ & 256;
          if (bit__4037__auto__ || G__43986.cljs$core$ILookup$) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }()) {
        return cljs.core._lookup.call(null, o, k);
      } else {
        if (o instanceof Array) {
          if (k < o.length) {
            return o[k];
          } else {
            return null;
          }
        } else {
          if (typeof o === "string") {
            if (k < o.length) {
              return o[k];
            } else {
              return null;
            }
          } else {
            if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ILookup, o)) {
              return cljs.core._lookup.call(null, o, k);
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                return null;
              } else {
                return null;
              }
            }
          }
        }
      }
    }
  };
  var get__3 = function(o, k, not_found) {
    if (!(o == null)) {
      if (function() {
        var G__43987 = o;
        if (G__43987) {
          var bit__4037__auto__ = G__43987.cljs$lang$protocol_mask$partition0$ & 256;
          if (bit__4037__auto__ || G__43987.cljs$core$ILookup$) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }()) {
        return cljs.core._lookup.call(null, o, k, not_found);
      } else {
        if (o instanceof Array) {
          if (k < o.length) {
            return o[k];
          } else {
            return not_found;
          }
        } else {
          if (typeof o === "string") {
            if (k < o.length) {
              return o[k];
            } else {
              return not_found;
            }
          } else {
            if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ILookup, o)) {
              return cljs.core._lookup.call(null, o, k, not_found);
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                return not_found;
              } else {
                return null;
              }
            }
          }
        }
      }
    } else {
      return not_found;
    }
  };
  get = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return get__2.call(this, o, k);
      case 3:
        return get__3.call(this, o, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  get.cljs$core$IFn$_invoke$arity$2 = get__2;
  get.cljs$core$IFn$_invoke$arity$3 = get__3;
  return get;
}();
cljs.core.assoc = function() {
  var assoc = null;
  var assoc__3 = function(coll, k, v) {
    if (!(coll == null)) {
      return cljs.core._assoc.call(null, coll, k, v);
    } else {
      return cljs.core.PersistentHashMap.fromArrays.call(null, [k], [v]);
    }
  };
  var assoc__4 = function() {
    var G__43988__delegate = function(coll, k, v, kvs) {
      while (true) {
        var ret = assoc.call(null, coll, k, v);
        if (cljs.core.truth_(kvs)) {
          var G__43989 = ret;
          var G__43990 = cljs.core.first.call(null, kvs);
          var G__43991 = cljs.core.second.call(null, kvs);
          var G__43992 = cljs.core.nnext.call(null, kvs);
          coll = G__43989;
          k = G__43990;
          v = G__43991;
          kvs = G__43992;
          continue;
        } else {
          return ret;
        }
        break;
      }
    };
    var G__43988 = function(coll, k, v, var_args) {
      var kvs = null;
      if (arguments.length > 3) {
        kvs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__43988__delegate.call(this, coll, k, v, kvs);
    };
    G__43988.cljs$lang$maxFixedArity = 3;
    G__43988.cljs$lang$applyTo = function(arglist__43993) {
      var coll = cljs.core.first(arglist__43993);
      arglist__43993 = cljs.core.next(arglist__43993);
      var k = cljs.core.first(arglist__43993);
      arglist__43993 = cljs.core.next(arglist__43993);
      var v = cljs.core.first(arglist__43993);
      var kvs = cljs.core.rest(arglist__43993);
      return G__43988__delegate(coll, k, v, kvs);
    };
    G__43988.cljs$core$IFn$_invoke$arity$variadic = G__43988__delegate;
    return G__43988;
  }();
  assoc = function(coll, k, v, var_args) {
    var kvs = var_args;
    switch(arguments.length) {
      case 3:
        return assoc__3.call(this, coll, k, v);
      default:
        return assoc__4.cljs$core$IFn$_invoke$arity$variadic(coll, k, v, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  assoc.cljs$lang$maxFixedArity = 3;
  assoc.cljs$lang$applyTo = assoc__4.cljs$lang$applyTo;
  assoc.cljs$core$IFn$_invoke$arity$3 = assoc__3;
  assoc.cljs$core$IFn$_invoke$arity$variadic = assoc__4.cljs$core$IFn$_invoke$arity$variadic;
  return assoc;
}();
cljs.core.dissoc = function() {
  var dissoc = null;
  var dissoc__1 = function(coll) {
    return coll;
  };
  var dissoc__2 = function(coll, k) {
    if (coll == null) {
      return null;
    } else {
      return cljs.core._dissoc.call(null, coll, k);
    }
  };
  var dissoc__3 = function() {
    var G__43994__delegate = function(coll, k, ks) {
      while (true) {
        if (coll == null) {
          return null;
        } else {
          var ret = dissoc.call(null, coll, k);
          if (cljs.core.truth_(ks)) {
            var G__43995 = ret;
            var G__43996 = cljs.core.first.call(null, ks);
            var G__43997 = cljs.core.next.call(null, ks);
            coll = G__43995;
            k = G__43996;
            ks = G__43997;
            continue;
          } else {
            return ret;
          }
        }
        break;
      }
    };
    var G__43994 = function(coll, k, var_args) {
      var ks = null;
      if (arguments.length > 2) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__43994__delegate.call(this, coll, k, ks);
    };
    G__43994.cljs$lang$maxFixedArity = 2;
    G__43994.cljs$lang$applyTo = function(arglist__43998) {
      var coll = cljs.core.first(arglist__43998);
      arglist__43998 = cljs.core.next(arglist__43998);
      var k = cljs.core.first(arglist__43998);
      var ks = cljs.core.rest(arglist__43998);
      return G__43994__delegate(coll, k, ks);
    };
    G__43994.cljs$core$IFn$_invoke$arity$variadic = G__43994__delegate;
    return G__43994;
  }();
  dissoc = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return dissoc__1.call(this, coll);
      case 2:
        return dissoc__2.call(this, coll, k);
      default:
        return dissoc__3.cljs$core$IFn$_invoke$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  dissoc.cljs$lang$maxFixedArity = 2;
  dissoc.cljs$lang$applyTo = dissoc__3.cljs$lang$applyTo;
  dissoc.cljs$core$IFn$_invoke$arity$1 = dissoc__1;
  dissoc.cljs$core$IFn$_invoke$arity$2 = dissoc__2;
  dissoc.cljs$core$IFn$_invoke$arity$variadic = dissoc__3.cljs$core$IFn$_invoke$arity$variadic;
  return dissoc;
}();
cljs.core.fn_QMARK_ = function fn_QMARK_(f) {
  var or__3400__auto__ = goog.isFunction(f);
  if (or__3400__auto__) {
    return or__3400__auto__;
  } else {
    var G__44002 = f;
    if (G__44002) {
      var bit__4044__auto__ = null;
      if (cljs.core.truth_(function() {
        var or__3400__auto____$1 = bit__4044__auto__;
        if (cljs.core.truth_(or__3400__auto____$1)) {
          return or__3400__auto____$1;
        } else {
          return G__44002.cljs$core$Fn$;
        }
      }())) {
        return true;
      } else {
        if (!G__44002.cljs$lang$protocol_mask$partition$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.Fn, G__44002);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.Fn, G__44002);
    }
  }
};
cljs.core.with_meta = function with_meta(o, meta) {
  if (cljs.core.fn_QMARK_.call(null, o) && !function() {
    var G__44010 = o;
    if (G__44010) {
      var bit__4044__auto__ = G__44010.cljs$lang$protocol_mask$partition0$ & 262144;
      if (bit__4044__auto__ || G__44010.cljs$core$IWithMeta$) {
        return true;
      } else {
        if (!G__44010.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IWithMeta, G__44010);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IWithMeta, G__44010);
    }
  }()) {
    return with_meta.call(null, function() {
      if (typeof cljs.core.t44011 !== "undefined") {
      } else {
        cljs.core.t44011 = function(meta, o, with_meta, meta44012) {
          this.meta = meta;
          this.o = o;
          this.with_meta = with_meta;
          this.meta44012 = meta44012;
          this.cljs$lang$protocol_mask$partition1$ = 0;
          this.cljs$lang$protocol_mask$partition0$ = 393217;
        };
        cljs.core.t44011.cljs$lang$type = true;
        cljs.core.t44011.cljs$lang$ctorStr = "cljs.core/t44011";
        cljs.core.t44011.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
          return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/t44011");
        };
        cljs.core.t44011.prototype.call = function() {
          var G__44015__delegate = function(self__, args) {
            var self____$1 = this;
            var _ = self____$1;
            return cljs.core.apply.call(null, self__.o, args);
          };
          var G__44015 = function(self__, var_args) {
            var self__ = this;
            var args = null;
            if (arguments.length > 1) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
            }
            return G__44015__delegate.call(this, self__, args);
          };
          G__44015.cljs$lang$maxFixedArity = 1;
          G__44015.cljs$lang$applyTo = function(arglist__44016) {
            var self__ = cljs.core.first(arglist__44016);
            var args = cljs.core.rest(arglist__44016);
            return G__44015__delegate(self__, args);
          };
          G__44015.cljs$core$IFn$_invoke$arity$variadic = G__44015__delegate;
          return G__44015;
        }();
        cljs.core.t44011.prototype.apply = function(self__, args44014) {
          var self__ = this;
          var self____$1 = this;
          return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44014)));
        };
        cljs.core.t44011.prototype.cljs$core$IFn$_invoke$arity$2 = function() {
          var G__44017__delegate = function(args) {
            var _ = this;
            return cljs.core.apply.call(null, self__.o, args);
          };
          var G__44017 = function(var_args) {
            var self__ = this;
            var args = null;
            if (arguments.length > 0) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
            }
            return G__44017__delegate.call(this, args);
          };
          G__44017.cljs$lang$maxFixedArity = 0;
          G__44017.cljs$lang$applyTo = function(arglist__44018) {
            var args = cljs.core.seq(arglist__44018);
            return G__44017__delegate(args);
          };
          G__44017.cljs$core$IFn$_invoke$arity$variadic = G__44017__delegate;
          return G__44017;
        }();
        cljs.core.t44011.prototype.cljs$core$Fn$ = true;
        cljs.core.t44011.prototype.cljs$core$IMeta$_meta$arity$1 = function(_44013) {
          var self__ = this;
          var _44013__$1 = this;
          return self__.meta44012;
        };
        cljs.core.t44011.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(_44013, meta44012__$1) {
          var self__ = this;
          var _44013__$1 = this;
          return new cljs.core.t44011(self__.meta, self__.o, self__.with_meta, meta44012__$1);
        };
        cljs.core.__GT_t44011 = function __GT_t44011(meta__$1, o__$1, with_meta__$1, meta44012) {
          return new cljs.core.t44011(meta__$1, o__$1, with_meta__$1, meta44012);
        };
      }
      return new cljs.core.t44011(meta, o, with_meta, null);
    }(), meta);
  } else {
    if (o == null) {
      return null;
    } else {
      return cljs.core._with_meta.call(null, o, meta);
    }
  }
};
cljs.core.meta = function meta(o) {
  if (function() {
    var and__3388__auto__ = !(o == null);
    if (and__3388__auto__) {
      var G__44022 = o;
      if (G__44022) {
        var bit__4044__auto__ = G__44022.cljs$lang$protocol_mask$partition0$ & 131072;
        if (bit__4044__auto__ || G__44022.cljs$core$IMeta$) {
          return true;
        } else {
          if (!G__44022.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMeta, G__44022);
          } else {
            return false;
          }
        }
      } else {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMeta, G__44022);
      }
    } else {
      return and__3388__auto__;
    }
  }()) {
    return cljs.core._meta.call(null, o);
  } else {
    return null;
  }
};
cljs.core.peek = function peek(coll) {
  if (coll == null) {
    return null;
  } else {
    return cljs.core._peek.call(null, coll);
  }
};
cljs.core.pop = function pop(coll) {
  if (coll == null) {
    return null;
  } else {
    return cljs.core._pop.call(null, coll);
  }
};
cljs.core.disj = function() {
  var disj = null;
  var disj__1 = function(coll) {
    return coll;
  };
  var disj__2 = function(coll, k) {
    if (coll == null) {
      return null;
    } else {
      return cljs.core._disjoin.call(null, coll, k);
    }
  };
  var disj__3 = function() {
    var G__44023__delegate = function(coll, k, ks) {
      while (true) {
        if (coll == null) {
          return null;
        } else {
          var ret = disj.call(null, coll, k);
          if (cljs.core.truth_(ks)) {
            var G__44024 = ret;
            var G__44025 = cljs.core.first.call(null, ks);
            var G__44026 = cljs.core.next.call(null, ks);
            coll = G__44024;
            k = G__44025;
            ks = G__44026;
            continue;
          } else {
            return ret;
          }
        }
        break;
      }
    };
    var G__44023 = function(coll, k, var_args) {
      var ks = null;
      if (arguments.length > 2) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44023__delegate.call(this, coll, k, ks);
    };
    G__44023.cljs$lang$maxFixedArity = 2;
    G__44023.cljs$lang$applyTo = function(arglist__44027) {
      var coll = cljs.core.first(arglist__44027);
      arglist__44027 = cljs.core.next(arglist__44027);
      var k = cljs.core.first(arglist__44027);
      var ks = cljs.core.rest(arglist__44027);
      return G__44023__delegate(coll, k, ks);
    };
    G__44023.cljs$core$IFn$_invoke$arity$variadic = G__44023__delegate;
    return G__44023;
  }();
  disj = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return disj__1.call(this, coll);
      case 2:
        return disj__2.call(this, coll, k);
      default:
        return disj__3.cljs$core$IFn$_invoke$arity$variadic(coll, k, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  disj.cljs$lang$maxFixedArity = 2;
  disj.cljs$lang$applyTo = disj__3.cljs$lang$applyTo;
  disj.cljs$core$IFn$_invoke$arity$1 = disj__1;
  disj.cljs$core$IFn$_invoke$arity$2 = disj__2;
  disj.cljs$core$IFn$_invoke$arity$variadic = disj__3.cljs$core$IFn$_invoke$arity$variadic;
  return disj;
}();
cljs.core.string_hash_cache = function() {
  var obj44029 = {};
  return obj44029;
}();
cljs.core.string_hash_cache_count = 0;
cljs.core.add_to_string_hash_cache = function add_to_string_hash_cache(k) {
  var h = goog.string.hashCode(k);
  cljs.core.string_hash_cache[k] = h;
  cljs.core.string_hash_cache_count = cljs.core.string_hash_cache_count + 1;
  return h;
};
cljs.core.check_string_hash_cache = function check_string_hash_cache(k) {
  if (cljs.core.string_hash_cache_count > 255) {
    cljs.core.string_hash_cache = function() {
      var obj44033 = {};
      return obj44033;
    }();
    cljs.core.string_hash_cache_count = 0;
  } else {
  }
  var h = cljs.core.string_hash_cache[k];
  if (typeof h === "number") {
    return h;
  } else {
    return cljs.core.add_to_string_hash_cache.call(null, k);
  }
};
cljs.core.hash = function hash(o) {
  if (function() {
    var G__44035 = o;
    if (G__44035) {
      var bit__4037__auto__ = G__44035.cljs$lang$protocol_mask$partition0$ & 4194304;
      if (bit__4037__auto__ || G__44035.cljs$core$IHash$) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }()) {
    return cljs.core._hash.call(null, o);
  } else {
    if (typeof o === "number") {
      return Math.floor(o) % 2147483647;
    } else {
      if (o === true) {
        return 1;
      } else {
        if (o === false) {
          return 0;
        } else {
          if (typeof o === "string") {
            return cljs.core.check_string_hash_cache.call(null, o);
          } else {
            if (o == null) {
              return 0;
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                return cljs.core._hash.call(null, o);
              } else {
                return null;
              }
            }
          }
        }
      }
    }
  }
};
cljs.core.empty_QMARK_ = function empty_QMARK_(coll) {
  return coll == null || cljs.core.not.call(null, cljs.core.seq.call(null, coll));
};
cljs.core.coll_QMARK_ = function coll_QMARK_(x) {
  if (x == null) {
    return false;
  } else {
    var G__44037 = x;
    if (G__44037) {
      var bit__4044__auto__ = G__44037.cljs$lang$protocol_mask$partition0$ & 8;
      if (bit__4044__auto__ || G__44037.cljs$core$ICollection$) {
        return true;
      } else {
        if (!G__44037.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ICollection, G__44037);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ICollection, G__44037);
    }
  }
};
cljs.core.set_QMARK_ = function set_QMARK_(x) {
  if (x == null) {
    return false;
  } else {
    var G__44039 = x;
    if (G__44039) {
      var bit__4044__auto__ = G__44039.cljs$lang$protocol_mask$partition0$ & 4096;
      if (bit__4044__auto__ || G__44039.cljs$core$ISet$) {
        return true;
      } else {
        if (!G__44039.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISet, G__44039);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISet, G__44039);
    }
  }
};
cljs.core.associative_QMARK_ = function associative_QMARK_(x) {
  var G__44041 = x;
  if (G__44041) {
    var bit__4044__auto__ = G__44041.cljs$lang$protocol_mask$partition0$ & 512;
    if (bit__4044__auto__ || G__44041.cljs$core$IAssociative$) {
      return true;
    } else {
      if (!G__44041.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IAssociative, G__44041);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IAssociative, G__44041);
  }
};
cljs.core.sequential_QMARK_ = function sequential_QMARK_(x) {
  var G__44043 = x;
  if (G__44043) {
    var bit__4044__auto__ = G__44043.cljs$lang$protocol_mask$partition0$ & 16777216;
    if (bit__4044__auto__ || G__44043.cljs$core$ISequential$) {
      return true;
    } else {
      if (!G__44043.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISequential, G__44043);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISequential, G__44043);
  }
};
cljs.core.sorted_QMARK_ = function sorted_QMARK_(x) {
  var G__44045 = x;
  if (G__44045) {
    var bit__4044__auto__ = G__44045.cljs$lang$protocol_mask$partition0$ & 268435456;
    if (bit__4044__auto__ || G__44045.cljs$core$ISorted$) {
      return true;
    } else {
      if (!G__44045.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISorted, G__44045);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISorted, G__44045);
  }
};
cljs.core.reduceable_QMARK_ = function reduceable_QMARK_(x) {
  var G__44047 = x;
  if (G__44047) {
    var bit__4044__auto__ = G__44047.cljs$lang$protocol_mask$partition0$ & 524288;
    if (bit__4044__auto__ || G__44047.cljs$core$IReduce$) {
      return true;
    } else {
      if (!G__44047.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReduce, G__44047);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReduce, G__44047);
  }
};
cljs.core.map_QMARK_ = function map_QMARK_(x) {
  if (x == null) {
    return false;
  } else {
    var G__44049 = x;
    if (G__44049) {
      var bit__4044__auto__ = G__44049.cljs$lang$protocol_mask$partition0$ & 1024;
      if (bit__4044__auto__ || G__44049.cljs$core$IMap$) {
        return true;
      } else {
        if (!G__44049.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMap, G__44049);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMap, G__44049);
    }
  }
};
cljs.core.vector_QMARK_ = function vector_QMARK_(x) {
  var G__44051 = x;
  if (G__44051) {
    var bit__4044__auto__ = G__44051.cljs$lang$protocol_mask$partition0$ & 16384;
    if (bit__4044__auto__ || G__44051.cljs$core$IVector$) {
      return true;
    } else {
      if (!G__44051.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IVector, G__44051);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IVector, G__44051);
  }
};
cljs.core.chunked_seq_QMARK_ = function chunked_seq_QMARK_(x) {
  var G__44053 = x;
  if (G__44053) {
    var bit__4037__auto__ = G__44053.cljs$lang$protocol_mask$partition1$ & 512;
    if (bit__4037__auto__ || G__44053.cljs$core$IChunkedSeq$) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};
cljs.core.js_obj = function() {
  var js_obj = null;
  var js_obj__0 = function() {
    var obj44057 = {};
    return obj44057;
  };
  var js_obj__1 = function() {
    var G__44058__delegate = function(keyvals) {
      return cljs.core.apply.call(null, goog.object.create, keyvals);
    };
    var G__44058 = function(var_args) {
      var keyvals = null;
      if (arguments.length > 0) {
        keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
      }
      return G__44058__delegate.call(this, keyvals);
    };
    G__44058.cljs$lang$maxFixedArity = 0;
    G__44058.cljs$lang$applyTo = function(arglist__44059) {
      var keyvals = cljs.core.seq(arglist__44059);
      return G__44058__delegate(keyvals);
    };
    G__44058.cljs$core$IFn$_invoke$arity$variadic = G__44058__delegate;
    return G__44058;
  }();
  js_obj = function(var_args) {
    var keyvals = var_args;
    switch(arguments.length) {
      case 0:
        return js_obj__0.call(this);
      default:
        return js_obj__1.cljs$core$IFn$_invoke$arity$variadic(cljs.core.array_seq(arguments, 0));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_obj.cljs$lang$maxFixedArity = 0;
  js_obj.cljs$lang$applyTo = js_obj__1.cljs$lang$applyTo;
  js_obj.cljs$core$IFn$_invoke$arity$0 = js_obj__0;
  js_obj.cljs$core$IFn$_invoke$arity$variadic = js_obj__1.cljs$core$IFn$_invoke$arity$variadic;
  return js_obj;
}();
cljs.core.js_keys = function js_keys(obj) {
  var keys = [];
  goog.object.forEach(obj, function(val, key, obj__$1) {
    return keys.push(key);
  });
  return keys;
};
cljs.core.js_delete = function js_delete(obj, key) {
  return delete obj[key];
};
cljs.core.array_copy = function array_copy(from, i, to, j, len) {
  var i__$1 = i;
  var j__$1 = j;
  var len__$1 = len;
  while (true) {
    if (len__$1 === 0) {
      return to;
    } else {
      to[j__$1] = from[i__$1];
      var G__44060 = i__$1 + 1;
      var G__44061 = j__$1 + 1;
      var G__44062 = len__$1 - 1;
      i__$1 = G__44060;
      j__$1 = G__44061;
      len__$1 = G__44062;
      continue;
    }
    break;
  }
};
cljs.core.array_copy_downward = function array_copy_downward(from, i, to, j, len) {
  var i__$1 = i + (len - 1);
  var j__$1 = j + (len - 1);
  var len__$1 = len;
  while (true) {
    if (len__$1 === 0) {
      return to;
    } else {
      to[j__$1] = from[i__$1];
      var G__44063 = i__$1 - 1;
      var G__44064 = j__$1 - 1;
      var G__44065 = len__$1 - 1;
      i__$1 = G__44063;
      j__$1 = G__44064;
      len__$1 = G__44065;
      continue;
    }
    break;
  }
};
cljs.core.lookup_sentinel = function() {
  var obj44067 = {};
  return obj44067;
}();
cljs.core.false_QMARK_ = function false_QMARK_(x) {
  return x === false;
};
cljs.core.true_QMARK_ = function true_QMARK_(x) {
  return x === true;
};
cljs.core.undefined_QMARK_ = function undefined_QMARK_(x) {
  return void 0 === x;
};
cljs.core.seq_QMARK_ = function seq_QMARK_(s) {
  if (s == null) {
    return false;
  } else {
    var G__44069 = s;
    if (G__44069) {
      var bit__4044__auto__ = G__44069.cljs$lang$protocol_mask$partition0$ & 64;
      if (bit__4044__auto__ || G__44069.cljs$core$ISeq$) {
        return true;
      } else {
        if (!G__44069.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__44069);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeq, G__44069);
    }
  }
};
cljs.core.seqable_QMARK_ = function seqable_QMARK_(s) {
  var G__44071 = s;
  if (G__44071) {
    var bit__4044__auto__ = G__44071.cljs$lang$protocol_mask$partition0$ & 8388608;
    if (bit__4044__auto__ || G__44071.cljs$core$ISeqable$) {
      return true;
    } else {
      if (!G__44071.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeqable, G__44071);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ISeqable, G__44071);
  }
};
cljs.core.boolean$ = function boolean$(x) {
  if (cljs.core.truth_(x)) {
    return true;
  } else {
    return false;
  }
};
cljs.core.ifn_QMARK_ = function ifn_QMARK_(f) {
  var or__3400__auto__ = cljs.core.fn_QMARK_.call(null, f);
  if (or__3400__auto__) {
    return or__3400__auto__;
  } else {
    var G__44075 = f;
    if (G__44075) {
      var bit__4044__auto__ = G__44075.cljs$lang$protocol_mask$partition0$ & 1;
      if (bit__4044__auto__ || G__44075.cljs$core$IFn$) {
        return true;
      } else {
        if (!G__44075.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IFn, G__44075);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IFn, G__44075);
    }
  }
};
cljs.core.integer_QMARK_ = function integer_QMARK_(n) {
  return typeof n === "number" && (!isNaN(n) && (!(n === Infinity) && parseFloat(n) === parseInt(n, 10)));
};
cljs.core.contains_QMARK_ = function contains_QMARK_(coll, v) {
  if (cljs.core.get.call(null, coll, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return false;
  } else {
    return true;
  }
};
cljs.core.find = function find(coll, k) {
  if (!(coll == null) && (cljs.core.associative_QMARK_.call(null, coll) && cljs.core.contains_QMARK_.call(null, coll, k))) {
    return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [k, cljs.core.get.call(null, coll, k)], null);
  } else {
    return null;
  }
};
cljs.core.distinct_QMARK_ = function() {
  var distinct_QMARK_ = null;
  var distinct_QMARK___1 = function(x) {
    return true;
  };
  var distinct_QMARK___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y);
  };
  var distinct_QMARK___3 = function() {
    var G__44076__delegate = function(x, y, more) {
      if (!cljs.core._EQ_.call(null, x, y)) {
        var s = cljs.core.PersistentHashSet.fromArray([y, x], true);
        var xs = more;
        while (true) {
          var x__$1 = cljs.core.first.call(null, xs);
          var etc = cljs.core.next.call(null, xs);
          if (cljs.core.truth_(xs)) {
            if (cljs.core.contains_QMARK_.call(null, s, x__$1)) {
              return false;
            } else {
              var G__44077 = cljs.core.conj.call(null, s, x__$1);
              var G__44078 = etc;
              s = G__44077;
              xs = G__44078;
              continue;
            }
          } else {
            return true;
          }
          break;
        }
      } else {
        return false;
      }
    };
    var G__44076 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44076__delegate.call(this, x, y, more);
    };
    G__44076.cljs$lang$maxFixedArity = 2;
    G__44076.cljs$lang$applyTo = function(arglist__44079) {
      var x = cljs.core.first(arglist__44079);
      arglist__44079 = cljs.core.next(arglist__44079);
      var y = cljs.core.first(arglist__44079);
      var more = cljs.core.rest(arglist__44079);
      return G__44076__delegate(x, y, more);
    };
    G__44076.cljs$core$IFn$_invoke$arity$variadic = G__44076__delegate;
    return G__44076;
  }();
  distinct_QMARK_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return distinct_QMARK___1.call(this, x);
      case 2:
        return distinct_QMARK___2.call(this, x, y);
      default:
        return distinct_QMARK___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  distinct_QMARK_.cljs$lang$maxFixedArity = 2;
  distinct_QMARK_.cljs$lang$applyTo = distinct_QMARK___3.cljs$lang$applyTo;
  distinct_QMARK_.cljs$core$IFn$_invoke$arity$1 = distinct_QMARK___1;
  distinct_QMARK_.cljs$core$IFn$_invoke$arity$2 = distinct_QMARK___2;
  distinct_QMARK_.cljs$core$IFn$_invoke$arity$variadic = distinct_QMARK___3.cljs$core$IFn$_invoke$arity$variadic;
  return distinct_QMARK_;
}();
cljs.core.sequence = function sequence(coll) {
  if (cljs.core.seq_QMARK_.call(null, coll)) {
    return coll;
  } else {
    var or__3400__auto__ = cljs.core.seq.call(null, coll);
    if (or__3400__auto__) {
      return or__3400__auto__;
    } else {
      return cljs.core.List.EMPTY;
    }
  }
};
cljs.core.compare = function compare(x, y) {
  if (x === y) {
    return 0;
  } else {
    if (x == null) {
      return-1;
    } else {
      if (y == null) {
        return 1;
      } else {
        if (cljs.core.type.call(null, x) === cljs.core.type.call(null, y)) {
          if (function() {
            var G__44081 = x;
            if (G__44081) {
              var bit__4037__auto__ = G__44081.cljs$lang$protocol_mask$partition1$ & 2048;
              if (bit__4037__auto__ || G__44081.cljs$core$IComparable$) {
                return true;
              } else {
                return false;
              }
            } else {
              return false;
            }
          }()) {
            return cljs.core._compare.call(null, x, y);
          } else {
            return goog.array.defaultCompare(x, y);
          }
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            throw new Error("compare on non-nil objects of different types");
          } else {
            return null;
          }
        }
      }
    }
  }
};
cljs.core.compare_indexed = function() {
  var compare_indexed = null;
  var compare_indexed__2 = function(xs, ys) {
    var xl = cljs.core.count.call(null, xs);
    var yl = cljs.core.count.call(null, ys);
    if (xl < yl) {
      return-1;
    } else {
      if (xl > yl) {
        return 1;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return compare_indexed.call(null, xs, ys, xl, 0);
        } else {
          return null;
        }
      }
    }
  };
  var compare_indexed__4 = function(xs, ys, len, n) {
    while (true) {
      var d = cljs.core.compare.call(null, cljs.core.nth.call(null, xs, n), cljs.core.nth.call(null, ys, n));
      if (d === 0 && n + 1 < len) {
        var G__44082 = xs;
        var G__44083 = ys;
        var G__44084 = len;
        var G__44085 = n + 1;
        xs = G__44082;
        ys = G__44083;
        len = G__44084;
        n = G__44085;
        continue;
      } else {
        return d;
      }
      break;
    }
  };
  compare_indexed = function(xs, ys, len, n) {
    switch(arguments.length) {
      case 2:
        return compare_indexed__2.call(this, xs, ys);
      case 4:
        return compare_indexed__4.call(this, xs, ys, len, n);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  compare_indexed.cljs$core$IFn$_invoke$arity$2 = compare_indexed__2;
  compare_indexed.cljs$core$IFn$_invoke$arity$4 = compare_indexed__4;
  return compare_indexed;
}();
cljs.core.fn__GT_comparator = function fn__GT_comparator(f) {
  if (cljs.core._EQ_.call(null, f, cljs.core.compare)) {
    return cljs.core.compare;
  } else {
    return function(x, y) {
      var r = f.call(null, x, y);
      if (typeof r === "number") {
        return r;
      } else {
        if (cljs.core.truth_(r)) {
          return-1;
        } else {
          if (cljs.core.truth_(f.call(null, y, x))) {
            return 1;
          } else {
            return 0;
          }
        }
      }
    };
  }
};
cljs.core.sort = function() {
  var sort = null;
  var sort__1 = function(coll) {
    return sort.call(null, cljs.core.compare, coll);
  };
  var sort__2 = function(comp, coll) {
    if (cljs.core.seq.call(null, coll)) {
      var a = cljs.core.to_array.call(null, coll);
      goog.array.stableSort(a, cljs.core.fn__GT_comparator.call(null, comp));
      return cljs.core.seq.call(null, a);
    } else {
      return cljs.core.List.EMPTY;
    }
  };
  sort = function(comp, coll) {
    switch(arguments.length) {
      case 1:
        return sort__1.call(this, comp);
      case 2:
        return sort__2.call(this, comp, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  sort.cljs$core$IFn$_invoke$arity$1 = sort__1;
  sort.cljs$core$IFn$_invoke$arity$2 = sort__2;
  return sort;
}();
cljs.core.sort_by = function() {
  var sort_by = null;
  var sort_by__2 = function(keyfn, coll) {
    return sort_by.call(null, keyfn, cljs.core.compare, coll);
  };
  var sort_by__3 = function(keyfn, comp, coll) {
    return cljs.core.sort.call(null, function(x, y) {
      return cljs.core.fn__GT_comparator.call(null, comp).call(null, keyfn.call(null, x), keyfn.call(null, y));
    }, coll);
  };
  sort_by = function(keyfn, comp, coll) {
    switch(arguments.length) {
      case 2:
        return sort_by__2.call(this, keyfn, comp);
      case 3:
        return sort_by__3.call(this, keyfn, comp, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  sort_by.cljs$core$IFn$_invoke$arity$2 = sort_by__2;
  sort_by.cljs$core$IFn$_invoke$arity$3 = sort_by__3;
  return sort_by;
}();
cljs.core.seq_reduce = function() {
  var seq_reduce = null;
  var seq_reduce__2 = function(f, coll) {
    var temp__4090__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4090__auto__) {
      var s = temp__4090__auto__;
      return cljs.core.reduce.call(null, f, cljs.core.first.call(null, s), cljs.core.next.call(null, s));
    } else {
      return f.call(null);
    }
  };
  var seq_reduce__3 = function(f, val, coll) {
    var val__$1 = val;
    var coll__$1 = cljs.core.seq.call(null, coll);
    while (true) {
      if (coll__$1) {
        var nval = f.call(null, val__$1, cljs.core.first.call(null, coll__$1));
        if (cljs.core.reduced_QMARK_.call(null, nval)) {
          return cljs.core.deref.call(null, nval);
        } else {
          var G__44086 = nval;
          var G__44087 = cljs.core.next.call(null, coll__$1);
          val__$1 = G__44086;
          coll__$1 = G__44087;
          continue;
        }
      } else {
        return val__$1;
      }
      break;
    }
  };
  seq_reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return seq_reduce__2.call(this, f, val);
      case 3:
        return seq_reduce__3.call(this, f, val, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  seq_reduce.cljs$core$IFn$_invoke$arity$2 = seq_reduce__2;
  seq_reduce.cljs$core$IFn$_invoke$arity$3 = seq_reduce__3;
  return seq_reduce;
}();
cljs.core.shuffle = function shuffle(coll) {
  var a = cljs.core.to_array.call(null, coll);
  goog.array.shuffle(a);
  return cljs.core.vec.call(null, a);
};
cljs.core.reduce = function() {
  var reduce = null;
  var reduce__2 = function(f, coll) {
    if (function() {
      var G__44090 = coll;
      if (G__44090) {
        var bit__4037__auto__ = G__44090.cljs$lang$protocol_mask$partition0$ & 524288;
        if (bit__4037__auto__ || G__44090.cljs$core$IReduce$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f);
    } else {
      if (coll instanceof Array) {
        return cljs.core.array_reduce.call(null, coll, f);
      } else {
        if (typeof coll === "string") {
          return cljs.core.array_reduce.call(null, coll, f);
        } else {
          if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReduce, coll)) {
            return cljs.core._reduce.call(null, coll, f);
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return cljs.core.seq_reduce.call(null, f, coll);
            } else {
              return null;
            }
          }
        }
      }
    }
  };
  var reduce__3 = function(f, val, coll) {
    if (function() {
      var G__44091 = coll;
      if (G__44091) {
        var bit__4037__auto__ = G__44091.cljs$lang$protocol_mask$partition0$ & 524288;
        if (bit__4037__auto__ || G__44091.cljs$core$IReduce$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core._reduce.call(null, coll, f, val);
    } else {
      if (coll instanceof Array) {
        return cljs.core.array_reduce.call(null, coll, f, val);
      } else {
        if (typeof coll === "string") {
          return cljs.core.array_reduce.call(null, coll, f, val);
        } else {
          if (cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReduce, coll)) {
            return cljs.core._reduce.call(null, coll, f, val);
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return cljs.core.seq_reduce.call(null, f, val, coll);
            } else {
              return null;
            }
          }
        }
      }
    }
  };
  reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return reduce__2.call(this, f, val);
      case 3:
        return reduce__3.call(this, f, val, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  reduce.cljs$core$IFn$_invoke$arity$2 = reduce__2;
  reduce.cljs$core$IFn$_invoke$arity$3 = reduce__3;
  return reduce;
}();
cljs.core.reduce_kv = function reduce_kv(f, init, coll) {
  if (!(coll == null)) {
    return cljs.core._kv_reduce.call(null, coll, f, init);
  } else {
    return init;
  }
};
cljs.core._PLUS_ = function() {
  var _PLUS_ = null;
  var _PLUS___0 = function() {
    return 0;
  };
  var _PLUS___1 = function(x) {
    return x;
  };
  var _PLUS___2 = function(x, y) {
    return x + y;
  };
  var _PLUS___3 = function() {
    var G__44092__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _PLUS_, x + y, more);
    };
    var G__44092 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44092__delegate.call(this, x, y, more);
    };
    G__44092.cljs$lang$maxFixedArity = 2;
    G__44092.cljs$lang$applyTo = function(arglist__44093) {
      var x = cljs.core.first(arglist__44093);
      arglist__44093 = cljs.core.next(arglist__44093);
      var y = cljs.core.first(arglist__44093);
      var more = cljs.core.rest(arglist__44093);
      return G__44092__delegate(x, y, more);
    };
    G__44092.cljs$core$IFn$_invoke$arity$variadic = G__44092__delegate;
    return G__44092;
  }();
  _PLUS_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _PLUS___0.call(this);
      case 1:
        return _PLUS___1.call(this, x);
      case 2:
        return _PLUS___2.call(this, x, y);
      default:
        return _PLUS___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _PLUS_.cljs$lang$maxFixedArity = 2;
  _PLUS_.cljs$lang$applyTo = _PLUS___3.cljs$lang$applyTo;
  _PLUS_.cljs$core$IFn$_invoke$arity$0 = _PLUS___0;
  _PLUS_.cljs$core$IFn$_invoke$arity$1 = _PLUS___1;
  _PLUS_.cljs$core$IFn$_invoke$arity$2 = _PLUS___2;
  _PLUS_.cljs$core$IFn$_invoke$arity$variadic = _PLUS___3.cljs$core$IFn$_invoke$arity$variadic;
  return _PLUS_;
}();
cljs.core._ = function() {
  var _ = null;
  var ___1 = function(x) {
    return-x;
  };
  var ___2 = function(x, y) {
    return x - y;
  };
  var ___3 = function() {
    var G__44094__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _, x - y, more);
    };
    var G__44094 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44094__delegate.call(this, x, y, more);
    };
    G__44094.cljs$lang$maxFixedArity = 2;
    G__44094.cljs$lang$applyTo = function(arglist__44095) {
      var x = cljs.core.first(arglist__44095);
      arglist__44095 = cljs.core.next(arglist__44095);
      var y = cljs.core.first(arglist__44095);
      var more = cljs.core.rest(arglist__44095);
      return G__44094__delegate(x, y, more);
    };
    G__44094.cljs$core$IFn$_invoke$arity$variadic = G__44094__delegate;
    return G__44094;
  }();
  _ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return ___1.call(this, x);
      case 2:
        return ___2.call(this, x, y);
      default:
        return ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _.cljs$lang$maxFixedArity = 2;
  _.cljs$lang$applyTo = ___3.cljs$lang$applyTo;
  _.cljs$core$IFn$_invoke$arity$1 = ___1;
  _.cljs$core$IFn$_invoke$arity$2 = ___2;
  _.cljs$core$IFn$_invoke$arity$variadic = ___3.cljs$core$IFn$_invoke$arity$variadic;
  return _;
}();
cljs.core._STAR_ = function() {
  var _STAR_ = null;
  var _STAR___0 = function() {
    return 1;
  };
  var _STAR___1 = function(x) {
    return x;
  };
  var _STAR___2 = function(x, y) {
    return x * y;
  };
  var _STAR___3 = function() {
    var G__44096__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _STAR_, x * y, more);
    };
    var G__44096 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44096__delegate.call(this, x, y, more);
    };
    G__44096.cljs$lang$maxFixedArity = 2;
    G__44096.cljs$lang$applyTo = function(arglist__44097) {
      var x = cljs.core.first(arglist__44097);
      arglist__44097 = cljs.core.next(arglist__44097);
      var y = cljs.core.first(arglist__44097);
      var more = cljs.core.rest(arglist__44097);
      return G__44096__delegate(x, y, more);
    };
    G__44096.cljs$core$IFn$_invoke$arity$variadic = G__44096__delegate;
    return G__44096;
  }();
  _STAR_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _STAR___0.call(this);
      case 1:
        return _STAR___1.call(this, x);
      case 2:
        return _STAR___2.call(this, x, y);
      default:
        return _STAR___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _STAR_.cljs$lang$maxFixedArity = 2;
  _STAR_.cljs$lang$applyTo = _STAR___3.cljs$lang$applyTo;
  _STAR_.cljs$core$IFn$_invoke$arity$0 = _STAR___0;
  _STAR_.cljs$core$IFn$_invoke$arity$1 = _STAR___1;
  _STAR_.cljs$core$IFn$_invoke$arity$2 = _STAR___2;
  _STAR_.cljs$core$IFn$_invoke$arity$variadic = _STAR___3.cljs$core$IFn$_invoke$arity$variadic;
  return _STAR_;
}();
cljs.core._SLASH_ = function() {
  var _SLASH_ = null;
  var _SLASH___1 = function(x) {
    return _SLASH_.call(null, 1, x);
  };
  var _SLASH___2 = function(x, y) {
    return x / y;
  };
  var _SLASH___3 = function() {
    var G__44098__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _SLASH_, _SLASH_.call(null, x, y), more);
    };
    var G__44098 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44098__delegate.call(this, x, y, more);
    };
    G__44098.cljs$lang$maxFixedArity = 2;
    G__44098.cljs$lang$applyTo = function(arglist__44099) {
      var x = cljs.core.first(arglist__44099);
      arglist__44099 = cljs.core.next(arglist__44099);
      var y = cljs.core.first(arglist__44099);
      var more = cljs.core.rest(arglist__44099);
      return G__44098__delegate(x, y, more);
    };
    G__44098.cljs$core$IFn$_invoke$arity$variadic = G__44098__delegate;
    return G__44098;
  }();
  _SLASH_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _SLASH___1.call(this, x);
      case 2:
        return _SLASH___2.call(this, x, y);
      default:
        return _SLASH___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _SLASH_.cljs$lang$maxFixedArity = 2;
  _SLASH_.cljs$lang$applyTo = _SLASH___3.cljs$lang$applyTo;
  _SLASH_.cljs$core$IFn$_invoke$arity$1 = _SLASH___1;
  _SLASH_.cljs$core$IFn$_invoke$arity$2 = _SLASH___2;
  _SLASH_.cljs$core$IFn$_invoke$arity$variadic = _SLASH___3.cljs$core$IFn$_invoke$arity$variadic;
  return _SLASH_;
}();
cljs.core._LT_ = function() {
  var _LT_ = null;
  var _LT___1 = function(x) {
    return true;
  };
  var _LT___2 = function(x, y) {
    return x < y;
  };
  var _LT___3 = function() {
    var G__44100__delegate = function(x, y, more) {
      while (true) {
        if (x < y) {
          if (cljs.core.next.call(null, more)) {
            var G__44101 = y;
            var G__44102 = cljs.core.first.call(null, more);
            var G__44103 = cljs.core.next.call(null, more);
            x = G__44101;
            y = G__44102;
            more = G__44103;
            continue;
          } else {
            return y < cljs.core.first.call(null, more);
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__44100 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44100__delegate.call(this, x, y, more);
    };
    G__44100.cljs$lang$maxFixedArity = 2;
    G__44100.cljs$lang$applyTo = function(arglist__44104) {
      var x = cljs.core.first(arglist__44104);
      arglist__44104 = cljs.core.next(arglist__44104);
      var y = cljs.core.first(arglist__44104);
      var more = cljs.core.rest(arglist__44104);
      return G__44100__delegate(x, y, more);
    };
    G__44100.cljs$core$IFn$_invoke$arity$variadic = G__44100__delegate;
    return G__44100;
  }();
  _LT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT___1.call(this, x);
      case 2:
        return _LT___2.call(this, x, y);
      default:
        return _LT___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _LT_.cljs$lang$maxFixedArity = 2;
  _LT_.cljs$lang$applyTo = _LT___3.cljs$lang$applyTo;
  _LT_.cljs$core$IFn$_invoke$arity$1 = _LT___1;
  _LT_.cljs$core$IFn$_invoke$arity$2 = _LT___2;
  _LT_.cljs$core$IFn$_invoke$arity$variadic = _LT___3.cljs$core$IFn$_invoke$arity$variadic;
  return _LT_;
}();
cljs.core._LT__EQ_ = function() {
  var _LT__EQ_ = null;
  var _LT__EQ___1 = function(x) {
    return true;
  };
  var _LT__EQ___2 = function(x, y) {
    return x <= y;
  };
  var _LT__EQ___3 = function() {
    var G__44105__delegate = function(x, y, more) {
      while (true) {
        if (x <= y) {
          if (cljs.core.next.call(null, more)) {
            var G__44106 = y;
            var G__44107 = cljs.core.first.call(null, more);
            var G__44108 = cljs.core.next.call(null, more);
            x = G__44106;
            y = G__44107;
            more = G__44108;
            continue;
          } else {
            return y <= cljs.core.first.call(null, more);
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__44105 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44105__delegate.call(this, x, y, more);
    };
    G__44105.cljs$lang$maxFixedArity = 2;
    G__44105.cljs$lang$applyTo = function(arglist__44109) {
      var x = cljs.core.first(arglist__44109);
      arglist__44109 = cljs.core.next(arglist__44109);
      var y = cljs.core.first(arglist__44109);
      var more = cljs.core.rest(arglist__44109);
      return G__44105__delegate(x, y, more);
    };
    G__44105.cljs$core$IFn$_invoke$arity$variadic = G__44105__delegate;
    return G__44105;
  }();
  _LT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT__EQ___1.call(this, x);
      case 2:
        return _LT__EQ___2.call(this, x, y);
      default:
        return _LT__EQ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _LT__EQ_.cljs$lang$maxFixedArity = 2;
  _LT__EQ_.cljs$lang$applyTo = _LT__EQ___3.cljs$lang$applyTo;
  _LT__EQ_.cljs$core$IFn$_invoke$arity$1 = _LT__EQ___1;
  _LT__EQ_.cljs$core$IFn$_invoke$arity$2 = _LT__EQ___2;
  _LT__EQ_.cljs$core$IFn$_invoke$arity$variadic = _LT__EQ___3.cljs$core$IFn$_invoke$arity$variadic;
  return _LT__EQ_;
}();
cljs.core._GT_ = function() {
  var _GT_ = null;
  var _GT___1 = function(x) {
    return true;
  };
  var _GT___2 = function(x, y) {
    return x > y;
  };
  var _GT___3 = function() {
    var G__44110__delegate = function(x, y, more) {
      while (true) {
        if (x > y) {
          if (cljs.core.next.call(null, more)) {
            var G__44111 = y;
            var G__44112 = cljs.core.first.call(null, more);
            var G__44113 = cljs.core.next.call(null, more);
            x = G__44111;
            y = G__44112;
            more = G__44113;
            continue;
          } else {
            return y > cljs.core.first.call(null, more);
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__44110 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44110__delegate.call(this, x, y, more);
    };
    G__44110.cljs$lang$maxFixedArity = 2;
    G__44110.cljs$lang$applyTo = function(arglist__44114) {
      var x = cljs.core.first(arglist__44114);
      arglist__44114 = cljs.core.next(arglist__44114);
      var y = cljs.core.first(arglist__44114);
      var more = cljs.core.rest(arglist__44114);
      return G__44110__delegate(x, y, more);
    };
    G__44110.cljs$core$IFn$_invoke$arity$variadic = G__44110__delegate;
    return G__44110;
  }();
  _GT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT___1.call(this, x);
      case 2:
        return _GT___2.call(this, x, y);
      default:
        return _GT___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _GT_.cljs$lang$maxFixedArity = 2;
  _GT_.cljs$lang$applyTo = _GT___3.cljs$lang$applyTo;
  _GT_.cljs$core$IFn$_invoke$arity$1 = _GT___1;
  _GT_.cljs$core$IFn$_invoke$arity$2 = _GT___2;
  _GT_.cljs$core$IFn$_invoke$arity$variadic = _GT___3.cljs$core$IFn$_invoke$arity$variadic;
  return _GT_;
}();
cljs.core._GT__EQ_ = function() {
  var _GT__EQ_ = null;
  var _GT__EQ___1 = function(x) {
    return true;
  };
  var _GT__EQ___2 = function(x, y) {
    return x >= y;
  };
  var _GT__EQ___3 = function() {
    var G__44115__delegate = function(x, y, more) {
      while (true) {
        if (x >= y) {
          if (cljs.core.next.call(null, more)) {
            var G__44116 = y;
            var G__44117 = cljs.core.first.call(null, more);
            var G__44118 = cljs.core.next.call(null, more);
            x = G__44116;
            y = G__44117;
            more = G__44118;
            continue;
          } else {
            return y >= cljs.core.first.call(null, more);
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__44115 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44115__delegate.call(this, x, y, more);
    };
    G__44115.cljs$lang$maxFixedArity = 2;
    G__44115.cljs$lang$applyTo = function(arglist__44119) {
      var x = cljs.core.first(arglist__44119);
      arglist__44119 = cljs.core.next(arglist__44119);
      var y = cljs.core.first(arglist__44119);
      var more = cljs.core.rest(arglist__44119);
      return G__44115__delegate(x, y, more);
    };
    G__44115.cljs$core$IFn$_invoke$arity$variadic = G__44115__delegate;
    return G__44115;
  }();
  _GT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT__EQ___1.call(this, x);
      case 2:
        return _GT__EQ___2.call(this, x, y);
      default:
        return _GT__EQ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _GT__EQ_.cljs$lang$maxFixedArity = 2;
  _GT__EQ_.cljs$lang$applyTo = _GT__EQ___3.cljs$lang$applyTo;
  _GT__EQ_.cljs$core$IFn$_invoke$arity$1 = _GT__EQ___1;
  _GT__EQ_.cljs$core$IFn$_invoke$arity$2 = _GT__EQ___2;
  _GT__EQ_.cljs$core$IFn$_invoke$arity$variadic = _GT__EQ___3.cljs$core$IFn$_invoke$arity$variadic;
  return _GT__EQ_;
}();
cljs.core.dec = function dec(x) {
  return x - 1;
};
cljs.core.max = function() {
  var max = null;
  var max__1 = function(x) {
    return x;
  };
  var max__2 = function(x, y) {
    var x__3707__auto__ = x;
    var y__3708__auto__ = y;
    return x__3707__auto__ > y__3708__auto__ ? x__3707__auto__ : y__3708__auto__;
  };
  var max__3 = function() {
    var G__44120__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, max, function() {
        var x__3707__auto__ = x;
        var y__3708__auto__ = y;
        return x__3707__auto__ > y__3708__auto__ ? x__3707__auto__ : y__3708__auto__;
      }(), more);
    };
    var G__44120 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44120__delegate.call(this, x, y, more);
    };
    G__44120.cljs$lang$maxFixedArity = 2;
    G__44120.cljs$lang$applyTo = function(arglist__44121) {
      var x = cljs.core.first(arglist__44121);
      arglist__44121 = cljs.core.next(arglist__44121);
      var y = cljs.core.first(arglist__44121);
      var more = cljs.core.rest(arglist__44121);
      return G__44120__delegate(x, y, more);
    };
    G__44120.cljs$core$IFn$_invoke$arity$variadic = G__44120__delegate;
    return G__44120;
  }();
  max = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return max__1.call(this, x);
      case 2:
        return max__2.call(this, x, y);
      default:
        return max__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  max.cljs$lang$maxFixedArity = 2;
  max.cljs$lang$applyTo = max__3.cljs$lang$applyTo;
  max.cljs$core$IFn$_invoke$arity$1 = max__1;
  max.cljs$core$IFn$_invoke$arity$2 = max__2;
  max.cljs$core$IFn$_invoke$arity$variadic = max__3.cljs$core$IFn$_invoke$arity$variadic;
  return max;
}();
cljs.core.min = function() {
  var min = null;
  var min__1 = function(x) {
    return x;
  };
  var min__2 = function(x, y) {
    var x__3714__auto__ = x;
    var y__3715__auto__ = y;
    return x__3714__auto__ < y__3715__auto__ ? x__3714__auto__ : y__3715__auto__;
  };
  var min__3 = function() {
    var G__44122__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, min, function() {
        var x__3714__auto__ = x;
        var y__3715__auto__ = y;
        return x__3714__auto__ < y__3715__auto__ ? x__3714__auto__ : y__3715__auto__;
      }(), more);
    };
    var G__44122 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44122__delegate.call(this, x, y, more);
    };
    G__44122.cljs$lang$maxFixedArity = 2;
    G__44122.cljs$lang$applyTo = function(arglist__44123) {
      var x = cljs.core.first(arglist__44123);
      arglist__44123 = cljs.core.next(arglist__44123);
      var y = cljs.core.first(arglist__44123);
      var more = cljs.core.rest(arglist__44123);
      return G__44122__delegate(x, y, more);
    };
    G__44122.cljs$core$IFn$_invoke$arity$variadic = G__44122__delegate;
    return G__44122;
  }();
  min = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return min__1.call(this, x);
      case 2:
        return min__2.call(this, x, y);
      default:
        return min__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  min.cljs$lang$maxFixedArity = 2;
  min.cljs$lang$applyTo = min__3.cljs$lang$applyTo;
  min.cljs$core$IFn$_invoke$arity$1 = min__1;
  min.cljs$core$IFn$_invoke$arity$2 = min__2;
  min.cljs$core$IFn$_invoke$arity$variadic = min__3.cljs$core$IFn$_invoke$arity$variadic;
  return min;
}();
cljs.core.byte$ = function byte$(x) {
  return x;
};
cljs.core.char$ = function char$(x) {
  if (typeof x === "number") {
    return String.fromCharCode(x);
  } else {
    if (typeof x === "string" && x.length === 1) {
      return x;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        throw new Error("Argument to char must be a character or number");
      } else {
        return null;
      }
    }
  }
};
cljs.core.short$ = function short$(x) {
  return x;
};
cljs.core.float$ = function float$(x) {
  return x;
};
cljs.core.double$ = function double$(x) {
  return x;
};
cljs.core.unchecked_byte = function unchecked_byte(x) {
  return x;
};
cljs.core.unchecked_char = function unchecked_char(x) {
  return x;
};
cljs.core.unchecked_short = function unchecked_short(x) {
  return x;
};
cljs.core.unchecked_float = function unchecked_float(x) {
  return x;
};
cljs.core.unchecked_double = function unchecked_double(x) {
  return x;
};
cljs.core.unchecked_add = function() {
  var unchecked_add = null;
  var unchecked_add__0 = function() {
    return 0;
  };
  var unchecked_add__1 = function(x) {
    return x;
  };
  var unchecked_add__2 = function(x, y) {
    return x + y;
  };
  var unchecked_add__3 = function() {
    var G__44124__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_add, x + y, more);
    };
    var G__44124 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44124__delegate.call(this, x, y, more);
    };
    G__44124.cljs$lang$maxFixedArity = 2;
    G__44124.cljs$lang$applyTo = function(arglist__44125) {
      var x = cljs.core.first(arglist__44125);
      arglist__44125 = cljs.core.next(arglist__44125);
      var y = cljs.core.first(arglist__44125);
      var more = cljs.core.rest(arglist__44125);
      return G__44124__delegate(x, y, more);
    };
    G__44124.cljs$core$IFn$_invoke$arity$variadic = G__44124__delegate;
    return G__44124;
  }();
  unchecked_add = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return unchecked_add__0.call(this);
      case 1:
        return unchecked_add__1.call(this, x);
      case 2:
        return unchecked_add__2.call(this, x, y);
      default:
        return unchecked_add__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_add.cljs$lang$maxFixedArity = 2;
  unchecked_add.cljs$lang$applyTo = unchecked_add__3.cljs$lang$applyTo;
  unchecked_add.cljs$core$IFn$_invoke$arity$0 = unchecked_add__0;
  unchecked_add.cljs$core$IFn$_invoke$arity$1 = unchecked_add__1;
  unchecked_add.cljs$core$IFn$_invoke$arity$2 = unchecked_add__2;
  unchecked_add.cljs$core$IFn$_invoke$arity$variadic = unchecked_add__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_add;
}();
cljs.core.unchecked_add_int = function() {
  var unchecked_add_int = null;
  var unchecked_add_int__0 = function() {
    return 0;
  };
  var unchecked_add_int__1 = function(x) {
    return x;
  };
  var unchecked_add_int__2 = function(x, y) {
    return x + y;
  };
  var unchecked_add_int__3 = function() {
    var G__44126__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_add_int, x + y, more);
    };
    var G__44126 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44126__delegate.call(this, x, y, more);
    };
    G__44126.cljs$lang$maxFixedArity = 2;
    G__44126.cljs$lang$applyTo = function(arglist__44127) {
      var x = cljs.core.first(arglist__44127);
      arglist__44127 = cljs.core.next(arglist__44127);
      var y = cljs.core.first(arglist__44127);
      var more = cljs.core.rest(arglist__44127);
      return G__44126__delegate(x, y, more);
    };
    G__44126.cljs$core$IFn$_invoke$arity$variadic = G__44126__delegate;
    return G__44126;
  }();
  unchecked_add_int = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return unchecked_add_int__0.call(this);
      case 1:
        return unchecked_add_int__1.call(this, x);
      case 2:
        return unchecked_add_int__2.call(this, x, y);
      default:
        return unchecked_add_int__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_add_int.cljs$lang$maxFixedArity = 2;
  unchecked_add_int.cljs$lang$applyTo = unchecked_add_int__3.cljs$lang$applyTo;
  unchecked_add_int.cljs$core$IFn$_invoke$arity$0 = unchecked_add_int__0;
  unchecked_add_int.cljs$core$IFn$_invoke$arity$1 = unchecked_add_int__1;
  unchecked_add_int.cljs$core$IFn$_invoke$arity$2 = unchecked_add_int__2;
  unchecked_add_int.cljs$core$IFn$_invoke$arity$variadic = unchecked_add_int__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_add_int;
}();
cljs.core.unchecked_dec = function unchecked_dec(x) {
  return x - 1;
};
cljs.core.unchecked_dec_int = function unchecked_dec_int(x) {
  return x - 1;
};
cljs.core.unchecked_divide_int = function() {
  var unchecked_divide_int = null;
  var unchecked_divide_int__1 = function(x) {
    return unchecked_divide_int.call(null, 1, x);
  };
  var unchecked_divide_int__2 = function(x, y) {
    return x / y;
  };
  var unchecked_divide_int__3 = function() {
    var G__44128__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_divide_int, unchecked_divide_int.call(null, x, y), more);
    };
    var G__44128 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44128__delegate.call(this, x, y, more);
    };
    G__44128.cljs$lang$maxFixedArity = 2;
    G__44128.cljs$lang$applyTo = function(arglist__44129) {
      var x = cljs.core.first(arglist__44129);
      arglist__44129 = cljs.core.next(arglist__44129);
      var y = cljs.core.first(arglist__44129);
      var more = cljs.core.rest(arglist__44129);
      return G__44128__delegate(x, y, more);
    };
    G__44128.cljs$core$IFn$_invoke$arity$variadic = G__44128__delegate;
    return G__44128;
  }();
  unchecked_divide_int = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return unchecked_divide_int__1.call(this, x);
      case 2:
        return unchecked_divide_int__2.call(this, x, y);
      default:
        return unchecked_divide_int__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_divide_int.cljs$lang$maxFixedArity = 2;
  unchecked_divide_int.cljs$lang$applyTo = unchecked_divide_int__3.cljs$lang$applyTo;
  unchecked_divide_int.cljs$core$IFn$_invoke$arity$1 = unchecked_divide_int__1;
  unchecked_divide_int.cljs$core$IFn$_invoke$arity$2 = unchecked_divide_int__2;
  unchecked_divide_int.cljs$core$IFn$_invoke$arity$variadic = unchecked_divide_int__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_divide_int;
}();
cljs.core.unchecked_inc = function unchecked_inc(x) {
  return x + 1;
};
cljs.core.unchecked_inc_int = function unchecked_inc_int(x) {
  return x + 1;
};
cljs.core.unchecked_multiply = function() {
  var unchecked_multiply = null;
  var unchecked_multiply__0 = function() {
    return 1;
  };
  var unchecked_multiply__1 = function(x) {
    return x;
  };
  var unchecked_multiply__2 = function(x, y) {
    return x * y;
  };
  var unchecked_multiply__3 = function() {
    var G__44130__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_multiply, x * y, more);
    };
    var G__44130 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44130__delegate.call(this, x, y, more);
    };
    G__44130.cljs$lang$maxFixedArity = 2;
    G__44130.cljs$lang$applyTo = function(arglist__44131) {
      var x = cljs.core.first(arglist__44131);
      arglist__44131 = cljs.core.next(arglist__44131);
      var y = cljs.core.first(arglist__44131);
      var more = cljs.core.rest(arglist__44131);
      return G__44130__delegate(x, y, more);
    };
    G__44130.cljs$core$IFn$_invoke$arity$variadic = G__44130__delegate;
    return G__44130;
  }();
  unchecked_multiply = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return unchecked_multiply__0.call(this);
      case 1:
        return unchecked_multiply__1.call(this, x);
      case 2:
        return unchecked_multiply__2.call(this, x, y);
      default:
        return unchecked_multiply__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_multiply.cljs$lang$maxFixedArity = 2;
  unchecked_multiply.cljs$lang$applyTo = unchecked_multiply__3.cljs$lang$applyTo;
  unchecked_multiply.cljs$core$IFn$_invoke$arity$0 = unchecked_multiply__0;
  unchecked_multiply.cljs$core$IFn$_invoke$arity$1 = unchecked_multiply__1;
  unchecked_multiply.cljs$core$IFn$_invoke$arity$2 = unchecked_multiply__2;
  unchecked_multiply.cljs$core$IFn$_invoke$arity$variadic = unchecked_multiply__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_multiply;
}();
cljs.core.unchecked_multiply_int = function() {
  var unchecked_multiply_int = null;
  var unchecked_multiply_int__0 = function() {
    return 1;
  };
  var unchecked_multiply_int__1 = function(x) {
    return x;
  };
  var unchecked_multiply_int__2 = function(x, y) {
    return x * y;
  };
  var unchecked_multiply_int__3 = function() {
    var G__44132__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_multiply_int, x * y, more);
    };
    var G__44132 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44132__delegate.call(this, x, y, more);
    };
    G__44132.cljs$lang$maxFixedArity = 2;
    G__44132.cljs$lang$applyTo = function(arglist__44133) {
      var x = cljs.core.first(arglist__44133);
      arglist__44133 = cljs.core.next(arglist__44133);
      var y = cljs.core.first(arglist__44133);
      var more = cljs.core.rest(arglist__44133);
      return G__44132__delegate(x, y, more);
    };
    G__44132.cljs$core$IFn$_invoke$arity$variadic = G__44132__delegate;
    return G__44132;
  }();
  unchecked_multiply_int = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return unchecked_multiply_int__0.call(this);
      case 1:
        return unchecked_multiply_int__1.call(this, x);
      case 2:
        return unchecked_multiply_int__2.call(this, x, y);
      default:
        return unchecked_multiply_int__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_multiply_int.cljs$lang$maxFixedArity = 2;
  unchecked_multiply_int.cljs$lang$applyTo = unchecked_multiply_int__3.cljs$lang$applyTo;
  unchecked_multiply_int.cljs$core$IFn$_invoke$arity$0 = unchecked_multiply_int__0;
  unchecked_multiply_int.cljs$core$IFn$_invoke$arity$1 = unchecked_multiply_int__1;
  unchecked_multiply_int.cljs$core$IFn$_invoke$arity$2 = unchecked_multiply_int__2;
  unchecked_multiply_int.cljs$core$IFn$_invoke$arity$variadic = unchecked_multiply_int__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_multiply_int;
}();
cljs.core.unchecked_negate = function unchecked_negate(x) {
  return-x;
};
cljs.core.unchecked_negate_int = function unchecked_negate_int(x) {
  return-x;
};
cljs.core.unchecked_remainder_int = function unchecked_remainder_int(x, n) {
  return cljs.core.mod.call(null, x, n);
};
cljs.core.unchecked_substract = function() {
  var unchecked_substract = null;
  var unchecked_substract__1 = function(x) {
    return-x;
  };
  var unchecked_substract__2 = function(x, y) {
    return x - y;
  };
  var unchecked_substract__3 = function() {
    var G__44134__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_substract, x - y, more);
    };
    var G__44134 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44134__delegate.call(this, x, y, more);
    };
    G__44134.cljs$lang$maxFixedArity = 2;
    G__44134.cljs$lang$applyTo = function(arglist__44135) {
      var x = cljs.core.first(arglist__44135);
      arglist__44135 = cljs.core.next(arglist__44135);
      var y = cljs.core.first(arglist__44135);
      var more = cljs.core.rest(arglist__44135);
      return G__44134__delegate(x, y, more);
    };
    G__44134.cljs$core$IFn$_invoke$arity$variadic = G__44134__delegate;
    return G__44134;
  }();
  unchecked_substract = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return unchecked_substract__1.call(this, x);
      case 2:
        return unchecked_substract__2.call(this, x, y);
      default:
        return unchecked_substract__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_substract.cljs$lang$maxFixedArity = 2;
  unchecked_substract.cljs$lang$applyTo = unchecked_substract__3.cljs$lang$applyTo;
  unchecked_substract.cljs$core$IFn$_invoke$arity$1 = unchecked_substract__1;
  unchecked_substract.cljs$core$IFn$_invoke$arity$2 = unchecked_substract__2;
  unchecked_substract.cljs$core$IFn$_invoke$arity$variadic = unchecked_substract__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_substract;
}();
cljs.core.unchecked_substract_int = function() {
  var unchecked_substract_int = null;
  var unchecked_substract_int__1 = function(x) {
    return-x;
  };
  var unchecked_substract_int__2 = function(x, y) {
    return x - y;
  };
  var unchecked_substract_int__3 = function() {
    var G__44136__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, unchecked_substract_int, x - y, more);
    };
    var G__44136 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44136__delegate.call(this, x, y, more);
    };
    G__44136.cljs$lang$maxFixedArity = 2;
    G__44136.cljs$lang$applyTo = function(arglist__44137) {
      var x = cljs.core.first(arglist__44137);
      arglist__44137 = cljs.core.next(arglist__44137);
      var y = cljs.core.first(arglist__44137);
      var more = cljs.core.rest(arglist__44137);
      return G__44136__delegate(x, y, more);
    };
    G__44136.cljs$core$IFn$_invoke$arity$variadic = G__44136__delegate;
    return G__44136;
  }();
  unchecked_substract_int = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return unchecked_substract_int__1.call(this, x);
      case 2:
        return unchecked_substract_int__2.call(this, x, y);
      default:
        return unchecked_substract_int__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  unchecked_substract_int.cljs$lang$maxFixedArity = 2;
  unchecked_substract_int.cljs$lang$applyTo = unchecked_substract_int__3.cljs$lang$applyTo;
  unchecked_substract_int.cljs$core$IFn$_invoke$arity$1 = unchecked_substract_int__1;
  unchecked_substract_int.cljs$core$IFn$_invoke$arity$2 = unchecked_substract_int__2;
  unchecked_substract_int.cljs$core$IFn$_invoke$arity$variadic = unchecked_substract_int__3.cljs$core$IFn$_invoke$arity$variadic;
  return unchecked_substract_int;
}();
cljs.core.fix = function fix(q) {
  if (q >= 0) {
    return Math.floor.call(null, q);
  } else {
    return Math.ceil.call(null, q);
  }
};
cljs.core.int$ = function int$(x) {
  return x | 0;
};
cljs.core.unchecked_int = function unchecked_int(x) {
  return cljs.core.fix.call(null, x);
};
cljs.core.long$ = function long$(x) {
  return cljs.core.fix.call(null, x);
};
cljs.core.unchecked_long = function unchecked_long(x) {
  return cljs.core.fix.call(null, x);
};
cljs.core.booleans = function booleans(x) {
  return x;
};
cljs.core.bytes = function bytes(x) {
  return x;
};
cljs.core.chars = function chars(x) {
  return x;
};
cljs.core.shorts = function shorts(x) {
  return x;
};
cljs.core.ints = function ints(x) {
  return x;
};
cljs.core.floats = function floats(x) {
  return x;
};
cljs.core.doubles = function doubles(x) {
  return x;
};
cljs.core.longs = function longs(x) {
  return x;
};
cljs.core.js_mod = function js_mod(n, d) {
  return n % d;
};
cljs.core.mod = function mod(n, d) {
  return(n % d + d) % d;
};
cljs.core.quot = function quot(n, d) {
  var rem = n % d;
  return cljs.core.fix.call(null, (n - rem) / d);
};
cljs.core.rem = function rem(n, d) {
  var q = cljs.core.quot.call(null, n, d);
  return n - d * q;
};
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return Math.random.call(null);
  };
  var rand__1 = function(n) {
    return n * rand.call(null);
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  rand.cljs$core$IFn$_invoke$arity$0 = rand__0;
  rand.cljs$core$IFn$_invoke$arity$1 = rand__1;
  return rand;
}();
cljs.core.rand_int = function rand_int(n) {
  return cljs.core.fix.call(null, cljs.core.rand.call(null, n));
};
cljs.core.bit_xor = function bit_xor(x, y) {
  return x ^ y;
};
cljs.core.bit_and = function bit_and(x, y) {
  return x & y;
};
cljs.core.bit_or = function bit_or(x, y) {
  return x | y;
};
cljs.core.bit_and_not = function bit_and_not(x, y) {
  return x & ~y;
};
cljs.core.bit_clear = function bit_clear(x, n) {
  return x & ~(1 << n);
};
cljs.core.bit_flip = function bit_flip(x, n) {
  return x ^ 1 << n;
};
cljs.core.bit_not = function bit_not(x) {
  return~x;
};
cljs.core.bit_set = function bit_set(x, n) {
  return x | 1 << n;
};
cljs.core.bit_test = function bit_test(x, n) {
  return(x & 1 << n) != 0;
};
cljs.core.bit_shift_left = function bit_shift_left(x, n) {
  return x << n;
};
cljs.core.bit_shift_right = function bit_shift_right(x, n) {
  return x >> n;
};
cljs.core.bit_shift_right_zero_fill = function bit_shift_right_zero_fill(x, n) {
  return x >>> n;
};
cljs.core.unsigned_bit_shift_right = function unsigned_bit_shift_right(x, n) {
  return x >>> n;
};
cljs.core.bit_count = function bit_count(v) {
  var v__$1 = v - (v >> 1 & 1431655765);
  var v__$2 = (v__$1 & 858993459) + (v__$1 >> 2 & 858993459);
  return(v__$2 + (v__$2 >> 4) & 252645135) * 16843009 >> 24;
};
cljs.core._EQ__EQ_ = function() {
  var _EQ__EQ_ = null;
  var _EQ__EQ___1 = function(x) {
    return true;
  };
  var _EQ__EQ___2 = function(x, y) {
    return cljs.core._equiv.call(null, x, y);
  };
  var _EQ__EQ___3 = function() {
    var G__44138__delegate = function(x, y, more) {
      while (true) {
        if (_EQ__EQ_.call(null, x, y)) {
          if (cljs.core.next.call(null, more)) {
            var G__44139 = y;
            var G__44140 = cljs.core.first.call(null, more);
            var G__44141 = cljs.core.next.call(null, more);
            x = G__44139;
            y = G__44140;
            more = G__44141;
            continue;
          } else {
            return _EQ__EQ_.call(null, y, cljs.core.first.call(null, more));
          }
        } else {
          return false;
        }
        break;
      }
    };
    var G__44138 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44138__delegate.call(this, x, y, more);
    };
    G__44138.cljs$lang$maxFixedArity = 2;
    G__44138.cljs$lang$applyTo = function(arglist__44142) {
      var x = cljs.core.first(arglist__44142);
      arglist__44142 = cljs.core.next(arglist__44142);
      var y = cljs.core.first(arglist__44142);
      var more = cljs.core.rest(arglist__44142);
      return G__44138__delegate(x, y, more);
    };
    G__44138.cljs$core$IFn$_invoke$arity$variadic = G__44138__delegate;
    return G__44138;
  }();
  _EQ__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ__EQ___1.call(this, x);
      case 2:
        return _EQ__EQ___2.call(this, x, y);
      default:
        return _EQ__EQ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  _EQ__EQ_.cljs$lang$maxFixedArity = 2;
  _EQ__EQ_.cljs$lang$applyTo = _EQ__EQ___3.cljs$lang$applyTo;
  _EQ__EQ_.cljs$core$IFn$_invoke$arity$1 = _EQ__EQ___1;
  _EQ__EQ_.cljs$core$IFn$_invoke$arity$2 = _EQ__EQ___2;
  _EQ__EQ_.cljs$core$IFn$_invoke$arity$variadic = _EQ__EQ___3.cljs$core$IFn$_invoke$arity$variadic;
  return _EQ__EQ_;
}();
cljs.core.pos_QMARK_ = function pos_QMARK_(n) {
  return n > 0;
};
cljs.core.zero_QMARK_ = function zero_QMARK_(n) {
  return n === 0;
};
cljs.core.neg_QMARK_ = function neg_QMARK_(x) {
  return x < 0;
};
cljs.core.nthnext = function nthnext(coll, n) {
  var n__$1 = n;
  var xs = cljs.core.seq.call(null, coll);
  while (true) {
    if (xs && n__$1 > 0) {
      var G__44143 = n__$1 - 1;
      var G__44144 = cljs.core.next.call(null, xs);
      n__$1 = G__44143;
      xs = G__44144;
      continue;
    } else {
      return xs;
    }
    break;
  }
};
cljs.core.str = function() {
  var str = null;
  var str__0 = function() {
    return "";
  };
  var str__1 = function(x) {
    if (x == null) {
      return "";
    } else {
      return x.toString();
    }
  };
  var str__2 = function() {
    var G__44145__delegate = function(x, ys) {
      var sb = new goog.string.StringBuffer(str.call(null, x));
      var more = ys;
      while (true) {
        if (cljs.core.truth_(more)) {
          var G__44146 = sb.append(str.call(null, cljs.core.first.call(null, more)));
          var G__44147 = cljs.core.next.call(null, more);
          sb = G__44146;
          more = G__44147;
          continue;
        } else {
          return sb.toString();
        }
        break;
      }
    };
    var G__44145 = function(x, var_args) {
      var ys = null;
      if (arguments.length > 1) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
      }
      return G__44145__delegate.call(this, x, ys);
    };
    G__44145.cljs$lang$maxFixedArity = 1;
    G__44145.cljs$lang$applyTo = function(arglist__44148) {
      var x = cljs.core.first(arglist__44148);
      var ys = cljs.core.rest(arglist__44148);
      return G__44145__delegate(x, ys);
    };
    G__44145.cljs$core$IFn$_invoke$arity$variadic = G__44145__delegate;
    return G__44145;
  }();
  str = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str__0.call(this);
      case 1:
        return str__1.call(this, x);
      default:
        return str__2.cljs$core$IFn$_invoke$arity$variadic(x, cljs.core.array_seq(arguments, 1));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  str.cljs$lang$maxFixedArity = 1;
  str.cljs$lang$applyTo = str__2.cljs$lang$applyTo;
  str.cljs$core$IFn$_invoke$arity$0 = str__0;
  str.cljs$core$IFn$_invoke$arity$1 = str__1;
  str.cljs$core$IFn$_invoke$arity$variadic = str__2.cljs$core$IFn$_invoke$arity$variadic;
  return str;
}();
cljs.core.subs = function() {
  var subs = null;
  var subs__2 = function(s, start) {
    return s.substring(start);
  };
  var subs__3 = function(s, start, end) {
    return s.substring(start, end);
  };
  subs = function(s, start, end) {
    switch(arguments.length) {
      case 2:
        return subs__2.call(this, s, start);
      case 3:
        return subs__3.call(this, s, start, end);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  subs.cljs$core$IFn$_invoke$arity$2 = subs__2;
  subs.cljs$core$IFn$_invoke$arity$3 = subs__3;
  return subs;
}();
cljs.core.equiv_sequential = function equiv_sequential(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.sequential_QMARK_.call(null, y) ? function() {
    var xs = cljs.core.seq.call(null, x);
    var ys = cljs.core.seq.call(null, y);
    while (true) {
      if (xs == null) {
        return ys == null;
      } else {
        if (ys == null) {
          return false;
        } else {
          if (cljs.core._EQ_.call(null, cljs.core.first.call(null, xs), cljs.core.first.call(null, ys))) {
            var G__44149 = cljs.core.next.call(null, xs);
            var G__44150 = cljs.core.next.call(null, ys);
            xs = G__44149;
            ys = G__44150;
            continue;
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return false;
            } else {
              return null;
            }
          }
        }
      }
      break;
    }
  }() : null);
};
cljs.core.hash_combine = function hash_combine(seed, hash) {
  return seed ^ hash + 2654435769 + (seed << 6) + (seed >> 2);
};
cljs.core.hash_coll = function hash_coll(coll) {
  if (cljs.core.seq.call(null, coll)) {
    var res = cljs.core.hash.call(null, cljs.core.first.call(null, coll));
    var s = cljs.core.next.call(null, coll);
    while (true) {
      if (s == null) {
        return res;
      } else {
        var G__44151 = cljs.core.hash_combine.call(null, res, cljs.core.hash.call(null, cljs.core.first.call(null, s)));
        var G__44152 = cljs.core.next.call(null, s);
        res = G__44151;
        s = G__44152;
        continue;
      }
      break;
    }
  } else {
    return 0;
  }
};
cljs.core.hash_imap = function hash_imap(m) {
  var h = 0;
  var s = cljs.core.seq.call(null, m);
  while (true) {
    if (s) {
      var e = cljs.core.first.call(null, s);
      var G__44153 = (h + (cljs.core.hash.call(null, cljs.core.key.call(null, e)) ^ cljs.core.hash.call(null, cljs.core.val.call(null, e)))) % 4503599627370496;
      var G__44154 = cljs.core.next.call(null, s);
      h = G__44153;
      s = G__44154;
      continue;
    } else {
      return h;
    }
    break;
  }
};
cljs.core.hash_iset = function hash_iset(s) {
  var h = 0;
  var s__$1 = cljs.core.seq.call(null, s);
  while (true) {
    if (s__$1) {
      var e = cljs.core.first.call(null, s__$1);
      var G__44155 = (h + cljs.core.hash.call(null, e)) % 4503599627370496;
      var G__44156 = cljs.core.next.call(null, s__$1);
      h = G__44155;
      s__$1 = G__44156;
      continue;
    } else {
      return h;
    }
    break;
  }
};
cljs.core.extend_object_BANG_ = function extend_object_BANG_(obj, fn_map) {
  var seq__44163_44169 = cljs.core.seq.call(null, fn_map);
  var chunk__44164_44170 = null;
  var count__44165_44171 = 0;
  var i__44166_44172 = 0;
  while (true) {
    if (i__44166_44172 < count__44165_44171) {
      var vec__44167_44173 = cljs.core._nth.call(null, chunk__44164_44170, i__44166_44172);
      var key_name_44174 = cljs.core.nth.call(null, vec__44167_44173, 0, null);
      var f_44175 = cljs.core.nth.call(null, vec__44167_44173, 1, null);
      var str_name_44176 = cljs.core.name.call(null, key_name_44174);
      obj[str_name_44176] = f_44175;
      var G__44177 = seq__44163_44169;
      var G__44178 = chunk__44164_44170;
      var G__44179 = count__44165_44171;
      var G__44180 = i__44166_44172 + 1;
      seq__44163_44169 = G__44177;
      chunk__44164_44170 = G__44178;
      count__44165_44171 = G__44179;
      i__44166_44172 = G__44180;
      continue;
    } else {
      var temp__4092__auto___44181 = cljs.core.seq.call(null, seq__44163_44169);
      if (temp__4092__auto___44181) {
        var seq__44163_44182__$1 = temp__4092__auto___44181;
        if (cljs.core.chunked_seq_QMARK_.call(null, seq__44163_44182__$1)) {
          var c__4142__auto___44183 = cljs.core.chunk_first.call(null, seq__44163_44182__$1);
          var G__44184 = cljs.core.chunk_rest.call(null, seq__44163_44182__$1);
          var G__44185 = c__4142__auto___44183;
          var G__44186 = cljs.core.count.call(null, c__4142__auto___44183);
          var G__44187 = 0;
          seq__44163_44169 = G__44184;
          chunk__44164_44170 = G__44185;
          count__44165_44171 = G__44186;
          i__44166_44172 = G__44187;
          continue;
        } else {
          var vec__44168_44188 = cljs.core.first.call(null, seq__44163_44182__$1);
          var key_name_44189 = cljs.core.nth.call(null, vec__44168_44188, 0, null);
          var f_44190 = cljs.core.nth.call(null, vec__44168_44188, 1, null);
          var str_name_44191 = cljs.core.name.call(null, key_name_44189);
          obj[str_name_44191] = f_44190;
          var G__44192 = cljs.core.next.call(null, seq__44163_44182__$1);
          var G__44193 = null;
          var G__44194 = 0;
          var G__44195 = 0;
          seq__44163_44169 = G__44192;
          chunk__44164_44170 = G__44193;
          count__44165_44171 = G__44194;
          i__44166_44172 = G__44195;
          continue;
        }
      } else {
      }
    }
    break;
  }
  return obj;
};
cljs.core.List = function(meta, first, rest, count, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.count = count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65937646;
};
cljs.core.List.cljs$lang$type = true;
cljs.core.List.cljs$lang$ctorStr = "cljs.core/List";
cljs.core.List.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/List");
};
cljs.core.List.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.List.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.count === 1) {
    return null;
  } else {
    return self__.rest;
  }
};
cljs.core.List.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.List(self__.meta, o, coll__$1, self__.count + 1, null);
};
cljs.core.List.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.List.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.List.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.List.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.List.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.count;
};
cljs.core.List.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.first;
};
cljs.core.List.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._rest.call(null, coll__$1);
};
cljs.core.List.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.first;
};
cljs.core.List.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.count === 1) {
    return cljs.core.List.EMPTY;
  } else {
    return self__.rest;
  }
};
cljs.core.List.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.List.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.List(meta__$1, self__.first, self__.rest, self__.count, self__.__hash);
};
cljs.core.List.prototype.cljs$core$ICloneable$ = true;
cljs.core.List.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.List(self__.meta, self__.first, self__.rest, self__.count, self__.__hash);
};
cljs.core.List.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.List.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.List.EMPTY;
};
cljs.core.__GT_List = function __GT_List(meta, first, rest, count, __hash) {
  return new cljs.core.List(meta, first, rest, count, __hash);
};
cljs.core.EmptyList = function(meta) {
  this.meta = meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65937614;
};
cljs.core.EmptyList.cljs$lang$type = true;
cljs.core.EmptyList.cljs$lang$ctorStr = "cljs.core/EmptyList";
cljs.core.EmptyList.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/EmptyList");
};
cljs.core.EmptyList.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return 0;
};
cljs.core.EmptyList.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return null;
};
cljs.core.EmptyList.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.List(self__.meta, o, null, 1, null);
};
cljs.core.EmptyList.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.EmptyList.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.EmptyList.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.EmptyList.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return null;
};
cljs.core.EmptyList.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return 0;
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return null;
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  throw new Error("Can't pop empty list");
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return null;
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.List.EMPTY;
};
cljs.core.EmptyList.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.EmptyList(meta__$1);
};
cljs.core.EmptyList.prototype.cljs$core$ICloneable$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.EmptyList(self__.meta);
};
cljs.core.EmptyList.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.__GT_EmptyList = function __GT_EmptyList(meta) {
  return new cljs.core.EmptyList(meta);
};
cljs.core.List.EMPTY = new cljs.core.EmptyList(null);
cljs.core.reversible_QMARK_ = function reversible_QMARK_(coll) {
  var G__44197 = coll;
  if (G__44197) {
    var bit__4044__auto__ = G__44197.cljs$lang$protocol_mask$partition0$ & 134217728;
    if (bit__4044__auto__ || G__44197.cljs$core$IReversible$) {
      return true;
    } else {
      if (!G__44197.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReversible, G__44197);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IReversible, G__44197);
  }
};
cljs.core.rseq = function rseq(coll) {
  return cljs.core._rseq.call(null, coll);
};
cljs.core.reverse = function reverse(coll) {
  if (cljs.core.reversible_QMARK_.call(null, coll)) {
    return cljs.core.rseq.call(null, coll);
  } else {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll);
  }
};
cljs.core.list = function() {
  var list__delegate = function(xs) {
    var arr = xs instanceof cljs.core.IndexedSeq && xs.i === 0 ? xs.arr : function() {
      var arr = [];
      var xs__$1 = xs;
      while (true) {
        if (!(xs__$1 == null)) {
          arr.push(cljs.core._first.call(null, xs__$1));
          var G__44198 = cljs.core._next.call(null, xs__$1);
          xs__$1 = G__44198;
          continue;
        } else {
          return arr;
        }
        break;
      }
    }();
    var i = arr.length;
    var r = cljs.core.List.EMPTY;
    while (true) {
      if (i > 0) {
        var G__44199 = i - 1;
        var G__44200 = cljs.core._conj.call(null, r, arr[i - 1]);
        i = G__44199;
        r = G__44200;
        continue;
      } else {
        return r;
      }
      break;
    }
  };
  var list = function(var_args) {
    var xs = null;
    if (arguments.length > 0) {
      xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return list__delegate.call(this, xs);
  };
  list.cljs$lang$maxFixedArity = 0;
  list.cljs$lang$applyTo = function(arglist__44201) {
    var xs = cljs.core.seq(arglist__44201);
    return list__delegate(xs);
  };
  list.cljs$core$IFn$_invoke$arity$variadic = list__delegate;
  return list;
}();
cljs.core.Cons = function(meta, first, rest, __hash) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 65929452;
};
cljs.core.Cons.cljs$lang$type = true;
cljs.core.Cons.cljs$lang$ctorStr = "cljs.core/Cons";
cljs.core.Cons.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Cons");
};
cljs.core.Cons.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.Cons.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.rest == null) {
    return null;
  } else {
    return cljs.core.seq.call(null, self__.rest);
  }
};
cljs.core.Cons.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.Cons(null, o, coll__$1, self__.__hash);
};
cljs.core.Cons.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.Cons.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.Cons.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.Cons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.Cons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.first;
};
cljs.core.Cons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.rest == null) {
    return cljs.core.List.EMPTY;
  } else {
    return self__.rest;
  }
};
cljs.core.Cons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.Cons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.Cons(meta__$1, self__.first, self__.rest, self__.__hash);
};
cljs.core.Cons.prototype.cljs$core$ICloneable$ = true;
cljs.core.Cons.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Cons(self__.meta, self__.first, self__.rest, self__.__hash);
};
cljs.core.Cons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_Cons = function __GT_Cons(meta, first, rest, __hash) {
  return new cljs.core.Cons(meta, first, rest, __hash);
};
cljs.core.cons = function cons(x, coll) {
  if (function() {
    var or__3400__auto__ = coll == null;
    if (or__3400__auto__) {
      return or__3400__auto__;
    } else {
      var G__44205 = coll;
      if (G__44205) {
        var bit__4037__auto__ = G__44205.cljs$lang$protocol_mask$partition0$ & 64;
        if (bit__4037__auto__ || G__44205.cljs$core$ISeq$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }()) {
    return new cljs.core.Cons(null, x, coll, null);
  } else {
    return new cljs.core.Cons(null, x, cljs.core.seq.call(null, coll), null);
  }
};
cljs.core.list_QMARK_ = function list_QMARK_(x) {
  var G__44207 = x;
  if (G__44207) {
    var bit__4044__auto__ = G__44207.cljs$lang$protocol_mask$partition0$ & 33554432;
    if (bit__4044__auto__ || G__44207.cljs$core$IList$) {
      return true;
    } else {
      if (!G__44207.cljs$lang$protocol_mask$partition0$) {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IList, G__44207);
      } else {
        return false;
      }
    }
  } else {
    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IList, G__44207);
  }
};
cljs.core.Keyword = function(ns, name, fqn, _hash) {
  this.ns = ns;
  this.name = name;
  this.fqn = fqn;
  this._hash = _hash;
  this.cljs$lang$protocol_mask$partition0$ = 2153775105;
  this.cljs$lang$protocol_mask$partition1$ = 4096;
};
cljs.core.Keyword.cljs$lang$type = true;
cljs.core.Keyword.cljs$lang$ctorStr = "cljs.core/Keyword";
cljs.core.Keyword.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Keyword");
};
cljs.core.Keyword.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(o, writer, _) {
  var self__ = this;
  var o__$1 = this;
  return cljs.core._write.call(null, writer, [cljs.core.str(":"), cljs.core.str(self__.fqn)].join(""));
};
cljs.core.Keyword.prototype.cljs$core$INamed$_name$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.name;
};
cljs.core.Keyword.prototype.cljs$core$INamed$_namespace$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.ns;
};
cljs.core.Keyword.prototype.cljs$core$IHash$_hash$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  if (self__._hash == null) {
    self__._hash = cljs.core.hash_combine.call(null, cljs.core.hash.call(null, self__.ns), cljs.core.hash.call(null, self__.name)) + 2654435769;
    return self__._hash;
  } else {
    return self__._hash;
  }
};
cljs.core.Keyword.prototype.call = function() {
  var G__44209 = null;
  var G__44209__2 = function(self__, coll) {
    var self__ = this;
    var self____$1 = this;
    var kw = self____$1;
    return cljs.core.get.call(null, coll, kw);
  };
  var G__44209__3 = function(self__, coll, not_found) {
    var self__ = this;
    var self____$1 = this;
    var kw = self____$1;
    return cljs.core.get.call(null, coll, kw, not_found);
  };
  G__44209 = function(self__, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44209__2.call(this, self__, coll);
      case 3:
        return G__44209__3.call(this, self__, coll, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44209;
}();
cljs.core.Keyword.prototype.apply = function(self__, args44208) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44208)));
};
cljs.core.Keyword.prototype.cljs$core$IFn$_invoke$arity$1 = function(coll) {
  var self__ = this;
  var kw = this;
  return cljs.core.get.call(null, coll, kw);
};
cljs.core.Keyword.prototype.cljs$core$IFn$_invoke$arity$2 = function(coll, not_found) {
  var self__ = this;
  var kw = this;
  return cljs.core.get.call(null, coll, kw, not_found);
};
cljs.core.Keyword.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(_, other) {
  var self__ = this;
  var ___$1 = this;
  if (other instanceof cljs.core.Keyword) {
    return self__.fqn === other.fqn;
  } else {
    return false;
  }
};
cljs.core.Keyword.prototype.cljs$core$ICloneable$ = true;
cljs.core.Keyword.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Keyword(self__.ns, self__.name, self__.fqn, self__._hash);
};
cljs.core.Keyword.prototype.toString = function() {
  var self__ = this;
  var _ = this;
  return[cljs.core.str(":"), cljs.core.str(self__.fqn)].join("");
};
cljs.core.__GT_Keyword = function __GT_Keyword(ns, name, fqn, _hash) {
  return new cljs.core.Keyword(ns, name, fqn, _hash);
};
cljs.core.keyword_QMARK_ = function keyword_QMARK_(x) {
  return x instanceof cljs.core.Keyword;
};
cljs.core.keyword_identical_QMARK_ = function keyword_identical_QMARK_(x, y) {
  if (x === y) {
    return true;
  } else {
    if (x instanceof cljs.core.Keyword && y instanceof cljs.core.Keyword) {
      return x.fqn === y.fqn;
    } else {
      return false;
    }
  }
};
cljs.core.namespace = function namespace(x) {
  if (function() {
    var G__44211 = x;
    if (G__44211) {
      var bit__4037__auto__ = G__44211.cljs$lang$protocol_mask$partition1$ & 4096;
      if (bit__4037__auto__ || G__44211.cljs$core$INamed$) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }()) {
    return cljs.core._namespace.call(null, x);
  } else {
    throw new Error([cljs.core.str("Doesn't support namespace: "), cljs.core.str(x)].join(""));
  }
};
cljs.core.keyword = function() {
  var keyword = null;
  var keyword__1 = function(name) {
    if (name instanceof cljs.core.Keyword) {
      return name;
    } else {
      if (name instanceof cljs.core.Symbol) {
        return new cljs.core.Keyword(cljs.core.namespace.call(null, name), cljs.core.name.call(null, name), name.str, null);
      } else {
        if (typeof name === "string") {
          var parts = name.split("/");
          if (parts.length === 2) {
            return new cljs.core.Keyword(parts[0], parts[1], name, null);
          } else {
            return new cljs.core.Keyword(null, parts[0], name, null);
          }
        } else {
          return null;
        }
      }
    }
  };
  var keyword__2 = function(ns, name) {
    return new cljs.core.Keyword(ns, name, [cljs.core.str(cljs.core.truth_(ns) ? [cljs.core.str(ns), cljs.core.str("/")].join("") : null), cljs.core.str(name)].join(""), null);
  };
  keyword = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return keyword__1.call(this, ns);
      case 2:
        return keyword__2.call(this, ns, name);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  keyword.cljs$core$IFn$_invoke$arity$1 = keyword__1;
  keyword.cljs$core$IFn$_invoke$arity$2 = keyword__2;
  return keyword;
}();
cljs.core.LazySeq = function(meta, fn, s, __hash) {
  this.meta = meta;
  this.fn = fn;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374988;
};
cljs.core.LazySeq.cljs$lang$type = true;
cljs.core.LazySeq.cljs$lang$ctorStr = "cljs.core/LazySeq";
cljs.core.LazySeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/LazySeq");
};
cljs.core.LazySeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.LazySeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  cljs.core._seq.call(null, coll__$1);
  if (self__.s == null) {
    return null;
  } else {
    return cljs.core.next.call(null, self__.s);
  }
};
cljs.core.LazySeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.LazySeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.LazySeq.prototype.sval = function() {
  var self__ = this;
  var coll = this;
  if (self__.fn == null) {
    return self__.s;
  } else {
    self__.s = self__.fn.call(null);
    self__.fn = null;
    return self__.s;
  }
};
cljs.core.LazySeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.LazySeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.LazySeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  coll__$1.sval();
  if (self__.s == null) {
    return null;
  } else {
    var ls = self__.s;
    while (true) {
      if (ls instanceof cljs.core.LazySeq) {
        var G__44212 = ls.sval();
        ls = G__44212;
        continue;
      } else {
        self__.s = ls;
        return cljs.core.seq.call(null, self__.s);
      }
      break;
    }
  }
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  cljs.core._seq.call(null, coll__$1);
  if (self__.s == null) {
    return null;
  } else {
    return cljs.core.first.call(null, self__.s);
  }
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  cljs.core._seq.call(null, coll__$1);
  if (!(self__.s == null)) {
    return cljs.core.rest.call(null, self__.s);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.LazySeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.LazySeq(meta__$1, self__.fn, self__.s, self__.__hash);
};
cljs.core.LazySeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_LazySeq = function __GT_LazySeq(meta, fn, s, __hash) {
  return new cljs.core.LazySeq(meta, fn, s, __hash);
};
cljs.core.ChunkBuffer = function(buf, end) {
  this.buf = buf;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2;
};
cljs.core.ChunkBuffer.cljs$lang$type = true;
cljs.core.ChunkBuffer.cljs$lang$ctorStr = "cljs.core/ChunkBuffer";
cljs.core.ChunkBuffer.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ChunkBuffer");
};
cljs.core.ChunkBuffer.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.end;
};
cljs.core.ChunkBuffer.prototype.add = function(o) {
  var self__ = this;
  var _ = this;
  self__.buf[self__.end] = o;
  return self__.end = self__.end + 1;
};
cljs.core.ChunkBuffer.prototype.chunk = function(o) {
  var self__ = this;
  var _ = this;
  var ret = new cljs.core.ArrayChunk(self__.buf, 0, self__.end);
  self__.buf = null;
  return ret;
};
cljs.core.__GT_ChunkBuffer = function __GT_ChunkBuffer(buf, end) {
  return new cljs.core.ChunkBuffer(buf, end);
};
cljs.core.chunk_buffer = function chunk_buffer(capacity) {
  return new cljs.core.ChunkBuffer(new Array(capacity), 0);
};
cljs.core.ArrayChunk = function(arr, off, end) {
  this.arr = arr;
  this.off = off;
  this.end = end;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 524306;
};
cljs.core.ArrayChunk.cljs$lang$type = true;
cljs.core.ArrayChunk.cljs$lang$ctorStr = "cljs.core/ArrayChunk";
cljs.core.ArrayChunk.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ArrayChunk");
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_reduce.call(null, self__.arr, f, self__.arr[self__.off], self__.off + 1);
};
cljs.core.ArrayChunk.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_reduce.call(null, self__.arr, f, start, self__.off);
};
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$ = true;
cljs.core.ArrayChunk.prototype.cljs$core$IChunk$_drop_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.off === self__.end) {
    throw new Error("-drop-first of empty chunk");
  } else {
    return new cljs.core.ArrayChunk(self__.arr, self__.off + 1, self__.end);
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, i) {
  var self__ = this;
  var coll__$1 = this;
  return self__.arr[self__.off + i];
};
cljs.core.ArrayChunk.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, i, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (i >= 0 && i < self__.end - self__.off) {
    return self__.arr[self__.off + i];
  } else {
    return not_found;
  }
};
cljs.core.ArrayChunk.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.end - self__.off;
};
cljs.core.__GT_ArrayChunk = function __GT_ArrayChunk(arr, off, end) {
  return new cljs.core.ArrayChunk(arr, off, end);
};
cljs.core.array_chunk = function() {
  var array_chunk = null;
  var array_chunk__1 = function(arr) {
    return new cljs.core.ArrayChunk(arr, 0, arr.length);
  };
  var array_chunk__2 = function(arr, off) {
    return new cljs.core.ArrayChunk(arr, off, arr.length);
  };
  var array_chunk__3 = function(arr, off, end) {
    return new cljs.core.ArrayChunk(arr, off, end);
  };
  array_chunk = function(arr, off, end) {
    switch(arguments.length) {
      case 1:
        return array_chunk__1.call(this, arr);
      case 2:
        return array_chunk__2.call(this, arr, off);
      case 3:
        return array_chunk__3.call(this, arr, off, end);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  array_chunk.cljs$core$IFn$_invoke$arity$1 = array_chunk__1;
  array_chunk.cljs$core$IFn$_invoke$arity$2 = array_chunk__2;
  array_chunk.cljs$core$IFn$_invoke$arity$3 = array_chunk__3;
  return array_chunk;
}();
cljs.core.ChunkedCons = function(chunk, more, meta, __hash) {
  this.chunk = chunk;
  this.more = more;
  this.meta = meta;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition0$ = 31850732;
  this.cljs$lang$protocol_mask$partition1$ = 1536;
};
cljs.core.ChunkedCons.cljs$lang$type = true;
cljs.core.ChunkedCons.cljs$lang$ctorStr = "cljs.core/ChunkedCons";
cljs.core.ChunkedCons.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ChunkedCons");
};
cljs.core.ChunkedCons.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core._count.call(null, self__.chunk) > 1) {
    return new cljs.core.ChunkedCons(cljs.core._drop_first.call(null, self__.chunk), self__.more, self__.meta, null);
  } else {
    var more__$1 = cljs.core._seq.call(null, self__.more);
    if (more__$1 == null) {
      return null;
    } else {
      return more__$1;
    }
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$ICollection$_conj$arity$2 = function(this$, o) {
  var self__ = this;
  var this$__$1 = this;
  return cljs.core.cons.call(null, o, this$__$1);
};
cljs.core.ChunkedCons.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, self__.chunk, 0);
};
cljs.core.ChunkedCons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core._count.call(null, self__.chunk) > 1) {
    return new cljs.core.ChunkedCons(cljs.core._drop_first.call(null, self__.chunk), self__.more, self__.meta, null);
  } else {
    if (self__.more == null) {
      return cljs.core.List.EMPTY;
    } else {
      return self__.more;
    }
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.more == null) {
    return null;
  } else {
    return self__.more;
  }
};
cljs.core.ChunkedCons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.ChunkedCons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.ChunkedCons(self__.chunk, self__.more, m, self__.__hash);
};
cljs.core.ChunkedCons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.ChunkedCons.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.chunk;
};
cljs.core.ChunkedCons.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.more == null) {
    return cljs.core.List.EMPTY;
  } else {
    return self__.more;
  }
};
cljs.core.__GT_ChunkedCons = function __GT_ChunkedCons(chunk, more, meta, __hash) {
  return new cljs.core.ChunkedCons(chunk, more, meta, __hash);
};
cljs.core.chunk_cons = function chunk_cons(chunk, rest) {
  if (cljs.core._count.call(null, chunk) === 0) {
    return rest;
  } else {
    return new cljs.core.ChunkedCons(chunk, rest, null, null);
  }
};
cljs.core.chunk_append = function chunk_append(b, x) {
  return b.add(x);
};
cljs.core.chunk = function chunk(b) {
  return b.chunk();
};
cljs.core.chunk_first = function chunk_first(s) {
  return cljs.core._chunked_first.call(null, s);
};
cljs.core.chunk_rest = function chunk_rest(s) {
  return cljs.core._chunked_rest.call(null, s);
};
cljs.core.chunk_next = function chunk_next(s) {
  if (function() {
    var G__44214 = s;
    if (G__44214) {
      var bit__4037__auto__ = G__44214.cljs$lang$protocol_mask$partition1$ & 1024;
      if (bit__4037__auto__ || G__44214.cljs$core$IChunkedNext$) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }()) {
    return cljs.core._chunked_next.call(null, s);
  } else {
    return cljs.core.seq.call(null, cljs.core._chunked_rest.call(null, s));
  }
};
cljs.core.to_array = function to_array(s) {
  var ary = [];
  var s__$1 = s;
  while (true) {
    if (cljs.core.seq.call(null, s__$1)) {
      ary.push(cljs.core.first.call(null, s__$1));
      var G__44215 = cljs.core.next.call(null, s__$1);
      s__$1 = G__44215;
      continue;
    } else {
      return ary;
    }
    break;
  }
};
cljs.core.to_array_2d = function to_array_2d(coll) {
  var ret = new Array(cljs.core.count.call(null, coll));
  var i_44216 = 0;
  var xs_44217 = cljs.core.seq.call(null, coll);
  while (true) {
    if (xs_44217) {
      ret[i_44216] = cljs.core.to_array.call(null, cljs.core.first.call(null, xs_44217));
      var G__44218 = i_44216 + 1;
      var G__44219 = cljs.core.next.call(null, xs_44217);
      i_44216 = G__44218;
      xs_44217 = G__44219;
      continue;
    } else {
    }
    break;
  }
  return ret;
};
cljs.core.int_array = function() {
  var int_array = null;
  var int_array__1 = function(size_or_seq) {
    if (typeof size_or_seq === "number") {
      return int_array.call(null, size_or_seq, null);
    } else {
      return cljs.core.into_array.call(null, size_or_seq);
    }
  };
  var int_array__2 = function(size, init_val_or_seq) {
    var a = new Array(size);
    if (cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s = cljs.core.seq.call(null, init_val_or_seq);
      var i = 0;
      var s__$1 = s;
      while (true) {
        if (s__$1 && i < size) {
          a[i] = cljs.core.first.call(null, s__$1);
          var G__44220 = i + 1;
          var G__44221 = cljs.core.next.call(null, s__$1);
          i = G__44220;
          s__$1 = G__44221;
          continue;
        } else {
          return a;
        }
        break;
      }
    } else {
      var n__4242__auto___44222 = size;
      var i_44223 = 0;
      while (true) {
        if (i_44223 < n__4242__auto___44222) {
          a[i_44223] = init_val_or_seq;
          var G__44224 = i_44223 + 1;
          i_44223 = G__44224;
          continue;
        } else {
        }
        break;
      }
      return a;
    }
  };
  int_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return int_array__1.call(this, size);
      case 2:
        return int_array__2.call(this, size, init_val_or_seq);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  int_array.cljs$core$IFn$_invoke$arity$1 = int_array__1;
  int_array.cljs$core$IFn$_invoke$arity$2 = int_array__2;
  return int_array;
}();
cljs.core.long_array = function() {
  var long_array = null;
  var long_array__1 = function(size_or_seq) {
    if (typeof size_or_seq === "number") {
      return long_array.call(null, size_or_seq, null);
    } else {
      return cljs.core.into_array.call(null, size_or_seq);
    }
  };
  var long_array__2 = function(size, init_val_or_seq) {
    var a = new Array(size);
    if (cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s = cljs.core.seq.call(null, init_val_or_seq);
      var i = 0;
      var s__$1 = s;
      while (true) {
        if (s__$1 && i < size) {
          a[i] = cljs.core.first.call(null, s__$1);
          var G__44225 = i + 1;
          var G__44226 = cljs.core.next.call(null, s__$1);
          i = G__44225;
          s__$1 = G__44226;
          continue;
        } else {
          return a;
        }
        break;
      }
    } else {
      var n__4242__auto___44227 = size;
      var i_44228 = 0;
      while (true) {
        if (i_44228 < n__4242__auto___44227) {
          a[i_44228] = init_val_or_seq;
          var G__44229 = i_44228 + 1;
          i_44228 = G__44229;
          continue;
        } else {
        }
        break;
      }
      return a;
    }
  };
  long_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return long_array__1.call(this, size);
      case 2:
        return long_array__2.call(this, size, init_val_or_seq);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  long_array.cljs$core$IFn$_invoke$arity$1 = long_array__1;
  long_array.cljs$core$IFn$_invoke$arity$2 = long_array__2;
  return long_array;
}();
cljs.core.double_array = function() {
  var double_array = null;
  var double_array__1 = function(size_or_seq) {
    if (typeof size_or_seq === "number") {
      return double_array.call(null, size_or_seq, null);
    } else {
      return cljs.core.into_array.call(null, size_or_seq);
    }
  };
  var double_array__2 = function(size, init_val_or_seq) {
    var a = new Array(size);
    if (cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s = cljs.core.seq.call(null, init_val_or_seq);
      var i = 0;
      var s__$1 = s;
      while (true) {
        if (s__$1 && i < size) {
          a[i] = cljs.core.first.call(null, s__$1);
          var G__44230 = i + 1;
          var G__44231 = cljs.core.next.call(null, s__$1);
          i = G__44230;
          s__$1 = G__44231;
          continue;
        } else {
          return a;
        }
        break;
      }
    } else {
      var n__4242__auto___44232 = size;
      var i_44233 = 0;
      while (true) {
        if (i_44233 < n__4242__auto___44232) {
          a[i_44233] = init_val_or_seq;
          var G__44234 = i_44233 + 1;
          i_44233 = G__44234;
          continue;
        } else {
        }
        break;
      }
      return a;
    }
  };
  double_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return double_array__1.call(this, size);
      case 2:
        return double_array__2.call(this, size, init_val_or_seq);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  double_array.cljs$core$IFn$_invoke$arity$1 = double_array__1;
  double_array.cljs$core$IFn$_invoke$arity$2 = double_array__2;
  return double_array;
}();
cljs.core.object_array = function() {
  var object_array = null;
  var object_array__1 = function(size_or_seq) {
    if (typeof size_or_seq === "number") {
      return object_array.call(null, size_or_seq, null);
    } else {
      return cljs.core.into_array.call(null, size_or_seq);
    }
  };
  var object_array__2 = function(size, init_val_or_seq) {
    var a = new Array(size);
    if (cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s = cljs.core.seq.call(null, init_val_or_seq);
      var i = 0;
      var s__$1 = s;
      while (true) {
        if (s__$1 && i < size) {
          a[i] = cljs.core.first.call(null, s__$1);
          var G__44235 = i + 1;
          var G__44236 = cljs.core.next.call(null, s__$1);
          i = G__44235;
          s__$1 = G__44236;
          continue;
        } else {
          return a;
        }
        break;
      }
    } else {
      var n__4242__auto___44237 = size;
      var i_44238 = 0;
      while (true) {
        if (i_44238 < n__4242__auto___44237) {
          a[i_44238] = init_val_or_seq;
          var G__44239 = i_44238 + 1;
          i_44238 = G__44239;
          continue;
        } else {
        }
        break;
      }
      return a;
    }
  };
  object_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return object_array__1.call(this, size);
      case 2:
        return object_array__2.call(this, size, init_val_or_seq);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  object_array.cljs$core$IFn$_invoke$arity$1 = object_array__1;
  object_array.cljs$core$IFn$_invoke$arity$2 = object_array__2;
  return object_array;
}();
cljs.core.bounded_count = function bounded_count(s, n) {
  if (cljs.core.counted_QMARK_.call(null, s)) {
    return cljs.core.count.call(null, s);
  } else {
    var s__$1 = s;
    var i = n;
    var sum = 0;
    while (true) {
      if (i > 0 && cljs.core.seq.call(null, s__$1)) {
        var G__44240 = cljs.core.next.call(null, s__$1);
        var G__44241 = i - 1;
        var G__44242 = sum + 1;
        s__$1 = G__44240;
        i = G__44241;
        sum = G__44242;
        continue;
      } else {
        return sum;
      }
      break;
    }
  }
};
cljs.core.spread = function spread(arglist) {
  if (arglist == null) {
    return null;
  } else {
    if (cljs.core.next.call(null, arglist) == null) {
      return cljs.core.seq.call(null, cljs.core.first.call(null, arglist));
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, arglist), spread.call(null, cljs.core.next.call(null, arglist)));
      } else {
        return null;
      }
    }
  }
};
cljs.core.concat = function() {
  var concat = null;
  var concat__0 = function() {
    return new cljs.core.LazySeq(null, function() {
      return null;
    }, null, null);
  };
  var concat__1 = function(x) {
    return new cljs.core.LazySeq(null, function() {
      return x;
    }, null, null);
  };
  var concat__2 = function(x, y) {
    return new cljs.core.LazySeq(null, function() {
      var s = cljs.core.seq.call(null, x);
      if (s) {
        if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
          return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, s), concat.call(null, cljs.core.chunk_rest.call(null, s), y));
        } else {
          return cljs.core.cons.call(null, cljs.core.first.call(null, s), concat.call(null, cljs.core.rest.call(null, s), y));
        }
      } else {
        return y;
      }
    }, null, null);
  };
  var concat__3 = function() {
    var G__44243__delegate = function(x, y, zs) {
      var cat = function cat(xys, zs__$1) {
        return new cljs.core.LazySeq(null, function() {
          var xys__$1 = cljs.core.seq.call(null, xys);
          if (xys__$1) {
            if (cljs.core.chunked_seq_QMARK_.call(null, xys__$1)) {
              return cljs.core.chunk_cons.call(null, cljs.core.chunk_first.call(null, xys__$1), cat.call(null, cljs.core.chunk_rest.call(null, xys__$1), zs__$1));
            } else {
              return cljs.core.cons.call(null, cljs.core.first.call(null, xys__$1), cat.call(null, cljs.core.rest.call(null, xys__$1), zs__$1));
            }
          } else {
            if (cljs.core.truth_(zs__$1)) {
              return cat.call(null, cljs.core.first.call(null, zs__$1), cljs.core.next.call(null, zs__$1));
            } else {
              return null;
            }
          }
        }, null, null);
      };
      return cat.call(null, concat.call(null, x, y), zs);
    };
    var G__44243 = function(x, y, var_args) {
      var zs = null;
      if (arguments.length > 2) {
        zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44243__delegate.call(this, x, y, zs);
    };
    G__44243.cljs$lang$maxFixedArity = 2;
    G__44243.cljs$lang$applyTo = function(arglist__44244) {
      var x = cljs.core.first(arglist__44244);
      arglist__44244 = cljs.core.next(arglist__44244);
      var y = cljs.core.first(arglist__44244);
      var zs = cljs.core.rest(arglist__44244);
      return G__44243__delegate(x, y, zs);
    };
    G__44243.cljs$core$IFn$_invoke$arity$variadic = G__44243__delegate;
    return G__44243;
  }();
  concat = function(x, y, var_args) {
    var zs = var_args;
    switch(arguments.length) {
      case 0:
        return concat__0.call(this);
      case 1:
        return concat__1.call(this, x);
      case 2:
        return concat__2.call(this, x, y);
      default:
        return concat__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  concat.cljs$lang$maxFixedArity = 2;
  concat.cljs$lang$applyTo = concat__3.cljs$lang$applyTo;
  concat.cljs$core$IFn$_invoke$arity$0 = concat__0;
  concat.cljs$core$IFn$_invoke$arity$1 = concat__1;
  concat.cljs$core$IFn$_invoke$arity$2 = concat__2;
  concat.cljs$core$IFn$_invoke$arity$variadic = concat__3.cljs$core$IFn$_invoke$arity$variadic;
  return concat;
}();
cljs.core.list_STAR_ = function() {
  var list_STAR_ = null;
  var list_STAR___1 = function(args) {
    return cljs.core.seq.call(null, args);
  };
  var list_STAR___2 = function(a, args) {
    return cljs.core.cons.call(null, a, args);
  };
  var list_STAR___3 = function(a, b, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, args));
  };
  var list_STAR___4 = function(a, b, c, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, args)));
  };
  var list_STAR___5 = function() {
    var G__44245__delegate = function(a, b, c, d, more) {
      return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, more)))));
    };
    var G__44245 = function(a, b, c, d, var_args) {
      var more = null;
      if (arguments.length > 4) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0);
      }
      return G__44245__delegate.call(this, a, b, c, d, more);
    };
    G__44245.cljs$lang$maxFixedArity = 4;
    G__44245.cljs$lang$applyTo = function(arglist__44246) {
      var a = cljs.core.first(arglist__44246);
      arglist__44246 = cljs.core.next(arglist__44246);
      var b = cljs.core.first(arglist__44246);
      arglist__44246 = cljs.core.next(arglist__44246);
      var c = cljs.core.first(arglist__44246);
      arglist__44246 = cljs.core.next(arglist__44246);
      var d = cljs.core.first(arglist__44246);
      var more = cljs.core.rest(arglist__44246);
      return G__44245__delegate(a, b, c, d, more);
    };
    G__44245.cljs$core$IFn$_invoke$arity$variadic = G__44245__delegate;
    return G__44245;
  }();
  list_STAR_ = function(a, b, c, d, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return list_STAR___1.call(this, a);
      case 2:
        return list_STAR___2.call(this, a, b);
      case 3:
        return list_STAR___3.call(this, a, b, c);
      case 4:
        return list_STAR___4.call(this, a, b, c, d);
      default:
        return list_STAR___5.cljs$core$IFn$_invoke$arity$variadic(a, b, c, d, cljs.core.array_seq(arguments, 4));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  list_STAR_.cljs$lang$maxFixedArity = 4;
  list_STAR_.cljs$lang$applyTo = list_STAR___5.cljs$lang$applyTo;
  list_STAR_.cljs$core$IFn$_invoke$arity$1 = list_STAR___1;
  list_STAR_.cljs$core$IFn$_invoke$arity$2 = list_STAR___2;
  list_STAR_.cljs$core$IFn$_invoke$arity$3 = list_STAR___3;
  list_STAR_.cljs$core$IFn$_invoke$arity$4 = list_STAR___4;
  list_STAR_.cljs$core$IFn$_invoke$arity$variadic = list_STAR___5.cljs$core$IFn$_invoke$arity$variadic;
  return list_STAR_;
}();
cljs.core.transient$ = function transient$(coll) {
  return cljs.core._as_transient.call(null, coll);
};
cljs.core.persistent_BANG_ = function persistent_BANG_(tcoll) {
  return cljs.core._persistent_BANG_.call(null, tcoll);
};
cljs.core.conj_BANG_ = function conj_BANG_(tcoll, val) {
  return cljs.core._conj_BANG_.call(null, tcoll, val);
};
cljs.core.assoc_BANG_ = function assoc_BANG_(tcoll, key, val) {
  return cljs.core._assoc_BANG_.call(null, tcoll, key, val);
};
cljs.core.dissoc_BANG_ = function dissoc_BANG_(tcoll, key) {
  return cljs.core._dissoc_BANG_.call(null, tcoll, key);
};
cljs.core.pop_BANG_ = function pop_BANG_(tcoll) {
  return cljs.core._pop_BANG_.call(null, tcoll);
};
cljs.core.disj_BANG_ = function disj_BANG_(tcoll, val) {
  return cljs.core._disjoin_BANG_.call(null, tcoll, val);
};
cljs.core.apply_to = function apply_to(f, argc, args) {
  var args__$1 = cljs.core.seq.call(null, args);
  if (argc === 0) {
    return f.call(null);
  } else {
    var a = cljs.core._first.call(null, args__$1);
    var args__$2 = cljs.core._rest.call(null, args__$1);
    if (argc === 1) {
      if (f.cljs$core$IFn$_invoke$arity$1) {
        return f.cljs$core$IFn$_invoke$arity$1(a);
      } else {
        return f.call(null, a);
      }
    } else {
      var b = cljs.core._first.call(null, args__$2);
      var args__$3 = cljs.core._rest.call(null, args__$2);
      if (argc === 2) {
        if (f.cljs$core$IFn$_invoke$arity$2) {
          return f.cljs$core$IFn$_invoke$arity$2(a, b);
        } else {
          return f.call(null, a, b);
        }
      } else {
        var c = cljs.core._first.call(null, args__$3);
        var args__$4 = cljs.core._rest.call(null, args__$3);
        if (argc === 3) {
          if (f.cljs$core$IFn$_invoke$arity$3) {
            return f.cljs$core$IFn$_invoke$arity$3(a, b, c);
          } else {
            return f.call(null, a, b, c);
          }
        } else {
          var d = cljs.core._first.call(null, args__$4);
          var args__$5 = cljs.core._rest.call(null, args__$4);
          if (argc === 4) {
            if (f.cljs$core$IFn$_invoke$arity$4) {
              return f.cljs$core$IFn$_invoke$arity$4(a, b, c, d);
            } else {
              return f.call(null, a, b, c, d);
            }
          } else {
            var e = cljs.core._first.call(null, args__$5);
            var args__$6 = cljs.core._rest.call(null, args__$5);
            if (argc === 5) {
              if (f.cljs$core$IFn$_invoke$arity$5) {
                return f.cljs$core$IFn$_invoke$arity$5(a, b, c, d, e);
              } else {
                return f.call(null, a, b, c, d, e);
              }
            } else {
              var f__$1 = cljs.core._first.call(null, args__$6);
              var args__$7 = cljs.core._rest.call(null, args__$6);
              if (argc === 6) {
                if (f__$1.cljs$core$IFn$_invoke$arity$6) {
                  return f__$1.cljs$core$IFn$_invoke$arity$6(a, b, c, d, e, f__$1);
                } else {
                  return f__$1.call(null, a, b, c, d, e, f__$1);
                }
              } else {
                var g = cljs.core._first.call(null, args__$7);
                var args__$8 = cljs.core._rest.call(null, args__$7);
                if (argc === 7) {
                  if (f__$1.cljs$core$IFn$_invoke$arity$7) {
                    return f__$1.cljs$core$IFn$_invoke$arity$7(a, b, c, d, e, f__$1, g);
                  } else {
                    return f__$1.call(null, a, b, c, d, e, f__$1, g);
                  }
                } else {
                  var h = cljs.core._first.call(null, args__$8);
                  var args__$9 = cljs.core._rest.call(null, args__$8);
                  if (argc === 8) {
                    if (f__$1.cljs$core$IFn$_invoke$arity$8) {
                      return f__$1.cljs$core$IFn$_invoke$arity$8(a, b, c, d, e, f__$1, g, h);
                    } else {
                      return f__$1.call(null, a, b, c, d, e, f__$1, g, h);
                    }
                  } else {
                    var i = cljs.core._first.call(null, args__$9);
                    var args__$10 = cljs.core._rest.call(null, args__$9);
                    if (argc === 9) {
                      if (f__$1.cljs$core$IFn$_invoke$arity$9) {
                        return f__$1.cljs$core$IFn$_invoke$arity$9(a, b, c, d, e, f__$1, g, h, i);
                      } else {
                        return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i);
                      }
                    } else {
                      var j = cljs.core._first.call(null, args__$10);
                      var args__$11 = cljs.core._rest.call(null, args__$10);
                      if (argc === 10) {
                        if (f__$1.cljs$core$IFn$_invoke$arity$10) {
                          return f__$1.cljs$core$IFn$_invoke$arity$10(a, b, c, d, e, f__$1, g, h, i, j);
                        } else {
                          return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j);
                        }
                      } else {
                        var k = cljs.core._first.call(null, args__$11);
                        var args__$12 = cljs.core._rest.call(null, args__$11);
                        if (argc === 11) {
                          if (f__$1.cljs$core$IFn$_invoke$arity$11) {
                            return f__$1.cljs$core$IFn$_invoke$arity$11(a, b, c, d, e, f__$1, g, h, i, j, k);
                          } else {
                            return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k);
                          }
                        } else {
                          var l = cljs.core._first.call(null, args__$12);
                          var args__$13 = cljs.core._rest.call(null, args__$12);
                          if (argc === 12) {
                            if (f__$1.cljs$core$IFn$_invoke$arity$12) {
                              return f__$1.cljs$core$IFn$_invoke$arity$12(a, b, c, d, e, f__$1, g, h, i, j, k, l);
                            } else {
                              return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l);
                            }
                          } else {
                            var m = cljs.core._first.call(null, args__$13);
                            var args__$14 = cljs.core._rest.call(null, args__$13);
                            if (argc === 13) {
                              if (f__$1.cljs$core$IFn$_invoke$arity$13) {
                                return f__$1.cljs$core$IFn$_invoke$arity$13(a, b, c, d, e, f__$1, g, h, i, j, k, l, m);
                              } else {
                                return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m);
                              }
                            } else {
                              var n = cljs.core._first.call(null, args__$14);
                              var args__$15 = cljs.core._rest.call(null, args__$14);
                              if (argc === 14) {
                                if (f__$1.cljs$core$IFn$_invoke$arity$14) {
                                  return f__$1.cljs$core$IFn$_invoke$arity$14(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n);
                                } else {
                                  return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n);
                                }
                              } else {
                                var o = cljs.core._first.call(null, args__$15);
                                var args__$16 = cljs.core._rest.call(null, args__$15);
                                if (argc === 15) {
                                  if (f__$1.cljs$core$IFn$_invoke$arity$15) {
                                    return f__$1.cljs$core$IFn$_invoke$arity$15(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o);
                                  } else {
                                    return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o);
                                  }
                                } else {
                                  var p = cljs.core._first.call(null, args__$16);
                                  var args__$17 = cljs.core._rest.call(null, args__$16);
                                  if (argc === 16) {
                                    if (f__$1.cljs$core$IFn$_invoke$arity$16) {
                                      return f__$1.cljs$core$IFn$_invoke$arity$16(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p);
                                    } else {
                                      return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p);
                                    }
                                  } else {
                                    var q = cljs.core._first.call(null, args__$17);
                                    var args__$18 = cljs.core._rest.call(null, args__$17);
                                    if (argc === 17) {
                                      if (f__$1.cljs$core$IFn$_invoke$arity$17) {
                                        return f__$1.cljs$core$IFn$_invoke$arity$17(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q);
                                      } else {
                                        return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q);
                                      }
                                    } else {
                                      var r = cljs.core._first.call(null, args__$18);
                                      var args__$19 = cljs.core._rest.call(null, args__$18);
                                      if (argc === 18) {
                                        if (f__$1.cljs$core$IFn$_invoke$arity$18) {
                                          return f__$1.cljs$core$IFn$_invoke$arity$18(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r);
                                        } else {
                                          return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r);
                                        }
                                      } else {
                                        var s = cljs.core._first.call(null, args__$19);
                                        var args__$20 = cljs.core._rest.call(null, args__$19);
                                        if (argc === 19) {
                                          if (f__$1.cljs$core$IFn$_invoke$arity$19) {
                                            return f__$1.cljs$core$IFn$_invoke$arity$19(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r, s);
                                          } else {
                                            return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r, s);
                                          }
                                        } else {
                                          var t = cljs.core._first.call(null, args__$20);
                                          var args__$21 = cljs.core._rest.call(null, args__$20);
                                          if (argc === 20) {
                                            if (f__$1.cljs$core$IFn$_invoke$arity$20) {
                                              return f__$1.cljs$core$IFn$_invoke$arity$20(a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r, s, t);
                                            } else {
                                              return f__$1.call(null, a, b, c, d, e, f__$1, g, h, i, j, k, l, m, n, o, p, q, r, s, t);
                                            }
                                          } else {
                                            throw new Error("Only up to 20 arguments supported on functions");
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
cljs.core.apply = function() {
  var apply = null;
  var apply__2 = function(f, args) {
    var fixed_arity = f.cljs$lang$maxFixedArity;
    if (f.cljs$lang$applyTo) {
      var bc = cljs.core.bounded_count.call(null, args, fixed_arity + 1);
      if (bc <= fixed_arity) {
        return cljs.core.apply_to.call(null, f, bc, args);
      } else {
        return f.cljs$lang$applyTo(args);
      }
    } else {
      return f.apply(f, cljs.core.to_array.call(null, args));
    }
  };
  var apply__3 = function(f, x, args) {
    var arglist = cljs.core.list_STAR_.call(null, x, args);
    var fixed_arity = f.cljs$lang$maxFixedArity;
    if (f.cljs$lang$applyTo) {
      var bc = cljs.core.bounded_count.call(null, arglist, fixed_arity + 1);
      if (bc <= fixed_arity) {
        return cljs.core.apply_to.call(null, f, bc, arglist);
      } else {
        return f.cljs$lang$applyTo(arglist);
      }
    } else {
      return f.apply(f, cljs.core.to_array.call(null, arglist));
    }
  };
  var apply__4 = function(f, x, y, args) {
    var arglist = cljs.core.list_STAR_.call(null, x, y, args);
    var fixed_arity = f.cljs$lang$maxFixedArity;
    if (f.cljs$lang$applyTo) {
      var bc = cljs.core.bounded_count.call(null, arglist, fixed_arity + 1);
      if (bc <= fixed_arity) {
        return cljs.core.apply_to.call(null, f, bc, arglist);
      } else {
        return f.cljs$lang$applyTo(arglist);
      }
    } else {
      return f.apply(f, cljs.core.to_array.call(null, arglist));
    }
  };
  var apply__5 = function(f, x, y, z, args) {
    var arglist = cljs.core.list_STAR_.call(null, x, y, z, args);
    var fixed_arity = f.cljs$lang$maxFixedArity;
    if (f.cljs$lang$applyTo) {
      var bc = cljs.core.bounded_count.call(null, arglist, fixed_arity + 1);
      if (bc <= fixed_arity) {
        return cljs.core.apply_to.call(null, f, bc, arglist);
      } else {
        return f.cljs$lang$applyTo(arglist);
      }
    } else {
      return f.apply(f, cljs.core.to_array.call(null, arglist));
    }
  };
  var apply__6 = function() {
    var G__44247__delegate = function(f, a, b, c, d, args) {
      var arglist = cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, args)))));
      var fixed_arity = f.cljs$lang$maxFixedArity;
      if (f.cljs$lang$applyTo) {
        var bc = cljs.core.bounded_count.call(null, arglist, fixed_arity + 1);
        if (bc <= fixed_arity) {
          return cljs.core.apply_to.call(null, f, bc, arglist);
        } else {
          return f.cljs$lang$applyTo(arglist);
        }
      } else {
        return f.apply(f, cljs.core.to_array.call(null, arglist));
      }
    };
    var G__44247 = function(f, a, b, c, d, var_args) {
      var args = null;
      if (arguments.length > 5) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0);
      }
      return G__44247__delegate.call(this, f, a, b, c, d, args);
    };
    G__44247.cljs$lang$maxFixedArity = 5;
    G__44247.cljs$lang$applyTo = function(arglist__44248) {
      var f = cljs.core.first(arglist__44248);
      arglist__44248 = cljs.core.next(arglist__44248);
      var a = cljs.core.first(arglist__44248);
      arglist__44248 = cljs.core.next(arglist__44248);
      var b = cljs.core.first(arglist__44248);
      arglist__44248 = cljs.core.next(arglist__44248);
      var c = cljs.core.first(arglist__44248);
      arglist__44248 = cljs.core.next(arglist__44248);
      var d = cljs.core.first(arglist__44248);
      var args = cljs.core.rest(arglist__44248);
      return G__44247__delegate(f, a, b, c, d, args);
    };
    G__44247.cljs$core$IFn$_invoke$arity$variadic = G__44247__delegate;
    return G__44247;
  }();
  apply = function(f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return apply__2.call(this, f, a);
      case 3:
        return apply__3.call(this, f, a, b);
      case 4:
        return apply__4.call(this, f, a, b, c);
      case 5:
        return apply__5.call(this, f, a, b, c, d);
      default:
        return apply__6.cljs$core$IFn$_invoke$arity$variadic(f, a, b, c, d, cljs.core.array_seq(arguments, 5));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  apply.cljs$lang$maxFixedArity = 5;
  apply.cljs$lang$applyTo = apply__6.cljs$lang$applyTo;
  apply.cljs$core$IFn$_invoke$arity$2 = apply__2;
  apply.cljs$core$IFn$_invoke$arity$3 = apply__3;
  apply.cljs$core$IFn$_invoke$arity$4 = apply__4;
  apply.cljs$core$IFn$_invoke$arity$5 = apply__5;
  apply.cljs$core$IFn$_invoke$arity$variadic = apply__6.cljs$core$IFn$_invoke$arity$variadic;
  return apply;
}();
cljs.core.vary_meta = function() {
  var vary_meta = null;
  var vary_meta__2 = function(obj, f) {
    return cljs.core.with_meta.call(null, obj, f.call(null, cljs.core.meta.call(null, obj)));
  };
  var vary_meta__3 = function(obj, f, a) {
    return cljs.core.with_meta.call(null, obj, f.call(null, cljs.core.meta.call(null, obj), a));
  };
  var vary_meta__4 = function(obj, f, a, b) {
    return cljs.core.with_meta.call(null, obj, f.call(null, cljs.core.meta.call(null, obj), a, b));
  };
  var vary_meta__5 = function(obj, f, a, b, c) {
    return cljs.core.with_meta.call(null, obj, f.call(null, cljs.core.meta.call(null, obj), a, b, c));
  };
  var vary_meta__6 = function(obj, f, a, b, c, d) {
    return cljs.core.with_meta.call(null, obj, f.call(null, cljs.core.meta.call(null, obj), a, b, c, d));
  };
  var vary_meta__7 = function() {
    var G__44249__delegate = function(obj, f, a, b, c, d, args) {
      return cljs.core.with_meta.call(null, obj, cljs.core.apply.call(null, f, cljs.core.meta.call(null, obj), a, b, c, d, args));
    };
    var G__44249 = function(obj, f, a, b, c, d, var_args) {
      var args = null;
      if (arguments.length > 6) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 6), 0);
      }
      return G__44249__delegate.call(this, obj, f, a, b, c, d, args);
    };
    G__44249.cljs$lang$maxFixedArity = 6;
    G__44249.cljs$lang$applyTo = function(arglist__44250) {
      var obj = cljs.core.first(arglist__44250);
      arglist__44250 = cljs.core.next(arglist__44250);
      var f = cljs.core.first(arglist__44250);
      arglist__44250 = cljs.core.next(arglist__44250);
      var a = cljs.core.first(arglist__44250);
      arglist__44250 = cljs.core.next(arglist__44250);
      var b = cljs.core.first(arglist__44250);
      arglist__44250 = cljs.core.next(arglist__44250);
      var c = cljs.core.first(arglist__44250);
      arglist__44250 = cljs.core.next(arglist__44250);
      var d = cljs.core.first(arglist__44250);
      var args = cljs.core.rest(arglist__44250);
      return G__44249__delegate(obj, f, a, b, c, d, args);
    };
    G__44249.cljs$core$IFn$_invoke$arity$variadic = G__44249__delegate;
    return G__44249;
  }();
  vary_meta = function(obj, f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return vary_meta__2.call(this, obj, f);
      case 3:
        return vary_meta__3.call(this, obj, f, a);
      case 4:
        return vary_meta__4.call(this, obj, f, a, b);
      case 5:
        return vary_meta__5.call(this, obj, f, a, b, c);
      case 6:
        return vary_meta__6.call(this, obj, f, a, b, c, d);
      default:
        return vary_meta__7.cljs$core$IFn$_invoke$arity$variadic(obj, f, a, b, c, d, cljs.core.array_seq(arguments, 6));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  vary_meta.cljs$lang$maxFixedArity = 6;
  vary_meta.cljs$lang$applyTo = vary_meta__7.cljs$lang$applyTo;
  vary_meta.cljs$core$IFn$_invoke$arity$2 = vary_meta__2;
  vary_meta.cljs$core$IFn$_invoke$arity$3 = vary_meta__3;
  vary_meta.cljs$core$IFn$_invoke$arity$4 = vary_meta__4;
  vary_meta.cljs$core$IFn$_invoke$arity$5 = vary_meta__5;
  vary_meta.cljs$core$IFn$_invoke$arity$6 = vary_meta__6;
  vary_meta.cljs$core$IFn$_invoke$arity$variadic = vary_meta__7.cljs$core$IFn$_invoke$arity$variadic;
  return vary_meta;
}();
cljs.core.not_EQ_ = function() {
  var not_EQ_ = null;
  var not_EQ___1 = function(x) {
    return false;
  };
  var not_EQ___2 = function(x, y) {
    return!cljs.core._EQ_.call(null, x, y);
  };
  var not_EQ___3 = function() {
    var G__44251__delegate = function(x, y, more) {
      return cljs.core.not.call(null, cljs.core.apply.call(null, cljs.core._EQ_, x, y, more));
    };
    var G__44251 = function(x, y, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44251__delegate.call(this, x, y, more);
    };
    G__44251.cljs$lang$maxFixedArity = 2;
    G__44251.cljs$lang$applyTo = function(arglist__44252) {
      var x = cljs.core.first(arglist__44252);
      arglist__44252 = cljs.core.next(arglist__44252);
      var y = cljs.core.first(arglist__44252);
      var more = cljs.core.rest(arglist__44252);
      return G__44251__delegate(x, y, more);
    };
    G__44251.cljs$core$IFn$_invoke$arity$variadic = G__44251__delegate;
    return G__44251;
  }();
  not_EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return not_EQ___1.call(this, x);
      case 2:
        return not_EQ___2.call(this, x, y);
      default:
        return not_EQ___3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  not_EQ_.cljs$lang$maxFixedArity = 2;
  not_EQ_.cljs$lang$applyTo = not_EQ___3.cljs$lang$applyTo;
  not_EQ_.cljs$core$IFn$_invoke$arity$1 = not_EQ___1;
  not_EQ_.cljs$core$IFn$_invoke$arity$2 = not_EQ___2;
  not_EQ_.cljs$core$IFn$_invoke$arity$variadic = not_EQ___3.cljs$core$IFn$_invoke$arity$variadic;
  return not_EQ_;
}();
cljs.core.not_empty = function not_empty(coll) {
  if (cljs.core.seq.call(null, coll)) {
    return coll;
  } else {
    return null;
  }
};
cljs.core.every_QMARK_ = function every_QMARK_(pred, coll) {
  while (true) {
    if (cljs.core.seq.call(null, coll) == null) {
      return true;
    } else {
      if (cljs.core.truth_(pred.call(null, cljs.core.first.call(null, coll)))) {
        var G__44253 = pred;
        var G__44254 = cljs.core.next.call(null, coll);
        pred = G__44253;
        coll = G__44254;
        continue;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return false;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.not_every_QMARK_ = function not_every_QMARK_(pred, coll) {
  return!cljs.core.every_QMARK_.call(null, pred, coll);
};
cljs.core.some = function some(pred, coll) {
  while (true) {
    if (cljs.core.seq.call(null, coll)) {
      var or__3400__auto__ = pred.call(null, cljs.core.first.call(null, coll));
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        var G__44255 = pred;
        var G__44256 = cljs.core.next.call(null, coll);
        pred = G__44255;
        coll = G__44256;
        continue;
      }
    } else {
      return null;
    }
    break;
  }
};
cljs.core.not_any_QMARK_ = function not_any_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.some.call(null, pred, coll));
};
cljs.core.even_QMARK_ = function even_QMARK_(n) {
  if (cljs.core.integer_QMARK_.call(null, n)) {
    return(n & 1) === 0;
  } else {
    throw new Error([cljs.core.str("Argument must be an integer: "), cljs.core.str(n)].join(""));
  }
};
cljs.core.odd_QMARK_ = function odd_QMARK_(n) {
  return!cljs.core.even_QMARK_.call(null, n);
};
cljs.core.identity = function identity(x) {
  return x;
};
cljs.core.complement = function complement(f) {
  return function() {
    var G__44257 = null;
    var G__44257__0 = function() {
      return cljs.core.not.call(null, f.call(null));
    };
    var G__44257__1 = function(x) {
      return cljs.core.not.call(null, f.call(null, x));
    };
    var G__44257__2 = function(x, y) {
      return cljs.core.not.call(null, f.call(null, x, y));
    };
    var G__44257__3 = function() {
      var G__44258__delegate = function(x, y, zs) {
        return cljs.core.not.call(null, cljs.core.apply.call(null, f, x, y, zs));
      };
      var G__44258 = function(x, y, var_args) {
        var zs = null;
        if (arguments.length > 2) {
          zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
        }
        return G__44258__delegate.call(this, x, y, zs);
      };
      G__44258.cljs$lang$maxFixedArity = 2;
      G__44258.cljs$lang$applyTo = function(arglist__44259) {
        var x = cljs.core.first(arglist__44259);
        arglist__44259 = cljs.core.next(arglist__44259);
        var y = cljs.core.first(arglist__44259);
        var zs = cljs.core.rest(arglist__44259);
        return G__44258__delegate(x, y, zs);
      };
      G__44258.cljs$core$IFn$_invoke$arity$variadic = G__44258__delegate;
      return G__44258;
    }();
    G__44257 = function(x, y, var_args) {
      var zs = var_args;
      switch(arguments.length) {
        case 0:
          return G__44257__0.call(this);
        case 1:
          return G__44257__1.call(this, x);
        case 2:
          return G__44257__2.call(this, x, y);
        default:
          return G__44257__3.cljs$core$IFn$_invoke$arity$variadic(x, y, cljs.core.array_seq(arguments, 2));
      }
      throw new Error("Invalid arity: " + arguments.length);
    };
    G__44257.cljs$lang$maxFixedArity = 2;
    G__44257.cljs$lang$applyTo = G__44257__3.cljs$lang$applyTo;
    return G__44257;
  }();
};
cljs.core.constantly = function constantly(x) {
  return function() {
    var G__44260__delegate = function(args) {
      return x;
    };
    var G__44260 = function(var_args) {
      var args = null;
      if (arguments.length > 0) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
      }
      return G__44260__delegate.call(this, args);
    };
    G__44260.cljs$lang$maxFixedArity = 0;
    G__44260.cljs$lang$applyTo = function(arglist__44261) {
      var args = cljs.core.seq(arglist__44261);
      return G__44260__delegate(args);
    };
    G__44260.cljs$core$IFn$_invoke$arity$variadic = G__44260__delegate;
    return G__44260;
  }();
};
cljs.core.comp = function() {
  var comp = null;
  var comp__0 = function() {
    return cljs.core.identity;
  };
  var comp__1 = function(f) {
    return f;
  };
  var comp__2 = function(f, g) {
    return function() {
      var G__44262 = null;
      var G__44262__0 = function() {
        return f.call(null, g.call(null));
      };
      var G__44262__1 = function(x) {
        return f.call(null, g.call(null, x));
      };
      var G__44262__2 = function(x, y) {
        return f.call(null, g.call(null, x, y));
      };
      var G__44262__3 = function(x, y, z) {
        return f.call(null, g.call(null, x, y, z));
      };
      var G__44262__4 = function() {
        var G__44263__delegate = function(x, y, z, args) {
          return f.call(null, cljs.core.apply.call(null, g, x, y, z, args));
        };
        var G__44263 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44263__delegate.call(this, x, y, z, args);
        };
        G__44263.cljs$lang$maxFixedArity = 3;
        G__44263.cljs$lang$applyTo = function(arglist__44264) {
          var x = cljs.core.first(arglist__44264);
          arglist__44264 = cljs.core.next(arglist__44264);
          var y = cljs.core.first(arglist__44264);
          arglist__44264 = cljs.core.next(arglist__44264);
          var z = cljs.core.first(arglist__44264);
          var args = cljs.core.rest(arglist__44264);
          return G__44263__delegate(x, y, z, args);
        };
        G__44263.cljs$core$IFn$_invoke$arity$variadic = G__44263__delegate;
        return G__44263;
      }();
      G__44262 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__44262__0.call(this);
          case 1:
            return G__44262__1.call(this, x);
          case 2:
            return G__44262__2.call(this, x, y);
          case 3:
            return G__44262__3.call(this, x, y, z);
          default:
            return G__44262__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44262.cljs$lang$maxFixedArity = 3;
      G__44262.cljs$lang$applyTo = G__44262__4.cljs$lang$applyTo;
      return G__44262;
    }();
  };
  var comp__3 = function(f, g, h) {
    return function() {
      var G__44265 = null;
      var G__44265__0 = function() {
        return f.call(null, g.call(null, h.call(null)));
      };
      var G__44265__1 = function(x) {
        return f.call(null, g.call(null, h.call(null, x)));
      };
      var G__44265__2 = function(x, y) {
        return f.call(null, g.call(null, h.call(null, x, y)));
      };
      var G__44265__3 = function(x, y, z) {
        return f.call(null, g.call(null, h.call(null, x, y, z)));
      };
      var G__44265__4 = function() {
        var G__44266__delegate = function(x, y, z, args) {
          return f.call(null, g.call(null, cljs.core.apply.call(null, h, x, y, z, args)));
        };
        var G__44266 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44266__delegate.call(this, x, y, z, args);
        };
        G__44266.cljs$lang$maxFixedArity = 3;
        G__44266.cljs$lang$applyTo = function(arglist__44267) {
          var x = cljs.core.first(arglist__44267);
          arglist__44267 = cljs.core.next(arglist__44267);
          var y = cljs.core.first(arglist__44267);
          arglist__44267 = cljs.core.next(arglist__44267);
          var z = cljs.core.first(arglist__44267);
          var args = cljs.core.rest(arglist__44267);
          return G__44266__delegate(x, y, z, args);
        };
        G__44266.cljs$core$IFn$_invoke$arity$variadic = G__44266__delegate;
        return G__44266;
      }();
      G__44265 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__44265__0.call(this);
          case 1:
            return G__44265__1.call(this, x);
          case 2:
            return G__44265__2.call(this, x, y);
          case 3:
            return G__44265__3.call(this, x, y, z);
          default:
            return G__44265__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44265.cljs$lang$maxFixedArity = 3;
      G__44265.cljs$lang$applyTo = G__44265__4.cljs$lang$applyTo;
      return G__44265;
    }();
  };
  var comp__4 = function() {
    var G__44268__delegate = function(f1, f2, f3, fs) {
      var fs__$1 = cljs.core.reverse.call(null, cljs.core.list_STAR_.call(null, f1, f2, f3, fs));
      return function() {
        var G__44269__delegate = function(args) {
          var ret = cljs.core.apply.call(null, cljs.core.first.call(null, fs__$1), args);
          var fs__$2 = cljs.core.next.call(null, fs__$1);
          while (true) {
            if (fs__$2) {
              var G__44270 = cljs.core.first.call(null, fs__$2).call(null, ret);
              var G__44271 = cljs.core.next.call(null, fs__$2);
              ret = G__44270;
              fs__$2 = G__44271;
              continue;
            } else {
              return ret;
            }
            break;
          }
        };
        var G__44269 = function(var_args) {
          var args = null;
          if (arguments.length > 0) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
          }
          return G__44269__delegate.call(this, args);
        };
        G__44269.cljs$lang$maxFixedArity = 0;
        G__44269.cljs$lang$applyTo = function(arglist__44272) {
          var args = cljs.core.seq(arglist__44272);
          return G__44269__delegate(args);
        };
        G__44269.cljs$core$IFn$_invoke$arity$variadic = G__44269__delegate;
        return G__44269;
      }();
    };
    var G__44268 = function(f1, f2, f3, var_args) {
      var fs = null;
      if (arguments.length > 3) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44268__delegate.call(this, f1, f2, f3, fs);
    };
    G__44268.cljs$lang$maxFixedArity = 3;
    G__44268.cljs$lang$applyTo = function(arglist__44273) {
      var f1 = cljs.core.first(arglist__44273);
      arglist__44273 = cljs.core.next(arglist__44273);
      var f2 = cljs.core.first(arglist__44273);
      arglist__44273 = cljs.core.next(arglist__44273);
      var f3 = cljs.core.first(arglist__44273);
      var fs = cljs.core.rest(arglist__44273);
      return G__44268__delegate(f1, f2, f3, fs);
    };
    G__44268.cljs$core$IFn$_invoke$arity$variadic = G__44268__delegate;
    return G__44268;
  }();
  comp = function(f1, f2, f3, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 0:
        return comp__0.call(this);
      case 1:
        return comp__1.call(this, f1);
      case 2:
        return comp__2.call(this, f1, f2);
      case 3:
        return comp__3.call(this, f1, f2, f3);
      default:
        return comp__4.cljs$core$IFn$_invoke$arity$variadic(f1, f2, f3, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  comp.cljs$lang$maxFixedArity = 3;
  comp.cljs$lang$applyTo = comp__4.cljs$lang$applyTo;
  comp.cljs$core$IFn$_invoke$arity$0 = comp__0;
  comp.cljs$core$IFn$_invoke$arity$1 = comp__1;
  comp.cljs$core$IFn$_invoke$arity$2 = comp__2;
  comp.cljs$core$IFn$_invoke$arity$3 = comp__3;
  comp.cljs$core$IFn$_invoke$arity$variadic = comp__4.cljs$core$IFn$_invoke$arity$variadic;
  return comp;
}();
cljs.core.partial = function() {
  var partial = null;
  var partial__1 = function(f) {
    return f;
  };
  var partial__2 = function(f, arg1) {
    return function() {
      var G__44274__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, args);
      };
      var G__44274 = function(var_args) {
        var args = null;
        if (arguments.length > 0) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
        }
        return G__44274__delegate.call(this, args);
      };
      G__44274.cljs$lang$maxFixedArity = 0;
      G__44274.cljs$lang$applyTo = function(arglist__44275) {
        var args = cljs.core.seq(arglist__44275);
        return G__44274__delegate(args);
      };
      G__44274.cljs$core$IFn$_invoke$arity$variadic = G__44274__delegate;
      return G__44274;
    }();
  };
  var partial__3 = function(f, arg1, arg2) {
    return function() {
      var G__44276__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, args);
      };
      var G__44276 = function(var_args) {
        var args = null;
        if (arguments.length > 0) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
        }
        return G__44276__delegate.call(this, args);
      };
      G__44276.cljs$lang$maxFixedArity = 0;
      G__44276.cljs$lang$applyTo = function(arglist__44277) {
        var args = cljs.core.seq(arglist__44277);
        return G__44276__delegate(args);
      };
      G__44276.cljs$core$IFn$_invoke$arity$variadic = G__44276__delegate;
      return G__44276;
    }();
  };
  var partial__4 = function(f, arg1, arg2, arg3) {
    return function() {
      var G__44278__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, arg3, args);
      };
      var G__44278 = function(var_args) {
        var args = null;
        if (arguments.length > 0) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
        }
        return G__44278__delegate.call(this, args);
      };
      G__44278.cljs$lang$maxFixedArity = 0;
      G__44278.cljs$lang$applyTo = function(arglist__44279) {
        var args = cljs.core.seq(arglist__44279);
        return G__44278__delegate(args);
      };
      G__44278.cljs$core$IFn$_invoke$arity$variadic = G__44278__delegate;
      return G__44278;
    }();
  };
  var partial__5 = function() {
    var G__44280__delegate = function(f, arg1, arg2, arg3, more) {
      return function() {
        var G__44281__delegate = function(args) {
          return cljs.core.apply.call(null, f, arg1, arg2, arg3, cljs.core.concat.call(null, more, args));
        };
        var G__44281 = function(var_args) {
          var args = null;
          if (arguments.length > 0) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
          }
          return G__44281__delegate.call(this, args);
        };
        G__44281.cljs$lang$maxFixedArity = 0;
        G__44281.cljs$lang$applyTo = function(arglist__44282) {
          var args = cljs.core.seq(arglist__44282);
          return G__44281__delegate(args);
        };
        G__44281.cljs$core$IFn$_invoke$arity$variadic = G__44281__delegate;
        return G__44281;
      }();
    };
    var G__44280 = function(f, arg1, arg2, arg3, var_args) {
      var more = null;
      if (arguments.length > 4) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0);
      }
      return G__44280__delegate.call(this, f, arg1, arg2, arg3, more);
    };
    G__44280.cljs$lang$maxFixedArity = 4;
    G__44280.cljs$lang$applyTo = function(arglist__44283) {
      var f = cljs.core.first(arglist__44283);
      arglist__44283 = cljs.core.next(arglist__44283);
      var arg1 = cljs.core.first(arglist__44283);
      arglist__44283 = cljs.core.next(arglist__44283);
      var arg2 = cljs.core.first(arglist__44283);
      arglist__44283 = cljs.core.next(arglist__44283);
      var arg3 = cljs.core.first(arglist__44283);
      var more = cljs.core.rest(arglist__44283);
      return G__44280__delegate(f, arg1, arg2, arg3, more);
    };
    G__44280.cljs$core$IFn$_invoke$arity$variadic = G__44280__delegate;
    return G__44280;
  }();
  partial = function(f, arg1, arg2, arg3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return partial__1.call(this, f);
      case 2:
        return partial__2.call(this, f, arg1);
      case 3:
        return partial__3.call(this, f, arg1, arg2);
      case 4:
        return partial__4.call(this, f, arg1, arg2, arg3);
      default:
        return partial__5.cljs$core$IFn$_invoke$arity$variadic(f, arg1, arg2, arg3, cljs.core.array_seq(arguments, 4));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  partial.cljs$lang$maxFixedArity = 4;
  partial.cljs$lang$applyTo = partial__5.cljs$lang$applyTo;
  partial.cljs$core$IFn$_invoke$arity$1 = partial__1;
  partial.cljs$core$IFn$_invoke$arity$2 = partial__2;
  partial.cljs$core$IFn$_invoke$arity$3 = partial__3;
  partial.cljs$core$IFn$_invoke$arity$4 = partial__4;
  partial.cljs$core$IFn$_invoke$arity$variadic = partial__5.cljs$core$IFn$_invoke$arity$variadic;
  return partial;
}();
cljs.core.fnil = function() {
  var fnil = null;
  var fnil__2 = function(f, x) {
    return function() {
      var G__44284 = null;
      var G__44284__1 = function(a) {
        return f.call(null, a == null ? x : a);
      };
      var G__44284__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b);
      };
      var G__44284__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b, c);
      };
      var G__44284__4 = function() {
        var G__44285__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b, c, ds);
        };
        var G__44285 = function(a, b, c, var_args) {
          var ds = null;
          if (arguments.length > 3) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44285__delegate.call(this, a, b, c, ds);
        };
        G__44285.cljs$lang$maxFixedArity = 3;
        G__44285.cljs$lang$applyTo = function(arglist__44286) {
          var a = cljs.core.first(arglist__44286);
          arglist__44286 = cljs.core.next(arglist__44286);
          var b = cljs.core.first(arglist__44286);
          arglist__44286 = cljs.core.next(arglist__44286);
          var c = cljs.core.first(arglist__44286);
          var ds = cljs.core.rest(arglist__44286);
          return G__44285__delegate(a, b, c, ds);
        };
        G__44285.cljs$core$IFn$_invoke$arity$variadic = G__44285__delegate;
        return G__44285;
      }();
      G__44284 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 1:
            return G__44284__1.call(this, a);
          case 2:
            return G__44284__2.call(this, a, b);
          case 3:
            return G__44284__3.call(this, a, b, c);
          default:
            return G__44284__4.cljs$core$IFn$_invoke$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44284.cljs$lang$maxFixedArity = 3;
      G__44284.cljs$lang$applyTo = G__44284__4.cljs$lang$applyTo;
      return G__44284;
    }();
  };
  var fnil__3 = function(f, x, y) {
    return function() {
      var G__44287 = null;
      var G__44287__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b);
      };
      var G__44287__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c);
      };
      var G__44287__4 = function() {
        var G__44288__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c, ds);
        };
        var G__44288 = function(a, b, c, var_args) {
          var ds = null;
          if (arguments.length > 3) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44288__delegate.call(this, a, b, c, ds);
        };
        G__44288.cljs$lang$maxFixedArity = 3;
        G__44288.cljs$lang$applyTo = function(arglist__44289) {
          var a = cljs.core.first(arglist__44289);
          arglist__44289 = cljs.core.next(arglist__44289);
          var b = cljs.core.first(arglist__44289);
          arglist__44289 = cljs.core.next(arglist__44289);
          var c = cljs.core.first(arglist__44289);
          var ds = cljs.core.rest(arglist__44289);
          return G__44288__delegate(a, b, c, ds);
        };
        G__44288.cljs$core$IFn$_invoke$arity$variadic = G__44288__delegate;
        return G__44288;
      }();
      G__44287 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__44287__2.call(this, a, b);
          case 3:
            return G__44287__3.call(this, a, b, c);
          default:
            return G__44287__4.cljs$core$IFn$_invoke$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44287.cljs$lang$maxFixedArity = 3;
      G__44287.cljs$lang$applyTo = G__44287__4.cljs$lang$applyTo;
      return G__44287;
    }();
  };
  var fnil__4 = function(f, x, y, z) {
    return function() {
      var G__44290 = null;
      var G__44290__2 = function(a, b) {
        return f.call(null, a == null ? x : a, b == null ? y : b);
      };
      var G__44290__3 = function(a, b, c) {
        return f.call(null, a == null ? x : a, b == null ? y : b, c == null ? z : c);
      };
      var G__44290__4 = function() {
        var G__44291__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a == null ? x : a, b == null ? y : b, c == null ? z : c, ds);
        };
        var G__44291 = function(a, b, c, var_args) {
          var ds = null;
          if (arguments.length > 3) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44291__delegate.call(this, a, b, c, ds);
        };
        G__44291.cljs$lang$maxFixedArity = 3;
        G__44291.cljs$lang$applyTo = function(arglist__44292) {
          var a = cljs.core.first(arglist__44292);
          arglist__44292 = cljs.core.next(arglist__44292);
          var b = cljs.core.first(arglist__44292);
          arglist__44292 = cljs.core.next(arglist__44292);
          var c = cljs.core.first(arglist__44292);
          var ds = cljs.core.rest(arglist__44292);
          return G__44291__delegate(a, b, c, ds);
        };
        G__44291.cljs$core$IFn$_invoke$arity$variadic = G__44291__delegate;
        return G__44291;
      }();
      G__44290 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__44290__2.call(this, a, b);
          case 3:
            return G__44290__3.call(this, a, b, c);
          default:
            return G__44290__4.cljs$core$IFn$_invoke$arity$variadic(a, b, c, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44290.cljs$lang$maxFixedArity = 3;
      G__44290.cljs$lang$applyTo = G__44290__4.cljs$lang$applyTo;
      return G__44290;
    }();
  };
  fnil = function(f, x, y, z) {
    switch(arguments.length) {
      case 2:
        return fnil__2.call(this, f, x);
      case 3:
        return fnil__3.call(this, f, x, y);
      case 4:
        return fnil__4.call(this, f, x, y, z);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  fnil.cljs$core$IFn$_invoke$arity$2 = fnil__2;
  fnil.cljs$core$IFn$_invoke$arity$3 = fnil__3;
  fnil.cljs$core$IFn$_invoke$arity$4 = fnil__4;
  return fnil;
}();
cljs.core.map_indexed = function map_indexed(f, coll) {
  var mapi = function mapi(idx, coll__$1) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll__$1);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
          var c = cljs.core.chunk_first.call(null, s);
          var size = cljs.core.count.call(null, c);
          var b = cljs.core.chunk_buffer.call(null, size);
          var n__4242__auto___44293 = size;
          var i_44294 = 0;
          while (true) {
            if (i_44294 < n__4242__auto___44293) {
              cljs.core.chunk_append.call(null, b, f.call(null, idx + i_44294, cljs.core._nth.call(null, c, i_44294)));
              var G__44295 = i_44294 + 1;
              i_44294 = G__44295;
              continue;
            } else {
            }
            break;
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b), mapi.call(null, idx + size, cljs.core.chunk_rest.call(null, s)));
        } else {
          return cljs.core.cons.call(null, f.call(null, idx, cljs.core.first.call(null, s)), mapi.call(null, idx + 1, cljs.core.rest.call(null, s)));
        }
      } else {
        return null;
      }
    }, null, null);
  };
  return mapi.call(null, 0, coll);
};
cljs.core.keep = function keep(f, coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
        var c = cljs.core.chunk_first.call(null, s);
        var size = cljs.core.count.call(null, c);
        var b = cljs.core.chunk_buffer.call(null, size);
        var n__4242__auto___44296 = size;
        var i_44297 = 0;
        while (true) {
          if (i_44297 < n__4242__auto___44296) {
            var x_44298 = f.call(null, cljs.core._nth.call(null, c, i_44297));
            if (x_44298 == null) {
            } else {
              cljs.core.chunk_append.call(null, b, x_44298);
            }
            var G__44299 = i_44297 + 1;
            i_44297 = G__44299;
            continue;
          } else {
          }
          break;
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b), keep.call(null, f, cljs.core.chunk_rest.call(null, s)));
      } else {
        var x = f.call(null, cljs.core.first.call(null, s));
        if (x == null) {
          return keep.call(null, f, cljs.core.rest.call(null, s));
        } else {
          return cljs.core.cons.call(null, x, keep.call(null, f, cljs.core.rest.call(null, s)));
        }
      }
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.keep_indexed = function keep_indexed(f, coll) {
  var keepi = function keepi(idx, coll__$1) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll__$1);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
          var c = cljs.core.chunk_first.call(null, s);
          var size = cljs.core.count.call(null, c);
          var b = cljs.core.chunk_buffer.call(null, size);
          var n__4242__auto___44300 = size;
          var i_44301 = 0;
          while (true) {
            if (i_44301 < n__4242__auto___44300) {
              var x_44302 = f.call(null, idx + i_44301, cljs.core._nth.call(null, c, i_44301));
              if (x_44302 == null) {
              } else {
                cljs.core.chunk_append.call(null, b, x_44302);
              }
              var G__44303 = i_44301 + 1;
              i_44301 = G__44303;
              continue;
            } else {
            }
            break;
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b), keepi.call(null, idx + size, cljs.core.chunk_rest.call(null, s)));
        } else {
          var x = f.call(null, idx, cljs.core.first.call(null, s));
          if (x == null) {
            return keepi.call(null, idx + 1, cljs.core.rest.call(null, s));
          } else {
            return cljs.core.cons.call(null, x, keepi.call(null, idx + 1, cljs.core.rest.call(null, s)));
          }
        }
      } else {
        return null;
      }
    }, null, null);
  };
  return keepi.call(null, 0, coll);
};
cljs.core.every_pred = function() {
  var every_pred = null;
  var every_pred__1 = function(p) {
    return function() {
      var ep1 = null;
      var ep1__0 = function() {
        return true;
      };
      var ep1__1 = function(x) {
        return cljs.core.boolean$.call(null, p.call(null, x));
      };
      var ep1__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            return p.call(null, y);
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep1__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p.call(null, y);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              return p.call(null, z);
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep1__4 = function() {
        var G__44310__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, ep1.call(null, x, y, z) && cljs.core.every_QMARK_.call(null, p, args));
        };
        var G__44310 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44310__delegate.call(this, x, y, z, args);
        };
        G__44310.cljs$lang$maxFixedArity = 3;
        G__44310.cljs$lang$applyTo = function(arglist__44311) {
          var x = cljs.core.first(arglist__44311);
          arglist__44311 = cljs.core.next(arglist__44311);
          var y = cljs.core.first(arglist__44311);
          arglist__44311 = cljs.core.next(arglist__44311);
          var z = cljs.core.first(arglist__44311);
          var args = cljs.core.rest(arglist__44311);
          return G__44310__delegate(x, y, z, args);
        };
        G__44310.cljs$core$IFn$_invoke$arity$variadic = G__44310__delegate;
        return G__44310;
      }();
      ep1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep1__0.call(this);
          case 1:
            return ep1__1.call(this, x);
          case 2:
            return ep1__2.call(this, x, y);
          case 3:
            return ep1__3.call(this, x, y, z);
          default:
            return ep1__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      ep1.cljs$lang$maxFixedArity = 3;
      ep1.cljs$lang$applyTo = ep1__4.cljs$lang$applyTo;
      ep1.cljs$core$IFn$_invoke$arity$0 = ep1__0;
      ep1.cljs$core$IFn$_invoke$arity$1 = ep1__1;
      ep1.cljs$core$IFn$_invoke$arity$2 = ep1__2;
      ep1.cljs$core$IFn$_invoke$arity$3 = ep1__3;
      ep1.cljs$core$IFn$_invoke$arity$variadic = ep1__4.cljs$core$IFn$_invoke$arity$variadic;
      return ep1;
    }();
  };
  var every_pred__2 = function(p1, p2) {
    return function() {
      var ep2 = null;
      var ep2__0 = function() {
        return true;
      };
      var ep2__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            return p2.call(null, x);
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep2__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p1.call(null, y);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              var and__3388__auto____$2 = p2.call(null, x);
              if (cljs.core.truth_(and__3388__auto____$2)) {
                return p2.call(null, y);
              } else {
                return and__3388__auto____$2;
              }
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep2__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p1.call(null, y);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              var and__3388__auto____$2 = p1.call(null, z);
              if (cljs.core.truth_(and__3388__auto____$2)) {
                var and__3388__auto____$3 = p2.call(null, x);
                if (cljs.core.truth_(and__3388__auto____$3)) {
                  var and__3388__auto____$4 = p2.call(null, y);
                  if (cljs.core.truth_(and__3388__auto____$4)) {
                    return p2.call(null, z);
                  } else {
                    return and__3388__auto____$4;
                  }
                } else {
                  return and__3388__auto____$3;
                }
              } else {
                return and__3388__auto____$2;
              }
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep2__4 = function() {
        var G__44312__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, ep2.call(null, x, y, z) && cljs.core.every_QMARK_.call(null, function(p1__44304_SHARP_) {
            var and__3388__auto__ = p1.call(null, p1__44304_SHARP_);
            if (cljs.core.truth_(and__3388__auto__)) {
              return p2.call(null, p1__44304_SHARP_);
            } else {
              return and__3388__auto__;
            }
          }, args));
        };
        var G__44312 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44312__delegate.call(this, x, y, z, args);
        };
        G__44312.cljs$lang$maxFixedArity = 3;
        G__44312.cljs$lang$applyTo = function(arglist__44313) {
          var x = cljs.core.first(arglist__44313);
          arglist__44313 = cljs.core.next(arglist__44313);
          var y = cljs.core.first(arglist__44313);
          arglist__44313 = cljs.core.next(arglist__44313);
          var z = cljs.core.first(arglist__44313);
          var args = cljs.core.rest(arglist__44313);
          return G__44312__delegate(x, y, z, args);
        };
        G__44312.cljs$core$IFn$_invoke$arity$variadic = G__44312__delegate;
        return G__44312;
      }();
      ep2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep2__0.call(this);
          case 1:
            return ep2__1.call(this, x);
          case 2:
            return ep2__2.call(this, x, y);
          case 3:
            return ep2__3.call(this, x, y, z);
          default:
            return ep2__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      ep2.cljs$lang$maxFixedArity = 3;
      ep2.cljs$lang$applyTo = ep2__4.cljs$lang$applyTo;
      ep2.cljs$core$IFn$_invoke$arity$0 = ep2__0;
      ep2.cljs$core$IFn$_invoke$arity$1 = ep2__1;
      ep2.cljs$core$IFn$_invoke$arity$2 = ep2__2;
      ep2.cljs$core$IFn$_invoke$arity$3 = ep2__3;
      ep2.cljs$core$IFn$_invoke$arity$variadic = ep2__4.cljs$core$IFn$_invoke$arity$variadic;
      return ep2;
    }();
  };
  var every_pred__3 = function(p1, p2, p3) {
    return function() {
      var ep3 = null;
      var ep3__0 = function() {
        return true;
      };
      var ep3__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p2.call(null, x);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              return p3.call(null, x);
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep3__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p2.call(null, x);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              var and__3388__auto____$2 = p3.call(null, x);
              if (cljs.core.truth_(and__3388__auto____$2)) {
                var and__3388__auto____$3 = p1.call(null, y);
                if (cljs.core.truth_(and__3388__auto____$3)) {
                  var and__3388__auto____$4 = p2.call(null, y);
                  if (cljs.core.truth_(and__3388__auto____$4)) {
                    return p3.call(null, y);
                  } else {
                    return and__3388__auto____$4;
                  }
                } else {
                  return and__3388__auto____$3;
                }
              } else {
                return and__3388__auto____$2;
              }
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep3__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3388__auto__ = p1.call(null, x);
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = p2.call(null, x);
            if (cljs.core.truth_(and__3388__auto____$1)) {
              var and__3388__auto____$2 = p3.call(null, x);
              if (cljs.core.truth_(and__3388__auto____$2)) {
                var and__3388__auto____$3 = p1.call(null, y);
                if (cljs.core.truth_(and__3388__auto____$3)) {
                  var and__3388__auto____$4 = p2.call(null, y);
                  if (cljs.core.truth_(and__3388__auto____$4)) {
                    var and__3388__auto____$5 = p3.call(null, y);
                    if (cljs.core.truth_(and__3388__auto____$5)) {
                      var and__3388__auto____$6 = p1.call(null, z);
                      if (cljs.core.truth_(and__3388__auto____$6)) {
                        var and__3388__auto____$7 = p2.call(null, z);
                        if (cljs.core.truth_(and__3388__auto____$7)) {
                          return p3.call(null, z);
                        } else {
                          return and__3388__auto____$7;
                        }
                      } else {
                        return and__3388__auto____$6;
                      }
                    } else {
                      return and__3388__auto____$5;
                    }
                  } else {
                    return and__3388__auto____$4;
                  }
                } else {
                  return and__3388__auto____$3;
                }
              } else {
                return and__3388__auto____$2;
              }
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }());
      };
      var ep3__4 = function() {
        var G__44314__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, ep3.call(null, x, y, z) && cljs.core.every_QMARK_.call(null, function(p1__44305_SHARP_) {
            var and__3388__auto__ = p1.call(null, p1__44305_SHARP_);
            if (cljs.core.truth_(and__3388__auto__)) {
              var and__3388__auto____$1 = p2.call(null, p1__44305_SHARP_);
              if (cljs.core.truth_(and__3388__auto____$1)) {
                return p3.call(null, p1__44305_SHARP_);
              } else {
                return and__3388__auto____$1;
              }
            } else {
              return and__3388__auto__;
            }
          }, args));
        };
        var G__44314 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44314__delegate.call(this, x, y, z, args);
        };
        G__44314.cljs$lang$maxFixedArity = 3;
        G__44314.cljs$lang$applyTo = function(arglist__44315) {
          var x = cljs.core.first(arglist__44315);
          arglist__44315 = cljs.core.next(arglist__44315);
          var y = cljs.core.first(arglist__44315);
          arglist__44315 = cljs.core.next(arglist__44315);
          var z = cljs.core.first(arglist__44315);
          var args = cljs.core.rest(arglist__44315);
          return G__44314__delegate(x, y, z, args);
        };
        G__44314.cljs$core$IFn$_invoke$arity$variadic = G__44314__delegate;
        return G__44314;
      }();
      ep3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep3__0.call(this);
          case 1:
            return ep3__1.call(this, x);
          case 2:
            return ep3__2.call(this, x, y);
          case 3:
            return ep3__3.call(this, x, y, z);
          default:
            return ep3__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      ep3.cljs$lang$maxFixedArity = 3;
      ep3.cljs$lang$applyTo = ep3__4.cljs$lang$applyTo;
      ep3.cljs$core$IFn$_invoke$arity$0 = ep3__0;
      ep3.cljs$core$IFn$_invoke$arity$1 = ep3__1;
      ep3.cljs$core$IFn$_invoke$arity$2 = ep3__2;
      ep3.cljs$core$IFn$_invoke$arity$3 = ep3__3;
      ep3.cljs$core$IFn$_invoke$arity$variadic = ep3__4.cljs$core$IFn$_invoke$arity$variadic;
      return ep3;
    }();
  };
  var every_pred__4 = function() {
    var G__44316__delegate = function(p1, p2, p3, ps) {
      var ps__$1 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var epn = null;
        var epn__0 = function() {
          return true;
        };
        var epn__1 = function(x) {
          return cljs.core.every_QMARK_.call(null, function(p1__44306_SHARP_) {
            return p1__44306_SHARP_.call(null, x);
          }, ps__$1);
        };
        var epn__2 = function(x, y) {
          return cljs.core.every_QMARK_.call(null, function(p1__44307_SHARP_) {
            var and__3388__auto__ = p1__44307_SHARP_.call(null, x);
            if (cljs.core.truth_(and__3388__auto__)) {
              return p1__44307_SHARP_.call(null, y);
            } else {
              return and__3388__auto__;
            }
          }, ps__$1);
        };
        var epn__3 = function(x, y, z) {
          return cljs.core.every_QMARK_.call(null, function(p1__44308_SHARP_) {
            var and__3388__auto__ = p1__44308_SHARP_.call(null, x);
            if (cljs.core.truth_(and__3388__auto__)) {
              var and__3388__auto____$1 = p1__44308_SHARP_.call(null, y);
              if (cljs.core.truth_(and__3388__auto____$1)) {
                return p1__44308_SHARP_.call(null, z);
              } else {
                return and__3388__auto____$1;
              }
            } else {
              return and__3388__auto__;
            }
          }, ps__$1);
        };
        var epn__4 = function() {
          var G__44317__delegate = function(x, y, z, args) {
            return cljs.core.boolean$.call(null, epn.call(null, x, y, z) && cljs.core.every_QMARK_.call(null, function(p1__44309_SHARP_) {
              return cljs.core.every_QMARK_.call(null, p1__44309_SHARP_, args);
            }, ps__$1));
          };
          var G__44317 = function(x, y, z, var_args) {
            var args = null;
            if (arguments.length > 3) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
            }
            return G__44317__delegate.call(this, x, y, z, args);
          };
          G__44317.cljs$lang$maxFixedArity = 3;
          G__44317.cljs$lang$applyTo = function(arglist__44318) {
            var x = cljs.core.first(arglist__44318);
            arglist__44318 = cljs.core.next(arglist__44318);
            var y = cljs.core.first(arglist__44318);
            arglist__44318 = cljs.core.next(arglist__44318);
            var z = cljs.core.first(arglist__44318);
            var args = cljs.core.rest(arglist__44318);
            return G__44317__delegate(x, y, z, args);
          };
          G__44317.cljs$core$IFn$_invoke$arity$variadic = G__44317__delegate;
          return G__44317;
        }();
        epn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return epn__0.call(this);
            case 1:
              return epn__1.call(this, x);
            case 2:
              return epn__2.call(this, x, y);
            case 3:
              return epn__3.call(this, x, y, z);
            default:
              return epn__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
          }
          throw new Error("Invalid arity: " + arguments.length);
        };
        epn.cljs$lang$maxFixedArity = 3;
        epn.cljs$lang$applyTo = epn__4.cljs$lang$applyTo;
        epn.cljs$core$IFn$_invoke$arity$0 = epn__0;
        epn.cljs$core$IFn$_invoke$arity$1 = epn__1;
        epn.cljs$core$IFn$_invoke$arity$2 = epn__2;
        epn.cljs$core$IFn$_invoke$arity$3 = epn__3;
        epn.cljs$core$IFn$_invoke$arity$variadic = epn__4.cljs$core$IFn$_invoke$arity$variadic;
        return epn;
      }();
    };
    var G__44316 = function(p1, p2, p3, var_args) {
      var ps = null;
      if (arguments.length > 3) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44316__delegate.call(this, p1, p2, p3, ps);
    };
    G__44316.cljs$lang$maxFixedArity = 3;
    G__44316.cljs$lang$applyTo = function(arglist__44319) {
      var p1 = cljs.core.first(arglist__44319);
      arglist__44319 = cljs.core.next(arglist__44319);
      var p2 = cljs.core.first(arglist__44319);
      arglist__44319 = cljs.core.next(arglist__44319);
      var p3 = cljs.core.first(arglist__44319);
      var ps = cljs.core.rest(arglist__44319);
      return G__44316__delegate(p1, p2, p3, ps);
    };
    G__44316.cljs$core$IFn$_invoke$arity$variadic = G__44316__delegate;
    return G__44316;
  }();
  every_pred = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return every_pred__1.call(this, p1);
      case 2:
        return every_pred__2.call(this, p1, p2);
      case 3:
        return every_pred__3.call(this, p1, p2, p3);
      default:
        return every_pred__4.cljs$core$IFn$_invoke$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  every_pred.cljs$lang$maxFixedArity = 3;
  every_pred.cljs$lang$applyTo = every_pred__4.cljs$lang$applyTo;
  every_pred.cljs$core$IFn$_invoke$arity$1 = every_pred__1;
  every_pred.cljs$core$IFn$_invoke$arity$2 = every_pred__2;
  every_pred.cljs$core$IFn$_invoke$arity$3 = every_pred__3;
  every_pred.cljs$core$IFn$_invoke$arity$variadic = every_pred__4.cljs$core$IFn$_invoke$arity$variadic;
  return every_pred;
}();
cljs.core.some_fn = function() {
  var some_fn = null;
  var some_fn__1 = function(p) {
    return function() {
      var sp1 = null;
      var sp1__0 = function() {
        return null;
      };
      var sp1__1 = function(x) {
        return p.call(null, x);
      };
      var sp1__2 = function(x, y) {
        var or__3400__auto__ = p.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          return p.call(null, y);
        }
      };
      var sp1__3 = function(x, y, z) {
        var or__3400__auto__ = p.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p.call(null, y);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            return p.call(null, z);
          }
        }
      };
      var sp1__4 = function() {
        var G__44326__delegate = function(x, y, z, args) {
          var or__3400__auto__ = sp1.call(null, x, y, z);
          if (cljs.core.truth_(or__3400__auto__)) {
            return or__3400__auto__;
          } else {
            return cljs.core.some.call(null, p, args);
          }
        };
        var G__44326 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44326__delegate.call(this, x, y, z, args);
        };
        G__44326.cljs$lang$maxFixedArity = 3;
        G__44326.cljs$lang$applyTo = function(arglist__44327) {
          var x = cljs.core.first(arglist__44327);
          arglist__44327 = cljs.core.next(arglist__44327);
          var y = cljs.core.first(arglist__44327);
          arglist__44327 = cljs.core.next(arglist__44327);
          var z = cljs.core.first(arglist__44327);
          var args = cljs.core.rest(arglist__44327);
          return G__44326__delegate(x, y, z, args);
        };
        G__44326.cljs$core$IFn$_invoke$arity$variadic = G__44326__delegate;
        return G__44326;
      }();
      sp1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp1__0.call(this);
          case 1:
            return sp1__1.call(this, x);
          case 2:
            return sp1__2.call(this, x, y);
          case 3:
            return sp1__3.call(this, x, y, z);
          default:
            return sp1__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      sp1.cljs$lang$maxFixedArity = 3;
      sp1.cljs$lang$applyTo = sp1__4.cljs$lang$applyTo;
      sp1.cljs$core$IFn$_invoke$arity$0 = sp1__0;
      sp1.cljs$core$IFn$_invoke$arity$1 = sp1__1;
      sp1.cljs$core$IFn$_invoke$arity$2 = sp1__2;
      sp1.cljs$core$IFn$_invoke$arity$3 = sp1__3;
      sp1.cljs$core$IFn$_invoke$arity$variadic = sp1__4.cljs$core$IFn$_invoke$arity$variadic;
      return sp1;
    }();
  };
  var some_fn__2 = function(p1, p2) {
    return function() {
      var sp2 = null;
      var sp2__0 = function() {
        return null;
      };
      var sp2__1 = function(x) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          return p2.call(null, x);
        }
      };
      var sp2__2 = function(x, y) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p1.call(null, y);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            var or__3400__auto____$2 = p2.call(null, x);
            if (cljs.core.truth_(or__3400__auto____$2)) {
              return or__3400__auto____$2;
            } else {
              return p2.call(null, y);
            }
          }
        }
      };
      var sp2__3 = function(x, y, z) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p1.call(null, y);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            var or__3400__auto____$2 = p1.call(null, z);
            if (cljs.core.truth_(or__3400__auto____$2)) {
              return or__3400__auto____$2;
            } else {
              var or__3400__auto____$3 = p2.call(null, x);
              if (cljs.core.truth_(or__3400__auto____$3)) {
                return or__3400__auto____$3;
              } else {
                var or__3400__auto____$4 = p2.call(null, y);
                if (cljs.core.truth_(or__3400__auto____$4)) {
                  return or__3400__auto____$4;
                } else {
                  return p2.call(null, z);
                }
              }
            }
          }
        }
      };
      var sp2__4 = function() {
        var G__44328__delegate = function(x, y, z, args) {
          var or__3400__auto__ = sp2.call(null, x, y, z);
          if (cljs.core.truth_(or__3400__auto__)) {
            return or__3400__auto__;
          } else {
            return cljs.core.some.call(null, function(p1__44320_SHARP_) {
              var or__3400__auto____$1 = p1.call(null, p1__44320_SHARP_);
              if (cljs.core.truth_(or__3400__auto____$1)) {
                return or__3400__auto____$1;
              } else {
                return p2.call(null, p1__44320_SHARP_);
              }
            }, args);
          }
        };
        var G__44328 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44328__delegate.call(this, x, y, z, args);
        };
        G__44328.cljs$lang$maxFixedArity = 3;
        G__44328.cljs$lang$applyTo = function(arglist__44329) {
          var x = cljs.core.first(arglist__44329);
          arglist__44329 = cljs.core.next(arglist__44329);
          var y = cljs.core.first(arglist__44329);
          arglist__44329 = cljs.core.next(arglist__44329);
          var z = cljs.core.first(arglist__44329);
          var args = cljs.core.rest(arglist__44329);
          return G__44328__delegate(x, y, z, args);
        };
        G__44328.cljs$core$IFn$_invoke$arity$variadic = G__44328__delegate;
        return G__44328;
      }();
      sp2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp2__0.call(this);
          case 1:
            return sp2__1.call(this, x);
          case 2:
            return sp2__2.call(this, x, y);
          case 3:
            return sp2__3.call(this, x, y, z);
          default:
            return sp2__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      sp2.cljs$lang$maxFixedArity = 3;
      sp2.cljs$lang$applyTo = sp2__4.cljs$lang$applyTo;
      sp2.cljs$core$IFn$_invoke$arity$0 = sp2__0;
      sp2.cljs$core$IFn$_invoke$arity$1 = sp2__1;
      sp2.cljs$core$IFn$_invoke$arity$2 = sp2__2;
      sp2.cljs$core$IFn$_invoke$arity$3 = sp2__3;
      sp2.cljs$core$IFn$_invoke$arity$variadic = sp2__4.cljs$core$IFn$_invoke$arity$variadic;
      return sp2;
    }();
  };
  var some_fn__3 = function(p1, p2, p3) {
    return function() {
      var sp3 = null;
      var sp3__0 = function() {
        return null;
      };
      var sp3__1 = function(x) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p2.call(null, x);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            return p3.call(null, x);
          }
        }
      };
      var sp3__2 = function(x, y) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p2.call(null, x);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            var or__3400__auto____$2 = p3.call(null, x);
            if (cljs.core.truth_(or__3400__auto____$2)) {
              return or__3400__auto____$2;
            } else {
              var or__3400__auto____$3 = p1.call(null, y);
              if (cljs.core.truth_(or__3400__auto____$3)) {
                return or__3400__auto____$3;
              } else {
                var or__3400__auto____$4 = p2.call(null, y);
                if (cljs.core.truth_(or__3400__auto____$4)) {
                  return or__3400__auto____$4;
                } else {
                  return p3.call(null, y);
                }
              }
            }
          }
        }
      };
      var sp3__3 = function(x, y, z) {
        var or__3400__auto__ = p1.call(null, x);
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          var or__3400__auto____$1 = p2.call(null, x);
          if (cljs.core.truth_(or__3400__auto____$1)) {
            return or__3400__auto____$1;
          } else {
            var or__3400__auto____$2 = p3.call(null, x);
            if (cljs.core.truth_(or__3400__auto____$2)) {
              return or__3400__auto____$2;
            } else {
              var or__3400__auto____$3 = p1.call(null, y);
              if (cljs.core.truth_(or__3400__auto____$3)) {
                return or__3400__auto____$3;
              } else {
                var or__3400__auto____$4 = p2.call(null, y);
                if (cljs.core.truth_(or__3400__auto____$4)) {
                  return or__3400__auto____$4;
                } else {
                  var or__3400__auto____$5 = p3.call(null, y);
                  if (cljs.core.truth_(or__3400__auto____$5)) {
                    return or__3400__auto____$5;
                  } else {
                    var or__3400__auto____$6 = p1.call(null, z);
                    if (cljs.core.truth_(or__3400__auto____$6)) {
                      return or__3400__auto____$6;
                    } else {
                      var or__3400__auto____$7 = p2.call(null, z);
                      if (cljs.core.truth_(or__3400__auto____$7)) {
                        return or__3400__auto____$7;
                      } else {
                        return p3.call(null, z);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      var sp3__4 = function() {
        var G__44330__delegate = function(x, y, z, args) {
          var or__3400__auto__ = sp3.call(null, x, y, z);
          if (cljs.core.truth_(or__3400__auto__)) {
            return or__3400__auto__;
          } else {
            return cljs.core.some.call(null, function(p1__44321_SHARP_) {
              var or__3400__auto____$1 = p1.call(null, p1__44321_SHARP_);
              if (cljs.core.truth_(or__3400__auto____$1)) {
                return or__3400__auto____$1;
              } else {
                var or__3400__auto____$2 = p2.call(null, p1__44321_SHARP_);
                if (cljs.core.truth_(or__3400__auto____$2)) {
                  return or__3400__auto____$2;
                } else {
                  return p3.call(null, p1__44321_SHARP_);
                }
              }
            }, args);
          }
        };
        var G__44330 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44330__delegate.call(this, x, y, z, args);
        };
        G__44330.cljs$lang$maxFixedArity = 3;
        G__44330.cljs$lang$applyTo = function(arglist__44331) {
          var x = cljs.core.first(arglist__44331);
          arglist__44331 = cljs.core.next(arglist__44331);
          var y = cljs.core.first(arglist__44331);
          arglist__44331 = cljs.core.next(arglist__44331);
          var z = cljs.core.first(arglist__44331);
          var args = cljs.core.rest(arglist__44331);
          return G__44330__delegate(x, y, z, args);
        };
        G__44330.cljs$core$IFn$_invoke$arity$variadic = G__44330__delegate;
        return G__44330;
      }();
      sp3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp3__0.call(this);
          case 1:
            return sp3__1.call(this, x);
          case 2:
            return sp3__2.call(this, x, y);
          case 3:
            return sp3__3.call(this, x, y, z);
          default:
            return sp3__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      sp3.cljs$lang$maxFixedArity = 3;
      sp3.cljs$lang$applyTo = sp3__4.cljs$lang$applyTo;
      sp3.cljs$core$IFn$_invoke$arity$0 = sp3__0;
      sp3.cljs$core$IFn$_invoke$arity$1 = sp3__1;
      sp3.cljs$core$IFn$_invoke$arity$2 = sp3__2;
      sp3.cljs$core$IFn$_invoke$arity$3 = sp3__3;
      sp3.cljs$core$IFn$_invoke$arity$variadic = sp3__4.cljs$core$IFn$_invoke$arity$variadic;
      return sp3;
    }();
  };
  var some_fn__4 = function() {
    var G__44332__delegate = function(p1, p2, p3, ps) {
      var ps__$1 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var spn = null;
        var spn__0 = function() {
          return null;
        };
        var spn__1 = function(x) {
          return cljs.core.some.call(null, function(p1__44322_SHARP_) {
            return p1__44322_SHARP_.call(null, x);
          }, ps__$1);
        };
        var spn__2 = function(x, y) {
          return cljs.core.some.call(null, function(p1__44323_SHARP_) {
            var or__3400__auto__ = p1__44323_SHARP_.call(null, x);
            if (cljs.core.truth_(or__3400__auto__)) {
              return or__3400__auto__;
            } else {
              return p1__44323_SHARP_.call(null, y);
            }
          }, ps__$1);
        };
        var spn__3 = function(x, y, z) {
          return cljs.core.some.call(null, function(p1__44324_SHARP_) {
            var or__3400__auto__ = p1__44324_SHARP_.call(null, x);
            if (cljs.core.truth_(or__3400__auto__)) {
              return or__3400__auto__;
            } else {
              var or__3400__auto____$1 = p1__44324_SHARP_.call(null, y);
              if (cljs.core.truth_(or__3400__auto____$1)) {
                return or__3400__auto____$1;
              } else {
                return p1__44324_SHARP_.call(null, z);
              }
            }
          }, ps__$1);
        };
        var spn__4 = function() {
          var G__44333__delegate = function(x, y, z, args) {
            var or__3400__auto__ = spn.call(null, x, y, z);
            if (cljs.core.truth_(or__3400__auto__)) {
              return or__3400__auto__;
            } else {
              return cljs.core.some.call(null, function(p1__44325_SHARP_) {
                return cljs.core.some.call(null, p1__44325_SHARP_, args);
              }, ps__$1);
            }
          };
          var G__44333 = function(x, y, z, var_args) {
            var args = null;
            if (arguments.length > 3) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
            }
            return G__44333__delegate.call(this, x, y, z, args);
          };
          G__44333.cljs$lang$maxFixedArity = 3;
          G__44333.cljs$lang$applyTo = function(arglist__44334) {
            var x = cljs.core.first(arglist__44334);
            arglist__44334 = cljs.core.next(arglist__44334);
            var y = cljs.core.first(arglist__44334);
            arglist__44334 = cljs.core.next(arglist__44334);
            var z = cljs.core.first(arglist__44334);
            var args = cljs.core.rest(arglist__44334);
            return G__44333__delegate(x, y, z, args);
          };
          G__44333.cljs$core$IFn$_invoke$arity$variadic = G__44333__delegate;
          return G__44333;
        }();
        spn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return spn__0.call(this);
            case 1:
              return spn__1.call(this, x);
            case 2:
              return spn__2.call(this, x, y);
            case 3:
              return spn__3.call(this, x, y, z);
            default:
              return spn__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
          }
          throw new Error("Invalid arity: " + arguments.length);
        };
        spn.cljs$lang$maxFixedArity = 3;
        spn.cljs$lang$applyTo = spn__4.cljs$lang$applyTo;
        spn.cljs$core$IFn$_invoke$arity$0 = spn__0;
        spn.cljs$core$IFn$_invoke$arity$1 = spn__1;
        spn.cljs$core$IFn$_invoke$arity$2 = spn__2;
        spn.cljs$core$IFn$_invoke$arity$3 = spn__3;
        spn.cljs$core$IFn$_invoke$arity$variadic = spn__4.cljs$core$IFn$_invoke$arity$variadic;
        return spn;
      }();
    };
    var G__44332 = function(p1, p2, p3, var_args) {
      var ps = null;
      if (arguments.length > 3) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44332__delegate.call(this, p1, p2, p3, ps);
    };
    G__44332.cljs$lang$maxFixedArity = 3;
    G__44332.cljs$lang$applyTo = function(arglist__44335) {
      var p1 = cljs.core.first(arglist__44335);
      arglist__44335 = cljs.core.next(arglist__44335);
      var p2 = cljs.core.first(arglist__44335);
      arglist__44335 = cljs.core.next(arglist__44335);
      var p3 = cljs.core.first(arglist__44335);
      var ps = cljs.core.rest(arglist__44335);
      return G__44332__delegate(p1, p2, p3, ps);
    };
    G__44332.cljs$core$IFn$_invoke$arity$variadic = G__44332__delegate;
    return G__44332;
  }();
  some_fn = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return some_fn__1.call(this, p1);
      case 2:
        return some_fn__2.call(this, p1, p2);
      case 3:
        return some_fn__3.call(this, p1, p2, p3);
      default:
        return some_fn__4.cljs$core$IFn$_invoke$arity$variadic(p1, p2, p3, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  some_fn.cljs$lang$maxFixedArity = 3;
  some_fn.cljs$lang$applyTo = some_fn__4.cljs$lang$applyTo;
  some_fn.cljs$core$IFn$_invoke$arity$1 = some_fn__1;
  some_fn.cljs$core$IFn$_invoke$arity$2 = some_fn__2;
  some_fn.cljs$core$IFn$_invoke$arity$3 = some_fn__3;
  some_fn.cljs$core$IFn$_invoke$arity$variadic = some_fn__4.cljs$core$IFn$_invoke$arity$variadic;
  return some_fn;
}();
cljs.core.map = function() {
  var map = null;
  var map__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
          var c = cljs.core.chunk_first.call(null, s);
          var size = cljs.core.count.call(null, c);
          var b = cljs.core.chunk_buffer.call(null, size);
          var n__4242__auto___44337 = size;
          var i_44338 = 0;
          while (true) {
            if (i_44338 < n__4242__auto___44337) {
              cljs.core.chunk_append.call(null, b, f.call(null, cljs.core._nth.call(null, c, i_44338)));
              var G__44339 = i_44338 + 1;
              i_44338 = G__44339;
              continue;
            } else {
            }
            break;
          }
          return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b), map.call(null, f, cljs.core.chunk_rest.call(null, s)));
        } else {
          return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s)), map.call(null, f, cljs.core.rest.call(null, s)));
        }
      } else {
        return null;
      }
    }, null, null);
  };
  var map__3 = function(f, c1, c2) {
    return new cljs.core.LazySeq(null, function() {
      var s1 = cljs.core.seq.call(null, c1);
      var s2 = cljs.core.seq.call(null, c2);
      if (s1 && s2) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1), cljs.core.first.call(null, s2)), map.call(null, f, cljs.core.rest.call(null, s1), cljs.core.rest.call(null, s2)));
      } else {
        return null;
      }
    }, null, null);
  };
  var map__4 = function(f, c1, c2, c3) {
    return new cljs.core.LazySeq(null, function() {
      var s1 = cljs.core.seq.call(null, c1);
      var s2 = cljs.core.seq.call(null, c2);
      var s3 = cljs.core.seq.call(null, c3);
      if (s1 && (s2 && s3)) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1), cljs.core.first.call(null, s2), cljs.core.first.call(null, s3)), map.call(null, f, cljs.core.rest.call(null, s1), cljs.core.rest.call(null, s2), cljs.core.rest.call(null, s3)));
      } else {
        return null;
      }
    }, null, null);
  };
  var map__5 = function() {
    var G__44340__delegate = function(f, c1, c2, c3, colls) {
      var step = function step(cs) {
        return new cljs.core.LazySeq(null, function() {
          var ss = map.call(null, cljs.core.seq, cs);
          if (cljs.core.every_QMARK_.call(null, cljs.core.identity, ss)) {
            return cljs.core.cons.call(null, map.call(null, cljs.core.first, ss), step.call(null, map.call(null, cljs.core.rest, ss)));
          } else {
            return null;
          }
        }, null, null);
      };
      return map.call(null, function(p1__44336_SHARP_) {
        return cljs.core.apply.call(null, f, p1__44336_SHARP_);
      }, step.call(null, cljs.core.conj.call(null, colls, c3, c2, c1)));
    };
    var G__44340 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if (arguments.length > 4) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0);
      }
      return G__44340__delegate.call(this, f, c1, c2, c3, colls);
    };
    G__44340.cljs$lang$maxFixedArity = 4;
    G__44340.cljs$lang$applyTo = function(arglist__44341) {
      var f = cljs.core.first(arglist__44341);
      arglist__44341 = cljs.core.next(arglist__44341);
      var c1 = cljs.core.first(arglist__44341);
      arglist__44341 = cljs.core.next(arglist__44341);
      var c2 = cljs.core.first(arglist__44341);
      arglist__44341 = cljs.core.next(arglist__44341);
      var c3 = cljs.core.first(arglist__44341);
      var colls = cljs.core.rest(arglist__44341);
      return G__44340__delegate(f, c1, c2, c3, colls);
    };
    G__44340.cljs$core$IFn$_invoke$arity$variadic = G__44340__delegate;
    return G__44340;
  }();
  map = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return map__2.call(this, f, c1);
      case 3:
        return map__3.call(this, f, c1, c2);
      case 4:
        return map__4.call(this, f, c1, c2, c3);
      default:
        return map__5.cljs$core$IFn$_invoke$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  map.cljs$lang$maxFixedArity = 4;
  map.cljs$lang$applyTo = map__5.cljs$lang$applyTo;
  map.cljs$core$IFn$_invoke$arity$2 = map__2;
  map.cljs$core$IFn$_invoke$arity$3 = map__3;
  map.cljs$core$IFn$_invoke$arity$4 = map__4;
  map.cljs$core$IFn$_invoke$arity$variadic = map__5.cljs$core$IFn$_invoke$arity$variadic;
  return map;
}();
cljs.core.take = function take(n, coll) {
  return new cljs.core.LazySeq(null, function() {
    if (n > 0) {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        return cljs.core.cons.call(null, cljs.core.first.call(null, s), take.call(null, n - 1, cljs.core.rest.call(null, s)));
      } else {
        return null;
      }
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.drop = function drop(n, coll) {
  var step = function(n__$1, coll__$1) {
    while (true) {
      var s = cljs.core.seq.call(null, coll__$1);
      if (n__$1 > 0 && s) {
        var G__44342 = n__$1 - 1;
        var G__44343 = cljs.core.rest.call(null, s);
        n__$1 = G__44342;
        coll__$1 = G__44343;
        continue;
      } else {
        return s;
      }
      break;
    }
  };
  return new cljs.core.LazySeq(null, function() {
    return step.call(null, n, coll);
  }, null, null);
};
cljs.core.drop_last = function() {
  var drop_last = null;
  var drop_last__1 = function(s) {
    return drop_last.call(null, 1, s);
  };
  var drop_last__2 = function(n, s) {
    return cljs.core.map.call(null, function(x, _) {
      return x;
    }, s, cljs.core.drop.call(null, n, s));
  };
  drop_last = function(n, s) {
    switch(arguments.length) {
      case 1:
        return drop_last__1.call(this, n);
      case 2:
        return drop_last__2.call(this, n, s);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  drop_last.cljs$core$IFn$_invoke$arity$1 = drop_last__1;
  drop_last.cljs$core$IFn$_invoke$arity$2 = drop_last__2;
  return drop_last;
}();
cljs.core.take_last = function take_last(n, coll) {
  var s = cljs.core.seq.call(null, coll);
  var lead = cljs.core.seq.call(null, cljs.core.drop.call(null, n, coll));
  while (true) {
    if (lead) {
      var G__44344 = cljs.core.next.call(null, s);
      var G__44345 = cljs.core.next.call(null, lead);
      s = G__44344;
      lead = G__44345;
      continue;
    } else {
      return s;
    }
    break;
  }
};
cljs.core.drop_while = function drop_while(pred, coll) {
  var step = function(pred__$1, coll__$1) {
    while (true) {
      var s = cljs.core.seq.call(null, coll__$1);
      if (cljs.core.truth_(function() {
        var and__3388__auto__ = s;
        if (and__3388__auto__) {
          return pred__$1.call(null, cljs.core.first.call(null, s));
        } else {
          return and__3388__auto__;
        }
      }())) {
        var G__44346 = pred__$1;
        var G__44347 = cljs.core.rest.call(null, s);
        pred__$1 = G__44346;
        coll__$1 = G__44347;
        continue;
      } else {
        return s;
      }
      break;
    }
  };
  return new cljs.core.LazySeq(null, function() {
    return step.call(null, pred, coll);
  }, null, null);
};
cljs.core.cycle = function cycle(coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      return cljs.core.concat.call(null, s, cycle.call(null, s));
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.split_at = function split_at(n, coll) {
  return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.take.call(null, n, coll), cljs.core.drop.call(null, n, coll)], null);
};
cljs.core.repeat = function() {
  var repeat = null;
  var repeat__1 = function(x) {
    return new cljs.core.LazySeq(null, function() {
      return cljs.core.cons.call(null, x, repeat.call(null, x));
    }, null, null);
  };
  var repeat__2 = function(n, x) {
    return cljs.core.take.call(null, n, repeat.call(null, x));
  };
  repeat = function(n, x) {
    switch(arguments.length) {
      case 1:
        return repeat__1.call(this, n);
      case 2:
        return repeat__2.call(this, n, x);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  repeat.cljs$core$IFn$_invoke$arity$1 = repeat__1;
  repeat.cljs$core$IFn$_invoke$arity$2 = repeat__2;
  return repeat;
}();
cljs.core.replicate = function replicate(n, x) {
  return cljs.core.take.call(null, n, cljs.core.repeat.call(null, x));
};
cljs.core.repeatedly = function() {
  var repeatedly = null;
  var repeatedly__1 = function(f) {
    return new cljs.core.LazySeq(null, function() {
      return cljs.core.cons.call(null, f.call(null), repeatedly.call(null, f));
    }, null, null);
  };
  var repeatedly__2 = function(n, f) {
    return cljs.core.take.call(null, n, repeatedly.call(null, f));
  };
  repeatedly = function(n, f) {
    switch(arguments.length) {
      case 1:
        return repeatedly__1.call(this, n);
      case 2:
        return repeatedly__2.call(this, n, f);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  repeatedly.cljs$core$IFn$_invoke$arity$1 = repeatedly__1;
  repeatedly.cljs$core$IFn$_invoke$arity$2 = repeatedly__2;
  return repeatedly;
}();
cljs.core.iterate = function iterate(f, x) {
  return cljs.core.cons.call(null, x, new cljs.core.LazySeq(null, function() {
    return iterate.call(null, f, f.call(null, x));
  }, null, null));
};
cljs.core.interleave = function() {
  var interleave = null;
  var interleave__2 = function(c1, c2) {
    return new cljs.core.LazySeq(null, function() {
      var s1 = cljs.core.seq.call(null, c1);
      var s2 = cljs.core.seq.call(null, c2);
      if (s1 && s2) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s1), cljs.core.cons.call(null, cljs.core.first.call(null, s2), interleave.call(null, cljs.core.rest.call(null, s1), cljs.core.rest.call(null, s2))));
      } else {
        return null;
      }
    }, null, null);
  };
  var interleave__3 = function() {
    var G__44348__delegate = function(c1, c2, colls) {
      return new cljs.core.LazySeq(null, function() {
        var ss = cljs.core.map.call(null, cljs.core.seq, cljs.core.conj.call(null, colls, c2, c1));
        if (cljs.core.every_QMARK_.call(null, cljs.core.identity, ss)) {
          return cljs.core.concat.call(null, cljs.core.map.call(null, cljs.core.first, ss), cljs.core.apply.call(null, interleave, cljs.core.map.call(null, cljs.core.rest, ss)));
        } else {
          return null;
        }
      }, null, null);
    };
    var G__44348 = function(c1, c2, var_args) {
      var colls = null;
      if (arguments.length > 2) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44348__delegate.call(this, c1, c2, colls);
    };
    G__44348.cljs$lang$maxFixedArity = 2;
    G__44348.cljs$lang$applyTo = function(arglist__44349) {
      var c1 = cljs.core.first(arglist__44349);
      arglist__44349 = cljs.core.next(arglist__44349);
      var c2 = cljs.core.first(arglist__44349);
      var colls = cljs.core.rest(arglist__44349);
      return G__44348__delegate(c1, c2, colls);
    };
    G__44348.cljs$core$IFn$_invoke$arity$variadic = G__44348__delegate;
    return G__44348;
  }();
  interleave = function(c1, c2, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return interleave__2.call(this, c1, c2);
      default:
        return interleave__3.cljs$core$IFn$_invoke$arity$variadic(c1, c2, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  interleave.cljs$lang$maxFixedArity = 2;
  interleave.cljs$lang$applyTo = interleave__3.cljs$lang$applyTo;
  interleave.cljs$core$IFn$_invoke$arity$2 = interleave__2;
  interleave.cljs$core$IFn$_invoke$arity$variadic = interleave__3.cljs$core$IFn$_invoke$arity$variadic;
  return interleave;
}();
cljs.core.interpose = function interpose(sep, coll) {
  return cljs.core.drop.call(null, 1, cljs.core.interleave.call(null, cljs.core.repeat.call(null, sep), coll));
};
cljs.core.flatten1 = function flatten1(colls) {
  var cat = function cat(coll, colls__$1) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4090__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4090__auto__) {
        var coll__$1 = temp__4090__auto__;
        return cljs.core.cons.call(null, cljs.core.first.call(null, coll__$1), cat.call(null, cljs.core.rest.call(null, coll__$1), colls__$1));
      } else {
        if (cljs.core.seq.call(null, colls__$1)) {
          return cat.call(null, cljs.core.first.call(null, colls__$1), cljs.core.rest.call(null, colls__$1));
        } else {
          return null;
        }
      }
    }, null, null);
  };
  return cat.call(null, null, colls);
};
cljs.core.mapcat = function() {
  var mapcat = null;
  var mapcat__2 = function(f, coll) {
    return cljs.core.flatten1.call(null, cljs.core.map.call(null, f, coll));
  };
  var mapcat__3 = function() {
    var G__44350__delegate = function(f, coll, colls) {
      return cljs.core.flatten1.call(null, cljs.core.apply.call(null, cljs.core.map, f, coll, colls));
    };
    var G__44350 = function(f, coll, var_args) {
      var colls = null;
      if (arguments.length > 2) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44350__delegate.call(this, f, coll, colls);
    };
    G__44350.cljs$lang$maxFixedArity = 2;
    G__44350.cljs$lang$applyTo = function(arglist__44351) {
      var f = cljs.core.first(arglist__44351);
      arglist__44351 = cljs.core.next(arglist__44351);
      var coll = cljs.core.first(arglist__44351);
      var colls = cljs.core.rest(arglist__44351);
      return G__44350__delegate(f, coll, colls);
    };
    G__44350.cljs$core$IFn$_invoke$arity$variadic = G__44350__delegate;
    return G__44350;
  }();
  mapcat = function(f, coll, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapcat__2.call(this, f, coll);
      default:
        return mapcat__3.cljs$core$IFn$_invoke$arity$variadic(f, coll, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  mapcat.cljs$lang$maxFixedArity = 2;
  mapcat.cljs$lang$applyTo = mapcat__3.cljs$lang$applyTo;
  mapcat.cljs$core$IFn$_invoke$arity$2 = mapcat__2;
  mapcat.cljs$core$IFn$_invoke$arity$variadic = mapcat__3.cljs$core$IFn$_invoke$arity$variadic;
  return mapcat;
}();
cljs.core.filter = function filter(pred, coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      if (cljs.core.chunked_seq_QMARK_.call(null, s)) {
        var c = cljs.core.chunk_first.call(null, s);
        var size = cljs.core.count.call(null, c);
        var b = cljs.core.chunk_buffer.call(null, size);
        var n__4242__auto___44352 = size;
        var i_44353 = 0;
        while (true) {
          if (i_44353 < n__4242__auto___44352) {
            if (cljs.core.truth_(pred.call(null, cljs.core._nth.call(null, c, i_44353)))) {
              cljs.core.chunk_append.call(null, b, cljs.core._nth.call(null, c, i_44353));
            } else {
            }
            var G__44354 = i_44353 + 1;
            i_44353 = G__44354;
            continue;
          } else {
          }
          break;
        }
        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b), filter.call(null, pred, cljs.core.chunk_rest.call(null, s)));
      } else {
        var f = cljs.core.first.call(null, s);
        var r = cljs.core.rest.call(null, s);
        if (cljs.core.truth_(pred.call(null, f))) {
          return cljs.core.cons.call(null, f, filter.call(null, pred, r));
        } else {
          return filter.call(null, pred, r);
        }
      }
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.remove = function remove(pred, coll) {
  return cljs.core.filter.call(null, cljs.core.complement.call(null, pred), coll);
};
cljs.core.tree_seq = function tree_seq(branch_QMARK_, children, root) {
  var walk = function walk(node) {
    return new cljs.core.LazySeq(null, function() {
      return cljs.core.cons.call(null, node, cljs.core.truth_(branch_QMARK_.call(null, node)) ? cljs.core.mapcat.call(null, walk, children.call(null, node)) : null);
    }, null, null);
  };
  return walk.call(null, root);
};
cljs.core.flatten = function flatten(x) {
  return cljs.core.filter.call(null, function(p1__44355_SHARP_) {
    return!cljs.core.sequential_QMARK_.call(null, p1__44355_SHARP_);
  }, cljs.core.rest.call(null, cljs.core.tree_seq.call(null, cljs.core.sequential_QMARK_, cljs.core.seq, x)));
};
cljs.core.into = function into(to, from) {
  if (!(to == null)) {
    if (function() {
      var G__44357 = to;
      if (G__44357) {
        var bit__4037__auto__ = G__44357.cljs$lang$protocol_mask$partition1$ & 4;
        if (bit__4037__auto__ || G__44357.cljs$core$IEditableCollection$) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }()) {
      return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core.transient$.call(null, to), from));
    } else {
      return cljs.core.reduce.call(null, cljs.core._conj, to, from);
    }
  } else {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, from);
  }
};
cljs.core.mapv = function() {
  var mapv = null;
  var mapv__2 = function(f, coll) {
    return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
      return cljs.core.conj_BANG_.call(null, v, f.call(null, o));
    }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll));
  };
  var mapv__3 = function(f, c1, c2) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2));
  };
  var mapv__4 = function(f, c1, c2, c3) {
    return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.map.call(null, f, c1, c2, c3));
  };
  var mapv__5 = function() {
    var G__44358__delegate = function(f, c1, c2, c3, colls) {
      return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, cljs.core.apply.call(null, cljs.core.map, f, c1, c2, c3, colls));
    };
    var G__44358 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if (arguments.length > 4) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0);
      }
      return G__44358__delegate.call(this, f, c1, c2, c3, colls);
    };
    G__44358.cljs$lang$maxFixedArity = 4;
    G__44358.cljs$lang$applyTo = function(arglist__44359) {
      var f = cljs.core.first(arglist__44359);
      arglist__44359 = cljs.core.next(arglist__44359);
      var c1 = cljs.core.first(arglist__44359);
      arglist__44359 = cljs.core.next(arglist__44359);
      var c2 = cljs.core.first(arglist__44359);
      arglist__44359 = cljs.core.next(arglist__44359);
      var c3 = cljs.core.first(arglist__44359);
      var colls = cljs.core.rest(arglist__44359);
      return G__44358__delegate(f, c1, c2, c3, colls);
    };
    G__44358.cljs$core$IFn$_invoke$arity$variadic = G__44358__delegate;
    return G__44358;
  }();
  mapv = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapv__2.call(this, f, c1);
      case 3:
        return mapv__3.call(this, f, c1, c2);
      case 4:
        return mapv__4.call(this, f, c1, c2, c3);
      default:
        return mapv__5.cljs$core$IFn$_invoke$arity$variadic(f, c1, c2, c3, cljs.core.array_seq(arguments, 4));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  mapv.cljs$lang$maxFixedArity = 4;
  mapv.cljs$lang$applyTo = mapv__5.cljs$lang$applyTo;
  mapv.cljs$core$IFn$_invoke$arity$2 = mapv__2;
  mapv.cljs$core$IFn$_invoke$arity$3 = mapv__3;
  mapv.cljs$core$IFn$_invoke$arity$4 = mapv__4;
  mapv.cljs$core$IFn$_invoke$arity$variadic = mapv__5.cljs$core$IFn$_invoke$arity$variadic;
  return mapv;
}();
cljs.core.filterv = function filterv(pred, coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(v, o) {
    if (cljs.core.truth_(pred.call(null, o))) {
      return cljs.core.conj_BANG_.call(null, v, o);
    } else {
      return v;
    }
  }, cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY), coll));
};
cljs.core.partition = function() {
  var partition = null;
  var partition__2 = function(n, coll) {
    return partition.call(null, n, n, coll);
  };
  var partition__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        var p = cljs.core.take.call(null, n, s);
        if (n === cljs.core.count.call(null, p)) {
          return cljs.core.cons.call(null, p, partition.call(null, n, step, cljs.core.drop.call(null, step, s)));
        } else {
          return null;
        }
      } else {
        return null;
      }
    }, null, null);
  };
  var partition__4 = function(n, step, pad, coll) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        var p = cljs.core.take.call(null, n, s);
        if (n === cljs.core.count.call(null, p)) {
          return cljs.core.cons.call(null, p, partition.call(null, n, step, pad, cljs.core.drop.call(null, step, s)));
        } else {
          return cljs.core._conj.call(null, cljs.core.List.EMPTY, cljs.core.take.call(null, n, cljs.core.concat.call(null, p, pad)));
        }
      } else {
        return null;
      }
    }, null, null);
  };
  partition = function(n, step, pad, coll) {
    switch(arguments.length) {
      case 2:
        return partition__2.call(this, n, step);
      case 3:
        return partition__3.call(this, n, step, pad);
      case 4:
        return partition__4.call(this, n, step, pad, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  partition.cljs$core$IFn$_invoke$arity$2 = partition__2;
  partition.cljs$core$IFn$_invoke$arity$3 = partition__3;
  partition.cljs$core$IFn$_invoke$arity$4 = partition__4;
  return partition;
}();
cljs.core.get_in = function() {
  var get_in = null;
  var get_in__2 = function(m, ks) {
    return get_in.call(null, m, ks, null);
  };
  var get_in__3 = function(m, ks, not_found) {
    var sentinel = cljs.core.lookup_sentinel;
    var m__$1 = m;
    var ks__$1 = cljs.core.seq.call(null, ks);
    while (true) {
      if (ks__$1) {
        if (!function() {
          var G__44361 = m__$1;
          if (G__44361) {
            var bit__4044__auto__ = G__44361.cljs$lang$protocol_mask$partition0$ & 256;
            if (bit__4044__auto__ || G__44361.cljs$core$ILookup$) {
              return true;
            } else {
              if (!G__44361.cljs$lang$protocol_mask$partition0$) {
                return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ILookup, G__44361);
              } else {
                return false;
              }
            }
          } else {
            return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.ILookup, G__44361);
          }
        }()) {
          return not_found;
        } else {
          var m__$2 = cljs.core.get.call(null, m__$1, cljs.core.first.call(null, ks__$1), sentinel);
          if (sentinel === m__$2) {
            return not_found;
          } else {
            var G__44362 = sentinel;
            var G__44363 = m__$2;
            var G__44364 = cljs.core.next.call(null, ks__$1);
            sentinel = G__44362;
            m__$1 = G__44363;
            ks__$1 = G__44364;
            continue;
          }
        }
      } else {
        return m__$1;
      }
      break;
    }
  };
  get_in = function(m, ks, not_found) {
    switch(arguments.length) {
      case 2:
        return get_in__2.call(this, m, ks);
      case 3:
        return get_in__3.call(this, m, ks, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  get_in.cljs$core$IFn$_invoke$arity$2 = get_in__2;
  get_in.cljs$core$IFn$_invoke$arity$3 = get_in__3;
  return get_in;
}();
cljs.core.assoc_in = function assoc_in(m, p__44365, v) {
  var vec__44367 = p__44365;
  var k = cljs.core.nth.call(null, vec__44367, 0, null);
  var ks = cljs.core.nthnext.call(null, vec__44367, 1);
  if (ks) {
    return cljs.core.assoc.call(null, m, k, assoc_in.call(null, cljs.core.get.call(null, m, k), ks, v));
  } else {
    return cljs.core.assoc.call(null, m, k, v);
  }
};
cljs.core.update_in = function() {
  var update_in = null;
  var update_in__3 = function(m, p__44368, f) {
    var vec__44378 = p__44368;
    var k = cljs.core.nth.call(null, vec__44378, 0, null);
    var ks = cljs.core.nthnext.call(null, vec__44378, 1);
    if (ks) {
      return cljs.core.assoc.call(null, m, k, update_in.call(null, cljs.core.get.call(null, m, k), ks, f));
    } else {
      return cljs.core.assoc.call(null, m, k, f.call(null, cljs.core.get.call(null, m, k)));
    }
  };
  var update_in__4 = function(m, p__44369, f, a) {
    var vec__44379 = p__44369;
    var k = cljs.core.nth.call(null, vec__44379, 0, null);
    var ks = cljs.core.nthnext.call(null, vec__44379, 1);
    if (ks) {
      return cljs.core.assoc.call(null, m, k, update_in.call(null, cljs.core.get.call(null, m, k), ks, f, a));
    } else {
      return cljs.core.assoc.call(null, m, k, f.call(null, cljs.core.get.call(null, m, k), a));
    }
  };
  var update_in__5 = function(m, p__44370, f, a, b) {
    var vec__44380 = p__44370;
    var k = cljs.core.nth.call(null, vec__44380, 0, null);
    var ks = cljs.core.nthnext.call(null, vec__44380, 1);
    if (ks) {
      return cljs.core.assoc.call(null, m, k, update_in.call(null, cljs.core.get.call(null, m, k), ks, f, a, b));
    } else {
      return cljs.core.assoc.call(null, m, k, f.call(null, cljs.core.get.call(null, m, k), a, b));
    }
  };
  var update_in__6 = function(m, p__44371, f, a, b, c) {
    var vec__44381 = p__44371;
    var k = cljs.core.nth.call(null, vec__44381, 0, null);
    var ks = cljs.core.nthnext.call(null, vec__44381, 1);
    if (ks) {
      return cljs.core.assoc.call(null, m, k, update_in.call(null, cljs.core.get.call(null, m, k), ks, f, a, b, c));
    } else {
      return cljs.core.assoc.call(null, m, k, f.call(null, cljs.core.get.call(null, m, k), a, b, c));
    }
  };
  var update_in__7 = function() {
    var G__44383__delegate = function(m, p__44372, f, a, b, c, args) {
      var vec__44382 = p__44372;
      var k = cljs.core.nth.call(null, vec__44382, 0, null);
      var ks = cljs.core.nthnext.call(null, vec__44382, 1);
      if (ks) {
        return cljs.core.assoc.call(null, m, k, cljs.core.apply.call(null, update_in, cljs.core.get.call(null, m, k), ks, f, a, b, c, args));
      } else {
        return cljs.core.assoc.call(null, m, k, cljs.core.apply.call(null, f, cljs.core.get.call(null, m, k), a, b, c, args));
      }
    };
    var G__44383 = function(m, p__44372, f, a, b, c, var_args) {
      var args = null;
      if (arguments.length > 6) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 6), 0);
      }
      return G__44383__delegate.call(this, m, p__44372, f, a, b, c, args);
    };
    G__44383.cljs$lang$maxFixedArity = 6;
    G__44383.cljs$lang$applyTo = function(arglist__44384) {
      var m = cljs.core.first(arglist__44384);
      arglist__44384 = cljs.core.next(arglist__44384);
      var p__44372 = cljs.core.first(arglist__44384);
      arglist__44384 = cljs.core.next(arglist__44384);
      var f = cljs.core.first(arglist__44384);
      arglist__44384 = cljs.core.next(arglist__44384);
      var a = cljs.core.first(arglist__44384);
      arglist__44384 = cljs.core.next(arglist__44384);
      var b = cljs.core.first(arglist__44384);
      arglist__44384 = cljs.core.next(arglist__44384);
      var c = cljs.core.first(arglist__44384);
      var args = cljs.core.rest(arglist__44384);
      return G__44383__delegate(m, p__44372, f, a, b, c, args);
    };
    G__44383.cljs$core$IFn$_invoke$arity$variadic = G__44383__delegate;
    return G__44383;
  }();
  update_in = function(m, p__44372, f, a, b, c, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 3:
        return update_in__3.call(this, m, p__44372, f);
      case 4:
        return update_in__4.call(this, m, p__44372, f, a);
      case 5:
        return update_in__5.call(this, m, p__44372, f, a, b);
      case 6:
        return update_in__6.call(this, m, p__44372, f, a, b, c);
      default:
        return update_in__7.cljs$core$IFn$_invoke$arity$variadic(m, p__44372, f, a, b, c, cljs.core.array_seq(arguments, 6));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  update_in.cljs$lang$maxFixedArity = 6;
  update_in.cljs$lang$applyTo = update_in__7.cljs$lang$applyTo;
  update_in.cljs$core$IFn$_invoke$arity$3 = update_in__3;
  update_in.cljs$core$IFn$_invoke$arity$4 = update_in__4;
  update_in.cljs$core$IFn$_invoke$arity$5 = update_in__5;
  update_in.cljs$core$IFn$_invoke$arity$6 = update_in__6;
  update_in.cljs$core$IFn$_invoke$arity$variadic = update_in__7.cljs$core$IFn$_invoke$arity$variadic;
  return update_in;
}();
cljs.core.VectorNode = function(edit, arr) {
  this.edit = edit;
  this.arr = arr;
};
cljs.core.VectorNode.cljs$lang$type = true;
cljs.core.VectorNode.cljs$lang$ctorStr = "cljs.core/VectorNode";
cljs.core.VectorNode.cljs$lang$ctorPrWriter = function(this__3965__auto__, writer__3966__auto__, opts__3967__auto__) {
  return cljs.core._write.call(null, writer__3966__auto__, "cljs.core/VectorNode");
};
cljs.core.__GT_VectorNode = function __GT_VectorNode(edit, arr) {
  return new cljs.core.VectorNode(edit, arr);
};
cljs.core.pv_fresh_node = function pv_fresh_node(edit) {
  return new cljs.core.VectorNode(edit, [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]);
};
cljs.core.pv_aget = function pv_aget(node, idx) {
  return node.arr[idx];
};
cljs.core.pv_aset = function pv_aset(node, idx, val) {
  return node.arr[idx] = val;
};
cljs.core.pv_clone_node = function pv_clone_node(node) {
  return new cljs.core.VectorNode(node.edit, cljs.core.aclone.call(null, node.arr));
};
cljs.core.tail_off = function tail_off(pv) {
  var cnt = pv.cnt;
  if (cnt < 32) {
    return 0;
  } else {
    return cnt - 1 >>> 5 << 5;
  }
};
cljs.core.new_path = function new_path(edit, level, node) {
  var ll = level;
  var ret = node;
  while (true) {
    if (ll === 0) {
      return ret;
    } else {
      var embed = ret;
      var r = cljs.core.pv_fresh_node.call(null, edit);
      var _ = cljs.core.pv_aset.call(null, r, 0, embed);
      var G__44385 = ll - 5;
      var G__44386 = r;
      ll = G__44385;
      ret = G__44386;
      continue;
    }
    break;
  }
};
cljs.core.push_tail = function push_tail(pv, level, parent, tailnode) {
  var ret = cljs.core.pv_clone_node.call(null, parent);
  var subidx = pv.cnt - 1 >>> level & 31;
  if (5 === level) {
    cljs.core.pv_aset.call(null, ret, subidx, tailnode);
    return ret;
  } else {
    var child = cljs.core.pv_aget.call(null, parent, subidx);
    if (!(child == null)) {
      var node_to_insert = push_tail.call(null, pv, level - 5, child, tailnode);
      cljs.core.pv_aset.call(null, ret, subidx, node_to_insert);
      return ret;
    } else {
      var node_to_insert = cljs.core.new_path.call(null, null, level - 5, tailnode);
      cljs.core.pv_aset.call(null, ret, subidx, node_to_insert);
      return ret;
    }
  }
};
cljs.core.vector_index_out_of_bounds = function vector_index_out_of_bounds(i, cnt) {
  throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in vector of length "), cljs.core.str(cnt)].join(""));
};
cljs.core.array_for = function array_for(pv, i) {
  if (0 <= i && i < pv.cnt) {
    if (i >= cljs.core.tail_off.call(null, pv)) {
      return pv.tail;
    } else {
      var node = pv.root;
      var level = pv.shift;
      while (true) {
        if (level > 0) {
          var G__44387 = cljs.core.pv_aget.call(null, node, i >>> level & 31);
          var G__44388 = level - 5;
          node = G__44387;
          level = G__44388;
          continue;
        } else {
          return node.arr;
        }
        break;
      }
    }
  } else {
    return cljs.core.vector_index_out_of_bounds.call(null, i, pv.cnt);
  }
};
cljs.core.do_assoc = function do_assoc(pv, level, node, i, val) {
  var ret = cljs.core.pv_clone_node.call(null, node);
  if (level === 0) {
    cljs.core.pv_aset.call(null, ret, i & 31, val);
    return ret;
  } else {
    var subidx = i >>> level & 31;
    cljs.core.pv_aset.call(null, ret, subidx, do_assoc.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx), i, val));
    return ret;
  }
};
cljs.core.pop_tail = function pop_tail(pv, level, node) {
  var subidx = pv.cnt - 2 >>> level & 31;
  if (level > 5) {
    var new_child = pop_tail.call(null, pv, level - 5, cljs.core.pv_aget.call(null, node, subidx));
    if (new_child == null && subidx === 0) {
      return null;
    } else {
      var ret = cljs.core.pv_clone_node.call(null, node);
      cljs.core.pv_aset.call(null, ret, subidx, new_child);
      return ret;
    }
  } else {
    if (subidx === 0) {
      return null;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        var ret = cljs.core.pv_clone_node.call(null, node);
        cljs.core.pv_aset.call(null, ret, subidx, null);
        return ret;
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentVector = function(meta, cnt, shift, root, tail, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 4;
  this.cljs$lang$protocol_mask$partition0$ = 167668511;
};
cljs.core.PersistentVector.cljs$lang$type = true;
cljs.core.PersistentVector.cljs$lang$ctorStr = "cljs.core/PersistentVector";
cljs.core.PersistentVector.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentVector");
};
cljs.core.PersistentVector.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.TransientVector(self__.cnt, self__.shift, cljs.core.tv_editable_root.call(null, self__.root), cljs.core.tv_editable_tail.call(null, self__.tail));
};
cljs.core.PersistentVector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, null);
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, not_found);
};
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var self__ = this;
  var coll__$1 = this;
  if (0 <= k && k < self__.cnt) {
    if (cljs.core.tail_off.call(null, coll__$1) <= k) {
      var new_tail = cljs.core.aclone.call(null, self__.tail);
      new_tail[k & 31] = v;
      return new cljs.core.PersistentVector(self__.meta, self__.cnt, self__.shift, self__.root, new_tail, null);
    } else {
      return new cljs.core.PersistentVector(self__.meta, self__.cnt, self__.shift, cljs.core.do_assoc.call(null, coll__$1, self__.shift, self__.root, k, v), self__.tail, null);
    }
  } else {
    if (k === self__.cnt) {
      return cljs.core._conj.call(null, coll__$1, v);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        throw new Error([cljs.core.str("Index "), cljs.core.str(k), cljs.core.str(" out of bounds  [0,"), cljs.core.str(self__.cnt), cljs.core.str("]")].join(""));
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentVector.prototype.call = function() {
  var G__44390 = null;
  var G__44390__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$IIndexed$_nth$arity$2(null, k);
  };
  var G__44390__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$IIndexed$_nth$arity$3(null, k, not_found);
  };
  G__44390 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44390__2.call(this, self__, k);
      case 3:
        return G__44390__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44390;
}();
cljs.core.PersistentVector.prototype.apply = function(self__, args44389) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44389)));
};
cljs.core.PersistentVector.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(null, k);
};
cljs.core.PersistentVector.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(null, k, not_found);
};
cljs.core.PersistentVector.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(v, f, init) {
  var self__ = this;
  var v__$1 = this;
  var step_init = [0, init];
  var i = 0;
  while (true) {
    if (i < self__.cnt) {
      var arr = cljs.core.array_for.call(null, v__$1, i);
      var len = arr.length;
      var init__$1 = function() {
        var j = 0;
        var init__$1 = step_init[1];
        while (true) {
          if (j < len) {
            var init__$2 = f.call(null, init__$1, j + i, arr[j]);
            if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
              return init__$2;
            } else {
              var G__44391 = j + 1;
              var G__44392 = init__$2;
              j = G__44391;
              init__$1 = G__44392;
              continue;
            }
          } else {
            step_init[0] = len;
            step_init[1] = init__$1;
            return init__$1;
          }
          break;
        }
      }();
      if (cljs.core.reduced_QMARK_.call(null, init__$1)) {
        return cljs.core.deref.call(null, init__$1);
      } else {
        var G__44393 = i + step_init[0];
        i = G__44393;
        continue;
      }
    } else {
      return step_init[1];
    }
    break;
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt - cljs.core.tail_off.call(null, coll__$1) < 32) {
    var len = self__.tail.length;
    var new_tail = new Array(len + 1);
    var n__4242__auto___44394 = len;
    var i_44395 = 0;
    while (true) {
      if (i_44395 < n__4242__auto___44394) {
        new_tail[i_44395] = self__.tail[i_44395];
        var G__44396 = i_44395 + 1;
        i_44395 = G__44396;
        continue;
      } else {
      }
      break;
    }
    new_tail[len] = o;
    return new cljs.core.PersistentVector(self__.meta, self__.cnt + 1, self__.shift, self__.root, new_tail, null);
  } else {
    var root_overflow_QMARK_ = self__.cnt >>> 5 > 1 << self__.shift;
    var new_shift = root_overflow_QMARK_ ? self__.shift + 5 : self__.shift;
    var new_root = root_overflow_QMARK_ ? function() {
      var n_r = cljs.core.pv_fresh_node.call(null, null);
      cljs.core.pv_aset.call(null, n_r, 0, self__.root);
      cljs.core.pv_aset.call(null, n_r, 1, cljs.core.new_path.call(null, null, self__.shift, new cljs.core.VectorNode(null, self__.tail)));
      return n_r;
    }() : cljs.core.push_tail.call(null, coll__$1, self__.shift, self__.root, new cljs.core.VectorNode(null, self__.tail));
    return new cljs.core.PersistentVector(self__.meta, self__.cnt + 1, new_shift, new_root, [o], null);
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    return new cljs.core.RSeq(coll__$1, self__.cnt - 1, null);
  } else {
    return null;
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_key$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, 0);
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_val$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, 1);
};
cljs.core.PersistentVector.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var self__ = this;
  var v__$1 = this;
  return cljs.core.ci_reduce.call(null, v__$1, f);
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var self__ = this;
  var v__$1 = this;
  return cljs.core.ci_reduce.call(null, v__$1, f, start);
};
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt === 0) {
    return null;
  } else {
    if (self__.cnt < 32) {
      return cljs.core.array_seq.call(null, self__.tail);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return cljs.core.chunked_seq.call(null, coll__$1, 0, 0);
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.cnt;
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    return cljs.core._nth.call(null, coll__$1, self__.cnt - 1);
  } else {
    return null;
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt === 0) {
    throw new Error("Can't pop empty vector");
  } else {
    if (1 === self__.cnt) {
      return cljs.core._with_meta.call(null, cljs.core.PersistentVector.EMPTY, self__.meta);
    } else {
      if (1 < self__.cnt - cljs.core.tail_off.call(null, coll__$1)) {
        return new cljs.core.PersistentVector(self__.meta, self__.cnt - 1, self__.shift, self__.root, self__.tail.slice(0, -1), null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var new_tail = cljs.core.array_for.call(null, coll__$1, self__.cnt - 2);
          var nr = cljs.core.pop_tail.call(null, coll__$1, self__.shift, self__.root);
          var new_root = nr == null ? cljs.core.PersistentVector.EMPTY_NODE : nr;
          var cnt_1 = self__.cnt - 1;
          if (5 < self__.shift && cljs.core.pv_aget.call(null, new_root, 1) == null) {
            return new cljs.core.PersistentVector(self__.meta, cnt_1, self__.shift - 5, cljs.core.pv_aget.call(null, new_root, 0), new_tail, null);
          } else {
            return new cljs.core.PersistentVector(self__.meta, cnt_1, self__.shift, new_root, new_tail, null);
          }
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._assoc.call(null, coll__$1, n, val);
};
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentVector(meta__$1, self__.cnt, self__.shift, self__.root, self__.tail, self__.__hash);
};
cljs.core.PersistentVector.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentVector(self__.meta, self__.cnt, self__.shift, self__.root, self__.tail, self__.__hash);
};
cljs.core.PersistentVector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_for.call(null, coll__$1, n)[n & 31];
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (0 <= n && n < self__.cnt) {
    return cljs.core._nth.call(null, coll__$1, n);
  } else {
    return not_found;
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, self__.meta);
};
cljs.core.__GT_PersistentVector = function __GT_PersistentVector(meta, cnt, shift, root, tail, __hash) {
  return new cljs.core.PersistentVector(meta, cnt, shift, root, tail, __hash);
};
cljs.core.PersistentVector.EMPTY_NODE = new cljs.core.VectorNode(null, [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]);
cljs.core.PersistentVector.EMPTY = new cljs.core.PersistentVector(null, 0, 5, cljs.core.PersistentVector.EMPTY_NODE, [], 0);
cljs.core.PersistentVector.fromArray = function(xs, no_clone) {
  var l = xs.length;
  var xs__$1 = no_clone ? xs : cljs.core.aclone.call(null, xs);
  if (l < 32) {
    return new cljs.core.PersistentVector(null, l, 5, cljs.core.PersistentVector.EMPTY_NODE, xs__$1, null);
  } else {
    var node = xs__$1.slice(0, 32);
    var v = new cljs.core.PersistentVector(null, 32, 5, cljs.core.PersistentVector.EMPTY_NODE, node, null);
    var i = 32;
    var out = cljs.core._as_transient.call(null, v);
    while (true) {
      if (i < l) {
        var G__44397 = i + 1;
        var G__44398 = cljs.core.conj_BANG_.call(null, out, xs__$1[i]);
        i = G__44397;
        out = G__44398;
        continue;
      } else {
        return cljs.core.persistent_BANG_.call(null, out);
      }
      break;
    }
  }
};
cljs.core.vec = function vec(coll) {
  return cljs.core._persistent_BANG_.call(null, cljs.core.reduce.call(null, cljs.core._conj_BANG_, cljs.core._as_transient.call(null, cljs.core.PersistentVector.EMPTY), coll));
};
cljs.core.vector = function() {
  var vector__delegate = function(args) {
    if (args instanceof cljs.core.IndexedSeq && args.i === 0) {
      return cljs.core.PersistentVector.fromArray.call(null, args.arr, true);
    } else {
      return cljs.core.vec.call(null, args);
    }
  };
  var vector = function(var_args) {
    var args = null;
    if (arguments.length > 0) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return vector__delegate.call(this, args);
  };
  vector.cljs$lang$maxFixedArity = 0;
  vector.cljs$lang$applyTo = function(arglist__44399) {
    var args = cljs.core.seq(arglist__44399);
    return vector__delegate(args);
  };
  vector.cljs$core$IFn$_invoke$arity$variadic = vector__delegate;
  return vector;
}();
cljs.core.ChunkedSeq = function(vec, node, i, off, meta, __hash) {
  this.vec = vec;
  this.node = node;
  this.i = i;
  this.off = off;
  this.meta = meta;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition0$ = 32243948;
  this.cljs$lang$protocol_mask$partition1$ = 1536;
};
cljs.core.ChunkedSeq.cljs$lang$type = true;
cljs.core.ChunkedSeq.cljs$lang$ctorStr = "cljs.core/ChunkedSeq";
cljs.core.ChunkedSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ChunkedSeq");
};
cljs.core.ChunkedSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.off + 1 < self__.node.length) {
    var s = cljs.core.chunked_seq.call(null, self__.vec, self__.node, self__.i, self__.off + 1);
    if (s == null) {
      return null;
    } else {
      return s;
    }
  } else {
    return cljs.core._chunked_next.call(null, coll__$1);
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.ChunkedSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.ci_reduce.call(null, cljs.core.subvec.call(null, self__.vec, self__.i + self__.off, cljs.core.count.call(null, self__.vec)), f);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.ci_reduce.call(null, cljs.core.subvec.call(null, self__.vec, self__.i + self__.off, cljs.core.count.call(null, self__.vec)), f, start);
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.node[self__.off];
};
cljs.core.ChunkedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.off + 1 < self__.node.length) {
    var s = cljs.core.chunked_seq.call(null, self__.vec, self__.node, self__.i, self__.off + 1);
    if (s == null) {
      return cljs.core.List.EMPTY;
    } else {
      return s;
    }
  } else {
    return cljs.core._chunked_rest.call(null, coll__$1);
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedNext$_chunked_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var l = self__.node.length;
  var s = self__.i + l < cljs.core._count.call(null, self__.vec) ? cljs.core.chunked_seq.call(null, self__.vec, self__.i + l, 0) : null;
  if (s == null) {
    return null;
  } else {
    return s;
  }
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, m) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.chunked_seq.call(null, self__.vec, self__.node, self__.i, self__.off, m);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IWithMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.ChunkedSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, self__.meta);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.array_chunk.call(null, self__.node, self__.off);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IChunkedSeq$_chunked_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var l = self__.node.length;
  var s = self__.i + l < cljs.core._count.call(null, self__.vec) ? cljs.core.chunked_seq.call(null, self__.vec, self__.i + l, 0) : null;
  if (s == null) {
    return cljs.core.List.EMPTY;
  } else {
    return s;
  }
};
cljs.core.__GT_ChunkedSeq = function __GT_ChunkedSeq(vec, node, i, off, meta, __hash) {
  return new cljs.core.ChunkedSeq(vec, node, i, off, meta, __hash);
};
cljs.core.chunked_seq = function() {
  var chunked_seq = null;
  var chunked_seq__3 = function(vec, i, off) {
    return new cljs.core.ChunkedSeq(vec, cljs.core.array_for.call(null, vec, i), i, off, null, null);
  };
  var chunked_seq__4 = function(vec, node, i, off) {
    return new cljs.core.ChunkedSeq(vec, node, i, off, null, null);
  };
  var chunked_seq__5 = function(vec, node, i, off, meta) {
    return new cljs.core.ChunkedSeq(vec, node, i, off, meta, null);
  };
  chunked_seq = function(vec, node, i, off, meta) {
    switch(arguments.length) {
      case 3:
        return chunked_seq__3.call(this, vec, node, i);
      case 4:
        return chunked_seq__4.call(this, vec, node, i, off);
      case 5:
        return chunked_seq__5.call(this, vec, node, i, off, meta);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  chunked_seq.cljs$core$IFn$_invoke$arity$3 = chunked_seq__3;
  chunked_seq.cljs$core$IFn$_invoke$arity$4 = chunked_seq__4;
  chunked_seq.cljs$core$IFn$_invoke$arity$5 = chunked_seq__5;
  return chunked_seq;
}();
cljs.core.Subvec = function(meta, v, start, end, __hash) {
  this.meta = meta;
  this.v = v;
  this.start = start;
  this.end = end;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32400159;
};
cljs.core.Subvec.cljs$lang$type = true;
cljs.core.Subvec.cljs$lang$ctorStr = "cljs.core/Subvec";
cljs.core.Subvec.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Subvec");
};
cljs.core.Subvec.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, null);
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, not_found);
};
cljs.core.Subvec.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, key, val) {
  var self__ = this;
  var coll__$1 = this;
  var v_pos = self__.start + key;
  return cljs.core.build_subvec.call(null, self__.meta, cljs.core.assoc.call(null, self__.v, v_pos, val), self__.start, function() {
    var x__3707__auto__ = self__.end;
    var y__3708__auto__ = v_pos + 1;
    return x__3707__auto__ > y__3708__auto__ ? x__3707__auto__ : y__3708__auto__;
  }(), null);
};
cljs.core.Subvec.prototype.call = function() {
  var G__44401 = null;
  var G__44401__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$IIndexed$_nth$arity$2(null, k);
  };
  var G__44401__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$IIndexed$_nth$arity$3(null, k, not_found);
  };
  G__44401 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44401__2.call(this, self__, k);
      case 3:
        return G__44401__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44401;
}();
cljs.core.Subvec.prototype.apply = function(self__, args44400) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44400)));
};
cljs.core.Subvec.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$IIndexed$_nth$arity$2(null, k);
};
cljs.core.Subvec.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$IIndexed$_nth$arity$3(null, k, not_found);
};
cljs.core.Subvec.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.build_subvec.call(null, self__.meta, cljs.core._assoc_n.call(null, self__.v, self__.end, o), self__.start, self__.end + 1, null);
};
cljs.core.Subvec.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.ci_reduce.call(null, coll__$1, f);
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start__$1) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.ci_reduce.call(null, coll__$1, f, start__$1);
};
cljs.core.Subvec.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var subvec_seq = function subvec_seq(i) {
    if (i === self__.end) {
      return null;
    } else {
      return cljs.core.cons.call(null, cljs.core._nth.call(null, self__.v, i), new cljs.core.LazySeq(null, function() {
        return subvec_seq.call(null, i + 1);
      }, null, null));
    }
  };
  return subvec_seq.call(null, self__.start);
};
cljs.core.Subvec.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.end - self__.start;
};
cljs.core.Subvec.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, self__.v, self__.end - 1);
};
cljs.core.Subvec.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.start === self__.end) {
    throw new Error("Can't pop empty vector");
  } else {
    return cljs.core.build_subvec.call(null, self__.meta, self__.v, self__.start, self__.end - 1, null);
  }
};
cljs.core.Subvec.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._assoc.call(null, coll__$1, n, val);
};
cljs.core.Subvec.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.Subvec.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.build_subvec.call(null, meta__$1, self__.v, self__.start, self__.end, self__.__hash);
};
cljs.core.Subvec.prototype.cljs$core$ICloneable$ = true;
cljs.core.Subvec.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Subvec(self__.meta, self__.v, self__.start, self__.end, self__.__hash);
};
cljs.core.Subvec.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var self__ = this;
  var coll__$1 = this;
  if (n < 0 || self__.end <= self__.start + n) {
    return cljs.core.vector_index_out_of_bounds.call(null, n, self__.end - self__.start);
  } else {
    return cljs.core._nth.call(null, self__.v, self__.start + n);
  }
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (n < 0 || self__.end <= self__.start + n) {
    return not_found;
  } else {
    return cljs.core._nth.call(null, self__.v, self__.start + n, not_found);
  }
};
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, self__.meta);
};
cljs.core.__GT_Subvec = function __GT_Subvec(meta, v, start, end, __hash) {
  return new cljs.core.Subvec(meta, v, start, end, __hash);
};
cljs.core.build_subvec = function build_subvec(meta, v, start, end, __hash) {
  while (true) {
    if (v instanceof cljs.core.Subvec) {
      var G__44402 = meta;
      var G__44403 = v.v;
      var G__44404 = v.start + start;
      var G__44405 = v.start + end;
      var G__44406 = __hash;
      meta = G__44402;
      v = G__44403;
      start = G__44404;
      end = G__44405;
      __hash = G__44406;
      continue;
    } else {
      var c = cljs.core.count.call(null, v);
      if (start < 0 || (end < 0 || (start > c || end > c))) {
        throw new Error("Index out of bounds");
      } else {
      }
      return new cljs.core.Subvec(meta, v, start, end, __hash);
    }
    break;
  }
};
cljs.core.subvec = function() {
  var subvec = null;
  var subvec__2 = function(v, start) {
    return subvec.call(null, v, start, cljs.core.count.call(null, v));
  };
  var subvec__3 = function(v, start, end) {
    return cljs.core.build_subvec.call(null, null, v, start, end, null);
  };
  subvec = function(v, start, end) {
    switch(arguments.length) {
      case 2:
        return subvec__2.call(this, v, start);
      case 3:
        return subvec__3.call(this, v, start, end);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  subvec.cljs$core$IFn$_invoke$arity$2 = subvec__2;
  subvec.cljs$core$IFn$_invoke$arity$3 = subvec__3;
  return subvec;
}();
cljs.core.tv_ensure_editable = function tv_ensure_editable(edit, node) {
  if (edit === node.edit) {
    return node;
  } else {
    return new cljs.core.VectorNode(edit, cljs.core.aclone.call(null, node.arr));
  }
};
cljs.core.tv_editable_root = function tv_editable_root(node) {
  return new cljs.core.VectorNode(function() {
    var obj44410 = {};
    return obj44410;
  }(), cljs.core.aclone.call(null, node.arr));
};
cljs.core.tv_editable_tail = function tv_editable_tail(tl) {
  var ret = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
  cljs.core.array_copy.call(null, tl, 0, ret, 0, tl.length);
  return ret;
};
cljs.core.tv_push_tail = function tv_push_tail(tv, level, parent, tail_node) {
  var ret = cljs.core.tv_ensure_editable.call(null, tv.root.edit, parent);
  var subidx = tv.cnt - 1 >>> level & 31;
  cljs.core.pv_aset.call(null, ret, subidx, level === 5 ? tail_node : function() {
    var child = cljs.core.pv_aget.call(null, ret, subidx);
    if (!(child == null)) {
      return tv_push_tail.call(null, tv, level - 5, child, tail_node);
    } else {
      return cljs.core.new_path.call(null, tv.root.edit, level - 5, tail_node);
    }
  }());
  return ret;
};
cljs.core.tv_pop_tail = function tv_pop_tail(tv, level, node) {
  var node__$1 = cljs.core.tv_ensure_editable.call(null, tv.root.edit, node);
  var subidx = tv.cnt - 2 >>> level & 31;
  if (level > 5) {
    var new_child = tv_pop_tail.call(null, tv, level - 5, cljs.core.pv_aget.call(null, node__$1, subidx));
    if (new_child == null && subidx === 0) {
      return null;
    } else {
      cljs.core.pv_aset.call(null, node__$1, subidx, new_child);
      return node__$1;
    }
  } else {
    if (subidx === 0) {
      return null;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        cljs.core.pv_aset.call(null, node__$1, subidx, null);
        return node__$1;
      } else {
        return null;
      }
    }
  }
};
cljs.core.editable_array_for = function editable_array_for(tv, i) {
  if (0 <= i && i < tv.cnt) {
    if (i >= cljs.core.tail_off.call(null, tv)) {
      return tv.tail;
    } else {
      var root = tv.root;
      var node = root;
      var level = tv.shift;
      while (true) {
        if (level > 0) {
          var G__44411 = cljs.core.tv_ensure_editable.call(null, root.edit, cljs.core.pv_aget.call(null, node, i >>> level & 31));
          var G__44412 = level - 5;
          node = G__44411;
          level = G__44412;
          continue;
        } else {
          return node.arr;
        }
        break;
      }
    }
  } else {
    throw new Error([cljs.core.str("No item "), cljs.core.str(i), cljs.core.str(" in transient vector of length "), cljs.core.str(tv.cnt)].join(""));
  }
};
cljs.core.TransientVector = function(cnt, shift, root, tail) {
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail;
  this.cljs$lang$protocol_mask$partition0$ = 275;
  this.cljs$lang$protocol_mask$partition1$ = 88;
};
cljs.core.TransientVector.cljs$lang$type = true;
cljs.core.TransientVector.cljs$lang$ctorStr = "cljs.core/TransientVector";
cljs.core.TransientVector.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/TransientVector");
};
cljs.core.TransientVector.prototype.call = function() {
  var G__44414 = null;
  var G__44414__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44414__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44414 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44414__2.call(this, self__, k);
      case 3:
        return G__44414__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44414;
}();
cljs.core.TransientVector.prototype.apply = function(self__, args44413) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44413)));
};
cljs.core.TransientVector.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.TransientVector.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, null);
};
cljs.core.TransientVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._nth.call(null, coll__$1, k, not_found);
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.root.edit) {
    return cljs.core.array_for.call(null, coll__$1, n)[n & 31];
  } else {
    throw new Error("nth after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (0 <= n && n < self__.cnt) {
    return cljs.core._nth.call(null, coll__$1, n);
  } else {
    return not_found;
  }
};
cljs.core.TransientVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.root.edit) {
    return self__.cnt;
  } else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_assoc_n_BANG_$arity$3 = function(tcoll, n, val) {
  var self__ = this;
  var tcoll__$1 = this;
  if (self__.root.edit) {
    if (0 <= n && n < self__.cnt) {
      if (cljs.core.tail_off.call(null, tcoll__$1) <= n) {
        self__.tail[n & 31] = val;
        return tcoll__$1;
      } else {
        var new_root = function go(level, node) {
          var node__$1 = cljs.core.tv_ensure_editable.call(null, self__.root.edit, node);
          if (level === 0) {
            cljs.core.pv_aset.call(null, node__$1, n & 31, val);
            return node__$1;
          } else {
            var subidx = n >>> level & 31;
            cljs.core.pv_aset.call(null, node__$1, subidx, go.call(null, level - 5, cljs.core.pv_aget.call(null, node__$1, subidx)));
            return node__$1;
          }
        }.call(null, self__.shift, self__.root);
        self__.root = new_root;
        return tcoll__$1;
      }
    } else {
      if (n === self__.cnt) {
        return cljs.core._conj_BANG_.call(null, tcoll__$1, val);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          throw new Error([cljs.core.str("Index "), cljs.core.str(n), cljs.core.str(" out of bounds for TransientVector of length"), cljs.core.str(self__.cnt)].join(""));
        } else {
          return null;
        }
      }
    }
  } else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientVector$_pop_BANG_$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  if (self__.root.edit) {
    if (self__.cnt === 0) {
      throw new Error("Can't pop empty vector");
    } else {
      if (1 === self__.cnt) {
        self__.cnt = 0;
        return tcoll__$1;
      } else {
        if ((self__.cnt - 1 & 31) > 0) {
          self__.cnt = self__.cnt - 1;
          return tcoll__$1;
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            var new_tail = cljs.core.editable_array_for.call(null, tcoll__$1, self__.cnt - 2);
            var new_root = function() {
              var nr = cljs.core.tv_pop_tail.call(null, tcoll__$1, self__.shift, self__.root);
              if (!(nr == null)) {
                return nr;
              } else {
                return new cljs.core.VectorNode(self__.root.edit, [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]);
              }
            }();
            if (5 < self__.shift && cljs.core.pv_aget.call(null, new_root, 1) == null) {
              var new_root__$1 = cljs.core.tv_ensure_editable.call(null, self__.root.edit, cljs.core.pv_aget.call(null, new_root, 0));
              self__.root = new_root__$1;
              self__.shift = self__.shift - 5;
              self__.cnt = self__.cnt - 1;
              self__.tail = new_tail;
              return tcoll__$1;
            } else {
              self__.root = new_root;
              self__.cnt = self__.cnt - 1;
              self__.tail = new_tail;
              return tcoll__$1;
            }
          } else {
            return null;
          }
        }
      }
    }
  } else {
    throw new Error("pop! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var self__ = this;
  var tcoll__$1 = this;
  return cljs.core._assoc_n_BANG_.call(null, tcoll__$1, key, val);
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var self__ = this;
  var tcoll__$1 = this;
  if (self__.root.edit) {
    if (self__.cnt - cljs.core.tail_off.call(null, tcoll__$1) < 32) {
      self__.tail[self__.cnt & 31] = o;
      self__.cnt = self__.cnt + 1;
      return tcoll__$1;
    } else {
      var tail_node = new cljs.core.VectorNode(self__.root.edit, self__.tail);
      var new_tail = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
      new_tail[0] = o;
      self__.tail = new_tail;
      if (self__.cnt >>> 5 > 1 << self__.shift) {
        var new_root_array = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
        var new_shift = self__.shift + 5;
        new_root_array[0] = self__.root;
        new_root_array[1] = cljs.core.new_path.call(null, self__.root.edit, self__.shift, tail_node);
        self__.root = new cljs.core.VectorNode(self__.root.edit, new_root_array);
        self__.shift = new_shift;
        self__.cnt = self__.cnt + 1;
        return tcoll__$1;
      } else {
        var new_root = cljs.core.tv_push_tail.call(null, tcoll__$1, self__.shift, self__.root, tail_node);
        self__.root = new_root;
        self__.cnt = self__.cnt + 1;
        return tcoll__$1;
      }
    }
  } else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientVector.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  if (self__.root.edit) {
    self__.root.edit = null;
    var len = self__.cnt - cljs.core.tail_off.call(null, tcoll__$1);
    var trimmed_tail = new Array(len);
    cljs.core.array_copy.call(null, self__.tail, 0, trimmed_tail, 0, len);
    return new cljs.core.PersistentVector(null, self__.cnt, self__.shift, self__.root, trimmed_tail, null);
  } else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.__GT_TransientVector = function __GT_TransientVector(cnt, shift, root, tail) {
  return new cljs.core.TransientVector(cnt, shift, root, tail);
};
cljs.core.PersistentQueueSeq = function(meta, front, rear, __hash) {
  this.meta = meta;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31850572;
};
cljs.core.PersistentQueueSeq.cljs$lang$type = true;
cljs.core.PersistentQueueSeq.cljs$lang$ctorStr = "cljs.core/PersistentQueueSeq";
cljs.core.PersistentQueueSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentQueueSeq");
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.PersistentQueueSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.first.call(null, self__.front);
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var temp__4090__auto__ = cljs.core.next.call(null, self__.front);
  if (temp__4090__auto__) {
    var f1 = temp__4090__auto__;
    return new cljs.core.PersistentQueueSeq(self__.meta, f1, self__.rear, null);
  } else {
    if (self__.rear == null) {
      return cljs.core._empty.call(null, coll__$1);
    } else {
      return new cljs.core.PersistentQueueSeq(self__.meta, self__.rear, null, null);
    }
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentQueueSeq(meta__$1, self__.front, self__.rear, self__.__hash);
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_PersistentQueueSeq = function __GT_PersistentQueueSeq(meta, front, rear, __hash) {
  return new cljs.core.PersistentQueueSeq(meta, front, rear, __hash);
};
cljs.core.PersistentQueue = function(meta, count, front, rear, __hash) {
  this.meta = meta;
  this.count = count;
  this.front = front;
  this.rear = rear;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 31858766;
};
cljs.core.PersistentQueue.cljs$lang$type = true;
cljs.core.PersistentQueue.cljs$lang$ctorStr = "cljs.core/PersistentQueue";
cljs.core.PersistentQueue.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentQueue");
};
cljs.core.PersistentQueue.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.truth_(self__.front)) {
    return new cljs.core.PersistentQueue(self__.meta, self__.count + 1, self__.front, cljs.core.conj.call(null, function() {
      var or__3400__auto__ = self__.rear;
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return cljs.core.PersistentVector.EMPTY;
      }
    }(), o), null);
  } else {
    return new cljs.core.PersistentQueue(self__.meta, self__.count + 1, cljs.core.conj.call(null, self__.front, o), cljs.core.PersistentVector.EMPTY, null);
  }
};
cljs.core.PersistentQueue.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var rear__$1 = cljs.core.seq.call(null, self__.rear);
  if (cljs.core.truth_(function() {
    var or__3400__auto__ = self__.front;
    if (cljs.core.truth_(or__3400__auto__)) {
      return or__3400__auto__;
    } else {
      return rear__$1;
    }
  }())) {
    return new cljs.core.PersistentQueueSeq(null, self__.front, cljs.core.seq.call(null, rear__$1), null);
  } else {
    return null;
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.count;
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.first.call(null, self__.front);
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.truth_(self__.front)) {
    var temp__4090__auto__ = cljs.core.next.call(null, self__.front);
    if (temp__4090__auto__) {
      var f1 = temp__4090__auto__;
      return new cljs.core.PersistentQueue(self__.meta, self__.count - 1, f1, self__.rear, null);
    } else {
      return new cljs.core.PersistentQueue(self__.meta, self__.count - 1, cljs.core.seq.call(null, self__.rear), cljs.core.PersistentVector.EMPTY, null);
    }
  } else {
    return coll__$1;
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.first.call(null, self__.front);
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.rest.call(null, cljs.core.seq.call(null, coll__$1));
};
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentQueue(meta__$1, self__.count, self__.front, self__.rear, self__.__hash);
};
cljs.core.PersistentQueue.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICloneable$_clone$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentQueue(self__.meta, self__.count, self__.front, self__.rear, self__.__hash);
};
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.PersistentQueue.EMPTY;
};
cljs.core.__GT_PersistentQueue = function __GT_PersistentQueue(meta, count, front, rear, __hash) {
  return new cljs.core.PersistentQueue(meta, count, front, rear, __hash);
};
cljs.core.PersistentQueue.EMPTY = new cljs.core.PersistentQueue(null, 0, null, cljs.core.PersistentVector.EMPTY, 0);
cljs.core.NeverEquiv = function() {
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2097152;
};
cljs.core.NeverEquiv.cljs$lang$type = true;
cljs.core.NeverEquiv.cljs$lang$ctorStr = "cljs.core/NeverEquiv";
cljs.core.NeverEquiv.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/NeverEquiv");
};
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var self__ = this;
  var o__$1 = this;
  return false;
};
cljs.core.__GT_NeverEquiv = function __GT_NeverEquiv() {
  return new cljs.core.NeverEquiv;
};
cljs.core.never_equiv = new cljs.core.NeverEquiv;
cljs.core.equiv_map = function equiv_map(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.map_QMARK_.call(null, y) ? cljs.core.count.call(null, x) === cljs.core.count.call(null, y) ? cljs.core.every_QMARK_.call(null, cljs.core.identity, cljs.core.map.call(null, function(xkv) {
    return cljs.core._EQ_.call(null, cljs.core.get.call(null, y, cljs.core.first.call(null, xkv), cljs.core.never_equiv), cljs.core.second.call(null, xkv));
  }, x)) : null : null);
};
cljs.core.scan_array = function scan_array(incr, k, array) {
  var len = array.length;
  var i = 0;
  while (true) {
    if (i < len) {
      if (k === array[i]) {
        return i;
      } else {
        var G__44415 = i + incr;
        i = G__44415;
        continue;
      }
    } else {
      return null;
    }
    break;
  }
};
cljs.core.obj_map_compare_keys = function obj_map_compare_keys(a, b) {
  var a__$1 = cljs.core.hash.call(null, a);
  var b__$1 = cljs.core.hash.call(null, b);
  if (a__$1 < b__$1) {
    return-1;
  } else {
    if (a__$1 > b__$1) {
      return 1;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return 0;
      } else {
        return null;
      }
    }
  }
};
cljs.core.obj_map__GT_hash_map = function obj_map__GT_hash_map(m, k, v) {
  var ks = m.keys;
  var len = ks.length;
  var so = m.strobj;
  var mm = cljs.core.meta.call(null, m);
  var i = 0;
  var out = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  while (true) {
    if (i < len) {
      var k__$1 = ks[i];
      var G__44416 = i + 1;
      var G__44417 = cljs.core.assoc_BANG_.call(null, out, k__$1, so[k__$1]);
      i = G__44416;
      out = G__44417;
      continue;
    } else {
      return cljs.core.with_meta.call(null, cljs.core.persistent_BANG_.call(null, cljs.core.assoc_BANG_.call(null, out, k, v)), mm);
    }
    break;
  }
};
cljs.core.obj_clone = function obj_clone(obj, ks) {
  var new_obj = function() {
    var obj44421 = {};
    return obj44421;
  }();
  var l = ks.length;
  var i_44422 = 0;
  while (true) {
    if (i_44422 < l) {
      var k_44423 = ks[i_44422];
      new_obj[k_44423] = obj[k_44423];
      var G__44424 = i_44422 + 1;
      i_44422 = G__44424;
      continue;
    } else {
    }
    break;
  }
  return new_obj;
};
cljs.core.ObjMap = function(meta, keys, strobj, update_count, __hash) {
  this.meta = meta;
  this.keys = keys;
  this.strobj = strobj;
  this.update_count = update_count;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 4;
  this.cljs$lang$protocol_mask$partition0$ = 16123663;
};
cljs.core.ObjMap.cljs$lang$type = true;
cljs.core.ObjMap.cljs$lang$ctorStr = "cljs.core/ObjMap";
cljs.core.ObjMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ObjMap");
};
cljs.core.ObjMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.transient$.call(null, cljs.core.into.call(null, cljs.core.PersistentHashMap.EMPTY, coll__$1));
};
cljs.core.ObjMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_imap.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, k, null);
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (goog.isString(k) && !(cljs.core.scan_array.call(null, 1, k, self__.keys) == null)) {
    return self__.strobj[k];
  } else {
    return not_found;
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var self__ = this;
  var coll__$1 = this;
  if (goog.isString(k)) {
    if (self__.update_count > cljs.core.ObjMap.HASHMAP_THRESHOLD || self__.keys.length >= cljs.core.ObjMap.HASHMAP_THRESHOLD) {
      return cljs.core.obj_map__GT_hash_map.call(null, coll__$1, k, v);
    } else {
      if (!(cljs.core.scan_array.call(null, 1, k, self__.keys) == null)) {
        var new_strobj = cljs.core.obj_clone.call(null, self__.strobj, self__.keys);
        new_strobj[k] = v;
        return new cljs.core.ObjMap(self__.meta, self__.keys, new_strobj, self__.update_count + 1, null);
      } else {
        var new_strobj = cljs.core.obj_clone.call(null, self__.strobj, self__.keys);
        var new_keys = cljs.core.aclone.call(null, self__.keys);
        new_strobj[k] = v;
        new_keys.push(k);
        return new cljs.core.ObjMap(self__.meta, new_keys, new_strobj, self__.update_count + 1, null);
      }
    }
  } else {
    return cljs.core.obj_map__GT_hash_map.call(null, coll__$1, k, v);
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  if (goog.isString(k) && !(cljs.core.scan_array.call(null, 1, k, self__.keys) == null)) {
    return true;
  } else {
    return false;
  }
};
cljs.core.ObjMap.prototype.call = function() {
  var G__44427 = null;
  var G__44427__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44427__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44427 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44427__2.call(this, self__, k);
      case 3:
        return G__44427__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44427;
}();
cljs.core.ObjMap.prototype.apply = function(self__, args44426) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44426)));
};
cljs.core.ObjMap.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.ObjMap.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.ObjMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var self__ = this;
  var coll__$1 = this;
  var len = self__.keys.length;
  var keys__$1 = self__.keys.sort(cljs.core.obj_map_compare_keys);
  var init__$1 = init;
  while (true) {
    if (cljs.core.seq.call(null, keys__$1)) {
      var k = cljs.core.first.call(null, keys__$1);
      var init__$2 = f.call(null, init__$1, k, self__.strobj[k]);
      if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
        return cljs.core.deref.call(null, init__$2);
      } else {
        var G__44428 = cljs.core.rest.call(null, keys__$1);
        var G__44429 = init__$2;
        keys__$1 = G__44428;
        init__$1 = G__44429;
        continue;
      }
    } else {
      return init__$1;
    }
    break;
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll__$1, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1));
  } else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll__$1, entry);
  }
};
cljs.core.ObjMap.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.ObjMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.keys.length > 0) {
    return cljs.core.map.call(null, function(p1__44425_SHARP_) {
      return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [p1__44425_SHARP_, self__.strobj[p1__44425_SHARP_]], null);
    }, self__.keys.sort(cljs.core.obj_map_compare_keys));
  } else {
    return null;
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.keys.length;
};
cljs.core.ObjMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_map.call(null, coll__$1, other);
};
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.ObjMap(meta__$1, self__.keys, self__.strobj, self__.update_count, self__.__hash);
};
cljs.core.ObjMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.ObjMap.EMPTY, self__.meta);
};
cljs.core.ObjMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  if (goog.isString(k) && !(cljs.core.scan_array.call(null, 1, k, self__.keys) == null)) {
    var new_keys = cljs.core.aclone.call(null, self__.keys);
    var new_strobj = cljs.core.obj_clone.call(null, self__.strobj, self__.keys);
    new_keys.splice(cljs.core.scan_array.call(null, 1, k, new_keys), 1);
    delete new_strobj[k];
    return new cljs.core.ObjMap(self__.meta, new_keys, new_strobj, self__.update_count + 1, null);
  } else {
    return coll__$1;
  }
};
cljs.core.__GT_ObjMap = function __GT_ObjMap(meta, keys, strobj, update_count, __hash) {
  return new cljs.core.ObjMap(meta, keys, strobj, update_count, __hash);
};
cljs.core.ObjMap.EMPTY = new cljs.core.ObjMap(null, [], function() {
  var obj44431 = {};
  return obj44431;
}(), 0, 0);
cljs.core.ObjMap.HASHMAP_THRESHOLD = 8;
cljs.core.ObjMap.fromObject = function(ks, obj) {
  return new cljs.core.ObjMap(null, ks, obj, 0, null);
};
cljs.core.array_map_index_of_nil_QMARK_ = function array_map_index_of_nil_QMARK_(arr, m, k) {
  var len = arr.length;
  var i = 0;
  while (true) {
    if (len <= i) {
      return-1;
    } else {
      if (arr[i] == null) {
        return i;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var G__44432 = i + 2;
          i = G__44432;
          continue;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.array_map_index_of_keyword_QMARK_ = function array_map_index_of_keyword_QMARK_(arr, m, k) {
  var len = arr.length;
  var kstr = k.fqn;
  var i = 0;
  while (true) {
    if (len <= i) {
      return-1;
    } else {
      if (function() {
        var k_SINGLEQUOTE_ = arr[i];
        return k_SINGLEQUOTE_ instanceof cljs.core.Keyword && kstr === k_SINGLEQUOTE_.fqn;
      }()) {
        return i;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var G__44433 = i + 2;
          i = G__44433;
          continue;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.array_map_index_of_symbol_QMARK_ = function array_map_index_of_symbol_QMARK_(arr, m, k) {
  var len = arr.length;
  var kstr = k.str;
  var i = 0;
  while (true) {
    if (len <= i) {
      return-1;
    } else {
      if (function() {
        var k_SINGLEQUOTE_ = arr[i];
        return k_SINGLEQUOTE_ instanceof cljs.core.Symbol && kstr === k_SINGLEQUOTE_.str;
      }()) {
        return i;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var G__44434 = i + 2;
          i = G__44434;
          continue;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.array_map_index_of_identical_QMARK_ = function array_map_index_of_identical_QMARK_(arr, m, k) {
  var len = arr.length;
  var i = 0;
  while (true) {
    if (len <= i) {
      return-1;
    } else {
      if (k === arr[i]) {
        return i;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var G__44435 = i + 2;
          i = G__44435;
          continue;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.array_map_index_of_equiv_QMARK_ = function array_map_index_of_equiv_QMARK_(arr, m, k) {
  var len = arr.length;
  var i = 0;
  while (true) {
    if (len <= i) {
      return-1;
    } else {
      if (cljs.core._EQ_.call(null, k, arr[i])) {
        return i;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var G__44436 = i + 2;
          i = G__44436;
          continue;
        } else {
          return null;
        }
      }
    }
    break;
  }
};
cljs.core.array_map_index_of = function array_map_index_of(m, k) {
  var arr = m.arr;
  if (k instanceof cljs.core.Keyword) {
    return cljs.core.array_map_index_of_keyword_QMARK_.call(null, arr, m, k);
  } else {
    if (goog.isString(k) || typeof k === "number") {
      return cljs.core.array_map_index_of_identical_QMARK_.call(null, arr, m, k);
    } else {
      if (k instanceof cljs.core.Symbol) {
        return cljs.core.array_map_index_of_symbol_QMARK_.call(null, arr, m, k);
      } else {
        if (k == null) {
          return cljs.core.array_map_index_of_nil_QMARK_.call(null, arr, m, k);
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            return cljs.core.array_map_index_of_equiv_QMARK_.call(null, arr, m, k);
          } else {
            return null;
          }
        }
      }
    }
  }
};
cljs.core.array_map_extend_kv = function array_map_extend_kv(m, k, v) {
  var arr = m.arr;
  var l = arr.length;
  var narr = new Array(l + 2);
  var i_44437 = 0;
  while (true) {
    if (i_44437 < l) {
      narr[i_44437] = arr[i_44437];
      var G__44438 = i_44437 + 1;
      i_44437 = G__44438;
      continue;
    } else {
    }
    break;
  }
  narr[l] = k;
  narr[l + 1] = v;
  return narr;
};
cljs.core.PersistentArrayMapSeq = function(arr, i, _meta) {
  this.arr = arr;
  this.i = i;
  this._meta = _meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374990;
};
cljs.core.PersistentArrayMapSeq.cljs$lang$type = true;
cljs.core.PersistentArrayMapSeq.cljs$lang$ctorStr = "cljs.core/PersistentArrayMapSeq";
cljs.core.PersistentArrayMapSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentArrayMapSeq");
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.hash_coll.call(null, coll__$1);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.i < self__.arr.length - 2) {
    return new cljs.core.PersistentArrayMapSeq(self__.arr, self__.i + 2, self__._meta);
  } else {
    return null;
  }
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.PersistentArrayMapSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return(self__.arr.length - self__.i) / 2;
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.arr[self__.i], self__.arr[self__.i + 1]], null);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.i < self__.arr.length - 2) {
    return new cljs.core.PersistentArrayMapSeq(self__.arr, self__.i + 2, self__._meta);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentArrayMapSeq(self__.arr, self__.i, new_meta);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__._meta;
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__._meta);
};
cljs.core.__GT_PersistentArrayMapSeq = function __GT_PersistentArrayMapSeq(arr, i, _meta) {
  return new cljs.core.PersistentArrayMapSeq(arr, i, _meta);
};
cljs.core.persistent_array_map_seq = function persistent_array_map_seq(arr, i, _meta) {
  if (i <= arr.length - 2) {
    return new cljs.core.PersistentArrayMapSeq(arr, i, _meta);
  } else {
    return null;
  }
};
cljs.core.PersistentArrayMap = function(meta, cnt, arr, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.arr = arr;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 4;
  this.cljs$lang$protocol_mask$partition0$ = 16123663;
};
cljs.core.PersistentArrayMap.cljs$lang$type = true;
cljs.core.PersistentArrayMap.cljs$lang$ctorStr = "cljs.core/PersistentArrayMap";
cljs.core.PersistentArrayMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentArrayMap");
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.TransientArrayMap(function() {
    var obj44441 = {};
    return obj44441;
  }(), self__.arr.length, cljs.core.aclone.call(null, self__.arr));
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_imap.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, k, null);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  var idx = cljs.core.array_map_index_of.call(null, coll__$1, k);
  if (idx === -1) {
    return not_found;
  } else {
    return self__.arr[idx + 1];
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var self__ = this;
  var coll__$1 = this;
  var idx = cljs.core.array_map_index_of.call(null, coll__$1, k);
  if (idx === -1) {
    if (self__.cnt < cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
      var arr__$1 = cljs.core.array_map_extend_kv.call(null, coll__$1, k, v);
      return new cljs.core.PersistentArrayMap(self__.meta, self__.cnt + 1, arr__$1, null);
    } else {
      return cljs.core._with_meta.call(null, cljs.core._assoc.call(null, cljs.core.into.call(null, cljs.core.PersistentHashMap.EMPTY, coll__$1), k, v), self__.meta);
    }
  } else {
    if (v === self__.arr[idx + 1]) {
      return coll__$1;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        var arr__$1 = function() {
          var G__44442 = cljs.core.aclone.call(null, self__.arr);
          G__44442[idx + 1] = v;
          return G__44442;
        }();
        return new cljs.core.PersistentArrayMap(self__.meta, self__.cnt, arr__$1, null);
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return!(cljs.core.array_map_index_of.call(null, coll__$1, k) === -1);
};
cljs.core.PersistentArrayMap.prototype.call = function() {
  var G__44443 = null;
  var G__44443__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44443__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44443 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44443__2.call(this, self__, k);
      case 3:
        return G__44443__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44443;
}();
cljs.core.PersistentArrayMap.prototype.apply = function(self__, args44439) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44439)));
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var self__ = this;
  var coll__$1 = this;
  var len = self__.arr.length;
  var i = 0;
  var init__$1 = init;
  while (true) {
    if (i < len) {
      var init__$2 = f.call(null, init__$1, self__.arr[i], self__.arr[i + 1]);
      if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
        return cljs.core.deref.call(null, init__$2);
      } else {
        var G__44444 = i + 2;
        var G__44445 = init__$2;
        i = G__44444;
        init__$1 = G__44445;
        continue;
      }
    } else {
      return init__$1;
    }
    break;
  }
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll__$1, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1));
  } else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll__$1, entry);
  }
};
cljs.core.PersistentArrayMap.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.persistent_array_map_seq.call(null, self__.arr, 0, null);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.cnt;
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_map.call(null, coll__$1, other);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentArrayMap(meta__$1, self__.cnt, self__.arr, self__.__hash);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentArrayMap.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentArrayMap(self__.meta, self__.cnt, self__.arr, self__.__hash);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentArrayMap.EMPTY, self__.meta);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  var idx = cljs.core.array_map_index_of.call(null, coll__$1, k);
  if (idx >= 0) {
    var len = self__.arr.length;
    var new_len = len - 2;
    if (new_len === 0) {
      return cljs.core._empty.call(null, coll__$1);
    } else {
      var new_arr = new Array(new_len);
      var s = 0;
      var d = 0;
      while (true) {
        if (s >= len) {
          return new cljs.core.PersistentArrayMap(self__.meta, self__.cnt - 1, new_arr, null);
        } else {
          if (cljs.core._EQ_.call(null, k, self__.arr[s])) {
            var G__44446 = s + 2;
            var G__44447 = d;
            s = G__44446;
            d = G__44447;
            continue;
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              new_arr[d] = self__.arr[s];
              new_arr[d + 1] = self__.arr[s + 1];
              var G__44448 = s + 2;
              var G__44449 = d + 2;
              s = G__44448;
              d = G__44449;
              continue;
            } else {
              return null;
            }
          }
        }
        break;
      }
    }
  } else {
    return coll__$1;
  }
};
cljs.core.__GT_PersistentArrayMap = function __GT_PersistentArrayMap(meta, cnt, arr, __hash) {
  return new cljs.core.PersistentArrayMap(meta, cnt, arr, __hash);
};
cljs.core.PersistentArrayMap.EMPTY = new cljs.core.PersistentArrayMap(null, 0, [], null);
cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD = 8;
cljs.core.PersistentArrayMap.fromArray = function(arr, no_clone, no_check) {
  var arr__$1 = no_clone ? arr : cljs.core.aclone.call(null, arr);
  if (no_check) {
    var cnt = arr__$1.length / 2;
    return new cljs.core.PersistentArrayMap(null, cnt, arr__$1, null);
  } else {
    var len = arr__$1.length;
    var i = 0;
    var ret = cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY);
    while (true) {
      if (i < len) {
        var G__44450 = i + 2;
        var G__44451 = cljs.core._assoc_BANG_.call(null, ret, arr__$1[i], arr__$1[i + 1]);
        i = G__44450;
        ret = G__44451;
        continue;
      } else {
        return cljs.core._persistent_BANG_.call(null, ret);
      }
      break;
    }
  }
};
cljs.core.TransientArrayMap = function(editable_QMARK_, len, arr) {
  this.editable_QMARK_ = editable_QMARK_;
  this.len = len;
  this.arr = arr;
  this.cljs$lang$protocol_mask$partition1$ = 56;
  this.cljs$lang$protocol_mask$partition0$ = 258;
};
cljs.core.TransientArrayMap.cljs$lang$type = true;
cljs.core.TransientArrayMap.cljs$lang$ctorStr = "cljs.core/TransientArrayMap";
cljs.core.TransientArrayMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/TransientArrayMap");
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    var idx = cljs.core.array_map_index_of.call(null, tcoll__$1, key);
    if (idx >= 0) {
      self__.arr[idx] = self__.arr[self__.len - 2];
      self__.arr[idx + 1] = self__.arr[self__.len - 1];
      var G__44452_44454 = self__.arr;
      G__44452_44454.pop();
      G__44452_44454.pop();
      self__.len = self__.len - 2;
    } else {
    }
    return tcoll__$1;
  } else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    var idx = cljs.core.array_map_index_of.call(null, tcoll__$1, key);
    if (idx === -1) {
      if (self__.len + 2 <= 2 * cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
        self__.len = self__.len + 2;
        self__.arr.push(key);
        self__.arr.push(val);
        return tcoll__$1;
      } else {
        return cljs.core.assoc_BANG_.call(null, cljs.core.array__GT_transient_hash_map.call(null, self__.len, self__.arr), key, val);
      }
    } else {
      if (val === self__.arr[idx + 1]) {
        return tcoll__$1;
      } else {
        self__.arr[idx + 1] = val;
        return tcoll__$1;
      }
    }
  } else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    if (function() {
      var G__44453 = o;
      if (G__44453) {
        var bit__4044__auto__ = G__44453.cljs$lang$protocol_mask$partition0$ & 2048;
        if (bit__4044__auto__ || G__44453.cljs$core$IMapEntry$) {
          return true;
        } else {
          if (!G__44453.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMapEntry, G__44453);
          } else {
            return false;
          }
        }
      } else {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMapEntry, G__44453);
      }
    }()) {
      return cljs.core._assoc_BANG_.call(null, tcoll__$1, cljs.core.key.call(null, o), cljs.core.val.call(null, o));
    } else {
      var es = cljs.core.seq.call(null, o);
      var tcoll__$2 = tcoll__$1;
      while (true) {
        var temp__4090__auto__ = cljs.core.first.call(null, es);
        if (cljs.core.truth_(temp__4090__auto__)) {
          var e = temp__4090__auto__;
          var G__44455 = cljs.core.next.call(null, es);
          var G__44456 = cljs.core._assoc_BANG_.call(null, tcoll__$2, cljs.core.key.call(null, e), cljs.core.val.call(null, e));
          es = G__44455;
          tcoll__$2 = G__44456;
          continue;
        } else {
          return tcoll__$2;
        }
        break;
      }
    }
  } else {
    throw new Error("conj! after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    self__.editable_QMARK_ = false;
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, self__.len, 2), self__.arr, null);
  } else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var self__ = this;
  var tcoll__$1 = this;
  return cljs.core._lookup.call(null, tcoll__$1, k, null);
};
cljs.core.TransientArrayMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    var idx = cljs.core.array_map_index_of.call(null, tcoll__$1, k);
    if (idx === -1) {
      return not_found;
    } else {
      return self__.arr[idx + 1];
    }
  } else {
    throw new Error("lookup after persistent!");
  }
};
cljs.core.TransientArrayMap.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core.truth_(self__.editable_QMARK_)) {
    return cljs.core.quot.call(null, self__.len, 2);
  } else {
    throw new Error("count after persistent!");
  }
};
cljs.core.__GT_TransientArrayMap = function __GT_TransientArrayMap(editable_QMARK_, len, arr) {
  return new cljs.core.TransientArrayMap(editable_QMARK_, len, arr);
};
cljs.core.array__GT_transient_hash_map = function array__GT_transient_hash_map(len, arr) {
  var out = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  var i = 0;
  while (true) {
    if (i < len) {
      var G__44457 = cljs.core.assoc_BANG_.call(null, out, arr[i], arr[i + 1]);
      var G__44458 = i + 2;
      out = G__44457;
      i = G__44458;
      continue;
    } else {
      return out;
    }
    break;
  }
};
cljs.core.Box = function(val) {
  this.val = val;
};
cljs.core.Box.cljs$lang$type = true;
cljs.core.Box.cljs$lang$ctorStr = "cljs.core/Box";
cljs.core.Box.cljs$lang$ctorPrWriter = function(this__3965__auto__, writer__3966__auto__, opts__3967__auto__) {
  return cljs.core._write.call(null, writer__3966__auto__, "cljs.core/Box");
};
cljs.core.__GT_Box = function __GT_Box(val) {
  return new cljs.core.Box(val);
};
cljs.core.key_test = function key_test(key, other) {
  if (key === other) {
    return true;
  } else {
    if (cljs.core.keyword_identical_QMARK_.call(null, key, other)) {
      return true;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return cljs.core._EQ_.call(null, key, other);
      } else {
        return null;
      }
    }
  }
};
cljs.core.mask = function mask(hash, shift) {
  return hash >>> shift & 31;
};
cljs.core.clone_and_set = function() {
  var clone_and_set = null;
  var clone_and_set__3 = function(arr, i, a) {
    var G__44461 = cljs.core.aclone.call(null, arr);
    G__44461[i] = a;
    return G__44461;
  };
  var clone_and_set__5 = function(arr, i, a, j, b) {
    var G__44462 = cljs.core.aclone.call(null, arr);
    G__44462[i] = a;
    G__44462[j] = b;
    return G__44462;
  };
  clone_and_set = function(arr, i, a, j, b) {
    switch(arguments.length) {
      case 3:
        return clone_and_set__3.call(this, arr, i, a);
      case 5:
        return clone_and_set__5.call(this, arr, i, a, j, b);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  clone_and_set.cljs$core$IFn$_invoke$arity$3 = clone_and_set__3;
  clone_and_set.cljs$core$IFn$_invoke$arity$5 = clone_and_set__5;
  return clone_and_set;
}();
cljs.core.remove_pair = function remove_pair(arr, i) {
  var new_arr = new Array(arr.length - 2);
  cljs.core.array_copy.call(null, arr, 0, new_arr, 0, 2 * i);
  cljs.core.array_copy.call(null, arr, 2 * (i + 1), new_arr, 2 * i, new_arr.length - 2 * i);
  return new_arr;
};
cljs.core.bitmap_indexed_node_index = function bitmap_indexed_node_index(bitmap, bit) {
  return cljs.core.bit_count.call(null, bitmap & bit - 1);
};
cljs.core.bitpos = function bitpos(hash, shift) {
  return 1 << (hash >>> shift & 31);
};
cljs.core.edit_and_set = function() {
  var edit_and_set = null;
  var edit_and_set__4 = function(inode, edit, i, a) {
    var editable = inode.ensure_editable(edit);
    editable.arr[i] = a;
    return editable;
  };
  var edit_and_set__6 = function(inode, edit, i, a, j, b) {
    var editable = inode.ensure_editable(edit);
    editable.arr[i] = a;
    editable.arr[j] = b;
    return editable;
  };
  edit_and_set = function(inode, edit, i, a, j, b) {
    switch(arguments.length) {
      case 4:
        return edit_and_set__4.call(this, inode, edit, i, a);
      case 6:
        return edit_and_set__6.call(this, inode, edit, i, a, j, b);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  edit_and_set.cljs$core$IFn$_invoke$arity$4 = edit_and_set__4;
  edit_and_set.cljs$core$IFn$_invoke$arity$6 = edit_and_set__6;
  return edit_and_set;
}();
cljs.core.inode_kv_reduce = function inode_kv_reduce(arr, f, init) {
  var len = arr.length;
  var i = 0;
  var init__$1 = init;
  while (true) {
    if (i < len) {
      var init__$2 = function() {
        var k = arr[i];
        if (!(k == null)) {
          return f.call(null, init__$1, k, arr[i + 1]);
        } else {
          var node = arr[i + 1];
          if (!(node == null)) {
            return node.kv_reduce(f, init__$1);
          } else {
            return init__$1;
          }
        }
      }();
      if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
        return cljs.core.deref.call(null, init__$2);
      } else {
        var G__44463 = i + 2;
        var G__44464 = init__$2;
        i = G__44463;
        init__$1 = G__44464;
        continue;
      }
    } else {
      return init__$1;
    }
    break;
  }
};
cljs.core.BitmapIndexedNode = function(edit, bitmap, arr) {
  this.edit = edit;
  this.bitmap = bitmap;
  this.arr = arr;
};
cljs.core.BitmapIndexedNode.cljs$lang$type = true;
cljs.core.BitmapIndexedNode.cljs$lang$ctorStr = "cljs.core/BitmapIndexedNode";
cljs.core.BitmapIndexedNode.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/BitmapIndexedNode");
};
cljs.core.BitmapIndexedNode.prototype.edit_and_remove_pair = function(e, bit, i) {
  var self__ = this;
  var inode = this;
  if (self__.bitmap === bit) {
    return null;
  } else {
    var editable = inode.ensure_editable(e);
    var earr = editable.arr;
    var len = earr.length;
    editable.bitmap = bit ^ editable.bitmap;
    cljs.core.array_copy.call(null, earr, 2 * (i + 1), earr, 2 * i, len - 2 * (i + 1));
    earr[len - 2] = null;
    earr[len - 1] = null;
    return editable;
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc_BANG_ = function(edit__$1, shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
  if ((self__.bitmap & bit) === 0) {
    var n = cljs.core.bit_count.call(null, self__.bitmap);
    if (2 * n < self__.arr.length) {
      var editable = inode.ensure_editable(edit__$1);
      var earr = editable.arr;
      added_leaf_QMARK_.val = true;
      cljs.core.array_copy_downward.call(null, earr, 2 * idx, earr, 2 * (idx + 1), 2 * (n - idx));
      earr[2 * idx] = key;
      earr[2 * idx + 1] = val;
      editable.bitmap = editable.bitmap | bit;
      return editable;
    } else {
      if (n >= 16) {
        var nodes = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
        var jdx = hash >>> shift & 31;
        nodes[jdx] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit__$1, shift + 5, hash, key, val, added_leaf_QMARK_);
        var i_44465 = 0;
        var j_44466 = 0;
        while (true) {
          if (i_44465 < 32) {
            if ((self__.bitmap >>> i_44465 & 1) === 0) {
              var G__44467 = i_44465 + 1;
              var G__44468 = j_44466;
              i_44465 = G__44467;
              j_44466 = G__44468;
              continue;
            } else {
              nodes[i_44465] = !(self__.arr[j_44466] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit__$1, shift + 5, cljs.core.hash.call(null, self__.arr[j_44466]), self__.arr[j_44466], self__.arr[j_44466 + 1], added_leaf_QMARK_) : self__.arr[j_44466 + 1];
              var G__44469 = i_44465 + 1;
              var G__44470 = j_44466 + 2;
              i_44465 = G__44469;
              j_44466 = G__44470;
              continue;
            }
          } else {
          }
          break;
        }
        return new cljs.core.ArrayNode(edit__$1, n + 1, nodes);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var new_arr = new Array(2 * (n + 4));
          cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, 2 * idx);
          new_arr[2 * idx] = key;
          new_arr[2 * idx + 1] = val;
          cljs.core.array_copy.call(null, self__.arr, 2 * idx, new_arr, 2 * (idx + 1), 2 * (n - idx));
          added_leaf_QMARK_.val = true;
          var editable = inode.ensure_editable(edit__$1);
          editable.arr = new_arr;
          editable.bitmap = editable.bitmap | bit;
          return editable;
        } else {
          return null;
        }
      }
    }
  } else {
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      var n = val_or_node.inode_assoc_BANG_(edit__$1, shift + 5, hash, key, val, added_leaf_QMARK_);
      if (n === val_or_node) {
        return inode;
      } else {
        return cljs.core.edit_and_set.call(null, inode, edit__$1, 2 * idx + 1, n);
      }
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        if (val === val_or_node) {
          return inode;
        } else {
          return cljs.core.edit_and_set.call(null, inode, edit__$1, 2 * idx + 1, val);
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          added_leaf_QMARK_.val = true;
          return cljs.core.edit_and_set.call(null, inode, edit__$1, 2 * idx, null, 2 * idx + 1, cljs.core.create_node.call(null, edit__$1, shift + 5, key_or_nil, val_or_node, hash, key, val));
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_seq = function() {
  var self__ = this;
  var inode = this;
  return cljs.core.create_inode_seq.call(null, self__.arr);
};
cljs.core.BitmapIndexedNode.prototype.inode_without_BANG_ = function(edit__$1, shift, hash, key, removed_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  if ((self__.bitmap & bit) === 0) {
    return inode;
  } else {
    var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      var n = val_or_node.inode_without_BANG_(edit__$1, shift + 5, hash, key, removed_leaf_QMARK_);
      if (n === val_or_node) {
        return inode;
      } else {
        if (!(n == null)) {
          return cljs.core.edit_and_set.call(null, inode, edit__$1, 2 * idx + 1, n);
        } else {
          if (self__.bitmap === bit) {
            return null;
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return inode.edit_and_remove_pair(edit__$1, bit, idx);
            } else {
              return null;
            }
          }
        }
      }
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        removed_leaf_QMARK_[0] = true;
        return inode.edit_and_remove_pair(edit__$1, bit, idx);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return inode;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.ensure_editable = function(e) {
  var self__ = this;
  var inode = this;
  if (e === self__.edit) {
    return inode;
  } else {
    var n = cljs.core.bit_count.call(null, self__.bitmap);
    var new_arr = new Array(n < 0 ? 4 : 2 * (n + 1));
    cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, 2 * n);
    return new cljs.core.BitmapIndexedNode(e, self__.bitmap, new_arr);
  }
};
cljs.core.BitmapIndexedNode.prototype.kv_reduce = function(f, init) {
  var self__ = this;
  var inode = this;
  return cljs.core.inode_kv_reduce.call(null, self__.arr, f, init);
};
cljs.core.BitmapIndexedNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  if ((self__.bitmap & bit) === 0) {
    return not_found;
  } else {
    var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      return val_or_node.inode_find(shift + 5, hash, key, not_found);
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [key_or_nil, val_or_node], null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return not_found;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_without = function(shift, hash, key) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  if ((self__.bitmap & bit) === 0) {
    return inode;
  } else {
    var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      var n = val_or_node.inode_without(shift + 5, hash, key);
      if (n === val_or_node) {
        return inode;
      } else {
        if (!(n == null)) {
          return new cljs.core.BitmapIndexedNode(null, self__.bitmap, cljs.core.clone_and_set.call(null, self__.arr, 2 * idx + 1, n));
        } else {
          if (self__.bitmap === bit) {
            return null;
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return new cljs.core.BitmapIndexedNode(null, self__.bitmap ^ bit, cljs.core.remove_pair.call(null, self__.arr, idx));
            } else {
              return null;
            }
          }
        }
      }
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        return new cljs.core.BitmapIndexedNode(null, self__.bitmap ^ bit, cljs.core.remove_pair.call(null, self__.arr, idx));
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return inode;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
  if ((self__.bitmap & bit) === 0) {
    var n = cljs.core.bit_count.call(null, self__.bitmap);
    if (n >= 16) {
      var nodes = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
      var jdx = hash >>> shift & 31;
      nodes[jdx] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      var i_44471 = 0;
      var j_44472 = 0;
      while (true) {
        if (i_44471 < 32) {
          if ((self__.bitmap >>> i_44471 & 1) === 0) {
            var G__44473 = i_44471 + 1;
            var G__44474 = j_44472;
            i_44471 = G__44473;
            j_44472 = G__44474;
            continue;
          } else {
            nodes[i_44471] = !(self__.arr[j_44472] == null) ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, cljs.core.hash.call(null, self__.arr[j_44472]), self__.arr[j_44472], self__.arr[j_44472 + 1], added_leaf_QMARK_) : self__.arr[j_44472 + 1];
            var G__44475 = i_44471 + 1;
            var G__44476 = j_44472 + 2;
            i_44471 = G__44475;
            j_44472 = G__44476;
            continue;
          }
        } else {
        }
        break;
      }
      return new cljs.core.ArrayNode(null, n + 1, nodes);
    } else {
      var new_arr = new Array(2 * (n + 1));
      cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, 2 * idx);
      new_arr[2 * idx] = key;
      new_arr[2 * idx + 1] = val;
      cljs.core.array_copy.call(null, self__.arr, 2 * idx, new_arr, 2 * (idx + 1), 2 * (n - idx));
      added_leaf_QMARK_.val = true;
      return new cljs.core.BitmapIndexedNode(null, self__.bitmap | bit, new_arr);
    }
  } else {
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      var n = val_or_node.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      if (n === val_or_node) {
        return inode;
      } else {
        return new cljs.core.BitmapIndexedNode(null, self__.bitmap, cljs.core.clone_and_set.call(null, self__.arr, 2 * idx + 1, n));
      }
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        if (val === val_or_node) {
          return inode;
        } else {
          return new cljs.core.BitmapIndexedNode(null, self__.bitmap, cljs.core.clone_and_set.call(null, self__.arr, 2 * idx + 1, val));
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          added_leaf_QMARK_.val = true;
          return new cljs.core.BitmapIndexedNode(null, self__.bitmap, cljs.core.clone_and_set.call(null, self__.arr, 2 * idx, null, 2 * idx + 1, cljs.core.create_node.call(null, shift + 5, key_or_nil, val_or_node, hash, key, val)));
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var bit = 1 << (hash >>> shift & 31);
  if ((self__.bitmap & bit) === 0) {
    return not_found;
  } else {
    var idx = cljs.core.bitmap_indexed_node_index.call(null, self__.bitmap, bit);
    var key_or_nil = self__.arr[2 * idx];
    var val_or_node = self__.arr[2 * idx + 1];
    if (key_or_nil == null) {
      return val_or_node.inode_lookup(shift + 5, hash, key, not_found);
    } else {
      if (cljs.core.key_test.call(null, key, key_or_nil)) {
        return val_or_node;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return not_found;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.__GT_BitmapIndexedNode = function __GT_BitmapIndexedNode(edit, bitmap, arr) {
  return new cljs.core.BitmapIndexedNode(edit, bitmap, arr);
};
cljs.core.BitmapIndexedNode.EMPTY = new cljs.core.BitmapIndexedNode(null, 0, []);
cljs.core.pack_array_node = function pack_array_node(array_node, edit, idx) {
  var arr = array_node.arr;
  var len = 2 * (array_node.cnt - 1);
  var new_arr = new Array(len);
  var i = 0;
  var j = 1;
  var bitmap = 0;
  while (true) {
    if (i < len) {
      if (!(i === idx) && !(arr[i] == null)) {
        new_arr[j] = arr[i];
        var G__44477 = i + 1;
        var G__44478 = j + 2;
        var G__44479 = bitmap | 1 << i;
        i = G__44477;
        j = G__44478;
        bitmap = G__44479;
        continue;
      } else {
        var G__44480 = i + 1;
        var G__44481 = j;
        var G__44482 = bitmap;
        i = G__44480;
        j = G__44481;
        bitmap = G__44482;
        continue;
      }
    } else {
      return new cljs.core.BitmapIndexedNode(edit, bitmap, new_arr);
    }
    break;
  }
};
cljs.core.ArrayNode = function(edit, cnt, arr) {
  this.edit = edit;
  this.cnt = cnt;
  this.arr = arr;
};
cljs.core.ArrayNode.cljs$lang$type = true;
cljs.core.ArrayNode.cljs$lang$ctorStr = "cljs.core/ArrayNode";
cljs.core.ArrayNode.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ArrayNode");
};
cljs.core.ArrayNode.prototype.inode_assoc_BANG_ = function(edit__$1, shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (node == null) {
    var editable = cljs.core.edit_and_set.call(null, inode, edit__$1, idx, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit__$1, shift + 5, hash, key, val, added_leaf_QMARK_));
    editable.cnt = editable.cnt + 1;
    return editable;
  } else {
    var n = node.inode_assoc_BANG_(edit__$1, shift + 5, hash, key, val, added_leaf_QMARK_);
    if (n === node) {
      return inode;
    } else {
      return cljs.core.edit_and_set.call(null, inode, edit__$1, idx, n);
    }
  }
};
cljs.core.ArrayNode.prototype.inode_seq = function() {
  var self__ = this;
  var inode = this;
  return cljs.core.create_array_node_seq.call(null, self__.arr);
};
cljs.core.ArrayNode.prototype.inode_without_BANG_ = function(edit__$1, shift, hash, key, removed_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (node == null) {
    return inode;
  } else {
    var n = node.inode_without_BANG_(edit__$1, shift + 5, hash, key, removed_leaf_QMARK_);
    if (n === node) {
      return inode;
    } else {
      if (n == null) {
        if (self__.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode, edit__$1, idx);
        } else {
          var editable = cljs.core.edit_and_set.call(null, inode, edit__$1, idx, n);
          editable.cnt = editable.cnt - 1;
          return editable;
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return cljs.core.edit_and_set.call(null, inode, edit__$1, idx, n);
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.ArrayNode.prototype.ensure_editable = function(e) {
  var self__ = this;
  var inode = this;
  if (e === self__.edit) {
    return inode;
  } else {
    return new cljs.core.ArrayNode(e, self__.cnt, cljs.core.aclone.call(null, self__.arr));
  }
};
cljs.core.ArrayNode.prototype.kv_reduce = function(f, init) {
  var self__ = this;
  var inode = this;
  var len = self__.arr.length;
  var i = 0;
  var init__$1 = init;
  while (true) {
    if (i < len) {
      var node = self__.arr[i];
      if (!(node == null)) {
        var init__$2 = node.kv_reduce(f, init__$1);
        if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
          return cljs.core.deref.call(null, init__$2);
        } else {
          var G__44483 = i + 1;
          var G__44484 = init__$2;
          i = G__44483;
          init__$1 = G__44484;
          continue;
        }
      } else {
        var G__44485 = i + 1;
        var G__44486 = init__$1;
        i = G__44485;
        init__$1 = G__44486;
        continue;
      }
    } else {
      return init__$1;
    }
    break;
  }
};
cljs.core.ArrayNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (!(node == null)) {
    return node.inode_find(shift + 5, hash, key, not_found);
  } else {
    return not_found;
  }
};
cljs.core.ArrayNode.prototype.inode_without = function(shift, hash, key) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (!(node == null)) {
    var n = node.inode_without(shift + 5, hash, key);
    if (n === node) {
      return inode;
    } else {
      if (n == null) {
        if (self__.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode, null, idx);
        } else {
          return new cljs.core.ArrayNode(null, self__.cnt - 1, cljs.core.clone_and_set.call(null, self__.arr, idx, n));
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return new cljs.core.ArrayNode(null, self__.cnt, cljs.core.clone_and_set.call(null, self__.arr, idx, n));
        } else {
          return null;
        }
      }
    }
  } else {
    return inode;
  }
};
cljs.core.ArrayNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (node == null) {
    return new cljs.core.ArrayNode(null, self__.cnt + 1, cljs.core.clone_and_set.call(null, self__.arr, idx, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_)));
  } else {
    var n = node.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
    if (n === node) {
      return inode;
    } else {
      return new cljs.core.ArrayNode(null, self__.cnt, cljs.core.clone_and_set.call(null, self__.arr, idx, n));
    }
  }
};
cljs.core.ArrayNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var idx = hash >>> shift & 31;
  var node = self__.arr[idx];
  if (!(node == null)) {
    return node.inode_lookup(shift + 5, hash, key, not_found);
  } else {
    return not_found;
  }
};
cljs.core.__GT_ArrayNode = function __GT_ArrayNode(edit, cnt, arr) {
  return new cljs.core.ArrayNode(edit, cnt, arr);
};
cljs.core.hash_collision_node_find_index = function hash_collision_node_find_index(arr, cnt, key) {
  var lim = 2 * cnt;
  var i = 0;
  while (true) {
    if (i < lim) {
      if (cljs.core.key_test.call(null, key, arr[i])) {
        return i;
      } else {
        var G__44487 = i + 2;
        i = G__44487;
        continue;
      }
    } else {
      return-1;
    }
    break;
  }
};
cljs.core.HashCollisionNode = function(edit, collision_hash, cnt, arr) {
  this.edit = edit;
  this.collision_hash = collision_hash;
  this.cnt = cnt;
  this.arr = arr;
};
cljs.core.HashCollisionNode.cljs$lang$type = true;
cljs.core.HashCollisionNode.cljs$lang$ctorStr = "cljs.core/HashCollisionNode";
cljs.core.HashCollisionNode.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/HashCollisionNode");
};
cljs.core.HashCollisionNode.prototype.inode_assoc_BANG_ = function(edit__$1, shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  if (hash === self__.collision_hash) {
    var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
    if (idx === -1) {
      if (self__.arr.length > 2 * self__.cnt) {
        var editable = cljs.core.edit_and_set.call(null, inode, edit__$1, 2 * self__.cnt, key, 2 * self__.cnt + 1, val);
        added_leaf_QMARK_.val = true;
        editable.cnt = editable.cnt + 1;
        return editable;
      } else {
        var len = self__.arr.length;
        var new_arr = new Array(len + 2);
        cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, len);
        new_arr[len] = key;
        new_arr[len + 1] = val;
        added_leaf_QMARK_.val = true;
        return inode.ensure_editable_array(edit__$1, self__.cnt + 1, new_arr);
      }
    } else {
      if (self__.arr[idx + 1] === val) {
        return inode;
      } else {
        return cljs.core.edit_and_set.call(null, inode, edit__$1, idx + 1, val);
      }
    }
  } else {
    return(new cljs.core.BitmapIndexedNode(edit__$1, 1 << (self__.collision_hash >>> shift & 31), [null, inode, null, null])).inode_assoc_BANG_(edit__$1, shift, hash, key, val, added_leaf_QMARK_);
  }
};
cljs.core.HashCollisionNode.prototype.inode_seq = function() {
  var self__ = this;
  var inode = this;
  return cljs.core.create_inode_seq.call(null, self__.arr);
};
cljs.core.HashCollisionNode.prototype.inode_without_BANG_ = function(edit__$1, shift, hash, key, removed_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
  if (idx === -1) {
    return inode;
  } else {
    removed_leaf_QMARK_[0] = true;
    if (self__.cnt === 1) {
      return null;
    } else {
      var editable = inode.ensure_editable(edit__$1);
      var earr = editable.arr;
      earr[idx] = earr[2 * self__.cnt - 2];
      earr[idx + 1] = earr[2 * self__.cnt - 1];
      earr[2 * self__.cnt - 1] = null;
      earr[2 * self__.cnt - 2] = null;
      editable.cnt = editable.cnt - 1;
      return editable;
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable = function(e) {
  var self__ = this;
  var inode = this;
  if (e === self__.edit) {
    return inode;
  } else {
    var new_arr = new Array(2 * (self__.cnt + 1));
    cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, 2 * self__.cnt);
    return new cljs.core.HashCollisionNode(e, self__.collision_hash, self__.cnt, new_arr);
  }
};
cljs.core.HashCollisionNode.prototype.kv_reduce = function(f, init) {
  var self__ = this;
  var inode = this;
  return cljs.core.inode_kv_reduce.call(null, self__.arr, f, init);
};
cljs.core.HashCollisionNode.prototype.inode_find = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
  if (idx < 0) {
    return not_found;
  } else {
    if (cljs.core.key_test.call(null, key, self__.arr[idx])) {
      return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.arr[idx], self__.arr[idx + 1]], null);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return not_found;
      } else {
        return null;
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_without = function(shift, hash, key) {
  var self__ = this;
  var inode = this;
  var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
  if (idx === -1) {
    return inode;
  } else {
    if (self__.cnt === 1) {
      return null;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return new cljs.core.HashCollisionNode(null, self__.collision_hash, self__.cnt - 1, cljs.core.remove_pair.call(null, self__.arr, cljs.core.quot.call(null, idx, 2)));
      } else {
        return null;
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var self__ = this;
  var inode = this;
  if (hash === self__.collision_hash) {
    var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
    if (idx === -1) {
      var len = 2 * self__.cnt;
      var new_arr = new Array(len + 2);
      cljs.core.array_copy.call(null, self__.arr, 0, new_arr, 0, len);
      new_arr[len] = key;
      new_arr[len + 1] = val;
      added_leaf_QMARK_.val = true;
      return new cljs.core.HashCollisionNode(null, self__.collision_hash, self__.cnt + 1, new_arr);
    } else {
      if (cljs.core._EQ_.call(null, self__.arr[idx], val)) {
        return inode;
      } else {
        return new cljs.core.HashCollisionNode(null, self__.collision_hash, self__.cnt, cljs.core.clone_and_set.call(null, self__.arr, idx + 1, val));
      }
    }
  } else {
    return(new cljs.core.BitmapIndexedNode(null, 1 << (self__.collision_hash >>> shift & 31), [null, inode])).inode_assoc(shift, hash, key, val, added_leaf_QMARK_);
  }
};
cljs.core.HashCollisionNode.prototype.inode_lookup = function(shift, hash, key, not_found) {
  var self__ = this;
  var inode = this;
  var idx = cljs.core.hash_collision_node_find_index.call(null, self__.arr, self__.cnt, key);
  if (idx < 0) {
    return not_found;
  } else {
    if (cljs.core.key_test.call(null, key, self__.arr[idx])) {
      return self__.arr[idx + 1];
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return not_found;
      } else {
        return null;
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.ensure_editable_array = function(e, count, array) {
  var self__ = this;
  var inode = this;
  if (e === self__.edit) {
    self__.arr = array;
    self__.cnt = count;
    return inode;
  } else {
    return new cljs.core.HashCollisionNode(self__.edit, self__.collision_hash, count, array);
  }
};
cljs.core.__GT_HashCollisionNode = function __GT_HashCollisionNode(edit, collision_hash, cnt, arr) {
  return new cljs.core.HashCollisionNode(edit, collision_hash, cnt, arr);
};
cljs.core.create_node = function() {
  var create_node = null;
  var create_node__6 = function(shift, key1, val1, key2hash, key2, val2) {
    var key1hash = cljs.core.hash.call(null, key1);
    if (key1hash === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash, 2, [key1, val1, key2, val2]);
    } else {
      var added_leaf_QMARK_ = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift, key1hash, key1, val1, added_leaf_QMARK_).inode_assoc(shift, key2hash, key2, val2, added_leaf_QMARK_);
    }
  };
  var create_node__7 = function(edit, shift, key1, val1, key2hash, key2, val2) {
    var key1hash = cljs.core.hash.call(null, key1);
    if (key1hash === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash, 2, [key1, val1, key2, val2]);
    } else {
      var added_leaf_QMARK_ = new cljs.core.Box(false);
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift, key1hash, key1, val1, added_leaf_QMARK_).inode_assoc_BANG_(edit, shift, key2hash, key2, val2, added_leaf_QMARK_);
    }
  };
  create_node = function(edit, shift, key1, val1, key2hash, key2, val2) {
    switch(arguments.length) {
      case 6:
        return create_node__6.call(this, edit, shift, key1, val1, key2hash, key2);
      case 7:
        return create_node__7.call(this, edit, shift, key1, val1, key2hash, key2, val2);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  create_node.cljs$core$IFn$_invoke$arity$6 = create_node__6;
  create_node.cljs$core$IFn$_invoke$arity$7 = create_node__7;
  return create_node;
}();
cljs.core.NodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374860;
};
cljs.core.NodeSeq.cljs$lang$type = true;
cljs.core.NodeSeq.cljs$lang$ctorStr = "cljs.core/NodeSeq";
cljs.core.NodeSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/NodeSeq");
};
cljs.core.NodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.NodeSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.NodeSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.NodeSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.NodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1;
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.s == null) {
    return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.nodes[self__.i], self__.nodes[self__.i + 1]], null);
  } else {
    return cljs.core.first.call(null, self__.s);
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.s == null) {
    return cljs.core.create_inode_seq.call(null, self__.nodes, self__.i + 2, null);
  } else {
    return cljs.core.create_inode_seq.call(null, self__.nodes, self__.i, cljs.core.next.call(null, self__.s));
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.NodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.NodeSeq(meta__$1, self__.nodes, self__.i, self__.s, self__.__hash);
};
cljs.core.NodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.NodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_NodeSeq = function __GT_NodeSeq(meta, nodes, i, s, __hash) {
  return new cljs.core.NodeSeq(meta, nodes, i, s, __hash);
};
cljs.core.create_inode_seq = function() {
  var create_inode_seq = null;
  var create_inode_seq__1 = function(nodes) {
    return create_inode_seq.call(null, nodes, 0, null);
  };
  var create_inode_seq__3 = function(nodes, i, s) {
    if (s == null) {
      var len = nodes.length;
      var j = i;
      while (true) {
        if (j < len) {
          if (!(nodes[j] == null)) {
            return new cljs.core.NodeSeq(null, nodes, j, null, null);
          } else {
            var temp__4090__auto__ = nodes[j + 1];
            if (cljs.core.truth_(temp__4090__auto__)) {
              var node = temp__4090__auto__;
              var temp__4090__auto____$1 = node.inode_seq();
              if (cljs.core.truth_(temp__4090__auto____$1)) {
                var node_seq = temp__4090__auto____$1;
                return new cljs.core.NodeSeq(null, nodes, j + 2, node_seq, null);
              } else {
                var G__44488 = j + 2;
                j = G__44488;
                continue;
              }
            } else {
              var G__44489 = j + 2;
              j = G__44489;
              continue;
            }
          }
        } else {
          return null;
        }
        break;
      }
    } else {
      return new cljs.core.NodeSeq(null, nodes, i, s, null);
    }
  };
  create_inode_seq = function(nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_inode_seq__1.call(this, nodes);
      case 3:
        return create_inode_seq__3.call(this, nodes, i, s);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  create_inode_seq.cljs$core$IFn$_invoke$arity$1 = create_inode_seq__1;
  create_inode_seq.cljs$core$IFn$_invoke$arity$3 = create_inode_seq__3;
  return create_inode_seq;
}();
cljs.core.ArrayNodeSeq = function(meta, nodes, i, s, __hash) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374860;
};
cljs.core.ArrayNodeSeq.cljs$lang$type = true;
cljs.core.ArrayNodeSeq.cljs$lang$ctorStr = "cljs.core/ArrayNodeSeq";
cljs.core.ArrayNodeSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ArrayNodeSeq");
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.ArrayNodeSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1;
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.first.call(null, self__.s);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.create_array_node_seq.call(null, null, self__.nodes, self__.i, cljs.core.next.call(null, self__.s));
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.ArrayNodeSeq(meta__$1, self__.nodes, self__.i, self__.s, self__.__hash);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_ArrayNodeSeq = function __GT_ArrayNodeSeq(meta, nodes, i, s, __hash) {
  return new cljs.core.ArrayNodeSeq(meta, nodes, i, s, __hash);
};
cljs.core.create_array_node_seq = function() {
  var create_array_node_seq = null;
  var create_array_node_seq__1 = function(nodes) {
    return create_array_node_seq.call(null, null, nodes, 0, null);
  };
  var create_array_node_seq__4 = function(meta, nodes, i, s) {
    if (s == null) {
      var len = nodes.length;
      var j = i;
      while (true) {
        if (j < len) {
          var temp__4090__auto__ = nodes[j];
          if (cljs.core.truth_(temp__4090__auto__)) {
            var nj = temp__4090__auto__;
            var temp__4090__auto____$1 = nj.inode_seq();
            if (cljs.core.truth_(temp__4090__auto____$1)) {
              var ns = temp__4090__auto____$1;
              return new cljs.core.ArrayNodeSeq(meta, nodes, j + 1, ns, null);
            } else {
              var G__44490 = j + 1;
              j = G__44490;
              continue;
            }
          } else {
            var G__44491 = j + 1;
            j = G__44491;
            continue;
          }
        } else {
          return null;
        }
        break;
      }
    } else {
      return new cljs.core.ArrayNodeSeq(meta, nodes, i, s, null);
    }
  };
  create_array_node_seq = function(meta, nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_array_node_seq__1.call(this, meta);
      case 4:
        return create_array_node_seq__4.call(this, meta, nodes, i, s);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  create_array_node_seq.cljs$core$IFn$_invoke$arity$1 = create_array_node_seq__1;
  create_array_node_seq.cljs$core$IFn$_invoke$arity$4 = create_array_node_seq__4;
  return create_array_node_seq;
}();
cljs.core.PersistentHashMap = function(meta, cnt, root, has_nil_QMARK_, nil_val, __hash) {
  this.meta = meta;
  this.cnt = cnt;
  this.root = root;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 4;
  this.cljs$lang$protocol_mask$partition0$ = 16123663;
};
cljs.core.PersistentHashMap.cljs$lang$type = true;
cljs.core.PersistentHashMap.cljs$lang$ctorStr = "cljs.core/PersistentHashMap";
cljs.core.PersistentHashMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentHashMap");
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.TransientHashMap(function() {
    var obj44494 = {};
    return obj44494;
  }(), self__.root, self__.cnt, self__.has_nil_QMARK_, self__.nil_val);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_imap.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, k, null);
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (k == null) {
    if (self__.has_nil_QMARK_) {
      return self__.nil_val;
    } else {
      return not_found;
    }
  } else {
    if (self__.root == null) {
      return not_found;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return self__.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found);
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var self__ = this;
  var coll__$1 = this;
  if (k == null) {
    if (self__.has_nil_QMARK_ && v === self__.nil_val) {
      return coll__$1;
    } else {
      return new cljs.core.PersistentHashMap(self__.meta, self__.has_nil_QMARK_ ? self__.cnt : self__.cnt + 1, self__.root, true, v, null);
    }
  } else {
    var added_leaf_QMARK_ = new cljs.core.Box(false);
    var new_root = (self__.root == null ? cljs.core.BitmapIndexedNode.EMPTY : self__.root).inode_assoc(0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK_);
    if (new_root === self__.root) {
      return coll__$1;
    } else {
      return new cljs.core.PersistentHashMap(self__.meta, added_leaf_QMARK_.val ? self__.cnt + 1 : self__.cnt, new_root, self__.has_nil_QMARK_, self__.nil_val, null);
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  if (k == null) {
    return self__.has_nil_QMARK_;
  } else {
    if (self__.root == null) {
      return false;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return!(self__.root.inode_lookup(0, cljs.core.hash.call(null, k), k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel);
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.call = function() {
  var G__44495 = null;
  var G__44495__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44495__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44495 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44495__2.call(this, self__, k);
      case 3:
        return G__44495__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44495;
}();
cljs.core.PersistentHashMap.prototype.apply = function(self__, args44492) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44492)));
};
cljs.core.PersistentHashMap.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var self__ = this;
  var coll__$1 = this;
  var init__$1 = self__.has_nil_QMARK_ ? f.call(null, init, null, self__.nil_val) : init;
  if (cljs.core.reduced_QMARK_.call(null, init__$1)) {
    return cljs.core.deref.call(null, init__$1);
  } else {
    if (!(self__.root == null)) {
      return self__.root.kv_reduce(f, init__$1);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return init__$1;
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll__$1, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1));
  } else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll__$1, entry);
  }
};
cljs.core.PersistentHashMap.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentHashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    var s = !(self__.root == null) ? self__.root.inode_seq() : null;
    if (self__.has_nil_QMARK_) {
      return cljs.core.cons.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [null, self__.nil_val], null), s);
    } else {
      return s;
    }
  } else {
    return null;
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.cnt;
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_map.call(null, coll__$1, other);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentHashMap(meta__$1, self__.cnt, self__.root, self__.has_nil_QMARK_, self__.nil_val, self__.__hash);
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentHashMap(self__.meta, self__.cnt, self__.root, self__.has_nil_QMARK_, self__.nil_val, self__.__hash);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, self__.meta);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  if (k == null) {
    if (self__.has_nil_QMARK_) {
      return new cljs.core.PersistentHashMap(self__.meta, self__.cnt - 1, self__.root, false, null, null);
    } else {
      return coll__$1;
    }
  } else {
    if (self__.root == null) {
      return coll__$1;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        var new_root = self__.root.inode_without(0, cljs.core.hash.call(null, k), k);
        if (new_root === self__.root) {
          return coll__$1;
        } else {
          return new cljs.core.PersistentHashMap(self__.meta, self__.cnt - 1, new_root, self__.has_nil_QMARK_, self__.nil_val, null);
        }
      } else {
        return null;
      }
    }
  }
};
cljs.core.__GT_PersistentHashMap = function __GT_PersistentHashMap(meta, cnt, root, has_nil_QMARK_, nil_val, __hash) {
  return new cljs.core.PersistentHashMap(meta, cnt, root, has_nil_QMARK_, nil_val, __hash);
};
cljs.core.PersistentHashMap.EMPTY = new cljs.core.PersistentHashMap(null, 0, null, false, null, 0);
cljs.core.PersistentHashMap.fromArrays = function(ks, vs) {
  var len = ks.length;
  var i = 0;
  var out = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  while (true) {
    if (i < len) {
      var G__44496 = i + 1;
      var G__44497 = cljs.core._assoc_BANG_.call(null, out, ks[i], vs[i]);
      i = G__44496;
      out = G__44497;
      continue;
    } else {
      return cljs.core.persistent_BANG_.call(null, out);
    }
    break;
  }
};
cljs.core.TransientHashMap = function(edit, root, count, has_nil_QMARK_, nil_val) {
  this.edit = edit;
  this.root = root;
  this.count = count;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val;
  this.cljs$lang$protocol_mask$partition1$ = 56;
  this.cljs$lang$protocol_mask$partition0$ = 258;
};
cljs.core.TransientHashMap.cljs$lang$type = true;
cljs.core.TransientHashMap.cljs$lang$ctorStr = "cljs.core/TransientHashMap";
cljs.core.TransientHashMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/TransientHashMap");
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientMap$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var self__ = this;
  var tcoll__$1 = this;
  return tcoll__$1.without_BANG_(key);
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var self__ = this;
  var tcoll__$1 = this;
  return tcoll__$1.assoc_BANG_(key, val);
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, val) {
  var self__ = this;
  var tcoll__$1 = this;
  return tcoll__$1.conj_BANG_(val);
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  return tcoll__$1.persistent_BANG_();
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var self__ = this;
  var tcoll__$1 = this;
  if (k == null) {
    if (self__.has_nil_QMARK_) {
      return self__.nil_val;
    } else {
      return null;
    }
  } else {
    if (self__.root == null) {
      return null;
    } else {
      return self__.root.inode_lookup(0, cljs.core.hash.call(null, k), k);
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var self__ = this;
  var tcoll__$1 = this;
  if (k == null) {
    if (self__.has_nil_QMARK_) {
      return self__.nil_val;
    } else {
      return not_found;
    }
  } else {
    if (self__.root == null) {
      return not_found;
    } else {
      return self__.root.inode_lookup(0, cljs.core.hash.call(null, k), k, not_found);
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.edit) {
    return self__.count;
  } else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.conj_BANG_ = function(o) {
  var self__ = this;
  var tcoll = this;
  if (self__.edit) {
    if (function() {
      var G__44498 = o;
      if (G__44498) {
        var bit__4044__auto__ = G__44498.cljs$lang$protocol_mask$partition0$ & 2048;
        if (bit__4044__auto__ || G__44498.cljs$core$IMapEntry$) {
          return true;
        } else {
          if (!G__44498.cljs$lang$protocol_mask$partition0$) {
            return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMapEntry, G__44498);
          } else {
            return false;
          }
        }
      } else {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMapEntry, G__44498);
      }
    }()) {
      return tcoll.assoc_BANG_(cljs.core.key.call(null, o), cljs.core.val.call(null, o));
    } else {
      var es = cljs.core.seq.call(null, o);
      var tcoll__$1 = tcoll;
      while (true) {
        var temp__4090__auto__ = cljs.core.first.call(null, es);
        if (cljs.core.truth_(temp__4090__auto__)) {
          var e = temp__4090__auto__;
          var G__44499 = cljs.core.next.call(null, es);
          var G__44500 = tcoll__$1.assoc_BANG_(cljs.core.key.call(null, e), cljs.core.val.call(null, e));
          es = G__44499;
          tcoll__$1 = G__44500;
          continue;
        } else {
          return tcoll__$1;
        }
        break;
      }
    }
  } else {
    throw new Error("conj! after persistent");
  }
};
cljs.core.TransientHashMap.prototype.assoc_BANG_ = function(k, v) {
  var self__ = this;
  var tcoll = this;
  if (self__.edit) {
    if (k == null) {
      if (self__.nil_val === v) {
      } else {
        self__.nil_val = v;
      }
      if (self__.has_nil_QMARK_) {
      } else {
        self__.count = self__.count + 1;
        self__.has_nil_QMARK_ = true;
      }
      return tcoll;
    } else {
      var added_leaf_QMARK_ = new cljs.core.Box(false);
      var node = (self__.root == null ? cljs.core.BitmapIndexedNode.EMPTY : self__.root).inode_assoc_BANG_(self__.edit, 0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK_);
      if (node === self__.root) {
      } else {
        self__.root = node;
      }
      if (added_leaf_QMARK_.val) {
        self__.count = self__.count + 1;
      } else {
      }
      return tcoll;
    }
  } else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.without_BANG_ = function(k) {
  var self__ = this;
  var tcoll = this;
  if (self__.edit) {
    if (k == null) {
      if (self__.has_nil_QMARK_) {
        self__.has_nil_QMARK_ = false;
        self__.nil_val = null;
        self__.count = self__.count - 1;
        return tcoll;
      } else {
        return tcoll;
      }
    } else {
      if (self__.root == null) {
        return tcoll;
      } else {
        var removed_leaf_QMARK_ = new cljs.core.Box(false);
        var node = self__.root.inode_without_BANG_(self__.edit, 0, cljs.core.hash.call(null, k), k, removed_leaf_QMARK_);
        if (node === self__.root) {
        } else {
          self__.root = node;
        }
        if (cljs.core.truth_(removed_leaf_QMARK_[0])) {
          self__.count = self__.count - 1;
        } else {
        }
        return tcoll;
      }
    }
  } else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.persistent_BANG_ = function() {
  var self__ = this;
  var tcoll = this;
  if (self__.edit) {
    self__.edit = null;
    return new cljs.core.PersistentHashMap(null, self__.count, self__.root, self__.has_nil_QMARK_, self__.nil_val, null);
  } else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.__GT_TransientHashMap = function __GT_TransientHashMap(edit, root, count, has_nil_QMARK_, nil_val) {
  return new cljs.core.TransientHashMap(edit, root, count, has_nil_QMARK_, nil_val);
};
cljs.core.tree_map_seq_push = function tree_map_seq_push(node, stack, ascending_QMARK_) {
  var t = node;
  var stack__$1 = stack;
  while (true) {
    if (!(t == null)) {
      var G__44501 = ascending_QMARK_ ? t.left : t.right;
      var G__44502 = cljs.core.conj.call(null, stack__$1, t);
      t = G__44501;
      stack__$1 = G__44502;
      continue;
    } else {
      return stack__$1;
    }
    break;
  }
};
cljs.core.PersistentTreeMapSeq = function(meta, stack, ascending_QMARK_, cnt, __hash) {
  this.meta = meta;
  this.stack = stack;
  this.ascending_QMARK_ = ascending_QMARK_;
  this.cnt = cnt;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374862;
};
cljs.core.PersistentTreeMapSeq.cljs$lang$type = true;
cljs.core.PersistentTreeMapSeq.cljs$lang$ctorStr = "cljs.core/PersistentTreeMapSeq";
cljs.core.PersistentTreeMapSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentTreeMapSeq");
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.PersistentTreeMapSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1;
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt < 0) {
    return cljs.core.count.call(null, cljs.core.next.call(null, coll__$1)) + 1;
  } else {
    return self__.cnt;
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return cljs.core.peek.call(null, self__.stack);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  var t = cljs.core.first.call(null, self__.stack);
  var next_stack = cljs.core.tree_map_seq_push.call(null, self__.ascending_QMARK_ ? t.right : t.left, cljs.core.next.call(null, self__.stack), self__.ascending_QMARK_);
  if (!(next_stack == null)) {
    return new cljs.core.PersistentTreeMapSeq(null, next_stack, self__.ascending_QMARK_, self__.cnt - 1, null);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentTreeMapSeq(meta__$1, self__.stack, self__.ascending_QMARK_, self__.cnt, self__.__hash);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_PersistentTreeMapSeq = function __GT_PersistentTreeMapSeq(meta, stack, ascending_QMARK_, cnt, __hash) {
  return new cljs.core.PersistentTreeMapSeq(meta, stack, ascending_QMARK_, cnt, __hash);
};
cljs.core.create_tree_map_seq = function create_tree_map_seq(tree, ascending_QMARK_, cnt) {
  return new cljs.core.PersistentTreeMapSeq(null, cljs.core.tree_map_seq_push.call(null, tree, null, ascending_QMARK_), ascending_QMARK_, cnt, null);
};
cljs.core.balance_left = function balance_left(key, val, ins, right) {
  if (ins instanceof cljs.core.RedNode) {
    if (ins.left instanceof cljs.core.RedNode) {
      return new cljs.core.RedNode(ins.key, ins.val, ins.left.blacken(), new cljs.core.BlackNode(key, val, ins.right, right, null), null);
    } else {
      if (ins.right instanceof cljs.core.RedNode) {
        return new cljs.core.RedNode(ins.right.key, ins.right.val, new cljs.core.BlackNode(ins.key, ins.val, ins.left, ins.right.left, null), new cljs.core.BlackNode(key, val, ins.right.right, right, null), null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return new cljs.core.BlackNode(key, val, ins, right, null);
        } else {
          return null;
        }
      }
    }
  } else {
    return new cljs.core.BlackNode(key, val, ins, right, null);
  }
};
cljs.core.balance_right = function balance_right(key, val, left, ins) {
  if (ins instanceof cljs.core.RedNode) {
    if (ins.right instanceof cljs.core.RedNode) {
      return new cljs.core.RedNode(ins.key, ins.val, new cljs.core.BlackNode(key, val, left, ins.left, null), ins.right.blacken(), null);
    } else {
      if (ins.left instanceof cljs.core.RedNode) {
        return new cljs.core.RedNode(ins.left.key, ins.left.val, new cljs.core.BlackNode(key, val, left, ins.left.left, null), new cljs.core.BlackNode(ins.key, ins.val, ins.left.right, ins.right, null), null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return new cljs.core.BlackNode(key, val, left, ins, null);
        } else {
          return null;
        }
      }
    }
  } else {
    return new cljs.core.BlackNode(key, val, left, ins, null);
  }
};
cljs.core.balance_left_del = function balance_left_del(key, val, del, right) {
  if (del instanceof cljs.core.RedNode) {
    return new cljs.core.RedNode(key, val, del.blacken(), right, null);
  } else {
    if (right instanceof cljs.core.BlackNode) {
      return cljs.core.balance_right.call(null, key, val, del, right.redden());
    } else {
      if (right instanceof cljs.core.RedNode && right.left instanceof cljs.core.BlackNode) {
        return new cljs.core.RedNode(right.left.key, right.left.val, new cljs.core.BlackNode(key, val, del, right.left.left, null), cljs.core.balance_right.call(null, right.key, right.val, right.left.right, right.right.redden()), null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          throw new Error("red-black tree invariant violation");
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.balance_right_del = function balance_right_del(key, val, left, del) {
  if (del instanceof cljs.core.RedNode) {
    return new cljs.core.RedNode(key, val, left, del.blacken(), null);
  } else {
    if (left instanceof cljs.core.BlackNode) {
      return cljs.core.balance_left.call(null, key, val, left.redden(), del);
    } else {
      if (left instanceof cljs.core.RedNode && left.right instanceof cljs.core.BlackNode) {
        return new cljs.core.RedNode(left.right.key, left.right.val, cljs.core.balance_left.call(null, left.key, left.val, left.left.redden(), left.right.left), new cljs.core.BlackNode(key, val, left.right.right, del, null), null);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          throw new Error("red-black tree invariant violation");
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.tree_map_kv_reduce = function tree_map_kv_reduce(node, f, init) {
  var init__$1 = !(node.left == null) ? tree_map_kv_reduce.call(null, node.left, f, init) : init;
  if (cljs.core.reduced_QMARK_.call(null, init__$1)) {
    return cljs.core.deref.call(null, init__$1);
  } else {
    var init__$2 = f.call(null, init__$1, node.key, node.val);
    if (cljs.core.reduced_QMARK_.call(null, init__$2)) {
      return cljs.core.deref.call(null, init__$2);
    } else {
      var init__$3 = !(node.right == null) ? tree_map_kv_reduce.call(null, node.right, f, init__$2) : init__$2;
      if (cljs.core.reduced_QMARK_.call(null, init__$3)) {
        return cljs.core.deref.call(null, init__$3);
      } else {
        return init__$3;
      }
    }
  }
};
cljs.core.BlackNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207;
};
cljs.core.BlackNode.cljs$lang$type = true;
cljs.core.BlackNode.cljs$lang$ctorStr = "cljs.core/BlackNode";
cljs.core.BlackNode.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/BlackNode");
};
cljs.core.BlackNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._nth.call(null, node__$1, k, null);
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._nth.call(null, node__$1, k, not_found);
};
cljs.core.BlackNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.assoc.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null), k, v);
};
cljs.core.BlackNode.prototype.call = function() {
  var G__44504 = null;
  var G__44504__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var node = self____$1;
    return node.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44504__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var node = self____$1;
    return node.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44504 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44504__2.call(this, self__, k);
      case 3:
        return G__44504__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44504;
}();
cljs.core.BlackNode.prototype.apply = function(self__, args44503) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44503)));
};
cljs.core.BlackNode.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var node = this;
  return node.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.BlackNode.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var node = this;
  return node.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.BlackNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var self__ = this;
  var node__$1 = this;
  return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val, o], null);
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.key;
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.val;
};
cljs.core.BlackNode.prototype.add_right = function(ins) {
  var self__ = this;
  var node = this;
  return ins.balance_right(node);
};
cljs.core.BlackNode.prototype.redden = function() {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(self__.key, self__.val, self__.left, self__.right, null);
};
cljs.core.BlackNode.prototype.remove_right = function(del) {
  var self__ = this;
  var node = this;
  return cljs.core.balance_right_del.call(null, self__.key, self__.val, self__.left, del);
};
cljs.core.BlackNode.prototype.replace = function(key__$1, val__$1, left__$1, right__$1) {
  var self__ = this;
  var node = this;
  return new cljs.core.BlackNode(key__$1, val__$1, left__$1, right__$1, null);
};
cljs.core.BlackNode.prototype.kv_reduce = function(f, init) {
  var self__ = this;
  var node = this;
  return cljs.core.tree_map_kv_reduce.call(null, node, f, init);
};
cljs.core.BlackNode.prototype.remove_left = function(del) {
  var self__ = this;
  var node = this;
  return cljs.core.balance_left_del.call(null, self__.key, self__.val, del, self__.right);
};
cljs.core.BlackNode.prototype.add_left = function(ins) {
  var self__ = this;
  var node = this;
  return ins.balance_left(node);
};
cljs.core.BlackNode.prototype.balance_left = function(parent) {
  var self__ = this;
  var node = this;
  return new cljs.core.BlackNode(parent.key, parent.val, node, parent.right, null);
};
cljs.core.BlackNode.prototype.balance_right = function(parent) {
  var self__ = this;
  var node = this;
  return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node, null);
};
cljs.core.BlackNode.prototype.blacken = function() {
  var self__ = this;
  var node = this;
  return node;
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.ci_reduce.call(null, node__$1, f);
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.ci_reduce.call(null, node__$1, f, start);
};
cljs.core.BlackNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._conj.call(null, cljs.core._conj.call(null, cljs.core.List.EMPTY, self__.val), self__.key);
};
cljs.core.BlackNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return 2;
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.val;
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key], null);
};
cljs.core.BlackNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var self__ = this;
  var node__$1 = this;
  return(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null)).cljs$core$IVector$_assoc_n$arity$3(null, n, v);
};
cljs.core.BlackNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.BlackNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.with_meta.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null), meta);
};
cljs.core.BlackNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return null;
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var self__ = this;
  var node__$1 = this;
  if (n === 0) {
    return self__.key;
  } else {
    if (n === 1) {
      return self__.val;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return null;
      } else {
        return null;
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var self__ = this;
  var node__$1 = this;
  if (n === 0) {
    return self__.key;
  } else {
    if (n === 1) {
      return self__.val;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return not_found;
      } else {
        return null;
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.PersistentVector.EMPTY;
};
cljs.core.__GT_BlackNode = function __GT_BlackNode(key, val, left, right, __hash) {
  return new cljs.core.BlackNode(key, val, left, right, __hash);
};
cljs.core.RedNode = function(key, val, left, right, __hash) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32402207;
};
cljs.core.RedNode.cljs$lang$type = true;
cljs.core.RedNode.cljs$lang$ctorStr = "cljs.core/RedNode";
cljs.core.RedNode.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/RedNode");
};
cljs.core.RedNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._nth.call(null, node__$1, k, null);
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._nth.call(null, node__$1, k, not_found);
};
cljs.core.RedNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.assoc.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null), k, v);
};
cljs.core.RedNode.prototype.call = function() {
  var G__44506 = null;
  var G__44506__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var node = self____$1;
    return node.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44506__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var node = self____$1;
    return node.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44506 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44506__2.call(this, self__, k);
      case 3:
        return G__44506__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44506;
}();
cljs.core.RedNode.prototype.apply = function(self__, args44505) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44505)));
};
cljs.core.RedNode.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var node = this;
  return node.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.RedNode.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var node = this;
  return node.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.RedNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var self__ = this;
  var node__$1 = this;
  return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val, o], null);
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.key;
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.val;
};
cljs.core.RedNode.prototype.add_right = function(ins) {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(self__.key, self__.val, self__.left, ins, null);
};
cljs.core.RedNode.prototype.redden = function() {
  var self__ = this;
  var node = this;
  throw new Error("red-black tree invariant violation");
};
cljs.core.RedNode.prototype.remove_right = function(del) {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(self__.key, self__.val, self__.left, del, null);
};
cljs.core.RedNode.prototype.replace = function(key__$1, val__$1, left__$1, right__$1) {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(key__$1, val__$1, left__$1, right__$1, null);
};
cljs.core.RedNode.prototype.kv_reduce = function(f, init) {
  var self__ = this;
  var node = this;
  return cljs.core.tree_map_kv_reduce.call(null, node, f, init);
};
cljs.core.RedNode.prototype.remove_left = function(del) {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(self__.key, self__.val, del, self__.right, null);
};
cljs.core.RedNode.prototype.add_left = function(ins) {
  var self__ = this;
  var node = this;
  return new cljs.core.RedNode(self__.key, self__.val, ins, self__.right, null);
};
cljs.core.RedNode.prototype.balance_left = function(parent) {
  var self__ = this;
  var node = this;
  if (self__.left instanceof cljs.core.RedNode) {
    return new cljs.core.RedNode(self__.key, self__.val, self__.left.blacken(), new cljs.core.BlackNode(parent.key, parent.val, self__.right, parent.right, null), null);
  } else {
    if (self__.right instanceof cljs.core.RedNode) {
      return new cljs.core.RedNode(self__.right.key, self__.right.val, new cljs.core.BlackNode(self__.key, self__.val, self__.left, self__.right.left, null), new cljs.core.BlackNode(parent.key, parent.val, self__.right.right, parent.right, null), null);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return new cljs.core.BlackNode(parent.key, parent.val, node, parent.right, null);
      } else {
        return null;
      }
    }
  }
};
cljs.core.RedNode.prototype.balance_right = function(parent) {
  var self__ = this;
  var node = this;
  if (self__.right instanceof cljs.core.RedNode) {
    return new cljs.core.RedNode(self__.key, self__.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, self__.left, null), self__.right.blacken(), null);
  } else {
    if (self__.left instanceof cljs.core.RedNode) {
      return new cljs.core.RedNode(self__.left.key, self__.left.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, self__.left.left, null), new cljs.core.BlackNode(self__.key, self__.val, self__.left.right, self__.right, null), null);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node, null);
      } else {
        return null;
      }
    }
  }
};
cljs.core.RedNode.prototype.blacken = function() {
  var self__ = this;
  var node = this;
  return new cljs.core.BlackNode(self__.key, self__.val, self__.left, self__.right, null);
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.ci_reduce.call(null, node__$1, f);
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.ci_reduce.call(null, node__$1, f, start);
};
cljs.core.RedNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core._conj.call(null, cljs.core._conj.call(null, cljs.core.List.EMPTY, self__.val), self__.key);
};
cljs.core.RedNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return 2;
};
cljs.core.RedNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return self__.val;
};
cljs.core.RedNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key], null);
};
cljs.core.RedNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var self__ = this;
  var node__$1 = this;
  return(new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null)).cljs$core$IVector$_assoc_n$arity$3(null, n, v);
};
cljs.core.RedNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.RedNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.with_meta.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [self__.key, self__.val], null), meta);
};
cljs.core.RedNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return null;
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var self__ = this;
  var node__$1 = this;
  if (n === 0) {
    return self__.key;
  } else {
    if (n === 1) {
      return self__.val;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return null;
      } else {
        return null;
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var self__ = this;
  var node__$1 = this;
  if (n === 0) {
    return self__.key;
  } else {
    if (n === 1) {
      return self__.val;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return not_found;
      } else {
        return null;
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var self__ = this;
  var node__$1 = this;
  return cljs.core.PersistentVector.EMPTY;
};
cljs.core.__GT_RedNode = function __GT_RedNode(key, val, left, right, __hash) {
  return new cljs.core.RedNode(key, val, left, right, __hash);
};
cljs.core.tree_map_add = function tree_map_add(comp, tree, k, v, found) {
  if (tree == null) {
    return new cljs.core.RedNode(k, v, null, null, null);
  } else {
    var c = comp.call(null, k, tree.key);
    if (c === 0) {
      found[0] = tree;
      return null;
    } else {
      if (c < 0) {
        var ins = tree_map_add.call(null, comp, tree.left, k, v, found);
        if (!(ins == null)) {
          return tree.add_left(ins);
        } else {
          return null;
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var ins = tree_map_add.call(null, comp, tree.right, k, v, found);
          if (!(ins == null)) {
            return tree.add_right(ins);
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
    }
  }
};
cljs.core.tree_map_append = function tree_map_append(left, right) {
  if (left == null) {
    return right;
  } else {
    if (right == null) {
      return left;
    } else {
      if (left instanceof cljs.core.RedNode) {
        if (right instanceof cljs.core.RedNode) {
          var app = tree_map_append.call(null, left.right, right.left);
          if (app instanceof cljs.core.RedNode) {
            return new cljs.core.RedNode(app.key, app.val, new cljs.core.RedNode(left.key, left.val, left.left, app.left, null), new cljs.core.RedNode(right.key, right.val, app.right, right.right, null), null);
          } else {
            return new cljs.core.RedNode(left.key, left.val, left.left, new cljs.core.RedNode(right.key, right.val, app, right.right, null), null);
          }
        } else {
          return new cljs.core.RedNode(left.key, left.val, left.left, tree_map_append.call(null, left.right, right), null);
        }
      } else {
        if (right instanceof cljs.core.RedNode) {
          return new cljs.core.RedNode(right.key, right.val, tree_map_append.call(null, left, right.left), right.right, null);
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            var app = tree_map_append.call(null, left.right, right.left);
            if (app instanceof cljs.core.RedNode) {
              return new cljs.core.RedNode(app.key, app.val, new cljs.core.BlackNode(left.key, left.val, left.left, app.left, null), new cljs.core.BlackNode(right.key, right.val, app.right, right.right, null), null);
            } else {
              return cljs.core.balance_left_del.call(null, left.key, left.val, left.left, new cljs.core.BlackNode(right.key, right.val, app, right.right, null));
            }
          } else {
            return null;
          }
        }
      }
    }
  }
};
cljs.core.tree_map_remove = function tree_map_remove(comp, tree, k, found) {
  if (!(tree == null)) {
    var c = comp.call(null, k, tree.key);
    if (c === 0) {
      found[0] = tree;
      return cljs.core.tree_map_append.call(null, tree.left, tree.right);
    } else {
      if (c < 0) {
        var del = tree_map_remove.call(null, comp, tree.left, k, found);
        if (!(del == null) || !(found[0] == null)) {
          if (tree.left instanceof cljs.core.BlackNode) {
            return cljs.core.balance_left_del.call(null, tree.key, tree.val, del, tree.right);
          } else {
            return new cljs.core.RedNode(tree.key, tree.val, del, tree.right, null);
          }
        } else {
          return null;
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var del = tree_map_remove.call(null, comp, tree.right, k, found);
          if (!(del == null) || !(found[0] == null)) {
            if (tree.right instanceof cljs.core.BlackNode) {
              return cljs.core.balance_right_del.call(null, tree.key, tree.val, tree.left, del);
            } else {
              return new cljs.core.RedNode(tree.key, tree.val, tree.left, del, null);
            }
          } else {
            return null;
          }
        } else {
          return null;
        }
      }
    }
  } else {
    return null;
  }
};
cljs.core.tree_map_replace = function tree_map_replace(comp, tree, k, v) {
  var tk = tree.key;
  var c = comp.call(null, k, tk);
  if (c === 0) {
    return tree.replace(tk, v, tree.left, tree.right);
  } else {
    if (c < 0) {
      return tree.replace(tk, tree.val, tree_map_replace.call(null, comp, tree.left, k, v), tree.right);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return tree.replace(tk, tree.val, tree.left, tree_map_replace.call(null, comp, tree.right, k, v));
      } else {
        return null;
      }
    }
  }
};
cljs.core.PersistentTreeMap = function(comp, tree, cnt, meta, __hash) {
  this.comp = comp;
  this.tree = tree;
  this.cnt = cnt;
  this.meta = meta;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 418776847;
};
cljs.core.PersistentTreeMap.cljs$lang$type = true;
cljs.core.PersistentTreeMap.cljs$lang$ctorStr = "cljs.core/PersistentTreeMap";
cljs.core.PersistentTreeMap.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentTreeMap");
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_imap.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, k, null);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var self__ = this;
  var coll__$1 = this;
  var n = coll__$1.entry_at(k);
  if (!(n == null)) {
    return n.val;
  } else {
    return not_found;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var self__ = this;
  var coll__$1 = this;
  var found = [null];
  var t = cljs.core.tree_map_add.call(null, self__.comp, self__.tree, k, v, found);
  if (t == null) {
    var found_node = cljs.core.nth.call(null, found, 0);
    if (cljs.core._EQ_.call(null, v, found_node.val)) {
      return coll__$1;
    } else {
      return new cljs.core.PersistentTreeMap(self__.comp, cljs.core.tree_map_replace.call(null, self__.comp, self__.tree, k, v), self__.cnt, self__.meta, null);
    }
  } else {
    return new cljs.core.PersistentTreeMap(self__.comp, t.blacken(), self__.cnt + 1, self__.meta, null);
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  return!(coll__$1.entry_at(k) == null);
};
cljs.core.PersistentTreeMap.prototype.call = function() {
  var G__44508 = null;
  var G__44508__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44508__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44508 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44508__2.call(this, self__, k);
      case 3:
        return G__44508__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44508;
}();
cljs.core.PersistentTreeMap.prototype.apply = function(self__, args44507) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44507)));
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IKVReduce$_kv_reduce$arity$3 = function(coll, f, init) {
  var self__ = this;
  var coll__$1 = this;
  if (!(self__.tree == null)) {
    return cljs.core.tree_map_kv_reduce.call(null, self__.tree, f, init);
  } else {
    return init;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll__$1, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1));
  } else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll__$1, entry);
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, self__.tree, false, self__.cnt);
  } else {
    return null;
  }
};
cljs.core.PersistentTreeMap.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentTreeMap.prototype.entry_at = function(k) {
  var self__ = this;
  var coll = this;
  var t = self__.tree;
  while (true) {
    if (!(t == null)) {
      var c = self__.comp.call(null, k, t.key);
      if (c === 0) {
        return t;
      } else {
        if (c < 0) {
          var G__44509 = t.left;
          t = G__44509;
          continue;
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            var G__44510 = t.right;
            t = G__44510;
            continue;
          } else {
            return null;
          }
        }
      }
    } else {
      return null;
    }
    break;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, self__.tree, ascending_QMARK_, self__.cnt);
  } else {
    return null;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    var stack = null;
    var t = self__.tree;
    while (true) {
      if (!(t == null)) {
        var c = self__.comp.call(null, k, t.key);
        if (c === 0) {
          return new cljs.core.PersistentTreeMapSeq(null, cljs.core.conj.call(null, stack, t), ascending_QMARK_, -1, null);
        } else {
          if (cljs.core.truth_(ascending_QMARK_)) {
            if (c < 0) {
              var G__44511 = cljs.core.conj.call(null, stack, t);
              var G__44512 = t.left;
              stack = G__44511;
              t = G__44512;
              continue;
            } else {
              var G__44513 = stack;
              var G__44514 = t.right;
              stack = G__44513;
              t = G__44514;
              continue;
            }
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              if (c > 0) {
                var G__44515 = cljs.core.conj.call(null, stack, t);
                var G__44516 = t.right;
                stack = G__44515;
                t = G__44516;
                continue;
              } else {
                var G__44517 = stack;
                var G__44518 = t.left;
                stack = G__44517;
                t = G__44518;
                continue;
              }
            } else {
              return null;
            }
          }
        }
      } else {
        if (stack == null) {
          return null;
        } else {
          return new cljs.core.PersistentTreeMapSeq(null, stack, ascending_QMARK_, -1, null);
        }
      }
      break;
    }
  } else {
    return null;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.key.call(null, entry);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.comp;
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (self__.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, self__.tree, true, self__.cnt);
  } else {
    return null;
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.cnt;
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_map.call(null, coll__$1, other);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentTreeMap(self__.comp, self__.tree, self__.cnt, meta__$1, self__.__hash);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentTreeMap(self__.comp, self__.tree, self__.cnt, self__.meta, self__.__hash);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeMap.EMPTY, self__.meta);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var self__ = this;
  var coll__$1 = this;
  var found = [null];
  var t = cljs.core.tree_map_remove.call(null, self__.comp, self__.tree, k, found);
  if (t == null) {
    if (cljs.core.nth.call(null, found, 0) == null) {
      return coll__$1;
    } else {
      return new cljs.core.PersistentTreeMap(self__.comp, null, 0, self__.meta, null);
    }
  } else {
    return new cljs.core.PersistentTreeMap(self__.comp, t.blacken(), self__.cnt - 1, self__.meta, null);
  }
};
cljs.core.__GT_PersistentTreeMap = function __GT_PersistentTreeMap(comp, tree, cnt, meta, __hash) {
  return new cljs.core.PersistentTreeMap(comp, tree, cnt, meta, __hash);
};
cljs.core.PersistentTreeMap.EMPTY = new cljs.core.PersistentTreeMap(cljs.core.compare, null, 0, null, 0);
cljs.core.hash_map = function() {
  var hash_map__delegate = function(keyvals) {
    var in$ = cljs.core.seq.call(null, keyvals);
    var out = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
    while (true) {
      if (in$) {
        var G__44519 = cljs.core.nnext.call(null, in$);
        var G__44520 = cljs.core.assoc_BANG_.call(null, out, cljs.core.first.call(null, in$), cljs.core.second.call(null, in$));
        in$ = G__44519;
        out = G__44520;
        continue;
      } else {
        return cljs.core.persistent_BANG_.call(null, out);
      }
      break;
    }
  };
  var hash_map = function(var_args) {
    var keyvals = null;
    if (arguments.length > 0) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return hash_map__delegate.call(this, keyvals);
  };
  hash_map.cljs$lang$maxFixedArity = 0;
  hash_map.cljs$lang$applyTo = function(arglist__44521) {
    var keyvals = cljs.core.seq(arglist__44521);
    return hash_map__delegate(keyvals);
  };
  hash_map.cljs$core$IFn$_invoke$arity$variadic = hash_map__delegate;
  return hash_map;
}();
cljs.core.array_map = function() {
  var array_map__delegate = function(keyvals) {
    return new cljs.core.PersistentArrayMap(null, cljs.core.quot.call(null, cljs.core.count.call(null, keyvals), 2), cljs.core.apply.call(null, cljs.core.array, keyvals), null);
  };
  var array_map = function(var_args) {
    var keyvals = null;
    if (arguments.length > 0) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return array_map__delegate.call(this, keyvals);
  };
  array_map.cljs$lang$maxFixedArity = 0;
  array_map.cljs$lang$applyTo = function(arglist__44522) {
    var keyvals = cljs.core.seq(arglist__44522);
    return array_map__delegate(keyvals);
  };
  array_map.cljs$core$IFn$_invoke$arity$variadic = array_map__delegate;
  return array_map;
}();
cljs.core.obj_map = function() {
  var obj_map__delegate = function(keyvals) {
    var ks = [];
    var obj = function() {
      var obj44526 = {};
      return obj44526;
    }();
    var kvs = cljs.core.seq.call(null, keyvals);
    while (true) {
      if (kvs) {
        ks.push(cljs.core.first.call(null, kvs));
        obj[cljs.core.first.call(null, kvs)] = cljs.core.second.call(null, kvs);
        var G__44527 = cljs.core.nnext.call(null, kvs);
        kvs = G__44527;
        continue;
      } else {
        return cljs.core.ObjMap.fromObject.call(null, ks, obj);
      }
      break;
    }
  };
  var obj_map = function(var_args) {
    var keyvals = null;
    if (arguments.length > 0) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return obj_map__delegate.call(this, keyvals);
  };
  obj_map.cljs$lang$maxFixedArity = 0;
  obj_map.cljs$lang$applyTo = function(arglist__44528) {
    var keyvals = cljs.core.seq(arglist__44528);
    return obj_map__delegate(keyvals);
  };
  obj_map.cljs$core$IFn$_invoke$arity$variadic = obj_map__delegate;
  return obj_map;
}();
cljs.core.sorted_map = function() {
  var sorted_map__delegate = function(keyvals) {
    var in$ = cljs.core.seq.call(null, keyvals);
    var out = cljs.core.PersistentTreeMap.EMPTY;
    while (true) {
      if (in$) {
        var G__44529 = cljs.core.nnext.call(null, in$);
        var G__44530 = cljs.core.assoc.call(null, out, cljs.core.first.call(null, in$), cljs.core.second.call(null, in$));
        in$ = G__44529;
        out = G__44530;
        continue;
      } else {
        return out;
      }
      break;
    }
  };
  var sorted_map = function(var_args) {
    var keyvals = null;
    if (arguments.length > 0) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return sorted_map__delegate.call(this, keyvals);
  };
  sorted_map.cljs$lang$maxFixedArity = 0;
  sorted_map.cljs$lang$applyTo = function(arglist__44531) {
    var keyvals = cljs.core.seq(arglist__44531);
    return sorted_map__delegate(keyvals);
  };
  sorted_map.cljs$core$IFn$_invoke$arity$variadic = sorted_map__delegate;
  return sorted_map;
}();
cljs.core.sorted_map_by = function() {
  var sorted_map_by__delegate = function(comparator, keyvals) {
    var in$ = cljs.core.seq.call(null, keyvals);
    var out = new cljs.core.PersistentTreeMap(cljs.core.fn__GT_comparator.call(null, comparator), null, 0, null, 0);
    while (true) {
      if (in$) {
        var G__44532 = cljs.core.nnext.call(null, in$);
        var G__44533 = cljs.core.assoc.call(null, out, cljs.core.first.call(null, in$), cljs.core.second.call(null, in$));
        in$ = G__44532;
        out = G__44533;
        continue;
      } else {
        return out;
      }
      break;
    }
  };
  var sorted_map_by = function(comparator, var_args) {
    var keyvals = null;
    if (arguments.length > 1) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return sorted_map_by__delegate.call(this, comparator, keyvals);
  };
  sorted_map_by.cljs$lang$maxFixedArity = 1;
  sorted_map_by.cljs$lang$applyTo = function(arglist__44534) {
    var comparator = cljs.core.first(arglist__44534);
    var keyvals = cljs.core.rest(arglist__44534);
    return sorted_map_by__delegate(comparator, keyvals);
  };
  sorted_map_by.cljs$core$IFn$_invoke$arity$variadic = sorted_map_by__delegate;
  return sorted_map_by;
}();
cljs.core.KeySeq = function(mseq, _meta) {
  this.mseq = mseq;
  this._meta = _meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374988;
};
cljs.core.KeySeq.cljs$lang$type = true;
cljs.core.KeySeq.cljs$lang$ctorStr = "cljs.core/KeySeq";
cljs.core.KeySeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/KeySeq");
};
cljs.core.KeySeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.hash_coll.call(null, coll__$1);
};
cljs.core.KeySeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var nseq = function() {
    var G__44535 = self__.mseq;
    if (G__44535) {
      var bit__4044__auto__ = G__44535.cljs$lang$protocol_mask$partition0$ & 128;
      if (bit__4044__auto__ || G__44535.cljs$core$INext$) {
        return true;
      } else {
        if (!G__44535.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44535);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44535);
    }
  }() ? cljs.core._next.call(null, self__.mseq) : cljs.core.next.call(null, self__.mseq);
  if (nseq == null) {
    return null;
  } else {
    return new cljs.core.KeySeq(nseq, self__._meta);
  }
};
cljs.core.KeySeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.KeySeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.KeySeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.KeySeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.KeySeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.KeySeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var me = cljs.core._first.call(null, self__.mseq);
  return cljs.core._key.call(null, me);
};
cljs.core.KeySeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var nseq = function() {
    var G__44536 = self__.mseq;
    if (G__44536) {
      var bit__4044__auto__ = G__44536.cljs$lang$protocol_mask$partition0$ & 128;
      if (bit__4044__auto__ || G__44536.cljs$core$INext$) {
        return true;
      } else {
        if (!G__44536.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44536);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44536);
    }
  }() ? cljs.core._next.call(null, self__.mseq) : cljs.core.next.call(null, self__.mseq);
  if (!(nseq == null)) {
    return new cljs.core.KeySeq(nseq, self__._meta);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.KeySeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.KeySeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.KeySeq(self__.mseq, new_meta);
};
cljs.core.KeySeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__._meta;
};
cljs.core.KeySeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__._meta);
};
cljs.core.__GT_KeySeq = function __GT_KeySeq(mseq, _meta) {
  return new cljs.core.KeySeq(mseq, _meta);
};
cljs.core.keys = function keys(hash_map) {
  var temp__4092__auto__ = cljs.core.seq.call(null, hash_map);
  if (temp__4092__auto__) {
    var mseq = temp__4092__auto__;
    return new cljs.core.KeySeq(mseq, null);
  } else {
    return null;
  }
};
cljs.core.key = function key(map_entry) {
  return cljs.core._key.call(null, map_entry);
};
cljs.core.ValSeq = function(mseq, _meta) {
  this.mseq = mseq;
  this._meta = _meta;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32374988;
};
cljs.core.ValSeq.cljs$lang$type = true;
cljs.core.ValSeq.cljs$lang$ctorStr = "cljs.core/ValSeq";
cljs.core.ValSeq.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/ValSeq");
};
cljs.core.ValSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.hash_coll.call(null, coll__$1);
};
cljs.core.ValSeq.prototype.cljs$core$INext$_next$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var nseq = function() {
    var G__44537 = self__.mseq;
    if (G__44537) {
      var bit__4044__auto__ = G__44537.cljs$lang$protocol_mask$partition0$ & 128;
      if (bit__4044__auto__ || G__44537.cljs$core$INext$) {
        return true;
      } else {
        if (!G__44537.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44537);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44537);
    }
  }() ? cljs.core._next.call(null, self__.mseq) : cljs.core.next.call(null, self__.mseq);
  if (nseq == null) {
    return null;
  } else {
    return new cljs.core.ValSeq(nseq, self__._meta);
  }
};
cljs.core.ValSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.cons.call(null, o, coll__$1);
};
cljs.core.ValSeq.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.ValSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, coll__$1);
};
cljs.core.ValSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.seq_reduce.call(null, f, start, coll__$1);
};
cljs.core.ValSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return coll__$1;
};
cljs.core.ValSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var me = cljs.core._first.call(null, self__.mseq);
  return cljs.core._val.call(null, me);
};
cljs.core.ValSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var nseq = function() {
    var G__44538 = self__.mseq;
    if (G__44538) {
      var bit__4044__auto__ = G__44538.cljs$lang$protocol_mask$partition0$ & 128;
      if (bit__4044__auto__ || G__44538.cljs$core$INext$) {
        return true;
      } else {
        if (!G__44538.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44538);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.INext, G__44538);
    }
  }() ? cljs.core._next.call(null, self__.mseq) : cljs.core.next.call(null, self__.mseq);
  if (!(nseq == null)) {
    return new cljs.core.ValSeq(nseq, self__._meta);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.ValSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.equiv_sequential.call(null, coll__$1, other);
};
cljs.core.ValSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, new_meta) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.ValSeq(self__.mseq, new_meta);
};
cljs.core.ValSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__._meta;
};
cljs.core.ValSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__._meta);
};
cljs.core.__GT_ValSeq = function __GT_ValSeq(mseq, _meta) {
  return new cljs.core.ValSeq(mseq, _meta);
};
cljs.core.vals = function vals(hash_map) {
  var temp__4092__auto__ = cljs.core.seq.call(null, hash_map);
  if (temp__4092__auto__) {
    var mseq = temp__4092__auto__;
    return new cljs.core.ValSeq(mseq, null);
  } else {
    return null;
  }
};
cljs.core.val = function val(map_entry) {
  return cljs.core._val.call(null, map_entry);
};
cljs.core.merge = function() {
  var merge__delegate = function(maps) {
    if (cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      return cljs.core.reduce.call(null, function(p1__44539_SHARP_, p2__44540_SHARP_) {
        return cljs.core.conj.call(null, function() {
          var or__3400__auto__ = p1__44539_SHARP_;
          if (cljs.core.truth_(or__3400__auto__)) {
            return or__3400__auto__;
          } else {
            return cljs.core.PersistentArrayMap.EMPTY;
          }
        }(), p2__44540_SHARP_);
      }, maps);
    } else {
      return null;
    }
  };
  var merge = function(var_args) {
    var maps = null;
    if (arguments.length > 0) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return merge__delegate.call(this, maps);
  };
  merge.cljs$lang$maxFixedArity = 0;
  merge.cljs$lang$applyTo = function(arglist__44541) {
    var maps = cljs.core.seq(arglist__44541);
    return merge__delegate(maps);
  };
  merge.cljs$core$IFn$_invoke$arity$variadic = merge__delegate;
  return merge;
}();
cljs.core.merge_with = function() {
  var merge_with__delegate = function(f, maps) {
    if (cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      var merge_entry = function(m, e) {
        var k = cljs.core.first.call(null, e);
        var v = cljs.core.second.call(null, e);
        if (cljs.core.contains_QMARK_.call(null, m, k)) {
          return cljs.core.assoc.call(null, m, k, f.call(null, cljs.core.get.call(null, m, k), v));
        } else {
          return cljs.core.assoc.call(null, m, k, v);
        }
      };
      var merge2 = function(merge_entry) {
        return function(m1, m2) {
          return cljs.core.reduce.call(null, merge_entry, function() {
            var or__3400__auto__ = m1;
            if (cljs.core.truth_(or__3400__auto__)) {
              return or__3400__auto__;
            } else {
              return cljs.core.PersistentArrayMap.EMPTY;
            }
          }(), cljs.core.seq.call(null, m2));
        };
      }(merge_entry);
      return cljs.core.reduce.call(null, merge2, maps);
    } else {
      return null;
    }
  };
  var merge_with = function(f, var_args) {
    var maps = null;
    if (arguments.length > 1) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return merge_with__delegate.call(this, f, maps);
  };
  merge_with.cljs$lang$maxFixedArity = 1;
  merge_with.cljs$lang$applyTo = function(arglist__44542) {
    var f = cljs.core.first(arglist__44542);
    var maps = cljs.core.rest(arglist__44542);
    return merge_with__delegate(f, maps);
  };
  merge_with.cljs$core$IFn$_invoke$arity$variadic = merge_with__delegate;
  return merge_with;
}();
cljs.core.select_keys = function select_keys(map, keyseq) {
  var ret = cljs.core.PersistentArrayMap.EMPTY;
  var keys = cljs.core.seq.call(null, keyseq);
  while (true) {
    if (keys) {
      var key = cljs.core.first.call(null, keys);
      var entry = cljs.core.get.call(null, map, key, new cljs.core.Keyword("cljs.core", "not-found", "cljs.core/not-found", 4155500789));
      var G__44543 = cljs.core.not_EQ_.call(null, entry, new cljs.core.Keyword("cljs.core", "not-found", "cljs.core/not-found", 4155500789)) ? cljs.core.assoc.call(null, ret, key, entry) : ret;
      var G__44544 = cljs.core.next.call(null, keys);
      ret = G__44543;
      keys = G__44544;
      continue;
    } else {
      return ret;
    }
    break;
  }
};
cljs.core.PersistentHashSet = function(meta, hash_map, __hash) {
  this.meta = meta;
  this.hash_map = hash_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 4;
  this.cljs$lang$protocol_mask$partition0$ = 15077647;
};
cljs.core.PersistentHashSet.cljs$lang$type = true;
cljs.core.PersistentHashSet.cljs$lang$ctorStr = "cljs.core/PersistentHashSet";
cljs.core.PersistentHashSet.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentHashSet");
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.TransientHashSet(cljs.core._as_transient.call(null, self__.hash_map));
};
cljs.core.PersistentHashSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_iset.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, v, null);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core._contains_key_QMARK_.call(null, self__.hash_map, v)) {
    return v;
  } else {
    return not_found;
  }
};
cljs.core.PersistentHashSet.prototype.call = function() {
  var G__44547 = null;
  var G__44547__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44547__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44547 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44547__2.call(this, self__, k);
      case 3:
        return G__44547__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44547;
}();
cljs.core.PersistentHashSet.prototype.apply = function(self__, args44546) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44546)));
};
cljs.core.PersistentHashSet.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.PersistentHashSet.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentHashSet(self__.meta, cljs.core.assoc.call(null, self__.hash_map, o, null), null);
};
cljs.core.PersistentHashSet.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.keys.call(null, self__.hash_map);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentHashSet(self__.meta, cljs.core._dissoc.call(null, self__.hash_map, v), null);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._count.call(null, self__.hash_map);
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.set_QMARK_.call(null, other) && (cljs.core.count.call(null, coll__$1) === cljs.core.count.call(null, other) && cljs.core.every_QMARK_.call(null, function(p1__44545_SHARP_) {
    return cljs.core.contains_QMARK_.call(null, coll__$1, p1__44545_SHARP_);
  }, other));
};
cljs.core.PersistentHashSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentHashSet(meta__$1, self__.hash_map, self__.__hash);
};
cljs.core.PersistentHashSet.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentHashSet.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentHashSet(self__.meta, self__.hash_map, self__.__hash);
};
cljs.core.PersistentHashSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentHashSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentHashSet.EMPTY, self__.meta);
};
cljs.core.__GT_PersistentHashSet = function __GT_PersistentHashSet(meta, hash_map, __hash) {
  return new cljs.core.PersistentHashSet(meta, hash_map, __hash);
};
cljs.core.PersistentHashSet.EMPTY = new cljs.core.PersistentHashSet(null, cljs.core.PersistentArrayMap.EMPTY, 0);
cljs.core.PersistentHashSet.fromArray = function(items, no_clone) {
  var len = items.length;
  if (len <= cljs.core.PersistentArrayMap.HASHMAP_THRESHOLD) {
    var arr = no_clone ? items : cljs.core.aclone.call(null, items);
    var i = 0;
    var out = cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY);
    while (true) {
      if (i < len) {
        var G__44548 = i + 1;
        var G__44549 = cljs.core._assoc_BANG_.call(null, out, items[i], null);
        i = G__44548;
        out = G__44549;
        continue;
      } else {
        return new cljs.core.PersistentHashSet(null, cljs.core._persistent_BANG_.call(null, out), null);
      }
      break;
    }
  } else {
    var i = 0;
    var out = cljs.core.transient$.call(null, cljs.core.PersistentHashSet.EMPTY);
    while (true) {
      if (i < len) {
        var G__44550 = i + 1;
        var G__44551 = cljs.core._conj_BANG_.call(null, out, items[i]);
        i = G__44550;
        out = G__44551;
        continue;
      } else {
        return cljs.core._persistent_BANG_.call(null, out);
      }
      break;
    }
  }
};
cljs.core.TransientHashSet = function(transient_map) {
  this.transient_map = transient_map;
  this.cljs$lang$protocol_mask$partition0$ = 259;
  this.cljs$lang$protocol_mask$partition1$ = 136;
};
cljs.core.TransientHashSet.cljs$lang$type = true;
cljs.core.TransientHashSet.cljs$lang$ctorStr = "cljs.core/TransientHashSet";
cljs.core.TransientHashSet.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/TransientHashSet");
};
cljs.core.TransientHashSet.prototype.call = function() {
  var G__44553 = null;
  var G__44553__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var tcoll = self____$1;
    if (cljs.core._lookup.call(null, self__.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return null;
    } else {
      return k;
    }
  };
  var G__44553__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var tcoll = self____$1;
    if (cljs.core._lookup.call(null, self__.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
      return not_found;
    } else {
      return k;
    }
  };
  G__44553 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44553__2.call(this, self__, k);
      case 3:
        return G__44553__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44553;
}();
cljs.core.TransientHashSet.prototype.apply = function(self__, args44552) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44552)));
};
cljs.core.TransientHashSet.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var tcoll = this;
  if (cljs.core._lookup.call(null, self__.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return null;
  } else {
    return k;
  }
};
cljs.core.TransientHashSet.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var tcoll = this;
  if (cljs.core._lookup.call(null, self__.transient_map, k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return not_found;
  } else {
    return k;
  }
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, v) {
  var self__ = this;
  var tcoll__$1 = this;
  return cljs.core._lookup.call(null, tcoll__$1, v, null);
};
cljs.core.TransientHashSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, v, not_found) {
  var self__ = this;
  var tcoll__$1 = this;
  if (cljs.core._lookup.call(null, self__.transient_map, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return not_found;
  } else {
    return v;
  }
};
cljs.core.TransientHashSet.prototype.cljs$core$ICounted$_count$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  return cljs.core.count.call(null, self__.transient_map);
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientSet$_disjoin_BANG_$arity$2 = function(tcoll, v) {
  var self__ = this;
  var tcoll__$1 = this;
  self__.transient_map = cljs.core.dissoc_BANG_.call(null, self__.transient_map, v);
  return tcoll__$1;
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, o) {
  var self__ = this;
  var tcoll__$1 = this;
  self__.transient_map = cljs.core.assoc_BANG_.call(null, self__.transient_map, o, null);
  return tcoll__$1;
};
cljs.core.TransientHashSet.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var self__ = this;
  var tcoll__$1 = this;
  return new cljs.core.PersistentHashSet(null, cljs.core.persistent_BANG_.call(null, self__.transient_map), null);
};
cljs.core.__GT_TransientHashSet = function __GT_TransientHashSet(transient_map) {
  return new cljs.core.TransientHashSet(transient_map);
};
cljs.core.PersistentTreeSet = function(meta, tree_map, __hash) {
  this.meta = meta;
  this.tree_map = tree_map;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 417730831;
};
cljs.core.PersistentTreeSet.cljs$lang$type = true;
cljs.core.PersistentTreeSet.cljs$lang$ctorStr = "cljs.core/PersistentTreeSet";
cljs.core.PersistentTreeSet.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/PersistentTreeSet");
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_iset.call(null, coll__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._lookup.call(null, coll__$1, v, null);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var self__ = this;
  var coll__$1 = this;
  var n = self__.tree_map.entry_at(v);
  if (!(n == null)) {
    return n.key;
  } else {
    return not_found;
  }
};
cljs.core.PersistentTreeSet.prototype.call = function() {
  var G__44556 = null;
  var G__44556__2 = function(self__, k) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
  };
  var G__44556__3 = function(self__, k, not_found) {
    var self__ = this;
    var self____$1 = this;
    var coll = self____$1;
    return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
  };
  G__44556 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__44556__2.call(this, self__, k);
      case 3:
        return G__44556__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__44556;
}();
cljs.core.PersistentTreeSet.prototype.apply = function(self__, args44555) {
  var self__ = this;
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args44555)));
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$2(null, k);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var self__ = this;
  var coll = this;
  return coll.cljs$core$ILookup$_lookup$arity$3(null, k, not_found);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentTreeSet(self__.meta, cljs.core.assoc.call(null, self__.tree_map, o, null), null);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  if (cljs.core.count.call(null, self__.tree_map) > 0) {
    return cljs.core.map.call(null, cljs.core.key, cljs.core.rseq.call(null, self__.tree_map));
  } else {
    return null;
  }
};
cljs.core.PersistentTreeSet.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq.call(null, self__.tree_map, ascending_QMARK_));
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq_from.call(null, self__.tree_map, k, ascending_QMARK_));
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var self__ = this;
  var coll__$1 = this;
  return entry;
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core._comparator.call(null, self__.tree_map);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.keys.call(null, self__.tree_map);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentTreeSet(self__.meta, cljs.core.dissoc.call(null, self__.tree_map, v), null);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.count.call(null, self__.tree_map);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.set_QMARK_.call(null, other) && (cljs.core.count.call(null, coll__$1) === cljs.core.count.call(null, other) && cljs.core.every_QMARK_.call(null, function(p1__44554_SHARP_) {
    return cljs.core.contains_QMARK_.call(null, coll__$1, p1__44554_SHARP_);
  }, other));
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta__$1) {
  var self__ = this;
  var coll__$1 = this;
  return new cljs.core.PersistentTreeSet(meta__$1, self__.tree_map, self__.__hash);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICloneable$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.PersistentTreeSet(self__.meta, self__.tree_map, self__.__hash);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return self__.meta;
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var self__ = this;
  var coll__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeSet.EMPTY, self__.meta);
};
cljs.core.__GT_PersistentTreeSet = function __GT_PersistentTreeSet(meta, tree_map, __hash) {
  return new cljs.core.PersistentTreeSet(meta, tree_map, __hash);
};
cljs.core.PersistentTreeSet.EMPTY = new cljs.core.PersistentTreeSet(null, cljs.core.PersistentTreeMap.EMPTY, 0);
cljs.core.set_from_indexed_seq = function set_from_indexed_seq(iseq) {
  var arr = iseq.arr;
  var ret = function() {
    var a__4236__auto__ = arr;
    var i = 0;
    var res = cljs.core._as_transient.call(null, cljs.core.PersistentHashSet.EMPTY);
    while (true) {
      if (i < a__4236__auto__.length) {
        var G__44557 = i + 1;
        var G__44558 = cljs.core._conj_BANG_.call(null, res, arr[i]);
        i = G__44557;
        res = G__44558;
        continue;
      } else {
        return res;
      }
      break;
    }
  }();
  return cljs.core._persistent_BANG_.call(null, ret);
};
cljs.core.set = function set(coll) {
  var in$ = cljs.core.seq.call(null, coll);
  if (in$ == null) {
    return cljs.core.PersistentHashSet.EMPTY;
  } else {
    if (in$ instanceof cljs.core.IndexedSeq && in$.i === 0) {
      return cljs.core.set_from_indexed_seq.call(null, in$);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        var in$__$1 = in$;
        var out = cljs.core._as_transient.call(null, cljs.core.PersistentHashSet.EMPTY);
        while (true) {
          if (!(in$__$1 == null)) {
            var G__44559 = cljs.core._next.call(null, in$__$1);
            var G__44560 = cljs.core._conj_BANG_.call(null, out, cljs.core._first.call(null, in$__$1));
            in$__$1 = G__44559;
            out = G__44560;
            continue;
          } else {
            return cljs.core._persistent_BANG_.call(null, out);
          }
          break;
        }
      } else {
        return null;
      }
    }
  }
};
cljs.core.hash_set = function() {
  var hash_set = null;
  var hash_set__0 = function() {
    return cljs.core.PersistentHashSet.EMPTY;
  };
  var hash_set__1 = function() {
    var G__44561__delegate = function(keys) {
      return cljs.core.set.call(null, keys);
    };
    var G__44561 = function(var_args) {
      var keys = null;
      if (arguments.length > 0) {
        keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
      }
      return G__44561__delegate.call(this, keys);
    };
    G__44561.cljs$lang$maxFixedArity = 0;
    G__44561.cljs$lang$applyTo = function(arglist__44562) {
      var keys = cljs.core.seq(arglist__44562);
      return G__44561__delegate(keys);
    };
    G__44561.cljs$core$IFn$_invoke$arity$variadic = G__44561__delegate;
    return G__44561;
  }();
  hash_set = function(var_args) {
    var keys = var_args;
    switch(arguments.length) {
      case 0:
        return hash_set__0.call(this);
      default:
        return hash_set__1.cljs$core$IFn$_invoke$arity$variadic(cljs.core.array_seq(arguments, 0));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  hash_set.cljs$lang$maxFixedArity = 0;
  hash_set.cljs$lang$applyTo = hash_set__1.cljs$lang$applyTo;
  hash_set.cljs$core$IFn$_invoke$arity$0 = hash_set__0;
  hash_set.cljs$core$IFn$_invoke$arity$variadic = hash_set__1.cljs$core$IFn$_invoke$arity$variadic;
  return hash_set;
}();
cljs.core.sorted_set = function() {
  var sorted_set__delegate = function(keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, cljs.core.PersistentTreeSet.EMPTY, keys);
  };
  var sorted_set = function(var_args) {
    var keys = null;
    if (arguments.length > 0) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return sorted_set__delegate.call(this, keys);
  };
  sorted_set.cljs$lang$maxFixedArity = 0;
  sorted_set.cljs$lang$applyTo = function(arglist__44563) {
    var keys = cljs.core.seq(arglist__44563);
    return sorted_set__delegate(keys);
  };
  sorted_set.cljs$core$IFn$_invoke$arity$variadic = sorted_set__delegate;
  return sorted_set;
}();
cljs.core.sorted_set_by = function() {
  var sorted_set_by__delegate = function(comparator, keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map_by.call(null, comparator), 0), keys);
  };
  var sorted_set_by = function(comparator, var_args) {
    var keys = null;
    if (arguments.length > 1) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return sorted_set_by__delegate.call(this, comparator, keys);
  };
  sorted_set_by.cljs$lang$maxFixedArity = 1;
  sorted_set_by.cljs$lang$applyTo = function(arglist__44564) {
    var comparator = cljs.core.first(arglist__44564);
    var keys = cljs.core.rest(arglist__44564);
    return sorted_set_by__delegate(comparator, keys);
  };
  sorted_set_by.cljs$core$IFn$_invoke$arity$variadic = sorted_set_by__delegate;
  return sorted_set_by;
}();
cljs.core.replace = function replace(smap, coll) {
  if (cljs.core.vector_QMARK_.call(null, coll)) {
    var n = cljs.core.count.call(null, coll);
    return cljs.core.reduce.call(null, function(v, i) {
      var temp__4090__auto__ = cljs.core.find.call(null, smap, cljs.core.nth.call(null, v, i));
      if (cljs.core.truth_(temp__4090__auto__)) {
        var e = temp__4090__auto__;
        return cljs.core.assoc.call(null, v, i, cljs.core.second.call(null, e));
      } else {
        return v;
      }
    }, coll, cljs.core.take.call(null, n, cljs.core.iterate.call(null, cljs.core.inc, 0)));
  } else {
    return cljs.core.map.call(null, function(p1__44565_SHARP_) {
      var temp__4090__auto__ = cljs.core.find.call(null, smap, p1__44565_SHARP_);
      if (cljs.core.truth_(temp__4090__auto__)) {
        var e = temp__4090__auto__;
        return cljs.core.second.call(null, e);
      } else {
        return p1__44565_SHARP_;
      }
    }, coll);
  }
};
cljs.core.distinct = function distinct(coll) {
  var step = function step(xs, seen) {
    return new cljs.core.LazySeq(null, function() {
      return function(p__44572, seen__$1) {
        while (true) {
          var vec__44573 = p__44572;
          var f = cljs.core.nth.call(null, vec__44573, 0, null);
          var xs__$1 = vec__44573;
          var temp__4092__auto__ = cljs.core.seq.call(null, xs__$1);
          if (temp__4092__auto__) {
            var s = temp__4092__auto__;
            if (cljs.core.contains_QMARK_.call(null, seen__$1, f)) {
              var G__44574 = cljs.core.rest.call(null, s);
              var G__44575 = seen__$1;
              p__44572 = G__44574;
              seen__$1 = G__44575;
              continue;
            } else {
              return cljs.core.cons.call(null, f, step.call(null, cljs.core.rest.call(null, s), cljs.core.conj.call(null, seen__$1, f)));
            }
          } else {
            return null;
          }
          break;
        }
      }.call(null, xs, seen);
    }, null, null);
  };
  return step.call(null, coll, cljs.core.PersistentHashSet.EMPTY);
};
cljs.core.butlast = function butlast(s) {
  var ret = cljs.core.PersistentVector.EMPTY;
  var s__$1 = s;
  while (true) {
    if (cljs.core.next.call(null, s__$1)) {
      var G__44576 = cljs.core.conj.call(null, ret, cljs.core.first.call(null, s__$1));
      var G__44577 = cljs.core.next.call(null, s__$1);
      ret = G__44576;
      s__$1 = G__44577;
      continue;
    } else {
      return cljs.core.seq.call(null, ret);
    }
    break;
  }
};
cljs.core.name = function name(x) {
  if (function() {
    var G__44579 = x;
    if (G__44579) {
      var bit__4037__auto__ = G__44579.cljs$lang$protocol_mask$partition1$ & 4096;
      if (bit__4037__auto__ || G__44579.cljs$core$INamed$) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }()) {
    return cljs.core._name.call(null, x);
  } else {
    if (typeof x === "string") {
      return x;
    } else {
      throw new Error([cljs.core.str("Doesn't support name: "), cljs.core.str(x)].join(""));
    }
  }
};
cljs.core.zipmap = function zipmap(keys, vals) {
  var map = cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY);
  var ks = cljs.core.seq.call(null, keys);
  var vs = cljs.core.seq.call(null, vals);
  while (true) {
    if (ks && vs) {
      var G__44580 = cljs.core.assoc_BANG_.call(null, map, cljs.core.first.call(null, ks), cljs.core.first.call(null, vs));
      var G__44581 = cljs.core.next.call(null, ks);
      var G__44582 = cljs.core.next.call(null, vs);
      map = G__44580;
      ks = G__44581;
      vs = G__44582;
      continue;
    } else {
      return cljs.core.persistent_BANG_.call(null, map);
    }
    break;
  }
};
cljs.core.max_key = function() {
  var max_key = null;
  var max_key__2 = function(k, x) {
    return x;
  };
  var max_key__3 = function(k, x, y) {
    if (k.call(null, x) > k.call(null, y)) {
      return x;
    } else {
      return y;
    }
  };
  var max_key__4 = function() {
    var G__44585__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__44583_SHARP_, p2__44584_SHARP_) {
        return max_key.call(null, k, p1__44583_SHARP_, p2__44584_SHARP_);
      }, max_key.call(null, k, x, y), more);
    };
    var G__44585 = function(k, x, y, var_args) {
      var more = null;
      if (arguments.length > 3) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44585__delegate.call(this, k, x, y, more);
    };
    G__44585.cljs$lang$maxFixedArity = 3;
    G__44585.cljs$lang$applyTo = function(arglist__44586) {
      var k = cljs.core.first(arglist__44586);
      arglist__44586 = cljs.core.next(arglist__44586);
      var x = cljs.core.first(arglist__44586);
      arglist__44586 = cljs.core.next(arglist__44586);
      var y = cljs.core.first(arglist__44586);
      var more = cljs.core.rest(arglist__44586);
      return G__44585__delegate(k, x, y, more);
    };
    G__44585.cljs$core$IFn$_invoke$arity$variadic = G__44585__delegate;
    return G__44585;
  }();
  max_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return max_key__2.call(this, k, x);
      case 3:
        return max_key__3.call(this, k, x, y);
      default:
        return max_key__4.cljs$core$IFn$_invoke$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  max_key.cljs$lang$maxFixedArity = 3;
  max_key.cljs$lang$applyTo = max_key__4.cljs$lang$applyTo;
  max_key.cljs$core$IFn$_invoke$arity$2 = max_key__2;
  max_key.cljs$core$IFn$_invoke$arity$3 = max_key__3;
  max_key.cljs$core$IFn$_invoke$arity$variadic = max_key__4.cljs$core$IFn$_invoke$arity$variadic;
  return max_key;
}();
cljs.core.min_key = function() {
  var min_key = null;
  var min_key__2 = function(k, x) {
    return x;
  };
  var min_key__3 = function(k, x, y) {
    if (k.call(null, x) < k.call(null, y)) {
      return x;
    } else {
      return y;
    }
  };
  var min_key__4 = function() {
    var G__44589__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__44587_SHARP_, p2__44588_SHARP_) {
        return min_key.call(null, k, p1__44587_SHARP_, p2__44588_SHARP_);
      }, min_key.call(null, k, x, y), more);
    };
    var G__44589 = function(k, x, y, var_args) {
      var more = null;
      if (arguments.length > 3) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44589__delegate.call(this, k, x, y, more);
    };
    G__44589.cljs$lang$maxFixedArity = 3;
    G__44589.cljs$lang$applyTo = function(arglist__44590) {
      var k = cljs.core.first(arglist__44590);
      arglist__44590 = cljs.core.next(arglist__44590);
      var x = cljs.core.first(arglist__44590);
      arglist__44590 = cljs.core.next(arglist__44590);
      var y = cljs.core.first(arglist__44590);
      var more = cljs.core.rest(arglist__44590);
      return G__44589__delegate(k, x, y, more);
    };
    G__44589.cljs$core$IFn$_invoke$arity$variadic = G__44589__delegate;
    return G__44589;
  }();
  min_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return min_key__2.call(this, k, x);
      case 3:
        return min_key__3.call(this, k, x, y);
      default:
        return min_key__4.cljs$core$IFn$_invoke$arity$variadic(k, x, y, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  min_key.cljs$lang$maxFixedArity = 3;
  min_key.cljs$lang$applyTo = min_key__4.cljs$lang$applyTo;
  min_key.cljs$core$IFn$_invoke$arity$2 = min_key__2;
  min_key.cljs$core$IFn$_invoke$arity$3 = min_key__3;
  min_key.cljs$core$IFn$_invoke$arity$variadic = min_key__4.cljs$core$IFn$_invoke$arity$variadic;
  return min_key;
}();
cljs.core.partition_all = function() {
  var partition_all = null;
  var partition_all__2 = function(n, coll) {
    return partition_all.call(null, n, n, coll);
  };
  var partition_all__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        return cljs.core.cons.call(null, cljs.core.take.call(null, n, s), partition_all.call(null, n, step, cljs.core.drop.call(null, step, s)));
      } else {
        return null;
      }
    }, null, null);
  };
  partition_all = function(n, step, coll) {
    switch(arguments.length) {
      case 2:
        return partition_all__2.call(this, n, step);
      case 3:
        return partition_all__3.call(this, n, step, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  partition_all.cljs$core$IFn$_invoke$arity$2 = partition_all__2;
  partition_all.cljs$core$IFn$_invoke$arity$3 = partition_all__3;
  return partition_all;
}();
cljs.core.take_while = function take_while(pred, coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      if (cljs.core.truth_(pred.call(null, cljs.core.first.call(null, s)))) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s), take_while.call(null, pred, cljs.core.rest.call(null, s)));
      } else {
        return null;
      }
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.mk_bound_fn = function mk_bound_fn(sc, test, key) {
  return function(e) {
    var comp = cljs.core._comparator.call(null, sc);
    return test.call(null, comp.call(null, cljs.core._entry_key.call(null, sc, e), key), 0);
  };
};
cljs.core.subseq = function() {
  var subseq = null;
  var subseq__3 = function(sc, test, key) {
    var include = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if (cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._GT_, cljs.core._GT__EQ_], true).call(null, test))) {
      var temp__4092__auto__ = cljs.core._sorted_seq_from.call(null, sc, key, true);
      if (cljs.core.truth_(temp__4092__auto__)) {
        var vec__44593 = temp__4092__auto__;
        var e = cljs.core.nth.call(null, vec__44593, 0, null);
        var s = vec__44593;
        if (cljs.core.truth_(include.call(null, e))) {
          return s;
        } else {
          return cljs.core.next.call(null, s);
        }
      } else {
        return null;
      }
    } else {
      return cljs.core.take_while.call(null, include, cljs.core._sorted_seq.call(null, sc, true));
    }
  };
  var subseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__4092__auto__ = cljs.core._sorted_seq_from.call(null, sc, start_key, true);
    if (cljs.core.truth_(temp__4092__auto__)) {
      var vec__44594 = temp__4092__auto__;
      var e = cljs.core.nth.call(null, vec__44594, 0, null);
      var s = vec__44594;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, end_test, end_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, start_test, start_key).call(null, e)) ? s : cljs.core.next.call(null, s));
    } else {
      return null;
    }
  };
  subseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return subseq__3.call(this, sc, start_test, start_key);
      case 5:
        return subseq__5.call(this, sc, start_test, start_key, end_test, end_key);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  subseq.cljs$core$IFn$_invoke$arity$3 = subseq__3;
  subseq.cljs$core$IFn$_invoke$arity$5 = subseq__5;
  return subseq;
}();
cljs.core.rsubseq = function() {
  var rsubseq = null;
  var rsubseq__3 = function(sc, test, key) {
    var include = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if (cljs.core.truth_(cljs.core.PersistentHashSet.fromArray([cljs.core._LT_, cljs.core._LT__EQ_], true).call(null, test))) {
      var temp__4092__auto__ = cljs.core._sorted_seq_from.call(null, sc, key, false);
      if (cljs.core.truth_(temp__4092__auto__)) {
        var vec__44597 = temp__4092__auto__;
        var e = cljs.core.nth.call(null, vec__44597, 0, null);
        var s = vec__44597;
        if (cljs.core.truth_(include.call(null, e))) {
          return s;
        } else {
          return cljs.core.next.call(null, s);
        }
      } else {
        return null;
      }
    } else {
      return cljs.core.take_while.call(null, include, cljs.core._sorted_seq.call(null, sc, false));
    }
  };
  var rsubseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__4092__auto__ = cljs.core._sorted_seq_from.call(null, sc, end_key, false);
    if (cljs.core.truth_(temp__4092__auto__)) {
      var vec__44598 = temp__4092__auto__;
      var e = cljs.core.nth.call(null, vec__44598, 0, null);
      var s = vec__44598;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, start_test, start_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, end_test, end_key).call(null, e)) ? s : cljs.core.next.call(null, s));
    } else {
      return null;
    }
  };
  rsubseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return rsubseq__3.call(this, sc, start_test, start_key);
      case 5:
        return rsubseq__5.call(this, sc, start_test, start_key, end_test, end_key);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  rsubseq.cljs$core$IFn$_invoke$arity$3 = rsubseq__3;
  rsubseq.cljs$core$IFn$_invoke$arity$5 = rsubseq__5;
  return rsubseq;
}();
cljs.core.Range = function(meta, start, end, step, __hash) {
  this.meta = meta;
  this.start = start;
  this.end = end;
  this.step = step;
  this.__hash = __hash;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 32375006;
};
cljs.core.Range.cljs$lang$type = true;
cljs.core.Range.cljs$lang$ctorStr = "cljs.core/Range";
cljs.core.Range.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Range");
};
cljs.core.Range.prototype.cljs$core$IHash$_hash$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  var h__3811__auto__ = self__.__hash;
  if (!(h__3811__auto__ == null)) {
    return h__3811__auto__;
  } else {
    var h__3811__auto____$1 = cljs.core.hash_coll.call(null, rng__$1);
    self__.__hash = h__3811__auto____$1;
    return h__3811__auto____$1;
  }
};
cljs.core.Range.prototype.cljs$core$INext$_next$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  if (self__.step > 0) {
    if (self__.start + self__.step < self__.end) {
      return new cljs.core.Range(self__.meta, self__.start + self__.step, self__.end, self__.step, null);
    } else {
      return null;
    }
  } else {
    if (self__.start + self__.step > self__.end) {
      return new cljs.core.Range(self__.meta, self__.start + self__.step, self__.end, self__.step, null);
    } else {
      return null;
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICollection$_conj$arity$2 = function(rng, o) {
  var self__ = this;
  var rng__$1 = this;
  return cljs.core.cons.call(null, o, rng__$1);
};
cljs.core.Range.prototype.toString = function() {
  var self__ = this;
  var coll = this;
  return cljs.core.pr_str_STAR_.call(null, coll);
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$2 = function(rng, f) {
  var self__ = this;
  var rng__$1 = this;
  return cljs.core.ci_reduce.call(null, rng__$1, f);
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$3 = function(rng, f, s) {
  var self__ = this;
  var rng__$1 = this;
  return cljs.core.ci_reduce.call(null, rng__$1, f, s);
};
cljs.core.Range.prototype.cljs$core$ISeqable$_seq$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  if (self__.step > 0) {
    if (self__.start < self__.end) {
      return rng__$1;
    } else {
      return null;
    }
  } else {
    if (self__.start > self__.end) {
      return rng__$1;
    } else {
      return null;
    }
  }
};
cljs.core.Range.prototype.cljs$core$ICounted$_count$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  if (cljs.core.not.call(null, cljs.core._seq.call(null, rng__$1))) {
    return 0;
  } else {
    return Math.ceil((self__.end - self__.start) / self__.step);
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$_first$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  if (cljs.core._seq.call(null, rng__$1) == null) {
    return null;
  } else {
    return self__.start;
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$_rest$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  if (!(cljs.core._seq.call(null, rng__$1) == null)) {
    return new cljs.core.Range(self__.meta, self__.start + self__.step, self__.end, self__.step, null);
  } else {
    return cljs.core.List.EMPTY;
  }
};
cljs.core.Range.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(rng, other) {
  var self__ = this;
  var rng__$1 = this;
  return cljs.core.equiv_sequential.call(null, rng__$1, other);
};
cljs.core.Range.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(rng, meta__$1) {
  var self__ = this;
  var rng__$1 = this;
  return new cljs.core.Range(meta__$1, self__.start, self__.end, self__.step, self__.__hash);
};
cljs.core.Range.prototype.cljs$core$ICloneable$ = true;
cljs.core.Range.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.Range(self__.meta, self__.start, self__.end, self__.step, self__.__hash);
};
cljs.core.Range.prototype.cljs$core$IMeta$_meta$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  return self__.meta;
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$2 = function(rng, n) {
  var self__ = this;
  var rng__$1 = this;
  if (n < cljs.core._count.call(null, rng__$1)) {
    return self__.start + n * self__.step;
  } else {
    if (self__.start > self__.end && self__.step === 0) {
      return self__.start;
    } else {
      throw new Error("Index out of bounds");
    }
  }
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$3 = function(rng, n, not_found) {
  var self__ = this;
  var rng__$1 = this;
  if (n < cljs.core._count.call(null, rng__$1)) {
    return self__.start + n * self__.step;
  } else {
    if (self__.start > self__.end && self__.step === 0) {
      return self__.start;
    } else {
      return not_found;
    }
  }
};
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(rng) {
  var self__ = this;
  var rng__$1 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, self__.meta);
};
cljs.core.__GT_Range = function __GT_Range(meta, start, end, step, __hash) {
  return new cljs.core.Range(meta, start, end, step, __hash);
};
cljs.core.range = function() {
  var range = null;
  var range__0 = function() {
    return range.call(null, 0, Number.MAX_VALUE, 1);
  };
  var range__1 = function(end) {
    return range.call(null, 0, end, 1);
  };
  var range__2 = function(start, end) {
    return range.call(null, start, end, 1);
  };
  var range__3 = function(start, end, step) {
    return new cljs.core.Range(null, start, end, step, null);
  };
  range = function(start, end, step) {
    switch(arguments.length) {
      case 0:
        return range__0.call(this);
      case 1:
        return range__1.call(this, start);
      case 2:
        return range__2.call(this, start, end);
      case 3:
        return range__3.call(this, start, end, step);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  range.cljs$core$IFn$_invoke$arity$0 = range__0;
  range.cljs$core$IFn$_invoke$arity$1 = range__1;
  range.cljs$core$IFn$_invoke$arity$2 = range__2;
  range.cljs$core$IFn$_invoke$arity$3 = range__3;
  return range;
}();
cljs.core.take_nth = function take_nth(n, coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      return cljs.core.cons.call(null, cljs.core.first.call(null, s), take_nth.call(null, n, cljs.core.drop.call(null, n, s)));
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.split_with = function split_with(pred, coll) {
  return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.take_while.call(null, pred, coll), cljs.core.drop_while.call(null, pred, coll)], null);
};
cljs.core.partition_by = function partition_by(f, coll) {
  return new cljs.core.LazySeq(null, function() {
    var temp__4092__auto__ = cljs.core.seq.call(null, coll);
    if (temp__4092__auto__) {
      var s = temp__4092__auto__;
      var fst = cljs.core.first.call(null, s);
      var fv = f.call(null, fst);
      var run = cljs.core.cons.call(null, fst, cljs.core.take_while.call(null, function(fst, fv) {
        return function(p1__44599_SHARP_) {
          return cljs.core._EQ_.call(null, fv, f.call(null, p1__44599_SHARP_));
        };
      }(fst, fv), cljs.core.next.call(null, s)));
      return cljs.core.cons.call(null, run, partition_by.call(null, f, cljs.core.seq.call(null, cljs.core.drop.call(null, cljs.core.count.call(null, run), s))));
    } else {
      return null;
    }
  }, null, null);
};
cljs.core.frequencies = function frequencies(coll) {
  return cljs.core.persistent_BANG_.call(null, cljs.core.reduce.call(null, function(counts, x) {
    return cljs.core.assoc_BANG_.call(null, counts, x, cljs.core.get.call(null, counts, x, 0) + 1);
  }, cljs.core.transient$.call(null, cljs.core.PersistentArrayMap.EMPTY), coll));
};
cljs.core.reductions = function() {
  var reductions = null;
  var reductions__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, function() {
      var temp__4090__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4090__auto__) {
        var s = temp__4090__auto__;
        return reductions.call(null, f, cljs.core.first.call(null, s), cljs.core.rest.call(null, s));
      } else {
        return cljs.core._conj.call(null, cljs.core.List.EMPTY, f.call(null));
      }
    }, null, null);
  };
  var reductions__3 = function(f, init, coll) {
    return cljs.core.cons.call(null, init, new cljs.core.LazySeq(null, function() {
      var temp__4092__auto__ = cljs.core.seq.call(null, coll);
      if (temp__4092__auto__) {
        var s = temp__4092__auto__;
        return reductions.call(null, f, f.call(null, init, cljs.core.first.call(null, s)), cljs.core.rest.call(null, s));
      } else {
        return null;
      }
    }, null, null));
  };
  reductions = function(f, init, coll) {
    switch(arguments.length) {
      case 2:
        return reductions__2.call(this, f, init);
      case 3:
        return reductions__3.call(this, f, init, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  reductions.cljs$core$IFn$_invoke$arity$2 = reductions__2;
  reductions.cljs$core$IFn$_invoke$arity$3 = reductions__3;
  return reductions;
}();
cljs.core.juxt = function() {
  var juxt = null;
  var juxt__1 = function(f) {
    return function() {
      var G__44610 = null;
      var G__44610__0 = function() {
        return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null)], null);
      };
      var G__44610__1 = function(x) {
        return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x)], null);
      };
      var G__44610__2 = function(x, y) {
        return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y)], null);
      };
      var G__44610__3 = function(x, y, z) {
        return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y, z)], null);
      };
      var G__44610__4 = function() {
        var G__44611__delegate = function(x, y, z, args) {
          return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.apply.call(null, f, x, y, z, args)], null);
        };
        var G__44611 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44611__delegate.call(this, x, y, z, args);
        };
        G__44611.cljs$lang$maxFixedArity = 3;
        G__44611.cljs$lang$applyTo = function(arglist__44612) {
          var x = cljs.core.first(arglist__44612);
          arglist__44612 = cljs.core.next(arglist__44612);
          var y = cljs.core.first(arglist__44612);
          arglist__44612 = cljs.core.next(arglist__44612);
          var z = cljs.core.first(arglist__44612);
          var args = cljs.core.rest(arglist__44612);
          return G__44611__delegate(x, y, z, args);
        };
        G__44611.cljs$core$IFn$_invoke$arity$variadic = G__44611__delegate;
        return G__44611;
      }();
      G__44610 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__44610__0.call(this);
          case 1:
            return G__44610__1.call(this, x);
          case 2:
            return G__44610__2.call(this, x, y);
          case 3:
            return G__44610__3.call(this, x, y, z);
          default:
            return G__44610__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44610.cljs$lang$maxFixedArity = 3;
      G__44610.cljs$lang$applyTo = G__44610__4.cljs$lang$applyTo;
      return G__44610;
    }();
  };
  var juxt__2 = function(f, g) {
    return function() {
      var G__44613 = null;
      var G__44613__0 = function() {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null), g.call(null)], null);
      };
      var G__44613__1 = function(x) {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x), g.call(null, x)], null);
      };
      var G__44613__2 = function(x, y) {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y), g.call(null, x, y)], null);
      };
      var G__44613__3 = function(x, y, z) {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y, z), g.call(null, x, y, z)], null);
      };
      var G__44613__4 = function() {
        var G__44614__delegate = function(x, y, z, args) {
          return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args)], null);
        };
        var G__44614 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44614__delegate.call(this, x, y, z, args);
        };
        G__44614.cljs$lang$maxFixedArity = 3;
        G__44614.cljs$lang$applyTo = function(arglist__44615) {
          var x = cljs.core.first(arglist__44615);
          arglist__44615 = cljs.core.next(arglist__44615);
          var y = cljs.core.first(arglist__44615);
          arglist__44615 = cljs.core.next(arglist__44615);
          var z = cljs.core.first(arglist__44615);
          var args = cljs.core.rest(arglist__44615);
          return G__44614__delegate(x, y, z, args);
        };
        G__44614.cljs$core$IFn$_invoke$arity$variadic = G__44614__delegate;
        return G__44614;
      }();
      G__44613 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__44613__0.call(this);
          case 1:
            return G__44613__1.call(this, x);
          case 2:
            return G__44613__2.call(this, x, y);
          case 3:
            return G__44613__3.call(this, x, y, z);
          default:
            return G__44613__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44613.cljs$lang$maxFixedArity = 3;
      G__44613.cljs$lang$applyTo = G__44613__4.cljs$lang$applyTo;
      return G__44613;
    }();
  };
  var juxt__3 = function(f, g, h) {
    return function() {
      var G__44616 = null;
      var G__44616__0 = function() {
        return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null), g.call(null), h.call(null)], null);
      };
      var G__44616__1 = function(x) {
        return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x), g.call(null, x), h.call(null, x)], null);
      };
      var G__44616__2 = function(x, y) {
        return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y), g.call(null, x, y), h.call(null, x, y)], null);
      };
      var G__44616__3 = function(x, y, z) {
        return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [f.call(null, x, y, z), g.call(null, x, y, z), h.call(null, x, y, z)], null);
      };
      var G__44616__4 = function() {
        var G__44617__delegate = function(x, y, z, args) {
          return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args), cljs.core.apply.call(null, h, x, y, z, args)], null);
        };
        var G__44617 = function(x, y, z, var_args) {
          var args = null;
          if (arguments.length > 3) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
          }
          return G__44617__delegate.call(this, x, y, z, args);
        };
        G__44617.cljs$lang$maxFixedArity = 3;
        G__44617.cljs$lang$applyTo = function(arglist__44618) {
          var x = cljs.core.first(arglist__44618);
          arglist__44618 = cljs.core.next(arglist__44618);
          var y = cljs.core.first(arglist__44618);
          arglist__44618 = cljs.core.next(arglist__44618);
          var z = cljs.core.first(arglist__44618);
          var args = cljs.core.rest(arglist__44618);
          return G__44617__delegate(x, y, z, args);
        };
        G__44617.cljs$core$IFn$_invoke$arity$variadic = G__44617__delegate;
        return G__44617;
      }();
      G__44616 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__44616__0.call(this);
          case 1:
            return G__44616__1.call(this, x);
          case 2:
            return G__44616__2.call(this, x, y);
          case 3:
            return G__44616__3.call(this, x, y, z);
          default:
            return G__44616__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
        }
        throw new Error("Invalid arity: " + arguments.length);
      };
      G__44616.cljs$lang$maxFixedArity = 3;
      G__44616.cljs$lang$applyTo = G__44616__4.cljs$lang$applyTo;
      return G__44616;
    }();
  };
  var juxt__4 = function() {
    var G__44619__delegate = function(f, g, h, fs) {
      var fs__$1 = cljs.core.list_STAR_.call(null, f, g, h, fs);
      return function() {
        var G__44620 = null;
        var G__44620__0 = function() {
          return cljs.core.reduce.call(null, function(p1__44600_SHARP_, p2__44601_SHARP_) {
            return cljs.core.conj.call(null, p1__44600_SHARP_, p2__44601_SHARP_.call(null));
          }, cljs.core.PersistentVector.EMPTY, fs__$1);
        };
        var G__44620__1 = function(x) {
          return cljs.core.reduce.call(null, function(p1__44602_SHARP_, p2__44603_SHARP_) {
            return cljs.core.conj.call(null, p1__44602_SHARP_, p2__44603_SHARP_.call(null, x));
          }, cljs.core.PersistentVector.EMPTY, fs__$1);
        };
        var G__44620__2 = function(x, y) {
          return cljs.core.reduce.call(null, function(p1__44604_SHARP_, p2__44605_SHARP_) {
            return cljs.core.conj.call(null, p1__44604_SHARP_, p2__44605_SHARP_.call(null, x, y));
          }, cljs.core.PersistentVector.EMPTY, fs__$1);
        };
        var G__44620__3 = function(x, y, z) {
          return cljs.core.reduce.call(null, function(p1__44606_SHARP_, p2__44607_SHARP_) {
            return cljs.core.conj.call(null, p1__44606_SHARP_, p2__44607_SHARP_.call(null, x, y, z));
          }, cljs.core.PersistentVector.EMPTY, fs__$1);
        };
        var G__44620__4 = function() {
          var G__44621__delegate = function(x, y, z, args) {
            return cljs.core.reduce.call(null, function(p1__44608_SHARP_, p2__44609_SHARP_) {
              return cljs.core.conj.call(null, p1__44608_SHARP_, cljs.core.apply.call(null, p2__44609_SHARP_, x, y, z, args));
            }, cljs.core.PersistentVector.EMPTY, fs__$1);
          };
          var G__44621 = function(x, y, z, var_args) {
            var args = null;
            if (arguments.length > 3) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
            }
            return G__44621__delegate.call(this, x, y, z, args);
          };
          G__44621.cljs$lang$maxFixedArity = 3;
          G__44621.cljs$lang$applyTo = function(arglist__44622) {
            var x = cljs.core.first(arglist__44622);
            arglist__44622 = cljs.core.next(arglist__44622);
            var y = cljs.core.first(arglist__44622);
            arglist__44622 = cljs.core.next(arglist__44622);
            var z = cljs.core.first(arglist__44622);
            var args = cljs.core.rest(arglist__44622);
            return G__44621__delegate(x, y, z, args);
          };
          G__44621.cljs$core$IFn$_invoke$arity$variadic = G__44621__delegate;
          return G__44621;
        }();
        G__44620 = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return G__44620__0.call(this);
            case 1:
              return G__44620__1.call(this, x);
            case 2:
              return G__44620__2.call(this, x, y);
            case 3:
              return G__44620__3.call(this, x, y, z);
            default:
              return G__44620__4.cljs$core$IFn$_invoke$arity$variadic(x, y, z, cljs.core.array_seq(arguments, 3));
          }
          throw new Error("Invalid arity: " + arguments.length);
        };
        G__44620.cljs$lang$maxFixedArity = 3;
        G__44620.cljs$lang$applyTo = G__44620__4.cljs$lang$applyTo;
        return G__44620;
      }();
    };
    var G__44619 = function(f, g, h, var_args) {
      var fs = null;
      if (arguments.length > 3) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44619__delegate.call(this, f, g, h, fs);
    };
    G__44619.cljs$lang$maxFixedArity = 3;
    G__44619.cljs$lang$applyTo = function(arglist__44623) {
      var f = cljs.core.first(arglist__44623);
      arglist__44623 = cljs.core.next(arglist__44623);
      var g = cljs.core.first(arglist__44623);
      arglist__44623 = cljs.core.next(arglist__44623);
      var h = cljs.core.first(arglist__44623);
      var fs = cljs.core.rest(arglist__44623);
      return G__44619__delegate(f, g, h, fs);
    };
    G__44619.cljs$core$IFn$_invoke$arity$variadic = G__44619__delegate;
    return G__44619;
  }();
  juxt = function(f, g, h, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 1:
        return juxt__1.call(this, f);
      case 2:
        return juxt__2.call(this, f, g);
      case 3:
        return juxt__3.call(this, f, g, h);
      default:
        return juxt__4.cljs$core$IFn$_invoke$arity$variadic(f, g, h, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  juxt.cljs$lang$maxFixedArity = 3;
  juxt.cljs$lang$applyTo = juxt__4.cljs$lang$applyTo;
  juxt.cljs$core$IFn$_invoke$arity$1 = juxt__1;
  juxt.cljs$core$IFn$_invoke$arity$2 = juxt__2;
  juxt.cljs$core$IFn$_invoke$arity$3 = juxt__3;
  juxt.cljs$core$IFn$_invoke$arity$variadic = juxt__4.cljs$core$IFn$_invoke$arity$variadic;
  return juxt;
}();
cljs.core.dorun = function() {
  var dorun = null;
  var dorun__1 = function(coll) {
    while (true) {
      if (cljs.core.seq.call(null, coll)) {
        var G__44624 = cljs.core.next.call(null, coll);
        coll = G__44624;
        continue;
      } else {
        return null;
      }
      break;
    }
  };
  var dorun__2 = function(n, coll) {
    while (true) {
      if (cljs.core.seq.call(null, coll) && n > 0) {
        var G__44625 = n - 1;
        var G__44626 = cljs.core.next.call(null, coll);
        n = G__44625;
        coll = G__44626;
        continue;
      } else {
        return null;
      }
      break;
    }
  };
  dorun = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return dorun__1.call(this, n);
      case 2:
        return dorun__2.call(this, n, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  dorun.cljs$core$IFn$_invoke$arity$1 = dorun__1;
  dorun.cljs$core$IFn$_invoke$arity$2 = dorun__2;
  return dorun;
}();
cljs.core.doall = function() {
  var doall = null;
  var doall__1 = function(coll) {
    cljs.core.dorun.call(null, coll);
    return coll;
  };
  var doall__2 = function(n, coll) {
    cljs.core.dorun.call(null, n, coll);
    return coll;
  };
  doall = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return doall__1.call(this, n);
      case 2:
        return doall__2.call(this, n, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  doall.cljs$core$IFn$_invoke$arity$1 = doall__1;
  doall.cljs$core$IFn$_invoke$arity$2 = doall__2;
  return doall;
}();
cljs.core.regexp_QMARK_ = function regexp_QMARK_(o) {
  return o instanceof RegExp;
};
cljs.core.re_matches = function re_matches(re, s) {
  var matches = re.exec(s);
  if (cljs.core._EQ_.call(null, cljs.core.first.call(null, matches), s)) {
    if (cljs.core.count.call(null, matches) === 1) {
      return cljs.core.first.call(null, matches);
    } else {
      return cljs.core.vec.call(null, matches);
    }
  } else {
    return null;
  }
};
cljs.core.re_find = function re_find(re, s) {
  var matches = re.exec(s);
  if (matches == null) {
    return null;
  } else {
    if (cljs.core.count.call(null, matches) === 1) {
      return cljs.core.first.call(null, matches);
    } else {
      return cljs.core.vec.call(null, matches);
    }
  }
};
cljs.core.re_seq = function re_seq(re, s) {
  var match_data = cljs.core.re_find.call(null, re, s);
  var match_idx = s.search(re);
  var match_str = cljs.core.coll_QMARK_.call(null, match_data) ? cljs.core.first.call(null, match_data) : match_data;
  var post_match = cljs.core.subs.call(null, s, match_idx + cljs.core.count.call(null, match_str));
  if (cljs.core.truth_(match_data)) {
    return new cljs.core.LazySeq(null, function() {
      return cljs.core.cons.call(null, match_data, cljs.core.seq.call(null, post_match) ? re_seq.call(null, re, post_match) : null);
    }, null, null);
  } else {
    return null;
  }
};
cljs.core.re_pattern = function re_pattern(s) {
  var vec__44628 = cljs.core.re_find.call(null, /^(?:\(\?([idmsux]*)\))?(.*)/, s);
  var _ = cljs.core.nth.call(null, vec__44628, 0, null);
  var flags = cljs.core.nth.call(null, vec__44628, 1, null);
  var pattern = cljs.core.nth.call(null, vec__44628, 2, null);
  return new RegExp(pattern, flags);
};
cljs.core.pr_sequential_writer = function pr_sequential_writer(writer, print_one, begin, sep, end, opts, coll) {
  var _STAR_print_level_STAR_44630 = cljs.core._STAR_print_level_STAR_;
  try {
    cljs.core._STAR_print_level_STAR_ = cljs.core._STAR_print_level_STAR_ == null ? null : cljs.core._STAR_print_level_STAR_ - 1;
    if (!(cljs.core._STAR_print_level_STAR_ == null) && cljs.core._STAR_print_level_STAR_ < 0) {
      return cljs.core._write.call(null, writer, "#");
    } else {
      cljs.core._write.call(null, writer, begin);
      if (cljs.core.seq.call(null, coll)) {
        print_one.call(null, cljs.core.first.call(null, coll), writer, opts);
      } else {
      }
      var coll_44631__$1 = cljs.core.next.call(null, coll);
      var n_44632 = (new cljs.core.Keyword(null, "print-length", "print-length", 3960797560)).cljs$core$IFn$_invoke$arity$1(opts);
      while (true) {
        if (coll_44631__$1 && (n_44632 == null || !(n_44632 === 0))) {
          cljs.core._write.call(null, writer, sep);
          print_one.call(null, cljs.core.first.call(null, coll_44631__$1), writer, opts);
          var G__44633 = cljs.core.next.call(null, coll_44631__$1);
          var G__44634 = n_44632 - 1;
          coll_44631__$1 = G__44633;
          n_44632 = G__44634;
          continue;
        } else {
        }
        break;
      }
      if (cljs.core.truth_((new cljs.core.Keyword(null, "print-length", "print-length", 3960797560)).cljs$core$IFn$_invoke$arity$1(opts))) {
        cljs.core._write.call(null, writer, sep);
        print_one.call(null, "...", writer, opts);
      } else {
      }
      return cljs.core._write.call(null, writer, end);
    }
  } finally {
    cljs.core._STAR_print_level_STAR_ = _STAR_print_level_STAR_44630;
  }
};
cljs.core.write_all = function() {
  var write_all__delegate = function(writer, ss) {
    var seq__44639 = cljs.core.seq.call(null, ss);
    var chunk__44640 = null;
    var count__44641 = 0;
    var i__44642 = 0;
    while (true) {
      if (i__44642 < count__44641) {
        var s = cljs.core._nth.call(null, chunk__44640, i__44642);
        cljs.core._write.call(null, writer, s);
        var G__44643 = seq__44639;
        var G__44644 = chunk__44640;
        var G__44645 = count__44641;
        var G__44646 = i__44642 + 1;
        seq__44639 = G__44643;
        chunk__44640 = G__44644;
        count__44641 = G__44645;
        i__44642 = G__44646;
        continue;
      } else {
        var temp__4092__auto__ = cljs.core.seq.call(null, seq__44639);
        if (temp__4092__auto__) {
          var seq__44639__$1 = temp__4092__auto__;
          if (cljs.core.chunked_seq_QMARK_.call(null, seq__44639__$1)) {
            var c__4142__auto__ = cljs.core.chunk_first.call(null, seq__44639__$1);
            var G__44647 = cljs.core.chunk_rest.call(null, seq__44639__$1);
            var G__44648 = c__4142__auto__;
            var G__44649 = cljs.core.count.call(null, c__4142__auto__);
            var G__44650 = 0;
            seq__44639 = G__44647;
            chunk__44640 = G__44648;
            count__44641 = G__44649;
            i__44642 = G__44650;
            continue;
          } else {
            var s = cljs.core.first.call(null, seq__44639__$1);
            cljs.core._write.call(null, writer, s);
            var G__44651 = cljs.core.next.call(null, seq__44639__$1);
            var G__44652 = null;
            var G__44653 = 0;
            var G__44654 = 0;
            seq__44639 = G__44651;
            chunk__44640 = G__44652;
            count__44641 = G__44653;
            i__44642 = G__44654;
            continue;
          }
        } else {
          return null;
        }
      }
      break;
    }
  };
  var write_all = function(writer, var_args) {
    var ss = null;
    if (arguments.length > 1) {
      ss = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return write_all__delegate.call(this, writer, ss);
  };
  write_all.cljs$lang$maxFixedArity = 1;
  write_all.cljs$lang$applyTo = function(arglist__44655) {
    var writer = cljs.core.first(arglist__44655);
    var ss = cljs.core.rest(arglist__44655);
    return write_all__delegate(writer, ss);
  };
  write_all.cljs$core$IFn$_invoke$arity$variadic = write_all__delegate;
  return write_all;
}();
cljs.core.string_print = function string_print(x) {
  cljs.core._STAR_print_fn_STAR_.call(null, x);
  return null;
};
cljs.core.flush = function flush() {
  return null;
};
cljs.core.char_escapes = function() {
  var obj44657 = {'"':'\\"', "\\":"\\\\", "\b":"\\b", "\f":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t"};
  return obj44657;
}();
cljs.core.quote_string = function quote_string(s) {
  return[cljs.core.str('"'), cljs.core.str(s.replace(RegExp('[\\\\"\b\f\n\r\t]', "g"), function(match) {
    return cljs.core.char_escapes[match];
  })), cljs.core.str('"')].join("");
};
cljs.core.pr_writer = function pr_writer(obj, writer, opts) {
  if (obj == null) {
    return cljs.core._write.call(null, writer, "nil");
  } else {
    if (void 0 === obj) {
      return cljs.core._write.call(null, writer, "#\x3cundefined\x3e");
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        if (cljs.core.truth_(function() {
          var and__3388__auto__ = cljs.core.get.call(null, opts, new cljs.core.Keyword(null, "meta", "meta", 1017252215));
          if (cljs.core.truth_(and__3388__auto__)) {
            var and__3388__auto____$1 = function() {
              var G__44663 = obj;
              if (G__44663) {
                var bit__4044__auto__ = G__44663.cljs$lang$protocol_mask$partition0$ & 131072;
                if (bit__4044__auto__ || G__44663.cljs$core$IMeta$) {
                  return true;
                } else {
                  if (!G__44663.cljs$lang$protocol_mask$partition0$) {
                    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMeta, G__44663);
                  } else {
                    return false;
                  }
                }
              } else {
                return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IMeta, G__44663);
              }
            }();
            if (and__3388__auto____$1) {
              return cljs.core.meta.call(null, obj);
            } else {
              return and__3388__auto____$1;
            }
          } else {
            return and__3388__auto__;
          }
        }())) {
          cljs.core._write.call(null, writer, "^");
          pr_writer.call(null, cljs.core.meta.call(null, obj), writer, opts);
          cljs.core._write.call(null, writer, " ");
        } else {
        }
        if (obj == null) {
          return cljs.core._write.call(null, writer, "nil");
        } else {
          if (obj.cljs$lang$type) {
            return obj.cljs$lang$ctorPrWriter(obj, writer, opts);
          } else {
            if (function() {
              var G__44664 = obj;
              if (G__44664) {
                var bit__4037__auto__ = G__44664.cljs$lang$protocol_mask$partition0$ & 2147483648;
                if (bit__4037__auto__ || G__44664.cljs$core$IPrintWithWriter$) {
                  return true;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            }()) {
              return cljs.core._pr_writer.call(null, obj, writer, opts);
            } else {
              if (cljs.core.type.call(null, obj) === Boolean || typeof obj === "number") {
                return cljs.core._write.call(null, writer, [cljs.core.str(obj)].join(""));
              } else {
                if (cljs.core.object_QMARK_.call(null, obj)) {
                  cljs.core._write.call(null, writer, "#js ");
                  return cljs.core.print_map.call(null, cljs.core.map.call(null, function(k) {
                    return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [cljs.core.keyword.call(null, k), obj[k]], null);
                  }, cljs.core.js_keys.call(null, obj)), pr_writer, writer, opts);
                } else {
                  if (obj instanceof Array) {
                    return cljs.core.pr_sequential_writer.call(null, writer, pr_writer, "#js [", " ", "]", opts, obj);
                  } else {
                    if (goog.isString(obj)) {
                      if (cljs.core.truth_((new cljs.core.Keyword(null, "readably", "readably", 4441712502)).cljs$core$IFn$_invoke$arity$1(opts))) {
                        return cljs.core._write.call(null, writer, cljs.core.quote_string.call(null, obj));
                      } else {
                        return cljs.core._write.call(null, writer, obj);
                      }
                    } else {
                      if (cljs.core.fn_QMARK_.call(null, obj)) {
                        return cljs.core.write_all.call(null, writer, "#\x3c", [cljs.core.str(obj)].join(""), "\x3e");
                      } else {
                        if (obj instanceof Date) {
                          var normalize = function(n, len) {
                            var ns = [cljs.core.str(n)].join("");
                            while (true) {
                              if (cljs.core.count.call(null, ns) < len) {
                                var G__44666 = [cljs.core.str("0"), cljs.core.str(ns)].join("");
                                ns = G__44666;
                                continue;
                              } else {
                                return ns;
                              }
                              break;
                            }
                          };
                          return cljs.core.write_all.call(null, writer, '#inst "', [cljs.core.str(obj.getUTCFullYear())].join(""), "-", normalize.call(null, obj.getUTCMonth() + 1, 2), "-", normalize.call(null, obj.getUTCDate(), 2), "T", normalize.call(null, obj.getUTCHours(), 2), ":", normalize.call(null, obj.getUTCMinutes(), 2), ":", normalize.call(null, obj.getUTCSeconds(), 2), ".", normalize.call(null, obj.getUTCMilliseconds(), 3), "-", '00:00"');
                        } else {
                          if (cljs.core.regexp_QMARK_.call(null, obj)) {
                            return cljs.core.write_all.call(null, writer, '#"', obj.source, '"');
                          } else {
                            if (function() {
                              var G__44665 = obj;
                              if (G__44665) {
                                var bit__4044__auto__ = G__44665.cljs$lang$protocol_mask$partition0$ & 2147483648;
                                if (bit__4044__auto__ || G__44665.cljs$core$IPrintWithWriter$) {
                                  return true;
                                } else {
                                  if (!G__44665.cljs$lang$protocol_mask$partition0$) {
                                    return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IPrintWithWriter, G__44665);
                                  } else {
                                    return false;
                                  }
                                }
                              } else {
                                return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IPrintWithWriter, G__44665);
                              }
                            }()) {
                              return cljs.core._pr_writer.call(null, obj, writer, opts);
                            } else {
                              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                                return cljs.core.write_all.call(null, writer, "#\x3c", [cljs.core.str(obj)].join(""), "\x3e");
                              } else {
                                return null;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        return null;
      }
    }
  }
};
cljs.core.pr_seq_writer = function pr_seq_writer(objs, writer, opts) {
  cljs.core.pr_writer.call(null, cljs.core.first.call(null, objs), writer, opts);
  var seq__44671 = cljs.core.seq.call(null, cljs.core.next.call(null, objs));
  var chunk__44672 = null;
  var count__44673 = 0;
  var i__44674 = 0;
  while (true) {
    if (i__44674 < count__44673) {
      var obj = cljs.core._nth.call(null, chunk__44672, i__44674);
      cljs.core._write.call(null, writer, " ");
      cljs.core.pr_writer.call(null, obj, writer, opts);
      var G__44675 = seq__44671;
      var G__44676 = chunk__44672;
      var G__44677 = count__44673;
      var G__44678 = i__44674 + 1;
      seq__44671 = G__44675;
      chunk__44672 = G__44676;
      count__44673 = G__44677;
      i__44674 = G__44678;
      continue;
    } else {
      var temp__4092__auto__ = cljs.core.seq.call(null, seq__44671);
      if (temp__4092__auto__) {
        var seq__44671__$1 = temp__4092__auto__;
        if (cljs.core.chunked_seq_QMARK_.call(null, seq__44671__$1)) {
          var c__4142__auto__ = cljs.core.chunk_first.call(null, seq__44671__$1);
          var G__44679 = cljs.core.chunk_rest.call(null, seq__44671__$1);
          var G__44680 = c__4142__auto__;
          var G__44681 = cljs.core.count.call(null, c__4142__auto__);
          var G__44682 = 0;
          seq__44671 = G__44679;
          chunk__44672 = G__44680;
          count__44673 = G__44681;
          i__44674 = G__44682;
          continue;
        } else {
          var obj = cljs.core.first.call(null, seq__44671__$1);
          cljs.core._write.call(null, writer, " ");
          cljs.core.pr_writer.call(null, obj, writer, opts);
          var G__44683 = cljs.core.next.call(null, seq__44671__$1);
          var G__44684 = null;
          var G__44685 = 0;
          var G__44686 = 0;
          seq__44671 = G__44683;
          chunk__44672 = G__44684;
          count__44673 = G__44685;
          i__44674 = G__44686;
          continue;
        }
      } else {
        return null;
      }
    }
    break;
  }
};
cljs.core.pr_sb_with_opts = function pr_sb_with_opts(objs, opts) {
  var sb = new goog.string.StringBuffer;
  var writer = new cljs.core.StringBufferWriter(sb);
  cljs.core.pr_seq_writer.call(null, objs, writer, opts);
  cljs.core._flush.call(null, writer);
  return sb;
};
cljs.core.pr_str_with_opts = function pr_str_with_opts(objs, opts) {
  if (cljs.core.empty_QMARK_.call(null, objs)) {
    return "";
  } else {
    return[cljs.core.str(cljs.core.pr_sb_with_opts.call(null, objs, opts))].join("");
  }
};
cljs.core.prn_str_with_opts = function prn_str_with_opts(objs, opts) {
  if (cljs.core.empty_QMARK_.call(null, objs)) {
    return "\n";
  } else {
    var sb = cljs.core.pr_sb_with_opts.call(null, objs, opts);
    sb.append("\n");
    return[cljs.core.str(sb)].join("");
  }
};
cljs.core.pr_with_opts = function pr_with_opts(objs, opts) {
  return cljs.core.string_print.call(null, cljs.core.pr_str_with_opts.call(null, objs, opts));
};
cljs.core.newline = function newline(opts) {
  cljs.core.string_print.call(null, "\n");
  if (cljs.core.truth_(cljs.core.get.call(null, opts, new cljs.core.Keyword(null, "flush-on-newline", "flush-on-newline", 4338025857)))) {
    return cljs.core.flush.call(null);
  } else {
    return null;
  }
};
cljs.core.pr_str = function() {
  var pr_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
  };
  var pr_str = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return pr_str__delegate.call(this, objs);
  };
  pr_str.cljs$lang$maxFixedArity = 0;
  pr_str.cljs$lang$applyTo = function(arglist__44687) {
    var objs = cljs.core.seq(arglist__44687);
    return pr_str__delegate(objs);
  };
  pr_str.cljs$core$IFn$_invoke$arity$variadic = pr_str__delegate;
  return pr_str;
}();
cljs.core.prn_str = function() {
  var prn_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
  };
  var prn_str = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return prn_str__delegate.call(this, objs);
  };
  prn_str.cljs$lang$maxFixedArity = 0;
  prn_str.cljs$lang$applyTo = function(arglist__44688) {
    var objs = cljs.core.seq(arglist__44688);
    return prn_str__delegate(objs);
  };
  prn_str.cljs$core$IFn$_invoke$arity$variadic = prn_str__delegate;
  return prn_str;
}();
cljs.core.pr = function() {
  var pr__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
  };
  var pr = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return pr__delegate.call(this, objs);
  };
  pr.cljs$lang$maxFixedArity = 0;
  pr.cljs$lang$applyTo = function(arglist__44689) {
    var objs = cljs.core.seq(arglist__44689);
    return pr__delegate(objs);
  };
  pr.cljs$core$IFn$_invoke$arity$variadic = pr__delegate;
  return pr;
}();
cljs.core.print = function() {
  var cljs_core_print__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), new cljs.core.Keyword(null, "readably", "readably", 4441712502), false));
  };
  var cljs_core_print = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return cljs_core_print__delegate.call(this, objs);
  };
  cljs_core_print.cljs$lang$maxFixedArity = 0;
  cljs_core_print.cljs$lang$applyTo = function(arglist__44690) {
    var objs = cljs.core.seq(arglist__44690);
    return cljs_core_print__delegate(objs);
  };
  cljs_core_print.cljs$core$IFn$_invoke$arity$variadic = cljs_core_print__delegate;
  return cljs_core_print;
}();
cljs.core.print_str = function() {
  var print_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), new cljs.core.Keyword(null, "readably", "readably", 4441712502), false));
  };
  var print_str = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return print_str__delegate.call(this, objs);
  };
  print_str.cljs$lang$maxFixedArity = 0;
  print_str.cljs$lang$applyTo = function(arglist__44691) {
    var objs = cljs.core.seq(arglist__44691);
    return print_str__delegate(objs);
  };
  print_str.cljs$core$IFn$_invoke$arity$variadic = print_str__delegate;
  return print_str;
}();
cljs.core.println = function() {
  var println__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), new cljs.core.Keyword(null, "readably", "readably", 4441712502), false));
    if (cljs.core.truth_(cljs.core._STAR_print_newline_STAR_)) {
      return cljs.core.newline.call(null, cljs.core.pr_opts.call(null));
    } else {
      return null;
    }
  };
  var println = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return println__delegate.call(this, objs);
  };
  println.cljs$lang$maxFixedArity = 0;
  println.cljs$lang$applyTo = function(arglist__44692) {
    var objs = cljs.core.seq(arglist__44692);
    return println__delegate(objs);
  };
  println.cljs$core$IFn$_invoke$arity$variadic = println__delegate;
  return println;
}();
cljs.core.println_str = function() {
  var println_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), new cljs.core.Keyword(null, "readably", "readably", 4441712502), false));
  };
  var println_str = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return println_str__delegate.call(this, objs);
  };
  println_str.cljs$lang$maxFixedArity = 0;
  println_str.cljs$lang$applyTo = function(arglist__44693) {
    var objs = cljs.core.seq(arglist__44693);
    return println_str__delegate(objs);
  };
  println_str.cljs$core$IFn$_invoke$arity$variadic = println_str__delegate;
  return println_str;
}();
cljs.core.prn = function() {
  var prn__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
    if (cljs.core.truth_(cljs.core._STAR_print_newline_STAR_)) {
      return cljs.core.newline.call(null, cljs.core.pr_opts.call(null));
    } else {
      return null;
    }
  };
  var prn = function(var_args) {
    var objs = null;
    if (arguments.length > 0) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return prn__delegate.call(this, objs);
  };
  prn.cljs$lang$maxFixedArity = 0;
  prn.cljs$lang$applyTo = function(arglist__44694) {
    var objs = cljs.core.seq(arglist__44694);
    return prn__delegate(objs);
  };
  prn.cljs$core$IFn$_invoke$arity$variadic = prn__delegate;
  return prn;
}();
cljs.core.print_map = function print_map(m, print_one, writer, opts) {
  return cljs.core.pr_sequential_writer.call(null, writer, function(e, w, opts__$1) {
    print_one.call(null, cljs.core.key.call(null, e), w, opts__$1);
    cljs.core._write.call(null, w, " ");
    return print_one.call(null, cljs.core.val.call(null, e), w, opts__$1);
  }, "{", ", ", "}", opts, cljs.core.seq.call(null, m));
};
cljs.core.KeySeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.KeySeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.IndexedSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.Subvec.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.Subvec.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "[", " ", "]", opts, coll__$1);
};
cljs.core.ChunkedCons.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.ChunkedCons.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.print_map.call(null, coll__$1, cljs.core.pr_writer, writer, opts);
};
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentArrayMap.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.print_map.call(null, coll__$1, cljs.core.pr_writer, writer, opts);
};
cljs.core.PersistentQueue.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "#queue [", " ", "]", opts, cljs.core.seq.call(null, coll__$1));
};
cljs.core.LazySeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.LazySeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.RSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.RSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "#{", " ", "}", opts, coll__$1);
};
cljs.core.NodeSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.RedNode.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.RedNode.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "[", " ", "]", opts, coll__$1);
};
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.ChunkedSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.print_map.call(null, coll__$1, cljs.core.pr_writer, writer, opts);
};
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentHashSet.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "#{", " ", "}", opts, coll__$1);
};
cljs.core.PersistentVector.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "[", " ", "]", opts, coll__$1);
};
cljs.core.List.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.List.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentArrayMapSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.EmptyList.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.EmptyList.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core._write.call(null, writer, "()");
};
cljs.core.BlackNode.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.BlackNode.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "[", " ", "]", opts, coll__$1);
};
cljs.core.Cons.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.Cons.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.Range.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.Range.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.ValSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.ValSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.ObjMap.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.ObjMap.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.print_map.call(null, coll__$1, cljs.core.pr_writer, writer, opts);
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintWithWriter$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(coll, writer, opts) {
  var coll__$1 = this;
  return cljs.core.pr_sequential_writer.call(null, writer, cljs.core.pr_writer, "(", " ", ")", opts, coll__$1);
};
cljs.core.PersistentVector.prototype.cljs$core$IComparable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  var x__$1 = this;
  return cljs.core.compare_indexed.call(null, x__$1, y);
};
cljs.core.Subvec.prototype.cljs$core$IComparable$ = true;
cljs.core.Subvec.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  var x__$1 = this;
  return cljs.core.compare_indexed.call(null, x__$1, y);
};
cljs.core.Keyword.prototype.cljs$core$IComparable$ = true;
cljs.core.Keyword.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  var x__$1 = this;
  return cljs.core.compare_symbols.call(null, x__$1, y);
};
cljs.core.Symbol.prototype.cljs$core$IComparable$ = true;
cljs.core.Symbol.prototype.cljs$core$IComparable$_compare$arity$2 = function(x, y) {
  var x__$1 = this;
  return cljs.core.compare_symbols.call(null, x__$1, y);
};
cljs.core.Atom = function(state, meta, validator, watches) {
  this.state = state;
  this.meta = meta;
  this.validator = validator;
  this.watches = watches;
  this.cljs$lang$protocol_mask$partition0$ = 2153938944;
  this.cljs$lang$protocol_mask$partition1$ = 2;
};
cljs.core.Atom.cljs$lang$type = true;
cljs.core.Atom.cljs$lang$ctorStr = "cljs.core/Atom";
cljs.core.Atom.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Atom");
};
cljs.core.Atom.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return goog.getUid(this$__$1);
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_notify_watches$arity$3 = function(this$, oldval, newval) {
  var self__ = this;
  var this$__$1 = this;
  var seq__44695 = cljs.core.seq.call(null, self__.watches);
  var chunk__44696 = null;
  var count__44697 = 0;
  var i__44698 = 0;
  while (true) {
    if (i__44698 < count__44697) {
      var vec__44699 = cljs.core._nth.call(null, chunk__44696, i__44698);
      var key = cljs.core.nth.call(null, vec__44699, 0, null);
      var f = cljs.core.nth.call(null, vec__44699, 1, null);
      f.call(null, key, this$__$1, oldval, newval);
      var G__44701 = seq__44695;
      var G__44702 = chunk__44696;
      var G__44703 = count__44697;
      var G__44704 = i__44698 + 1;
      seq__44695 = G__44701;
      chunk__44696 = G__44702;
      count__44697 = G__44703;
      i__44698 = G__44704;
      continue;
    } else {
      var temp__4092__auto__ = cljs.core.seq.call(null, seq__44695);
      if (temp__4092__auto__) {
        var seq__44695__$1 = temp__4092__auto__;
        if (cljs.core.chunked_seq_QMARK_.call(null, seq__44695__$1)) {
          var c__4142__auto__ = cljs.core.chunk_first.call(null, seq__44695__$1);
          var G__44705 = cljs.core.chunk_rest.call(null, seq__44695__$1);
          var G__44706 = c__4142__auto__;
          var G__44707 = cljs.core.count.call(null, c__4142__auto__);
          var G__44708 = 0;
          seq__44695 = G__44705;
          chunk__44696 = G__44706;
          count__44697 = G__44707;
          i__44698 = G__44708;
          continue;
        } else {
          var vec__44700 = cljs.core.first.call(null, seq__44695__$1);
          var key = cljs.core.nth.call(null, vec__44700, 0, null);
          var f = cljs.core.nth.call(null, vec__44700, 1, null);
          f.call(null, key, this$__$1, oldval, newval);
          var G__44709 = cljs.core.next.call(null, seq__44695__$1);
          var G__44710 = null;
          var G__44711 = 0;
          var G__44712 = 0;
          seq__44695 = G__44709;
          chunk__44696 = G__44710;
          count__44697 = G__44711;
          i__44698 = G__44712;
          continue;
        }
      } else {
        return null;
      }
    }
    break;
  }
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_add_watch$arity$3 = function(this$, key, f) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1.watches = cljs.core.assoc.call(null, self__.watches, key, f);
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_remove_watch$arity$2 = function(this$, key) {
  var self__ = this;
  var this$__$1 = this;
  return this$__$1.watches = cljs.core.dissoc.call(null, self__.watches, key);
};
cljs.core.Atom.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(a, writer, opts) {
  var self__ = this;
  var a__$1 = this;
  cljs.core._write.call(null, writer, "#\x3cAtom: ");
  cljs.core.pr_writer.call(null, self__.state, writer, opts);
  return cljs.core._write.call(null, writer, "\x3e");
};
cljs.core.Atom.prototype.cljs$core$IMeta$_meta$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.meta;
};
cljs.core.Atom.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return self__.state;
};
cljs.core.Atom.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var self__ = this;
  var o__$1 = this;
  return o__$1 === other;
};
cljs.core.__GT_Atom = function __GT_Atom(state, meta, validator, watches) {
  return new cljs.core.Atom(state, meta, validator, watches);
};
cljs.core.atom = function() {
  var atom = null;
  var atom__1 = function(x) {
    return new cljs.core.Atom(x, null, null, null);
  };
  var atom__2 = function() {
    var G__44716__delegate = function(x, p__44713) {
      var map__44715 = p__44713;
      var map__44715__$1 = cljs.core.seq_QMARK_.call(null, map__44715) ? cljs.core.apply.call(null, cljs.core.hash_map, map__44715) : map__44715;
      var validator = cljs.core.get.call(null, map__44715__$1, new cljs.core.Keyword(null, "validator", "validator", 4199087812));
      var meta = cljs.core.get.call(null, map__44715__$1, new cljs.core.Keyword(null, "meta", "meta", 1017252215));
      return new cljs.core.Atom(x, meta, validator, null);
    };
    var G__44716 = function(x, var_args) {
      var p__44713 = null;
      if (arguments.length > 1) {
        p__44713 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
      }
      return G__44716__delegate.call(this, x, p__44713);
    };
    G__44716.cljs$lang$maxFixedArity = 1;
    G__44716.cljs$lang$applyTo = function(arglist__44717) {
      var x = cljs.core.first(arglist__44717);
      var p__44713 = cljs.core.rest(arglist__44717);
      return G__44716__delegate(x, p__44713);
    };
    G__44716.cljs$core$IFn$_invoke$arity$variadic = G__44716__delegate;
    return G__44716;
  }();
  atom = function(x, var_args) {
    var p__44713 = var_args;
    switch(arguments.length) {
      case 1:
        return atom__1.call(this, x);
      default:
        return atom__2.cljs$core$IFn$_invoke$arity$variadic(x, cljs.core.array_seq(arguments, 1));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  atom.cljs$lang$maxFixedArity = 1;
  atom.cljs$lang$applyTo = atom__2.cljs$lang$applyTo;
  atom.cljs$core$IFn$_invoke$arity$1 = atom__1;
  atom.cljs$core$IFn$_invoke$arity$variadic = atom__2.cljs$core$IFn$_invoke$arity$variadic;
  return atom;
}();
cljs.core.reset_BANG_ = function reset_BANG_(a, new_value) {
  var validate_44718 = a.validator;
  if (validate_44718 == null) {
  } else {
    if (cljs.core.truth_(validate_44718.call(null, new_value))) {
    } else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str("Validator rejected reference state"), cljs.core.str("\n"), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.list(new cljs.core.Symbol(null, "validate", "validate", 1233162959, null), new cljs.core.Symbol(null, "new-value", "new-value", 972165309, null))))].join(""));
    }
  }
  var old_value_44719 = a.state;
  a.state = new_value;
  if (a.watches == null) {
  } else {
    cljs.core._notify_watches.call(null, a, old_value_44719, new_value);
  }
  return new_value;
};
cljs.core.swap_BANG_ = function() {
  var swap_BANG_ = null;
  var swap_BANG___2 = function(a, f) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state));
  };
  var swap_BANG___3 = function(a, f, x) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x));
  };
  var swap_BANG___4 = function(a, f, x, y) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y));
  };
  var swap_BANG___5 = function(a, f, x, y, z) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y, z));
  };
  var swap_BANG___6 = function() {
    var G__44720__delegate = function(a, f, x, y, z, more) {
      return cljs.core.reset_BANG_.call(null, a, cljs.core.apply.call(null, f, a.state, x, y, z, more));
    };
    var G__44720 = function(a, f, x, y, z, var_args) {
      var more = null;
      if (arguments.length > 5) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0);
      }
      return G__44720__delegate.call(this, a, f, x, y, z, more);
    };
    G__44720.cljs$lang$maxFixedArity = 5;
    G__44720.cljs$lang$applyTo = function(arglist__44721) {
      var a = cljs.core.first(arglist__44721);
      arglist__44721 = cljs.core.next(arglist__44721);
      var f = cljs.core.first(arglist__44721);
      arglist__44721 = cljs.core.next(arglist__44721);
      var x = cljs.core.first(arglist__44721);
      arglist__44721 = cljs.core.next(arglist__44721);
      var y = cljs.core.first(arglist__44721);
      arglist__44721 = cljs.core.next(arglist__44721);
      var z = cljs.core.first(arglist__44721);
      var more = cljs.core.rest(arglist__44721);
      return G__44720__delegate(a, f, x, y, z, more);
    };
    G__44720.cljs$core$IFn$_invoke$arity$variadic = G__44720__delegate;
    return G__44720;
  }();
  swap_BANG_ = function(a, f, x, y, z, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return swap_BANG___2.call(this, a, f);
      case 3:
        return swap_BANG___3.call(this, a, f, x);
      case 4:
        return swap_BANG___4.call(this, a, f, x, y);
      case 5:
        return swap_BANG___5.call(this, a, f, x, y, z);
      default:
        return swap_BANG___6.cljs$core$IFn$_invoke$arity$variadic(a, f, x, y, z, cljs.core.array_seq(arguments, 5));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  swap_BANG_.cljs$lang$maxFixedArity = 5;
  swap_BANG_.cljs$lang$applyTo = swap_BANG___6.cljs$lang$applyTo;
  swap_BANG_.cljs$core$IFn$_invoke$arity$2 = swap_BANG___2;
  swap_BANG_.cljs$core$IFn$_invoke$arity$3 = swap_BANG___3;
  swap_BANG_.cljs$core$IFn$_invoke$arity$4 = swap_BANG___4;
  swap_BANG_.cljs$core$IFn$_invoke$arity$5 = swap_BANG___5;
  swap_BANG_.cljs$core$IFn$_invoke$arity$variadic = swap_BANG___6.cljs$core$IFn$_invoke$arity$variadic;
  return swap_BANG_;
}();
cljs.core.compare_and_set_BANG_ = function compare_and_set_BANG_(a, oldval, newval) {
  if (cljs.core._EQ_.call(null, a.state, oldval)) {
    cljs.core.reset_BANG_.call(null, a, newval);
    return true;
  } else {
    return false;
  }
};
cljs.core.deref = function deref(o) {
  return cljs.core._deref.call(null, o);
};
cljs.core.set_validator_BANG_ = function set_validator_BANG_(iref, val) {
  return iref.validator = val;
};
cljs.core.get_validator = function get_validator(iref) {
  return iref.validator;
};
cljs.core.alter_meta_BANG_ = function() {
  var alter_meta_BANG___delegate = function(iref, f, args) {
    return iref.meta = cljs.core.apply.call(null, f, iref.meta, args);
  };
  var alter_meta_BANG_ = function(iref, f, var_args) {
    var args = null;
    if (arguments.length > 2) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return alter_meta_BANG___delegate.call(this, iref, f, args);
  };
  alter_meta_BANG_.cljs$lang$maxFixedArity = 2;
  alter_meta_BANG_.cljs$lang$applyTo = function(arglist__44722) {
    var iref = cljs.core.first(arglist__44722);
    arglist__44722 = cljs.core.next(arglist__44722);
    var f = cljs.core.first(arglist__44722);
    var args = cljs.core.rest(arglist__44722);
    return alter_meta_BANG___delegate(iref, f, args);
  };
  alter_meta_BANG_.cljs$core$IFn$_invoke$arity$variadic = alter_meta_BANG___delegate;
  return alter_meta_BANG_;
}();
cljs.core.reset_meta_BANG_ = function reset_meta_BANG_(iref, m) {
  return iref.meta = m;
};
cljs.core.add_watch = function add_watch(iref, key, f) {
  return cljs.core._add_watch.call(null, iref, key, f);
};
cljs.core.remove_watch = function remove_watch(iref, key) {
  return cljs.core._remove_watch.call(null, iref, key);
};
cljs.core.gensym_counter = null;
cljs.core.gensym = function() {
  var gensym = null;
  var gensym__0 = function() {
    return gensym.call(null, "G__");
  };
  var gensym__1 = function(prefix_string) {
    if (cljs.core.gensym_counter == null) {
      cljs.core.gensym_counter = cljs.core.atom.call(null, 0);
    } else {
    }
    return cljs.core.symbol.call(null, [cljs.core.str(prefix_string), cljs.core.str(cljs.core.swap_BANG_.call(null, cljs.core.gensym_counter, cljs.core.inc))].join(""));
  };
  gensym = function(prefix_string) {
    switch(arguments.length) {
      case 0:
        return gensym__0.call(this);
      case 1:
        return gensym__1.call(this, prefix_string);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  gensym.cljs$core$IFn$_invoke$arity$0 = gensym__0;
  gensym.cljs$core$IFn$_invoke$arity$1 = gensym__1;
  return gensym;
}();
cljs.core.fixture1 = 1;
cljs.core.fixture2 = 2;
cljs.core.Delay = function(state, f) {
  this.state = state;
  this.f = f;
  this.cljs$lang$protocol_mask$partition1$ = 1;
  this.cljs$lang$protocol_mask$partition0$ = 32768;
};
cljs.core.Delay.cljs$lang$type = true;
cljs.core.Delay.cljs$lang$ctorStr = "cljs.core/Delay";
cljs.core.Delay.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/Delay");
};
cljs.core.Delay.prototype.cljs$core$IPending$_realized_QMARK_$arity$1 = function(d) {
  var self__ = this;
  var d__$1 = this;
  return(new cljs.core.Keyword(null, "done", "done", 1016993524)).cljs$core$IFn$_invoke$arity$1(cljs.core.deref.call(null, self__.state));
};
cljs.core.Delay.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return(new cljs.core.Keyword(null, "value", "value", 1125876963)).cljs$core$IFn$_invoke$arity$1(cljs.core.swap_BANG_.call(null, self__.state, function(p__44723) {
    var map__44724 = p__44723;
    var map__44724__$1 = cljs.core.seq_QMARK_.call(null, map__44724) ? cljs.core.apply.call(null, cljs.core.hash_map, map__44724) : map__44724;
    var curr_state = map__44724__$1;
    var done = cljs.core.get.call(null, map__44724__$1, new cljs.core.Keyword(null, "done", "done", 1016993524));
    if (cljs.core.truth_(done)) {
      return curr_state;
    } else {
      return new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null, "done", "done", 1016993524), true, new cljs.core.Keyword(null, "value", "value", 1125876963), self__.f.call(null)], null);
    }
  }));
};
cljs.core.__GT_Delay = function __GT_Delay(state, f) {
  return new cljs.core.Delay(state, f);
};
cljs.core.delay_QMARK_ = function delay_QMARK_(x) {
  return x instanceof cljs.core.Delay;
};
cljs.core.force = function force(x) {
  if (cljs.core.delay_QMARK_.call(null, x)) {
    return cljs.core.deref.call(null, x);
  } else {
    return x;
  }
};
cljs.core.realized_QMARK_ = function realized_QMARK_(d) {
  return cljs.core._realized_QMARK_.call(null, d);
};
cljs.core.IEncodeJS = function() {
  var obj44726 = {};
  return obj44726;
}();
cljs.core._clj__GT_js = function _clj__GT_js(x) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$IEncodeJS$_clj__GT_js$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$IEncodeJS$_clj__GT_js$arity$1(x);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._clj__GT_js[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._clj__GT_js["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEncodeJS.-clj-\x3ejs", x);
        }
      }
    }().call(null, x);
  }
};
cljs.core._key__GT_js = function _key__GT_js(x) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$IEncodeJS$_key__GT_js$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$IEncodeJS$_key__GT_js$arity$1(x);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._key__GT_js[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._key__GT_js["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEncodeJS.-key-\x3ejs", x);
        }
      }
    }().call(null, x);
  }
};
cljs.core.key__GT_js = function key__GT_js(k) {
  if (function() {
    var G__44728 = k;
    if (G__44728) {
      var bit__4044__auto__ = null;
      if (cljs.core.truth_(function() {
        var or__3400__auto__ = bit__4044__auto__;
        if (cljs.core.truth_(or__3400__auto__)) {
          return or__3400__auto__;
        } else {
          return G__44728.cljs$core$IEncodeJS$;
        }
      }())) {
        return true;
      } else {
        if (!G__44728.cljs$lang$protocol_mask$partition$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeJS, G__44728);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeJS, G__44728);
    }
  }()) {
    return cljs.core._clj__GT_js.call(null, k);
  } else {
    if (typeof k === "string" || (typeof k === "number" || (k instanceof cljs.core.Keyword || k instanceof cljs.core.Symbol))) {
      return cljs.core.clj__GT_js.call(null, k);
    } else {
      return cljs.core.pr_str.call(null, k);
    }
  }
};
cljs.core.clj__GT_js = function clj__GT_js(x) {
  if (x == null) {
    return null;
  } else {
    if (function() {
      var G__44742 = x;
      if (G__44742) {
        var bit__4044__auto__ = null;
        if (cljs.core.truth_(function() {
          var or__3400__auto__ = bit__4044__auto__;
          if (cljs.core.truth_(or__3400__auto__)) {
            return or__3400__auto__;
          } else {
            return G__44742.cljs$core$IEncodeJS$;
          }
        }())) {
          return true;
        } else {
          if (!G__44742.cljs$lang$protocol_mask$partition$) {
            return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeJS, G__44742);
          } else {
            return false;
          }
        }
      } else {
        return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeJS, G__44742);
      }
    }()) {
      return cljs.core._clj__GT_js.call(null, x);
    } else {
      if (x instanceof cljs.core.Keyword) {
        return cljs.core.name.call(null, x);
      } else {
        if (x instanceof cljs.core.Symbol) {
          return[cljs.core.str(x)].join("");
        } else {
          if (cljs.core.map_QMARK_.call(null, x)) {
            var m = function() {
              var obj44744 = {};
              return obj44744;
            }();
            var seq__44745_44755 = cljs.core.seq.call(null, x);
            var chunk__44746_44756 = null;
            var count__44747_44757 = 0;
            var i__44748_44758 = 0;
            while (true) {
              if (i__44748_44758 < count__44747_44757) {
                var vec__44749_44759 = cljs.core._nth.call(null, chunk__44746_44756, i__44748_44758);
                var k_44760 = cljs.core.nth.call(null, vec__44749_44759, 0, null);
                var v_44761 = cljs.core.nth.call(null, vec__44749_44759, 1, null);
                m[cljs.core.key__GT_js.call(null, k_44760)] = clj__GT_js.call(null, v_44761);
                var G__44762 = seq__44745_44755;
                var G__44763 = chunk__44746_44756;
                var G__44764 = count__44747_44757;
                var G__44765 = i__44748_44758 + 1;
                seq__44745_44755 = G__44762;
                chunk__44746_44756 = G__44763;
                count__44747_44757 = G__44764;
                i__44748_44758 = G__44765;
                continue;
              } else {
                var temp__4092__auto___44766 = cljs.core.seq.call(null, seq__44745_44755);
                if (temp__4092__auto___44766) {
                  var seq__44745_44767__$1 = temp__4092__auto___44766;
                  if (cljs.core.chunked_seq_QMARK_.call(null, seq__44745_44767__$1)) {
                    var c__4142__auto___44768 = cljs.core.chunk_first.call(null, seq__44745_44767__$1);
                    var G__44769 = cljs.core.chunk_rest.call(null, seq__44745_44767__$1);
                    var G__44770 = c__4142__auto___44768;
                    var G__44771 = cljs.core.count.call(null, c__4142__auto___44768);
                    var G__44772 = 0;
                    seq__44745_44755 = G__44769;
                    chunk__44746_44756 = G__44770;
                    count__44747_44757 = G__44771;
                    i__44748_44758 = G__44772;
                    continue;
                  } else {
                    var vec__44750_44773 = cljs.core.first.call(null, seq__44745_44767__$1);
                    var k_44774 = cljs.core.nth.call(null, vec__44750_44773, 0, null);
                    var v_44775 = cljs.core.nth.call(null, vec__44750_44773, 1, null);
                    m[cljs.core.key__GT_js.call(null, k_44774)] = clj__GT_js.call(null, v_44775);
                    var G__44776 = cljs.core.next.call(null, seq__44745_44767__$1);
                    var G__44777 = null;
                    var G__44778 = 0;
                    var G__44779 = 0;
                    seq__44745_44755 = G__44776;
                    chunk__44746_44756 = G__44777;
                    count__44747_44757 = G__44778;
                    i__44748_44758 = G__44779;
                    continue;
                  }
                } else {
                }
              }
              break;
            }
            return m;
          } else {
            if (cljs.core.coll_QMARK_.call(null, x)) {
              var arr = [];
              var seq__44751_44780 = cljs.core.seq.call(null, cljs.core.map.call(null, clj__GT_js, x));
              var chunk__44752_44781 = null;
              var count__44753_44782 = 0;
              var i__44754_44783 = 0;
              while (true) {
                if (i__44754_44783 < count__44753_44782) {
                  var x_44784__$1 = cljs.core._nth.call(null, chunk__44752_44781, i__44754_44783);
                  arr.push(x_44784__$1);
                  var G__44785 = seq__44751_44780;
                  var G__44786 = chunk__44752_44781;
                  var G__44787 = count__44753_44782;
                  var G__44788 = i__44754_44783 + 1;
                  seq__44751_44780 = G__44785;
                  chunk__44752_44781 = G__44786;
                  count__44753_44782 = G__44787;
                  i__44754_44783 = G__44788;
                  continue;
                } else {
                  var temp__4092__auto___44789 = cljs.core.seq.call(null, seq__44751_44780);
                  if (temp__4092__auto___44789) {
                    var seq__44751_44790__$1 = temp__4092__auto___44789;
                    if (cljs.core.chunked_seq_QMARK_.call(null, seq__44751_44790__$1)) {
                      var c__4142__auto___44791 = cljs.core.chunk_first.call(null, seq__44751_44790__$1);
                      var G__44792 = cljs.core.chunk_rest.call(null, seq__44751_44790__$1);
                      var G__44793 = c__4142__auto___44791;
                      var G__44794 = cljs.core.count.call(null, c__4142__auto___44791);
                      var G__44795 = 0;
                      seq__44751_44780 = G__44792;
                      chunk__44752_44781 = G__44793;
                      count__44753_44782 = G__44794;
                      i__44754_44783 = G__44795;
                      continue;
                    } else {
                      var x_44796__$1 = cljs.core.first.call(null, seq__44751_44790__$1);
                      arr.push(x_44796__$1);
                      var G__44797 = cljs.core.next.call(null, seq__44751_44790__$1);
                      var G__44798 = null;
                      var G__44799 = 0;
                      var G__44800 = 0;
                      seq__44751_44780 = G__44797;
                      chunk__44752_44781 = G__44798;
                      count__44753_44782 = G__44799;
                      i__44754_44783 = G__44800;
                      continue;
                    }
                  } else {
                  }
                }
                break;
              }
              return arr;
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                return x;
              } else {
                return null;
              }
            }
          }
        }
      }
    }
  }
};
cljs.core.IEncodeClojure = function() {
  var obj44802 = {};
  return obj44802;
}();
cljs.core._js__GT_clj = function _js__GT_clj(x, options) {
  if (function() {
    var and__3388__auto__ = x;
    if (and__3388__auto__) {
      return x.cljs$core$IEncodeClojure$_js__GT_clj$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return x.cljs$core$IEncodeClojure$_js__GT_clj$arity$2(x, options);
  } else {
    var x__4021__auto__ = x == null ? null : x;
    return function() {
      var or__3400__auto__ = cljs.core._js__GT_clj[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._js__GT_clj["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IEncodeClojure.-js-\x3eclj", x);
        }
      }
    }().call(null, x, options);
  }
};
cljs.core.js__GT_clj = function() {
  var js__GT_clj = null;
  var js__GT_clj__1 = function(x) {
    return js__GT_clj.call(null, x, new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null, "keywordize-keys", "keywordize-keys", 4191781672), false], null));
  };
  var js__GT_clj__2 = function() {
    var G__44823__delegate = function(x, opts) {
      if (function() {
        var G__44813 = x;
        if (G__44813) {
          var bit__4044__auto__ = null;
          if (cljs.core.truth_(function() {
            var or__3400__auto__ = bit__4044__auto__;
            if (cljs.core.truth_(or__3400__auto__)) {
              return or__3400__auto__;
            } else {
              return G__44813.cljs$core$IEncodeClojure$;
            }
          }())) {
            return true;
          } else {
            if (!G__44813.cljs$lang$protocol_mask$partition$) {
              return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeClojure, G__44813);
            } else {
              return false;
            }
          }
        } else {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IEncodeClojure, G__44813);
        }
      }()) {
        return cljs.core._js__GT_clj.call(null, x, cljs.core.apply.call(null, cljs.core.array_map, opts));
      } else {
        if (cljs.core.seq.call(null, opts)) {
          var map__44814 = opts;
          var map__44814__$1 = cljs.core.seq_QMARK_.call(null, map__44814) ? cljs.core.apply.call(null, cljs.core.hash_map, map__44814) : map__44814;
          var keywordize_keys = cljs.core.get.call(null, map__44814__$1, new cljs.core.Keyword(null, "keywordize-keys", "keywordize-keys", 4191781672));
          var keyfn = cljs.core.truth_(keywordize_keys) ? cljs.core.keyword : cljs.core.str;
          var f = function(map__44814, map__44814__$1, keywordize_keys, keyfn) {
            return function thisfn(x__$1) {
              if (cljs.core.seq_QMARK_.call(null, x__$1)) {
                return cljs.core.doall.call(null, cljs.core.map.call(null, thisfn, x__$1));
              } else {
                if (cljs.core.coll_QMARK_.call(null, x__$1)) {
                  return cljs.core.into.call(null, cljs.core.empty.call(null, x__$1), cljs.core.map.call(null, thisfn, x__$1));
                } else {
                  if (x__$1 instanceof Array) {
                    return cljs.core.vec.call(null, cljs.core.map.call(null, thisfn, x__$1));
                  } else {
                    if (cljs.core.type.call(null, x__$1) === Object) {
                      return cljs.core.into.call(null, cljs.core.PersistentArrayMap.EMPTY, function() {
                        var iter__4111__auto__ = function(map__44814, map__44814__$1, keywordize_keys, keyfn) {
                          return function iter__44819(s__44820) {
                            return new cljs.core.LazySeq(null, function(map__44814, map__44814__$1, keywordize_keys, keyfn) {
                              return function() {
                                var s__44820__$1 = s__44820;
                                while (true) {
                                  var temp__4092__auto__ = cljs.core.seq.call(null, s__44820__$1);
                                  if (temp__4092__auto__) {
                                    var s__44820__$2 = temp__4092__auto__;
                                    if (cljs.core.chunked_seq_QMARK_.call(null, s__44820__$2)) {
                                      var c__4109__auto__ = cljs.core.chunk_first.call(null, s__44820__$2);
                                      var size__4110__auto__ = cljs.core.count.call(null, c__4109__auto__);
                                      var b__44822 = cljs.core.chunk_buffer.call(null, size__4110__auto__);
                                      if (function() {
                                        var i__44821 = 0;
                                        while (true) {
                                          if (i__44821 < size__4110__auto__) {
                                            var k = cljs.core._nth.call(null, c__4109__auto__, i__44821);
                                            cljs.core.chunk_append.call(null, b__44822, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [keyfn.call(null, k), thisfn.call(null, x__$1[k])], null));
                                            var G__44824 = i__44821 + 1;
                                            i__44821 = G__44824;
                                            continue;
                                          } else {
                                            return true;
                                          }
                                          break;
                                        }
                                      }()) {
                                        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__44822), iter__44819.call(null, cljs.core.chunk_rest.call(null, s__44820__$2)));
                                      } else {
                                        return cljs.core.chunk_cons.call(null, cljs.core.chunk.call(null, b__44822), null);
                                      }
                                    } else {
                                      var k = cljs.core.first.call(null, s__44820__$2);
                                      return cljs.core.cons.call(null, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [keyfn.call(null, k), thisfn.call(null, x__$1[k])], null), iter__44819.call(null, cljs.core.rest.call(null, s__44820__$2)));
                                    }
                                  } else {
                                    return null;
                                  }
                                  break;
                                }
                              };
                            }(map__44814, map__44814__$1, keywordize_keys, keyfn), null, null);
                          };
                        }(map__44814, map__44814__$1, keywordize_keys, keyfn);
                        return iter__4111__auto__.call(null, cljs.core.js_keys.call(null, x__$1));
                      }());
                    } else {
                      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                        return x__$1;
                      } else {
                        return null;
                      }
                    }
                  }
                }
              }
            };
          }(map__44814, map__44814__$1, keywordize_keys, keyfn);
          return f.call(null, x);
        } else {
          return null;
        }
      }
    };
    var G__44823 = function(x, var_args) {
      var opts = null;
      if (arguments.length > 1) {
        opts = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
      }
      return G__44823__delegate.call(this, x, opts);
    };
    G__44823.cljs$lang$maxFixedArity = 1;
    G__44823.cljs$lang$applyTo = function(arglist__44825) {
      var x = cljs.core.first(arglist__44825);
      var opts = cljs.core.rest(arglist__44825);
      return G__44823__delegate(x, opts);
    };
    G__44823.cljs$core$IFn$_invoke$arity$variadic = G__44823__delegate;
    return G__44823;
  }();
  js__GT_clj = function(x, var_args) {
    var opts = var_args;
    switch(arguments.length) {
      case 1:
        return js__GT_clj__1.call(this, x);
      default:
        return js__GT_clj__2.cljs$core$IFn$_invoke$arity$variadic(x, cljs.core.array_seq(arguments, 1));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js__GT_clj.cljs$lang$maxFixedArity = 1;
  js__GT_clj.cljs$lang$applyTo = js__GT_clj__2.cljs$lang$applyTo;
  js__GT_clj.cljs$core$IFn$_invoke$arity$1 = js__GT_clj__1;
  js__GT_clj.cljs$core$IFn$_invoke$arity$variadic = js__GT_clj__2.cljs$core$IFn$_invoke$arity$variadic;
  return js__GT_clj;
}();
cljs.core.memoize = function memoize(f) {
  var mem = cljs.core.atom.call(null, cljs.core.PersistentArrayMap.EMPTY);
  return function() {
    var G__44826__delegate = function(args) {
      var temp__4090__auto__ = cljs.core.get.call(null, cljs.core.deref.call(null, mem), args);
      if (cljs.core.truth_(temp__4090__auto__)) {
        var v = temp__4090__auto__;
        return v;
      } else {
        var ret = cljs.core.apply.call(null, f, args);
        cljs.core.swap_BANG_.call(null, mem, cljs.core.assoc, args, ret);
        return ret;
      }
    };
    var G__44826 = function(var_args) {
      var args = null;
      if (arguments.length > 0) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
      }
      return G__44826__delegate.call(this, args);
    };
    G__44826.cljs$lang$maxFixedArity = 0;
    G__44826.cljs$lang$applyTo = function(arglist__44827) {
      var args = cljs.core.seq(arglist__44827);
      return G__44826__delegate(args);
    };
    G__44826.cljs$core$IFn$_invoke$arity$variadic = G__44826__delegate;
    return G__44826;
  }();
};
cljs.core.trampoline = function() {
  var trampoline = null;
  var trampoline__1 = function(f) {
    while (true) {
      var ret = f.call(null);
      if (cljs.core.fn_QMARK_.call(null, ret)) {
        var G__44828 = ret;
        f = G__44828;
        continue;
      } else {
        return ret;
      }
      break;
    }
  };
  var trampoline__2 = function() {
    var G__44829__delegate = function(f, args) {
      return trampoline.call(null, function() {
        return cljs.core.apply.call(null, f, args);
      });
    };
    var G__44829 = function(f, var_args) {
      var args = null;
      if (arguments.length > 1) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
      }
      return G__44829__delegate.call(this, f, args);
    };
    G__44829.cljs$lang$maxFixedArity = 1;
    G__44829.cljs$lang$applyTo = function(arglist__44830) {
      var f = cljs.core.first(arglist__44830);
      var args = cljs.core.rest(arglist__44830);
      return G__44829__delegate(f, args);
    };
    G__44829.cljs$core$IFn$_invoke$arity$variadic = G__44829__delegate;
    return G__44829;
  }();
  trampoline = function(f, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 1:
        return trampoline__1.call(this, f);
      default:
        return trampoline__2.cljs$core$IFn$_invoke$arity$variadic(f, cljs.core.array_seq(arguments, 1));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  trampoline.cljs$lang$maxFixedArity = 1;
  trampoline.cljs$lang$applyTo = trampoline__2.cljs$lang$applyTo;
  trampoline.cljs$core$IFn$_invoke$arity$1 = trampoline__1;
  trampoline.cljs$core$IFn$_invoke$arity$variadic = trampoline__2.cljs$core$IFn$_invoke$arity$variadic;
  return trampoline;
}();
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return rand.call(null, 1);
  };
  var rand__1 = function(n) {
    return Math.random.call(null) * n;
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  rand.cljs$core$IFn$_invoke$arity$0 = rand__0;
  rand.cljs$core$IFn$_invoke$arity$1 = rand__1;
  return rand;
}();
cljs.core.rand_int = function rand_int(n) {
  return Math.floor.call(null, Math.random.call(null) * n);
};
cljs.core.rand_nth = function rand_nth(coll) {
  return cljs.core.nth.call(null, coll, cljs.core.rand_int.call(null, cljs.core.count.call(null, coll)));
};
cljs.core.group_by = function group_by(f, coll) {
  return cljs.core.reduce.call(null, function(ret, x) {
    var k = f.call(null, x);
    return cljs.core.assoc.call(null, ret, k, cljs.core.conj.call(null, cljs.core.get.call(null, ret, k, cljs.core.PersistentVector.EMPTY), x));
  }, cljs.core.PersistentArrayMap.EMPTY, coll);
};
cljs.core.make_hierarchy = function make_hierarchy() {
  return new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "parents", "parents", 4515496059), cljs.core.PersistentArrayMap.EMPTY, new cljs.core.Keyword(null, "descendants", "descendants", 768214664), cljs.core.PersistentArrayMap.EMPTY, new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442), cljs.core.PersistentArrayMap.EMPTY], null);
};
cljs.core._global_hierarchy = null;
cljs.core.get_global_hierarchy = function get_global_hierarchy() {
  if (cljs.core._global_hierarchy == null) {
    cljs.core._global_hierarchy = cljs.core.atom.call(null, cljs.core.make_hierarchy.call(null));
  } else {
  }
  return cljs.core._global_hierarchy;
};
cljs.core.swap_global_hierarchy_BANG_ = function() {
  var swap_global_hierarchy_BANG___delegate = function(f, args) {
    return cljs.core.apply.call(null, cljs.core.swap_BANG_, cljs.core.get_global_hierarchy.call(null), f, args);
  };
  var swap_global_hierarchy_BANG_ = function(f, var_args) {
    var args = null;
    if (arguments.length > 1) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return swap_global_hierarchy_BANG___delegate.call(this, f, args);
  };
  swap_global_hierarchy_BANG_.cljs$lang$maxFixedArity = 1;
  swap_global_hierarchy_BANG_.cljs$lang$applyTo = function(arglist__44831) {
    var f = cljs.core.first(arglist__44831);
    var args = cljs.core.rest(arglist__44831);
    return swap_global_hierarchy_BANG___delegate(f, args);
  };
  swap_global_hierarchy_BANG_.cljs$core$IFn$_invoke$arity$variadic = swap_global_hierarchy_BANG___delegate;
  return swap_global_hierarchy_BANG_;
}();
cljs.core.isa_QMARK_ = function() {
  var isa_QMARK_ = null;
  var isa_QMARK___2 = function(child, parent) {
    return isa_QMARK_.call(null, cljs.core.deref.call(null, cljs.core.get_global_hierarchy.call(null)), child, parent);
  };
  var isa_QMARK___3 = function(h, child, parent) {
    var or__3400__auto__ = cljs.core._EQ_.call(null, child, parent);
    if (or__3400__auto__) {
      return or__3400__auto__;
    } else {
      var or__3400__auto____$1 = cljs.core.contains_QMARK_.call(null, (new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442)).cljs$core$IFn$_invoke$arity$1(h).call(null, child), parent);
      if (or__3400__auto____$1) {
        return or__3400__auto____$1;
      } else {
        var and__3388__auto__ = cljs.core.vector_QMARK_.call(null, parent);
        if (and__3388__auto__) {
          var and__3388__auto____$1 = cljs.core.vector_QMARK_.call(null, child);
          if (and__3388__auto____$1) {
            var and__3388__auto____$2 = cljs.core.count.call(null, parent) === cljs.core.count.call(null, child);
            if (and__3388__auto____$2) {
              var ret = true;
              var i = 0;
              while (true) {
                if (!ret || i === cljs.core.count.call(null, parent)) {
                  return ret;
                } else {
                  var G__44832 = isa_QMARK_.call(null, h, child.call(null, i), parent.call(null, i));
                  var G__44833 = i + 1;
                  ret = G__44832;
                  i = G__44833;
                  continue;
                }
                break;
              }
            } else {
              return and__3388__auto____$2;
            }
          } else {
            return and__3388__auto____$1;
          }
        } else {
          return and__3388__auto__;
        }
      }
    }
  };
  isa_QMARK_ = function(h, child, parent) {
    switch(arguments.length) {
      case 2:
        return isa_QMARK___2.call(this, h, child);
      case 3:
        return isa_QMARK___3.call(this, h, child, parent);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  isa_QMARK_.cljs$core$IFn$_invoke$arity$2 = isa_QMARK___2;
  isa_QMARK_.cljs$core$IFn$_invoke$arity$3 = isa_QMARK___3;
  return isa_QMARK_;
}();
cljs.core.parents = function() {
  var parents = null;
  var parents__1 = function(tag) {
    return parents.call(null, cljs.core.deref.call(null, cljs.core.get_global_hierarchy.call(null)), tag);
  };
  var parents__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, (new cljs.core.Keyword(null, "parents", "parents", 4515496059)).cljs$core$IFn$_invoke$arity$1(h), tag));
  };
  parents = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return parents__1.call(this, h);
      case 2:
        return parents__2.call(this, h, tag);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  parents.cljs$core$IFn$_invoke$arity$1 = parents__1;
  parents.cljs$core$IFn$_invoke$arity$2 = parents__2;
  return parents;
}();
cljs.core.ancestors = function() {
  var ancestors = null;
  var ancestors__1 = function(tag) {
    return ancestors.call(null, cljs.core.deref.call(null, cljs.core.get_global_hierarchy.call(null)), tag);
  };
  var ancestors__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, (new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442)).cljs$core$IFn$_invoke$arity$1(h), tag));
  };
  ancestors = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return ancestors__1.call(this, h);
      case 2:
        return ancestors__2.call(this, h, tag);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  ancestors.cljs$core$IFn$_invoke$arity$1 = ancestors__1;
  ancestors.cljs$core$IFn$_invoke$arity$2 = ancestors__2;
  return ancestors;
}();
cljs.core.descendants = function() {
  var descendants = null;
  var descendants__1 = function(tag) {
    return descendants.call(null, cljs.core.deref.call(null, cljs.core.get_global_hierarchy.call(null)), tag);
  };
  var descendants__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, (new cljs.core.Keyword(null, "descendants", "descendants", 768214664)).cljs$core$IFn$_invoke$arity$1(h), tag));
  };
  descendants = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return descendants__1.call(this, h);
      case 2:
        return descendants__2.call(this, h, tag);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  descendants.cljs$core$IFn$_invoke$arity$1 = descendants__1;
  descendants.cljs$core$IFn$_invoke$arity$2 = descendants__2;
  return descendants;
}();
cljs.core.derive = function() {
  var derive = null;
  var derive__2 = function(tag, parent) {
    if (cljs.core.truth_(cljs.core.namespace.call(null, parent))) {
    } else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.list(new cljs.core.Symbol(null, "namespace", "namespace", -388313324, null), new cljs.core.Symbol(null, "parent", "parent", 1659011683, null))))].join(""));
    }
    cljs.core.swap_global_hierarchy_BANG_.call(null, derive, tag, parent);
    return null;
  };
  var derive__3 = function(h, tag, parent) {
    if (cljs.core.not_EQ_.call(null, tag, parent)) {
    } else {
      throw new Error([cljs.core.str("Assert failed: "), cljs.core.str(cljs.core.pr_str.call(null, cljs.core.list(new cljs.core.Symbol(null, "not\x3d", "not\x3d", -1637144189, null), new cljs.core.Symbol(null, "tag", "tag", -1640416941, null), new cljs.core.Symbol(null, "parent", "parent", 1659011683, null))))].join(""));
    }
    var tp = (new cljs.core.Keyword(null, "parents", "parents", 4515496059)).cljs$core$IFn$_invoke$arity$1(h);
    var td = (new cljs.core.Keyword(null, "descendants", "descendants", 768214664)).cljs$core$IFn$_invoke$arity$1(h);
    var ta = (new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442)).cljs$core$IFn$_invoke$arity$1(h);
    var tf = function(tp, td, ta) {
      return function(m, source, sources, target, targets) {
        return cljs.core.reduce.call(null, function(tp, td, ta) {
          return function(ret, k) {
            return cljs.core.assoc.call(null, ret, k, cljs.core.reduce.call(null, cljs.core.conj, cljs.core.get.call(null, targets, k, cljs.core.PersistentHashSet.EMPTY), cljs.core.cons.call(null, target, targets.call(null, target))));
          };
        }(tp, td, ta), m, cljs.core.cons.call(null, source, sources.call(null, source)));
      };
    }(tp, td, ta);
    var or__3400__auto__ = cljs.core.contains_QMARK_.call(null, tp.call(null, tag), parent) ? null : function() {
      if (cljs.core.contains_QMARK_.call(null, ta.call(null, tag), parent)) {
        throw new Error([cljs.core.str(tag), cljs.core.str("already has"), cljs.core.str(parent), cljs.core.str("as ancestor")].join(""));
      } else {
      }
      if (cljs.core.contains_QMARK_.call(null, ta.call(null, parent), tag)) {
        throw new Error([cljs.core.str("Cyclic derivation:"), cljs.core.str(parent), cljs.core.str("has"), cljs.core.str(tag), cljs.core.str("as ancestor")].join(""));
      } else {
      }
      return new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "parents", "parents", 4515496059), cljs.core.assoc.call(null, (new cljs.core.Keyword(null, "parents", "parents", 4515496059)).cljs$core$IFn$_invoke$arity$1(h), tag, cljs.core.conj.call(null, cljs.core.get.call(null, tp, tag, cljs.core.PersistentHashSet.EMPTY), parent)), new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442), tf.call(null, (new cljs.core.Keyword(null, "ancestors", "ancestors", 889955442)).cljs$core$IFn$_invoke$arity$1(h), 
      tag, td, parent, ta), new cljs.core.Keyword(null, "descendants", "descendants", 768214664), tf.call(null, (new cljs.core.Keyword(null, "descendants", "descendants", 768214664)).cljs$core$IFn$_invoke$arity$1(h), parent, ta, tag, td)], null);
    }();
    if (cljs.core.truth_(or__3400__auto__)) {
      return or__3400__auto__;
    } else {
      return h;
    }
  };
  derive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return derive__2.call(this, h, tag);
      case 3:
        return derive__3.call(this, h, tag, parent);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  derive.cljs$core$IFn$_invoke$arity$2 = derive__2;
  derive.cljs$core$IFn$_invoke$arity$3 = derive__3;
  return derive;
}();
cljs.core.underive = function() {
  var underive = null;
  var underive__2 = function(tag, parent) {
    cljs.core.swap_global_hierarchy_BANG_.call(null, underive, tag, parent);
    return null;
  };
  var underive__3 = function(h, tag, parent) {
    var parentMap = (new cljs.core.Keyword(null, "parents", "parents", 4515496059)).cljs$core$IFn$_invoke$arity$1(h);
    var childsParents = cljs.core.truth_(parentMap.call(null, tag)) ? cljs.core.disj.call(null, parentMap.call(null, tag), parent) : cljs.core.PersistentHashSet.EMPTY;
    var newParents = cljs.core.truth_(cljs.core.not_empty.call(null, childsParents)) ? cljs.core.assoc.call(null, parentMap, tag, childsParents) : cljs.core.dissoc.call(null, parentMap, tag);
    var deriv_seq = cljs.core.flatten.call(null, cljs.core.map.call(null, function(parentMap, childsParents, newParents) {
      return function(p1__44834_SHARP_) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, p1__44834_SHARP_), cljs.core.interpose.call(null, cljs.core.first.call(null, p1__44834_SHARP_), cljs.core.second.call(null, p1__44834_SHARP_)));
      };
    }(parentMap, childsParents, newParents), cljs.core.seq.call(null, newParents)));
    if (cljs.core.contains_QMARK_.call(null, parentMap.call(null, tag), parent)) {
      return cljs.core.reduce.call(null, function(p1__44835_SHARP_, p2__44836_SHARP_) {
        return cljs.core.apply.call(null, cljs.core.derive, p1__44835_SHARP_, p2__44836_SHARP_);
      }, cljs.core.make_hierarchy.call(null), cljs.core.partition.call(null, 2, deriv_seq));
    } else {
      return h;
    }
  };
  underive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return underive__2.call(this, h, tag);
      case 3:
        return underive__3.call(this, h, tag, parent);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  underive.cljs$core$IFn$_invoke$arity$2 = underive__2;
  underive.cljs$core$IFn$_invoke$arity$3 = underive__3;
  return underive;
}();
cljs.core.reset_cache = function reset_cache(method_cache, method_table, cached_hierarchy, hierarchy) {
  cljs.core.swap_BANG_.call(null, method_cache, function(_) {
    return cljs.core.deref.call(null, method_table);
  });
  return cljs.core.swap_BANG_.call(null, cached_hierarchy, function(_) {
    return cljs.core.deref.call(null, hierarchy);
  });
};
cljs.core.prefers_STAR_ = function prefers_STAR_(x, y, prefer_table) {
  var xprefs = cljs.core.deref.call(null, prefer_table).call(null, x);
  var or__3400__auto__ = cljs.core.truth_(function() {
    var and__3388__auto__ = xprefs;
    if (cljs.core.truth_(and__3388__auto__)) {
      return xprefs.call(null, y);
    } else {
      return and__3388__auto__;
    }
  }()) ? true : null;
  if (cljs.core.truth_(or__3400__auto__)) {
    return or__3400__auto__;
  } else {
    var or__3400__auto____$1 = function() {
      var ps = cljs.core.parents.call(null, y);
      while (true) {
        if (cljs.core.count.call(null, ps) > 0) {
          if (cljs.core.truth_(prefers_STAR_.call(null, x, cljs.core.first.call(null, ps), prefer_table))) {
          } else {
          }
          var G__44837 = cljs.core.rest.call(null, ps);
          ps = G__44837;
          continue;
        } else {
          return null;
        }
        break;
      }
    }();
    if (cljs.core.truth_(or__3400__auto____$1)) {
      return or__3400__auto____$1;
    } else {
      var or__3400__auto____$2 = function() {
        var ps = cljs.core.parents.call(null, x);
        while (true) {
          if (cljs.core.count.call(null, ps) > 0) {
            if (cljs.core.truth_(prefers_STAR_.call(null, cljs.core.first.call(null, ps), y, prefer_table))) {
            } else {
            }
            var G__44838 = cljs.core.rest.call(null, ps);
            ps = G__44838;
            continue;
          } else {
            return null;
          }
          break;
        }
      }();
      if (cljs.core.truth_(or__3400__auto____$2)) {
        return or__3400__auto____$2;
      } else {
        return false;
      }
    }
  }
};
cljs.core.dominates = function dominates(x, y, prefer_table) {
  var or__3400__auto__ = cljs.core.prefers_STAR_.call(null, x, y, prefer_table);
  if (cljs.core.truth_(or__3400__auto__)) {
    return or__3400__auto__;
  } else {
    return cljs.core.isa_QMARK_.call(null, x, y);
  }
};
cljs.core.find_and_cache_best_method = function find_and_cache_best_method(name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  var best_entry = cljs.core.reduce.call(null, function(be, p__44841) {
    var vec__44842 = p__44841;
    var k = cljs.core.nth.call(null, vec__44842, 0, null);
    var _ = cljs.core.nth.call(null, vec__44842, 1, null);
    var e = vec__44842;
    if (cljs.core.isa_QMARK_.call(null, cljs.core.deref.call(null, hierarchy), dispatch_val, k)) {
      var be2 = cljs.core.truth_(function() {
        var or__3400__auto__ = be == null;
        if (or__3400__auto__) {
          return or__3400__auto__;
        } else {
          return cljs.core.dominates.call(null, k, cljs.core.first.call(null, be), prefer_table);
        }
      }()) ? e : be;
      if (cljs.core.truth_(cljs.core.dominates.call(null, cljs.core.first.call(null, be2), k, prefer_table))) {
      } else {
        throw new Error([cljs.core.str("Multiple methods in multimethod '"), cljs.core.str(name), cljs.core.str("' match dispatch value: "), cljs.core.str(dispatch_val), cljs.core.str(" -\x3e "), cljs.core.str(k), cljs.core.str(" and "), cljs.core.str(cljs.core.first.call(null, be2)), cljs.core.str(", and neither is preferred")].join(""));
      }
      return be2;
    } else {
      return be;
    }
  }, null, cljs.core.deref.call(null, method_table));
  if (cljs.core.truth_(best_entry)) {
    if (cljs.core._EQ_.call(null, cljs.core.deref.call(null, cached_hierarchy), cljs.core.deref.call(null, hierarchy))) {
      cljs.core.swap_BANG_.call(null, method_cache, cljs.core.assoc, dispatch_val, cljs.core.second.call(null, best_entry));
      return cljs.core.second.call(null, best_entry);
    } else {
      cljs.core.reset_cache.call(null, method_cache, method_table, cached_hierarchy, hierarchy);
      return find_and_cache_best_method.call(null, name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy);
    }
  } else {
    return null;
  }
};
cljs.core.IMultiFn = function() {
  var obj44844 = {};
  return obj44844;
}();
cljs.core._reset = function _reset(mf) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_reset$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_reset$arity$1(mf);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._reset[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._reset["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-reset", mf);
        }
      }
    }().call(null, mf);
  }
};
cljs.core._add_method = function _add_method(mf, dispatch_val, method) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_add_method$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_add_method$arity$3(mf, dispatch_val, method);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._add_method[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._add_method["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-add-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, method);
  }
};
cljs.core._remove_method = function _remove_method(mf, dispatch_val) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_remove_method$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_remove_method$arity$2(mf, dispatch_val);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._remove_method[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._remove_method["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-remove-method", mf);
        }
      }
    }().call(null, mf, dispatch_val);
  }
};
cljs.core._prefer_method = function _prefer_method(mf, dispatch_val, dispatch_val_y) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_prefer_method$arity$3;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefer_method$arity$3(mf, dispatch_val, dispatch_val_y);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._prefer_method[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._prefer_method["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefer-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, dispatch_val_y);
  }
};
cljs.core._get_method = function _get_method(mf, dispatch_val) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_get_method$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_get_method$arity$2(mf, dispatch_val);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._get_method[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._get_method["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-get-method", mf);
        }
      }
    }().call(null, mf, dispatch_val);
  }
};
cljs.core._methods = function _methods(mf) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_methods$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_methods$arity$1(mf);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._methods[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._methods["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-methods", mf);
        }
      }
    }().call(null, mf);
  }
};
cljs.core._prefers = function _prefers(mf) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_prefers$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefers$arity$1(mf);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._prefers[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._prefers["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefers", mf);
        }
      }
    }().call(null, mf);
  }
};
cljs.core._dispatch = function _dispatch(mf, args) {
  if (function() {
    var and__3388__auto__ = mf;
    if (and__3388__auto__) {
      return mf.cljs$core$IMultiFn$_dispatch$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return mf.cljs$core$IMultiFn$_dispatch$arity$2(mf, args);
  } else {
    var x__4021__auto__ = mf == null ? null : mf;
    return function() {
      var or__3400__auto__ = cljs.core._dispatch[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.core._dispatch["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-dispatch", mf);
        }
      }
    }().call(null, mf, args);
  }
};
cljs.core.do_dispatch = function do_dispatch(mf, name, dispatch_fn, args) {
  var dispatch_val = cljs.core.apply.call(null, dispatch_fn, args);
  var target_fn = cljs.core._get_method.call(null, mf, dispatch_val);
  if (cljs.core.truth_(target_fn)) {
  } else {
    throw new Error([cljs.core.str("No method in multimethod '"), cljs.core.str(name), cljs.core.str("' for dispatch value: "), cljs.core.str(dispatch_val)].join(""));
  }
  return cljs.core.apply.call(null, target_fn, args);
};
cljs.core.MultiFn = function(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  this.name = name;
  this.dispatch_fn = dispatch_fn;
  this.default_dispatch_val = default_dispatch_val;
  this.hierarchy = hierarchy;
  this.method_table = method_table;
  this.prefer_table = prefer_table;
  this.method_cache = method_cache;
  this.cached_hierarchy = cached_hierarchy;
  this.cljs$lang$protocol_mask$partition0$ = 4194304;
  this.cljs$lang$protocol_mask$partition1$ = 256;
};
cljs.core.MultiFn.cljs$lang$type = true;
cljs.core.MultiFn.cljs$lang$ctorStr = "cljs.core/MultiFn";
cljs.core.MultiFn.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/MultiFn");
};
cljs.core.MultiFn.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return goog.getUid(this$__$1);
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_reset$arity$1 = function(mf) {
  var self__ = this;
  var mf__$1 = this;
  cljs.core.swap_BANG_.call(null, self__.method_table, function(mf__$2) {
    return cljs.core.PersistentArrayMap.EMPTY;
  });
  cljs.core.swap_BANG_.call(null, self__.method_cache, function(mf__$2) {
    return cljs.core.PersistentArrayMap.EMPTY;
  });
  cljs.core.swap_BANG_.call(null, self__.prefer_table, function(mf__$2) {
    return cljs.core.PersistentArrayMap.EMPTY;
  });
  cljs.core.swap_BANG_.call(null, self__.cached_hierarchy, function(mf__$2) {
    return null;
  });
  return mf__$1;
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_add_method$arity$3 = function(mf, dispatch_val, method) {
  var self__ = this;
  var mf__$1 = this;
  cljs.core.swap_BANG_.call(null, self__.method_table, cljs.core.assoc, dispatch_val, method);
  cljs.core.reset_cache.call(null, self__.method_cache, self__.method_table, self__.cached_hierarchy, self__.hierarchy);
  return mf__$1;
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_remove_method$arity$2 = function(mf, dispatch_val) {
  var self__ = this;
  var mf__$1 = this;
  cljs.core.swap_BANG_.call(null, self__.method_table, cljs.core.dissoc, dispatch_val);
  cljs.core.reset_cache.call(null, self__.method_cache, self__.method_table, self__.cached_hierarchy, self__.hierarchy);
  return mf__$1;
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_get_method$arity$2 = function(mf, dispatch_val) {
  var self__ = this;
  var mf__$1 = this;
  if (cljs.core._EQ_.call(null, cljs.core.deref.call(null, self__.cached_hierarchy), cljs.core.deref.call(null, self__.hierarchy))) {
  } else {
    cljs.core.reset_cache.call(null, self__.method_cache, self__.method_table, self__.cached_hierarchy, self__.hierarchy);
  }
  var temp__4090__auto__ = cljs.core.deref.call(null, self__.method_cache).call(null, dispatch_val);
  if (cljs.core.truth_(temp__4090__auto__)) {
    var target_fn = temp__4090__auto__;
    return target_fn;
  } else {
    var temp__4090__auto____$1 = cljs.core.find_and_cache_best_method.call(null, self__.name, dispatch_val, self__.hierarchy, self__.method_table, self__.prefer_table, self__.method_cache, self__.cached_hierarchy);
    if (cljs.core.truth_(temp__4090__auto____$1)) {
      var target_fn = temp__4090__auto____$1;
      return target_fn;
    } else {
      return cljs.core.deref.call(null, self__.method_table).call(null, self__.default_dispatch_val);
    }
  }
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefer_method$arity$3 = function(mf, dispatch_val_x, dispatch_val_y) {
  var self__ = this;
  var mf__$1 = this;
  if (cljs.core.truth_(cljs.core.prefers_STAR_.call(null, dispatch_val_x, dispatch_val_y, self__.prefer_table))) {
    throw new Error([cljs.core.str("Preference conflict in multimethod '"), cljs.core.str(self__.name), cljs.core.str("': "), cljs.core.str(dispatch_val_y), cljs.core.str(" is already preferred to "), cljs.core.str(dispatch_val_x)].join(""));
  } else {
  }
  cljs.core.swap_BANG_.call(null, self__.prefer_table, function(old) {
    return cljs.core.assoc.call(null, old, dispatch_val_x, cljs.core.conj.call(null, cljs.core.get.call(null, old, dispatch_val_x, cljs.core.PersistentHashSet.EMPTY), dispatch_val_y));
  });
  return cljs.core.reset_cache.call(null, self__.method_cache, self__.method_table, self__.cached_hierarchy, self__.hierarchy);
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_methods$arity$1 = function(mf) {
  var self__ = this;
  var mf__$1 = this;
  return cljs.core.deref.call(null, self__.method_table);
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefers$arity$1 = function(mf) {
  var self__ = this;
  var mf__$1 = this;
  return cljs.core.deref.call(null, self__.prefer_table);
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_dispatch$arity$2 = function(mf, args) {
  var self__ = this;
  var mf__$1 = this;
  return cljs.core.do_dispatch.call(null, mf__$1, self__.name, self__.dispatch_fn, args);
};
cljs.core.__GT_MultiFn = function __GT_MultiFn(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  return new cljs.core.MultiFn(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy);
};
cljs.core.MultiFn.prototype.call = function() {
  var G__44845__delegate = function(_, args) {
    var self = this;
    return cljs.core._dispatch.call(null, self, args);
  };
  var G__44845 = function(_, var_args) {
    var args = null;
    if (arguments.length > 1) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return G__44845__delegate.call(this, _, args);
  };
  G__44845.cljs$lang$maxFixedArity = 1;
  G__44845.cljs$lang$applyTo = function(arglist__44846) {
    var _ = cljs.core.first(arglist__44846);
    var args = cljs.core.rest(arglist__44846);
    return G__44845__delegate(_, args);
  };
  G__44845.cljs$core$IFn$_invoke$arity$variadic = G__44845__delegate;
  return G__44845;
}();
cljs.core.MultiFn.prototype.apply = function(_, args) {
  var self = this;
  return cljs.core._dispatch.call(null, self, args);
};
cljs.core.remove_all_methods = function remove_all_methods(multifn) {
  return cljs.core._reset.call(null, multifn);
};
cljs.core.remove_method = function remove_method(multifn, dispatch_val) {
  return cljs.core._remove_method.call(null, multifn, dispatch_val);
};
cljs.core.prefer_method = function prefer_method(multifn, dispatch_val_x, dispatch_val_y) {
  return cljs.core._prefer_method.call(null, multifn, dispatch_val_x, dispatch_val_y);
};
cljs.core.methods$ = function methods$(multifn) {
  return cljs.core._methods.call(null, multifn);
};
cljs.core.get_method = function get_method(multifn, dispatch_val) {
  return cljs.core._get_method.call(null, multifn, dispatch_val);
};
cljs.core.prefers = function prefers(multifn) {
  return cljs.core._prefers.call(null, multifn);
};
cljs.core.UUID = function(uuid) {
  this.uuid = uuid;
  this.cljs$lang$protocol_mask$partition1$ = 0;
  this.cljs$lang$protocol_mask$partition0$ = 2153775104;
};
cljs.core.UUID.cljs$lang$type = true;
cljs.core.UUID.cljs$lang$ctorStr = "cljs.core/UUID";
cljs.core.UUID.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.core/UUID");
};
cljs.core.UUID.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var self__ = this;
  var this$__$1 = this;
  return goog.string.hashCode(cljs.core.pr_str.call(null, this$__$1));
};
cljs.core.UUID.prototype.cljs$core$IPrintWithWriter$_pr_writer$arity$3 = function(_, writer, ___$1) {
  var self__ = this;
  var ___$2 = this;
  return cljs.core._write.call(null, writer, [cljs.core.str('#uuid "'), cljs.core.str(self__.uuid), cljs.core.str('"')].join(""));
};
cljs.core.UUID.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(_, other) {
  var self__ = this;
  var ___$1 = this;
  return other instanceof cljs.core.UUID && self__.uuid === other.uuid;
};
cljs.core.UUID.prototype.cljs$core$ICloneable$ = true;
cljs.core.UUID.prototype.cljs$core$ICloneable$_clone$arity$1 = function(_) {
  var self__ = this;
  var ___$1 = this;
  return new cljs.core.UUID(self__.uuid);
};
cljs.core.__GT_UUID = function __GT_UUID(uuid) {
  return new cljs.core.UUID(uuid);
};
cljs.core.ExceptionInfo = function(message, data, cause) {
  this.message = message;
  this.data = data;
  this.cause = cause;
};
cljs.core.ExceptionInfo.cljs$lang$type = true;
cljs.core.ExceptionInfo.cljs$lang$ctorStr = "cljs.core/ExceptionInfo";
cljs.core.ExceptionInfo.cljs$lang$ctorPrWriter = function(this__3965__auto__, writer__3966__auto__, opts__3967__auto__) {
  return cljs.core._write.call(null, writer__3966__auto__, "cljs.core/ExceptionInfo");
};
cljs.core.__GT_ExceptionInfo = function __GT_ExceptionInfo(message, data, cause) {
  return new cljs.core.ExceptionInfo(message, data, cause);
};
cljs.core.ExceptionInfo.prototype = new Error;
cljs.core.ExceptionInfo.prototype.constructor = cljs.core.ExceptionInfo;
cljs.core.ex_info = function() {
  var ex_info = null;
  var ex_info__2 = function(msg, map) {
    return new cljs.core.ExceptionInfo(msg, map, null);
  };
  var ex_info__3 = function(msg, map, cause) {
    return new cljs.core.ExceptionInfo(msg, map, cause);
  };
  ex_info = function(msg, map, cause) {
    switch(arguments.length) {
      case 2:
        return ex_info__2.call(this, msg, map);
      case 3:
        return ex_info__3.call(this, msg, map, cause);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  ex_info.cljs$core$IFn$_invoke$arity$2 = ex_info__2;
  ex_info.cljs$core$IFn$_invoke$arity$3 = ex_info__3;
  return ex_info;
}();
cljs.core.ex_data = function ex_data(ex) {
  if (ex instanceof cljs.core.ExceptionInfo) {
    return ex.data;
  } else {
    return null;
  }
};
cljs.core.ex_message = function ex_message(ex) {
  if (ex instanceof Error) {
    return ex.message;
  } else {
    return null;
  }
};
cljs.core.ex_cause = function ex_cause(ex) {
  if (ex instanceof cljs.core.ExceptionInfo) {
    return ex.cause;
  } else {
    return null;
  }
};
cljs.core.comparator = function comparator(pred) {
  return function(x, y) {
    if (cljs.core.truth_(pred.call(null, x, y))) {
      return-1;
    } else {
      if (cljs.core.truth_(pred.call(null, y, x))) {
        return 1;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return 0;
        } else {
          return null;
        }
      }
    }
  };
};
cljs.core.special_symbol_QMARK_ = function special_symbol_QMARK_(x) {
  return cljs.core.contains_QMARK_.call(null, new cljs.core.PersistentHashSet(null, new cljs.core.PersistentArrayMap(null, 19, [new cljs.core.Symbol(null, "deftype*", "deftype*", -978581244, null), null, new cljs.core.Symbol(null, "new", "new", -1640422567, null), null, new cljs.core.Symbol(null, "quote", "quote", -1532577739, null), null, new cljs.core.Symbol(null, "\x26", "\x26", -1640531489, null), null, new cljs.core.Symbol(null, "set!", "set!", -1637004872, null), null, new cljs.core.Symbol(null, 
  "recur", "recur", -1532142362, null), null, new cljs.core.Symbol(null, ".", ".", -1640531481, null), null, new cljs.core.Symbol(null, "ns", "ns", -1640528002, null), null, new cljs.core.Symbol(null, "do", "do", -1640528316, null), null, new cljs.core.Symbol(null, "fn*", "fn*", -1640430053, null), null, new cljs.core.Symbol(null, "throw", "throw", -1530191713, null), null, new cljs.core.Symbol(null, "letfn*", "letfn*", 1548249632, null), null, new cljs.core.Symbol(null, "js*", "js*", -1640426054, 
  null), null, new cljs.core.Symbol(null, "defrecord*", "defrecord*", 774272013, null), null, new cljs.core.Symbol(null, "let*", "let*", -1637213400, null), null, new cljs.core.Symbol(null, "loop*", "loop*", -1537374273, null), null, new cljs.core.Symbol(null, "try", "try", -1640416396, null), null, new cljs.core.Symbol(null, "if", "if", -1640528170, null), null, new cljs.core.Symbol(null, "def", "def", -1640432194, null), null], null), null), x);
};
goog.provide("purnam.common");
goog.require("cljs.core");
purnam.common.flags = function() {
  var obj45024 = {};
  return obj45024;
}();
goog.provide("clojure.string");
goog.require("cljs.core");
goog.require("goog.string.StringBuffer");
goog.require("goog.string.StringBuffer");
goog.require("goog.string");
goog.require("goog.string");
clojure.string.seq_reverse = function seq_reverse(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll);
};
clojure.string.reverse = function reverse(s) {
  return s.split("").reverse().join("");
};
clojure.string.replace = function replace(s, match, replacement) {
  if (typeof match === "string") {
    return s.replace(new RegExp(goog.string.regExpEscape(match), "g"), replacement);
  } else {
    if (cljs.core.truth_(match.hasOwnProperty("source"))) {
      return s.replace(new RegExp(match.source, "g"), replacement);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        throw[cljs.core.str("Invalid match arg: "), cljs.core.str(match)].join("");
      } else {
        return null;
      }
    }
  }
};
clojure.string.replace_first = function replace_first(s, match, replacement) {
  return s.replace(match, replacement);
};
clojure.string.join = function() {
  var join = null;
  var join__1 = function(coll) {
    return cljs.core.apply.call(null, cljs.core.str, coll);
  };
  var join__2 = function(separator, coll) {
    return cljs.core.apply.call(null, cljs.core.str, cljs.core.interpose.call(null, separator, coll));
  };
  join = function(separator, coll) {
    switch(arguments.length) {
      case 1:
        return join__1.call(this, separator);
      case 2:
        return join__2.call(this, separator, coll);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  join.cljs$core$IFn$_invoke$arity$1 = join__1;
  join.cljs$core$IFn$_invoke$arity$2 = join__2;
  return join;
}();
clojure.string.upper_case = function upper_case(s) {
  return s.toUpperCase();
};
clojure.string.lower_case = function lower_case(s) {
  return s.toLowerCase();
};
clojure.string.capitalize = function capitalize(s) {
  if (cljs.core.count.call(null, s) < 2) {
    return clojure.string.upper_case.call(null, s);
  } else {
    return[cljs.core.str(clojure.string.upper_case.call(null, cljs.core.subs.call(null, s, 0, 1))), cljs.core.str(clojure.string.lower_case.call(null, cljs.core.subs.call(null, s, 1)))].join("");
  }
};
clojure.string.pop_last_while_empty = function pop_last_while_empty(v) {
  var v__$1 = v;
  while (true) {
    if (cljs.core._EQ_.call(null, "", cljs.core.peek.call(null, v__$1))) {
      var G__45009 = cljs.core.pop.call(null, v__$1);
      v__$1 = G__45009;
      continue;
    } else {
      return v__$1;
    }
    break;
  }
};
clojure.string.discard_trailing_if_needed = function discard_trailing_if_needed(limit, v) {
  if (cljs.core._EQ_.call(null, 0, limit)) {
    return clojure.string.pop_last_while_empty.call(null, v);
  } else {
    return v;
  }
};
clojure.string.split_with_empty_regex = function split_with_empty_regex(s, limit) {
  if (limit <= 0 || limit >= 2 + cljs.core.count.call(null, s)) {
    return cljs.core.conj.call(null, cljs.core.vec.call(null, cljs.core.cons.call(null, "", cljs.core.map.call(null, cljs.core.str, cljs.core.seq.call(null, s)))), "");
  } else {
    var pred__45013 = cljs.core._EQ_;
    var expr__45014 = limit;
    if (cljs.core.truth_(pred__45013.call(null, 1, expr__45014))) {
      return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [s], null);
    } else {
      if (cljs.core.truth_(pred__45013.call(null, 2, expr__45014))) {
        return new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, ["", s], null);
      } else {
        var c = limit - 2;
        return cljs.core.conj.call(null, cljs.core.vec.call(null, cljs.core.cons.call(null, "", cljs.core.subvec.call(null, cljs.core.vec.call(null, cljs.core.map.call(null, cljs.core.str, cljs.core.seq.call(null, s))), 0, c))), cljs.core.subs.call(null, s, c));
      }
    }
  }
};
clojure.string.split = function() {
  var split = null;
  var split__2 = function(s, re) {
    return split.call(null, s, re, 0);
  };
  var split__3 = function(s, re, limit) {
    return clojure.string.discard_trailing_if_needed.call(null, limit, cljs.core._EQ_.call(null, [cljs.core.str(re)].join(""), "/(?:)/") ? clojure.string.split_with_empty_regex.call(null, s, limit) : limit < 1 ? cljs.core.vec.call(null, [cljs.core.str(s)].join("").split(re)) : function() {
      var s__$1 = s;
      var limit__$1 = limit;
      var parts = cljs.core.PersistentVector.EMPTY;
      while (true) {
        if (cljs.core._EQ_.call(null, limit__$1, 1)) {
          return cljs.core.conj.call(null, parts, s__$1);
        } else {
          var temp__4090__auto__ = cljs.core.re_find.call(null, re, s__$1);
          if (cljs.core.truth_(temp__4090__auto__)) {
            var m = temp__4090__auto__;
            var index = s__$1.indexOf(m);
            var G__45016 = s__$1.substring(index + cljs.core.count.call(null, m));
            var G__45017 = limit__$1 - 1;
            var G__45018 = cljs.core.conj.call(null, parts, s__$1.substring(0, index));
            s__$1 = G__45016;
            limit__$1 = G__45017;
            parts = G__45018;
            continue;
          } else {
            return cljs.core.conj.call(null, parts, s__$1);
          }
        }
        break;
      }
    }());
  };
  split = function(s, re, limit) {
    switch(arguments.length) {
      case 2:
        return split__2.call(this, s, re);
      case 3:
        return split__3.call(this, s, re, limit);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  split.cljs$core$IFn$_invoke$arity$2 = split__2;
  split.cljs$core$IFn$_invoke$arity$3 = split__3;
  return split;
}();
clojure.string.split_lines = function split_lines(s) {
  return clojure.string.split.call(null, s, /\n|\r\n/);
};
clojure.string.trim = function trim(s) {
  return goog.string.trim(s);
};
clojure.string.triml = function triml(s) {
  return goog.string.trimLeft(s);
};
clojure.string.trimr = function trimr(s) {
  return goog.string.trimRight(s);
};
clojure.string.trim_newline = function trim_newline(s) {
  var index = s.length;
  while (true) {
    if (index === 0) {
      return "";
    } else {
      var ch = cljs.core.get.call(null, s, index - 1);
      if (cljs.core._EQ_.call(null, ch, "\n") || cljs.core._EQ_.call(null, ch, "\r")) {
        var G__45019 = index - 1;
        index = G__45019;
        continue;
      } else {
        return s.substring(0, index);
      }
    }
    break;
  }
};
clojure.string.blank_QMARK_ = function blank_QMARK_(s) {
  return goog.string.isEmptySafe(s);
};
clojure.string.escape = function escape__$1(s, cmap) {
  var buffer = new goog.string.StringBuffer;
  var length = s.length;
  var index = 0;
  while (true) {
    if (cljs.core._EQ_.call(null, length, index)) {
      return buffer.toString();
    } else {
      var ch = s.charAt(index);
      var temp__4090__auto___45020 = cljs.core.get.call(null, cmap, ch);
      if (cljs.core.truth_(temp__4090__auto___45020)) {
        var replacement_45021 = temp__4090__auto___45020;
        buffer.append([cljs.core.str(replacement_45021)].join(""));
      } else {
        buffer.append(ch);
      }
      var G__45022 = index + 1;
      index = G__45022;
      continue;
    }
    break;
  }
};
goog.provide("purnam.cljs");
goog.require("cljs.core");
goog.require("clojure.string");
goog.require("clojure.string");
goog.require("purnam.common");
goog.require("purnam.common");
goog.require("goog.array");
goog.require("goog.array");
goog.require("goog.object");
goog.require("goog.object");
purnam.cljs.nested_val = function nested_val(p__44847, val) {
  var vec__44851 = p__44847;
  var k = cljs.core.nth.call(null, vec__44851, 0, null);
  var ks = cljs.core.nthnext.call(null, vec__44851, 1);
  if (k == null) {
    return val;
  } else {
    var o = function() {
      var obj44853 = {};
      return obj44853;
    }();
    o[k] = nested_val.call(null, ks, val);
    return o;
  }
};
purnam.cljs.nested_delete = function nested_delete(p__44854, val) {
  var vec__44856 = p__44854;
  var k = cljs.core.nth.call(null, vec__44856, 0, null);
  var ks = cljs.core.nthnext.call(null, vec__44856, 1);
  if (ks == null) {
    delete val[k];
  } else {
    nested_delete.call(null, ks, val);
  }
  return val;
};
purnam.cljs.aset_in = function() {
  var aset_in = null;
  var aset_in__2 = function(var$, arr) {
    return aset_in.call(null, var$, arr, null);
  };
  var aset_in__3 = function(var$, arr, val) {
    var vec__44858 = arr;
    var k = cljs.core.nth.call(null, vec__44858, 0, null);
    var ks = cljs.core.nthnext.call(null, vec__44858, 1);
    if (k == null) {
    } else {
      if (cljs.core.empty_QMARK_.call(null, ks)) {
        if (cljs.core.truth_(val)) {
          var$[k] = val;
        } else {
          delete var$[k];
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          var temp__4090__auto___44859 = var$[k];
          if (cljs.core.truth_(temp__4090__auto___44859)) {
            var svar_44860 = temp__4090__auto___44859;
            aset_in.call(null, svar_44860, ks, val);
          } else {
            if (cljs.core.truth_(val)) {
              var$[k] = purnam.cljs.nested_val.call(null, ks, val);
            } else {
            }
          }
        } else {
        }
      }
    }
    return var$;
  };
  aset_in = function(var$, arr, val) {
    switch(arguments.length) {
      case 2:
        return aset_in__2.call(this, var$, arr);
      case 3:
        return aset_in__3.call(this, var$, arr, val);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  aset_in.cljs$core$IFn$_invoke$arity$2 = aset_in__2;
  aset_in.cljs$core$IFn$_invoke$arity$3 = aset_in__3;
  return aset_in;
}();
purnam.cljs.aget_in = function() {
  var aget_in = null;
  var aget_in__1 = function(var$) {
    return var$;
  };
  var aget_in__2 = function(var$, arr) {
    if (var$ == null) {
      return null;
    } else {
      if (cljs.core.empty_QMARK_.call(null, arr)) {
        return var$;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return aget_in.call(null, var$[cljs.core.first.call(null, arr)], cljs.core.next.call(null, arr));
        } else {
          return null;
        }
      }
    }
  };
  aget_in = function(var$, arr) {
    switch(arguments.length) {
      case 1:
        return aget_in__1.call(this, var$);
      case 2:
        return aget_in__2.call(this, var$, arr);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  aget_in.cljs$core$IFn$_invoke$arity$1 = aget_in__1;
  aget_in.cljs$core$IFn$_invoke$arity$2 = aget_in__2;
  return aget_in;
}();
purnam.cljs.js_strkey = function js_strkey(x) {
  if (typeof x === "string") {
    return x;
  } else {
    if (x instanceof cljs.core.Keyword) {
      return cljs.core.name.call(null, x);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return[cljs.core.str(x)].join("");
      } else {
        return null;
      }
    }
  }
};
purnam.cljs.js_obj_name = function js_obj_name(this$) {
  var temp__4090__auto__ = cljs.core.re_find.call(null, /^function (\w+)/, [cljs.core.str(this$)].join(""));
  if (cljs.core.truth_(temp__4090__auto__)) {
    var vec__44862 = temp__4090__auto__;
    var _ = cljs.core.nth.call(null, vec__44862, 0, null);
    var n = cljs.core.nth.call(null, vec__44862, 1, null);
    return n;
  } else {
    return "Object";
  }
};
purnam.cljs.js_lookup = function() {
  var js_lookup = null;
  var js_lookup__2 = function(o, k) {
    return o[purnam.cljs.js_strkey.call(null, k)];
  };
  var js_lookup__3 = function(o, k, not_found) {
    var s = purnam.cljs.js_strkey.call(null, k);
    var temp__4090__auto__ = o[s];
    if (cljs.core.truth_(temp__4090__auto__)) {
      var res = temp__4090__auto__;
      return res;
    } else {
      return not_found;
    }
  };
  js_lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return js_lookup__2.call(this, o, k);
      case 3:
        return js_lookup__3.call(this, o, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_lookup.cljs$core$IFn$_invoke$arity$2 = js_lookup__2;
  js_lookup.cljs$core$IFn$_invoke$arity$3 = js_lookup__3;
  return js_lookup;
}();
purnam.cljs.js_assoc = function() {
  var js_assoc = null;
  var js_assoc__3 = function(o, k, v) {
    o[purnam.cljs.js_strkey.call(null, k)] = v;
    return o;
  };
  var js_assoc__4 = function() {
    var G__44863__delegate = function(o, k, v, more) {
      while (true) {
        js_assoc.call(null, o, k, v);
        if (cljs.core.truth_(more)) {
          var G__44864 = o;
          var G__44865 = cljs.core.first.call(null, more);
          var G__44866 = cljs.core.second.call(null, more);
          var G__44867 = cljs.core.nnext.call(null, more);
          o = G__44864;
          k = G__44865;
          v = G__44866;
          more = G__44867;
          continue;
        } else {
          return o;
        }
        break;
      }
    };
    var G__44863 = function(o, k, v, var_args) {
      var more = null;
      if (arguments.length > 3) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0);
      }
      return G__44863__delegate.call(this, o, k, v, more);
    };
    G__44863.cljs$lang$maxFixedArity = 3;
    G__44863.cljs$lang$applyTo = function(arglist__44868) {
      var o = cljs.core.first(arglist__44868);
      arglist__44868 = cljs.core.next(arglist__44868);
      var k = cljs.core.first(arglist__44868);
      arglist__44868 = cljs.core.next(arglist__44868);
      var v = cljs.core.first(arglist__44868);
      var more = cljs.core.rest(arglist__44868);
      return G__44863__delegate(o, k, v, more);
    };
    G__44863.cljs$core$IFn$_invoke$arity$variadic = G__44863__delegate;
    return G__44863;
  }();
  js_assoc = function(o, k, v, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 3:
        return js_assoc__3.call(this, o, k, v);
      default:
        return js_assoc__4.cljs$core$IFn$_invoke$arity$variadic(o, k, v, cljs.core.array_seq(arguments, 3));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_assoc.cljs$lang$maxFixedArity = 3;
  js_assoc.cljs$lang$applyTo = js_assoc__4.cljs$lang$applyTo;
  js_assoc.cljs$core$IFn$_invoke$arity$3 = js_assoc__3;
  js_assoc.cljs$core$IFn$_invoke$arity$variadic = js_assoc__4.cljs$core$IFn$_invoke$arity$variadic;
  return js_assoc;
}();
purnam.cljs.js_dissoc = function() {
  var js_dissoc__delegate = function(o, k, more) {
    while (true) {
      delete o[purnam.cljs.js_strkey.call(null, k)];
      if (cljs.core.truth_(more)) {
        var G__44869 = o;
        var G__44870 = cljs.core.first.call(null, more);
        var G__44871 = cljs.core.next.call(null, more);
        o = G__44869;
        k = G__44870;
        more = G__44871;
        continue;
      } else {
        return o;
      }
      break;
    }
  };
  var js_dissoc = function(o, k, var_args) {
    var more = null;
    if (arguments.length > 2) {
      more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return js_dissoc__delegate.call(this, o, k, more);
  };
  js_dissoc.cljs$lang$maxFixedArity = 2;
  js_dissoc.cljs$lang$applyTo = function(arglist__44872) {
    var o = cljs.core.first(arglist__44872);
    arglist__44872 = cljs.core.next(arglist__44872);
    var k = cljs.core.first(arglist__44872);
    var more = cljs.core.rest(arglist__44872);
    return js_dissoc__delegate(o, k, more);
  };
  js_dissoc.cljs$core$IFn$_invoke$arity$variadic = js_dissoc__delegate;
  return js_dissoc;
}();
purnam.cljs.js_empty = function js_empty(o) {
  var G__44878_44883 = goog.typeOf(o);
  if (cljs.core._EQ_.call(null, "array", G__44878_44883)) {
    o["length"] = 0;
  } else {
    if (cljs.core._EQ_.call(null, "object", G__44878_44883)) {
      var seq__44879_44884 = cljs.core.seq.call(null, cljs.core.js_keys.call(null, o));
      var chunk__44880_44885 = null;
      var count__44881_44886 = 0;
      var i__44882_44887 = 0;
      while (true) {
        if (i__44882_44887 < count__44881_44886) {
          var k_44888 = cljs.core._nth.call(null, chunk__44880_44885, i__44882_44887);
          delete o[k_44888];
          var G__44889 = seq__44879_44884;
          var G__44890 = chunk__44880_44885;
          var G__44891 = count__44881_44886;
          var G__44892 = i__44882_44887 + 1;
          seq__44879_44884 = G__44889;
          chunk__44880_44885 = G__44890;
          count__44881_44886 = G__44891;
          i__44882_44887 = G__44892;
          continue;
        } else {
          var temp__4092__auto___44893 = cljs.core.seq.call(null, seq__44879_44884);
          if (temp__4092__auto___44893) {
            var seq__44879_44894__$1 = temp__4092__auto___44893;
            if (cljs.core.chunked_seq_QMARK_.call(null, seq__44879_44894__$1)) {
              var c__4142__auto___44895 = cljs.core.chunk_first.call(null, seq__44879_44894__$1);
              var G__44896 = cljs.core.chunk_rest.call(null, seq__44879_44894__$1);
              var G__44897 = c__4142__auto___44895;
              var G__44898 = cljs.core.count.call(null, c__4142__auto___44895);
              var G__44899 = 0;
              seq__44879_44884 = G__44896;
              chunk__44880_44885 = G__44897;
              count__44881_44886 = G__44898;
              i__44882_44887 = G__44899;
              continue;
            } else {
              var k_44900 = cljs.core.first.call(null, seq__44879_44894__$1);
              delete o[k_44900];
              var G__44901 = cljs.core.next.call(null, seq__44879_44894__$1);
              var G__44902 = null;
              var G__44903 = 0;
              var G__44904 = 0;
              seq__44879_44884 = G__44901;
              chunk__44880_44885 = G__44902;
              count__44881_44886 = G__44903;
              i__44882_44887 = G__44904;
              continue;
            }
          } else {
          }
        }
        break;
      }
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        throw new Error([cljs.core.str("No matching clause: "), cljs.core.str(goog.typeOf(o))].join(""));
      } else {
      }
    }
  }
  return o;
};
purnam.cljs.js_merge = function() {
  var js_merge = null;
  var js_merge__2 = function(o1, o2) {
    var seq__44909_44913 = cljs.core.seq.call(null, cljs.core.js_keys.call(null, o2));
    var chunk__44910_44914 = null;
    var count__44911_44915 = 0;
    var i__44912_44916 = 0;
    while (true) {
      if (i__44912_44916 < count__44911_44915) {
        var k_44917 = cljs.core._nth.call(null, chunk__44910_44914, i__44912_44916);
        o1[k_44917] = o2[k_44917];
        var G__44918 = seq__44909_44913;
        var G__44919 = chunk__44910_44914;
        var G__44920 = count__44911_44915;
        var G__44921 = i__44912_44916 + 1;
        seq__44909_44913 = G__44918;
        chunk__44910_44914 = G__44919;
        count__44911_44915 = G__44920;
        i__44912_44916 = G__44921;
        continue;
      } else {
        var temp__4092__auto___44922 = cljs.core.seq.call(null, seq__44909_44913);
        if (temp__4092__auto___44922) {
          var seq__44909_44923__$1 = temp__4092__auto___44922;
          if (cljs.core.chunked_seq_QMARK_.call(null, seq__44909_44923__$1)) {
            var c__4142__auto___44924 = cljs.core.chunk_first.call(null, seq__44909_44923__$1);
            var G__44925 = cljs.core.chunk_rest.call(null, seq__44909_44923__$1);
            var G__44926 = c__4142__auto___44924;
            var G__44927 = cljs.core.count.call(null, c__4142__auto___44924);
            var G__44928 = 0;
            seq__44909_44913 = G__44925;
            chunk__44910_44914 = G__44926;
            count__44911_44915 = G__44927;
            i__44912_44916 = G__44928;
            continue;
          } else {
            var k_44929 = cljs.core.first.call(null, seq__44909_44923__$1);
            o1[k_44929] = o2[k_44929];
            var G__44930 = cljs.core.next.call(null, seq__44909_44923__$1);
            var G__44931 = null;
            var G__44932 = 0;
            var G__44933 = 0;
            seq__44909_44913 = G__44930;
            chunk__44910_44914 = G__44931;
            count__44911_44915 = G__44932;
            i__44912_44916 = G__44933;
            continue;
          }
        } else {
        }
      }
      break;
    }
    return o1;
  };
  var js_merge__3 = function() {
    var G__44934__delegate = function(o1, o2, more) {
      return cljs.core.apply.call(null, js_merge, js_merge.call(null, o1, o2), more);
    };
    var G__44934 = function(o1, o2, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44934__delegate.call(this, o1, o2, more);
    };
    G__44934.cljs$lang$maxFixedArity = 2;
    G__44934.cljs$lang$applyTo = function(arglist__44935) {
      var o1 = cljs.core.first(arglist__44935);
      arglist__44935 = cljs.core.next(arglist__44935);
      var o2 = cljs.core.first(arglist__44935);
      var more = cljs.core.rest(arglist__44935);
      return G__44934__delegate(o1, o2, more);
    };
    G__44934.cljs$core$IFn$_invoke$arity$variadic = G__44934__delegate;
    return G__44934;
  }();
  js_merge = function(o1, o2, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return js_merge__2.call(this, o1, o2);
      default:
        return js_merge__3.cljs$core$IFn$_invoke$arity$variadic(o1, o2, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_merge.cljs$lang$maxFixedArity = 2;
  js_merge.cljs$lang$applyTo = js_merge__3.cljs$lang$applyTo;
  js_merge.cljs$core$IFn$_invoke$arity$2 = js_merge__2;
  js_merge.cljs$core$IFn$_invoke$arity$variadic = js_merge__3.cljs$core$IFn$_invoke$arity$variadic;
  return js_merge;
}();
purnam.cljs.js_merge_nil = function() {
  var js_merge_nil = null;
  var js_merge_nil__2 = function(o1, o2) {
    var seq__44940_44944 = cljs.core.seq.call(null, cljs.core.js_keys.call(null, o2));
    var chunk__44941_44945 = null;
    var count__44942_44946 = 0;
    var i__44943_44947 = 0;
    while (true) {
      if (i__44943_44947 < count__44942_44946) {
        var k_44948 = cljs.core._nth.call(null, chunk__44941_44945, i__44943_44947);
        if (cljs.core.not.call(null, o1[k_44948])) {
          o1[k_44948] = o2[k_44948];
        } else {
        }
        var G__44949 = seq__44940_44944;
        var G__44950 = chunk__44941_44945;
        var G__44951 = count__44942_44946;
        var G__44952 = i__44943_44947 + 1;
        seq__44940_44944 = G__44949;
        chunk__44941_44945 = G__44950;
        count__44942_44946 = G__44951;
        i__44943_44947 = G__44952;
        continue;
      } else {
        var temp__4092__auto___44953 = cljs.core.seq.call(null, seq__44940_44944);
        if (temp__4092__auto___44953) {
          var seq__44940_44954__$1 = temp__4092__auto___44953;
          if (cljs.core.chunked_seq_QMARK_.call(null, seq__44940_44954__$1)) {
            var c__4142__auto___44955 = cljs.core.chunk_first.call(null, seq__44940_44954__$1);
            var G__44956 = cljs.core.chunk_rest.call(null, seq__44940_44954__$1);
            var G__44957 = c__4142__auto___44955;
            var G__44958 = cljs.core.count.call(null, c__4142__auto___44955);
            var G__44959 = 0;
            seq__44940_44944 = G__44956;
            chunk__44941_44945 = G__44957;
            count__44942_44946 = G__44958;
            i__44943_44947 = G__44959;
            continue;
          } else {
            var k_44960 = cljs.core.first.call(null, seq__44940_44954__$1);
            if (cljs.core.not.call(null, o1[k_44960])) {
              o1[k_44960] = o2[k_44960];
            } else {
            }
            var G__44961 = cljs.core.next.call(null, seq__44940_44954__$1);
            var G__44962 = null;
            var G__44963 = 0;
            var G__44964 = 0;
            seq__44940_44944 = G__44961;
            chunk__44941_44945 = G__44962;
            count__44942_44946 = G__44963;
            i__44943_44947 = G__44964;
            continue;
          }
        } else {
        }
      }
      break;
    }
    return o1;
  };
  var js_merge_nil__3 = function() {
    var G__44965__delegate = function(o1, o2, more) {
      while (true) {
        js_merge_nil.call(null, o1, o2);
        if (cljs.core.truth_(more)) {
          var G__44966 = js_merge_nil.call(null, o1, o2);
          var G__44967 = cljs.core.first.call(null, more);
          var G__44968 = cljs.core.next.call(null, more);
          o1 = G__44966;
          o2 = G__44967;
          more = G__44968;
          continue;
        } else {
          return o1;
        }
        break;
      }
    };
    var G__44965 = function(o1, o2, var_args) {
      var more = null;
      if (arguments.length > 2) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
      }
      return G__44965__delegate.call(this, o1, o2, more);
    };
    G__44965.cljs$lang$maxFixedArity = 2;
    G__44965.cljs$lang$applyTo = function(arglist__44969) {
      var o1 = cljs.core.first(arglist__44969);
      arglist__44969 = cljs.core.next(arglist__44969);
      var o2 = cljs.core.first(arglist__44969);
      var more = cljs.core.rest(arglist__44969);
      return G__44965__delegate(o1, o2, more);
    };
    G__44965.cljs$core$IFn$_invoke$arity$variadic = G__44965__delegate;
    return G__44965;
  }();
  js_merge_nil = function(o1, o2, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return js_merge_nil__2.call(this, o1, o2);
      default:
        return js_merge_nil__3.cljs$core$IFn$_invoke$arity$variadic(o1, o2, cljs.core.array_seq(arguments, 2));
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_merge_nil.cljs$lang$maxFixedArity = 2;
  js_merge_nil.cljs$lang$applyTo = js_merge_nil__3.cljs$lang$applyTo;
  js_merge_nil.cljs$core$IFn$_invoke$arity$2 = js_merge_nil__2;
  js_merge_nil.cljs$core$IFn$_invoke$arity$variadic = js_merge_nil__3.cljs$core$IFn$_invoke$arity$variadic;
  return js_merge_nil;
}();
purnam.cljs.js_replace = function js_replace(o1, o2) {
  purnam.cljs.js_empty.call(null, o1);
  return purnam.cljs.js_merge.call(null, o1, o2);
};
purnam.cljs.js_equals = function js_equals(v1, v2) {
  if (cljs.core._EQ_.call(null, v1, v2)) {
    return true;
  } else {
    var t1 = goog.typeOf(v1);
    var t2 = goog.typeOf(v2);
    if (cljs.core._EQ_.call(null, "array", t1, t2)) {
      return goog.array.equals(v1, v2, js_equals);
    } else {
      if (cljs.core._EQ_.call(null, "object", t1, t2)) {
        var ks1 = cljs.core.js_keys.call(null, v1).sort();
        var ks2 = cljs.core.js_keys.call(null, v2).sort();
        if (cljs.core.truth_(goog.array.equals(ks1, ks2))) {
          return goog.array.every(ks1, function(k) {
            return js_equals.call(null, v1[k], v2[k]);
          });
        } else {
          return false;
        }
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return false;
        } else {
          return null;
        }
      }
    }
  }
};
purnam.cljs.js_copy = function js_copy(o) {
  return goog.object.clone(o);
};
purnam.cljs.js_initial_value = function js_initial_value(v) {
  var t = goog.typeOf(v);
  if (cljs.core._EQ_.call(null, t, "object")) {
    var obj44973 = {};
    return obj44973;
  } else {
    if (cljs.core._EQ_.call(null, t, "array")) {
      return[];
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return v;
      } else {
        return null;
      }
    }
  }
};
purnam.cljs.js_deep_extend = function() {
  var js_deep_extend = null;
  var js_deep_extend__2 = function(to, from) {
    var visited = [from];
    var visitedlu = [to];
    js_deep_extend.call(null, to, from, visited, visitedlu);
    return to;
  };
  var js_deep_extend__4 = function(to, from, visited, visitedlu) {
    var seq__44978_44982 = cljs.core.seq.call(null, cljs.core.js_keys.call(null, from));
    var chunk__44979_44983 = null;
    var count__44980_44984 = 0;
    var i__44981_44985 = 0;
    while (true) {
      if (i__44981_44985 < count__44980_44984) {
        var k_44986 = cljs.core._nth.call(null, chunk__44979_44983, i__44981_44985);
        var v_44987 = from[k_44986];
        var vn_44988 = purnam.cljs.js_initial_value.call(null, v_44987);
        if (cljs.core.not_EQ_.call(null, v_44987, vn_44988)) {
          var i_44989 = visited.indexOf(v_44987);
          if (cljs.core._EQ_.call(null, -1, i_44989)) {
            visited.push(v_44987);
            visitedlu.push(vn_44988);
            js_deep_extend.call(null, vn_44988, v_44987, visited, visitedlu);
            to[k_44986] = vn_44988;
          } else {
            to[k_44986] = visitedlu[i_44989];
          }
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            to[k_44986] = v_44987;
          } else {
          }
        }
        var G__44990 = seq__44978_44982;
        var G__44991 = chunk__44979_44983;
        var G__44992 = count__44980_44984;
        var G__44993 = i__44981_44985 + 1;
        seq__44978_44982 = G__44990;
        chunk__44979_44983 = G__44991;
        count__44980_44984 = G__44992;
        i__44981_44985 = G__44993;
        continue;
      } else {
        var temp__4092__auto___44994 = cljs.core.seq.call(null, seq__44978_44982);
        if (temp__4092__auto___44994) {
          var seq__44978_44995__$1 = temp__4092__auto___44994;
          if (cljs.core.chunked_seq_QMARK_.call(null, seq__44978_44995__$1)) {
            var c__4142__auto___44996 = cljs.core.chunk_first.call(null, seq__44978_44995__$1);
            var G__44997 = cljs.core.chunk_rest.call(null, seq__44978_44995__$1);
            var G__44998 = c__4142__auto___44996;
            var G__44999 = cljs.core.count.call(null, c__4142__auto___44996);
            var G__45000 = 0;
            seq__44978_44982 = G__44997;
            chunk__44979_44983 = G__44998;
            count__44980_44984 = G__44999;
            i__44981_44985 = G__45000;
            continue;
          } else {
            var k_45001 = cljs.core.first.call(null, seq__44978_44995__$1);
            var v_45002 = from[k_45001];
            var vn_45003 = purnam.cljs.js_initial_value.call(null, v_45002);
            if (cljs.core.not_EQ_.call(null, v_45002, vn_45003)) {
              var i_45004 = visited.indexOf(v_45002);
              if (cljs.core._EQ_.call(null, -1, i_45004)) {
                visited.push(v_45002);
                visitedlu.push(vn_45003);
                js_deep_extend.call(null, vn_45003, v_45002, visited, visitedlu);
                to[k_45001] = vn_45003;
              } else {
                to[k_45001] = visitedlu[i_45004];
              }
            } else {
              if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                to[k_45001] = v_45002;
              } else {
              }
            }
            var G__45005 = cljs.core.next.call(null, seq__44978_44995__$1);
            var G__45006 = null;
            var G__45007 = 0;
            var G__45008 = 0;
            seq__44978_44982 = G__45005;
            chunk__44979_44983 = G__45006;
            count__44980_44984 = G__45007;
            i__44981_44985 = G__45008;
            continue;
          }
        } else {
        }
      }
      break;
    }
    return to;
  };
  js_deep_extend = function(to, from, visited, visitedlu) {
    switch(arguments.length) {
      case 2:
        return js_deep_extend__2.call(this, to, from);
      case 4:
        return js_deep_extend__4.call(this, to, from, visited, visitedlu);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  js_deep_extend.cljs$core$IFn$_invoke$arity$2 = js_deep_extend__2;
  js_deep_extend.cljs$core$IFn$_invoke$arity$4 = js_deep_extend__4;
  return js_deep_extend;
}();
purnam.cljs.js_deep_copy = function js_deep_copy(value) {
  var vn = purnam.cljs.js_initial_value.call(null, value);
  if (cljs.core.not_EQ_.call(null, value, vn)) {
    return purnam.cljs.js_deep_extend.call(null, vn, value);
  } else {
    return value;
  }
};
purnam.cljs.js_deep_replace = function js_deep_replace(o1, o2) {
  purnam.cljs.js_empty.call(null, o1);
  return purnam.cljs.js_deep_extend.call(null, o1, o2);
};
purnam.cljs.js_LT__ = function js_LT__(obj) {
  return cljs.core.clj__GT_js.call(null, obj);
};
purnam.cljs.log = function() {
  var log = null;
  var log__1 = function(x) {
    if (cljs.core.coll_QMARK_.call(null, x)) {
      console.log([cljs.core.str(x)].join(""), x);
    } else {
      console.log([cljs.core.str(x)].join(""));
    }
    return x;
  };
  var log__2 = function(x, y) {
    if (cljs.core.coll_QMARK_.call(null, x)) {
      console.log([cljs.core.str(x), cljs.core.str(":")].join(""), [cljs.core.str(y)].join(""), y);
    } else {
      console.log([cljs.core.str(x), cljs.core.str(":")].join(""), [cljs.core.str(y)].join(""));
    }
    return y;
  };
  log = function(x, y) {
    switch(arguments.length) {
      case 1:
        return log__1.call(this, x);
      case 2:
        return log__2.call(this, x, y);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  log.cljs$core$IFn$_invoke$arity$1 = log__1;
  log.cljs$core$IFn$_invoke$arity$2 = log__2;
  return log;
}();
purnam.cljs.augment_fn_string = function augment_fn_string(func) {
  if (typeof func === "string") {
    return function(x) {
      return purnam.cljs.aget_in.call(null, x, clojure.string.split.call(null, func, /\./));
    };
  } else {
    return func;
  }
};
purnam.cljs.check_fn = function() {
  var check_fn = null;
  var check_fn__1 = function(chk) {
    return function(x) {
      if (cljs.core.fn_QMARK_.call(null, chk)) {
        return chk.call(null, x);
      } else {
        return cljs.core._EQ_.call(null, x, chk);
      }
    };
  };
  var check_fn__2 = function(func, chk) {
    return function(x) {
      var res = func.call(null, x);
      if (cljs.core.fn_QMARK_.call(null, chk)) {
        return chk.call(null, res);
      } else {
        return cljs.core._EQ_.call(null, res, chk);
      }
    };
  };
  check_fn = function(func, chk) {
    switch(arguments.length) {
      case 1:
        return check_fn__1.call(this, func);
      case 2:
        return check_fn__2.call(this, func, chk);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  check_fn.cljs$core$IFn$_invoke$arity$1 = check_fn__1;
  check_fn.cljs$core$IFn$_invoke$arity$2 = check_fn__2;
  return check_fn;
}();
goog.provide("cljs.reader");
goog.require("cljs.core");
goog.require("goog.string");
goog.require("goog.string");
cljs.reader.PushbackReader = function() {
  var obj45087 = {};
  return obj45087;
}();
cljs.reader.read_char = function read_char(reader) {
  if (function() {
    var and__3388__auto__ = reader;
    if (and__3388__auto__) {
      return reader.cljs$reader$PushbackReader$read_char$arity$1;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return reader.cljs$reader$PushbackReader$read_char$arity$1(reader);
  } else {
    var x__4021__auto__ = reader == null ? null : reader;
    return function() {
      var or__3400__auto__ = cljs.reader.read_char[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.reader.read_char["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "PushbackReader.read-char", reader);
        }
      }
    }().call(null, reader);
  }
};
cljs.reader.unread = function unread(reader, ch) {
  if (function() {
    var and__3388__auto__ = reader;
    if (and__3388__auto__) {
      return reader.cljs$reader$PushbackReader$unread$arity$2;
    } else {
      return and__3388__auto__;
    }
  }()) {
    return reader.cljs$reader$PushbackReader$unread$arity$2(reader, ch);
  } else {
    var x__4021__auto__ = reader == null ? null : reader;
    return function() {
      var or__3400__auto__ = cljs.reader.unread[goog.typeOf(x__4021__auto__)];
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.reader.unread["_"];
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          throw cljs.core.missing_protocol.call(null, "PushbackReader.unread", reader);
        }
      }
    }().call(null, reader, ch);
  }
};
cljs.reader.StringPushbackReader = function(s, buffer, idx) {
  this.s = s;
  this.buffer = buffer;
  this.idx = idx;
};
cljs.reader.StringPushbackReader.cljs$lang$type = true;
cljs.reader.StringPushbackReader.cljs$lang$ctorStr = "cljs.reader/StringPushbackReader";
cljs.reader.StringPushbackReader.cljs$lang$ctorPrWriter = function(this__3962__auto__, writer__3963__auto__, opt__3964__auto__) {
  return cljs.core._write.call(null, writer__3963__auto__, "cljs.reader/StringPushbackReader");
};
cljs.reader.StringPushbackReader.prototype.cljs$reader$PushbackReader$ = true;
cljs.reader.StringPushbackReader.prototype.cljs$reader$PushbackReader$read_char$arity$1 = function(reader) {
  var self__ = this;
  var reader__$1 = this;
  if (self__.buffer.length === 0) {
    self__.idx = self__.idx + 1;
    return self__.s[self__.idx];
  } else {
    return self__.buffer.pop();
  }
};
cljs.reader.StringPushbackReader.prototype.cljs$reader$PushbackReader$unread$arity$2 = function(reader, ch) {
  var self__ = this;
  var reader__$1 = this;
  return self__.buffer.push(ch);
};
cljs.reader.__GT_StringPushbackReader = function __GT_StringPushbackReader(s, buffer, idx) {
  return new cljs.reader.StringPushbackReader(s, buffer, idx);
};
cljs.reader.push_back_reader = function push_back_reader(s) {
  return new cljs.reader.StringPushbackReader(s, [], -1);
};
cljs.reader.whitespace_QMARK_ = function whitespace_QMARK_(ch) {
  var or__3400__auto__ = goog.string.isBreakingWhitespace(ch);
  if (cljs.core.truth_(or__3400__auto__)) {
    return or__3400__auto__;
  } else {
    return "," === ch;
  }
};
cljs.reader.numeric_QMARK_ = function numeric_QMARK_(ch) {
  return goog.string.isNumeric(ch);
};
cljs.reader.comment_prefix_QMARK_ = function comment_prefix_QMARK_(ch) {
  return ";" === ch;
};
cljs.reader.number_literal_QMARK_ = function number_literal_QMARK_(reader, initch) {
  return cljs.reader.numeric_QMARK_.call(null, initch) || ("+" === initch || "-" === initch) && cljs.reader.numeric_QMARK_.call(null, function() {
    var next_ch = cljs.reader.read_char.call(null, reader);
    cljs.reader.unread.call(null, reader, next_ch);
    return next_ch;
  }());
};
cljs.reader.reader_error = function() {
  var reader_error__delegate = function(rdr, msg) {
    throw new Error(cljs.core.apply.call(null, cljs.core.str, msg));
  };
  var reader_error = function(rdr, var_args) {
    var msg = null;
    if (arguments.length > 1) {
      msg = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return reader_error__delegate.call(this, rdr, msg);
  };
  reader_error.cljs$lang$maxFixedArity = 1;
  reader_error.cljs$lang$applyTo = function(arglist__45088) {
    var rdr = cljs.core.first(arglist__45088);
    var msg = cljs.core.rest(arglist__45088);
    return reader_error__delegate(rdr, msg);
  };
  reader_error.cljs$core$IFn$_invoke$arity$variadic = reader_error__delegate;
  return reader_error;
}();
cljs.reader.macro_terminating_QMARK_ = function macro_terminating_QMARK_(ch) {
  var and__3388__auto__ = !(ch === "#");
  if (and__3388__auto__) {
    var and__3388__auto____$1 = !(ch === "'");
    if (and__3388__auto____$1) {
      var and__3388__auto____$2 = !(ch === ":");
      if (and__3388__auto____$2) {
        return cljs.reader.macros.call(null, ch);
      } else {
        return and__3388__auto____$2;
      }
    } else {
      return and__3388__auto____$1;
    }
  } else {
    return and__3388__auto__;
  }
};
cljs.reader.read_token = function read_token(rdr, initch) {
  var sb = new goog.string.StringBuffer(initch);
  var ch = cljs.reader.read_char.call(null, rdr);
  while (true) {
    if (ch == null || (cljs.reader.whitespace_QMARK_.call(null, ch) || cljs.reader.macro_terminating_QMARK_.call(null, ch))) {
      cljs.reader.unread.call(null, rdr, ch);
      return sb.toString();
    } else {
      var G__45089 = function() {
        sb.append(ch);
        return sb;
      }();
      var G__45090 = cljs.reader.read_char.call(null, rdr);
      sb = G__45089;
      ch = G__45090;
      continue;
    }
    break;
  }
};
cljs.reader.skip_line = function skip_line(reader, _) {
  while (true) {
    var ch = cljs.reader.read_char.call(null, reader);
    if (ch === "\n" || (ch === "\r" || ch == null)) {
      return reader;
    } else {
      continue;
    }
    break;
  }
};
cljs.reader.int_pattern = cljs.core.re_pattern.call(null, "([-+]?)(?:(0)|([1-9][0-9]*)|0[xX]([0-9A-Fa-f]+)|0([0-7]+)|([1-9][0-9]?)[rR]([0-9A-Za-z]+)|0[0-9]+)(N)?");
cljs.reader.ratio_pattern = cljs.core.re_pattern.call(null, "([-+]?[0-9]+)/([0-9]+)");
cljs.reader.float_pattern = cljs.core.re_pattern.call(null, "([-+]?[0-9]+(\\.[0-9]*)?([eE][-+]?[0-9]+)?)(M)?");
cljs.reader.symbol_pattern = cljs.core.re_pattern.call(null, "[:]?([^0-9/].*/)?([^0-9/][^/]*)");
cljs.reader.re_find_STAR_ = function re_find_STAR_(re, s) {
  var matches = re.exec(s);
  if (matches == null) {
    return null;
  } else {
    if (matches.length === 1) {
      return matches[0];
    } else {
      return matches;
    }
  }
};
cljs.reader.match_int = function match_int(s) {
  var groups = cljs.reader.re_find_STAR_.call(null, cljs.reader.int_pattern, s);
  var group3 = groups[2];
  if (!(group3 == null || group3.length < 1)) {
    return 0;
  } else {
    var negate = "-" === groups[1] ? -1 : 1;
    var a = cljs.core.truth_(groups[3]) ? [groups[3], 10] : cljs.core.truth_(groups[4]) ? [groups[4], 16] : cljs.core.truth_(groups[5]) ? [groups[5], 8] : cljs.core.truth_(groups[7]) ? [groups[7], parseInt(groups[7])] : new cljs.core.Keyword(null, "default", "default", 2558708147) ? [null, null] : null;
    var n = a[0];
    var radix = a[1];
    if (n == null) {
      return null;
    } else {
      return negate * parseInt(n, radix);
    }
  }
};
cljs.reader.match_ratio = function match_ratio(s) {
  var groups = cljs.reader.re_find_STAR_.call(null, cljs.reader.ratio_pattern, s);
  var numinator = groups[1];
  var denominator = groups[2];
  return parseInt(numinator) / parseInt(denominator);
};
cljs.reader.match_float = function match_float(s) {
  return parseFloat(s);
};
cljs.reader.re_matches_STAR_ = function re_matches_STAR_(re, s) {
  var matches = re.exec(s);
  if (!(matches == null) && matches[0] === s) {
    if (matches.length === 1) {
      return matches[0];
    } else {
      return matches;
    }
  } else {
    return null;
  }
};
cljs.reader.match_number = function match_number(s) {
  if (cljs.core.truth_(cljs.reader.re_matches_STAR_.call(null, cljs.reader.int_pattern, s))) {
    return cljs.reader.match_int.call(null, s);
  } else {
    if (cljs.core.truth_(cljs.reader.re_matches_STAR_.call(null, cljs.reader.ratio_pattern, s))) {
      return cljs.reader.match_ratio.call(null, s);
    } else {
      if (cljs.core.truth_(cljs.reader.re_matches_STAR_.call(null, cljs.reader.float_pattern, s))) {
        return cljs.reader.match_float.call(null, s);
      } else {
        return null;
      }
    }
  }
};
cljs.reader.escape_char_map = function escape_char_map(c) {
  if (c === "t") {
    return "\t";
  } else {
    if (c === "r") {
      return "\r";
    } else {
      if (c === "n") {
        return "\n";
      } else {
        if (c === "\\") {
          return "\\";
        } else {
          if (c === '"') {
            return'"';
          } else {
            if (c === "b") {
              return "\b";
            } else {
              if (c === "f") {
                return "\f";
              } else {
                if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                  return null;
                } else {
                  return null;
                }
              }
            }
          }
        }
      }
    }
  }
};
cljs.reader.read_2_chars = function read_2_chars(reader) {
  return(new goog.string.StringBuffer(cljs.reader.read_char.call(null, reader), cljs.reader.read_char.call(null, reader))).toString();
};
cljs.reader.read_4_chars = function read_4_chars(reader) {
  return(new goog.string.StringBuffer(cljs.reader.read_char.call(null, reader), cljs.reader.read_char.call(null, reader), cljs.reader.read_char.call(null, reader), cljs.reader.read_char.call(null, reader))).toString();
};
cljs.reader.unicode_2_pattern = cljs.core.re_pattern.call(null, "[0-9A-Fa-f]{2}");
cljs.reader.unicode_4_pattern = cljs.core.re_pattern.call(null, "[0-9A-Fa-f]{4}");
cljs.reader.validate_unicode_escape = function validate_unicode_escape(unicode_pattern, reader, escape_char, unicode_str) {
  if (cljs.core.truth_(cljs.core.re_matches.call(null, unicode_pattern, unicode_str))) {
    return unicode_str;
  } else {
    return cljs.reader.reader_error.call(null, reader, "Unexpected unicode escape \\", escape_char, unicode_str);
  }
};
cljs.reader.make_unicode_char = function make_unicode_char(code_str) {
  var code = parseInt(code_str, 16);
  return String.fromCharCode(code);
};
cljs.reader.escape_char = function escape_char(buffer, reader) {
  var ch = cljs.reader.read_char.call(null, reader);
  var mapresult = cljs.reader.escape_char_map.call(null, ch);
  if (cljs.core.truth_(mapresult)) {
    return mapresult;
  } else {
    if (ch === "x") {
      return cljs.reader.make_unicode_char.call(null, cljs.reader.validate_unicode_escape.call(null, cljs.reader.unicode_2_pattern, reader, ch, cljs.reader.read_2_chars.call(null, reader)));
    } else {
      if (ch === "u") {
        return cljs.reader.make_unicode_char.call(null, cljs.reader.validate_unicode_escape.call(null, cljs.reader.unicode_4_pattern, reader, ch, cljs.reader.read_4_chars.call(null, reader)));
      } else {
        if (cljs.reader.numeric_QMARK_.call(null, ch)) {
          return String.fromCharCode(ch);
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            return cljs.reader.reader_error.call(null, reader, "Unexpected unicode escape \\", ch);
          } else {
            return null;
          }
        }
      }
    }
  }
};
cljs.reader.read_past = function read_past(pred, rdr) {
  var ch = cljs.reader.read_char.call(null, rdr);
  while (true) {
    if (cljs.core.truth_(pred.call(null, ch))) {
      var G__45091 = cljs.reader.read_char.call(null, rdr);
      ch = G__45091;
      continue;
    } else {
      return ch;
    }
    break;
  }
};
cljs.reader.read_delimited_list = function read_delimited_list(delim, rdr, recursive_QMARK_) {
  var a = cljs.core.transient$.call(null, cljs.core.PersistentVector.EMPTY);
  while (true) {
    var ch = cljs.reader.read_past.call(null, cljs.reader.whitespace_QMARK_, rdr);
    if (cljs.core.truth_(ch)) {
    } else {
      cljs.reader.reader_error.call(null, rdr, "EOF while reading");
    }
    if (delim === ch) {
      return cljs.core.persistent_BANG_.call(null, a);
    } else {
      var temp__4090__auto__ = cljs.reader.macros.call(null, ch);
      if (cljs.core.truth_(temp__4090__auto__)) {
        var macrofn = temp__4090__auto__;
        var mret = macrofn.call(null, rdr, ch);
        var G__45092 = mret === rdr ? a : cljs.core.conj_BANG_.call(null, a, mret);
        a = G__45092;
        continue;
      } else {
        cljs.reader.unread.call(null, rdr, ch);
        var o = cljs.reader.read.call(null, rdr, true, null, recursive_QMARK_);
        var G__45093 = o === rdr ? a : cljs.core.conj_BANG_.call(null, a, o);
        a = G__45093;
        continue;
      }
    }
    break;
  }
};
cljs.reader.not_implemented = function not_implemented(rdr, ch) {
  return cljs.reader.reader_error.call(null, rdr, "Reader for ", ch, " not implemented yet");
};
cljs.reader.read_dispatch = function read_dispatch(rdr, _) {
  var ch = cljs.reader.read_char.call(null, rdr);
  var dm = cljs.reader.dispatch_macros.call(null, ch);
  if (cljs.core.truth_(dm)) {
    return dm.call(null, rdr, _);
  } else {
    var temp__4090__auto__ = cljs.reader.maybe_read_tagged_type.call(null, rdr, ch);
    if (cljs.core.truth_(temp__4090__auto__)) {
      var obj = temp__4090__auto__;
      return obj;
    } else {
      return cljs.reader.reader_error.call(null, rdr, "No dispatch macro for ", ch);
    }
  }
};
cljs.reader.read_unmatched_delimiter = function read_unmatched_delimiter(rdr, ch) {
  return cljs.reader.reader_error.call(null, rdr, "Unmached delimiter ", ch);
};
cljs.reader.read_list = function read_list(rdr, _) {
  return cljs.core.apply.call(null, cljs.core.list, cljs.reader.read_delimited_list.call(null, ")", rdr, true));
};
cljs.reader.read_comment = cljs.reader.skip_line;
cljs.reader.read_vector = function read_vector(rdr, _) {
  return cljs.reader.read_delimited_list.call(null, "]", rdr, true);
};
cljs.reader.read_map = function read_map(rdr, _) {
  var l = cljs.reader.read_delimited_list.call(null, "}", rdr, true);
  if (cljs.core.odd_QMARK_.call(null, cljs.core.count.call(null, l))) {
    cljs.reader.reader_error.call(null, rdr, "Map literal must contain an even number of forms");
  } else {
  }
  return cljs.core.apply.call(null, cljs.core.hash_map, l);
};
cljs.reader.read_number = function read_number(reader, initch) {
  var buffer = new goog.string.StringBuffer(initch);
  var ch = cljs.reader.read_char.call(null, reader);
  while (true) {
    if (cljs.core.truth_(function() {
      var or__3400__auto__ = ch == null;
      if (or__3400__auto__) {
        return or__3400__auto__;
      } else {
        var or__3400__auto____$1 = cljs.reader.whitespace_QMARK_.call(null, ch);
        if (or__3400__auto____$1) {
          return or__3400__auto____$1;
        } else {
          return cljs.reader.macros.call(null, ch);
        }
      }
    }())) {
      cljs.reader.unread.call(null, reader, ch);
      var s = buffer.toString();
      var or__3400__auto__ = cljs.reader.match_number.call(null, s);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return cljs.reader.reader_error.call(null, reader, "Invalid number format [", s, "]");
      }
    } else {
      var G__45094 = function() {
        buffer.append(ch);
        return buffer;
      }();
      var G__45095 = cljs.reader.read_char.call(null, reader);
      buffer = G__45094;
      ch = G__45095;
      continue;
    }
    break;
  }
};
cljs.reader.read_string_STAR_ = function read_string_STAR_(reader, _) {
  var buffer = new goog.string.StringBuffer;
  var ch = cljs.reader.read_char.call(null, reader);
  while (true) {
    if (ch == null) {
      return cljs.reader.reader_error.call(null, reader, "EOF while reading");
    } else {
      if ("\\" === ch) {
        var G__45096 = function() {
          buffer.append(cljs.reader.escape_char.call(null, buffer, reader));
          return buffer;
        }();
        var G__45097 = cljs.reader.read_char.call(null, reader);
        buffer = G__45096;
        ch = G__45097;
        continue;
      } else {
        if ('"' === ch) {
          return buffer.toString();
        } else {
          if (new cljs.core.Keyword(null, "default", "default", 2558708147)) {
            var G__45098 = function() {
              buffer.append(ch);
              return buffer;
            }();
            var G__45099 = cljs.reader.read_char.call(null, reader);
            buffer = G__45098;
            ch = G__45099;
            continue;
          } else {
            return null;
          }
        }
      }
    }
    break;
  }
};
cljs.reader.special_symbols = function special_symbols(t, not_found) {
  if (t === "nil") {
    return null;
  } else {
    if (t === "true") {
      return true;
    } else {
      if (t === "false") {
        return false;
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return not_found;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.reader.read_symbol = function read_symbol(reader, initch) {
  var token = cljs.reader.read_token.call(null, reader, initch);
  if (cljs.core.truth_(goog.string.contains(token, "/"))) {
    return cljs.core.symbol.call(null, cljs.core.subs.call(null, token, 0, token.indexOf("/")), cljs.core.subs.call(null, token, token.indexOf("/") + 1, token.length));
  } else {
    return cljs.reader.special_symbols.call(null, token, cljs.core.symbol.call(null, token));
  }
};
cljs.reader.read_keyword = function read_keyword(reader, initch) {
  var token = cljs.reader.read_token.call(null, reader, cljs.reader.read_char.call(null, reader));
  var a = cljs.reader.re_matches_STAR_.call(null, cljs.reader.symbol_pattern, token);
  var token__$1 = a[0];
  var ns = a[1];
  var name = a[2];
  if (!(void 0 === ns) && ns.substring(ns.length - 2, ns.length) === ":/" || (name[name.length - 1] === ":" || !(token__$1.indexOf("::", 1) === -1))) {
    return cljs.reader.reader_error.call(null, reader, "Invalid token: ", token__$1);
  } else {
    if (!(ns == null) && ns.length > 0) {
      return cljs.core.keyword.call(null, ns.substring(0, ns.indexOf("/")), name);
    } else {
      return cljs.core.keyword.call(null, token__$1);
    }
  }
};
cljs.reader.desugar_meta = function desugar_meta(f) {
  if (f instanceof cljs.core.Symbol) {
    return new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null, "tag", "tag", 1014018828), f], null);
  } else {
    if (typeof f === "string") {
      return new cljs.core.PersistentArrayMap(null, 1, [new cljs.core.Keyword(null, "tag", "tag", 1014018828), f], null);
    } else {
      if (f instanceof cljs.core.Keyword) {
        return new cljs.core.PersistentArrayMap.fromArray([f, true], true, false);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return f;
        } else {
          return null;
        }
      }
    }
  }
};
cljs.reader.wrapping_reader = function wrapping_reader(sym) {
  return function(rdr, _) {
    return cljs.core._conj.call(null, cljs.core._conj.call(null, cljs.core.List.EMPTY, cljs.reader.read.call(null, rdr, true, null, true)), sym);
  };
};
cljs.reader.throwing_reader = function throwing_reader(msg) {
  return function(rdr, _) {
    return cljs.reader.reader_error.call(null, rdr, msg);
  };
};
cljs.reader.read_meta = function read_meta(rdr, _) {
  var m = cljs.reader.desugar_meta.call(null, cljs.reader.read.call(null, rdr, true, null, true));
  if (cljs.core.map_QMARK_.call(null, m)) {
  } else {
    cljs.reader.reader_error.call(null, rdr, "Metadata must be Symbol,Keyword,String or Map");
  }
  var o = cljs.reader.read.call(null, rdr, true, null, true);
  if (function() {
    var G__45101 = o;
    if (G__45101) {
      var bit__4044__auto__ = G__45101.cljs$lang$protocol_mask$partition0$ & 262144;
      if (bit__4044__auto__ || G__45101.cljs$core$IWithMeta$) {
        return true;
      } else {
        if (!G__45101.cljs$lang$protocol_mask$partition0$) {
          return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IWithMeta, G__45101);
        } else {
          return false;
        }
      }
    } else {
      return cljs.core.native_satisfies_QMARK_.call(null, cljs.core.IWithMeta, G__45101);
    }
  }()) {
    return cljs.core.with_meta.call(null, o, cljs.core.merge.call(null, cljs.core.meta.call(null, o), m));
  } else {
    return cljs.reader.reader_error.call(null, rdr, "Metadata can only be applied to IWithMetas");
  }
};
cljs.reader.read_set = function read_set(rdr, _) {
  return cljs.core.set.call(null, cljs.reader.read_delimited_list.call(null, "}", rdr, true));
};
cljs.reader.read_regex = function read_regex(rdr, ch) {
  return cljs.core.re_pattern.call(null, cljs.reader.read_string_STAR_.call(null, rdr, ch));
};
cljs.reader.read_discard = function read_discard(rdr, _) {
  cljs.reader.read.call(null, rdr, true, null, true);
  return rdr;
};
cljs.reader.macros = function macros(c) {
  if (c === '"') {
    return cljs.reader.read_string_STAR_;
  } else {
    if (c === ":") {
      return cljs.reader.read_keyword;
    } else {
      if (c === ";") {
        return cljs.reader.read_comment;
      } else {
        if (c === "'") {
          return cljs.reader.wrapping_reader.call(null, new cljs.core.Symbol(null, "quote", "quote", -1532577739, null));
        } else {
          if (c === "@") {
            return cljs.reader.wrapping_reader.call(null, new cljs.core.Symbol(null, "deref", "deref", -1545057749, null));
          } else {
            if (c === "^") {
              return cljs.reader.read_meta;
            } else {
              if (c === "`") {
                return cljs.reader.not_implemented;
              } else {
                if (c === "~") {
                  return cljs.reader.not_implemented;
                } else {
                  if (c === "(") {
                    return cljs.reader.read_list;
                  } else {
                    if (c === ")") {
                      return cljs.reader.read_unmatched_delimiter;
                    } else {
                      if (c === "[") {
                        return cljs.reader.read_vector;
                      } else {
                        if (c === "]") {
                          return cljs.reader.read_unmatched_delimiter;
                        } else {
                          if (c === "{") {
                            return cljs.reader.read_map;
                          } else {
                            if (c === "}") {
                              return cljs.reader.read_unmatched_delimiter;
                            } else {
                              if (c === "\\") {
                                return cljs.reader.read_char;
                              } else {
                                if (c === "#") {
                                  return cljs.reader.read_dispatch;
                                } else {
                                  if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
                                    return null;
                                  } else {
                                    return null;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
cljs.reader.dispatch_macros = function dispatch_macros(s) {
  if (s === "{") {
    return cljs.reader.read_set;
  } else {
    if (s === "\x3c") {
      return cljs.reader.throwing_reader.call(null, "Unreadable form");
    } else {
      if (s === '"') {
        return cljs.reader.read_regex;
      } else {
        if (s === "!") {
          return cljs.reader.read_comment;
        } else {
          if (s === "_") {
            return cljs.reader.read_discard;
          } else {
            if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
              return null;
            } else {
              return null;
            }
          }
        }
      }
    }
  }
};
cljs.reader.read = function read(reader, eof_is_error, sentinel, is_recursive) {
  while (true) {
    var ch = cljs.reader.read_char.call(null, reader);
    if (ch == null) {
      if (cljs.core.truth_(eof_is_error)) {
        return cljs.reader.reader_error.call(null, reader, "EOF while reading");
      } else {
        return sentinel;
      }
    } else {
      if (cljs.reader.whitespace_QMARK_.call(null, ch)) {
        var G__45102 = reader;
        var G__45103 = eof_is_error;
        var G__45104 = sentinel;
        var G__45105 = is_recursive;
        reader = G__45102;
        eof_is_error = G__45103;
        sentinel = G__45104;
        is_recursive = G__45105;
        continue;
      } else {
        if (cljs.reader.comment_prefix_QMARK_.call(null, ch)) {
          var G__45106 = cljs.reader.read_comment.call(null, reader, ch);
          var G__45107 = eof_is_error;
          var G__45108 = sentinel;
          var G__45109 = is_recursive;
          reader = G__45106;
          eof_is_error = G__45107;
          sentinel = G__45108;
          is_recursive = G__45109;
          continue;
        } else {
          if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
            var f = cljs.reader.macros.call(null, ch);
            var res = cljs.core.truth_(f) ? f.call(null, reader, ch) : cljs.reader.number_literal_QMARK_.call(null, reader, ch) ? cljs.reader.read_number.call(null, reader, ch) : new cljs.core.Keyword(null, "else", "else", 1017020587) ? cljs.reader.read_symbol.call(null, reader, ch) : null;
            if (res === reader) {
              var G__45110 = reader;
              var G__45111 = eof_is_error;
              var G__45112 = sentinel;
              var G__45113 = is_recursive;
              reader = G__45110;
              eof_is_error = G__45111;
              sentinel = G__45112;
              is_recursive = G__45113;
              continue;
            } else {
              return res;
            }
          } else {
            return null;
          }
        }
      }
    }
    break;
  }
};
cljs.reader.read_string = function read_string(s) {
  var r = cljs.reader.push_back_reader.call(null, s);
  return cljs.reader.read.call(null, r, true, null, false);
};
cljs.reader.zero_fill_right_and_truncate = function zero_fill_right_and_truncate(s, width) {
  if (cljs.core._EQ_.call(null, width, cljs.core.count.call(null, s))) {
    return s;
  } else {
    if (width < cljs.core.count.call(null, s)) {
      return cljs.core.subs.call(null, s, 0, width);
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        var b = new goog.string.StringBuffer(s);
        while (true) {
          if (b.getLength() < width) {
            var G__45114 = b.append("0");
            b = G__45114;
            continue;
          } else {
            return b.toString();
          }
          break;
        }
      } else {
        return null;
      }
    }
  }
};
cljs.reader.divisible_QMARK_ = function divisible_QMARK_(num, div) {
  return cljs.core.mod.call(null, num, div) === 0;
};
cljs.reader.indivisible_QMARK_ = function indivisible_QMARK_(num, div) {
  return!cljs.reader.divisible_QMARK_.call(null, num, div);
};
cljs.reader.leap_year_QMARK_ = function leap_year_QMARK_(year) {
  return cljs.reader.divisible_QMARK_.call(null, year, 4) && (cljs.reader.indivisible_QMARK_.call(null, year, 100) || cljs.reader.divisible_QMARK_.call(null, year, 400));
};
cljs.reader.days_in_month = function() {
  var dim_norm = new cljs.core.PersistentVector(null, 13, 5, cljs.core.PersistentVector.EMPTY_NODE, [null, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], null);
  var dim_leap = new cljs.core.PersistentVector(null, 13, 5, cljs.core.PersistentVector.EMPTY_NODE, [null, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], null);
  return function(month, leap_year_QMARK_) {
    return cljs.core.get.call(null, cljs.core.truth_(leap_year_QMARK_) ? dim_leap : dim_norm, month);
  };
}();
cljs.reader.timestamp_regex = /(\d\d\d\d)(?:-(\d\d)(?:-(\d\d)(?:[T](\d\d)(?::(\d\d)(?::(\d\d)(?:[.](\d+))?)?)?)?)?)?(?:[Z]|([-+])(\d\d):(\d\d))?/;
cljs.reader.parse_int = function parse_int(s) {
  var n = parseInt(s);
  if (cljs.core.not.call(null, isNaN(n))) {
    return n;
  } else {
    return null;
  }
};
cljs.reader.check = function check(low, n, high, msg) {
  if (low <= n && n <= high) {
  } else {
    cljs.reader.reader_error.call(null, null, [cljs.core.str(msg), cljs.core.str(" Failed:  "), cljs.core.str(low), cljs.core.str("\x3c\x3d"), cljs.core.str(n), cljs.core.str("\x3c\x3d"), cljs.core.str(high)].join(""));
  }
  return n;
};
cljs.reader.parse_and_validate_timestamp = function parse_and_validate_timestamp(s) {
  var vec__45116 = cljs.core.re_matches.call(null, cljs.reader.timestamp_regex, s);
  var _ = cljs.core.nth.call(null, vec__45116, 0, null);
  var years = cljs.core.nth.call(null, vec__45116, 1, null);
  var months = cljs.core.nth.call(null, vec__45116, 2, null);
  var days = cljs.core.nth.call(null, vec__45116, 3, null);
  var hours = cljs.core.nth.call(null, vec__45116, 4, null);
  var minutes = cljs.core.nth.call(null, vec__45116, 5, null);
  var seconds = cljs.core.nth.call(null, vec__45116, 6, null);
  var fraction = cljs.core.nth.call(null, vec__45116, 7, null);
  var offset_sign = cljs.core.nth.call(null, vec__45116, 8, null);
  var offset_hours = cljs.core.nth.call(null, vec__45116, 9, null);
  var offset_minutes = cljs.core.nth.call(null, vec__45116, 10, null);
  var v = vec__45116;
  if (cljs.core.not.call(null, v)) {
    return cljs.reader.reader_error.call(null, null, [cljs.core.str("Unrecognized date/time syntax: "), cljs.core.str(s)].join(""));
  } else {
    var years__$1 = cljs.reader.parse_int.call(null, years);
    var months__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, months);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 1;
      }
    }();
    var days__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, days);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 1;
      }
    }();
    var hours__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, hours);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var minutes__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, minutes);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var seconds__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, seconds);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var fraction__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, cljs.reader.zero_fill_right_and_truncate.call(null, fraction, 3));
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var offset_sign__$1 = cljs.core._EQ_.call(null, offset_sign, "-") ? -1 : 1;
    var offset_hours__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, offset_hours);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var offset_minutes__$1 = function() {
      var or__3400__auto__ = cljs.reader.parse_int.call(null, offset_minutes);
      if (cljs.core.truth_(or__3400__auto__)) {
        return or__3400__auto__;
      } else {
        return 0;
      }
    }();
    var offset = offset_sign__$1 * (offset_hours__$1 * 60 + offset_minutes__$1);
    return new cljs.core.PersistentVector(null, 8, 5, cljs.core.PersistentVector.EMPTY_NODE, [years__$1, cljs.reader.check.call(null, 1, months__$1, 12, "timestamp month field must be in range 1..12"), cljs.reader.check.call(null, 1, days__$1, cljs.reader.days_in_month.call(null, months__$1, cljs.reader.leap_year_QMARK_.call(null, years__$1)), "timestamp day field must be in range 1..last day in month"), cljs.reader.check.call(null, 0, hours__$1, 23, "timestamp hour field must be in range 0..23"), 
    cljs.reader.check.call(null, 0, minutes__$1, 59, "timestamp minute field must be in range 0..59"), cljs.reader.check.call(null, 0, seconds__$1, cljs.core._EQ_.call(null, minutes__$1, 59) ? 60 : 59, "timestamp second field must be in range 0..60"), cljs.reader.check.call(null, 0, fraction__$1, 999, "timestamp millisecond field must be in range 0..999"), offset], null);
  }
};
cljs.reader.parse_timestamp = function parse_timestamp(ts) {
  var temp__4090__auto__ = cljs.reader.parse_and_validate_timestamp.call(null, ts);
  if (cljs.core.truth_(temp__4090__auto__)) {
    var vec__45118 = temp__4090__auto__;
    var years = cljs.core.nth.call(null, vec__45118, 0, null);
    var months = cljs.core.nth.call(null, vec__45118, 1, null);
    var days = cljs.core.nth.call(null, vec__45118, 2, null);
    var hours = cljs.core.nth.call(null, vec__45118, 3, null);
    var minutes = cljs.core.nth.call(null, vec__45118, 4, null);
    var seconds = cljs.core.nth.call(null, vec__45118, 5, null);
    var ms = cljs.core.nth.call(null, vec__45118, 6, null);
    var offset = cljs.core.nth.call(null, vec__45118, 7, null);
    return new Date(Date.UTC(years, months - 1, days, hours, minutes, seconds, ms) - offset * 60 * 1E3);
  } else {
    return cljs.reader.reader_error.call(null, null, [cljs.core.str("Unrecognized date/time syntax: "), cljs.core.str(ts)].join(""));
  }
};
cljs.reader.read_date = function read_date(s) {
  if (typeof s === "string") {
    return cljs.reader.parse_timestamp.call(null, s);
  } else {
    return cljs.reader.reader_error.call(null, null, "Instance literal expects a string for its timestamp.");
  }
};
cljs.reader.read_queue = function read_queue(elems) {
  if (cljs.core.vector_QMARK_.call(null, elems)) {
    return cljs.core.into.call(null, cljs.core.PersistentQueue.EMPTY, elems);
  } else {
    return cljs.reader.reader_error.call(null, null, "Queue literal expects a vector for its elements.");
  }
};
cljs.reader.read_js = function read_js(form) {
  if (cljs.core.vector_QMARK_.call(null, form)) {
    var arr = [];
    var seq__45131_45143 = cljs.core.seq.call(null, form);
    var chunk__45132_45144 = null;
    var count__45133_45145 = 0;
    var i__45134_45146 = 0;
    while (true) {
      if (i__45134_45146 < count__45133_45145) {
        var x_45147 = cljs.core._nth.call(null, chunk__45132_45144, i__45134_45146);
        arr.push(x_45147);
        var G__45148 = seq__45131_45143;
        var G__45149 = chunk__45132_45144;
        var G__45150 = count__45133_45145;
        var G__45151 = i__45134_45146 + 1;
        seq__45131_45143 = G__45148;
        chunk__45132_45144 = G__45149;
        count__45133_45145 = G__45150;
        i__45134_45146 = G__45151;
        continue;
      } else {
        var temp__4092__auto___45152 = cljs.core.seq.call(null, seq__45131_45143);
        if (temp__4092__auto___45152) {
          var seq__45131_45153__$1 = temp__4092__auto___45152;
          if (cljs.core.chunked_seq_QMARK_.call(null, seq__45131_45153__$1)) {
            var c__4142__auto___45154 = cljs.core.chunk_first.call(null, seq__45131_45153__$1);
            var G__45155 = cljs.core.chunk_rest.call(null, seq__45131_45153__$1);
            var G__45156 = c__4142__auto___45154;
            var G__45157 = cljs.core.count.call(null, c__4142__auto___45154);
            var G__45158 = 0;
            seq__45131_45143 = G__45155;
            chunk__45132_45144 = G__45156;
            count__45133_45145 = G__45157;
            i__45134_45146 = G__45158;
            continue;
          } else {
            var x_45159 = cljs.core.first.call(null, seq__45131_45153__$1);
            arr.push(x_45159);
            var G__45160 = cljs.core.next.call(null, seq__45131_45153__$1);
            var G__45161 = null;
            var G__45162 = 0;
            var G__45163 = 0;
            seq__45131_45143 = G__45160;
            chunk__45132_45144 = G__45161;
            count__45133_45145 = G__45162;
            i__45134_45146 = G__45163;
            continue;
          }
        } else {
        }
      }
      break;
    }
    return arr;
  } else {
    if (cljs.core.map_QMARK_.call(null, form)) {
      var obj = function() {
        var obj45136 = {};
        return obj45136;
      }();
      var seq__45137_45164 = cljs.core.seq.call(null, form);
      var chunk__45138_45165 = null;
      var count__45139_45166 = 0;
      var i__45140_45167 = 0;
      while (true) {
        if (i__45140_45167 < count__45139_45166) {
          var vec__45141_45168 = cljs.core._nth.call(null, chunk__45138_45165, i__45140_45167);
          var k_45169 = cljs.core.nth.call(null, vec__45141_45168, 0, null);
          var v_45170 = cljs.core.nth.call(null, vec__45141_45168, 1, null);
          obj[cljs.core.name.call(null, k_45169)] = v_45170;
          var G__45171 = seq__45137_45164;
          var G__45172 = chunk__45138_45165;
          var G__45173 = count__45139_45166;
          var G__45174 = i__45140_45167 + 1;
          seq__45137_45164 = G__45171;
          chunk__45138_45165 = G__45172;
          count__45139_45166 = G__45173;
          i__45140_45167 = G__45174;
          continue;
        } else {
          var temp__4092__auto___45175 = cljs.core.seq.call(null, seq__45137_45164);
          if (temp__4092__auto___45175) {
            var seq__45137_45176__$1 = temp__4092__auto___45175;
            if (cljs.core.chunked_seq_QMARK_.call(null, seq__45137_45176__$1)) {
              var c__4142__auto___45177 = cljs.core.chunk_first.call(null, seq__45137_45176__$1);
              var G__45178 = cljs.core.chunk_rest.call(null, seq__45137_45176__$1);
              var G__45179 = c__4142__auto___45177;
              var G__45180 = cljs.core.count.call(null, c__4142__auto___45177);
              var G__45181 = 0;
              seq__45137_45164 = G__45178;
              chunk__45138_45165 = G__45179;
              count__45139_45166 = G__45180;
              i__45140_45167 = G__45181;
              continue;
            } else {
              var vec__45142_45182 = cljs.core.first.call(null, seq__45137_45176__$1);
              var k_45183 = cljs.core.nth.call(null, vec__45142_45182, 0, null);
              var v_45184 = cljs.core.nth.call(null, vec__45142_45182, 1, null);
              obj[cljs.core.name.call(null, k_45183)] = v_45184;
              var G__45185 = cljs.core.next.call(null, seq__45137_45176__$1);
              var G__45186 = null;
              var G__45187 = 0;
              var G__45188 = 0;
              seq__45137_45164 = G__45185;
              chunk__45138_45165 = G__45186;
              count__45139_45166 = G__45187;
              i__45140_45167 = G__45188;
              continue;
            }
          } else {
          }
        }
        break;
      }
      return obj;
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return cljs.reader.reader_error.call(null, null, [cljs.core.str("JS literal expects a vector or map containing "), cljs.core.str("only string or unqualified keyword keys")].join(""));
      } else {
        return null;
      }
    }
  }
};
cljs.reader.read_uuid = function read_uuid(uuid) {
  if (typeof uuid === "string") {
    return new cljs.core.UUID(uuid);
  } else {
    return cljs.reader.reader_error.call(null, null, "UUID literal expects a string as its representation.");
  }
};
cljs.reader._STAR_tag_table_STAR_ = cljs.core.atom.call(null, new cljs.core.PersistentArrayMap(null, 4, ["inst", cljs.reader.read_date, "uuid", cljs.reader.read_uuid, "queue", cljs.reader.read_queue, "js", cljs.reader.read_js], null));
cljs.reader._STAR_default_data_reader_fn_STAR_ = cljs.core.atom.call(null, null);
cljs.reader.maybe_read_tagged_type = function maybe_read_tagged_type(rdr, initch) {
  var tag = cljs.reader.read_symbol.call(null, rdr, initch);
  var pfn = cljs.core.get.call(null, cljs.core.deref.call(null, cljs.reader._STAR_tag_table_STAR_), [cljs.core.str(tag)].join(""));
  var dfn = cljs.core.deref.call(null, cljs.reader._STAR_default_data_reader_fn_STAR_);
  if (cljs.core.truth_(pfn)) {
    return pfn.call(null, cljs.reader.read.call(null, rdr, true, null, false));
  } else {
    if (cljs.core.truth_(dfn)) {
      return dfn.call(null, tag, cljs.reader.read.call(null, rdr, true, null, false));
    } else {
      if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
        return cljs.reader.reader_error.call(null, rdr, "Could not find tag parser for ", [cljs.core.str(tag)].join(""), " in ", cljs.core.pr_str.call(null, cljs.core.keys.call(null, cljs.core.deref.call(null, cljs.reader._STAR_tag_table_STAR_))));
      } else {
        return null;
      }
    }
  }
};
cljs.reader.register_tag_parser_BANG_ = function register_tag_parser_BANG_(tag, f) {
  var tag__$1 = [cljs.core.str(tag)].join("");
  var old_parser = cljs.core.get.call(null, cljs.core.deref.call(null, cljs.reader._STAR_tag_table_STAR_), tag__$1);
  cljs.core.swap_BANG_.call(null, cljs.reader._STAR_tag_table_STAR_, cljs.core.assoc, tag__$1, f);
  return old_parser;
};
cljs.reader.deregister_tag_parser_BANG_ = function deregister_tag_parser_BANG_(tag) {
  var tag__$1 = [cljs.core.str(tag)].join("");
  var old_parser = cljs.core.get.call(null, cljs.core.deref.call(null, cljs.reader._STAR_tag_table_STAR_), tag__$1);
  cljs.core.swap_BANG_.call(null, cljs.reader._STAR_tag_table_STAR_, cljs.core.dissoc, tag__$1);
  return old_parser;
};
cljs.reader.register_default_tag_parser_BANG_ = function register_default_tag_parser_BANG_(f) {
  var old_parser = cljs.core.deref.call(null, cljs.reader._STAR_default_data_reader_fn_STAR_);
  cljs.core.swap_BANG_.call(null, cljs.reader._STAR_default_data_reader_fn_STAR_, function(_) {
    return f;
  });
  return old_parser;
};
cljs.reader.deregister_default_tag_parser_BANG_ = function deregister_default_tag_parser_BANG_() {
  var old_parser = cljs.core.deref.call(null, cljs.reader._STAR_default_data_reader_fn_STAR_);
  cljs.core.swap_BANG_.call(null, cljs.reader._STAR_default_data_reader_fn_STAR_, function(_) {
    return null;
  });
  return old_parser;
};
goog.provide("jayq.core");
goog.require("cljs.core");
goog.require("cljs.reader");
goog.require("cljs.reader");
goog.require("clojure.string");
goog.require("clojure.string");
jayq.core.crate_meta = function crate_meta(func) {
  return func.prototype._crateGroup;
};
jayq.core.__GT_selector = function __GT_selector(sel) {
  if (typeof sel === "string") {
    return sel;
  } else {
    if (cljs.core.fn_QMARK_.call(null, sel)) {
      var temp__4090__auto__ = jayq.core.crate_meta.call(null, sel);
      if (cljs.core.truth_(temp__4090__auto__)) {
        var cm = temp__4090__auto__;
        return[cljs.core.str("[crateGroup\x3d"), cljs.core.str(cm), cljs.core.str("]")].join("");
      } else {
        return sel;
      }
    } else {
      if (sel instanceof cljs.core.Keyword) {
        return cljs.core.name.call(null, sel);
      } else {
        if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
          return sel;
        } else {
          return null;
        }
      }
    }
  }
};
jayq.core.$ = function() {
  var $ = null;
  var $__1 = function(sel) {
    return jQuery(jayq.core.__GT_selector.call(null, sel));
  };
  var $__2 = function(sel, context) {
    return jQuery(jayq.core.__GT_selector.call(null, sel), context);
  };
  $ = function(sel, context) {
    switch(arguments.length) {
      case 1:
        return $__1.call(this, sel);
      case 2:
        return $__2.call(this, sel, context);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  $.cljs$core$IFn$_invoke$arity$1 = $__1;
  $.cljs$core$IFn$_invoke$arity$2 = $__2;
  return $;
}();
jQuery.prototype.cljs$core$IFn$ = true;
jQuery.prototype.call = function() {
  var G__45026 = null;
  var G__45026__2 = function(self__, k) {
    var self____$1 = this;
    var this$ = self____$1;
    return cljs.core._lookup.call(null, this$, k);
  };
  var G__45026__3 = function(self__, k, not_found) {
    var self____$1 = this;
    var this$ = self____$1;
    return cljs.core._lookup.call(null, this$, k, not_found);
  };
  G__45026 = function(self__, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__45026__2.call(this, self__, k);
      case 3:
        return G__45026__3.call(this, self__, k, not_found);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  return G__45026;
}();
jQuery.prototype.apply = function(self__, args45025) {
  var self____$1 = this;
  return self____$1.call.apply(self____$1, [self____$1].concat(cljs.core.aclone.call(null, args45025)));
};
jQuery.prototype.cljs$core$IFn$_invoke$arity$1 = function(k) {
  var this$ = this;
  return cljs.core._lookup.call(null, this$, k);
};
jQuery.prototype.cljs$core$IFn$_invoke$arity$2 = function(k, not_found) {
  var this$ = this;
  return cljs.core._lookup.call(null, this$, k, not_found);
};
jQuery.prototype.cljs$core$IReduce$ = true;
jQuery.prototype.cljs$core$IReduce$_reduce$arity$2 = function(this$, f) {
  var this$__$1 = this;
  return cljs.core.ci_reduce.call(null, this$__$1, f);
};
jQuery.prototype.cljs$core$IReduce$_reduce$arity$3 = function(this$, f, start) {
  var this$__$1 = this;
  return cljs.core.ci_reduce.call(null, this$__$1, f, start);
};
jQuery.prototype.cljs$core$ILookup$ = true;
jQuery.prototype.cljs$core$ILookup$_lookup$arity$2 = function(this$, k) {
  var this$__$1 = this;
  var or__3400__auto__ = this$__$1.slice(k, k + 1);
  if (cljs.core.truth_(or__3400__auto__)) {
    return or__3400__auto__;
  } else {
    return null;
  }
};
jQuery.prototype.cljs$core$ILookup$_lookup$arity$3 = function(this$, k, not_found) {
  var this$__$1 = this;
  return cljs.core._nth.call(null, this$__$1, k, not_found);
};
jQuery.prototype.cljs$core$ISequential$ = true;
jQuery.prototype.cljs$core$IIndexed$ = true;
jQuery.prototype.cljs$core$IIndexed$_nth$arity$2 = function(this$, n) {
  var this$__$1 = this;
  if (n < cljs.core.count.call(null, this$__$1)) {
    return this$__$1.slice(n, n + 1);
  } else {
    return null;
  }
};
jQuery.prototype.cljs$core$IIndexed$_nth$arity$3 = function(this$, n, not_found) {
  var this$__$1 = this;
  if (n < cljs.core.count.call(null, this$__$1)) {
    return this$__$1.slice(n, n + 1);
  } else {
    if (void 0 === not_found) {
      return null;
    } else {
      return not_found;
    }
  }
};
jQuery.prototype.cljs$core$ICounted$ = true;
jQuery.prototype.cljs$core$ICounted$_count$arity$1 = function(this$) {
  var this$__$1 = this;
  return this$__$1.length;
};
jQuery.prototype.cljs$core$ISeq$ = true;
jQuery.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  var this$__$1 = this;
  return this$__$1.get(0);
};
jQuery.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  var this$__$1 = this;
  if (cljs.core.count.call(null, this$__$1) > 1) {
    return this$__$1.slice(1);
  } else {
    return cljs.core.List.EMPTY;
  }
};
jQuery.prototype.cljs$core$ISeqable$ = true;
jQuery.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this$__$1 = this;
  if (cljs.core.truth_(this$__$1.get(0))) {
    return this$__$1;
  } else {
    return null;
  }
};
jayq.core.anim = function anim($elem, props, dur) {
  return $elem.animate(cljs.core.clj__GT_js.call(null, props), dur);
};
jayq.core.text = function() {
  var text = null;
  var text__1 = function($elem) {
    return $elem.text();
  };
  var text__2 = function($elem, txt) {
    return $elem.text(txt);
  };
  text = function($elem, txt) {
    switch(arguments.length) {
      case 1:
        return text__1.call(this, $elem);
      case 2:
        return text__2.call(this, $elem, txt);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  text.cljs$core$IFn$_invoke$arity$1 = text__1;
  text.cljs$core$IFn$_invoke$arity$2 = text__2;
  return text;
}();
jayq.core.css = function() {
  var css = null;
  var css__2 = function($elem, opts) {
    return $elem.css(cljs.core.clj__GT_js.call(null, opts));
  };
  var css__3 = function($elem, p, v) {
    return $elem.css(cljs.core.name.call(null, p), v);
  };
  css = function($elem, p, v) {
    switch(arguments.length) {
      case 2:
        return css__2.call(this, $elem, p);
      case 3:
        return css__3.call(this, $elem, p, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  css.cljs$core$IFn$_invoke$arity$2 = css__2;
  css.cljs$core$IFn$_invoke$arity$3 = css__3;
  return css;
}();
jayq.core.attr = function() {
  var attr = null;
  var attr__2 = function($elem, x) {
    return $elem.attr(cljs.core.clj__GT_js.call(null, x));
  };
  var attr__3 = function($elem, n, v) {
    return $elem.attr(cljs.core.name.call(null, n), v);
  };
  attr = function($elem, n, v) {
    switch(arguments.length) {
      case 2:
        return attr__2.call(this, $elem, n);
      case 3:
        return attr__3.call(this, $elem, n, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  attr.cljs$core$IFn$_invoke$arity$2 = attr__2;
  attr.cljs$core$IFn$_invoke$arity$3 = attr__3;
  return attr;
}();
jayq.core.prop = function() {
  var prop = null;
  var prop__2 = function($elem, x) {
    return $elem.prop(cljs.core.clj__GT_js.call(null, x));
  };
  var prop__3 = function($elem, n, v) {
    return $elem.prop(cljs.core.name.call(null, n), v);
  };
  prop = function($elem, n, v) {
    switch(arguments.length) {
      case 2:
        return prop__2.call(this, $elem, n);
      case 3:
        return prop__3.call(this, $elem, n, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  prop.cljs$core$IFn$_invoke$arity$2 = prop__2;
  prop.cljs$core$IFn$_invoke$arity$3 = prop__3;
  return prop;
}();
jayq.core.remove_attr = function remove_attr($elem, a) {
  return $elem.removeAttr(cljs.core.name.call(null, a));
};
jayq.core.remove_prop = function remove_prop($elem, a) {
  return $elem.removeProp(cljs.core.name.call(null, a));
};
jayq.core.data = function() {
  var data = null;
  var data__1 = function($elem) {
    return $elem.data();
  };
  var data__2 = function($elem, k) {
    return $elem.data(cljs.core.clj__GT_js.call(null, k));
  };
  var data__3 = function($elem, k, v) {
    return $elem.data(cljs.core.name.call(null, k), cljs.core.clj__GT_js.call(null, v));
  };
  data = function($elem, k, v) {
    switch(arguments.length) {
      case 1:
        return data__1.call(this, $elem);
      case 2:
        return data__2.call(this, $elem, k);
      case 3:
        return data__3.call(this, $elem, k, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  data.cljs$core$IFn$_invoke$arity$1 = data__1;
  data.cljs$core$IFn$_invoke$arity$2 = data__2;
  data.cljs$core$IFn$_invoke$arity$3 = data__3;
  return data;
}();
jayq.core.add_class = function add_class($elem, cl) {
  return $elem.addClass(cljs.core.name.call(null, cl));
};
jayq.core.remove_class = function remove_class($elem, cl) {
  return $elem.removeClass(cljs.core.name.call(null, cl));
};
jayq.core.toggle_class = function toggle_class($elem, cl) {
  return $elem.toggleClass(cljs.core.name.call(null, cl));
};
jayq.core.has_class = function has_class($elem, cl) {
  return $elem.hasClass(cljs.core.name.call(null, cl));
};
jayq.core.is = function is($elem, selector) {
  return $elem.is(jayq.core.__GT_selector.call(null, selector));
};
jayq.core.after = function after($elem, content) {
  return $elem.after(content);
};
jayq.core.before = function before($elem, content) {
  return $elem.before(content);
};
jayq.core.append = function append($elem, content) {
  return $elem.append(content);
};
jayq.core.prepend = function prepend($elem, content) {
  return $elem.prepend(content);
};
jayq.core.append_to = function append_to($elem, target) {
  return $elem.appendTo(jayq.core.__GT_selector.call(null, target));
};
jayq.core.prepend_to = function prepend_to($elem, target) {
  return $elem.prependTo(jayq.core.__GT_selector.call(null, target));
};
jayq.core.insert_before = function insert_before($elem, target) {
  return $elem.insertBefore(jayq.core.__GT_selector.call(null, target));
};
jayq.core.insert_after = function insert_after($elem, target) {
  return $elem.insertAfter(jayq.core.__GT_selector.call(null, target));
};
jayq.core.replace_with = function replace_with($elem, content) {
  return $elem.replaceWith(content);
};
jayq.core.remove = function remove($elem) {
  return $elem.remove();
};
jayq.core.hide = function() {
  var hide__delegate = function($elem, p__45027) {
    var vec__45029 = p__45027;
    var speed = cljs.core.nth.call(null, vec__45029, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45029, 1, null);
    return $elem.hide(speed, on_finish);
  };
  var hide = function($elem, var_args) {
    var p__45027 = null;
    if (arguments.length > 1) {
      p__45027 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return hide__delegate.call(this, $elem, p__45027);
  };
  hide.cljs$lang$maxFixedArity = 1;
  hide.cljs$lang$applyTo = function(arglist__45030) {
    var $elem = cljs.core.first(arglist__45030);
    var p__45027 = cljs.core.rest(arglist__45030);
    return hide__delegate($elem, p__45027);
  };
  hide.cljs$core$IFn$_invoke$arity$variadic = hide__delegate;
  return hide;
}();
jayq.core.show = function() {
  var show__delegate = function($elem, p__45031) {
    var vec__45033 = p__45031;
    var speed = cljs.core.nth.call(null, vec__45033, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45033, 1, null);
    return $elem.show(speed, on_finish);
  };
  var show = function($elem, var_args) {
    var p__45031 = null;
    if (arguments.length > 1) {
      p__45031 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return show__delegate.call(this, $elem, p__45031);
  };
  show.cljs$lang$maxFixedArity = 1;
  show.cljs$lang$applyTo = function(arglist__45034) {
    var $elem = cljs.core.first(arglist__45034);
    var p__45031 = cljs.core.rest(arglist__45034);
    return show__delegate($elem, p__45031);
  };
  show.cljs$core$IFn$_invoke$arity$variadic = show__delegate;
  return show;
}();
jayq.core.toggle = function() {
  var toggle__delegate = function($elem, p__45035) {
    var vec__45037 = p__45035;
    var speed = cljs.core.nth.call(null, vec__45037, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45037, 1, null);
    return $elem.toggle(speed, on_finish);
  };
  var toggle = function($elem, var_args) {
    var p__45035 = null;
    if (arguments.length > 1) {
      p__45035 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return toggle__delegate.call(this, $elem, p__45035);
  };
  toggle.cljs$lang$maxFixedArity = 1;
  toggle.cljs$lang$applyTo = function(arglist__45038) {
    var $elem = cljs.core.first(arglist__45038);
    var p__45035 = cljs.core.rest(arglist__45038);
    return toggle__delegate($elem, p__45035);
  };
  toggle.cljs$core$IFn$_invoke$arity$variadic = toggle__delegate;
  return toggle;
}();
jayq.core.fade_out = function() {
  var fade_out__delegate = function($elem, p__45039) {
    var vec__45041 = p__45039;
    var speed = cljs.core.nth.call(null, vec__45041, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45041, 1, null);
    return $elem.fadeOut(speed, on_finish);
  };
  var fade_out = function($elem, var_args) {
    var p__45039 = null;
    if (arguments.length > 1) {
      p__45039 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return fade_out__delegate.call(this, $elem, p__45039);
  };
  fade_out.cljs$lang$maxFixedArity = 1;
  fade_out.cljs$lang$applyTo = function(arglist__45042) {
    var $elem = cljs.core.first(arglist__45042);
    var p__45039 = cljs.core.rest(arglist__45042);
    return fade_out__delegate($elem, p__45039);
  };
  fade_out.cljs$core$IFn$_invoke$arity$variadic = fade_out__delegate;
  return fade_out;
}();
jayq.core.fade_in = function() {
  var fade_in__delegate = function($elem, p__45043) {
    var vec__45045 = p__45043;
    var speed = cljs.core.nth.call(null, vec__45045, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45045, 1, null);
    return $elem.fadeIn(speed, on_finish);
  };
  var fade_in = function($elem, var_args) {
    var p__45043 = null;
    if (arguments.length > 1) {
      p__45043 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return fade_in__delegate.call(this, $elem, p__45043);
  };
  fade_in.cljs$lang$maxFixedArity = 1;
  fade_in.cljs$lang$applyTo = function(arglist__45046) {
    var $elem = cljs.core.first(arglist__45046);
    var p__45043 = cljs.core.rest(arglist__45046);
    return fade_in__delegate($elem, p__45043);
  };
  fade_in.cljs$core$IFn$_invoke$arity$variadic = fade_in__delegate;
  return fade_in;
}();
jayq.core.slide_up = function() {
  var slide_up__delegate = function($elem, p__45047) {
    var vec__45049 = p__45047;
    var speed = cljs.core.nth.call(null, vec__45049, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45049, 1, null);
    return $elem.slideUp(speed, on_finish);
  };
  var slide_up = function($elem, var_args) {
    var p__45047 = null;
    if (arguments.length > 1) {
      p__45047 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return slide_up__delegate.call(this, $elem, p__45047);
  };
  slide_up.cljs$lang$maxFixedArity = 1;
  slide_up.cljs$lang$applyTo = function(arglist__45050) {
    var $elem = cljs.core.first(arglist__45050);
    var p__45047 = cljs.core.rest(arglist__45050);
    return slide_up__delegate($elem, p__45047);
  };
  slide_up.cljs$core$IFn$_invoke$arity$variadic = slide_up__delegate;
  return slide_up;
}();
jayq.core.slide_down = function() {
  var slide_down__delegate = function($elem, p__45051) {
    var vec__45053 = p__45051;
    var speed = cljs.core.nth.call(null, vec__45053, 0, null);
    var on_finish = cljs.core.nth.call(null, vec__45053, 1, null);
    return $elem.slideDown(speed, on_finish);
  };
  var slide_down = function($elem, var_args) {
    var p__45051 = null;
    if (arguments.length > 1) {
      p__45051 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return slide_down__delegate.call(this, $elem, p__45051);
  };
  slide_down.cljs$lang$maxFixedArity = 1;
  slide_down.cljs$lang$applyTo = function(arglist__45054) {
    var $elem = cljs.core.first(arglist__45054);
    var p__45051 = cljs.core.rest(arglist__45054);
    return slide_down__delegate($elem, p__45051);
  };
  slide_down.cljs$core$IFn$_invoke$arity$variadic = slide_down__delegate;
  return slide_down;
}();
jayq.core.siblings = function() {
  var siblings = null;
  var siblings__1 = function($elem) {
    return $elem.siblings();
  };
  var siblings__2 = function($elem, selector) {
    return $elem.siblings(cljs.core.name.call(null, selector));
  };
  siblings = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return siblings__1.call(this, $elem);
      case 2:
        return siblings__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  siblings.cljs$core$IFn$_invoke$arity$1 = siblings__1;
  siblings.cljs$core$IFn$_invoke$arity$2 = siblings__2;
  return siblings;
}();
jayq.core.parent = function parent($elem) {
  return $elem.parent();
};
jayq.core.parents = function() {
  var parents = null;
  var parents__1 = function($elem) {
    return $elem.parents();
  };
  var parents__2 = function($elem, selector) {
    return $elem.parents(cljs.core.name.call(null, selector));
  };
  parents = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return parents__1.call(this, $elem);
      case 2:
        return parents__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  parents.cljs$core$IFn$_invoke$arity$1 = parents__1;
  parents.cljs$core$IFn$_invoke$arity$2 = parents__2;
  return parents;
}();
jayq.core.parents_until = function() {
  var parents_until = null;
  var parents_until__1 = function($elem) {
    return $elem.parentsUntil();
  };
  var parents_until__2 = function($elem, selector) {
    return $elem.parentsUntil(jayq.core.__GT_selector.call(null, selector));
  };
  var parents_until__3 = function($elem, selector, filtr) {
    return $elem.parentsUntil(jayq.core.__GT_selector.call(null, selector), cljs.core.name.call(null, filtr));
  };
  parents_until = function($elem, selector, filtr) {
    switch(arguments.length) {
      case 1:
        return parents_until__1.call(this, $elem);
      case 2:
        return parents_until__2.call(this, $elem, selector);
      case 3:
        return parents_until__3.call(this, $elem, selector, filtr);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  parents_until.cljs$core$IFn$_invoke$arity$1 = parents_until__1;
  parents_until.cljs$core$IFn$_invoke$arity$2 = parents_until__2;
  parents_until.cljs$core$IFn$_invoke$arity$3 = parents_until__3;
  return parents_until;
}();
jayq.core.children = function() {
  var children = null;
  var children__1 = function($elem) {
    return $elem.children();
  };
  var children__2 = function($elem, selector) {
    return $elem.children(cljs.core.name.call(null, selector));
  };
  children = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return children__1.call(this, $elem);
      case 2:
        return children__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  children.cljs$core$IFn$_invoke$arity$1 = children__1;
  children.cljs$core$IFn$_invoke$arity$2 = children__2;
  return children;
}();
jayq.core.next = function() {
  var next = null;
  var next__1 = function($elem) {
    return $elem.next();
  };
  var next__2 = function($elem, selector) {
    return $elem.next(cljs.core.name.call(null, selector));
  };
  next = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return next__1.call(this, $elem);
      case 2:
        return next__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  next.cljs$core$IFn$_invoke$arity$1 = next__1;
  next.cljs$core$IFn$_invoke$arity$2 = next__2;
  return next;
}();
jayq.core.prev = function() {
  var prev = null;
  var prev__1 = function($elem) {
    return $elem.prev();
  };
  var prev__2 = function($elem, selector) {
    return $elem.prev(cljs.core.name.call(null, selector));
  };
  prev = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return prev__1.call(this, $elem);
      case 2:
        return prev__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  prev.cljs$core$IFn$_invoke$arity$1 = prev__1;
  prev.cljs$core$IFn$_invoke$arity$2 = prev__2;
  return prev;
}();
jayq.core.next_all = function() {
  var next_all = null;
  var next_all__1 = function($elem) {
    return $elem.nextAll();
  };
  var next_all__2 = function($elem, selector) {
    return $elem.nextAll(cljs.core.name.call(null, selector));
  };
  next_all = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return next_all__1.call(this, $elem);
      case 2:
        return next_all__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  next_all.cljs$core$IFn$_invoke$arity$1 = next_all__1;
  next_all.cljs$core$IFn$_invoke$arity$2 = next_all__2;
  return next_all;
}();
jayq.core.prev_all = function() {
  var prev_all = null;
  var prev_all__1 = function($elem) {
    return $elem.prevAll();
  };
  var prev_all__2 = function($elem, selector) {
    return $elem.prevAll(cljs.core.name.call(null, selector));
  };
  prev_all = function($elem, selector) {
    switch(arguments.length) {
      case 1:
        return prev_all__1.call(this, $elem);
      case 2:
        return prev_all__2.call(this, $elem, selector);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  prev_all.cljs$core$IFn$_invoke$arity$1 = prev_all__1;
  prev_all.cljs$core$IFn$_invoke$arity$2 = prev_all__2;
  return prev_all;
}();
jayq.core.next_until = function() {
  var next_until = null;
  var next_until__1 = function($elem) {
    return $elem.nextUntil();
  };
  var next_until__2 = function($elem, selector) {
    return $elem.nextUntil(jayq.core.__GT_selector.call(null, selector));
  };
  var next_until__3 = function($elem, selector, filtr) {
    return $elem.nextUntil(jayq.core.__GT_selector.call(null, selector), cljs.core.name.call(null, filtr));
  };
  next_until = function($elem, selector, filtr) {
    switch(arguments.length) {
      case 1:
        return next_until__1.call(this, $elem);
      case 2:
        return next_until__2.call(this, $elem, selector);
      case 3:
        return next_until__3.call(this, $elem, selector, filtr);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  next_until.cljs$core$IFn$_invoke$arity$1 = next_until__1;
  next_until.cljs$core$IFn$_invoke$arity$2 = next_until__2;
  next_until.cljs$core$IFn$_invoke$arity$3 = next_until__3;
  return next_until;
}();
jayq.core.prev_until = function() {
  var prev_until = null;
  var prev_until__1 = function($elem) {
    return $elem.prevUntil();
  };
  var prev_until__2 = function($elem, selector) {
    return $elem.prevUntil(jayq.core.__GT_selector.call(null, selector));
  };
  var prev_until__3 = function($elem, selector, filtr) {
    return $elem.prevUntil(jayq.core.__GT_selector.call(null, selector), cljs.core.name.call(null, filtr));
  };
  prev_until = function($elem, selector, filtr) {
    switch(arguments.length) {
      case 1:
        return prev_until__1.call(this, $elem);
      case 2:
        return prev_until__2.call(this, $elem, selector);
      case 3:
        return prev_until__3.call(this, $elem, selector, filtr);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  prev_until.cljs$core$IFn$_invoke$arity$1 = prev_until__1;
  prev_until.cljs$core$IFn$_invoke$arity$2 = prev_until__2;
  prev_until.cljs$core$IFn$_invoke$arity$3 = prev_until__3;
  return prev_until;
}();
jayq.core.find = function find($elem, selector) {
  return $elem.find(cljs.core.name.call(null, selector));
};
jayq.core.closest = function() {
  var closest__delegate = function($elem, selector, p__45055) {
    var vec__45057 = p__45055;
    var context = cljs.core.nth.call(null, vec__45057, 0, null);
    return $elem.closest(jayq.core.__GT_selector.call(null, selector), context);
  };
  var closest = function($elem, selector, var_args) {
    var p__45055 = null;
    if (arguments.length > 2) {
      p__45055 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return closest__delegate.call(this, $elem, selector, p__45055);
  };
  closest.cljs$lang$maxFixedArity = 2;
  closest.cljs$lang$applyTo = function(arglist__45058) {
    var $elem = cljs.core.first(arglist__45058);
    arglist__45058 = cljs.core.next(arglist__45058);
    var selector = cljs.core.first(arglist__45058);
    var p__45055 = cljs.core.rest(arglist__45058);
    return closest__delegate($elem, selector, p__45055);
  };
  closest.cljs$core$IFn$_invoke$arity$variadic = closest__delegate;
  return closest;
}();
jayq.core.clone = function clone($elem) {
  return $elem.clone();
};
jayq.core.html = function() {
  var html = null;
  var html__1 = function($elem) {
    return $elem.html();
  };
  var html__2 = function($elem, v) {
    return $elem.html(v);
  };
  html = function($elem, v) {
    switch(arguments.length) {
      case 1:
        return html__1.call(this, $elem);
      case 2:
        return html__2.call(this, $elem, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  html.cljs$core$IFn$_invoke$arity$1 = html__1;
  html.cljs$core$IFn$_invoke$arity$2 = html__2;
  return html;
}();
jayq.core.inner = jayq.core.html;
jayq.core.empty = function empty($elem) {
  return $elem.empty();
};
jayq.core.val = function() {
  var val = null;
  var val__1 = function($elem) {
    return $elem.val();
  };
  var val__2 = function($elem, v) {
    return $elem.val(v);
  };
  val = function($elem, v) {
    switch(arguments.length) {
      case 1:
        return val__1.call(this, $elem);
      case 2:
        return val__2.call(this, $elem, v);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  val.cljs$core$IFn$_invoke$arity$1 = val__1;
  val.cljs$core$IFn$_invoke$arity$2 = val__2;
  return val;
}();
jayq.core.serialize = function serialize($elem) {
  return $elem.serialize();
};
jayq.core.queue = function() {
  var queue = null;
  var queue__1 = function($elem) {
    return $elem.queue();
  };
  var queue__2 = function($elem, x) {
    return $elem.queue(x);
  };
  var queue__3 = function($elem, x, y) {
    return $elem.queue(x, y);
  };
  queue = function($elem, x, y) {
    switch(arguments.length) {
      case 1:
        return queue__1.call(this, $elem);
      case 2:
        return queue__2.call(this, $elem, x);
      case 3:
        return queue__3.call(this, $elem, x, y);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  queue.cljs$core$IFn$_invoke$arity$1 = queue__1;
  queue.cljs$core$IFn$_invoke$arity$2 = queue__2;
  queue.cljs$core$IFn$_invoke$arity$3 = queue__3;
  return queue;
}();
jayq.core.dequeue = function() {
  var dequeue = null;
  var dequeue__1 = function($elem) {
    return $elem.dequeue();
  };
  var dequeue__2 = function($elem, queue_name) {
    return $elem.dequeue(queue_name);
  };
  dequeue = function($elem, queue_name) {
    switch(arguments.length) {
      case 1:
        return dequeue__1.call(this, $elem);
      case 2:
        return dequeue__2.call(this, $elem, queue_name);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  dequeue.cljs$core$IFn$_invoke$arity$1 = dequeue__1;
  dequeue.cljs$core$IFn$_invoke$arity$2 = dequeue__2;
  return dequeue;
}();
jayq.core.document_ready = function document_ready(func) {
  return jayq.core.$.call(null, document).ready(func);
};
jayq.core.mimetype_converter = function mimetype_converter(s) {
  return cljs.reader.read_string.call(null, [cljs.core.str(s)].join(""));
};
jQuery.ajaxSetup(cljs.core.clj__GT_js.call(null, new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "accepts", "accepts", 4131250141), new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null, "edn", "edn", 1014004513), "application/edn, text/edn", new cljs.core.Keyword(null, "clojure", "clojure", 1880188502), "application/clojure, text/clojure"], null), new cljs.core.Keyword(null, "contents", "contents", 4741549708), new cljs.core.PersistentArrayMap(null, 1, ["clojure", 
/edn|clojure/], null), new cljs.core.Keyword(null, "converters", "converters", 3057163845), new cljs.core.PersistentArrayMap(null, 2, ["text edn", jayq.core.mimetype_converter, "text clojure", jayq.core.mimetype_converter], null)], null)));
jayq.core.clj_content_type_QMARK_ = function clj_content_type_QMARK_(x) {
  return cljs.core.re_find.call(null, /^(text|application)\/(clojure|edn)/, x);
};
jayq.core.__GT_content_type = function __GT_content_type(ct) {
  if (typeof ct === "string") {
    return ct;
  } else {
    if (ct instanceof cljs.core.Keyword) {
      return cljs.core.subs.call(null, [cljs.core.str(ct)].join(""), 1);
    } else {
      return null;
    }
  }
};
jayq.core.preprocess_request = function preprocess_request(p__45061) {
  var map__45063 = p__45061;
  var map__45063__$1 = cljs.core.seq_QMARK_.call(null, map__45063) ? cljs.core.apply.call(null, cljs.core.hash_map, map__45063) : map__45063;
  var request = map__45063__$1;
  var contentType = cljs.core.get.call(null, map__45063__$1, new cljs.core.Keyword(null, "contentType", "contentType", 624772805));
  var data = cljs.core.get.call(null, map__45063__$1, new cljs.core.Keyword(null, "data", "data", 1016980252));
  var ct = jayq.core.__GT_content_type.call(null, contentType);
  return function(p1__45060_SHARP_) {
    if (cljs.core.truth_(jayq.core.clj_content_type_QMARK_.call(null, ct))) {
      return cljs.core.assoc.call(null, p1__45060_SHARP_, new cljs.core.Keyword(null, "data", "data", 1016980252), cljs.core.pr_str.call(null, data));
    } else {
      return p1__45060_SHARP_;
    }
  }.call(null, function(p1__45059_SHARP_) {
    if (cljs.core.truth_(ct)) {
      return cljs.core.assoc.call(null, p1__45059_SHARP_, new cljs.core.Keyword(null, "contentType", "contentType", 624772805), ct);
    } else {
      return p1__45059_SHARP_;
    }
  }.call(null, request));
};
jayq.core.__GT_ajax_settings = function __GT_ajax_settings(request) {
  return cljs.core.clj__GT_js.call(null, jayq.core.preprocess_request.call(null, request));
};
jayq.core.ajax = function() {
  var ajax = null;
  var ajax__1 = function(settings) {
    return jQuery.ajax(jayq.core.__GT_ajax_settings.call(null, settings));
  };
  var ajax__2 = function(url, settings) {
    return jQuery.ajax(url, jayq.core.__GT_ajax_settings.call(null, settings));
  };
  ajax = function(url, settings) {
    switch(arguments.length) {
      case 1:
        return ajax__1.call(this, url);
      case 2:
        return ajax__2.call(this, url, settings);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  ajax.cljs$core$IFn$_invoke$arity$1 = ajax__1;
  ajax.cljs$core$IFn$_invoke$arity$2 = ajax__2;
  return ajax;
}();
jayq.core.xhr = function xhr(p__45064, content, callback) {
  var vec__45066 = p__45064;
  var method = cljs.core.nth.call(null, vec__45066, 0, null);
  var uri = cljs.core.nth.call(null, vec__45066, 1, null);
  var params = cljs.core.clj__GT_js.call(null, new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "type", "type", 1017479852), clojure.string.upper_case.call(null, cljs.core.name.call(null, method)), new cljs.core.Keyword(null, "data", "data", 1016980252), cljs.core.clj__GT_js.call(null, content), new cljs.core.Keyword(null, "success", "success", 3441701749), callback], null));
  return jQuery.ajax(uri, params);
};
jayq.core.read = function read($elem) {
  return cljs.reader.read_string.call(null, jayq.core.html.call(null, $elem));
};
jayq.core.bind = function bind($elem, ev, func) {
  return $elem.bind(cljs.core.name.call(null, ev), func);
};
jayq.core.unbind = function() {
  var unbind__delegate = function($elem, ev, p__45067) {
    var vec__45069 = p__45067;
    var func = cljs.core.nth.call(null, vec__45069, 0, null);
    return $elem.unbind(cljs.core.name.call(null, ev), func);
  };
  var unbind = function($elem, ev, var_args) {
    var p__45067 = null;
    if (arguments.length > 2) {
      p__45067 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return unbind__delegate.call(this, $elem, ev, p__45067);
  };
  unbind.cljs$lang$maxFixedArity = 2;
  unbind.cljs$lang$applyTo = function(arglist__45070) {
    var $elem = cljs.core.first(arglist__45070);
    arglist__45070 = cljs.core.next(arglist__45070);
    var ev = cljs.core.first(arglist__45070);
    var p__45067 = cljs.core.rest(arglist__45070);
    return unbind__delegate($elem, ev, p__45067);
  };
  unbind.cljs$core$IFn$_invoke$arity$variadic = unbind__delegate;
  return unbind;
}();
jayq.core.trigger = function trigger($elem, ev) {
  return $elem.trigger(cljs.core.name.call(null, ev));
};
jayq.core.delegate = function delegate($elem, sel, ev, func) {
  return $elem.delegate(jayq.core.__GT_selector.call(null, sel), cljs.core.name.call(null, ev), func);
};
jayq.core.__GT_event = function __GT_event(e) {
  if (cljs.core.coll_QMARK_.call(null, e)) {
    return clojure.string.join.call(null, " ", cljs.core.map.call(null, cljs.core.name, e));
  } else {
    return cljs.core.clj__GT_js.call(null, e);
  }
};
jayq.core.on = function() {
  var on__delegate = function($elem, events, p__45071) {
    var vec__45073 = p__45071;
    var sel = cljs.core.nth.call(null, vec__45073, 0, null);
    var data = cljs.core.nth.call(null, vec__45073, 1, null);
    var handler = cljs.core.nth.call(null, vec__45073, 2, null);
    return $elem.on(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel), data, handler);
  };
  var on = function($elem, events, var_args) {
    var p__45071 = null;
    if (arguments.length > 2) {
      p__45071 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return on__delegate.call(this, $elem, events, p__45071);
  };
  on.cljs$lang$maxFixedArity = 2;
  on.cljs$lang$applyTo = function(arglist__45074) {
    var $elem = cljs.core.first(arglist__45074);
    arglist__45074 = cljs.core.next(arglist__45074);
    var events = cljs.core.first(arglist__45074);
    var p__45071 = cljs.core.rest(arglist__45074);
    return on__delegate($elem, events, p__45071);
  };
  on.cljs$core$IFn$_invoke$arity$variadic = on__delegate;
  return on;
}();
jayq.core.one = function() {
  var one__delegate = function($elem, events, p__45075) {
    var vec__45077 = p__45075;
    var sel = cljs.core.nth.call(null, vec__45077, 0, null);
    var data = cljs.core.nth.call(null, vec__45077, 1, null);
    var handler = cljs.core.nth.call(null, vec__45077, 2, null);
    return $elem.one(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel), data, handler);
  };
  var one = function($elem, events, var_args) {
    var p__45075 = null;
    if (arguments.length > 2) {
      p__45075 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return one__delegate.call(this, $elem, events, p__45075);
  };
  one.cljs$lang$maxFixedArity = 2;
  one.cljs$lang$applyTo = function(arglist__45078) {
    var $elem = cljs.core.first(arglist__45078);
    arglist__45078 = cljs.core.next(arglist__45078);
    var events = cljs.core.first(arglist__45078);
    var p__45075 = cljs.core.rest(arglist__45078);
    return one__delegate($elem, events, p__45075);
  };
  one.cljs$core$IFn$_invoke$arity$variadic = one__delegate;
  return one;
}();
jayq.core.off = function() {
  var off__delegate = function($elem, events, p__45079) {
    var vec__45081 = p__45079;
    var sel = cljs.core.nth.call(null, vec__45081, 0, null);
    var handler = cljs.core.nth.call(null, vec__45081, 1, null);
    return $elem.off(jayq.core.__GT_event.call(null, events), jayq.core.__GT_selector.call(null, sel), handler);
  };
  var off = function($elem, events, var_args) {
    var p__45079 = null;
    if (arguments.length > 2) {
      p__45079 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0);
    }
    return off__delegate.call(this, $elem, events, p__45079);
  };
  off.cljs$lang$maxFixedArity = 2;
  off.cljs$lang$applyTo = function(arglist__45082) {
    var $elem = cljs.core.first(arglist__45082);
    arglist__45082 = cljs.core.next(arglist__45082);
    var events = cljs.core.first(arglist__45082);
    var p__45079 = cljs.core.rest(arglist__45082);
    return off__delegate($elem, events, p__45079);
  };
  off.cljs$core$IFn$_invoke$arity$variadic = off__delegate;
  return off;
}();
jayq.core.prevent = function prevent(e) {
  return e.preventDefault();
};
jayq.core.height = function() {
  var height = null;
  var height__1 = function($elem) {
    return $elem.height();
  };
  var height__2 = function($elem, x) {
    return $elem.height(x);
  };
  height = function($elem, x) {
    switch(arguments.length) {
      case 1:
        return height__1.call(this, $elem);
      case 2:
        return height__2.call(this, $elem, x);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  height.cljs$core$IFn$_invoke$arity$1 = height__1;
  height.cljs$core$IFn$_invoke$arity$2 = height__2;
  return height;
}();
jayq.core.width = function() {
  var width = null;
  var width__1 = function($elem) {
    return $elem.width();
  };
  var width__2 = function($elem, x) {
    return $elem.width(x);
  };
  width = function($elem, x) {
    switch(arguments.length) {
      case 1:
        return width__1.call(this, $elem);
      case 2:
        return width__2.call(this, $elem, x);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  width.cljs$core$IFn$_invoke$arity$1 = width__1;
  width.cljs$core$IFn$_invoke$arity$2 = width__2;
  return width;
}();
jayq.core.inner_height = function inner_height($elem) {
  return $elem.innerHeight();
};
jayq.core.inner_width = function inner_width($elem) {
  return $elem.innerWidth();
};
jayq.core.outer_height = function outer_height($elem) {
  return $elem.outerHeight();
};
jayq.core.outer_width = function outer_width($elem) {
  return $elem.outerWidth();
};
jayq.core.offset = function() {
  var offset = null;
  var offset__1 = function($elem) {
    return cljs.core.js__GT_clj.call(null, $elem.offset(), new cljs.core.Keyword(null, "keywordize-keys", "keywordize-keys", 4191781672), true);
  };
  var offset__2 = function($elem, coords) {
    return cljs.core.clj__GT_js.call(null, coords).offset();
  };
  offset = function($elem, coords) {
    switch(arguments.length) {
      case 1:
        return offset__1.call(this, $elem);
      case 2:
        return offset__2.call(this, $elem, coords);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  offset.cljs$core$IFn$_invoke$arity$1 = offset__1;
  offset.cljs$core$IFn$_invoke$arity$2 = offset__2;
  return offset;
}();
jayq.core.offset_parent = function offset_parent($elem) {
  return $elem.offsetParent();
};
jayq.core.position = function position($elem) {
  return cljs.core.js__GT_clj.call(null, $elem.position(), new cljs.core.Keyword(null, "keywordize-keys", "keywordize-keys", 4191781672), true);
};
jayq.core.scroll_left = function() {
  var scroll_left = null;
  var scroll_left__1 = function($elem) {
    return $elem.scrollLeft();
  };
  var scroll_left__2 = function($elem, x) {
    return $elem.scrollLeft(x);
  };
  scroll_left = function($elem, x) {
    switch(arguments.length) {
      case 1:
        return scroll_left__1.call(this, $elem);
      case 2:
        return scroll_left__2.call(this, $elem, x);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  scroll_left.cljs$core$IFn$_invoke$arity$1 = scroll_left__1;
  scroll_left.cljs$core$IFn$_invoke$arity$2 = scroll_left__2;
  return scroll_left;
}();
jayq.core.scroll_top = function() {
  var scroll_top = null;
  var scroll_top__1 = function($elem) {
    return $elem.scrollTop();
  };
  var scroll_top__2 = function($elem, x) {
    return $elem.scrollTop(x);
  };
  scroll_top = function($elem, x) {
    switch(arguments.length) {
      case 1:
        return scroll_top__1.call(this, $elem);
      case 2:
        return scroll_top__2.call(this, $elem, x);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  scroll_top.cljs$core$IFn$_invoke$arity$1 = scroll_top__1;
  scroll_top.cljs$core$IFn$_invoke$arity$2 = scroll_top__2;
  return scroll_top;
}();
jayq.core.$deferred = $.Deferred;
jayq.core.$when = $.when;
jayq.core.then = function() {
  var then = null;
  var then__3 = function(deferred, done_fn, fail_fn) {
    return deferred.then(cljs.core.clj__GT_js.call(null, done_fn), cljs.core.clj__GT_js.call(null, fail_fn));
  };
  var then__4 = function(deferred, done_fn, fail_fn, progress_fn) {
    return deferred.then(cljs.core.clj__GT_js.call(null, done_fn), cljs.core.clj__GT_js.call(null, fail_fn), cljs.core.clj__GT_js.call(null, progress_fn));
  };
  then = function(deferred, done_fn, fail_fn, progress_fn) {
    switch(arguments.length) {
      case 3:
        return then__3.call(this, deferred, done_fn, fail_fn);
      case 4:
        return then__4.call(this, deferred, done_fn, fail_fn, progress_fn);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  then.cljs$core$IFn$_invoke$arity$3 = then__3;
  then.cljs$core$IFn$_invoke$arity$4 = then__4;
  return then;
}();
jayq.core.done = function() {
  var done__delegate = function(deferred, fns_args) {
    return deferred.done.apply(deferred, cljs.core.clj__GT_js.call(null, fns_args));
  };
  var done = function(deferred, var_args) {
    var fns_args = null;
    if (arguments.length > 1) {
      fns_args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return done__delegate.call(this, deferred, fns_args);
  };
  done.cljs$lang$maxFixedArity = 1;
  done.cljs$lang$applyTo = function(arglist__45083) {
    var deferred = cljs.core.first(arglist__45083);
    var fns_args = cljs.core.rest(arglist__45083);
    return done__delegate(deferred, fns_args);
  };
  done.cljs$core$IFn$_invoke$arity$variadic = done__delegate;
  return done;
}();
jayq.core.fail = function() {
  var fail__delegate = function(deferred, fns_args) {
    return deferred.fail.apply(deferred, cljs.core.clj__GT_js.call(null, fns_args));
  };
  var fail = function(deferred, var_args) {
    var fns_args = null;
    if (arguments.length > 1) {
      fns_args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return fail__delegate.call(this, deferred, fns_args);
  };
  fail.cljs$lang$maxFixedArity = 1;
  fail.cljs$lang$applyTo = function(arglist__45084) {
    var deferred = cljs.core.first(arglist__45084);
    var fns_args = cljs.core.rest(arglist__45084);
    return fail__delegate(deferred, fns_args);
  };
  fail.cljs$core$IFn$_invoke$arity$variadic = fail__delegate;
  return fail;
}();
jayq.core.progress = function progress(deferred, fns_args) {
  return deferred.progress(cljs.core.clj__GT_js.call(null, fns_args));
};
jayq.core.promise = function() {
  var promise = null;
  var promise__1 = function(deferred) {
    return deferred.promise();
  };
  var promise__2 = function(deferred, type) {
    return deferred.promise(type);
  };
  var promise__3 = function(deferred, type, target) {
    return deferred.promise(type, target);
  };
  promise = function(deferred, type, target) {
    switch(arguments.length) {
      case 1:
        return promise__1.call(this, deferred);
      case 2:
        return promise__2.call(this, deferred, type);
      case 3:
        return promise__3.call(this, deferred, type, target);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  promise.cljs$core$IFn$_invoke$arity$1 = promise__1;
  promise.cljs$core$IFn$_invoke$arity$2 = promise__2;
  promise.cljs$core$IFn$_invoke$arity$3 = promise__3;
  return promise;
}();
jayq.core.always = function() {
  var always__delegate = function(deferred, fns_args) {
    return deferred.always.apply(deferred, cljs.core.clj__GT_js.call(null, fns_args));
  };
  var always = function(deferred, var_args) {
    var fns_args = null;
    if (arguments.length > 1) {
      fns_args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0);
    }
    return always__delegate.call(this, deferred, fns_args);
  };
  always.cljs$lang$maxFixedArity = 1;
  always.cljs$lang$applyTo = function(arglist__45085) {
    var deferred = cljs.core.first(arglist__45085);
    var fns_args = cljs.core.rest(arglist__45085);
    return always__delegate(deferred, fns_args);
  };
  always.cljs$core$IFn$_invoke$arity$variadic = always__delegate;
  return always;
}();
jayq.core.reject = function reject(deferred, args) {
  return deferred.reject(args);
};
jayq.core.reject_with = function reject_with(deferred, context, args) {
  return deferred.rejectWith(context, args);
};
jayq.core.notify = function notify(deferred, args) {
  return deferred.notify(args);
};
jayq.core.notify_with = function notify_with(deferred, context, args) {
  return deferred.notifyWith(context, args);
};
jayq.core.resolve = function resolve(deferred, args) {
  return deferred.resolve(args);
};
jayq.core.resolve_with = function resolve_with(deferred, context, args) {
  return deferred.resolveWith(context, args);
};
jayq.core.pipe = function() {
  var pipe = null;
  var pipe__2 = function(deferred, done_filter) {
    return deferred.pipe(done_filter);
  };
  var pipe__3 = function(deferred, done_filter, fail_filter) {
    return deferred.pipe(done_filter, fail_filter);
  };
  var pipe__4 = function(deferred, done_filter, fail_filter, progress_filter) {
    return deferred.pipe(done_filter, fail_filter, progress_filter);
  };
  pipe = function(deferred, done_filter, fail_filter, progress_filter) {
    switch(arguments.length) {
      case 2:
        return pipe__2.call(this, deferred, done_filter);
      case 3:
        return pipe__3.call(this, deferred, done_filter, fail_filter);
      case 4:
        return pipe__4.call(this, deferred, done_filter, fail_filter, progress_filter);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  pipe.cljs$core$IFn$_invoke$arity$2 = pipe__2;
  pipe.cljs$core$IFn$_invoke$arity$3 = pipe__3;
  pipe.cljs$core$IFn$_invoke$arity$4 = pipe__4;
  return pipe;
}();
jayq.core.state = function state(deferred) {
  return cljs.core.keyword.call(null, deferred.state());
};
jayq.core.deferred_m = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "return", "return", 4374474914), jayq.core.$when, new cljs.core.Keyword(null, "bind", "bind", 1016928175), function(x, f) {
  var dfd = jayq.core.$deferred.call(null);
  jayq.core.done.call(null, x, function(v) {
    return jayq.core.done.call(null, f.call(null, v), cljs.core.partial.call(null, jayq.core.resolve, dfd));
  });
  return jayq.core.promise.call(null, dfd);
}, new cljs.core.Keyword(null, "zero", "zero", 1017639450), cljs.core.identity], null);
jayq.core.ajax_m = new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null, "return", "return", 4374474914), cljs.core.identity, new cljs.core.Keyword(null, "bind", "bind", 1016928175), function(x, f) {
  return jayq.core.done.call(null, jayq.core.ajax.call(null, x), f);
}, new cljs.core.Keyword(null, "zero", "zero", 1017639450), cljs.core.identity], null);
goog.provide("tag_slideshow.core");
goog.require("cljs.core");
goog.require("purnam.cljs");
goog.require("jayq.core");
goog.require("jayq.core");
goog.require("purnam.cljs");
tag_slideshow.core.images = cljs.core.atom.call(null, cljs.core.PersistentVector.EMPTY);
tag_slideshow.core.log = function() {
  var log__delegate = function(messages) {
    return jayq.core.append.call(null, jayq.core.$.call(null, "#debug"), [cljs.core.str(messages), cljs.core.str("\x3cbr /\x3e")].join(""));
  };
  var log = function(var_args) {
    var messages = null;
    if (arguments.length > 0) {
      messages = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0);
    }
    return log__delegate.call(this, messages);
  };
  log.cljs$lang$maxFixedArity = 0;
  log.cljs$lang$applyTo = function(arglist__43820) {
    var messages = cljs.core.seq(arglist__43820);
    return log__delegate(messages);
  };
  log.cljs$core$IFn$_invoke$arity$variadic = log__delegate;
  return log;
}();
tag_slideshow.core.pop_image_BANG_ = function pop_image_BANG_() {
  var image = cljs.core.first.call(null, cljs.core.deref.call(null, tag_slideshow.core.images));
  cljs.core.swap_BANG_.call(null, tag_slideshow.core.images, cljs.core.rest);
  return image;
};
tag_slideshow.core.set_image_BANG_ = function set_image_BANG_(id, image) {
  jayq.core.attr.call(null, jayq.core.$.call(null, id), "src", cljs.core.get_in.call(null, image, new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null, "image", "image", 1114217677), "url"], null)));
  jayq.core.data.call(null, jayq.core.$.call(null, "#profile-pic"), "src", (new cljs.core.Keyword(null, "profile-pic", "profile-pic", 1190438616)).cljs$core$IFn$_invoke$arity$1(image));
  jayq.core.data.call(null, jayq.core.$.call(null, "#text"), "caption", (new cljs.core.Keyword(null, "caption", "caption", 1566477656)).cljs$core$IFn$_invoke$arity$1(image));
  return jayq.core.data.call(null, jayq.core.$.call(null, "#name"), "name", (new cljs.core.Keyword(null, "name", "name", 1017277949)).cljs$core$IFn$_invoke$arity$1(image));
};
tag_slideshow.core.init_images = function init_images() {
  var image = tag_slideshow.core.pop_image_BANG_.call(null);
  return tag_slideshow.core.set_image_BANG_.call(null, "#top", image);
};
tag_slideshow.core.load_data_BANG_ = function() {
  var load_data_BANG_ = null;
  var load_data_BANG___0 = function() {
    return load_data_BANG_.call(null, false);
  };
  var load_data_BANG___1 = function(init) {
    var G__43824 = (new cljs.core.Keyword(null, "bind", "bind", 1016928175)).cljs$core$IFn$_invoke$arity$1(jayq.core.ajax_m);
    var G__43825 = (new cljs.core.Keyword(null, "return", "return", 4374474914)).cljs$core$IFn$_invoke$arity$1(jayq.core.ajax_m);
    var G__43826 = (new cljs.core.Keyword(null, "zero", "zero", 1017639450)).cljs$core$IFn$_invoke$arity$1(jayq.core.ajax_m);
    return G__43824.call(null, new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null, "url", "url", 1014020321), "/data", new cljs.core.Keyword(null, "dataType", "dataType", 2802975094), new cljs.core.Keyword(null, "edn", "edn", 1014004513)], null), function(data) {
      return G__43825.call(null, function() {
        cljs.core.swap_BANG_.call(null, tag_slideshow.core.images, cljs.core.concat, data);
        if (cljs.core.truth_(init)) {
          tag_slideshow.core.init_images.call(null);
        } else {
        }
        return tag_slideshow.core.log.call(null, "image count: ", cljs.core.count.call(null, cljs.core.deref.call(null, tag_slideshow.core.images)));
      }());
    });
  };
  load_data_BANG_ = function(init) {
    switch(arguments.length) {
      case 0:
        return load_data_BANG___0.call(this);
      case 1:
        return load_data_BANG___1.call(this, init);
    }
    throw new Error("Invalid arity: " + arguments.length);
  };
  load_data_BANG_.cljs$core$IFn$_invoke$arity$0 = load_data_BANG___0;
  load_data_BANG_.cljs$core$IFn$_invoke$arity$1 = load_data_BANG___1;
  return load_data_BANG_;
}();
tag_slideshow.core.check_images_BANG_ = function check_images_BANG_() {
  if (cljs.core.count.call(null, cljs.core.deref.call(null, tag_slideshow.core.images)) < 5) {
    return tag_slideshow.core.load_data_BANG_.call(null);
  } else {
    return null;
  }
};
tag_slideshow.core.timeout_image_switch = function timeout_image_switch(id) {
  setTimeout(function() {
    return tag_slideshow.core.set_image_BANG_.call(null, id, tag_slideshow.core.pop_image_BANG_.call(null));
  }, 1E3 * 5);
  return tag_slideshow.core.check_images_BANG_.call(null);
};
tag_slideshow.core.switch_caption_BANG_ = function switch_caption_BANG_() {
  var profile_pic = jayq.core.$.call(null, "#profile-pic");
  var text = jayq.core.$.call(null, "#text");
  var name = jayq.core.$.call(null, "#name");
  jayq.core.attr.call(null, profile_pic, "src", jayq.core.data.call(null, profile_pic, "src"));
  jayq.core.html.call(null, text, jayq.core.data.call(null, text, "caption"));
  return jayq.core.html.call(null, name, jayq.core.data.call(null, name, "name"));
};
tag_slideshow.core.top_load_handler = function top_load_handler(e) {
  tag_slideshow.core.log.call(null, "top loaded!");
  jayq.core.remove_class.call(null, jayq.core.$.call(null, "#top"), "transparent");
  tag_slideshow.core.switch_caption_BANG_.call(null);
  return tag_slideshow.core.timeout_image_switch.call(null, "#bottom");
};
tag_slideshow.core.bottom_load_handler = function bottom_load_handler(e) {
  tag_slideshow.core.log.call(null, "bottom loaded!");
  jayq.core.add_class.call(null, jayq.core.$.call(null, "#top"), "transparent");
  tag_slideshow.core.switch_caption_BANG_.call(null);
  return tag_slideshow.core.timeout_image_switch.call(null, "#top");
};
tag_slideshow.core.init_handlers_BANG_ = function init_handlers_BANG_() {
  jayq.core.on.call(null, jayq.core.$.call(null, "#top"), "load", tag_slideshow.core.top_load_handler);
  return jayq.core.on.call(null, jayq.core.$.call(null, "#bottom"), "load", tag_slideshow.core.bottom_load_handler);
};
tag_slideshow.core.log.call(null, "Starting!");
try {
  tag_slideshow.core.init_handlers_BANG_.call(null);
  tag_slideshow.core.load_data_BANG_.call(null, true);
} catch (e43827) {
  if (e43827 instanceof Object) {
    var e_43828 = e43827;
    tag_slideshow.core.log.call(null, "Exception!");
    tag_slideshow.core.log.call(null, e_43828);
  } else {
    if (new cljs.core.Keyword(null, "else", "else", 1017020587)) {
      throw e43827;
    } else {
    }
  }
}
;
//# sourceMappingURL=main.js.map
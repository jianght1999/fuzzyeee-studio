var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/[[path]].ts
var tokens = /* @__PURE__ */ new Set();
function genToken() {
  const t = "pxl_" + crypto.randomUUID().slice(0, 16);
  tokens.add(t);
  return t;
}
__name(genToken, "genToken");
function checkToken(t) {
  return tokens.has(t);
}
__name(checkToken, "checkToken");
function delToken(t) {
  tokens.delete(t);
}
__name(delToken, "delToken");
async function sha256(s) {
  const d = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
async function hashPw(pw) {
  const s = crypto.randomUUID();
  return s + ":" + await sha256(s + pw);
}
__name(hashPw, "hashPw");
async function verifyPw(pw, hash) {
  const [s, e] = hash.split(":");
  return s && e && await sha256(s + pw) === e;
}
__name(verifyPw, "verifyPw");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
__name(json, "json");
function parsePath(p) {
  const c = p.replace(/\\/g, "/").replace(/^src\/content\//, "").replace(/\.html$/, "");
  const i = c.indexOf("/");
  return i === -1 ? { category: c, slug: c } : { category: c.slice(0, i), slug: c.slice(i + 1) };
}
__name(parsePath, "parsePath");
function extractTitle(c) {
  const m = c.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "Untitled";
}
__name(extractTitle, "extractTitle");
function getParentSlug(s) {
  const p = s.split("/");
  return p.length > 1 ? p.slice(0, -1).join("/") : null;
}
__name(getParentSlug, "getParentSlug");
var onRequest = /* @__PURE__ */ __name(async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname;
  const method = ctx.request.method;
  try {
    if (path === "/api/login" && method === "POST") {
      const { password } = await ctx.request.json();
      if (!password) return json({ error: "no password" }, 400);
      const row = await ctx.env.DB.prepare("SELECT value FROM settings WHERE key='password_hash'").first();
      if (!row) {
        const h = await hashPw(password);
        await ctx.env.DB.prepare("INSERT INTO settings (key,value) VALUES ('password_hash',?)").bind(h).run();
        return json({ success: true, token: genToken() });
      }
      if (await verifyPw(password, row.value)) return json({ success: true, token: genToken() });
      return json({ success: false, error: "wrong password" }, 401);
    }
    if (path === "/api/logout" && method === "POST") {
      const { token } = await ctx.request.json();
      delToken(token || "");
      return json({ success: true });
    }
    const pagesMatch = path.match(/^\/api\/pages\/([^/]+)$/);
    if (pagesMatch && method === "GET") {
      const cat = decodeURIComponent(pagesMatch[1]);
      const allRows = await ctx.env.DB.prepare("SELECT category FROM notes LIMIT 3").all();
      const { results } = await ctx.env.DB.prepare(
        "SELECT slug,title,parent_slug,sort_order FROM notes WHERE category=? ORDER BY sort_order"
      ).bind(cat).all();
      const hasKids = /* @__PURE__ */ new Set();
      for (const r of results) if (r.parent_slug) hasKids.add(r.parent_slug);
      return json({ cat, allCategories: allRows.results.map((r) => r.category), count: results.length, pages: results.map((r) => ({ slug: r.slug, title: r.title, parentSlug: r.parent_slug, sortOrder: r.sort_order, hasChildren: hasKids.has(r.slug) })) });
    }
    const pageMatch = path.match(/^\/api\/pages\/([^/]+)\/(.+)$/);
    if (pageMatch && method === "GET") {
      const cat = decodeURIComponent(pageMatch[1]);
      const slug = decodeURIComponent(pageMatch[2]);
      const row = await ctx.env.DB.prepare(
        "SELECT slug,title,content,parent_slug,updated_at FROM notes WHERE category=? AND slug=?"
      ).bind(cat, slug).first();
      if (!row) return json({ error: "not found" }, 404);
      const kv = await ctx.env.NOTES_CONTENT.get(`content/${cat}/${slug}`);
      return json({ slug: row.slug, title: row.title, content: kv || row.content, parentSlug: row.parent_slug, updatedAt: row.updated_at });
    }
    if (path === "/api/save" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      const { category, slug } = parsePath(body.path);
      const title = extractTitle(body.content);
      const now = Date.now();
      const TH = 90 * 1024;
      await ctx.env.DB.prepare(
        `INSERT OR REPLACE INTO notes (slug,category,title,content,parent_slug,sort_order,updated_at) VALUES (?,?,?,?,?,COALESCE((SELECT sort_order FROM notes WHERE slug=? AND category=?),0),?)`
      ).bind(slug, category, title, body.content.length > TH ? "" : body.content, getParentSlug(slug), slug, category, now).run();
      if (body.content.length > TH) await ctx.env.NOTES_CONTENT.put(`content/${category}/${slug}`, body.content);
      else await ctx.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(() => {
      });
      await ctx.env.DB.prepare("INSERT OR REPLACE INTO recent_files (path,title,category,time) VALUES (?,?,?,?)").bind(body.path, title, category, now).run();
      return json({ success: true });
    }
    if (path === "/api/create-page" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      const { category, slug } = parsePath(body.path);
      const html = body.content || `<h1>${slug.split("/").pop()}</h1>
<p></p>`;
      await ctx.env.DB.prepare("INSERT INTO notes (slug,category,title,content,parent_slug,sort_order,updated_at) VALUES (?,?,?,?,?,0,?)").bind(slug, category, extractTitle(html), html, getParentSlug(slug), Date.now()).run();
      return json({ success: true });
    }
    if (path === "/api/delete-page" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      const { category, slug } = parsePath(body.path);
      await ctx.env.NOTES_CONTENT.delete(`content/${category}/${slug}`).catch(() => {
      });
      await ctx.env.DB.prepare("DELETE FROM notes WHERE category=? AND slug LIKE ?").bind(category, slug + "/%").run();
      await ctx.env.DB.prepare("DELETE FROM notes WHERE category=? AND slug=?").bind(category, slug).run();
      await ctx.env.DB.prepare("DELETE FROM recent_files WHERE path=?").bind(body.path).run();
      return json({ success: true });
    }
    if (path === "/api/rename-page" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      const o = parsePath(body.oldPath), n = parsePath(body.newPath);
      const kids = await ctx.env.DB.prepare("SELECT slug FROM notes WHERE category=? AND parent_slug=?").bind(o.category, o.slug).all();
      for (const k of kids.results) {
        const ns = n.slug + "/" + k.slug.split("/").pop();
        await ctx.env.DB.prepare("UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?").bind(ns, n.category, n.slug, o.category, k.slug).run();
      }
      await ctx.env.DB.prepare("UPDATE notes SET slug=?,category=? WHERE category=? AND slug=?").bind(n.slug, n.category, o.category, o.slug).run();
      await ctx.env.DB.prepare("UPDATE recent_files SET path=? WHERE path=?").bind(body.newPath, body.oldPath).run();
      return json({ success: true });
    }
    if (path === "/api/move-page" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      const o = parsePath(body.oldPath), n = parsePath(body.newPath);
      await ctx.env.DB.prepare("UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?").bind(n.slug, n.category, getParentSlug(n.slug), o.category, o.slug).run();
      const kids = await ctx.env.DB.prepare("SELECT slug FROM notes WHERE category=? AND parent_slug=?").bind(o.category, o.slug).all();
      for (const k of kids.results) {
        const ns = n.slug + "/" + k.slug.split("/").pop();
        await ctx.env.DB.prepare("UPDATE notes SET slug=?,category=?,parent_slug=? WHERE category=? AND slug=?").bind(ns, n.category, n.slug, o.category, k.slug).run();
      }
      return json({ success: true });
    }
    if (path === "/api/recent" && method === "GET") {
      const { results } = await ctx.env.DB.prepare("SELECT path,title,category,time FROM recent_files ORDER BY time DESC LIMIT 50").all();
      return json(results);
    }
    if (path === "/api/recent-delete" && method === "POST") {
      const body = await ctx.request.json();
      if (!checkToken(body.token || "")) return json({ error: "not authenticated" }, 403);
      await ctx.env.DB.prepare("DELETE FROM recent_files WHERE path=?").bind(body.path).run();
      return json({ success: true });
    }
    if (path === "/api/music-list" && method === "GET") {
      return json(["/music/waltz-for-debby.mp3"]);
    }
    if (path === "/api/upload-image" && method === "POST") {
      const fd = await ctx.request.formData();
      if (!checkToken(fd.get("token") || "")) return json({ error: "not authenticated" }, 403);
      const file = fd.get("file");
      if (!file) return json({ error: "no file" }, 400);
      const ext = file.name.split(".").pop() || "png";
      const key = `img/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await ctx.env.NOTES_CONTENT.put(key, await file.arrayBuffer());
      return json({ success: true, url: `/api/img/${key}` });
    }
    const imgMatch = path.match(/^\/api\/img\/(.+)$/);
    if (imgMatch && method === "GET") {
      const key = "img/" + imgMatch[1];
      const data = await ctx.env.NOTES_CONTENT.get(key, "arrayBuffer");
      if (!data) return new Response("Not Found", { status: 404 });
      const ext = key.split(".").pop() || "png";
      const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };
      return new Response(data, { headers: { "Content-Type": mime[ext] || "image/png", "Cache-Control": "public, max-age=31536000" } });
    }
    return new Response("Not Found", { status: 404 });
  } catch (e) {
    return json({ error: e.message, stack: e.stack }, 500);
  }
}, "onRequest");

// ../.wrangler/tmp/pages-xzerB6/functionsRoutes-0.6985932519616904.mjs
var routes = [
  {
    routePath: "/api/:path*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// C:/Users/86187/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens2 = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens2.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens2.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens2.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens2.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens2.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens2.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens2.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens2.push({ type: "END", index: i, value: "" });
  return tokens2;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens2 = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens2.length && tokens2[i].type === type)
      return tokens2[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens2[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens2.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens2, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens2; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens2[tokens2.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/86187/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};

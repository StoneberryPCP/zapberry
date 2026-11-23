/* GERADO por scripts/build-relatorio.js a partir do Sistema Unificado. Não editar. */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../SISTEMA UNIFICADO/entrada-relatorio.ts
var entrada_relatorio_exports = {};
__export(entrada_relatorio_exports, {
  aplicarFiltros: () => aplicarFiltros,
  carregar360: () => carregar360,
  configurarSupabase: () => configurarSupabase,
  fmtHoras: () => fmtHoras,
  gerarInsights: () => gerarInsights,
  indicadores: () => indicadores,
  periodoAnterior: () => periodoAnterior
});
module.exports = __toCommonJS(entrada_relatorio_exports);

// ../SISTEMA UNIFICADO/node_modules/@supabase/postgrest-js/dist/index.mjs
var PostgrestError = class extends Error {
  /**
  * @example
  * ```ts
  * import PostgrestError from '@supabase/postgrest-js'
  *
  * throw new PostgrestError({
  *   message: 'Row level security prevented the request',
  *   details: 'RLS denied the insert',
  *   hint: 'Check your policies',
  *   code: 'PGRST301',
  * })
  * ```
  */
  constructor(context) {
    super(context.message);
    this.name = "PostgrestError";
    this.details = context.details;
    this.hint = context.hint;
    this.code = context.code;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      details: this.details,
      hint: this.hint,
      code: this.code
    };
  }
};
var DEFAULT_MAX_RETRIES = 3;
var getRetryDelay = (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4);
var RETRYABLE_STATUS_CODES = [520, 503];
var RETRYABLE_METHODS = [
  "GET",
  "HEAD",
  "OPTIONS"
];
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o$1) {
    return typeof o$1;
  } : function(o$1) {
    return o$1 && "function" == typeof Symbol && o$1.constructor === Symbol && o$1 !== Symbol.prototype ? "symbol" : typeof o$1;
  }, _typeof(o);
}
function toPrimitive(t, r) {
  if ("object" != _typeof(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != _typeof(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function toPropertyKey(t) {
  var i = toPrimitive(t, "string");
  return "symbol" == _typeof(i) ? i : i + "";
}
function _defineProperty(e, r, t) {
  return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: true,
    configurable: true,
    writable: true
  }) : e[r] = t, e;
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r$1) {
      return Object.getOwnPropertyDescriptor(e, r$1).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread2(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r$1) {
      _defineProperty(e, r$1, t[r$1]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r$1) {
      Object.defineProperty(e, r$1, Object.getOwnPropertyDescriptor(t, r$1));
    });
  }
  return e;
}
function sleep(ms, signal) {
  return new Promise((resolve2) => {
    if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
      resolve2();
      return;
    }
    const id = setTimeout(() => {
      signal === null || signal === void 0 || signal.removeEventListener("abort", onAbort);
      resolve2();
    }, ms);
    function onAbort() {
      clearTimeout(id);
      resolve2();
    }
    signal === null || signal === void 0 || signal.addEventListener("abort", onAbort);
  });
}
function shouldRetry(method, status, attemptCount, retryEnabled) {
  if (!retryEnabled || attemptCount >= DEFAULT_MAX_RETRIES) return false;
  if (!RETRYABLE_METHODS.includes(method)) return false;
  if (!RETRYABLE_STATUS_CODES.includes(status)) return false;
  return true;
}
async function fetchWithRetry(fetchImpl, url, request, retryEnabled) {
  let attemptCount = 0;
  while (true) {
    const headers = _objectSpread2({}, request.headers);
    if (attemptCount > 0) headers["X-Retry-Count"] = String(attemptCount);
    let res;
    try {
      res = await fetchImpl(url, {
        method: request.method,
        headers,
        body: request.body,
        signal: request.signal
      });
    } catch (fetchError) {
      if ((fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) === "AbortError" || (fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) === "ABORT_ERR") throw fetchError;
      if (!RETRYABLE_METHODS.includes(request.method)) throw fetchError;
      if (retryEnabled && attemptCount < DEFAULT_MAX_RETRIES) {
        const delay = getRetryDelay(attemptCount);
        attemptCount++;
        await sleep(delay, request.signal);
        continue;
      }
      throw fetchError;
    }
    if (shouldRetry(request.method, res.status, attemptCount, retryEnabled)) {
      var _res$headers$get, _res$headers;
      const retryAfterHeader = (_res$headers$get = (_res$headers = res.headers) === null || _res$headers === void 0 ? void 0 : _res$headers.get("Retry-After")) !== null && _res$headers$get !== void 0 ? _res$headers$get : null;
      const delay = retryAfterHeader !== null ? Math.max(0, parseInt(retryAfterHeader, 10) || 0) * 1e3 : getRetryDelay(attemptCount);
      await res.text();
      attemptCount++;
      await sleep(delay, request.signal);
      continue;
    }
    return res;
  }
}
var PostgrestBuilder = class {
  /**
  * Creates a builder configured for a specific PostgREST request.
  *
  * @example Using supabase-js (recommended)
  * ```ts
  * import { createClient } from '@supabase/supabase-js'
  *
  * const supabase = createClient('https://xyzcompany.supabase.co', 'your-publishable-key')
  * const { data, error } = await supabase.from('users').select('*')
  * ```
  *
  * @category Database
  *
  * @example Standalone import for bundle-sensitive environments
  * ```ts
  * import { PostgrestQueryBuilder } from '@supabase/postgrest-js'
  *
  * const builder = new PostgrestQueryBuilder(
  *   new URL('https://xyzcompany.supabase.co/rest/v1/users'),
  *   { headers: new Headers({ apikey: 'your-publishable-key' }) }
  * )
  * ```
  */
  constructor(builder) {
    var _builder$shouldThrowO, _builder$isMaybeSingl, _builder$shouldStripN, _builder$urlLengthLim, _builder$retry;
    this.shouldThrowOnError = false;
    this.retryEnabled = true;
    this.method = builder.method;
    this.url = builder.url;
    this.headers = new Headers(builder.headers);
    this.schema = builder.schema;
    this.body = builder.body;
    this.shouldThrowOnError = (_builder$shouldThrowO = builder.shouldThrowOnError) !== null && _builder$shouldThrowO !== void 0 ? _builder$shouldThrowO : false;
    this.signal = builder.signal;
    this.isMaybeSingle = (_builder$isMaybeSingl = builder.isMaybeSingle) !== null && _builder$isMaybeSingl !== void 0 ? _builder$isMaybeSingl : false;
    this.shouldStripNulls = (_builder$shouldStripN = builder.shouldStripNulls) !== null && _builder$shouldStripN !== void 0 ? _builder$shouldStripN : false;
    this.urlLengthLimit = (_builder$urlLengthLim = builder.urlLengthLimit) !== null && _builder$urlLengthLim !== void 0 ? _builder$urlLengthLim : 8e3;
    this.retryEnabled = (_builder$retry = builder.retry) !== null && _builder$retry !== void 0 ? _builder$retry : true;
    if (builder.fetch) this.fetch = builder.fetch;
    else this.fetch = fetch;
  }
  /**
  * If there's an error with the query, throwOnError will reject the promise by
  * throwing the error instead of returning it as part of a successful response.
  *
  * {@link https://github.com/supabase/supabase-js/issues/92}
  *
  * @category Database
  * @subcategory Using modifiers
  */
  throwOnError() {
    this.shouldThrowOnError = true;
    return this;
  }
  /**
  * Strip null values from the response data. Properties with `null` values
  * will be omitted from the returned JSON objects.
  *
  * Requires PostgREST 11.2.0+.
  *
  * {@link https://docs.postgrest.org/en/stable/references/api/resource_representation.html#stripped-nulls}
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .stripNulls()
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text, bio text);
  *
  * insert into
  *   characters (id, name, bio)
  * values
  *   (1, 'Luke', null),
  *   (2, 'Leia', 'Princess of Alderaan');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Luke"
  *     },
  *     {
  *       "id": 2,
  *       "name": "Leia",
  *       "bio": "Princess of Alderaan"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  stripNulls() {
    if (this.headers.get("Accept") === "text/csv") throw new Error("stripNulls() cannot be used with csv()");
    this.shouldStripNulls = true;
    return this;
  }
  /**
  * Set an HTTP header on this single PostgREST request, overriding any header
  * with the same name set on the client.
  *
  * This is an advanced escape hatch for one-off needs (passing a custom
  * `Authorization` for a single query, attaching a tracing header, etc.).
  * Most callers do not need it: configure client-wide headers via the
  * `headers` option when constructing the client, and authentication via
  * Supabase Auth.
  *
  * @param name - HTTP header name
  * @param value - HTTP header value
  *
  * @category Database
  * @subcategory Using modifiers
  */
  setHeader(name, value) {
    this.headers = new Headers(this.headers);
    this.headers.set(name, value);
    return this;
  }
  /**
  * @category Database
  * @subcategory Using modifiers
  *
  * Configure retry behavior for this request.
  *
  * By default, retries are enabled for idempotent requests (GET, HEAD, OPTIONS)
  * that fail with network errors or specific HTTP status codes (503, 520).
  * Retries use exponential backoff (1s, 2s, 4s) with a maximum of 3 attempts.
  *
  * @param enabled - Whether to enable retries for this request
  *
  * @example
  * ```ts
  * // Disable retries for a specific query
  * const { data, error } = await supabase
  *   .from('users')
  *   .select()
  *   .retry(false)
  * ```
  */
  retry(enabled) {
    this.retryEnabled = enabled;
    return this;
  }
  then(onfulfilled, onrejected) {
    var _this = this;
    if (this.schema === void 0) {
    } else if (["GET", "HEAD"].includes(this.method)) this.headers.set("Accept-Profile", this.schema);
    else this.headers.set("Content-Profile", this.schema);
    if (this.method !== "GET" && this.method !== "HEAD") this.headers.set("Content-Type", "application/json");
    if (this.shouldStripNulls) {
      const currentAccept = this.headers.get("Accept");
      if (currentAccept === "application/vnd.pgrst.object+json") this.headers.set("Accept", "application/vnd.pgrst.object+json;nulls=stripped");
      else if (!currentAccept || currentAccept === "application/json") this.headers.set("Accept", "application/vnd.pgrst.array+json;nulls=stripped");
    }
    const _fetch = this.fetch;
    const executeWithRetry = async () => {
      const headers = {};
      _this.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const res$1 = await fetchWithRetry(_fetch, _this.url.toString(), {
        method: _this.method,
        headers,
        body: JSON.stringify(_this.body, (_, value) => typeof value === "bigint" ? value.toString() : value),
        signal: _this.signal
      }, _this.retryEnabled);
      return await _this.processResponse(res$1);
    };
    let res = executeWithRetry();
    if (!this.shouldThrowOnError) res = res.catch((fetchError) => {
      var _fetchError$name2;
      let errorDetails = "";
      let hint = "";
      let code = "";
      const cause = fetchError === null || fetchError === void 0 ? void 0 : fetchError.cause;
      if (cause) {
        var _cause$message, _cause$code, _fetchError$name, _cause$name;
        const causeMessage = (_cause$message = cause === null || cause === void 0 ? void 0 : cause.message) !== null && _cause$message !== void 0 ? _cause$message : "";
        const causeCode = (_cause$code = cause === null || cause === void 0 ? void 0 : cause.code) !== null && _cause$code !== void 0 ? _cause$code : "";
        errorDetails = `${(_fetchError$name = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _fetchError$name !== void 0 ? _fetchError$name : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`;
        errorDetails += `

Caused by: ${(_cause$name = cause === null || cause === void 0 ? void 0 : cause.name) !== null && _cause$name !== void 0 ? _cause$name : "Error"}: ${causeMessage}`;
        if (causeCode) errorDetails += ` (${causeCode})`;
        if (cause === null || cause === void 0 ? void 0 : cause.stack) errorDetails += `
${cause.stack}`;
      } else {
        var _fetchError$stack;
        errorDetails = (_fetchError$stack = fetchError === null || fetchError === void 0 ? void 0 : fetchError.stack) !== null && _fetchError$stack !== void 0 ? _fetchError$stack : "";
      }
      const urlLength = this.url.toString().length;
      if ((fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) === "AbortError" || (fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) === "ABORT_ERR") {
        code = "";
        hint = "Request was aborted (timeout or manual cancellation)";
        if (urlLength > this.urlLengthLimit) hint += `. Note: Your request URL is ${urlLength} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`;
      } else if ((cause === null || cause === void 0 ? void 0 : cause.name) === "HeadersOverflowError" || (cause === null || cause === void 0 ? void 0 : cause.code) === "UND_ERR_HEADERS_OVERFLOW") {
        code = "";
        hint = "HTTP headers exceeded server limits (typically 16KB)";
        if (urlLength > this.urlLengthLimit) hint += `. Your request URL is ${urlLength} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`;
      }
      return {
        success: false,
        error: {
          message: `${(_fetchError$name2 = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _fetchError$name2 !== void 0 ? _fetchError$name2 : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`,
          details: errorDetails,
          hint,
          code
        },
        data: null,
        count: null,
        status: 0,
        statusText: ""
      };
    });
    return res.then(onfulfilled, onrejected);
  }
  /**
  * Process a fetch response and return the standardized postgrest response.
  */
  async processResponse(res) {
    var _this2 = this;
    let error = null;
    let data = null;
    let count = null;
    let status = res.status;
    let statusText = res.statusText;
    if (res.ok) {
      var _this$headers$get2, _res$headers$get;
      if (_this2.method !== "HEAD") {
        var _this$headers$get;
        const body = await res.text();
        if (body === "") {
        } else if (_this2.headers.get("Accept") === "text/csv") data = body;
        else if (_this2.headers.get("Accept") && ((_this$headers$get = _this2.headers.get("Accept")) === null || _this$headers$get === void 0 ? void 0 : _this$headers$get.includes("application/vnd.pgrst.plan+text"))) data = body;
        else try {
          data = JSON.parse(body);
        } catch (_unused) {
          error = { message: body };
          data = null;
          if (_this2.shouldThrowOnError) throw new PostgrestError({
            message: body,
            details: "",
            hint: "",
            code: ""
          });
        }
      }
      const countHeader = (_this$headers$get2 = _this2.headers.get("Prefer")) === null || _this$headers$get2 === void 0 ? void 0 : _this$headers$get2.match(/count=(exact|planned|estimated)/);
      const contentRange = (_res$headers$get = res.headers.get("content-range")) === null || _res$headers$get === void 0 ? void 0 : _res$headers$get.split("/");
      if (countHeader && contentRange && contentRange.length > 1) count = parseInt(contentRange[1]);
      if (_this2.isMaybeSingle && Array.isArray(data)) if (data.length > 1) {
        error = {
          code: "PGRST116",
          details: `Results contain ${data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned"
        };
        data = null;
        count = null;
        status = 406;
        statusText = "Not Acceptable";
        if (_this2.shouldThrowOnError) {
          var _error$hint;
          throw new PostgrestError(_objectSpread2(_objectSpread2({}, error), {}, { hint: (_error$hint = error.hint) !== null && _error$hint !== void 0 ? _error$hint : "" }));
        }
      } else if (data.length === 1) data = data[0];
      else data = null;
    } else {
      const body = await res.text();
      try {
        error = JSON.parse(body);
        if (Array.isArray(error) && res.status === 404) {
          data = [];
          error = null;
          status = 200;
          statusText = "OK";
        }
      } catch (_unused2) {
        if (res.status === 404 && body === "") {
          status = 204;
          statusText = "No Content";
        } else error = { message: body };
      }
      if (error && _this2.shouldThrowOnError) throw new PostgrestError(error);
    }
    return {
      success: error === null,
      error,
      data,
      count,
      status,
      statusText
    };
  }
  /**
  * Override the type of the returned `data`.
  *
  * @typeParam NewResult - The new result type to override with
  * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
  *
  * @category Database
  * @subcategory Using modifiers
  */
  returns() {
    return this;
  }
  /**
  * Override the type of the returned `data` field in the response.
  *
  * @typeParam NewResult - The new type to cast the response data to
  * @typeParam Options - Optional type configuration (defaults to { merge: true })
  * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
  * @example
  * ```typescript
  * // Merge with existing types (default behavior)
  * const query = supabase
  *   .from('users')
  *   .select()
  *   .overrideTypes<{ custom_field: string }>()
  *
  * // Replace existing types completely
  * const replaceQuery = supabase
  *   .from('users')
  *   .select()
  *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
  * ```
  * @returns A PostgrestBuilder instance with the new type
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example Complete Override type of successful response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .overrideTypes<Array<MyType>, { merge: false }>()
  * ```
  *
  * @exampleResponse Complete Override type of successful response
  * ```ts
  * let x: typeof data // MyType[]
  * ```
  *
  * @example Complete Override type of object response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .maybeSingle()
  *   .overrideTypes<MyType, { merge: false }>()
  * ```
  *
  * @exampleResponse Complete Override type of object response
  * ```ts
  * let x: typeof data // MyType | null
  * ```
  *
  * @example Partial Override type of successful response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .overrideTypes<Array<{ status: "A" | "B" }>>()
  * ```
  *
  * @exampleResponse Partial Override type of successful response
  * ```ts
  * let x: typeof data // Array<CountryRowProperties & { status: "A" | "B" }>
  * ```
  *
  * @example Partial Override type of object response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .maybeSingle()
  *   .overrideTypes<{ status: "A" | "B" }>()
  * ```
  *
  * @exampleResponse Partial Override type of object response
  * ```ts
  * let x: typeof data // CountryRowProperties & { status: "A" | "B" } | null
  * ```
  *
  * @example Merge vs replace existing types
  * ```typescript
  * // Merge with existing types (default behavior)
  * const query = supabase
  *   .from('users')
  *   .select()
  *   .overrideTypes<{ custom_field: string }>()
  *
  * // Replace existing types completely
  * const replaceQuery = supabase
  *   .from('users')
  *   .select()
  *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
  * ```
  */
  overrideTypes() {
    return this;
  }
};
var PostgrestTransformBuilder = class extends PostgrestBuilder {
  throwOnError() {
    return super.throwOnError();
  }
  /**
  * Perform a SELECT on the query result.
  *
  * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
  * return modified rows. By calling this method, modified rows are returned in
  * `data`.
  *
  * @param columns - The columns to retrieve, separated by commas
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `upsert()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .upsert({ id: 1, name: 'Han Solo' })
  *   .select()
  * ```
  *
  * @exampleSql With `upsert()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Han');
  * ```
  *
  * @exampleResponse With `upsert()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Han Solo"
  *     }
  *   ],
  *   "status": 201,
  *   "statusText": ""
  * }
  * ```
  */
  select(columns) {
    let quoted = false;
    const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
      if (/\s/.test(c) && !quoted) return "";
      if (c === '"') quoted = !quoted;
      return c;
    }).join("");
    this.url.searchParams.set("select", cleanedColumns);
    this.headers.append("Prefer", "return=representation");
    return this;
  }
  /**
  * Order the query result by `column`.
  *
  * You can call this method multiple times to order by multiple columns.
  *
  * You can order referenced tables, but it only affects the ordering of the
  * parent table if you use `!inner` in the query.
  *
  * @param column - The column to order by
  * @param options - Named parameters
  * @param options.ascending - If `true`, the result will be in ascending order
  * @param options.nullsFirst - If `true`, `null`s appear first. If `false`,
  * `null`s appear last.
  * @param options.referencedTable - Set this to order a referenced table by
  * its columns
  * @param options.foreignTable - Deprecated, use `options.referencedTable`
  * instead
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('id, name')
  *   .order('id', { ascending: false })
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 3,
  *       "name": "Han"
  *     },
  *     {
  *       "id": 2,
  *       "name": "Leia"
  *     },
  *     {
  *       "id": 1,
  *       "name": "Luke"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription On a referenced table
  * Ordering with `referencedTable` doesn't affect the ordering of the
  * parent table.
  *
  * @example On a referenced table
  * ```ts
  *   const { data, error } = await supabase
  *     .from('orchestral_sections')
  *     .select(`
  *       name,
  *       instruments (
  *         name
  *       )
  *     `)
  *     .order('name', { referencedTable: 'instruments', ascending: false })
  *
  * ```
  *
  * @exampleSql On a referenced table
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 1, 'harp'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse On a referenced table
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "strings",
  *       "instruments": [
  *         {
  *           "name": "violin"
  *         },
  *         {
  *           "name": "harp"
  *         }
  *       ]
  *     },
  *     {
  *       "name": "woodwinds",
  *       "instruments": []
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Order parent table by a referenced table
  * Ordering with `referenced_table(col)` affects the ordering of the
  * parent table.
  *
  * @example Order parent table by a referenced table
  * ```ts
  *   const { data, error } = await supabase
  *     .from('instruments')
  *     .select(`
  *       name,
  *       section:orchestral_sections (
  *         name
  *       )
  *     `)
  *     .order('section(name)', { ascending: true })
  *
  * ```
  *
  * @exampleSql Order parent table by a referenced table
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 2, 'flute'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse Order parent table by a referenced table
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "violin",
  *       "orchestral_sections": {"name": "strings"}
  *     },
  *     {
  *       "name": "flute",
  *       "orchestral_sections": {"name": "woodwinds"}
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  order(column, { ascending = true, nullsFirst, foreignTable, referencedTable = foreignTable } = {}) {
    const key = referencedTable ? `${referencedTable}.order` : "order";
    const existingOrder = this.url.searchParams.get(key);
    this.url.searchParams.set(key, `${existingOrder ? `${existingOrder},` : ""}${column}.${ascending ? "asc" : "desc"}${nullsFirst === void 0 ? "" : nullsFirst ? ".nullsfirst" : ".nullslast"}`);
    return this;
  }
  /**
  * Limit the query result by `rows`.
  *
  * @param rows - The maximum number of rows to return
  * @param options - Named parameters
  * @param options.referencedTable - Set this to limit rows of referenced
  * tables instead of the parent table
  * @param options.foreignTable - Deprecated, use `options.referencedTable`
  * instead
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  *   .limit(1)
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "Luke"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example On a referenced table
  * ```ts
  * const { data, error } = await supabase
  *   .from('orchestral_sections')
  *   .select(`
  *     name,
  *     instruments (
  *       name
  *     )
  *   `)
  *   .limit(1, { referencedTable: 'instruments' })
  * ```
  *
  * @exampleSql On a referenced table
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 1, 'harp'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse On a referenced table
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "strings",
  *       "instruments": [
  *         {
  *           "name": "violin"
  *         }
  *       ]
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  limit(rows, { foreignTable, referencedTable = foreignTable } = {}) {
    const key = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
    this.url.searchParams.set(key, `${rows}`);
    return this;
  }
  /**
  * Limit the query result by starting at an offset `from` and ending at the offset `to`.
  * Only records within this range are returned.
  * This respects the query order and if there is no order clause the range could behave unexpectedly.
  * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
  * and fourth rows of the query.
  *
  * @param from - The starting index from which to limit the result
  * @param to - The last index to which to limit the result
  * @param options - Named parameters
  * @param options.referencedTable - Set this to limit rows of referenced
  * tables instead of the parent table
  * @param options.foreignTable - Deprecated, use `options.referencedTable`
  * instead
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  *   .range(0, 1)
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "Luke"
  *     },
  *     {
  *       "name": "Leia"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  range(from, to, { foreignTable, referencedTable = foreignTable } = {}) {
    const keyOffset = typeof referencedTable === "undefined" ? "offset" : `${referencedTable}.offset`;
    const keyLimit = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
    this.url.searchParams.set(keyOffset, `${from}`);
    this.url.searchParams.set(keyLimit, `${to - from + 1}`);
    return this;
  }
  /**
  * Set the AbortSignal for the fetch request.
  *
  * @param signal - The AbortSignal to use for the fetch request
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @remarks
  * You can use this to set a timeout for the request.
  *
  * @exampleDescription Aborting requests in-flight
  * You can use an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to abort requests.
  * Note that `status` and `statusText` don't mean anything for aborted requests as the request wasn't fulfilled.
  *
  * @example Aborting requests in-flight
  * ```ts
  * const ac = new AbortController()
  *
  * const { data, error } = await supabase
  *   .from('very_big_table')
  *   .select()
  *   .abortSignal(ac.signal)
  *
  * // Abort the request after 100 ms
  * setTimeout(() => ac.abort(), 100)
  * ```
  *
  * @exampleResponse Aborting requests in-flight
  * ```json
  *   {
  *     "error": {
  *       "message": "AbortError: The user aborted a request.",
  *       "details": "",
  *       "hint": "The request was aborted locally via the provided AbortSignal.",
  *       "code": ""
  *     },
  *     "status": 0,
  *     "statusText": ""
  *   }
  *
  * ```
  *
  * @example Set a timeout
  * ```ts
  * const { data, error } = await supabase
  *   .from('very_big_table')
  *   .select()
  *   .abortSignal(AbortSignal.timeout(1000 /* ms *\/))
  * ```
  *
  * @exampleResponse Set a timeout
  * ```json
  *   {
  *     "error": {
  *       "message": "FetchError: The user aborted a request.",
  *       "details": "",
  *       "hint": "",
  *       "code": ""
  *     },
  *     "status": 0,
  *     "statusText": ""
  *   }
  *
  * ```
  */
  abortSignal(signal) {
    this.signal = signal;
    return this;
  }
  /**
  * Return `data` as a single object instead of an array of objects.
  *
  * Query result must be one row (e.g. using `.limit(1)`), otherwise this
  * returns an error.
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  *   .limit(1)
  *   .single()
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": {
  *     "name": "Luke"
  *   },
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  single() {
    this.headers.set("Accept", "application/vnd.pgrst.object+json");
    return this;
  }
  /**
  * Return `data` as a single object instead of an array of objects.
  *
  * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
  * this returns an error.
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .eq('name', 'Katniss')
  *   .maybeSingle()
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }
  /**
  * Return `data` as a string in CSV format.
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @exampleDescription Return data as CSV
  * By default, the data is returned in JSON format, but can also be returned as Comma Separated Values.
  *
  * @example Return data as CSV
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .csv()
  * ```
  *
  * @exampleSql Return data as CSV
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse Return data as CSV
  * ```json
  * {
  *   "data": "id,name\n1,Luke\n2,Leia\n3,Han",
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  csv() {
    this.headers.set("Accept", "text/csv");
    return this;
  }
  /**
  * Return `data` as an object in [GeoJSON](https://geojson.org) format.
  *
  * @category Database
  * @subcategory Using modifiers
  */
  geojson() {
    this.headers.set("Accept", "application/geo+json");
    return this;
  }
  /**
  * Return `data` as the EXPLAIN plan for the query.
  *
  * You need to enable the
  * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
  * setting before using this method.
  *
  * @param options - Named parameters
  *
  * @param options.analyze - If `true`, the query will be executed and the
  * actual run time will be returned
  *
  * @param options.verbose - If `true`, the query identifier will be returned
  * and `data` will include the output columns of the query
  *
  * @param options.settings - If `true`, include information on configuration
  * parameters that affect query planning
  *
  * @param options.buffers - If `true`, include information on buffer usage
  *
  * @param options.wal - If `true`, include information on WAL record generation
  *
  * @param options.format - The format of the output, can be `"text"` (default)
  * or `"json"`
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @exampleDescription Get the execution plan
  * By default, the data is returned in TEXT format, but can also be returned as JSON by using the `format` parameter.
  *
  * @example Get the execution plan
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .explain()
  * ```
  *
  * @exampleSql Get the execution plan
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse Get the execution plan
  * ```js
  * Aggregate  (cost=33.34..33.36 rows=1 width=112)
  *   ->  Limit  (cost=0.00..18.33 rows=1000 width=40)
  *         ->  Seq Scan on characters  (cost=0.00..22.00 rows=1200 width=40)
  * ```
  *
  * @exampleDescription Get the execution plan with analyze and verbose
  * By default, the data is returned in TEXT format, but can also be returned as JSON by using the `format` parameter.
  *
  * @example Get the execution plan with analyze and verbose
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .explain({analyze:true,verbose:true})
  * ```
  *
  * @exampleSql Get the execution plan with analyze and verbose
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse Get the execution plan with analyze and verbose
  * ```js
  * Aggregate  (cost=33.34..33.36 rows=1 width=112) (actual time=0.041..0.041 rows=1 loops=1)
  *   Output: NULL::bigint, count(ROW(characters.id, characters.name)), COALESCE(json_agg(ROW(characters.id, characters.name)), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text)
  *   ->  Limit  (cost=0.00..18.33 rows=1000 width=40) (actual time=0.005..0.006 rows=3 loops=1)
  *         Output: characters.id, characters.name
  *         ->  Seq Scan on public.characters  (cost=0.00..22.00 rows=1200 width=40) (actual time=0.004..0.005 rows=3 loops=1)
  *               Output: characters.id, characters.name
  * Query Identifier: -4730654291623321173
  * Planning Time: 0.407 ms
  * Execution Time: 0.119 ms
  * ```
  */
  explain({ analyze = false, verbose = false, settings = false, buffers = false, wal = false, format = "text" } = {}) {
    var _this$headers$get;
    const options = [
      analyze ? "analyze" : null,
      verbose ? "verbose" : null,
      settings ? "settings" : null,
      buffers ? "buffers" : null,
      wal ? "wal" : null
    ].filter(Boolean).join("|");
    const forMediatype = (_this$headers$get = this.headers.get("Accept")) !== null && _this$headers$get !== void 0 ? _this$headers$get : "application/json";
    this.headers.set("Accept", `application/vnd.pgrst.plan+${format}; for="${forMediatype}"; options=${options};`);
    if (format === "json") return this;
    else return this;
  }
  /**
  * Dry-run this request: execute the query but discard the changes.
  *
  * Server-side, PostgREST runs the query inside a transaction and rolls it back
  * instead of committing. The response still contains the data that *would* have
  * been returned — `RETURNING` clauses execute and RLS, triggers, and constraints
  * are all evaluated — but no row is actually inserted, updated, or deleted.
  *
  * This affects only the single request it is chained to. The JS caller has no
  * handle on the transaction: supabase-js does not group multiple queries into
  * one transaction. For multi-statement transactional logic, use a database
  * function (`supabase.rpc(...)`).
  *
  * Sets the `Prefer: tx=rollback` header. See PostgREST's docs on transaction
  * preferences for the underlying mechanism.
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @example Validate an insert without persisting
  * ```ts
  * const { data, error } = await supabase
  *   .from('countries')
  *   .insert({ name: 'France' })
  *   .select()
  *   .rollback()
  * // `data` shows what would have been inserted; nothing is saved.
  * ```
  */
  rollback() {
    this.headers.append("Prefer", "tx=rollback");
    return this;
  }
  /**
  * Override the type of the returned `data`.
  *
  * @typeParam NewResult - The new result type to override with
  * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
  *
  * @category Database
  * @subcategory Using modifiers
  *
  * @remarks
  * - Deprecated: use overrideTypes method instead
  *
  * @example Override type of successful response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .returns<Array<MyType>>()
  * ```
  *
  * @exampleResponse Override type of successful response
  * ```js
  * let x: typeof data // MyType[]
  * ```
  *
  * @example Override type of object response
  * ```ts
  * const { data } = await supabase
  *   .from('countries')
  *   .select()
  *   .maybeSingle()
  *   .returns<MyType>()
  * ```
  *
  * @exampleResponse Override type of object response
  * ```js
  * let x: typeof data // MyType | null
  * ```
  */
  returns() {
    return this;
  }
  /**
  * Set the maximum number of rows that can be affected by the query.
  * Only available in PostgREST v13+ and only works with PATCH and DELETE methods.
  *
  * @param rows - The maximum number of rows that can be affected
  *
  * @category Database
  * @subcategory Using modifiers
  */
  maxAffected(rows) {
    this.headers.append("Prefer", "handling=strict");
    this.headers.append("Prefer", `max-affected=${rows}`);
    return this;
  }
};
var PostgrestReservedCharsRegexp = /* @__PURE__ */ new RegExp("[,()]");
var PostgrestFilterBuilder = class extends PostgrestTransformBuilder {
  throwOnError() {
    return super.throwOnError();
  }
  /**
  * Match only rows where `column` is equal to `value`.
  *
  * To check if the value of `column` is NULL, you should use `.is()` instead.
  *
  * @param column - The column to filter on
  * @param value - The value to filter with
  *
  * @category Database
  * @subcategory Using filters
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .eq('name', 'Leia')
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 2,
  *       "name": "Leia"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  eq(column, value) {
    this.url.searchParams.append(column, `eq.${value}`);
    return this;
  }
  /**
  * Match only rows where `column` is not equal to `value`.
  *
  * This filter does not include rows where `column` is `NULL`. To match null
  * values, use `.is(column, null)` instead.
  *
  * @param column - The column to filter on
  * @param value - The value to filter with
  *
  * @category Database
  * @subcategory Using filters
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .neq('name', 'Leia')
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Luke"
  *     },
  *     {
  *       "id": 3,
  *       "name": "Han"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  neq(column, value) {
    this.url.searchParams.append(column, `neq.${value}`);
    return this;
  }
  gt(column, value) {
    this.url.searchParams.append(column, `gt.${value}`);
    return this;
  }
  gte(column, value) {
    this.url.searchParams.append(column, `gte.${value}`);
    return this;
  }
  lt(column, value) {
    this.url.searchParams.append(column, `lt.${value}`);
    return this;
  }
  lte(column, value) {
    this.url.searchParams.append(column, `lte.${value}`);
    return this;
  }
  like(column, pattern) {
    this.url.searchParams.append(column, `like.${pattern}`);
    return this;
  }
  likeAllOf(column, patterns) {
    this.url.searchParams.append(column, `like(all).{${patterns.join(",")}}`);
    return this;
  }
  likeAnyOf(column, patterns) {
    this.url.searchParams.append(column, `like(any).{${patterns.join(",")}}`);
    return this;
  }
  ilike(column, pattern) {
    this.url.searchParams.append(column, `ilike.${pattern}`);
    return this;
  }
  ilikeAllOf(column, patterns) {
    this.url.searchParams.append(column, `ilike(all).{${patterns.join(",")}}`);
    return this;
  }
  ilikeAnyOf(column, patterns) {
    this.url.searchParams.append(column, `ilike(any).{${patterns.join(",")}}`);
    return this;
  }
  regexMatch(column, pattern) {
    this.url.searchParams.append(column, `match.${pattern}`);
    return this;
  }
  regexIMatch(column, pattern) {
    this.url.searchParams.append(column, `imatch.${pattern}`);
    return this;
  }
  is(column, value) {
    this.url.searchParams.append(column, `is.${value}`);
    return this;
  }
  /**
  * Match only rows where `column` IS DISTINCT FROM `value`.
  *
  * Unlike `.neq()`, this treats `NULL` as a comparable value. Two `NULL` values
  * are considered equal (not distinct), and comparing `NULL` with any non-NULL
  * value returns true (distinct).
  *
  * @param column - The column to filter on
  * @param value - The value to filter with
  */
  isDistinct(column, value) {
    this.url.searchParams.append(column, `isdistinct.${value}`);
    return this;
  }
  /**
  * Match only rows where `column` is included in the `values` array.
  *
  * @param column - The column to filter on
  * @param values - The values array to filter with
  *
  * @category Database
  * @subcategory Using filters
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  *   .in('name', ['Leia', 'Han'])
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 2,
  *       "name": "Leia"
  *     },
  *     {
  *       "id": 3,
  *       "name": "Han"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  in(column, values) {
    const cleanedValues = Array.from(new Set(values)).map((s) => {
      if (typeof s === "string" && PostgrestReservedCharsRegexp.test(s)) return `"${s}"`;
      else return `${s}`;
    }).join(",");
    this.url.searchParams.append(column, `in.(${cleanedValues})`);
    return this;
  }
  /**
  * Match only rows where `column` is NOT included in the `values` array.
  *
  * @param column - The column to filter on
  * @param values - The values array to filter with
  */
  notIn(column, values) {
    const cleanedValues = Array.from(new Set(values)).map((s) => {
      if (typeof s === "string" && PostgrestReservedCharsRegexp.test(s)) return `"${s}"`;
      else return `${s}`;
    }).join(",");
    this.url.searchParams.append(column, `not.in.(${cleanedValues})`);
    return this;
  }
  contains(column, value) {
    if (typeof value === "string") this.url.searchParams.append(column, `cs.${value}`);
    else if (Array.isArray(value)) this.url.searchParams.append(column, `cs.{${value.join(",")}}`);
    else this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`);
    return this;
  }
  containedBy(column, value) {
    if (typeof value === "string") this.url.searchParams.append(column, `cd.${value}`);
    else if (Array.isArray(value)) this.url.searchParams.append(column, `cd.{${value.join(",")}}`);
    else this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`);
    return this;
  }
  rangeGt(column, range) {
    this.url.searchParams.append(column, `sr.${range}`);
    return this;
  }
  rangeGte(column, range) {
    this.url.searchParams.append(column, `nxl.${range}`);
    return this;
  }
  rangeLt(column, range) {
    this.url.searchParams.append(column, `sl.${range}`);
    return this;
  }
  rangeLte(column, range) {
    this.url.searchParams.append(column, `nxr.${range}`);
    return this;
  }
  rangeAdjacent(column, range) {
    this.url.searchParams.append(column, `adj.${range}`);
    return this;
  }
  overlaps(column, value) {
    if (typeof value === "string") this.url.searchParams.append(column, `ov.${value}`);
    else this.url.searchParams.append(column, `ov.{${value.join(",")}}`);
    return this;
  }
  textSearch(column, query, { config, type } = {}) {
    let typePart = "";
    if (type === "plain") typePart = "pl";
    else if (type === "phrase") typePart = "ph";
    else if (type === "websearch") typePart = "w";
    const configPart = config === void 0 ? "" : `(${config})`;
    this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`);
    return this;
  }
  match(query) {
    Object.entries(query).filter(([_, value]) => value !== void 0).forEach(([column, value]) => {
      this.url.searchParams.append(column, `eq.${value}`);
    });
    return this;
  }
  /**
  * Match only rows which doesn't satisfy the filter.
  *
  * Unlike most filters, `opearator` and `value` are used as-is and need to
  * follow [PostgREST
  * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
  * to make sure they are properly sanitized.
  *
  * @param column - The column to filter on
  * @param operator - The operator to be negated to filter with, following
  * PostgREST syntax
  * @param value - The value to filter with, following PostgREST syntax
  *
  * @category Database
  * @subcategory Using filters
  *
  * @remarks
  * not() expects you to use the raw PostgREST syntax for the filter values.
  *
  * ```ts
  * .not('id', 'in', '(5,6,7)')  // Use `()` for `in` filter
  * .not('arraycol', 'cs', '{"a","b"}')  // Use `cs` for `contains()`, `{}` for array values
  * ```
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('countries')
  *   .select()
  *   .not('name', 'is', null)
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  *
  * insert into
  *   countries (id, name)
  * values
  *   (1, 'null'),
  *   (2, null);
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  *   {
  *     "data": [
  *       {
  *         "id": 1,
  *         "name": "null"
  *       }
  *     ],
  *     "status": 200,
  *     "statusText": "OK"
  *   }
  *
  * ```
  */
  not(column, operator, value) {
    this.url.searchParams.append(column, `not.${operator}.${value}`);
    return this;
  }
  /**
  * Match only rows which satisfy at least one of the filters.
  *
  * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
  * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
  * to make sure it's properly sanitized.
  *
  * It's currently not possible to do an `.or()` filter across multiple tables.
  *
  * @param filters - The filters to use, following PostgREST syntax
  * @param options - Named parameters
  * @param options.referencedTable - Set this to filter on referenced tables
  * instead of the parent table
  * @param options.foreignTable - Deprecated, use `referencedTable` instead
  *
  * @category Database
  * @subcategory Using filters
  *
  * @remarks
  * or() expects you to use the raw PostgREST syntax for the filter names and values.
  *
  * ```ts
  * .or('id.in.(5,6,7), arraycol.cs.{"a","b"}')  // Use `()` for `in` filter, `{}` for array values and `cs` for `contains()`.
  * .or('id.in.(5,6,7), arraycol.cd.{"a","b"}')  // Use `cd` for `containedBy()`
  * ```
  *
  * @example With `select()`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  *   .or('id.eq.2,name.eq.Han')
  * ```
  *
  * @exampleSql With `select()`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse With `select()`
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "Leia"
  *     },
  *     {
  *       "name": "Han"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example Use `or` with `and`
  * ```ts
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  *   .or('id.gt.3,and(id.eq.1,name.eq.Luke)')
  * ```
  *
  * @exampleSql Use `or` with `and`
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse Use `or` with `and`
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "Luke"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example Use `or` on referenced tables
  * ```ts
  * const { data, error } = await supabase
  *   .from('orchestral_sections')
  *   .select(`
  *     name,
  *     instruments!inner (
  *       name
  *     )
  *   `)
  *   .or('section_id.eq.1,name.eq.guzheng', { referencedTable: 'instruments' })
  * ```
  *
  * @exampleSql Use `or` on referenced tables
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 2, 'flute'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse Use `or` on referenced tables
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "strings",
  *       "instruments": [
  *         {
  *           "name": "violin"
  *         }
  *       ]
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  or(filters, { foreignTable, referencedTable = foreignTable } = {}) {
    const key = referencedTable ? `${referencedTable}.or` : "or";
    this.url.searchParams.append(key, `(${filters})`);
    return this;
  }
  filter(column, operator, value) {
    this.url.searchParams.append(column, `${operator}.${value}`);
    return this;
  }
};
var PostgrestQueryBuilder = class {
  /**
  * Creates a query builder scoped to a Postgres table or view.
  *
  * @category Database
  *
  * @param url - The URL for the query
  * @param options - Named parameters
  * @param options.headers - Custom headers
  * @param options.schema - Postgres schema to use
  * @param options.fetch - Custom fetch implementation
  * @param options.urlLengthLimit - Maximum URL length before warning
  * @param options.retry - Enable automatic retries for transient errors (default: true)
  *
  * @example Using supabase-js (recommended)
  * ```ts
  * import { createClient } from '@supabase/supabase-js'
  *
  * const supabase = createClient('https://xyzcompany.supabase.co', 'your-publishable-key')
  * const { data, error } = await supabase.from('users').select('*')
  * ```
  *
  * @example Standalone import for bundle-sensitive environments
  * ```ts
  * import { PostgrestQueryBuilder } from '@supabase/postgrest-js'
  *
  * const query = new PostgrestQueryBuilder(
  *   new URL('https://xyzcompany.supabase.co/rest/v1/users'),
  *   { headers: { apikey: 'your-publishable-key' }, retry: true }
  * )
  * ```
  */
  constructor(url, { headers = {}, schema, fetch: fetch$1, urlLengthLimit = 8e3, retry }) {
    this.url = url;
    this.headers = new Headers(headers);
    this.schema = schema;
    this.fetch = fetch$1;
    this.urlLengthLimit = urlLengthLimit;
    this.retry = retry;
  }
  /**
  * Clone URL and headers to prevent shared state between operations.
  */
  cloneRequestState() {
    return {
      url: new URL(this.url.toString()),
      headers: new Headers(this.headers)
    };
  }
  /**
  * Perform a SELECT query on the table or view.
  *
  * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
  *
  * @param options - Named parameters
  *
  * @param options.head - When set to `true`, `data` will not be returned.
  * Useful if you only need the count.
  *
  * @param options.count - Count algorithm to use to count rows in the table or view.
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @remarks
  * When using `count` with `.range()` or `.limit()`, the returned `count` is the total number of rows
  * that match your filters, not the number of rows in the current page. Use this to build pagination UI.
  
  * - By default, Supabase projects return a maximum of 1,000 rows. This setting can be changed in your project's [API settings](/dashboard/project/_/settings/api). It's recommended that you keep it low to limit the payload size of accidental or malicious requests. You can use `range()` queries to paginate through your data.
  * - `select()` can be combined with [Filters](/docs/reference/javascript/using-filters)
  * - `select()` can be combined with [Modifiers](/docs/reference/javascript/using-modifiers)
  * - `apikey` is a reserved keyword if you're using the [Supabase Platform](/docs/guides/platform) and [should be avoided as a column name](https://github.com/supabase/supabase/issues/5465). *
  * @category Database
  *
  * @example Getting your data
  * ```js
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select()
  * ```
  *
  * @exampleSql Getting your data
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Harry'),
  *   (2, 'Frodo'),
  *   (3, 'Katniss');
  * ```
  *
  * @exampleResponse Getting your data
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Harry"
  *     },
  *     {
  *       "id": 2,
  *       "name": "Frodo"
  *     },
  *     {
  *       "id": 3,
  *       "name": "Katniss"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Handling errors
  * The most useful field on a Postgres error is usually `hint` — when the database knows the fix, it puts the literal SQL there. For example, a permission-denied error (`code: '42501'`) arrives with a `hint` like `"Grant the required privileges to the current role with: GRANT SELECT ON public.characters TO anon;"`. Log the full `error` object so the hint isn't hidden behind `error.message`.
  *
  * @example Handling errors
  * ```js
  * const { data, error } = await supabase.from('characters').select()
  * if (error) {
  *   // Logs the full error: message, code, details, and hint.
  *   console.error(error)
  *   return
  * }
  * ```
  *
  * @exampleResponse Handling errors
  * ```json
  * {
  *   "error": {
  *     "code": "42501",
  *     "details": null,
  *     "hint": "Grant the required privileges to the current role with: GRANT SELECT ON public.characters TO anon;",
  *     "message": "permission denied for table characters"
  *   },
  *   "status": 401,
  *   "statusText": ""
  * }
  * ```
  *
  * @example Selecting specific columns
  * ```js
  * const { data, error } = await supabase
  *   .from('characters')
  *   .select('name')
  * ```
  *
  * @exampleSql Selecting specific columns
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Frodo'),
  *   (2, 'Harry'),
  *   (3, 'Katniss');
  * ```
  *
  * @exampleResponse Selecting specific columns
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "Frodo"
  *     },
  *     {
  *       "name": "Harry"
  *     },
  *     {
  *       "name": "Katniss"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Query referenced tables
  * If your database has foreign key relationships, you can query related tables too.
  *
  * @example Query referenced tables
  * ```js
  * const { data, error } = await supabase
  *   .from('orchestral_sections')
  *   .select(`
  *     name,
  *     instruments (
  *       name
  *     )
  *   `)
  * ```
  *
  * @exampleSql Query referenced tables
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 2, 'flute'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse Query referenced tables
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "strings",
  *       "instruments": [
  *         {
  *           "name": "violin"
  *         }
  *       ]
  *     },
  *     {
  *       "name": "woodwinds",
  *       "instruments": [
  *         {
  *           "name": "flute"
  *         }
  *       ]
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Query referenced tables with spaces in their names
  * If your table name contains spaces, you must use double quotes in the `select` statement to reference the table.
  *
  * @example Query referenced tables with spaces in their names
  * ```js
  * const { data, error } = await supabase
  *   .from('orchestral sections')
  *   .select(`
  *     name,
  *     "musical instruments" (
  *       name
  *     )
  *   `)
  * ```
  *
  * @exampleSql Query referenced tables with spaces in their names
  * ```sql
  * create table
  *   "orchestral sections" (id int8 primary key, name text);
  * create table
  *   "musical instruments" (
  *     id int8 primary key,
  *     section_id int8 not null references "orchestral sections",
  *     name text
  *   );
  *
  * insert into
  *   "orchestral sections" (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   "musical instruments" (id, section_id, name)
  * values
  *   (1, 2, 'flute'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse Query referenced tables with spaces in their names
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "strings",
  *       "musical instruments": [
  *         {
  *           "name": "violin"
  *         }
  *       ]
  *     },
  *     {
  *       "name": "woodwinds",
  *       "musical instruments": [
  *         {
  *           "name": "flute"
  *         }
  *       ]
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Query referenced tables through a join table
  * If you're in a situation where your tables are **NOT** directly
  * related, but instead are joined by a _join table_, you can still use
  * the `select()` method to query the related data. The join table needs
  * to have the foreign keys as part of its composite primary key.
  *
  * @example Query referenced tables through a join table
  * ```ts
  * const { data, error } = await supabase
  *   .from('users')
  *   .select(`
  *     name,
  *     teams (
  *       name
  *     )
  *   `)
  *   
  * ```
  *
  * @exampleSql Query referenced tables through a join table
  * ```sql
  * create table
  *   users (
  *     id int8 primary key,
  *     name text
  *   );
  * create table
  *   teams (
  *     id int8 primary key,
  *     name text
  *   );
  * -- join table
  * create table
  *   users_teams (
  *     user_id int8 not null references users,
  *     team_id int8 not null references teams,
  *     -- both foreign keys must be part of a composite primary key
  *     primary key (user_id, team_id)
  *   );
  *
  * insert into
  *   users (id, name)
  * values
  *   (1, 'Kiran'),
  *   (2, 'Evan');
  * insert into
  *   teams (id, name)
  * values
  *   (1, 'Green'),
  *   (2, 'Blue');
  * insert into
  *   users_teams (user_id, team_id)
  * values
  *   (1, 1),
  *   (1, 2),
  *   (2, 2);
  * ```
  *
  * @exampleResponse Query referenced tables through a join table
  * ```json
  *   {
  *     "data": [
  *       {
  *         "name": "Kiran",
  *         "teams": [
  *           {
  *             "name": "Green"
  *           },
  *           {
  *             "name": "Blue"
  *           }
  *         ]
  *       },
  *       {
  *         "name": "Evan",
  *         "teams": [
  *           {
  *             "name": "Blue"
  *           }
  *         ]
  *       }
  *     ],
  *     "status": 200,
  *     "statusText": "OK"
  *   }
  *   
  * ```
  *
  * @exampleDescription Query the same referenced table multiple times
  * If you need to query the same referenced table twice, use the name of the
  * joined column to identify which join to use. You can also give each
  * column an alias.
  *
  * @example Query the same referenced table multiple times
  * ```ts
  * const { data, error } = await supabase
  *   .from('messages')
  *   .select(`
  *     content,
  *     from:sender_id(name),
  *     to:receiver_id(name)
  *   `)
  *
  * // To infer types, use the name of the table (in this case `users`) and
  * // the name of the foreign key constraint.
  * const { data, error } = await supabase
  *   .from('messages')
  *   .select(`
  *     content,
  *     from:users!messages_sender_id_fkey(name),
  *     to:users!messages_receiver_id_fkey(name)
  *   `)
  * ```
  *
  * @exampleSql Query the same referenced table multiple times
  * ```sql
  *  create table
  *  users (id int8 primary key, name text);
  *
  *  create table
  *    messages (
  *      sender_id int8 not null references users,
  *      receiver_id int8 not null references users,
  *      content text
  *    );
  *
  *  insert into
  *    users (id, name)
  *  values
  *    (1, 'Kiran'),
  *    (2, 'Evan');
  *
  *  insert into
  *    messages (sender_id, receiver_id, content)
  *  values
  *    (1, 2, '👋');
  *  ```
  * ```
  *
  * @exampleResponse Query the same referenced table multiple times
  * ```json
  * {
  *   "data": [
  *     {
  *       "content": "👋",
  *       "from": {
  *         "name": "Kiran"
  *       },
  *       "to": {
  *         "name": "Evan"
  *       }
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Query nested foreign tables through a join table
  * You can use the result of a joined table to gather data in
  * another foreign table. With multiple references to the same foreign
  * table you must specify the column on which to conduct the join.
  *
  * @example Query nested foreign tables through a join table
  * ```ts
  *   const { data, error } = await supabase
  *     .from('games')
  *     .select(`
  *       game_id:id,
  *       away_team:teams!games_away_team_fkey (
  *         users (
  *           id,
  *           name
  *         )
  *       )
  *     `)
  *   
  * ```
  *
  * @exampleSql Query nested foreign tables through a join table
  * ```sql
  * ```sql
  * create table
  *   users (
  *     id int8 primary key,
  *     name text
  *   );
  * create table
  *   teams (
  *     id int8 primary key,
  *     name text
  *   );
  * -- join table
  * create table
  *   users_teams (
  *     user_id int8 not null references users,
  *     team_id int8 not null references teams,
  *
  *     primary key (user_id, team_id)
  *   );
  * create table
  *   games (
  *     id int8 primary key,
  *     home_team int8 not null references teams,
  *     away_team int8 not null references teams,
  *     name text
  *   );
  *
  * insert into users (id, name)
  * values
  *   (1, 'Kiran'),
  *   (2, 'Evan');
  * insert into
  *   teams (id, name)
  * values
  *   (1, 'Green'),
  *   (2, 'Blue');
  * insert into
  *   users_teams (user_id, team_id)
  * values
  *   (1, 1),
  *   (1, 2),
  *   (2, 2);
  * insert into
  *   games (id, home_team, away_team, name)
  * values
  *   (1, 1, 2, 'Green vs Blue'),
  *   (2, 2, 1, 'Blue vs Green');
  * ```
  *
  * @exampleResponse Query nested foreign tables through a join table
  * ```json
  *   {
  *     "data": [
  *       {
  *         "game_id": 1,
  *         "away_team": {
  *           "users": [
  *             {
  *               "id": 1,
  *               "name": "Kiran"
  *             },
  *             {
  *               "id": 2,
  *               "name": "Evan"
  *             }
  *           ]
  *         }
  *       },
  *       {
  *         "game_id": 2,
  *         "away_team": {
  *           "users": [
  *             {
  *               "id": 1,
  *               "name": "Kiran"
  *             }
  *           ]
  *         }
  *       }
  *     ],
  *     "status": 200,
  *     "statusText": "OK"
  *   }
  *   
  * ```
  *
  * @exampleDescription Filtering through referenced tables
  * If the filter on a referenced table's column is not satisfied, the referenced
  * table returns `[]` or `null` but the parent table is not filtered out.
  * If you want to filter out the parent table rows, use the `!inner` hint
  *
  * @example Filtering through referenced tables
  * ```ts
  * const { data, error } = await supabase
  *   .from('instruments')
  *   .select('name, orchestral_sections(*)')
  *   .eq('orchestral_sections.name', 'percussion')
  * ```
  *
  * @exampleSql Filtering through referenced tables
  * ```sql
  * create table
  *   orchestral_sections (id int8 primary key, name text);
  * create table
  *   instruments (
  *     id int8 primary key,
  *     section_id int8 not null references orchestral_sections,
  *     name text
  *   );
  *
  * insert into
  *   orchestral_sections (id, name)
  * values
  *   (1, 'strings'),
  *   (2, 'woodwinds');
  * insert into
  *   instruments (id, section_id, name)
  * values
  *   (1, 2, 'flute'),
  *   (2, 1, 'violin');
  * ```
  *
  * @exampleResponse Filtering through referenced tables
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "flute",
  *       "orchestral_sections": null
  *     },
  *     {
  *       "name": "violin",
  *       "orchestral_sections": null
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Querying referenced table with count
  * You can get the number of rows in a related table by using the
  * **count** property.
  *
  * @example Querying referenced table with count
  * ```ts
  * const { data, error } = await supabase
  *   .from('orchestral_sections')
  *   .select(`*, instruments(count)`)
  * ```
  *
  * @exampleSql Querying referenced table with count
  * ```sql
  * create table orchestral_sections (
  *   "id" "uuid" primary key default "extensions"."uuid_generate_v4"() not null,
  *   "name" text
  * );
  *
  * create table characters (
  *   "id" "uuid" primary key default "extensions"."uuid_generate_v4"() not null,
  *   "name" text,
  *   "section_id" "uuid" references public.orchestral_sections on delete cascade
  * );
  *
  * with section as (
  *   insert into orchestral_sections (name)
  *   values ('strings') returning id
  * )
  * insert into instruments (name, section_id) values
  * ('violin', (select id from section)),
  * ('viola', (select id from section)),
  * ('cello', (select id from section)),
  * ('double bass', (select id from section));
  * ```
  *
  * @exampleResponse Querying referenced table with count
  * ```json
  * [
  *   {
  *     "id": "693694e7-d993-4360-a6d7-6294e325d9b6",
  *     "name": "strings",
  *     "instruments": [
  *       {
  *         "count": 4
  *       }
  *     ]
  *   }
  * ]
  * ```
  *
  * @exampleDescription Querying with count option
  * You can get the number of rows by using the
  * [count](/docs/reference/javascript/select#parameters) option.
  *
  * @example Querying with count option
  * ```ts
  * const { count, error } = await supabase
  *   .from('characters')
  *   .select('*', { count: 'exact', head: true })
  * ```
  *
  * @exampleSql Querying with count option
  * ```sql
  * create table
  *   characters (id int8 primary key, name text);
  *
  * insert into
  *   characters (id, name)
  * values
  *   (1, 'Luke'),
  *   (2, 'Leia'),
  *   (3, 'Han');
  * ```
  *
  * @exampleResponse Querying with count option
  * ```json
  * {
  *   "count": 3,
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Querying JSON data
  * You can select and filter data inside of
  * [JSON](/docs/guides/database/json) columns. Postgres offers some
  * [operators](/docs/guides/database/json#query-the-jsonb-data) for
  * querying JSON data.
  *
  * @example Querying JSON data
  * ```ts
  * const { data, error } = await supabase
  *   .from('users')
  *   .select(`
  *     id, name,
  *     address->city
  *   `)
  * ```
  *
  * @exampleSql Querying JSON data
  * ```sql
  * create table
  *   users (
  *     id int8 primary key,
  *     name text,
  *     address jsonb
  *   );
  *
  * insert into
  *   users (id, name, address)
  * values
  *   (1, 'Frodo', '{"city":"Hobbiton"}');
  * ```
  *
  * @exampleResponse Querying JSON data
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Frodo",
  *       "city": "Hobbiton"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Querying referenced table with inner join
  * If you don't want to return the referenced table contents, you can leave the parenthesis empty.
  * Like `.select('name, orchestral_sections!inner()')`.
  *
  * @example Querying referenced table with inner join
  * ```ts
  * const { data, error } = await supabase
  *   .from('instruments')
  *   .select('name, orchestral_sections!inner(name)')
  *   .eq('orchestral_sections.name', 'woodwinds')
  *   .limit(1)
  * ```
  *
  * @exampleSql Querying referenced table with inner join
  * ```sql
  * create table orchestral_sections (
  *   "id" "uuid" primary key default "extensions"."uuid_generate_v4"() not null,
  *   "name" text
  * );
  *
  * create table instruments (
  *   "id" "uuid" primary key default "extensions"."uuid_generate_v4"() not null,
  *   "name" text,
  *   "section_id" "uuid" references public.orchestral_sections on delete cascade
  * );
  *
  * with section as (
  *   insert into orchestral_sections (name)
  *   values ('woodwinds') returning id
  * )
  * insert into instruments (name, section_id) values
  * ('flute', (select id from section)),
  * ('clarinet', (select id from section)),
  * ('bassoon', (select id from section)),
  * ('piccolo', (select id from section));
  * ```
  *
  * @exampleResponse Querying referenced table with inner join
  * ```json
  * {
  *   "data": [
  *     {
  *       "name": "flute",
  *       "orchestral_sections": {"name": "woodwinds"}
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Switching schemas per query
  * In addition to setting the schema during initialization, you can also switch schemas on a per-query basis.
  * Make sure you've set up your [database privileges and API settings](/docs/guides/api/using-custom-schemas).
  *
  * @example Switching schemas per query
  * ```ts
  * const { data, error } = await supabase
  *   .schema('myschema')
  *   .from('mytable')
  *   .select()
  * ```
  *
  * @exampleSql Switching schemas per query
  * ```sql
  * create schema myschema;
  *
  * create table myschema.mytable (
  *   id uuid primary key default gen_random_uuid(),
  *   data text
  * );
  *
  * insert into myschema.mytable (data) values ('mydata');
  * ```
  *
  * @exampleResponse Switching schemas per query
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": "4162e008-27b0-4c0f-82dc-ccaeee9a624d",
  *       "data": "mydata"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  select(columns, options) {
    const { head = false, count } = options !== null && options !== void 0 ? options : {};
    const method = head ? "HEAD" : "GET";
    let quoted = false;
    const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
      if (/\s/.test(c) && !quoted) return "";
      if (c === '"') quoted = !quoted;
      return c;
    }).join("");
    const { url, headers } = this.cloneRequestState();
    url.searchParams.set("select", cleanedColumns);
    if (count) headers.append("Prefer", `count=${count}`);
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schema,
      fetch: this.fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Perform an INSERT into the table or view.
  *
  * By default, inserted rows are not returned. To return it, chain the call
  * with `.select()`.
  *
  * @param values - The values to insert. Pass an object to insert a single row
  * or an array to insert multiple rows.
  *
  * @param options - Named parameters
  *
  * @param options.count - Count algorithm to use to count inserted rows.
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @param options.defaultToNull - Make missing fields default to `null`.
  * Otherwise, use the default value for the column. Only applies for bulk
  * inserts.
  *
  * @category Database
  *
  * @example Create a record
  * ```ts
  * const { error } = await supabase
  *   .from('countries')
  *   .insert({ id: 1, name: 'Mordor' })
  * ```
  *
  * @exampleSql Create a record
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  * ```
  *
  * @exampleResponse Create a record
  * ```json
  * {
  *   "status": 201,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Handling errors
  * `error.hint` from Postgres often contains the actionable fix (e.g. `"Grant the required privileges to the current role with: GRANT INSERT ON public.countries TO anon;"` for a `42501` permission-denied error). Log the full `error` object so it isn't hidden behind `error.message`.
  *
  * @example Handling errors
  * ```js
  * const { error } = await supabase.from('countries').insert({ id: 1, name: 'Mordor' })
  * if (error) console.error(error)
  * ```
  *
  * @example Create a record and return it
  * ```ts
  * const { data, error } = await supabase
  *   .from('countries')
  *   .insert({ id: 1, name: 'Mordor' })
  *   .select()
  * ```
  *
  * @exampleSql Create a record and return it
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  * ```
  *
  * @exampleResponse Create a record and return it
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Mordor"
  *     }
  *   ],
  *   "status": 201,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Bulk create
  * A bulk create operation is handled in a single transaction.
  * If any of the inserts fail, none of the rows are inserted.
  *
  * @example Bulk create
  * ```ts
  * const { error } = await supabase
  *   .from('countries')
  *   .insert([
  *     { id: 1, name: 'Mordor' },
  *     { id: 1, name: 'The Shire' },
  *   ])
  * ```
  *
  * @exampleSql Bulk create
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  * ```
  *
  * @exampleResponse Bulk create
  * ```json
  * {
  *   "error": {
  *     "code": "23505",
  *     "details": "Key (id)=(1) already exists.",
  *     "hint": null,
  *     "message": "duplicate key value violates unique constraint \"countries_pkey\""
  *   },
  *   "status": 409,
  *   "statusText": ""
  * }
  * ```
  */
  insert(values, { count, defaultToNull = true } = {}) {
    var _this$fetch;
    const method = "POST";
    const { url, headers } = this.cloneRequestState();
    if (count) headers.append("Prefer", `count=${count}`);
    if (!defaultToNull) headers.append("Prefer", `missing=default`);
    if (Array.isArray(values)) {
      const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
      if (columns.length > 0) {
        const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
        url.searchParams.set("columns", uniqueColumns.join(","));
      }
    }
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schema,
      body: values,
      fetch: (_this$fetch = this.fetch) !== null && _this$fetch !== void 0 ? _this$fetch : fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Perform an UPSERT on the table or view. Depending on the column(s) passed
  * to `onConflict`, `.upsert()` allows you to perform the equivalent of
  * `.insert()` if a row with the corresponding `onConflict` columns doesn't
  * exist, or if it does exist, perform an alternative action depending on
  * `ignoreDuplicates`.
  *
  * By default, upserted rows are not returned. To return it, chain the call
  * with `.select()`.
  *
  * @param values - The values to upsert with. Pass an object to upsert a
  * single row or an array to upsert multiple rows.
  *
  * @param options - Named parameters
  *
  * @param options.onConflict - Comma-separated UNIQUE column(s) to specify how
  * duplicate rows are determined. Two rows are duplicates if all the
  * `onConflict` columns are equal.
  *
  * @param options.ignoreDuplicates - If `true`, duplicate rows are ignored. If
  * `false`, duplicate rows are merged with existing rows.
  *
  * @param options.count - Count algorithm to use to count upserted rows.
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @param options.defaultToNull - Make missing fields default to `null`.
  * Otherwise, use the default value for the column. This only applies when
  * inserting new rows, not when merging with existing rows under
  * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
  *
  * @example Upsert a single row using a unique key
  * ```ts
  * // Upserting a single row, overwriting based on the 'username' unique column
  * const { data, error } = await supabase
  *   .from('users')
  *   .upsert({ username: 'supabot' }, { onConflict: 'username' })
  *
  * // Example response:
  * // {
  * //   data: [
  * //     { id: 4, message: 'bar', username: 'supabot' }
  * //   ],
  * //   error: null
  * // }
  * ```
  *
  * @example Upsert with conflict resolution and exact row counting
  * ```ts
  * // Upserting and returning exact count
  * const { data, error, count } = await supabase
  *   .from('users')
  *   .upsert(
  *     {
  *       id: 3,
  *       message: 'foo',
  *       username: 'supabot'
  *     },
  *     {
  *       onConflict: 'username',
  *       count: 'exact'
  *     }
  *   )
  *
  * // Example response:
  * // {
  * //   data: [
  * //     {
  * //       id: 42,
  * //       handle: "saoirse",
  * //       display_name: "Saoirse"
  * //     }
  * //   ],
  * //   count: 1,
  * //   error: null
  * // }
  * ```
  *
  * @category Database
  *
  * @remarks
  * - Primary keys must be included in `values` to use upsert.
  *
  * @example Upsert your data
  * ```ts
  * const { data, error } = await supabase
  *   .from('instruments')
  *   .upsert({ id: 1, name: 'piano' })
  *   .select()
  * ```
  *
  * @exampleSql Upsert your data
  * ```sql
  * create table
  *   instruments (id int8 primary key, name text);
  *
  * insert into
  *   instruments (id, name)
  * values
  *   (1, 'harpsichord');
  * ```
  *
  * @exampleResponse Upsert your data
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "piano"
  *     }
  *   ],
  *   "status": 201,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Handling errors
  * `error.hint` from Postgres often contains the actionable fix (e.g. `"Grant the required privileges to the current role with: GRANT INSERT, UPDATE ON public.instruments TO anon;"` for a `42501` permission-denied error). Log the full `error` object so it isn't hidden behind `error.message`.
  *
  * @example Handling errors
  * ```js
  * const { data, error } = await supabase.from('instruments').upsert({ id: 1, name: 'piano' }).select()
  * if (error) console.error(error)
  * ```
  *
  * @example Bulk Upsert your data
  * ```ts
  * const { data, error } = await supabase
  *   .from('instruments')
  *   .upsert([
  *     { id: 1, name: 'piano' },
  *     { id: 2, name: 'harp' },
  *   ])
  *   .select()
  * ```
  *
  * @exampleSql Bulk Upsert your data
  * ```sql
  * create table
  *   instruments (id int8 primary key, name text);
  *
  * insert into
  *   instruments (id, name)
  * values
  *   (1, 'harpsichord');
  * ```
  *
  * @exampleResponse Bulk Upsert your data
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "piano"
  *     },
  *     {
  *       "id": 2,
  *       "name": "harp"
  *     }
  *   ],
  *   "status": 201,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Upserting into tables with constraints
  * In the following query, `upsert()` implicitly uses the `id`
  * (primary key) column to determine conflicts. If there is no existing
  * row with the same `id`, `upsert()` inserts a new row, which
  * will fail in this case as there is already a row with `handle` `"saoirse"`.
  * Using the `onConflict` option, you can instruct `upsert()` to use
  * another column with a unique constraint to determine conflicts.
  *
  * @example Upserting into tables with constraints
  * ```ts
  * const { data, error } = await supabase
  *   .from('users')
  *   .upsert({ id: 42, handle: 'saoirse', display_name: 'Saoirse' })
  *   .select()
  * ```
  *
  * @exampleSql Upserting into tables with constraints
  * ```sql
  * create table
  *   users (
  *     id int8 generated by default as identity primary key,
  *     handle text not null unique,
  *     display_name text
  *   );
  *
  * insert into
  *   users (id, handle, display_name)
  * values
  *   (1, 'saoirse', null);
  * ```
  *
  * @exampleResponse Upserting into tables with constraints
  * ```json
  * {
  *   "error": {
  *     "code": "23505",
  *     "details": "Key (handle)=(saoirse) already exists.",
  *     "hint": null,
  *     "message": "duplicate key value violates unique constraint \"users_handle_key\""
  *   },
  *   "status": 409,
  *   "statusText": ""
  * }
  * ```
  */
  upsert(values, { onConflict, ignoreDuplicates = false, count, defaultToNull = true } = {}) {
    var _this$fetch2;
    const method = "POST";
    const { url, headers } = this.cloneRequestState();
    headers.append("Prefer", `resolution=${ignoreDuplicates ? "ignore" : "merge"}-duplicates`);
    if (onConflict !== void 0) url.searchParams.set("on_conflict", onConflict);
    if (count) headers.append("Prefer", `count=${count}`);
    if (!defaultToNull) headers.append("Prefer", "missing=default");
    if (Array.isArray(values)) {
      const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
      if (columns.length > 0) {
        const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
        url.searchParams.set("columns", uniqueColumns.join(","));
      }
    }
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schema,
      body: values,
      fetch: (_this$fetch2 = this.fetch) !== null && _this$fetch2 !== void 0 ? _this$fetch2 : fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Perform an UPDATE on the table or view.
  *
  * By default, updated rows are not returned. To return it, chain the call
  * with `.select()` after filters.
  *
  * @param values - The values to update with
  *
  * @param options - Named parameters
  *
  * @param options.count - Count algorithm to use to count updated rows.
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @category Database
  *
  * @remarks
  * - `update()` should always be combined with [Filters](/docs/reference/javascript/using-filters) to target the item(s) you wish to update.
  *
  * @example Updating your data
  * ```ts
  * const { error } = await supabase
  *   .from('instruments')
  *   .update({ name: 'piano' })
  *   .eq('id', 1)
  * ```
  *
  * @exampleSql Updating your data
  * ```sql
  * create table
  *   instruments (id int8 primary key, name text);
  *
  * insert into
  *   instruments (id, name)
  * values
  *   (1, 'harpsichord');
  * ```
  *
  * @exampleResponse Updating your data
  * ```json
  * {
  *   "status": 204,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Handling errors
  * `error.hint` from Postgres often contains the actionable fix (e.g. `"Grant the required privileges to the current role with: GRANT UPDATE ON public.instruments TO anon;"` for a `42501` permission-denied error). Log the full `error` object so it isn't hidden behind `error.message`.
  *
  * @example Handling errors
  * ```js
  * const { error } = await supabase.from('instruments').update({ name: 'piano' }).eq('id', 1)
  * if (error) console.error(error)
  * ```
  *
  * @example Update a record and return it
  * ```ts
  * const { data, error } = await supabase
  *   .from('instruments')
  *   .update({ name: 'piano' })
  *   .eq('id', 1)
  *   .select()
  * ```
  *
  * @exampleSql Update a record and return it
  * ```sql
  * create table
  *   instruments (id int8 primary key, name text);
  *
  * insert into
  *   instruments (id, name)
  * values
  *   (1, 'harpsichord');
  * ```
  *
  * @exampleResponse Update a record and return it
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "piano"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Updating JSON data
  * Postgres offers some
  * [operators](/docs/guides/database/json#query-the-jsonb-data) for
  * working with JSON data. Currently, it is only possible to update the entire JSON document.
  *
  * @example Updating JSON data
  * ```ts
  * const { data, error } = await supabase
  *   .from('users')
  *   .update({
  *     address: {
  *       street: 'Melrose Place',
  *       postcode: 90210
  *     }
  *   })
  *   .eq('address->postcode', 90210)
  *   .select()
  * ```
  *
  * @exampleSql Updating JSON data
  * ```sql
  * create table
  *   users (
  *     id int8 primary key,
  *     name text,
  *     address jsonb
  *   );
  *
  * insert into
  *   users (id, name, address)
  * values
  *   (1, 'Michael', '{ "postcode": 90210 }');
  * ```
  *
  * @exampleResponse Updating JSON data
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Michael",
  *       "address": {
  *         "street": "Melrose Place",
  *         "postcode": 90210
  *       }
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  update(values, { count } = {}) {
    var _this$fetch3;
    const method = "PATCH";
    const { url, headers } = this.cloneRequestState();
    if (count) headers.append("Prefer", `count=${count}`);
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schema,
      body: values,
      fetch: (_this$fetch3 = this.fetch) !== null && _this$fetch3 !== void 0 ? _this$fetch3 : fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Perform a DELETE on the table or view.
  *
  * By default, deleted rows are not returned. To return it, chain the call
  * with `.select()` after filters.
  *
  * @param options - Named parameters
  *
  * @param options.count - Count algorithm to use to count deleted rows.
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @category Database
  *
  * @remarks
  * - `delete()` should always be combined with [filters](/docs/reference/javascript/using-filters) to target the item(s) you wish to delete.
  * - If you use `delete()` with filters and you have
  *   [RLS](/docs/learn/auth-deep-dive/auth-row-level-security) enabled, only
  *   rows visible through `SELECT` policies are deleted. Note that by default
  *   no rows are visible, so you need at least one `SELECT`/`ALL` policy that
  *   makes the rows visible.
  * - When using `delete().in()`, specify an array of values to target multiple rows with a single query. This is particularly useful for batch deleting entries that share common criteria, such as deleting users by their IDs. Ensure that the array you provide accurately represents all records you intend to delete to avoid unintended data removal.
  *
  * @example Delete a single record
  * ```ts
  * const response = await supabase
  *   .from('countries')
  *   .delete()
  *   .eq('id', 1)
  * ```
  *
  * @exampleSql Delete a single record
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  *
  * insert into
  *   countries (id, name)
  * values
  *   (1, 'Mordor');
  * ```
  *
  * @exampleResponse Delete a single record
  * ```json
  * {
  *   "status": 204,
  *   "statusText": ""
  * }
  * ```
  *
  * @exampleDescription Handling errors
  * `error.hint` from Postgres often contains the actionable fix (e.g. `"Grant the required privileges to the current role with: GRANT DELETE ON public.countries TO anon;"` for a `42501` permission-denied error). Log the full `error` object so it isn't hidden behind `error.message`.
  *
  * @example Handling errors
  * ```js
  * const { error } = await supabase.from('countries').delete().eq('id', 1)
  * if (error) console.error(error)
  * ```
  *
  * @example Delete a record and return it
  * ```ts
  * const { data, error } = await supabase
  *   .from('countries')
  *   .delete()
  *   .eq('id', 1)
  *   .select()
  * ```
  *
  * @exampleSql Delete a record and return it
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  *
  * insert into
  *   countries (id, name)
  * values
  *   (1, 'Mordor');
  * ```
  *
  * @exampleResponse Delete a record and return it
  * ```json
  * {
  *   "data": [
  *     {
  *       "id": 1,
  *       "name": "Mordor"
  *     }
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example Delete multiple records
  * ```ts
  * const response = await supabase
  *   .from('countries')
  *   .delete()
  *   .in('id', [1, 2, 3])
  * ```
  *
  * @exampleSql Delete multiple records
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  *
  * insert into
  *   countries (id, name)
  * values
  *   (1, 'Rohan'), (2, 'The Shire'), (3, 'Mordor');
  * ```
  *
  * @exampleResponse Delete multiple records
  * ```json
  * {
  *   "status": 204,
  *   "statusText": ""
  * }
  * ```
  */
  delete({ count } = {}) {
    var _this$fetch4;
    const method = "DELETE";
    const { url, headers } = this.cloneRequestState();
    if (count) headers.append("Prefer", `count=${count}`);
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schema,
      fetch: (_this$fetch4 = this.fetch) !== null && _this$fetch4 !== void 0 ? _this$fetch4 : fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
};
function toOpenApiError(body, statusText) {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      var _parsed$message, _parsed$details, _parsed$hint, _parsed$code;
      return new PostgrestError({
        message: String((_parsed$message = parsed.message) !== null && _parsed$message !== void 0 ? _parsed$message : body),
        details: (_parsed$details = parsed.details) !== null && _parsed$details !== void 0 ? _parsed$details : "",
        hint: (_parsed$hint = parsed.hint) !== null && _parsed$hint !== void 0 ? _parsed$hint : "",
        code: (_parsed$code = parsed.code) !== null && _parsed$code !== void 0 ? _parsed$code : ""
      });
    }
  } catch (_unused) {
  }
  return new PostgrestError({
    message: body || statusText,
    details: "",
    hint: "",
    code: ""
  });
}
function toTransportFailure(cause, status, statusText) {
  var _err$name;
  const err = cause;
  return {
    success: false,
    error: new PostgrestError({
      message: `${(_err$name = err === null || err === void 0 ? void 0 : err.name) !== null && _err$name !== void 0 ? _err$name : "FetchError"}: ${err === null || err === void 0 ? void 0 : err.message}`,
      details: "",
      hint: "",
      code: ""
    }),
    data: null,
    count: null,
    status,
    statusText
  };
}
var PostgrestClient = class PostgrestClient2 {
  /**
  * Creates a PostgREST client.
  *
  * @param url - URL of the PostgREST endpoint
  * @param options - Named parameters
  * @param options.headers - Custom headers
  * @param options.schema - Postgres schema to switch to
  * @param options.fetch - Custom fetch
  * @param options.timeout - Optional timeout in milliseconds for all requests. When set, requests will automatically abort after this duration to prevent indefinite hangs.
  * @param options.urlLengthLimit - Maximum URL length in characters before warnings/errors are triggered. Defaults to 8000.
  * @param options.retry - Enable or disable automatic retries for transient errors.
  *   When enabled, idempotent requests (GET, HEAD, OPTIONS) that fail with network
  *   errors or HTTP 503/520 responses will be automatically retried up to 3 times
  *   with exponential backoff (1s, 2s, 4s). Defaults to `true`.
  * @example Using supabase-js (recommended)
  * ```ts
  * import { createClient } from '@supabase/supabase-js'
  *
  * const supabase = createClient('https://xyzcompany.supabase.co', 'your-publishable-key')
  * const { data, error } = await supabase.from('profiles').select('*')
  * ```
  *
  * @category Database
  *
  * @remarks
  * - A `timeout` option (in milliseconds) can be set to automatically abort requests that take too long.
  * - A `urlLengthLimit` option (default: 8000) can be set to control when URL length warnings are included in error messages for aborted requests.
  *
  * @example Standalone import for bundle-sensitive environments
  * ```ts
  * import { PostgrestClient } from '@supabase/postgrest-js'
  *
  * const postgrest = new PostgrestClient('https://xyzcompany.supabase.co/rest/v1', {
  *   headers: { apikey: 'your-publishable-key' },
  *   schema: 'public',
  *   timeout: 30000, // 30 second timeout
  * })
  * ```
  */
  constructor(url, { headers = {}, schema, fetch: fetch$1, timeout, urlLengthLimit = 8e3, retry } = {}) {
    this.url = url;
    this.headers = new Headers(headers);
    this.schemaName = schema;
    this.urlLengthLimit = urlLengthLimit;
    const originalFetch = fetch$1 !== null && fetch$1 !== void 0 ? fetch$1 : globalThis.fetch;
    if (timeout !== void 0 && timeout > 0) this.fetch = (input, init) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const existingSignal = init === null || init === void 0 ? void 0 : init.signal;
      if (existingSignal) {
        if (existingSignal.aborted) {
          clearTimeout(timeoutId);
          return originalFetch(input, init);
        }
        const abortHandler = () => {
          clearTimeout(timeoutId);
          controller.abort();
        };
        existingSignal.addEventListener("abort", abortHandler, { once: true });
        return originalFetch(input, _objectSpread2(_objectSpread2({}, init), {}, { signal: controller.signal })).finally(() => {
          clearTimeout(timeoutId);
          existingSignal.removeEventListener("abort", abortHandler);
        });
      }
      return originalFetch(input, _objectSpread2(_objectSpread2({}, init), {}, { signal: controller.signal })).finally(() => clearTimeout(timeoutId));
    };
    else this.fetch = originalFetch;
    this.retry = retry;
  }
  from(relation) {
    if (!relation || typeof relation !== "string" || relation.trim() === "") throw new Error("Invalid relation name: relation must be a non-empty string.");
    return new PostgrestQueryBuilder(new URL(`${this.url}/${relation}`), {
      headers: new Headers(this.headers),
      schema: this.schemaName,
      fetch: this.fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Select a schema to query or perform an function (rpc) call.
  *
  * The schema needs to be on the list of exposed schemas inside Supabase.
  *
  * @param schema - The schema to query
  *
  * @category Database
  */
  schema(schema) {
    return new PostgrestClient2(this.url, {
      headers: this.headers,
      schema,
      fetch: this.fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
  /**
  * Fetch the OpenAPI description PostgREST publishes for this client's schema.
  *
  * The document lists only the tables, views and functions the caller's role
  * holds privileges on; PostgREST applies that filtering server-side. The
  * schema is the one this client was created with, so call `.schema()` first
  * to describe a different one. Transient failures are retried according to
  * the client's `retry` option, like any other idempotent request.
  *
  * @example
  * ```ts
  * const { data, error } = await supabase.getOpenApiSpec()
  * ```
  *
  * @example Describe a schema other than the client default
  * ```ts
  * const { data, error } = await supabase.schema('billing').getOpenApiSpec()
  * ```
  *
  * @category Database
  */
  async getOpenApiSpec() {
    var _this = this;
    var _this$fetch;
    const headers = new Headers(_this.headers);
    headers.set("Accept", "application/openapi+json");
    if (_this.schemaName) headers.set("Accept-Profile", _this.schemaName);
    const requestHeaders = {};
    headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });
    const fetchImpl = (_this$fetch = _this.fetch) !== null && _this$fetch !== void 0 ? _this$fetch : globalThis.fetch;
    let res;
    try {
      var _this$retry;
      res = await fetchWithRetry(fetchImpl, `${_this.url}/`, {
        method: "GET",
        headers: requestHeaders
      }, (_this$retry = _this.retry) !== null && _this$retry !== void 0 ? _this$retry : true);
    } catch (fetchError) {
      return toTransportFailure(fetchError, 0, "");
    }
    let body;
    try {
      body = await res.text();
    } catch (readError) {
      return toTransportFailure(readError, res.status, res.statusText);
    }
    if (res.ok) try {
      return {
        success: true,
        error: null,
        data: JSON.parse(body),
        count: null,
        status: res.status,
        statusText: res.statusText
      };
    } catch (_unused2) {
    }
    return {
      success: false,
      error: toOpenApiError(body, res.statusText),
      data: null,
      count: null,
      status: res.status,
      statusText: res.statusText
    };
  }
  /**
  * Perform a function call.
  *
  * @param fn - The function name to call
  * @param args - The arguments to pass to the function call
  * @param options - Named parameters
  * @param options.head - When set to `true`, `data` will not be returned.
  * Useful if you only need the count.
  * @param options.get - When set to `true`, the function will be called with
  * read-only access mode.
  * @param options.count - Count algorithm to use to count rows returned by the
  * function. Only applicable for [set-returning
  * functions](https://www.postgresql.org/docs/current/functions-srf.html).
  *
  * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
  * hood.
  *
  * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
  * statistics under the hood.
  *
  * `"estimated"`: Uses exact count for low numbers and planned count for high
  * numbers.
  *
  * @example
  * ```ts
  * // For cross-schema functions where type inference fails, use overrideTypes:
  * const { data } = await supabase
  *   .schema('schema_b')
  *   .rpc('function_a', {})
  *   .overrideTypes<{ id: string; user_id: string }[]>()
  * ```
  *
  * @category Database
  *
  * @example Call a Postgres function without arguments
  * ```ts
  * const { data, error } = await supabase.rpc('hello_world')
  * ```
  *
  * @exampleSql Call a Postgres function without arguments
  * ```sql
  * create function hello_world() returns text as $$
  *   select 'Hello world';
  * $$ language sql;
  * ```
  *
  * @exampleResponse Call a Postgres function without arguments
  * ```json
  * {
  *   "data": "Hello world",
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example Call a Postgres function with arguments
  * ```ts
  * const { data, error } = await supabase.rpc('echo', { say: '👋' })
  * ```
  *
  * @exampleSql Call a Postgres function with arguments
  * ```sql
  * create function echo(say text) returns text as $$
  *   select say;
  * $$ language sql;
  * ```
  *
  * @exampleResponse Call a Postgres function with arguments
  * ```json
  *   {
  *     "data": "👋",
  *     "status": 200,
  *     "statusText": "OK"
  *   }
  *
  * ```
  *
  * @exampleDescription Bulk processing
  * You can process large payloads by passing in an array as an argument.
  *
  * @example Bulk processing
  * ```ts
  * const { data, error } = await supabase.rpc('add_one_each', { arr: [1, 2, 3] })
  * ```
  *
  * @exampleSql Bulk processing
  * ```sql
  * create function add_one_each(arr int[]) returns int[] as $$
  *   select array_agg(n + 1) from unnest(arr) as n;
  * $$ language sql;
  * ```
  *
  * @exampleResponse Bulk processing
  * ```json
  * {
  *   "data": [
  *     2,
  *     3,
  *     4
  *   ],
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @exampleDescription Call a Postgres function with filters
  * Postgres functions that return tables can also be combined with [Filters](/docs/reference/javascript/using-filters) and [Modifiers](/docs/reference/javascript/using-modifiers).
  *
  * @example Call a Postgres function with filters
  * ```ts
  * const { data, error } = await supabase
  *   .rpc('list_stored_countries')
  *   .eq('id', 1)
  *   .single()
  * ```
  *
  * @exampleSql Call a Postgres function with filters
  * ```sql
  * create table
  *   countries (id int8 primary key, name text);
  *
  * insert into
  *   countries (id, name)
  * values
  *   (1, 'Rohan'),
  *   (2, 'The Shire');
  *
  * create function list_stored_countries() returns setof countries as $$
  *   select * from countries;
  * $$ language sql;
  * ```
  *
  * @exampleResponse Call a Postgres function with filters
  * ```json
  * {
  *   "data": {
  *     "id": 1,
  *     "name": "Rohan"
  *   },
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  *
  * @example Call a read-only Postgres function
  * ```ts
  * const { data, error } = await supabase.rpc('hello_world', undefined, { get: true })
  * ```
  *
  * @exampleSql Call a read-only Postgres function
  * ```sql
  * create function hello_world() returns text as $$
  *   select 'Hello world';
  * $$ language sql;
  * ```
  *
  * @exampleResponse Call a read-only Postgres function
  * ```json
  * {
  *   "data": "Hello world",
  *   "status": 200,
  *   "statusText": "OK"
  * }
  * ```
  */
  rpc(fn, args = {}, { head = false, get = false, count } = {}) {
    var _this$fetch2;
    let method;
    const url = new URL(`${this.url}/rpc/${fn}`);
    let body;
    const _isObject = (v) => v !== null && typeof v === "object" && (!Array.isArray(v) || v.some(_isObject));
    const _hasObjectArg = head && Object.values(args).some(_isObject);
    if (_hasObjectArg) {
      method = "POST";
      body = args;
    } else if (head || get) {
      method = head ? "HEAD" : "GET";
      Object.entries(args).filter(([_, value]) => value !== void 0).map(([name, value]) => [name, Array.isArray(value) ? `{${value.join(",")}}` : `${value}`]).forEach(([name, value]) => {
        url.searchParams.append(name, value);
      });
    } else {
      method = "POST";
      body = args;
    }
    const headers = new Headers(this.headers);
    if (_hasObjectArg) headers.set("Prefer", count ? `count=${count},return=minimal` : "return=minimal");
    else if (count) headers.set("Prefer", `count=${count}`);
    return new PostgrestFilterBuilder({
      method,
      url,
      headers,
      schema: this.schemaName,
      body,
      fetch: (_this$fetch2 = this.fetch) !== null && _this$fetch2 !== void 0 ? _this$fetch2 : fetch,
      urlLengthLimit: this.urlLengthLimit,
      retry: this.retry
    });
  }
};

// shim:shim-supabase
var cliente = null;
function configurarSupabase(url, chave, obterToken) {
  cliente = new PostgrestClient(url.replace(/\/+$/, "") + "/rest/v1", {
    headers: { apikey: chave },
    fetch: async (entrada, init = {}) => {
      const h = new Headers(init.headers || {});
      let t = null;
      if (obterToken) {
        try {
          t = await obterToken();
        } catch {
          t = null;
        }
      }
      h.set("Authorization", "Bearer " + (t || chave));
      return globalThis.fetch(entrada, { ...init, headers: h });
    }
  });
}
var supabase = { from: (tabela) => cliente.from(tabela) };

// ../SISTEMA UNIFICADO/src/relatorios/lib/dashboardHelpers.ts
function parseDate(d) {
  if (!d) return null;
  const s = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T12:00:00" : d;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}
function filterByDow(items, getDate, dow) {
  if (dow === "all") return items;
  return items.filter((it) => {
    const d = parseDate(getDate(it));
    return d ? d.getDay() === dow : false;
  });
}

// ../SISTEMA UNIFICADO/src/serraria/lib/cores.ts
var PALETAS = [
  {
    key: "blue",
    nome: "Azul",
    swatch: "#1d4ed8",
    web: { bar: "#1d4ed8", header: "#eff6ff", badge: "#dbeafe", text: "#1e40af" },
    pdf: { r: 29, g: 78, b: 216 },
    // 'maq' = cor de MÁQUINA: escapa da conversão de accent do theme-flat (senão Hedel perde o azul)
    theme: {
      bg: "maq bg-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      border: "maq border-blue-500",
      borderLight: "maq border-blue-200 dark:border-blue-800",
      text: "maq text-blue-600 dark:text-blue-400",
      textWhite: "text-white",
      hover: "hover:bg-blue-700",
      ring: "maq focus:ring-blue-500/30",
      badge: "maq bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
      gradient: "maq from-blue-500 via-blue-600 to-transparent",
      btnCala: "maq bg-blue-600 hover:bg-blue-700 text-white",
      btnParada: "maq bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
    }
  },
  {
    key: "yellow",
    nome: "Dourado",
    swatch: "#ca8a04",
    web: { bar: "#ca8a04", header: "#fefce8", badge: "#fef9c3", text: "#854d0e" },
    pdf: { r: 202, g: 138, b: 4 },
    theme: {
      bg: "bg-yellow-500",
      bgLight: "bg-yellow-50 dark:bg-yellow-950/40",
      border: "border-yellow-500",
      borderLight: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-600 dark:text-yellow-400",
      textWhite: "text-slate-900",
      hover: "hover:bg-yellow-600",
      ring: "focus:ring-yellow-500/30",
      badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
      gradient: "from-yellow-400 via-yellow-500 to-transparent",
      btnCala: "bg-yellow-500 hover:bg-yellow-600 text-slate-900",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
    }
  },
  {
    key: "rose",
    nome: "Vermelho",
    swatch: "#e11d48",
    web: { bar: "#e11d48", header: "#fff1f2", badge: "#ffe4e6", text: "#9f1239" },
    pdf: { r: 225, g: 29, b: 72 },
    theme: {
      bg: "bg-rose-500",
      bgLight: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-500",
      borderLight: "border-rose-200 dark:border-rose-800",
      text: "text-rose-600 dark:text-rose-400",
      textWhite: "text-white",
      hover: "hover:bg-rose-600",
      ring: "focus:ring-rose-500/30",
      badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
      gradient: "from-rose-500 via-pink-500 to-transparent",
      btnCala: "bg-rose-500 hover:bg-rose-600 text-white",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
    }
  },
  {
    key: "amber",
    nome: "\xC2mbar",
    swatch: "#d97706",
    web: { bar: "#d97706", header: "#fffbeb", badge: "#fef3c7", text: "#92400e" },
    pdf: { r: 217, g: 119, b: 6 },
    theme: {
      bg: "bg-amber-500",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-500",
      borderLight: "border-amber-200 dark:border-amber-800",
      text: "text-amber-600 dark:text-amber-400",
      textWhite: "text-white",
      hover: "hover:bg-amber-600",
      ring: "focus:ring-amber-500/30",
      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      gradient: "from-amber-500 via-orange-500 to-transparent",
      btnCala: "bg-amber-500 hover:bg-amber-600 text-white",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
    }
  },
  {
    key: "emerald",
    nome: "Esmeralda",
    swatch: "#059669",
    web: { bar: "#059669", header: "#ecfdf5", badge: "#d1fae5", text: "#065f46" },
    pdf: { r: 5, g: 150, b: 105 },
    theme: {
      bg: "bg-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-500",
      borderLight: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-600 dark:text-emerald-400",
      textWhite: "text-white",
      hover: "hover:bg-emerald-700",
      ring: "focus:ring-emerald-500/30",
      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
      gradient: "from-emerald-500 via-emerald-600 to-transparent",
      btnCala: "bg-emerald-600 hover:bg-emerald-700 text-white",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
    }
  },
  {
    key: "violet",
    nome: "Violeta",
    swatch: "#7c3aed",
    web: { bar: "#7c3aed", header: "#f5f3ff", badge: "#ede9fe", text: "#5b21b6" },
    pdf: { r: 124, g: 58, b: 237 },
    theme: {
      bg: "maq bg-violet-600",
      bgLight: "bg-violet-50 dark:bg-violet-950/40",
      border: "maq border-violet-500",
      borderLight: "maq border-violet-200 dark:border-violet-800",
      text: "maq text-violet-600 dark:text-violet-400",
      textWhite: "text-white",
      hover: "hover:bg-violet-700",
      ring: "maq focus:ring-violet-500/30",
      badge: "maq bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      gradient: "maq from-violet-500 via-violet-600 to-transparent",
      btnCala: "maq bg-violet-600 hover:bg-violet-700 text-white",
      btnParada: "maq bg-white dark:bg-slate-800 border-2 border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
    }
  },
  {
    key: "cyan",
    nome: "Ciano",
    swatch: "#0891b2",
    web: { bar: "#0891b2", header: "#ecfeff", badge: "#cffafe", text: "#155e75" },
    pdf: { r: 8, g: 145, b: 178 },
    theme: {
      bg: "maq bg-cyan-600",
      bgLight: "bg-cyan-50 dark:bg-cyan-950/40",
      border: "maq border-cyan-500",
      borderLight: "maq border-cyan-200 dark:border-cyan-800",
      text: "maq text-cyan-600 dark:text-cyan-400",
      textWhite: "text-white",
      hover: "hover:bg-cyan-700",
      ring: "maq focus:ring-cyan-500/30",
      badge: "maq bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
      gradient: "maq from-cyan-500 via-cyan-600 to-transparent",
      btnCala: "maq bg-cyan-600 hover:bg-cyan-700 text-white",
      btnParada: "maq bg-white dark:bg-slate-800 border-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
    }
  },
  {
    key: "green",
    nome: "Verde",
    swatch: "#16a34a",
    web: { bar: "#16a34a", header: "#f0fdf4", badge: "#dcfce7", text: "#166534" },
    pdf: { r: 22, g: 163, b: 74 },
    theme: {
      bg: "bg-green-600",
      bgLight: "bg-green-50 dark:bg-green-950/40",
      border: "border-green-500",
      borderLight: "border-green-200 dark:border-green-800",
      text: "text-green-600 dark:text-green-400",
      textWhite: "text-white",
      hover: "hover:bg-green-700",
      ring: "focus:ring-green-500/30",
      badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
      gradient: "from-green-500 via-green-600 to-transparent",
      btnCala: "bg-green-600 hover:bg-green-700 text-white",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
    }
  },
  {
    key: "orange",
    nome: "Laranja",
    swatch: "#ea580c",
    web: { bar: "#ea580c", header: "#fff7ed", badge: "#ffedd5", text: "#9a3412" },
    pdf: { r: 234, g: 88, b: 12 },
    theme: {
      bg: "bg-orange-600",
      bgLight: "bg-orange-50 dark:bg-orange-950/40",
      border: "border-orange-500",
      borderLight: "border-orange-200 dark:border-orange-800",
      text: "text-orange-600 dark:text-orange-400",
      textWhite: "text-white",
      hover: "hover:bg-orange-700",
      ring: "focus:ring-orange-500/30",
      badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
      gradient: "from-orange-500 via-orange-600 to-transparent",
      btnCala: "bg-orange-600 hover:bg-orange-700 text-white",
      btnParada: "bg-white dark:bg-slate-800 border-2 border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
    }
  }
];
var DEFAULT_KEY = "amber";
var byKey = (k) => PALETAS.find((p) => p.key === k);
function legacyKey(nome) {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("hedel")) return "blue";
  if (n.includes("gaspari")) return "yellow";
  if (n.includes("sky")) return "rose";
  return DEFAULT_KEY;
}
function resolve(nome, cor) {
  return byKey(cor) ?? byKey(legacyKey(nome)) ?? byKey(DEFAULT_KEY);
}
var accentWebFor = (nome, cor) => resolve(nome, cor).web;

// ../SISTEMA UNIFICADO/src/relatorios/serraria360/dados.ts
var H = 36e5;
var nums = (a) => Array.isArray(a) ? a.map(Number).filter((x) => x > 0) : [];
var diaLocal = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
var sobrepor = (a, b, ini, fim) => Math.max(0, Math.min(b, fim) - Math.max(a, ini));
var ts = (s) => s ? new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`).getTime() : null;
async function todasPaginas(montar) {
  const out = [];
  for (let de = 0; de < 2e4; de += 1e3) {
    const { data, error } = await montar().range(de, de + 999);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    out.push(...lote);
    if (lote.length < 1e3) break;
  }
  return out;
}
async function emLotes(ids, buscar) {
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await buscar(ids.slice(i, i + 200));
    out.push(...data ?? []);
  }
  return out;
}
var valorEsp = (vs, esp) => {
  if (!vs) return 0;
  const k = Object.keys(vs).find((x) => Math.abs(Number(x) - esp) < 0.05);
  return k ? Number(vs[k]) || 0 : 0;
};
function periodoAnterior(r) {
  if (!r.start || !r.end) return null;
  const len = r.end.getTime() - r.start.getTime();
  return { start: new Date(r.start.getTime() - len - 1e3), end: new Date(r.start.getTime() - 1e3) };
}
async function carregar360(range, dow) {
  const agora = Date.now();
  const raws = await todasPaginas(() => {
    let q = supabase.from("serraria_os").select(`
      id, parent_os_id, numero_os, numero_sufixo, status, data_hora_inicial, data_hora_final, data_fim_curso,
      horimetro_inicial, horimetro_final,
      maquinas:serraria_maquinas(nome, cor),
      serraria_os_blocos(id, bloco_id_interno, bloco_id_cliente, material_nome, cliente_nome, bloco_c, bloco_a),
      serraria_os_espessuras(bloco_id, espessura, quantidade)
    `).not("data_hora_inicial", "is", null).order("data_hora_inicial");
    if (range.end) q = q.lte("data_hora_inicial", range.end.toISOString());
    if (range.start) q = q.or(`data_hora_final.is.null,data_hora_final.gte."${range.start.toISOString()}"`);
    return q;
  });
  const maes = new Set(raws.map((o) => o.parent_os_id).filter((x) => !!x));
  const serradaDe = /* @__PURE__ */ new Map();
  const unidas = /* @__PURE__ */ new Map();
  for (const o of raws) {
    if (o.status === "split" || maes.has(o.id)) continue;
    const k = o.parent_os_id ?? o.id;
    serradaDe.set(o.id, k);
    const u = unidas.get(k);
    if (!u) {
      unidas.set(k, {
        ...o,
        id: k,
        numero_sufixo: k === o.id ? o.numero_sufixo : null,
        serraria_os_blocos: [...o.serraria_os_blocos ?? []],
        serraria_os_espessuras: [...o.serraria_os_espessuras ?? []]
      });
      continue;
    }
    u.serraria_os_blocos.push(...o.serraria_os_blocos ?? []);
    u.serraria_os_espessuras.push(...o.serraria_os_espessuras ?? []);
    if ((ts(o.data_hora_inicial) ?? Infinity) < (ts(u.data_hora_inicial) ?? Infinity)) u.data_hora_inicial = o.data_hora_inicial;
    if (!o.data_hora_final || !u.data_hora_final) u.data_hora_final = null;
    else if (ts(o.data_hora_final) > ts(u.data_hora_final)) u.data_hora_final = o.data_hora_final;
    if (o.horimetro_inicial != null && (u.horimetro_inicial == null || o.horimetro_inicial < u.horimetro_inicial)) u.horimetro_inicial = o.horimetro_inicial;
    if (o.horimetro_final != null && (u.horimetro_final == null || o.horimetro_final > u.horimetro_final)) u.horimetro_final = o.horimetro_final;
    u.data_fim_curso ??= o.data_fim_curso;
    u.maquinas ??= o.maquinas;
    if (o.status === "ativa") u.status = "ativa";
  }
  const validos = [...unidas.values()].filter((o) => o.data_hora_final || o.status === "ativa");
  const oss = filterByDow(validos, (o) => o.data_hora_final ?? o.data_hora_inicial, dow);
  const ini = range.start?.getTime() ?? Math.min(...oss.map((o) => ts(o.data_hora_inicial) ?? agora), agora);
  const fim = Math.min(range.end?.getTime() ?? agora, agora);
  const blocoIds = oss.flatMap((o) => (o.serraria_os_blocos ?? []).map((b) => b.id));
  const serradasValidas = new Set(oss.map((o) => o.id));
  const osIds = raws.filter((o) => serradasValidas.has(serradaDe.get(o.id))).map((o) => o.id);
  const [insps, pars, matsRes, maqsRes] = await Promise.all([
    emLotes(blocoIds, (l) => supabase.from("serraria_inspecoes").select(
      "bloco_id, comp_liquido, alt_liquido, comp_bruto, alt_bruto, valores_serrada, resultado, batidas_leve, batidas_medio, batidas_grave, entradas_leve, entradas_medio, entradas_grave, empeno, pulou_fio, quebra, quebra_chapas, quebra_qtd"
    ).in("bloco_id", l)),
    emLotes(osIds, (l) => supabase.from("serraria_paradas").select("os_id, tipo, data_hora_inicio, data_hora_fim").in("os_id", l)),
    supabase.from("materiais").select("nome, classe"),
    supabase.from("serraria_maquinas").select("nome, cor, ativo").order("nome")
  ]);
  const inspMap = new Map(insps.map((i) => [i.bloco_id, i]));
  const classeMap = new Map((matsRes.data ?? []).map((m) => [(m.nome ?? "").trim().toLowerCase(), (m.classe ?? "").trim()]));
  const maqMap = /* @__PURE__ */ new Map();
  (maqsRes.data ?? []).filter((m) => m.ativo).forEach((m) => maqMap.set(m.nome, { nome: m.nome, cor: accentWebFor(m.nome, m.cor).bar }));
  const blocos = [];
  const osFatos = [];
  const paradas = [];
  const parsPorOS = /* @__PURE__ */ new Map();
  const parVista = /* @__PURE__ */ new Set();
  pars.forEach((p) => {
    const k = serradaDe.get(p.os_id) ?? p.os_id;
    const dk = `${k}|${p.tipo ?? ""}|${p.data_hora_inicio ?? ""}`;
    if (parVista.has(dk)) return;
    parVista.add(dk);
    const l = parsPorOS.get(k) ?? [];
    l.push(p);
    parsPorOS.set(k, l);
  });
  for (const o of oss) {
    const maquina = o.maquinas?.nome ?? "\u2014";
    if (!maqMap.has(maquina)) maqMap.set(maquina, { nome: maquina, cor: accentWebFor(maquina, o.maquinas?.cor).bar });
    const oIni = ts(o.data_hora_inicial);
    const oFim = ts(o.data_hora_final);
    const oFimEf = oFim ?? agora;
    const numero = `${String(o.numero_os ?? "").padStart(4, "0")}${o.numero_sufixo ? `-${o.numero_sufixo}` : ""}`;
    const finalizadaNoPeriodo = oFim != null && oFim >= ini && oFim <= fim;
    const hor = Number(o.horimetro_final) - Number(o.horimetro_inicial);
    const horH = o.horimetro_inicial != null && o.horimetro_final != null && hor > 0 && hor < 1e3 ? hor : null;
    const dia = finalizadaNoPeriodo ? diaLocal(oFim) : null;
    let paradaH = 0;
    let paradaTotalH = 0;
    for (const p of parsPorOS.get(o.id) ?? []) {
      const pIni = ts(p.data_hora_inicio);
      if (pIni == null) continue;
      const pFim = ts(p.data_hora_fim) ?? (oFim == null ? agora : null);
      if (pFim == null || pFim <= pIni || (pFim - pIni) / H > 1e3) continue;
      paradaTotalH += (pFim - pIni) / H;
      const h = sobrepor(pIni, pFim, ini, fim) / H;
      if (h <= 0) continue;
      paradaH += h;
      paradas.push({ osId: o.id, maquina, tipo: (p.tipo ?? "Outros").trim() || "Outros", ini: pIni, fim: pFim, h });
    }
    const esps = o.serraria_os_espessuras ?? [];
    const lista = o.serraria_os_blocos ?? [];
    let m2OS = 0;
    let chapasOS = 0;
    const classes = /* @__PURE__ */ new Set();
    const materiais = /* @__PURE__ */ new Set();
    const clientes = /* @__PURE__ */ new Set();
    for (const b of lista) {
      const material = (b.material_nome ?? "\u2014").trim() || "\u2014";
      const classe = classeMap.get(material.toLowerCase()) || "\u2014";
      const cliente2 = (b.cliente_nome ?? "\u2014").trim() || "\u2014";
      classes.add(classe);
      materiais.add(material);
      clientes.add(cliente2);
      if (!finalizadaNoPeriodo) continue;
      const insp = inspMap.get(b.id);
      const areaLiq = (Number(insp?.comp_liquido) || 0) * (Number(insp?.alt_liquido) || 0);
      const areaBruta = (Number(b.bloco_c) || 0) * (Number(b.bloco_a) || 0);
      const area = areaLiq > 0 ? areaLiq : areaBruta;
      const eb = esps.filter((e) => (e.bloco_id ?? null) === b.id || e.bloco_id == null && lista.length === 1);
      const q = (f) => eb.filter((e) => f(Number(e.espessura))).reduce((s, e) => s + Number(e.quantidade || 0), 0);
      const q2 = q((e) => Math.abs(e - 2) < 0.05);
      const q3 = q((e) => Math.abs(e - 3) < 0.05);
      const chapas = eb.reduce((s, e) => s + Number(e.quantidade || 0), 0);
      const qo = chapas - q2 - q3;
      const precos = eb.map((e) => ({ esp: Number(e.espessura), chapas: Number(e.quantidade || 0), preco: valorEsp(insp?.valores_serrada, Number(e.espessura)) }));
      const valor = precos.reduce((s, e) => s + e.chapas * area * e.preco, 0);
      const m2 = chapas * area;
      m2OS += m2;
      chapasOS += chapas;
      const areaBrutaChapa = (Number(insp?.comp_bruto) || 0) * (Number(insp?.alt_bruto) || 0);
      const quebraChapas = nums(insp?.quebra_chapas);
      blocos.push({
        osId: o.id,
        osNumero: numero,
        maquina,
        material,
        classe,
        cliente: cliente2,
        dia,
        idInterno: (b.bloco_id_interno ?? "").trim(),
        numBloco: (b.bloco_id_cliente ?? "").trim(),
        precos,
        semPreco: valor <= 0,
        chapas,
        m2,
        m2_02: q2 * area,
        m2_03: q3 * area,
        m2_out: qo * area,
        valor,
        estimado: areaLiq <= 0,
        resultado: insp?.resultado ?? null,
        inspecionado: !!insp,
        batidas: { leve: nums(insp?.batidas_leve), medio: nums(insp?.batidas_medio), grave: nums(insp?.batidas_grave) },
        entradas: { leve: nums(insp?.entradas_leve), medio: nums(insp?.entradas_medio), grave: nums(insp?.entradas_grave) },
        quebraChapas,
        quebraQtd: insp?.quebra ? Math.max(Number(insp?.quebra_qtd) || 0, quebraChapas.length, 1) : 0,
        empeno: !!insp?.empeno,
        pulouFio: !!insp?.pulou_fio,
        aproveitamento: areaLiq > 0 && areaBrutaChapa > 0 ? Math.min(1, areaLiq / areaBrutaChapa) : null
      });
    }
    osFatos.push({
      id: o.id,
      numero,
      maquina,
      ini: oIni,
      fim: oFim,
      fimCurso: ts(o.data_fim_curso),
      horasNoPeriodo: sobrepor(oIni, oFimEf, ini, fim) / H,
      paradaH,
      durH: oFim ? horH ?? (oFim - oIni) / H : null,
      durHorimetro: horH != null,
      paradaTotalH,
      relogioH: oFim ? (oFim - oIni) / H : null,
      horimetroH: horH,
      m2: m2OS,
      chapas: chapasOS,
      classes: [...classes],
      materiais: [...materiais],
      clientes: [...clientes],
      dia
    });
  }
  return { blocos, oss: osFatos, paradas, maquinas: [...maqMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)), ini, fim };
}
var FATOR_CLASSE = { 2: 1, 3: 1, 4: 1.6, 5: 2.2, 6: 4 };
function fatorClasse(classe) {
  const m = (classe ?? "").match(/\d+/);
  return m ? FATOR_CLASSE[Number(m[0])] ?? 1 : 1;
}
function converterM2(d) {
  const blocos = d.blocos.map((b) => {
    const f = fatorClasse(b.classe);
    return f === 1 ? b : { ...b, m2: b.m2 * f, m2_02: b.m2_02 * f, m2_03: b.m2_03 * f, m2_out: b.m2_out * f };
  });
  const porOS = /* @__PURE__ */ new Map();
  blocos.forEach((b) => porOS.set(b.osId, (porOS.get(b.osId) ?? 0) + b.m2));
  return { ...d, blocos, oss: d.oss.map((o) => porOS.has(o.id) ? { ...o, m2: porOS.get(o.id) } : o) };
}
function aplicarFiltros(d, f) {
  const periodo = { ini: d.ini, fim: d.fim };
  const fora = new Set(f.semMaquinas ?? []);
  if (fora.size) d = { ...d, maquinas: d.maquinas.filter((m) => !fora.has(m.nome)) };
  const blocos = d.blocos.filter((b) => !fora.has(b.maquina) && (!f.maquina || b.maquina === f.maquina) && (!f.classe || b.classe === f.classe) && (!f.material || b.material === f.material) && (!f.cliente || b.cliente === f.cliente) && (!f.dia || b.dia === f.dia));
  let oss = d.oss.filter((o) => !fora.has(o.maquina) && (!f.maquina || o.maquina === f.maquina) && (!f.classe || o.classes.includes(f.classe)) && (!f.material || o.materiais.includes(f.material)) && (!f.cliente || o.clientes.includes(f.cliente)));
  if (!f.dia) {
    const ids2 = new Set(oss.map((o) => o.id));
    return { ...d, blocos, oss, paradas: d.paradas.filter((p) => ids2.has(p.osId)), periodo };
  }
  const agora = Date.now();
  const t0 = (/* @__PURE__ */ new Date(`${f.dia}T00:00:00`)).getTime();
  const ini = Math.max(t0, d.ini);
  const fim = Math.min(t0 + 24 * H - 1, d.fim, agora);
  oss = oss.filter((o) => o.ini <= fim && (o.fim ?? agora) >= ini).map((o) => {
    const finalizouNoDia = o.dia === f.dia;
    return {
      ...o,
      horasNoPeriodo: sobrepor(o.ini, o.fim ?? agora, ini, fim) / H,
      dia: finalizouNoDia ? o.dia : null,
      m2: finalizouNoDia ? o.m2 : 0,
      chapas: finalizouNoDia ? o.chapas : 0
    };
  });
  const ids = new Set(oss.map((o) => o.id));
  const paradas = d.paradas.filter((p) => ids.has(p.osId)).map((p) => ({ ...p, h: sobrepor(p.ini, p.fim, ini, fim) / H })).filter((p) => p.h > 0);
  const parPorOS = /* @__PURE__ */ new Map();
  paradas.forEach((p) => parPorOS.set(p.osId, (parPorOS.get(p.osId) ?? 0) + p.h));
  oss = oss.map((o) => ({ ...o, paradaH: parPorOS.get(o.id) ?? 0 }));
  return { ...d, blocos, oss, paradas, ini, fim, periodo };
}
var chapasComDefeito = (b) => (/* @__PURE__ */ new Set([
  ...b.batidas.leve,
  ...b.batidas.medio,
  ...b.batidas.grave,
  ...b.entradas.leve,
  ...b.entradas.medio,
  ...b.entradas.grave,
  ...b.quebraChapas
])).size;
var horasSerrando = (o) => o.durHorimetro ? o.durH : Math.max(0, o.durH - o.paradaTotalH);
function ritmoReal(oss) {
  const fin = oss.filter((o) => o.dia && o.durH && o.m2 > 0);
  const horas = fin.reduce((s, o) => s + horasSerrando(o), 0);
  return { m2h: horas > 0 ? fin.reduce((s, o) => s + o.m2, 0) / horas : 0, n: fin.length };
}
function indicadores(d, f) {
  const nMaquinas = f.maquina ? 1 : Math.max(1, d.maquinas.length);
  const horasPeriodo = Math.max(0, (d.fim - d.ini) / H);
  const m2 = d.blocos.reduce((s, b) => s + b.m2, 0);
  const valor = d.blocos.reduce((s, b) => s + b.valor, 0);
  const comPreco = d.blocos.filter((b) => !b.semPreco);
  const m2ComPreco = comPreco.reduce((s, b) => s + b.m2, 0);
  const horasOS = d.oss.reduce((s, o) => s + o.horasNoPeriodo, 0);
  const horasParada = d.paradas.reduce((s, p) => s + p.h, 0);
  const capacidade = horasPeriodo * nMaquinas;
  const inspecionados = d.blocos.filter((b) => b.resultado);
  const aprovados = inspecionados.filter((b) => b.resultado === "aprovado" || b.resultado === "aprovado_ressalva");
  const retiradas = d.oss.filter((o) => o.fim && o.fimCurso && o.fim > o.fimCurso && o.dia).map((o) => (o.fim - o.fimCurso) / H).filter((h) => h < 72);
  const dias = new Set(d.blocos.map((b) => b.dia)).size;
  const ritmoGeral = ritmoReal(d.oss);
  const insp = d.blocos.filter((b) => b.inspecionado);
  const chapasInsp = insp.reduce((s, b) => s + b.chapas, 0);
  const chapasDefeito = insp.reduce((s, b) => s + chapasComDefeito(b), 0);
  const aprov = insp.map((b) => b.aproveitamento).filter((x) => x != null);
  const comResultado = insp.filter((b) => b.resultado);
  return {
    inspecionados: insp.length,
    semInspecao: d.blocos.length - insp.length,
    reprovacao: comResultado.length ? comResultado.filter((b) => b.resultado === "reprovado").length / comResultado.length : null,
    ressalva: comResultado.length ? comResultado.filter((b) => b.resultado === "aprovado_ressalva").length / comResultado.length : null,
    pctChapasDefeito: chapasInsp > 0 ? chapasDefeito / chapasInsp : null,
    chapasDefeito,
    chapasQuebradas: insp.reduce((s, b) => s + b.quebraQtd, 0),
    aproveitamento: aprov.length ? aprov.reduce((s, x) => s + x, 0) / aprov.length : null,
    m2,
    chapas: d.blocos.reduce((s, b) => s + b.chapas, 0),
    blocos: d.blocos.length,
    valor,
    valorM2: m2ComPreco > 0 ? valor / m2ComPreco : 0,
    blocosSemPreco: d.blocos.length - comPreco.length,
    m2Estimado: d.blocos.filter((b) => b.estimado).reduce((s, b) => s + b.m2, 0),
    osConcluidas: d.oss.filter((o) => o.dia).length,
    horasPeriodo,
    nMaquinas,
    horasOS,
    horasParada,
    horasOciosas: Math.max(0, capacidade - horasOS),
    utilizacao: capacidade > 0 ? horasOS / capacidade : 0,
    disponibilidade: capacidade > 0 ? Math.max(0, horasOS - horasParada) / capacidade : 0,
    m2Hora: ritmoGeral.m2h,
    aprovacao: inspecionados.length ? aprovados.length / inspecionados.length : null,
    fimCursoRetiradaH: retiradas.length ? retiradas.reduce((s, h) => s + h, 0) / retiradas.length : null,
    m2Dia: dias ? m2 / dias : 0
  };
}
var n0 = (n) => Math.round(n).toLocaleString("pt-BR");
var n1 = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
var fmtHoras = (h) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
};
var fmtDia = (dia) => dia.split("-").reverse().slice(0, 2).join("/");
function gerarInsights(d, k, ant, f = {}, convertido = false) {
  const recorteDeProduto = !!(f.classe || f.material || f.cliente);
  const un = convertido ? "m\xB2 conv." : "m\xB2";
  const out = [];
  const add = (p, t) => out.push({ p, t });
  if (ant && ant.m2 > 0 && k.m2 > 0) {
    const v = (k.m2 / ant.m2 - 1) * 100;
    if (Math.abs(v) >= 5) add(v < 0 ? 9 : 6, `Produ\xE7\xE3o ${v > 0 ? `${n0(v)}% maior` : `${n0(-v)}% menor`} que o per\xEDodo anterior: ${n0(k.m2)} ${un} contra ${n0(ant.m2)}.`);
  }
  const conv = convertido ? d : converterM2(d);
  const ritmo = d.maquinas.map((m) => ({ nome: m.nome, ...ritmoReal(conv.oss.filter((o) => o.maquina === m.nome)) })).filter((r) => r.n >= 2 && r.m2h > 0).sort((a, b) => b.m2h - a.m2h);
  if (ritmo.length >= 2) {
    const a = ritmo[0];
    const z = ritmo[ritmo.length - 1];
    const dif = (a.m2h / z.m2h - 1) * 100;
    if (dif >= 15) add(7, `J\xE1 descontando a dureza (m\xB2 convertido/h): ${a.nome} rende ${n1(a.m2h)} e ${z.nome} ${n1(z.m2h)} \u2014 ${n0(dif)}% de diferen\xE7a (${a.n} e ${z.n} serradas).`);
  }
  const porClasse = /* @__PURE__ */ new Map();
  d.oss.filter((o) => o.dia && o.durH && o.m2 > 0 && o.classes.length === 1 && o.classes[0] !== "\u2014").forEach((o) => {
    const c = o.classes[0];
    const m2Real = convertido ? o.m2 / fatorClasse(c) : o.m2;
    const a = porClasse.get(c) ?? { h: 0, m2: 0, n: 0 };
    a.h += horasSerrando(o);
    a.m2 += m2Real;
    a.n++;
    porClasse.set(c, a);
  });
  const cls = [...porClasse.entries()].filter(([, a]) => a.n >= 3 && a.h > 0 && a.m2 > 0).map(([c, a]) => ({ c, hm2: a.h / a.m2, fator: fatorClasse(c) }));
  const base = cls.filter((x) => x.fator === 1).sort((a, b) => a.hm2 - b.hm2)[0];
  if (base) {
    const desvio = cls.filter((x) => x.fator > 1).map((x) => ({ ...x, real: x.hm2 / base.hm2 })).map((x) => ({ ...x, erro: Math.abs(x.real / x.fator - 1) })).filter((x) => x.erro >= 0.25).sort((a, b) => b.erro - a.erro)[0];
    if (desvio) add(5, `Classe ${desvio.c} levou ${n1(desvio.real)}\xD7 o tempo por m\xB2 da classe ${base.c}, mas o fator de convers\xE3o usado \xE9 ${n1(desvio.fator)}\xD7 \u2014 vale revisar a tabela.`);
  }
  const comHor = d.oss.filter((o) => o.dia && o.relogioH && o.horimetroH && o.relogioH >= 1);
  if (comHor.length >= 3) {
    const rel = comHor.reduce((s, o) => s + o.relogioH, 0);
    const hor = comHor.reduce((s, o) => s + Math.min(o.horimetroH, o.relogioH), 0);
    const semRegistro = comHor.reduce((s, o) => s + Math.max(0, o.relogioH - o.horimetroH - o.paradaTotalH), 0);
    if (rel - hor >= 2) add(6, `As m\xE1quinas giraram ${n0(hor / rel * 100)}% do tempo em que as serradas ficaram abertas (${fmtHoras(hor)} de ${fmtHoras(rel)}).${semRegistro >= 2 ? ` ${fmtHoras(semRegistro)} parado sem parada lan\xE7ada.` : ""}`);
    const estranhas = comHor.filter((o) => o.horimetroH / o.relogioH < 0.5 && o.relogioH - o.horimetroH >= 4).sort((a, b) => b.relogioH - b.horimetroH - (a.relogioH - a.horimetroH));
    if (estranhas.length) {
      const o = estranhas[0];
      add(7, `OS ${o.numero}: ${fmtHoras(o.relogioH)} de rel\xF3gio e s\xF3 ${fmtHoras(o.horimetroH)} de hor\xEDmetro${estranhas.length > 1 ? ` (e mais ${estranhas.length - 1} OS abaixo de 50%)` : ""} \u2014 confira a data de in\xEDcio/fim ou paradas n\xE3o lan\xE7adas.`);
    }
  }
  if (k.horasParada >= 2) {
    const porTipo = /* @__PURE__ */ new Map();
    d.paradas.forEach((p) => {
      const a2 = porTipo.get(p.tipo) ?? { h: 0, n: 0 };
      a2.h += p.h;
      a2.n++;
      porTipo.set(p.tipo, a2);
    });
    const [tipo, a] = [...porTipo.entries()].sort((x, y) => y[1].h - x[1].h)[0];
    const share = a.h / k.horasParada;
    if (share >= 0.3) add(8, `${tipo} \xE9 ${n0(share * 100)}% do tempo parado: ${fmtHoras(a.h)} em ${a.n} parada(s).`);
    const porMaq = /* @__PURE__ */ new Map();
    d.paradas.forEach((p) => porMaq.set(p.maquina, (porMaq.get(p.maquina) ?? 0) + p.h));
    if (porMaq.size >= 2) {
      const [maq, h] = [...porMaq.entries()].sort((x, y) => y[1] - x[1])[0];
      if (h / k.horasParada >= 0.5) add(6, `${maq} concentra ${n0(h / k.horasParada * 100)}% das horas paradas (${fmtHoras(h)}).`);
    }
  }
  const horasPer = (d.fim - d.ini) / H;
  if (!recorteDeProduto && horasPer >= 12) {
    const ociosa = d.maquinas.map((m) => {
      const h = Math.max(0, horasPer - d.oss.filter((o) => o.maquina === m.nome).reduce((s, o) => s + o.horasNoPeriodo, 0));
      return { nome: m.nome, h, pct: h / horasPer };
    }).filter((x) => x.pct >= 0.25).sort((a, b) => b.pct - a.pct)[0];
    if (ociosa) add(8, `${ociosa.nome} ficou ${n0(ociosa.pct * 100)}% ${f.dia ? "do dia" : "do per\xEDodo"} sem serrada (${fmtHoras(ociosa.h)}).`);
  }
  const ret = /* @__PURE__ */ new Map();
  d.oss.filter((o) => o.dia && o.fim && o.fimCurso && o.fim > o.fimCurso && (o.fim - o.fimCurso) / H < 72).forEach((o) => {
    const l = ret.get(o.maquina) ?? [];
    l.push((o.fim - o.fimCurso) / H);
    ret.set(o.maquina, l);
  });
  const medRet = [...ret.entries()].filter(([, l]) => l.length >= 2).map(([m, l]) => ({ m, h: l.reduce((s, x) => s + x, 0) / l.length })).sort((a, b) => b.h - a.h);
  if (medRet.length >= 2 && medRet[0].h >= 2 && medRet[0].h >= medRet[medRet.length - 1].h * 1.5) {
    add(6, `Do fim de curso at\xE9 a retirada, ${medRet[0].m} leva em m\xE9dia ${fmtHoras(medRet[0].h)} (${medRet[medRet.length - 1].m}: ${fmtHoras(medRet[medRet.length - 1].h)}) \u2014 m\xE1quina parada esperando.`);
  } else if (k.fimCursoRetiradaH != null && k.fimCursoRetiradaH >= 3) {
    add(4, `Em m\xE9dia, ${fmtHoras(k.fimCursoRetiradaH)} de m\xE1quina parada entre o fim de curso e a retirada.`);
  }
  if (!f.dia && horasPer >= 7 * 24) {
    const porDia = /* @__PURE__ */ new Map();
    d.blocos.forEach((b) => porDia.set(b.dia, (porDia.get(b.dia) ?? 0) + b.m2));
    const uteis = [];
    const hoje = diaLocal(Date.now());
    for (let t = (/* @__PURE__ */ new Date(diaLocal(d.ini) + "T12:00:00")).getTime(); t <= d.fim; t += 24 * H) {
      const wd = new Date(t).getDay();
      if (wd >= 1 && wd <= 5 && diaLocal(t) !== hoje) uteis.push(diaLocal(t));
    }
    const media = uteis.length ? uteis.reduce((s, x) => s + (porDia.get(x) ?? 0), 0) / uteis.length : 0;
    const fracos = uteis.filter((x) => (porDia.get(x) ?? 0) < media * 0.5);
    if (media > 0 && fracos.length >= 2) {
      add(5, `${fracos.length} dia(s) \xFAtil(eis) abaixo da metade da m\xE9dia (${n0(media)} ${un}/dia): ${fracos.slice(0, 6).map(fmtDia).join(", ")}${fracos.length > 6 ? "\u2026" : ""}.`);
    }
  }
  if (k.m2 > 0 && k.m2Estimado / k.m2 > 0.15) add(3, `${n0(k.m2Estimado / k.m2 * 100)}% do m\xB2 ainda \xE9 estimado pela medida bruta (blocos sem inspe\xE7\xE3o) \u2014 o n\xFAmero final pode mudar.`);
  return out.sort((a, b) => b.p - a.p).map((x) => x.t);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aplicarFiltros,
  carregar360,
  configurarSupabase,
  fmtHoras,
  gerarInsights,
  indicadores,
  periodoAnterior
});

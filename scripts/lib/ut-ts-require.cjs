/**
 * ut-ts-require.cjs — load the repository's REAL TypeScript modules from a plain
 * `node` regression script.
 *
 * The Batch 2 suites never ran. Both failed during module loading, before a
 * single assertion executed, for two environmental reasons:
 *
 *   1. `@/*` imports are a bundler alias. Plain `node` has no idea they mean
 *      `src/*`, so `src/lib/oracle-entry-resolver.ts` failed with
 *      `ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'`.
 *   2. `next/server` could not be resolved from a `.ts` module under `node`.
 *
 * Both are repaired here against the repository's own configuration instead of
 * a hard-coded guess:
 *
 *   - the `@/*` mapping is read out of `tsconfig.json` (`compilerOptions.paths`),
 *     resolved relative to `baseUrl`, using the project's own TypeScript parser
 *     so comments and trailing commas cannot break it;
 *   - `.ts` / `.tsx` are transpiled by the project's own installed `typescript`
 *     (a declared devDependency) — not by a hand-rolled type-stripper;
 *   - bare specifiers fall through to ordinary `node` resolution, so
 *     `next/server` is the genuinely installed framework module.
 *
 * What is NOT replaced: any application logic. Every module under test here is
 * the shipped file, executed. Only two external boundaries are stubbed, and
 * both are stubbed by the calling suite, not here:
 *
 *   - the Oracle backend HTTP call (the provider boundary), via `global.fetch`;
 *   - the Next.js request scope (`next/headers`), because `headers()` has no
 *     meaning outside a live request.
 *
 * `tsx` is deliberately NOT used. It is not a declared dependency of this
 * project — it only exists transitively through `tailwindcss` and `vercel`, so
 * relying on it would reintroduce a runner that silently disappears.
 */

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const RESOLVE_EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".jsx", ".json"];

let state = null;

function readCompilerOptions(root) {
  // TypeScript's own config reader: tsconfig permits comments and trailing
  // commas, JSON.parse does not.
  const ts = require("typescript");
  const file = path.join(root, "tsconfig.json");
  const parsed = ts.parseConfigFileTextToJson(file, fs.readFileSync(file, "utf8"));
  if (parsed.error) {
    throw new Error(`tsconfig.json could not be read: ${parsed.error.messageText}`);
  }
  const options = (parsed.config && parsed.config.compilerOptions) || {};
  return {
    baseUrl: path.resolve(root, options.baseUrl || "."),
    paths: options.paths || {},
  };
}

/** Map a specifier onto the candidate files declared by tsconfig `paths`. */
function aliasCandidates(specifier, options) {
  for (const pattern of Object.keys(options.paths)) {
    const targets = options.paths[pattern];
    if (!Array.isArray(targets)) continue;
    const star = pattern.indexOf("*");
    let matched = null;
    if (star === -1) {
      if (specifier === pattern) matched = "";
    } else {
      const head = pattern.slice(0, star);
      const tail = pattern.slice(star + 1);
      if (specifier.startsWith(head) && specifier.endsWith(tail) && specifier.length >= head.length + tail.length) {
        matched = specifier.slice(head.length, specifier.length - tail.length);
      }
    }
    if (matched === null) continue;
    return targets
      .filter((target) => typeof target === "string")
      .map((target) => path.resolve(options.baseUrl, target.split("*").join(matched)));
  }
  return [];
}

function expandCandidates(candidate) {
  const out = [];
  for (const extension of RESOLVE_EXTENSIONS) {
    const file = candidate + extension;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) out.push(file);
  }
  for (const extension of RESOLVE_EXTENSIONS.slice(1)) {
    const file = path.join(candidate, `index${extension}`);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) out.push(file);
  }
  return out;
}

/**
 * Install the loader. Idempotent: repeated calls are a no-op, so every suite
 * may call it defensively without coordinating order.
 */
function registerTsModules(options) {
  if (state) return state;

  const root = path.resolve((options && options.root) || path.resolve(__dirname, ".."));
  const ts = require("typescript");
  const compiler = readCompilerOptions(root);

  const compile = (module_, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: ts.JsxEmit.ReactJSX,
        sourceMap: false,
      },
      fileName: filename,
    }).outputText;
    module_._compile(output, filename);
  };

  for (const extension of [".ts", ".tsx", ".mts"]) {
    require.extensions[extension] = compile;
  }

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request.startsWith("@/")) {
      for (const candidate of aliasCandidates(request, compiler)) {
        for (const file of expandCandidates(candidate)) {
          try {
            return originalResolve.call(this, file, ...rest);
          } catch {
            // keep looking
          }
        }
      }
    }
    return originalResolve.call(this, request, ...rest);
  };

  state = { root, compiler, typescript: ts };
  return state;
}

/**
 * Replace one module's exports in the require cache. Only for genuine runtime
 * boundaries (`next/headers`), never for application logic.
 * Returns a restore function.
 */
function mockModule(specifier, exports, options) {
  registerTsModules(options);
  const from = (options && options.root) || state.root;
  const resolved = require.resolve(specifier, { paths: [from] });
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
    paths: [],
    children: [],
    parent: null,
  };
  return () => {
    delete require.cache[resolved];
  };
}

/**
 * Execute the REAL `/oracle` view chooser and report the redirect it issues.
 *
 * `redirect()` is the installed Next.js implementation, which throws
 * `NEXT_REDIRECT` carrying the destination in its digest — the same mechanism
 * the framework uses in production, so nothing about the hop is simulated.
 */
function loadRouteChooser(options) {
  const opts = options || {};
  registerTsModules(opts);
  const root = opts.root || state.root;

  let userAgent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const restoreHeaders = mockModule(
    "next/headers",
    { headers: () => new Headers({ "user-agent": userAgent }) },
    { root }
  );

  const chooser = require(path.join(root, "src/app/oracle/page.tsx"));
  if (typeof chooser.default !== "function") {
    throw new Error("src/app/oracle/page.tsx does not export a route chooser component");
  }

  return {
    restore: restoreHeaders,
    setUserAgent(next) {
      userAgent = next;
    },
    redirectFor(searchParams) {
      try {
        chooser.default({ searchParams: searchParams || {} });
      } catch (error) {
        const digest = String((error && error.digest) || "");
        const match = /^NEXT_REDIRECT;(?:[^;]*);([^;]*);/.exec(digest);
        if (match) return match[1];
        throw error;
      }
      throw new Error("the chooser returned without redirecting");
    },
  };
}

module.exports = { registerTsModules, mockModule, loadRouteChooser };
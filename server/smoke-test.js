// Exercises the real Express routes against an in-memory fake of the Script
// model, so route logic (query building, status codes, response shapes) is
// verified without requiring a running MongoDB instance.
import http from "http";
import express from "express";
import cors from "cors";
import Script from "./src/models/Script.js";
import scriptsRouter from "./src/routes/scripts.js";

let store = [];
let seq = 1;

function computeWordCount(content) {
  if (!content) return 0;
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function toJSON(doc) {
  return { ...doc, wordCount: computeWordCount(doc.content) };
}

function matches(doc, query) {
  return Object.entries(query).every(([key, val]) => {
    if (key === "$or") {
      return val.some((clause) => matches(doc, clause));
    }
    if (val && typeof val === "object" && val.$regex) {
      const re = new RegExp(val.$regex, val.$options || "");
      if (Array.isArray(doc[key])) return doc[key].some((v) => re.test(v));
      return re.test(doc[key] || "");
    }
    if (Array.isArray(doc[key])) return doc[key].includes(val);
    return doc[key] === val;
  });
}

// Mimics a Mongoose Query: awaitable, and supports the .sort() chaining the
// real routes use (Script.find(query).sort({ updatedAt: -1 })).
function findQuery(query = {}) {
  const run = async () => {
    const results = store.filter((d) => matches(d, query)).map(toJSON);
    if (findQuery._sort) {
      const [[key, dir]] = Object.entries(findQuery._sort);
      results.sort((a, b) => (a[key] > b[key] ? 1 : -1) * dir);
    }
    return results;
  };
  return {
    sort(spec) {
      findQuery._sort = spec;
      return run();
    },
    then(resolve, reject) {
      return run().then(resolve, reject);
    },
  };
}
Script.find = (query = {}) => findQuery(query);
Script.findById = async (id) => {
  const doc = store.find((d) => d._id === id);
  return doc ? toJSON(doc) : null;
};
Script.create = async (data) => {
  const doc = {
    _id: String(seq++),
    title: data.title || "Untitled script",
    content: data.content || "",
    status: data.status || "idea",
    tags: data.tags || [],
    notes: {
      titleIdeas: [],
      thumbnailNotes: "",
      seoTags: [],
      hooks: "",
      ...(data.notes || {}),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.push(doc);
  return toJSON(doc);
};
Script.findByIdAndUpdate = async (id, data) => {
  const doc = store.find((d) => d._id === id);
  if (!doc) return null;
  Object.assign(doc, data, { updatedAt: new Date().toISOString() });
  return toJSON(doc);
};
Script.findByIdAndDelete = async (id) => {
  const idx = store.findIndex((d) => d._id === id);
  if (idx === -1) return null;
  const [doc] = store.splice(idx, 1);
  return toJSON(doc);
};
Script.distinct = async (field) => {
  const all = store.flatMap((d) => d[field] || []);
  return [...new Set(all)];
};

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/scripts", scriptsRouter);
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api/scripts`;

  const req = (method, path, body) =>
    new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const url = new URL(base + path);
      const r = http.request(
        url,
        { method, headers: { "Content-Type": "application/json" } },
        (res) => {
          let chunks = "";
          res.on("data", (c) => (chunks += c));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(chunks || "null") });
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });

  let failures = 0;
  function assert(cond, msg) {
    if (!cond) {
      failures++;
      console.error("FAIL:", msg);
    } else {
      console.log("ok:", msg);
    }
  }

  const created = await req("POST", "", {
    title: "My first video",
    content: "Hello world this is a script",
    status: "draft",
    tags: ["shorts", "tutorial"],
    notes: { titleIdeas: ["A", "B"], hooks: "grab them fast" },
  });
  assert(created.status === 201, "create returns 201");
  assert(created.body.wordCount === 6, "wordCount computed (" + created.body.wordCount + ")");
  const id = created.body._id;

  const got = await req("GET", "/" + id);
  assert(got.status === 200 && got.body.title === "My first video", "get by id");

  const list = await req("GET", "?search=first");
  assert(list.status === 200 && list.body.length === 1, "search filter works");

  const byStatus = await req("GET", "?status=draft");
  assert(byStatus.status === 200 && byStatus.body.length === 1, "status filter works");

  const tags = await req("GET", "/tags");
  assert(tags.status === 200 && tags.body.includes("shorts"), "distinct tags works (route ordering vs /:id is correct)");

  const stats = await req("GET", "/stats");
  assert(stats.status === 200 && stats.body.totalScripts === 1, "stats totalScripts");
  assert(stats.body.byStatus.draft === 1, "stats byStatus.draft");

  const updated = await req("PUT", "/" + id, { status: "published" });
  assert(updated.status === 200 && updated.body.status === "published", "update status");

  const del = await req("DELETE", "/" + id);
  assert(del.status === 200 && del.body.success === true, "delete works");

  const afterDelete = await req("GET", "/" + id);
  assert(afterDelete.status === 404, "get after delete returns 404");

  server.close();
  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} SMOKE TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

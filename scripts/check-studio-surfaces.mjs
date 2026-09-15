// Run with Node 22 or newer. Measures actual Three.js geometry without WebGL.
import assert from "node:assert/strict";
import * as T from "../public/experience/vendor/three.module.min.js";

globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) };
const { createModelKit } = await import("../public/experience/studio-models.js");
const kit = createModelKit();
try {
  for (const height of [.05, .1, .25, .5, 1.3, 3]) {
    const model = kit.build({ id:"storage", kind:"storage", width_ft:2, length_ft:2, height }, ["#ffffff", "#aabbcc", "#ffdd00"]);
    const body = new T.Box3().setFromObject(model.getObjectByName("storage-body"));
    const lid = new T.Box3().setFromObject(model.getObjectByName("storage-lid"));
    assert(lid.min.y - body.max.y > .009, `Storage body/lid must not overlap at height ${height}`);
    assert(Math.abs(lid.max.y - height) < .00001, "The model must keep its requested height");
  }
  for (const height of [1, 2.5, 3.5]) {
    const desk = kit.build({ id:"desk", kind:"desk", width_ft:4, length_ft:2, height }, ["#ffffff"]);
    const top = new T.Box3().setFromObject(desk.children[4]);
    for (const leg of desk.children.slice(0,4)) {
      assert(top.min.y - new T.Box3().setFromObject(leg).max.y > .015, "Table legs must end below the underside of the tabletop");
    }
  }
  console.log("PASS: storage lids and tabletops have separated surfaces while preserving model heights.");
} finally {
  kit.dispose();
  delete globalThis.document;
}

// Run with Node 22 or newer. Measures actual Three.js geometry without WebGL.
import assert from "node:assert/strict";
import * as T from "../public/experience/vendor/three.module.min.js";

globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, stroke(){}, ellipse(){}, fill(){}, bezierCurveTo(){} }) }) };
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
  const bunk=kit.build({id:"bunk",kind:"bunk",width_ft:3.17,length_ft:6.67,height:5.7},["#ffffff"]);
  const lower=new T.Box3().setFromObject(bunk.getObjectByName("mattress-0"));
  const upper=new T.Box3().setFromObject(bunk.getObjectByName("mattress-1"));
  assert(upper.min.y-lower.max.y>2,"Bunks need two separated sleeping levels");
  assert(bunk.getObjectByName("bunk-ladder"));assert(bunk.getObjectByName("bunk-guardrail"));
  assert(new T.Box3().setFromObject(bunk.getObjectByName("bunk-guardrail")).min.y>upper.max.y,"Upper guardrail belongs above the mattress");
  for(const [kind,variant] of [["lamp","banker"],["lamp","mushroom"],["lamp","task"],["lamp","lava"],["lamp","projector"],["lamp","shade"],["mirror","arch"],["mirror","round"],["basket","woven"],["hamper","plain"],["blanket","knit"],["curtains","plain"],["wall-shelf","plain"],["fan","plain"],["organizer","plain"],["power-strip","plain"],["lights","curtain"]]){
    const model=kit.build({id:kind,kind,width_ft:1.5,length_ft:.8,height:2,product:{id:kind+variant,variant,pattern:"check"}},["#fff9ed","#ac8e78"]);
    const bounds=new T.Box3().setFromObject(model);
    assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),`${kind}/${variant} must have finite geometry`);
    assert(!model.getObjectByName("storage-body"),`${kind} must not fall back to a generic storage box`);
  }
  console.log("PASS: bunk mattresses, ladder, rails, and distinct product geometry across lamp, textile, storage and accessory variants.");
} finally {
  kit.dispose();
  delete globalThis.document;
}

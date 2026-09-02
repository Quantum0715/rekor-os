// The detection library (@huggingface/transformers) is browser-only: it seeds a
// random generator at module scope, which the server runtime forbids in global
// scope and which crashed every SSR request. The SSR build aliases the package
// to this stub so it can never be evaluated on the server; the real package is
// dynamically imported only in the browser.
function unavailable(): never {
  throw new Error("@huggingface/transformers is browser-only and unavailable on the server");
}

export const pipeline = unavailable;
export const env = {} as Record<string, unknown>;
export const RawImage = {
  fromCanvas: unavailable,
};
export const AutoModel = { from_pretrained: unavailable };
export const AutoProcessor = { from_pretrained: unavailable };

export default { pipeline, env, RawImage, AutoModel, AutoProcessor };

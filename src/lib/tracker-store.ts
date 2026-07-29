// Simple module-scope singleton to carry the uploaded File between routes
// without needing global state libs. Cleared after the /track page consumes it.

let currentFile: File | null = null;
let currentName: string | null = null;

export const trackerStore = {
  setFile(f: File) {
    currentFile = f;
    currentName = f.name;
  },
  getFile() {
    return currentFile;
  },
  getName() {
    return currentName;
  },
  clear() {
    currentFile = null;
    currentName = null;
  },
};
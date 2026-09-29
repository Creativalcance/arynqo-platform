// Accept stored paths or legacy URLs only from this project's private CV buckets.
export function cvStorageLocation(value: string, userId: string, projectUrl: string) {
  let bucket = "student-cvs";
  let path = value;
  if (/^https?:/i.test(value)) {
    const url = new URL(value);
    if (url.origin !== new URL(projectUrl).origin || url.search || url.hash) throw new Error("CV inválido.");
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated)\/(student-cvs|cvs)\/(.+)$/);
    if (!match) throw new Error("CV inválido.");
    bucket = match[1];
    path = decodeURIComponent(match[2]);
  }
  if (!path.startsWith(`${userId}/`) || path.split("/").some(part => !part || part === "." || part === "..") || /[\\\x00-\x1f]/.test(path)) {
    throw new Error("CV inválido.");
  }
  if (!/\.(pdf|docx)$/i.test(path)) throw new Error("Formato de CV inválido.");
  return { bucket, path };
}

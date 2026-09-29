import assert from "node:assert/strict";
import { test } from "node:test";
import { cvStorageLocation } from "../lib/cv-storage";
import { GET } from "../app/api/candidates/[id]/cv/route";
const user = "00000000-0000-0000-0000-000000000001";
const project = "https://project.supabase.co";
test("CV references stay within this project and candidate folder", () => {
 assert.deepEqual(cvStorageLocation(`${user}/cv.pdf`,user,project), { bucket:"student-cvs",path:`${user}/cv.pdf` });
 assert.equal(cvStorageLocation(`${project}/storage/v1/object/public/cvs/${user}/cv.docx`,user,project).bucket,"cvs");
 for(const value of [`https://evil.invalid/${user}/cv.pdf`,`other/cv.pdf`,`${user}/../cv.pdf`,`${user}/cv.html`,`${project}/storage/v1/object/public/company-logos/${user}/cv.pdf`,`${user}/cv\\.pdf`]) {
  assert.throws(()=>cvStorageLocation(value,user,project));
 }
});
test("CV download requires authentication", async () => {
 const response = await GET(new Request(`https://example.invalid/api/candidates/${user}/cv`), {params:Promise.resolve({id:user})});
 assert.equal(response.status,401);
});

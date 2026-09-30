import assert from "node:assert/strict";
import {test} from "node:test";
import {safeReturnPath} from "../lib/seo";
import {jobPostingSchema,serializeStructuredData} from "../lib/job-schema";
test("login continuation accepts only vacancy paths",()=>{
 const path="/vagas/807bd038-6b6d-4eaf-97df-e00274a6a544";
 assert.equal(safeReturnPath(path),path);
 for(const value of [null,"//evil.example","https://evil.example","/api/admin","/vagas/../admin",`${path}?next=https://evil.example`])assert.equal(safeReturnPath(value),"/dashboard");
});
test("job markup needs real employer, description and confirmed geography",()=>{
 const job={id:"123",title:"Marketing",description:"Função de marketing",created_at:"2026-09-30",location:"Coimbra",work_model:"presential",work_mode:null,company_profiles:{company_name:"Empresa exemplo"}};
 assert.equal(jobPostingSchema(job)?.jobLocation.address.addressCountry,"PT");
 assert.equal(jobPostingSchema({...job,company_profiles:null}),null);
 assert.equal(jobPostingSchema({...job,location:"Springfield"}),null);
 assert.equal(jobPostingSchema({...job,work_model:"remote"}),null);
 assert.equal(jobPostingSchema({...job,description:null}),null);
});
test("untrusted vacancy content cannot close the structured-data script",()=>{
 const encoded=serializeStructuredData({description:"</script><script>alert(1)</script>"});
 assert.ok(!encoded.includes("<"));
 assert.equal(JSON.parse(encoded).description,"</script><script>alert(1)</script>");
});

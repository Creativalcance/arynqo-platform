import {test} from "node:test";
import assert from "node:assert/strict";
import {jobLocations,matchesJobLocation} from "../lib/job-location-filter";
const jobs=[{location:" Coimbra ",country_code:"PT"},{location:"coimbra",country_code:"PT"},{location:"Évora",country_code:"PT"},{location:"Coimbra",country_code:"BR"},{location:"Porto",country_code:null},{location:null,country_code:"PT"}];
test("location choices are deduplicated and scoped to the selected country",()=>{
 assert.deepEqual(jobLocations(jobs,"PT","pt").map(x=>x.value),["coimbra","evora"]);
 assert.deepEqual(jobLocations(jobs,"BR","pt").map(x=>x.value),["coimbra"]);
 assert.equal(jobLocations(jobs,"DE","de").length,0);
});
test("country and location combine without guessing missing countries; clearing restores all",()=>{
 assert.equal(jobs.filter(j=>matchesJobLocation(j,"PT","coimbra")).length,2);
 assert.equal(jobs.filter(j=>matchesJobLocation(j,"","coimbra")).length,3);
 assert.equal(jobs.filter(j=>matchesJobLocation(j,"PT","evora")).length,1);
 assert.equal(jobs.filter(j=>matchesJobLocation(j,"PT","porto")).length,0);
 assert.equal(jobs.filter(j=>matchesJobLocation(j,"","")).length,jobs.length);
});

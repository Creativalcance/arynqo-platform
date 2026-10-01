import assert from "node:assert/strict";
import {test} from "node:test";
import {passwordRecoveryError} from "../lib/password-recovery";

test("same password and password strength errors permit retry without a new recovery email",()=>{
  const same=passwordRecoveryError({code:"same_password",status:422});
  assert.match(same.message,/diferente da atual/);assert.equal(same.needsNewLink,false);
  const weak=passwordRecoveryError({code:"weak_password",status:422});
  assert.match(weak.message,/requisitos de segurança/);assert.equal(weak.needsNewLink,false);
});
test("expired recovery sessions request a new link but rate limits and service errors do not",()=>{
  for(const code of ["session_not_found","bad_jwt","otp_expired","reauthentication_needed"])assert.equal(passwordRecoveryError({code}).needsNewLink,true);
  assert.equal(passwordRecoveryError({status:401}).needsNewLink,true);
  for(const error of [{status:429},{code:"over_request_rate_limit"}]){
    const feedback=passwordRecoveryError(error);assert.match(feedback.message,/Aguarda/);assert.equal(feedback.needsNewLink,false);
  }
  assert.equal(passwordRecoveryError({status:500}).needsNewLink,false);
  assert.equal(passwordRecoveryError().needsNewLink,false);
});
test("recovery messages are translated in all five additional languages without changing retry rules",()=>{
  for(const locale of ["en","fr","es","de","it"]){
    for(const error of [{code:"same_password"},{code:"weak_password"},{status:429},{code:"otp_expired"},{status:500}]){
      const pt=passwordRecoveryError(error);const translated=passwordRecoveryError(error,locale);
      assert.notEqual(translated.message,pt.message);assert.equal(translated.needsNewLink,pt.needsNewLink);
    }
  }
  assert.deepEqual(passwordRecoveryError({code:"same_password"},"unknown"),passwordRecoveryError({code:"same_password"},"pt"));
});

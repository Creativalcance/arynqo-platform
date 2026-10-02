import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { accountOperationInput, administerAccount } from '../lib/account-administration';
import { duplicateRegistration } from '../lib/registration-result';
import { ApiError, type ApiActor } from '../lib/api-auth';
const adminId = '10000000-0000-0000-0000-000000000001';
const targetId = '20000000-0000-0000-0000-000000000001';
const input = { userId: targetId, action: 'delete', reason: 'Test deletion', confirmation: 'test@example.invalid' };
const actor = { id: adminId, role: 'admin' } as ApiActor;
test('duplicate signups distinguish hidden duplicates, explicit errors and new users', () => {
  assert.equal(duplicateRegistration({user:{identities:[]}},null),true);
  assert.equal(duplicateRegistration({}, {code:'user_already_exists'}),true);
  assert.equal(duplicateRegistration({}, {message:'User already registered'}),true);
  assert.equal(duplicateRegistration({user:{identities:[{id:'new'}]}},null),false);
  assert.equal(duplicateRegistration({user:null}, {code:'over_email_send_rate_limit'}),false);
});
test('only admins can act and cannot mutate themselves; validates destructive input', () => {
  for (const role of ['student','company'] as const) assert.throws(() => accountOperationInput({...actor,role},input), (e: unknown) => e instanceof ApiError && e.status===403);
  for (const change of [{userId:adminId},{userId:'bad'},{action:'promote'},{reason:'x'},{confirmation:null}]) assert.throws(() => accountOperationInput(actor,{...input,...change}));
});
function mockDb(failStorage=false, beginError: unknown=null) {
 const calls: string[]=[]; let removed=false;
 const db={
  async rpc(name:string,args:Record<string,unknown>){ calls.push(name + (name==='finish_account_operation' ? ':'+args.p_success : ''));
   if(name==='begin_account_operation')return {data:beginError?null:'operation',error:beginError};
   if(name==='admin_files')return {data:{total:removed?0:1,rows:removed?[]:[{bucket_id:'student-cvs',name:targetId+'/cv.pdf'}]},error:null};
   return {error:null}; },
  auth:{admin:{ async updateUserById(){calls.push('ban');return {error:null};},async deleteUser(){calls.push('delete');return {error:null};}}},
  storage:{from(){return {async remove(){calls.push('storage');removed=true;return {error:failStorage?{message:'failed'}:null};}};}}
 } as unknown as SupabaseClient;
 return {db,calls};
}
test('deletion blocks access, removes files, then Auth, and records success',async()=>{
 const {db,calls}=mockDb();await administerAccount(db,actor,input);
 assert.deepEqual(calls,['begin_account_operation','ban','admin_files','storage','admin_files','delete','finish_account_operation:true']);
});
test('storage failure preserves blocked account and never deletes Auth or reports success',async()=>{
 const {db,calls}=mockDb(true);await assert.rejects(administerAccount(db,actor,input), /acesso continua bloqueado/);
 assert.ok(!calls.includes('delete'));assert.equal(calls.at(-1),'finish_account_operation:false');
});
test('database rejects protected accounts and concurrent changes before external side effects',async()=>{
 for(const code of ['42501','55P03','55000']){const {db,calls}=mockDb(false,{code});await assert.rejects(administerAccount(db,actor,input));assert.deepEqual(calls,['begin_account_operation']);}
});

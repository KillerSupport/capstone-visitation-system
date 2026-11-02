import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoginChallenge, readLoginChallenge } from '../backend/login-challenge.ts';
import { deliverMessage, pendingContact, loginContact, appointmentConfirmation, DeliveryUnavailable } from '../backend/messaging.ts';

test('sign-in challenges expire, reject modifications, and bind to a specific user',()=>{
 const token=createLoginChallenge('42','test-secret',1000);
 assert.equal(readLoginChallenge(token,'test-secret',2000)?.userId,'42');
 assert.equal(readLoginChallenge(token,'another-secret',2000),null);
 assert.equal(readLoginChallenge(token,'test-secret',601000),null);
 const [payload,signature]=token.split('.');
 const altered=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(payload,'base64url').toString()),userId:'99'})).toString('base64url');
 assert.equal(readLoginChallenge(`${altered}.${signature}`,'test-secret',2000),null);
 assert.equal(readLoginChallenge('invalid','test-secret',2000),null);
 assert.notEqual(createLoginChallenge('42','test-secret',1000),token);
});
test('mobile-only visitors and visitors with both contacts use SMS; supplied contacts are verified separately',()=>{
 assert.equal(loginContact({mobileNumber:'+639171234567'})?.channel,'sms');
 const user={email:'visitor@example.invalid',mobileNumber:'+639171234567',emailVerified:false,phoneVerified:false};
 assert.equal(pendingContact(user)?.channel,'sms');
 assert.equal(pendingContact({...user,phoneVerified:true})?.channel,'email');
 assert.equal(pendingContact({...user,phoneVerified:true,emailVerified:true}),null);
 assert.equal(loginContact({...user,emailVerified:true,phoneVerified:true})?.channel,'sms');
 assert.equal(loginContact({email:'visitor@example.invalid'})?.channel,'email');
});
test('SMS mock is explicit and cannot operate in production; Twilio acceptance and failures are distinguished',async()=>{
 const saved={...process.env},originalFetch=globalThis.fetch;
 try {
  process.env.SMS_PROVIDER='mock';process.env.NODE_ENV='test';
  assert.equal((await deliverMessage({channel:'sms',destination:'09171234567'},'Test','Synthetic message')).status,'MOCK');
  process.env.NODE_ENV='production';
  await assert.rejects(()=>deliverMessage({channel:'sms',destination:'09171234567'},'Test','Synthetic message'),DeliveryUnavailable);
  process.env.SMS_PROVIDER='twilio';process.env.SMS_ACCOUNT_ID='ACtest';process.env.SMS_AUTH_TOKEN='fake-token';process.env.SMS_FROM='+15005550006';delete process.env.SMS_API_URL;
  globalThis.fetch=async(input,options)=>{
   assert.equal(String(input),'https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
   assert.equal(new URLSearchParams(String(options?.body)).get('To'),'+639171234567');
   assert.equal(options?.redirect,'error');
   return new Response(JSON.stringify({sid:'SMtest',status:'queued'}),{status:201});
  };
  assert.deepEqual(await deliverMessage({channel:'sms',destination:'09171234567'},'Test','Synthetic message'),{status:'ACCEPTED',providerId:'SMtest'});
  globalThis.fetch=async()=>new Response(JSON.stringify({message:'Rejected'}),{status:400});
  await assert.rejects(()=>deliverMessage({channel:'sms',destination:'09171234567'},'Test','Synthetic message'));
  globalThis.fetch=async()=>new Response(JSON.stringify({sid:'SMtest',status:'failed'}),{status:201});
  await assert.rejects(()=>deliverMessage({channel:'sms',destination:'09171234567'},'Test','Synthetic message'));
  await assert.rejects(()=>deliverMessage({channel:'sms',destination:'bad phone'},'Test','Synthetic message'));
 } finally {globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
test('approval confirmation identifies the date, time and reference and excludes PDL details',()=>{
 const message=appointmentConfirmation({visitDate:'2030-01-01',timeSlot:'Morning Batch',appointmentReference:'TEST-001',pdlName:'Private PDL Name'});
 for(const value of ['confirmed','2030-01-01','Morning Batch','TEST-001','fingerprint'])assert.ok(message.includes(value));
 assert.equal(message.includes('Private PDL Name'),false);
});

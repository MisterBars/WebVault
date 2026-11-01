import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../src/WebVault.Web/assets/js/application.js',import.meta.url),'utf8');
const begin=source.indexOf("onSubmit('loginForm',"),end=source.indexOf("onSubmit('setupForm',",begin);
assert.ok(begin>=0&&end>begin,'Login handler bounds missing');const executable=source.slice(begin,end);
function fixture({checked=false,missing=false,required=false,rejectLogin=false,rejectMe=false,deferred=false}={}){
 const calls=[],entered=[],form={elements:{login:{value:'tester'},password:{value:'synthetic password '}}};if(!missing)form.elements.rememberUntilDayEnd={checked};let handler,release;
 const storage=new Proxy({},{get(){throw Error('Unexpected Web Storage access');}});
 const context={onSubmit(id,fn){assert.equal(id,'loginForm');handler=fn;},async api(url,data){calls.push({url,data:data===null?null:JSON.parse(JSON.stringify(data))});if(url==='api/auth/login.ashx'){if(rejectLogin)throw Error('invalid_login_or_password');if(deferred)await new Promise(r=>release=r);return {ok:true};}assert.equal(url,'api/auth/me.ashx');if(rejectMe)throw Error('request_failed');return {ok:true,user:{id:7,mustChangePassword:required},csrfToken:'fixture-csrf'};},enter(body,password){entered.push({body,password});return Promise.resolve('entered');},localStorage:storage,sessionStorage:storage};
 vm.runInNewContext(executable,context);return {form,calls,entered,run:()=>handler(form),release:()=>release()};
}
test('unchecked choice sends JSON boolean false and retains login sequence',async()=>{const f=fixture();assert.equal(await f.run(),'entered');assert.equal(f.calls[0].data.rememberUntilDayEnd,false);assert.equal(typeof f.calls[0].data.rememberUntilDayEnd,'boolean');assert.deepEqual(f.calls.map(c=>c.url),['api/auth/login.ashx','api/auth/me.ashx']);});
test('checked choice sends true and does not send a client deadline or role',async()=>{const f=fixture({checked:true});await f.run();assert.equal(f.calls[0].data.rememberUntilDayEnd,true);assert.deepEqual(Object.keys(f.calls[0].data).sort(),['login','password','rememberUntilDayEnd']);});
test('cached old HTML without checkbox safely uses normal mode',async()=>{const f=fixture({missing:true});await f.run();assert.equal(f.calls[0].data.rememberUntilDayEnd,false);assert.equal(f.entered.length,1);});
test('successful login clears password field and next-login choice',async()=>{const f=fixture({checked:true});await f.run();assert.equal(f.form.elements.password.value,'');assert.equal(f.form.elements.rememberUntilDayEnd.checked,false);assert.equal(f.calls[0].data.password,'synthetic password ');});
test('temporary password still reaches the mandatory-change path only',async()=>{const f=fixture({required:true,checked:true});await f.run();assert.equal(f.entered[0].password,'synthetic password ');assert.equal(f.entered[0].body.user.mustChangePassword,true);assert.equal(f.form.elements.password.value,'');});
test('ordinary account does not receive proof password in enter',async()=>{const f=fixture({checked:true});await f.run();assert.equal(f.entered[0].password,undefined);});
test('login failure neither requests me nor enters an account',async()=>{const f=fixture({checked:true,rejectLogin:true});await assert.rejects(f.run(),/invalid_login_or_password/);assert.equal(f.calls.length,1);assert.equal(f.entered.length,0);assert.equal(f.form.elements.rememberUntilDayEnd.checked,true);});
test('me failure after login cannot enter an account',async()=>{const f=fixture({checked:true,rejectMe:true});await assert.rejects(f.run(),/request_failed/);assert.equal(f.calls.length,2);assert.equal(f.entered.length,0);assert.equal(f.form.elements.password.value,'');assert.equal(f.form.elements.rememberUntilDayEnd.checked,false);});
test('choice is captured at submit and not changed by edits during request',async()=>{const f=fixture({checked:true,deferred:true});const pending=f.run();f.form.elements.rememberUntilDayEnd.checked=false;f.release();await pending;assert.equal(f.calls[0].data.rememberUntilDayEnd,true);});

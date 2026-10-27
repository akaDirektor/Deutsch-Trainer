const issuer='https://token.actions.githubusercontent.com',audience='deutsch-trainer-feedback';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function createGitHubVerifier(request=fetch,cryptoApi=crypto){
 let keys=[],expires=0,refreshed=0;
 return async token=>{
  if(typeof token!=='string'||token.length>16000)throw Error('Invalid identity');
  const parts=token.split('.');if(parts.length!==3)throw Error('Invalid identity');
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Date.now()/1000;
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200||claims.iss!==issuer||!(claims.aud===audience||Array.isArray(claims.aud)&&claims.aud.includes(audience))||!Number.isFinite(claims.exp)||claims.exp<=now-30||!Number.isFinite(claims.iat)||claims.iat>now+30||now-claims.iat>600||claims.nbf!=null&&claims.nbf>now+30)throw Error('Invalid identity');
  if(claims.repository_id!=='1426592291'||claims.repository!=='akaDirektor/Deutsch-Trainer'||claims.ref!=='refs/heads/main'||claims.workflow_ref!=='akaDirektor/Deutsch-Trainer/.github/workflows/translation-feedback.yml@refs/heads/main'||!['schedule','workflow_dispatch','push'].includes(claims.event_name))throw Error('Untrusted workflow');
  if(expires<Date.now()||!keys.some(k=>k.kid===header.kid)&&Date.now()-refreshed>60000){const r=await request(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Identity unavailable');const data=await r.json();keys=Array.isArray(data.keys)?data.keys:[];refreshed=Date.now();expires=refreshed+300000;}
  const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw Error('Unknown identity key');
  const key=await cryptoApi.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await cryptoApi.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');return claims;
 };
}

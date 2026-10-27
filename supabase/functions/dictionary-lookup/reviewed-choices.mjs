// Manually reviewed source meanings, not an automated LEO integration.
// Source read on 2026-10-27: https://dict.leo.org/russisch-deutsch/Ausschuss
// LEO lists комитет, комиссия, брак. Ukrainian renderings below are editorial
// translations of those meanings, not a claim that LEO has a Ukrainian dictionary.
export function reviewedChoices(term){
 const key=term.replace(/^(der|die|das)\s+/i,'').toLocaleLowerCase('de').trim();
 if(key!=='ausschuss')return [];
 return ['комітет','комісія','виробничий брак'].map(text=>({text,provider:'LEO',automatic:false,editorialTranslation:true,sourceUrl:'https://dict.leo.org/russisch-deutsch/Ausschuss',reviewedAt:'2026-10-27'}));
}

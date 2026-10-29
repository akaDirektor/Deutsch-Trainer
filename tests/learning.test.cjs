const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function helpers(){const c=vm.createContext({});vm.runInContext(fs.readFileSync('progress.js','utf8'),c);return c.Progress;}
test('3 matching, 2 choice and 2 writing successes accumulate across errors; context stays optional',()=>{
 const P=helpers(),st={correct:0,wrong:0,streak:0,mastered:false,legacy:{keep:7}};for(const ok of [true,false,true,false,true])st.learningV2=P.recordLearning(st,'matching',ok);assert.equal(P.learning(st).matchingCorrect,3);assert.equal(P.learning(st).ready,true);assert.equal(P.learning(st).learned,false);
 for(const ok of [true,false,true])st.learningV2=P.recordLearning(st,'choice',ok);assert.equal(P.learning(st).choiceCorrect,2);assert.equal(P.learning(st).learned,false);
 for(const ok of [true,false,true])st.learningV2=P.recordLearning(st,'writing',ok);assert.equal(P.learning(st).writingCorrect,2);assert.equal(P.learning(st).learned,true);assert.equal(st.contextCorrect,undefined);assert.equal(st.legacy.keep,7);
 st.learningV2=P.recordLearning(st,'writing',false);assert.equal(P.learning(st).learned,true);assert.equal(st.learningV2.writingCorrect,2);assert.equal(st.learningV2.writingWrong,2);
});
test('legacy readiness and old written recall carry forward without resetting any old fields or granting choice credit',()=>{
 const P=helpers(),st={correct:17,wrong:3,streak:0,mastered:true,recallCorrect:4,recallWrong:2,verbWriteCorrect:9,pendingArticle:false,custom:{keep:8}},before=JSON.stringify(st),v=P.learning(st);assert.equal(v.matchingCorrect,3);assert.equal(v.writingCorrect,4);assert.equal(v.choiceCorrect,0);assert.equal(v.learned,false);assert.equal(JSON.stringify(st),before);
 assert.equal(P.learning({correct:100,streak:2}).matchingCorrect,2);assert.equal(P.learning({correct:100,streak:0,articleWrong:20}).matchingCorrect,0);
 st.learningV2=P.recordLearning(st,'choice',true);st.learningV2=P.recordLearning(st,'choice',true);assert.equal(P.learning(st).learned,true);assert.equal(st.correct,17);assert.equal(st.recallCorrect,4);assert.equal(st.custom.keep,8);
});
test('later stages cannot be awarded early and malformed imported stage metadata is rejected',()=>{
 const P=helpers();assert.throws(()=>P.recordLearning({},'choice',true));assert.throws(()=>P.recordLearning({mastered:true},'writing',true));assert.throws(()=>P.recordLearning({},'unknown',true));assert.throws(()=>P.recordLearning({},'matching','yes'));
 const good=P.recordLearning({},'matching',true);for(const bad of [{...good,version:3},{...good,choiceCorrect:-1},{...good,writingWrong:1.5},{...good,matchingCorrect:Infinity}])assert.throws(()=>P.validate({schema:1,stats:{word:{learningV2:bad}},hidden:[],cycle:{seen:[]}}));
 const state={schema:1,stats:{word:{correct:8,learningV2:good,unknown:{keep:7}}},hidden:['word'],cycle:{seen:['word'],scopes:{old:{seen:['word']}}}};assert.equal(JSON.stringify(P.validate(state)),JSON.stringify(state));
});
test('written answers normalize native handwriting text but require exact spelling, umlauts and noun articles',()=>{
 const P=helpers();assert(P.writtenMatches('  DIE   Kenntnis ',['die Kenntnis']));assert(P.writtenMatches('SCHREIBEN',['schreiben']));assert(P.writtenMatches('обовʼязок',['обов\'язок']));assert(P.writtenMatches('können',['ko\u0308nnen']));assert(!P.writtenMatches('konnen',['können']));assert(!P.writtenMatches('Kenntnis',['die Kenntnis']));assert(!P.writtenMatches('',['schreiben']));assert(!P.writtenMatches('falsch',['richtig']));
});


test('German writing accepts lexical forms without grammar annotations while keeping reflexivity and noun articles',()=>{
 const P=helpers();assert(P.writtenMatches('einstellen',P.germanWritingForms('jdn. einstellen')));assert(P.writtenMatches('bestehen',P.germanWritingForms('(eine Prüfung) bestehen')));assert(P.writtenMatches('sich brechen',P.germanWritingForms('sich (etw.) brechen')));assert(!P.writtenMatches('brechen',P.germanWritingForms('sich (etw.) brechen')));assert(P.writtenMatches('sich halten in',P.germanWritingForms('sich halten in + Dat.')));assert(P.writtenMatches('die Regel',P.germanWritingForms('die (gesetzliche) Regel')));assert(!P.writtenMatches('Regel',P.germanWritingForms('die (gesetzliche) Regel')));assert(P.writtenMatches('sich ändern',P.germanWritingForms('(sich) ändern')));assert(P.writtenMatches('änderte hat geändert',['änderte · hat geändert']));
});

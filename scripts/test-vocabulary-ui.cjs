const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
function load(path,extras={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React}}).outputText,{module:m,exports:m.exports,...extras});return m.exports;}
const flash=load('src/core/flashcards.ts'),frames=load('src/core/sentenceFrames.ts');const core=load('src/core/vocabularyTest.ts',{require:name=>name==='./flashcards'?flash:frames});
const note={id:'quiet',shiftDay:1,englishTemplate:'quiet',koreanMeaning:'한산한',expressionKind:'word',slotExamples:[]};
function harness(expected='quiet',frameNote){
 const learningNote=frameNote || {...note,englishTemplate:expected,expressionKind:expected.includes(' ')?'phrase':'word'};
 const slots=[],effects=[];let cursor=0,version=0,tree,calls=0,reject=false,category='incorrect';
 const records=[],question={noteId:note.id,signature:core.questionSignature(learningNote),kind:learningNote.expressionKind,korean:'카페가 한산해요.',prefix:'The cafe is ',suffix:'.',answer:expected,...(frameNote?{prefilled:core.framePrefilledWords(frameNote.englishTemplate,expected)}:{})};
 const store={testQuestions:{quiet:question},testProgress:{},cacheTestQuestion(){},recordTestAnswer:(...args)=>records.push(args)};
 const useGameStore=selector=>selector?selector(store):store;useGameStore.getState=()=>store;
 const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;version++;}}];},useRef:initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useMemo:fn=>{cursor++;return fn();},useEffect:(fn,deps)=>{const i=cursor++,previous=effects[i];if(!previous || deps.some((value,j)=>value!==previous.deps[j])){previous?.cleanup?.();effects[i]={deps,fn,pending:true};}}};
 const rn=Object.fromEntries(['ActivityIndicator','KeyboardAvoidingView','Pressable','ScrollView','Text','TextInput','View'].map(name=>[name,name]));rn.Platform={OS:'web'};rn.Keyboard={dismiss(){}};rn.StyleSheet={create:value=>value};
 const api={...core,classifyTestAnswer:async()=>{calls++;if(reject)throw new Error('network');return category;}};
 const component=load('src/components/VocabularyTest.tsx',{require:name=>name==='./InlineTestAnswer'?{InlineTestAnswer:'InlineTestAnswer'}:name==='react'?{__esModule:true,default:react,...react}:name==='react-native'?rn:name.includes('/flashcards')?flash:name.includes('/vocabularyTest')?api:name.includes('/gameStore')?{useGameStore}:name==='./design'?{palette:{ink:'#111',paper:'#fff',cream:'#eee',muted:'#888',line:'#ddd',coral:'#a00'}}:{DayPicker:'DayPicker'},AbortController,setTimeout,clearTimeout}).VocabularyTest;
 function render(){for(let count=0;count<20;count++){const before=version;cursor=0;tree=component({notes:[learningNote],initialKind:frameNote?'frame':learningNote.expressionKind,onClose(){}});effects.forEach(effect=>{if(effect?.pending){effect.pending=false;effect.cleanup=effect.fn();}});if(before===version)return tree;}throw new Error('render loop');}
 function nodes(value=tree){if(Array.isArray(value))return value.flatMap(nodes);if(!value || typeof value!=='object')return [];return [value,...nodes(value.props?.children)];}
 function text(value){if(Array.isArray(value))return value.map(text).join('');if(value==null || typeof value==='boolean')return '';if(typeof value!=='object')return String(value);if(value.type==='InlineTestAnswer')return core.answerWords(value.props.question.answer).map((word,index)=>value.props.solved[index] || value.props.complete?word:core.progressiveBlankPrompt(word,0,[value.props.revealed[index] || 0])).join(' ');return text(value.props?.children);}
 function button(label){const found=nodes().find(n=>n.type==='Pressable' && text(n)===label);assert.ok(found,`button ${label}`);return found.props;}
 function input(){const props=nodes().find(n=>n.type==='InlineTestAnswer').props;return {onChangeText:props.onChange,onSubmitEditing:props.onSubmit};}
 render();button('테스트 시작').onPress();render();
 return {render,button,input,inline:()=>nodes().find(n=>n.type==='InlineTestAnswer').props,select:index=>nodes().find(n=>n.type==='InlineTestAnswer').props.onSelect(index),text:()=>text(tree),records,calls:()=>calls,setReject:value=>reject=value,setCategory:value=>category=value,dispose:()=>effects.forEach(effect=>effect?.cleanup?.())};
}
(async()=>{
 const frameNote={...note,learningKind:'frame',englishTemplate:"It's such a [상태] day outside.",frame:{slotHint:'형용사',variations:[]}};
 let f=harness("It's such a sunny day outside.",frameNote);
 assert.equal(f.inline().solved[3],true);f.select(3);f.render();assert.equal(f.inline().activeIndex,0);
 f.input().onChangeText("It's such a ");f.render();assert.equal(f.inline().activeIndex,4);assert.equal(f.records.length,0);
 f.input().onChangeText('day outside');f.render();assert.equal(f.records.length,1);assert.equal(f.records[0][2],'correct');assert.equal(f.calls(),0);f.dispose();
 let h=harness();h.button('힌트 보기').onPress();h.render();assert.match(h.text(),/q____/);assert.match(h.text(),/0 \/ 1/);
 h.button('힌트 보기').onPress();h.render();assert.match(h.text(),/qu___/);assert.match(h.text(),/0 \/ 1/);
 h.input().onChangeText('quiet');h.render();assert.equal(h.records.length,1);assert.equal(h.records[0][2],'assisted');assert.equal(h.records[0][3],true);assert.match(h.text(),/0 \/ 1/);
 h.button('다음 →').onPress();h.render();assert.match(h.text(),/다시 보기/);assert.match(h.text(),/_____/); // Same note ID must reset hints on retry.
 h.input().onChangeText('quiet');h.render();assert.equal(h.records[1][2],'correct');assert.equal(h.records[1][3],false);assert.equal(h.calls(),0);assert.match(h.text(),/1 \/ 1/);
 h.button('결과 보기').onPress();h.render();assert.match(h.text(),/테스트 완료/);h.dispose();
 h=harness();h.input().onChangeText('wrong');h.render();h.input().onSubmitEditing();await new Promise(setImmediate);h.render();
 assert.match(h.text(),/뜻을 다시 확인/);assert.match(h.text(),/q____/);assert.equal(h.records.length,0);assert.equal(h.calls(),1);
 h.input().onChangeText('wrong');h.render();h.input().onSubmitEditing();await new Promise(setImmediate);h.render();assert.match(h.text(),/qu___/);assert.match(h.text(),/0 \/ 1/);
 h.input().onChangeText('quiet');h.render();assert.equal(h.records.length,1);assert.equal(h.records[0][2],'incorrect');assert.equal(h.records[0][3],true);h.dispose();
 for(const category of ['equivalent','awkward']){
   h=harness();h.setCategory(category);h.input().onChangeText('alternative');h.render();h.input().onSubmitEditing();await new Promise(setImmediate);h.render();
   assert.ok(h.text().includes(core.ANSWER_FEEDBACK[category].text));assert.match(h.text(),/q____/);assert.equal(h.records.length,0);h.dispose();
 }
 h=harness();
 for(let i=0;i<3;i++){h.button('힌트 보기').onPress();h.render();}
 assert.match(h.text(),/정답을 확인했어요/);assert.equal(h.records.length,1);assert.equal(h.records[0][2],'revealed');assert.match(h.text(),/0 \/ 1/);
 h.button('다음 →').onPress();h.render();h.button('힌트 보기').onPress();h.render();assert.match(h.text(),/q____/);assert.equal(h.records.length,1);h.dispose();
 h=harness();h.button('힌트 보기').onPress();h.render();h.input().onChangeText('wrong');h.render();h.input().onSubmitEditing();await new Promise(setImmediate);h.render();
 assert.equal(h.records.length,0);assert.match(h.text(),/qu___/);
 h.button('힌트 보기').onPress();h.render();assert.match(h.text(),/정답을 확인했어요/);assert.equal(h.records.length,1);assert.equal(h.records[0][2],'incorrect');h.dispose();
 h=harness('tell someone about it');h.select(3);h.render();h.input().onChangeText('it');h.render();
 assert.equal(h.inline().solved[3],true);assert.equal(h.inline().activeIndex,0);assert.equal(h.records.length,0);
 h.input().onChangeText('tel');h.render();h.select(2);h.render();h.input().onChangeText('about');h.render();
 assert.equal(h.inline().solved[2],true);assert.equal(h.inline().activeIndex,0);assert.equal(h.inline().value,'tel');
 h.select(3);h.render();assert.equal(h.inline().activeIndex,0);assert.equal(h.inline().solved[3],true); // Correct cells stay locked.
 h.input().onChangeText('tell');h.render();assert.equal(h.inline().activeIndex,1);h.input().onChangeText('someone');h.render();assert.equal(h.records.length,1);assert.equal(h.records[0][2],'correct');h.dispose();
 h=harness();h.setReject(true);h.input().onChangeText('wrong');h.render();h.input().onSubmitEditing();await new Promise(setImmediate);h.render();
 assert.match(h.text(),/다시 확인/);assert.match(h.text(),/0 \/ 1/);assert.equal(h.records.length,0);assert.ok(!h.text().includes('q____'));h.dispose();
 console.log('PASS: actual test UI retries hinted/incorrect items once, resets same-ID retries, records mistakes after correction and ignores network failures');
})().catch(error=>{console.error(error);process.exitCode=1;});

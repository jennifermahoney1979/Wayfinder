const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {makeClassroom} = require('../.sites-runtime/verification/lib/seed.js');
const {applyAction} = require('../.sites-runtime/verification/lib/actions.js');
const {rankedActivities,sessionSummary} = require('../.sites-runtime/verification/lib/model.js');
const ui=require('../.sites-runtime/verification/app/student.js');
const Teacher=require('../.sites-runtime/verification/app/teacher.js').default;
const now='2026-10-15T16:00:00.000Z';
let s=makeClassroom();
const untouched=JSON.stringify(s.learners[1]);
s=applyAction(s,{type:'preferences',learnerId:'alex',interests:['music'],pairs:[{left:'music',right:'art',choice:'music'}],format:'passage'},now);
assert.equal(rankedActivities(s,s.learners[0])[0].id,'music-math');
assert.equal(JSON.stringify(s.learners[1]),untouched);
assert.equal(rankedActivities(s,s.learners[0]).length,8);
assert.throws(()=>applyAction(s,{type:'preferences',learnerId:'alex',interests:[],pairs:[{left:'space',right:'nature',choice:'games'}],format:'steps'},now));
s=applyAction(s,{type:'board',learnerId:'alex',first:{activityId:'space-math',title:'Mission'},then:{title:'Building'},goalSeconds:30,rewardSeconds:30,trigger:'time'},now);
assert.throws(()=>applyAction(s,{type:'boardAdvance',learnerId:'alex',expectedStage:'first'},now));
s=applyAction(s,{type:'timer',learnerId:'alex',boardVersion:now,phase:'first',elapsed:29},now);
assert.equal(s.learners[0].board.stage,'first');
s=applyAction(s,{type:'timer',learnerId:'alex',boardVersion:now,phase:'first',elapsed:29},now);
assert.equal(s.learners[0].board.workElapsed,29,'A repeated timer save must not add time twice.');
s=applyAction(s,{type:'timer',learnerId:'alex',boardVersion:now,phase:'first',elapsed:30},now);
assert.equal(s.learners[0].board.stage,'then');
assert.equal(s.learners[0].board.rewardElapsed,0,'Reward timer must not start itself.');
s=applyAction(s,{type:'timer',learnerId:'alex',boardVersion:now,phase:'then',elapsed:30},now);
assert.equal(s.learners[0].board.stage,'done');
s=applyAction(s,{type:'board',learnerId:'alex',first:{activityId:'space-math',title:'Mission'},then:{title:'Building'},goalSeconds:60,rewardSeconds:60,trigger:'activity'},'2026-10-15T16:01:00.000Z');
assert.equal(s.learners[0].board.workElapsed,0);
assert.throws(()=>applyAction(s,{type:'timer',learnerId:'alex',boardVersion:now,phase:'first',elapsed:30},now));
s=applyAction(s,{type:'start',learnerId:'alex',activityId:'space-math',sessionId:'session-1'},now);
const originalTitle=s.sessions[0].activity.title;
s=applyAction(s,{type:'saveActivity',activity:{...s.activities[0],title:'Teacher updated mission'}},now);
assert.equal(s.sessions[0].activity.title,originalTitle,'Editing content must not change an existing learning record.');
assert.throws(()=>applyAction(s,{type:'answer',sessionId:'session-1',index:0,choice:3},now));
s=applyAction(s,{type:'answer',sessionId:'session-1',index:0,choice:0},now);
s=applyAction(s,{type:'answer',sessionId:'session-1',index:0,choice:1},now);
s=applyAction(s,{type:'next',sessionId:'session-1',index:0},now);
s=applyAction(s,{type:'next',sessionId:'session-1',index:1},now);
s=applyAction(s,{type:'answer',sessionId:'session-1',index:2,choice:1},now);
s=applyAction(s,{type:'next',sessionId:'session-1',index:2},now);
assert.deepEqual(sessionSummary(s.sessions[0]),{firstCorrect:1,answered:2,skipped:1,total:3});
assert.ok(s.sessions[0].completedAt);
assert.equal(s.learners[0].board.stage,'then','Activity-based plan advances on completion.');
s=applyAction(s,{type:'rating',sessionId:'session-1',rating:'no'},now);
assert.equal(s.sessions[0].rating,'no');
assert.throws(()=>applyAction(s,{type:'next',sessionId:'session-1',index:2},now));
assert.throws(()=>applyAction(s,{type:'board',learnerId:'alex',first:{title:'Work'},then:{title:'Reward'},goalSeconds:-1,rewardSeconds:60,trigger:'time'},now));
s=applyAction(s,{type:'toggleActivity',activityId:'space-math',active:false},now);
assert.equal(rankedActivities(s,s.learners[0]).length,7);
assert.throws(()=>applyAction(s,{type:'start',learnerId:'sam',activityId:'space-math',sessionId:'session-2'},now));
assert.equal(JSON.stringify(s.learners[1]),untouched);
const noop=()=>{},save=async()=>null;
const l=s.learners[0];
const screens=[
  ['student home',React.createElement(ui.StudentHome,{state:s,learner:l,go:noop,onStart:noop})],
  ['preferences',React.createElement(ui.PreferencesView,{learner:l,save,saving:false,onDone:noop})],
  ['activities',React.createElement(ui.ActivitiesView,{state:s,learner:l,onStart:noop})],
  ['First → Then',React.createElement(ui.FirstThenView,{learner:l,activities:s.activities,elapsed:0,running:false,onTimer:noop,onPause:noop,onStart:noop,save,saving:false,onAdvance:noop})],
  ['completed session',React.createElement(ui.SessionView,{session:s.sessions[0],format:'steps',save,saving:false,speak:noop,onBack:noop,onPlan:noop})],
  ['progress',React.createElement(ui.ProgressView,{state:s,learner:l,onResume:noop})],
  ['teacher',React.createElement(Teacher,{snapshot:{state:s,revision:1,updatedAt:now},save,saving:false,refresh:noop,onPreview:noop})],
];
for(const [name,component] of screens){const html=renderToStaticMarkup(component);assert.ok(html.length>100,`${name} should render`);assert.ok(!html.includes('[object Object]'));}
console.log('PASS: preference matching, learner isolation, time and activity reward triggers, timer idempotency, stale-plan rejection, teacher content snapshots, first-attempt and skip records, validation, archived activities, and seven screen renders.');

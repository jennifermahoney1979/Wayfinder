import { z } from "zod";
import { Activity, Classroom } from "./model";

const id=z.string().min(1).max(100);
const topic=z.enum(["space","nature","music","games","art","everyday"]);
const question=z.object({prompt:z.string().trim().min(1).max(600),options:z.array(z.string().trim().min(1).max(300)).min(2).max(4),correct:z.number().int().min(0).max(3),hint:z.string().trim().min(1).max(600),explanation:z.string().trim().min(1).max(800)}).refine(q=>q.correct<q.options.length,"Choose a valid correct answer.");
const activity=z.object({id,title:z.string().trim().min(1).max(100),description:z.string().trim().min(1).max(200),topic,subject:z.enum(["Math","Reading","Science","Life skills"]),level:z.string().trim().min(1).max(60),reading:z.string().trim().min(1).max(5000),questions:z.array(question).min(1).max(10),active:z.boolean()});
const item=z.object({activityId:id.optional(),title:z.string().trim().min(1).max(120)});
export const actionSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("preferences"),learnerId:id,interests:z.array(topic).max(6),pairs:z.array(z.object({left:topic,right:topic,choice:z.string().max(20)})).max(3),format:z.enum(["steps","passage"])}),
  z.object({type:z.literal("board"),learnerId:id,first:item,then:item,goalSeconds:z.number().int().min(30).max(3600),rewardSeconds:z.number().int().min(30).max(1800),trigger:z.enum(["time","activity"])}),
  z.object({type:z.literal("timer"),learnerId:id,boardVersion:z.string().nullable(),phase:z.enum(["first","then"]),elapsed:z.number().min(0).max(3600)}),
  z.object({type:z.literal("boardAdvance"),learnerId:id,expectedStage:z.enum(["first","then"])}),
  z.object({type:z.literal("saveActivity"),activity}),
  z.object({type:z.literal("toggleActivity"),activityId:id,active:z.boolean()}),
  z.object({type:z.literal("learner"),learnerId:id,name:z.string().trim().min(1).max(40),note:z.string().max(2000),assignments:z.array(id).max(30)}),
  z.object({type:z.literal("start"),learnerId:id,activityId:id,sessionId:id}),
  z.object({type:z.literal("answer"),sessionId:id,index:z.number().int().min(0).max(9),choice:z.number().int().min(0).max(3)}),
  z.object({type:z.literal("next"),sessionId:id,index:z.number().int().min(0).max(9)}),
  z.object({type:z.literal("rating"),sessionId:id,rating:z.enum(["yes","maybe","no"])}),
]);
export type Action=z.infer<typeof actionSchema>;
export function applyAction(previous:Classroom,input:unknown,now=new Date().toISOString()):Classroom {
  const a=actionSchema.parse(input); const s=structuredClone(previous);
  const learner="learnerId" in a?s.learners.find(l=>l.id===a.learnerId):undefined;
  if("learnerId" in a&&!learner) throw new Error("Learner was not found.");
  switch(a.type){
    case "preferences": {
      if(a.pairs.some(p=>p.left===p.right||![p.left,p.right,"both","neither","skip"].includes(p.choice))) throw new Error("That preference choice is not valid.");
      learner!.preferences={interests:[...new Set(a.interests)],pairs:a.pairs,format:a.format,updatedAt:now}; break;
    }
    case "board": {
      for(const part of [a.first,a.then]) if(part.activityId&&!s.activities.some(x=>x.id===part.activityId&&x.active)) throw new Error("Choose an available activity.");
      learner!.board={first:a.first,then:a.then,goalSeconds:a.goalSeconds,rewardSeconds:a.rewardSeconds,trigger:a.trigger,stage:"first",workElapsed:0,rewardElapsed:0,updatedAt:now}; break;
    }
    case "timer": {
      const b=learner!.board;
      if((b.updatedAt??null)!==a.boardVersion) throw new Error("The teacher updated this plan. Use the new timer settings.");
      if(b.stage!==a.phase) break;
      if(a.phase==="first") { b.workElapsed=Math.max(b.workElapsed,Math.min(a.elapsed,b.goalSeconds)); if(b.workElapsed>=b.goalSeconds&&b.trigger==="time") {b.stage="then";b.completionSource="learning time";} }
      else {b.rewardElapsed=Math.max(b.rewardElapsed,Math.min(a.elapsed,b.rewardSeconds)); if(b.rewardElapsed>=b.rewardSeconds){b.stage="done";b.completedAt=now;}}
      break;
    }
    case "boardAdvance": {
      const b=learner!.board;
      if(b.stage!==a.expectedStage) throw new Error("This plan has already moved on. Refresh to see the current step.");
      if(b.stage==="first"&&b.trigger==="time"&&b.workElapsed<b.goalSeconds) throw new Error("Learning time is still running. You can pause or take a break anytime.");
      if(b.stage==="first"){ b.stage="then";b.completionSource="marked finished by learner"; } else {b.stage="done";b.completedAt=now;}
      break;
    }
    case "saveActivity": {const i=s.activities.findIndex(x=>x.id===a.activity.id);const saved={...a.activity,updatedAt:now} as Activity;if(i<0)s.activities.push(saved);else s.activities[i]=saved;break;}
    case "toggleActivity": {const act=s.activities.find(x=>x.id===a.activityId);if(!act)throw new Error("Activity was not found.");act.active=a.active;act.updatedAt=now;break;}
    case "learner": {if(a.assignments.some(id=>!s.activities.some(x=>x.id===id&&x.active)))throw new Error("Choose available activities for assignments.");Object.assign(learner!,{name:a.name,note:a.note,assignments:[...new Set(a.assignments)]});break;}
    case "start": {
      if(s.sessions.some(x=>x.id===a.sessionId))break;
      const act=s.activities.find(x=>x.id===a.activityId&&x.active);if(!act)throw new Error("This activity is no longer available.");
      if(s.sessions.some(x=>x.learnerId===a.learnerId&&!x.completedAt&&x.activity.id===act.id))throw new Error("Resume the activity already in progress.");
      s.sessions.push({id:a.sessionId,learnerId:a.learnerId,activity:structuredClone(act),startedAt:now,index:0,answers:act.questions.map(()=>({attempts:[],skipped:false,finished:false}))});break;
    }
    case "answer": {
      const run=s.sessions.find(x=>x.id===a.sessionId); if(!run||run.completedAt||a.index!==run.index)throw new Error("This question has changed. Reopen the activity.");
      const q=run.activity.questions[a.index],answer=run.answers[a.index];
      if(a.choice>=q.options.length)throw new Error("Choose one of the answers shown.");
      if(answer.finished)break;
      answer.attempts.push(a.choice);if(a.choice===q.correct)answer.finished=true; break;
    }
    case "next": {
      const run=s.sessions.find(x=>x.id===a.sessionId);if(!run||run.completedAt||a.index!==run.index)throw new Error("This question has changed. Reopen the activity.");
      const answer=run.answers[run.index];answer.skipped=!answer.finished;answer.finished=true;
      if(run.index<run.activity.questions.length-1)run.index++;
      else {run.completedAt=now;const l=s.learners.find(x=>x.id===run.learnerId)!;if(l.board.stage==="first"&&l.board.trigger==="activity"&&l.board.first.activityId===run.activity.id){l.board.stage="then";l.board.completionSource="activity completed";}}
      break;
    }
    case "rating": {const run=s.sessions.find(x=>x.id===a.sessionId);if(!run?.completedAt)throw new Error("Complete the activity before rating it.");run.rating=a.rating;break;}
  }
  return s;
}

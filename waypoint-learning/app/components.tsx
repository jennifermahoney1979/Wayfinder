"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Orbit, Leaf, Music2, Gamepad2, Palette, ShoppingBag, ArrowRight, X, Check, BookOpen } from "lucide-react";
import { Activity, Learner, Topic, topics, preferenceScore } from "../lib/model";
export function TopicIcon({topic,size=24}:{topic:string;size?:number}){const C=({space:Orbit,nature:Leaf,music:Music2,games:Gamepad2,art:Palette,everyday:ShoppingBag} as Record<string,typeof Orbit>)[topic]??BookOpen;return <C size={size} strokeWidth={1.65} aria-hidden="true"/>;}
export function topicColor(topic:string){return topics.find(t=>t.id===topic)?.color??"sage";}
export function minutes(seconds:number){return Number.isInteger(seconds/60)?`${seconds/60} min`:`${seconds} sec`;}
export function clock(seconds:number){const s=Math.max(0,Math.ceil(seconds));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
export function dateLabel(date?:string){return date?new Date(date).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"Sample preference";}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null);const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const old=document.activeElement as HTMLElement;const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";ref.current?.querySelector<HTMLElement>("button,input,select,textarea,[tabindex]")?.focus();const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close.current();if(e.key==="Tab"){const all=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[]).filter(x=>x.offsetParent!==null);const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=previousOverflow;old?.focus();};},[]);
  return <div className="modal-backdrop"><div className={`modal ${wide?"wide":""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22}/></button></div>{children}</div></div>;
}
export function TopicArt({topic}:{topic:Topic}){
  return <div className={`topic-art ${topicColor(topic)}`} aria-hidden="true"><span className="art-orbit one"/><span className="art-orbit two"/><div className="art-center"><TopicIcon topic={topic} size={49}/></div><span className="art-dot d1"/><span className="art-dot d2"/><span className="art-square"/></div>;
}
export function ActivityCard({activity,learner,onStart,assigned=false}:{activity:Activity;learner:Learner;onStart:(a:Activity)=>void;assigned?:boolean}){
  const matched=preferenceScore(activity,learner)>0;
  return <article className="activity-card"><div className="card-art"><TopicArt topic={activity.topic}/><span className="subject-badge">{activity.subject}</span></div><div className="card-content"><div className="card-meta">{activity.questions.length} questions <span>·</span> {activity.level}</div><h3>{activity.title}</h3><p>{activity.description}</p><div className="card-match">{assigned?<><Check size={14}/> Chosen by your teacher</>:matched?<><Check size={14}/> Matches your choices</>:<><BookOpen size={14}/> Something to explore</>}</div><button className="card-button" onClick={()=>onStart(activity)}>Open activity <ArrowRight size={18}/></button></div></article>;
}
export function EmptyState({title,children}:{title:string;children:ReactNode}){return <div className="empty-state"><BookOpen size={30} strokeWidth={1.5}/><h3>{title}</h3><p>{children}</p></div>;}

import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { classrooms } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { makeClassroom } from "../../../lib/seed";
import { applyAction } from "../../../lib/actions";
import { ZodError } from "zod";

export const dynamic="force-dynamic";
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
async function getRow(ownerId:string){
  const db=getDb();let rows=await db.select().from(classrooms).where(eq(classrooms.ownerId,ownerId)).limit(1);
  if(!rows.length){await db.insert(classrooms).values({ownerId,state:JSON.stringify(makeClassroom()),revision:0,updatedAt:new Date().toISOString()}).onConflictDoNothing(); rows=await db.select().from(classrooms).where(eq(classrooms.ownerId,ownerId)).limit(1);}
  return rows[0];
}
export async function GET(){
  const user=await getChatGPTUser();if(!user)return respond({error:"Sign in to open your private prototype."},401);
  try{const row=await getRow(user.userId);return respond({state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updatedAt});}catch{return respond({error:"Your classroom could not be loaded. Please try again."},503);}
}
export async function PATCH(request:Request){
  const user=await getChatGPTUser();if(!user)return respond({error:"Sign in to save changes."},401);
  const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return respond({error:"This request could not be verified."},403);
  try{
    const raw=await request.text();if(raw.length>100000)return respond({error:"This update is too large."},413);
    const body=JSON.parse(raw);if(!Number.isInteger(body.revision)||body.revision<0)return respond({error:"Refresh before saving."},400);
    const row=await getRow(user.userId);if(row.revision!==body.revision)return respond({error:"This classroom changed on another screen. Refresh and try your change again."},409);
    const now=new Date().toISOString(),state=applyAction(JSON.parse(row.state),body.action,now);
    const changed=await getDb().update(classrooms).set({state:JSON.stringify(state),revision:row.revision+1,updatedAt:now}).where(and(eq(classrooms.ownerId,user.userId),eq(classrooms.revision,row.revision))).returning({revision:classrooms.revision});
    if(!changed.length)return respond({error:"Another update was saved first. Refresh and try again."},409);
    return respond({state,revision:changed[0].revision,updatedAt:now});
  }catch(error){if(error instanceof ZodError)return respond({error:error.issues[0]?.message??"Check the fields and try again."},400);if(error instanceof SyntaxError)return respond({error:"The update could not be read."},400);if(error instanceof Error&&!/SQL|D1|binding|database/i.test(error.message))return respond({error:error.message},400);return respond({error:"Changes could not be saved. Please try again."},503);}
}

import {NextResponse} from "next/server";
import {currentUserId} from "@/lib/session";
import {prisma} from "@/lib/db";
import {isPlanDate,tasks} from "@/lib/domain";
import {z} from "zod";import {syncDailySummaries} from "@/lib/accounting";
const backupSchema=z.object({version:z.literal(1),data:z.object({tasks:z.array(z.any()).default([]),journals:z.array(z.any()).default([]),sleep:z.array(z.any()).default([]),recoveries:z.array(z.any()).default([]),gainLedger:z.array(z.any()).default([]),excuses:z.array(z.any()).default([])}).passthrough()});
export async function POST(req:Request){
 const id=await currentUserId();if(!id)return NextResponse.json({error:"Sign in to continue."},{status:401});
 try{
  const body=await req.json();
  if(body.action==="export"){
   const data=await Promise.all([prisma.dailyTask.findMany({where:{userId:id}}),prisma.journalEntry.findMany({where:{userId:id}}),prisma.sleepRecord.findMany({where:{userId:id}}),prisma.gainLedger.findMany({where:{userId:id}}),prisma.excuseLedger.findMany({where:{userId:id}}),prisma.recoveryRecord.findMany({where:{userId:id}})]);
   return NextResponse.json({version:1,exportedAt:new Date().toISOString(),data:{tasks:data[0],journals:data[1],sleep:data[2],gainLedger:data[3],excuses:data[4],recoveries:data[5]}});
  }
  const checked=backupSchema.parse(body.data);const {tasks:taskRows,journals,sleep,recoveries,gainLedger,excuses}=checked.data;
  for(const row of taskRows){if(!isPlanDate(row.date)||!tasks.some(t=>t.id===row.taskId)||!Number.isInteger(row.actualMinutes)||row.actualMinutes<0||row.actualMinutes>1440||!['pending','completed','missed','partial'].includes(row.status))throw Error("Backup has an invalid task record.");}
  for(const row of journals){if(!isPlanDate(row.date)||typeof row.reflection!=="string")throw Error("Backup has an invalid journal record.");}
  for(const row of sleep){if(!isPlanDate(row.date)||!Number.isInteger(row.durationMinutes)||row.durationMinutes<0||row.durationMinutes>1440)throw Error("Backup has an invalid sleep record.");}
  for(const row of recoveries){if(!isPlanDate(row.date)||!isPlanDate(row.missedDate)||!tasks.some(t=>t.id===row.taskId)||!Number.isInteger(row.minutes)||row.minutes<0||row.minutes>1440)throw Error("Backup has an invalid recovery record.");}
  for(const row of gainLedger){if(!isPlanDate(row.date)||!['gain','correction','excuse'].includes(row.type)||!Number.isInteger(row.minutes)||row.minutes<1||typeof row.description!=="string")throw Error("Backup has an invalid gain ledger record.");}
  for(const row of excuses){if(!isPlanDate(row.date)||typeof row.hours!=="number"||row.hours<=0||typeof row.reason!=="string")throw Error("Backup has an invalid excuse record.");}
  if(body.action==="preview"){
   const [existingTasks,existingJournals,existingSleep]=await Promise.all([prisma.dailyTask.findMany({where:{userId:id},select:{date:true,taskId:true}}),prisma.journalEntry.findMany({where:{userId:id},select:{date:true}}),prisma.sleepRecord.findMany({where:{userId:id},select:{date:true}})]);
   const conflicts=taskRows.filter(r=>existingTasks.some(x=>x.date===r.date&&x.taskId===r.taskId)).length+journals.filter(r=>existingJournals.some(x=>x.date===r.date)).length+sleep.filter(r=>existingSleep.some(x=>x.date===r.date)).length;
   return NextResponse.json({preview:{tasks:taskRows.length,journals:journals.length,sleep:sleep.length,recoveries:recoveries.length,gainLedger:gainLedger.length,excuses:excuses.length,conflicts},message:"Validated. Choose whether to keep existing records or replace matching dates."});
  }
  if(body.action==="import"){
   const strategy=z.enum(["keep-existing","replace-matches"]).parse(body.strategy);let imported=0,skipped=0;
   for(const r of taskRows){const where={userId_date_taskId:{userId:id,date:r.date,taskId:r.taskId}};const exists=await prisma.dailyTask.findUnique({where,select:{id:true}});if(exists&&strategy==="keep-existing"){skipped++;continue;}const data={date:r.date,taskId:r.taskId,status:r.status,actualMinutes:r.actualMinutes,actualStart:typeof r.actualStart==="string"?r.actualStart:null,actualEnd:typeof r.actualEnd==="string"?r.actualEnd:null,content:typeof r.content==="string"?r.content.slice(0,4000):"",notes:typeof r.notes==="string"?r.notes.slice(0,4000):"",subject:typeof r.subject==="string"?r.subject.slice(0,120):null,focus:Number.isInteger(r.focus)&&r.focus>=1&&r.focus<=5?r.focus:null,difficulty:Number.isInteger(r.difficulty)&&r.difficulty>=1&&r.difficulty<=5?r.difficulty:null};await prisma.dailyTask.upsert({where,create:{...data,userId:id},update:data});imported++;}
   for(const r of journals){const where={userId_date:{userId:id,date:r.date}};const exists=await prisma.journalEntry.findUnique({where,select:{id:true}});if(exists&&strategy==="keep-existing"){skipped++;continue;}const data={reflection:String(r.reflection||"").slice(0,5000),topics:String(r.topics||"").slice(0,5000),achievements:String(r.achievements||"").slice(0,3000),problems:String(r.problems||"").slice(0,3000),tomorrowPlan:String(r.tomorrowPlan||"").slice(0,3000)};await prisma.journalEntry.upsert({where,create:{...data,userId:id,date:r.date},update:data});imported++;}
   for(const r of sleep){const where={userId_date:{userId:id,date:r.date}};const exists=await prisma.sleepRecord.findUnique({where,select:{id:true}});if(exists&&strategy==="keep-existing"){skipped++;continue;}const data={sleepTime:typeof r.sleepTime==="string"?r.sleepTime:null,wakeTime:typeof r.wakeTime==="string"?r.wakeTime:null,durationMinutes:r.durationMinutes,notes:typeof r.notes==="string"?r.notes.slice(0,2000):""};await prisma.sleepRecord.upsert({where,create:{...data,userId:id,date:r.date},update:data});imported++;}
   for(const r of recoveries){const exists=await prisma.recoveryRecord.findFirst({where:{userId:id,date:r.date,missedDate:r.missedDate,taskId:r.taskId,minutes:r.minutes,note:String(r.note||"")}});if(exists){skipped++;continue;}await prisma.recoveryRecord.create({data:{userId:id,date:r.date,missedDate:r.missedDate,taskId:r.taskId,minutes:r.minutes,note:String(r.note||"").slice(0,1000)}});imported++;}
   for(const r of gainLedger){const exists=await prisma.gainLedger.findFirst({where:{userId:id,date:r.date,type:r.type,minutes:r.minutes,description:String(r.description)}});if(exists){skipped++;continue;}await prisma.gainLedger.create({data:{userId:id,date:r.date,type:r.type,minutes:r.minutes,description:String(r.description).slice(0,1000),balanceAfter:Number.isInteger(r.balanceAfter)?r.balanceAfter:0}});imported++;}
   for(const r of excuses){const exists=await prisma.excuseLedger.findFirst({where:{userId:id,date:r.date,hours:r.hours,reason:String(r.reason),description:String(r.description||"")}});if(exists){skipped++;continue;}await prisma.excuseLedger.create({data:{userId:id,date:r.date,hours:r.hours,reason:String(r.reason).slice(0,80),description:String(r.description||"").slice(0,1000),gainBefore:Number(r.gainBefore)||0,gainAfter:Number(r.gainAfter)||0}});imported++;}
   await syncDailySummaries(id);return NextResponse.json({imported,skipped,strategy});
  }
  return NextResponse.json({error:"Unknown action."},{status:400});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Could not process backup."},{status:400});}
}

import {PrismaClient} from "@prisma/client";import {tasks} from "../lib/domain";
const db=new PrismaClient();
async function main(){for(const [order,t] of tasks.entries())await db.taskDefinition.upsert({where:{id:t.id},create:{id:t.id,title:t.title,category:t.category,startTime:t.start,endTime:t.end,plannedMinutes:t.minutes,requiresContent:true,order},update:{title:t.title,category:t.category,startTime:t.start,endTime:t.end,plannedMinutes:t.minutes,order}});console.log(`Seeded ${tasks.length} fixed routine definitions.`)}
main().finally(()=>db.$disconnect());

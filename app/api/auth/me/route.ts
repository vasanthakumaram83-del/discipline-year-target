import {NextResponse} from "next/server";import {currentUserId} from "@/lib/session";import {prisma} from "@/lib/db";
export async function GET(){const id=await currentUserId();if(!id)return NextResponse.json({user:null});const user=await prisma.user.findUnique({where:{id},select:{id:true,name:true,email:true,recoveryMode:true,allowNegativeGain:true}});return NextResponse.json({user});}

import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {compare,hash} from "bcryptjs";
import {signSession} from "@/lib/auth";
import {z} from "zod";

const schema=z.object({email:z.string().email().max(200),password:z.string().min(1).max(128)});

export async function POST(req:Request){
  try{
    const b=schema.parse(await req.json());
    const ownerEmail=process.env.OWNER_EMAIL?.trim().toLowerCase();
    const ownerPassword=process.env.OWNER_PASSWORD;
    if(!ownerEmail||!ownerPassword)return NextResponse.json({error:"Owner sign-in is not configured on this deployment."},{status:503});
    if(b.email.toLowerCase()!==ownerEmail||b.password!==ownerPassword)return NextResponse.json({error:"Email or password is incorrect."},{status:401});
    let user=await prisma.user.findUnique({where:{email:ownerEmail}});
    if(!user){
      try{user=await prisma.user.create({data:{email:ownerEmail,name:process.env.OWNER_NAME?.trim()||"Tracker Owner",passwordHash:await hash(ownerPassword,12)}})}
      catch{user=await prisma.user.findUnique({where:{email:ownerEmail}})}
    }
    if(!user)return NextResponse.json({error:"Could not initialize the owner account. Check the MongoDB connection."},{status:503});
    const res=NextResponse.json({user:{id:user.id,name:user.name,email:user.email}});
    res.cookies.set("tracker_session",signSession(user.id),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:2592000});
    return res;
  }catch{return NextResponse.json({error:"Please check your details and try again."},{status:400});}
}

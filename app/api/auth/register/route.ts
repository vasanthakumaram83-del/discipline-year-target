import {NextResponse} from "next/server";
export async function POST(){return NextResponse.json({error:"Public account creation is disabled."},{status:404});}

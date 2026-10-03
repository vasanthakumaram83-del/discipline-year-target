import {cookies} from "next/headers";import {verifySession} from "@/lib/auth";
export async function currentUserId(){return verifySession((await cookies()).get("tracker_session")?.value);}

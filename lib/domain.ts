export const PLAN_START = "2026-09-30";
export const PLAN_END = "2027-09-30";
export const PLAN_DAYS = 366;
export const STUDY_MINUTES_PER_DAY = 450;
export const tasks = [
 {id:"early",title:"Early Morning Study",category:"study",start:"04:00",end:"05:00",minutes:60,detail:"What did you study?"},
 {id:"run",title:"Running",category:"fitness",start:"05:00",end:"05:30",minutes:30,detail:"Route, distance or notes"},
 {id:"workout",title:"Workout",category:"fitness",start:"05:30",end:"05:45",minutes:15,detail:"Workout details"},
 {id:"yoga",title:"Yoga",category:"fitness",start:"05:45",end:"06:00",minutes:15,detail:"Practice or notes"},
 {id:"morning",title:"Morning Study",category:"study",start:"06:00",end:"07:00",minutes:60,detail:"Short study note"},
 {id:"current",title:"Current Affairs",category:"learning",start:null,end:null,minutes:30,detail:"What did you learn?"},
 {id:"evening",title:"Evening Study",category:"study",start:"16:00",end:"18:00",minutes:120,detail:"Detailed study notes"},
 {id:"evening2",title:"Evening Study",category:"study",start:"18:30",end:"19:30",minutes:60,detail:"Study notes"},
 {id:"english",title:"English Learning",category:"learning",start:"20:00",end:"20:30",minutes:30,detail:"Topics and notes"},
 {id:"night",title:"Night Study",category:"study",start:"20:30",end:"22:00",minutes:90,detail:"Detailed study notes"}
];
export function isPlanDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=PLAN_START&&date<=PLAN_END&&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;}
export function planDay(date:string){if(!isPlanDate(date))return null;return Math.floor((Date.parse(date+"T00:00:00Z")-Date.parse(PLAN_START+"T00:00:00Z"))/86400000)+1;}
export function planStatus(today:string){return today<PLAN_START?"not-started":today>PLAN_END?"ended":"active";}
export function progress(today:string){const st=planStatus(today);const completed=st==="not-started"?0:st==="ended"?PLAN_DAYS:planDay(today)!;return {status:st,completed,remaining:PLAN_DAYS-completed,percent:Math.round(completed/PLAN_DAYS*100)};}
export function computeAccounting(tasksToday:Array<{category:string;plannedMinutes:number;actualMinutes:number;status:string}>, pendingRecoveryMinutes=0){
 const scheduled=tasksToday.reduce((n,t)=>n+(t.category==="study"||t.category==="learning"?t.plannedMinutes:0),0);
 const actual=tasksToday.reduce((n,t)=>n+(t.category==="study"||t.category==="learning"?t.actualMinutes:0),0);
 const dueTasks=tasksToday.filter(t=>t.category==="study"||t.category==="learning");
 const missed=dueTasks.filter(t=>t.status==="missed"||t.status==="partial").reduce((n,t)=>n+Math.max(0,t.plannedMinutes-t.actualMinutes),0);
 const pending=Math.max(0,pendingRecoveryMinutes+missed);
 const gain=Math.max(0,actual-scheduled-pending);
 return {scheduled,actual,missed,pendingRecoveryMinutes:pending,gain};
}
export function recoveryDue(minutes:number,mode:"normal"|"strict"){return minutes*(mode==="strict"?2:1);}
export function spendGain(balance:number,hours:number){if(!Number.isFinite(hours)||hours<=0)throw new Error("Enter a positive number of hours.");if(hours*60>balance)throw new Error("Not enough available gain hours.");return balance-hours*60;}
export function dateRange(){return Array.from({length:PLAN_DAYS},(_,i)=>new Date(Date.parse(PLAN_START+"T00:00:00Z")+i*86400000).toISOString().slice(0,10));}

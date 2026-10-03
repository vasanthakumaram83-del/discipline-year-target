import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"daymark · Discipline Tracker",description:"A thoughtful daily routine and one-year discipline tracker."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

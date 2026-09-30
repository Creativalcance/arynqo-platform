import Client,{type AcademyPost} from "./AcademiaClient";
import {publicClient} from "@/lib/public-content";
export const dynamic="force-dynamic";
export default async function Page(){const {data,error}=await publicClient().from("academy_posts").select("id,title,slug,excerpt,category,audience,reading_time,featured,published_at").eq("status","published").order("published_at",{ascending:false});if(error)throw new Error("Não foi possível consultar os artigos.");return <Client initialPosts={(data||[]) as AcademyPost[]} />;}


"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Users, 
  ArrowLeft,
  Loader2,
  Sparkles,
  Target,
  School,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

export default function TeacherRankingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [etecRank, setEtecRank] = useState<any[]>([]);
  const [enemRank, setEnemRank] = useState<any[]>([]);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all attempts with profile info
      const { data: attempts, error } = await supabase
        .from('simulation_attempts')
        .select(`
          score,
          total_questions,
          created_at,
          profiles!inner (
            id,
            name,
            profile_type,
            institution,
            avatar_url
          )
        `);

      if (error) throw error;

      // Aggregate by user
      const userStats: Record<string, any> = {};
      
      attempts?.forEach((att: any) => {
        const profile = att.profiles;
        if (!userStats[profile.id]) {
          userStats[profile.id] = {
            id: profile.id,
            name: profile.name,
            type: profile.profile_type,
            institution: profile.institution,
            totalScore: 0,
            bestScore: 0,
            attempts: 0
          };
        }
        userStats[profile.id].totalScore += att.score;
        userStats[profile.id].bestScore = Math.max(userStats[profile.id].bestScore, att.score);
        userStats[profile.id].attempts += 1;
      });

      const allUsers = Object.values(userStats);
      
      // Sort and split
      const etec = allUsers
        .filter((u: any) => u.type === 'etec')
        .sort((a: any, b: any) => b.bestScore - a.bestScore)
        .slice(0, 10);

      const enem = allUsers
        .filter((u: any) => u.type === 'enem')
        .sort((a: any, b: any) => b.bestScore - a.bestScore)
        .slice(0, 10);

      setEtecRank(etec);
      setEnemRank(enem);
    } catch (err) {
      console.error("Ranking error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const RenderRankList = ({ data, title, color }: { data: any[], title: string, color: string }) => (
    <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden">
      <CardHeader className={`${color} p-8 text-white relative`}>
        <div className="absolute right-6 top-6 opacity-20">
            <Trophy className="h-16 w-16" />
        </div>
        <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Elite Performance</p>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">{title}</CardTitle>
            <CardDescription className="text-white/60 font-medium italic mt-2">Top 10 estudantes com as maiores pontuações em simulados.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="py-20 text-center opacity-20 italic font-bold">Aguardando dados de performance...</div>
          ) : (
            data.map((student, index) => (
              <div key={student.id} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all group">
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black italic shadow-lg relative ${
                    index === 0 ? 'bg-amber-400 text-amber-900' : 
                    index === 1 ? 'bg-slate-300 text-slate-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' : 'bg-white text-primary'
                  }`}>
                    {index + 1}
                    {index < 3 && <Medal className="h-4 w-4 absolute -top-2 -right-2 drop-shadow-sm" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-primary italic text-lg">{student.name}</span>
                        {index === 0 && <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                            <School className="h-3 w-3" /> {student.institution || 'Rede Municipal'}
                        </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Recorde</p>
                  <p className="text-2xl font-black text-primary italic mt-1">{student.bestScore} <span className="text-[10px] opacity-40">PTS</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Button asChild variant="ghost" className="rounded-full h-8 px-4 text-[10px] font-black uppercase text-primary/40 hover:text-primary mb-2">
            <Link href="/dashboard/teacher/home"><ArrowLeft className="h-3 w-3 mr-2" /> Voltar ao Painel</Link>
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter leading-none">Rankings de Elite</h1>
            <Badge className="bg-accent text-accent-foreground border-none font-black text-[10px] px-3 uppercase tracking-tighter">AUDITORIA VIVA</Badge>
          </div>
          <p className="text-muted-foreground font-medium text-lg italic">Classificação meritocrática baseada em performance técnica real.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-slate-100">
                <div className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                    <Target className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase leading-none">Atividade Global</p>
                    <p className="text-xl font-black text-primary italic mt-1">Calculando...</p>
                </div>
            </div>
        </div>
      </div>

      <Tabs defaultValue="etec" className="w-full">
        <div className="flex justify-center mb-10">
            <TabsList className="bg-white p-1.5 h-16 rounded-[2rem] shadow-xl border border-slate-100 gap-2">
                <TabsTrigger value="etec" className="rounded-full px-10 h-full font-black text-xs uppercase italic data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all">Ranking ETEC</TabsTrigger>
                <TabsTrigger value="enem" className="rounded-full px-10 h-full font-black text-xs uppercase italic data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">Ranking ENEM</TabsTrigger>
            </TabsList>
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse leading-none italic">Sincronizando Posições de Liderança...</p>
          </div>
        ) : (
          <>
            <TabsContent value="etec" className="animate-in fade-in slide-in-from-bottom-6 duration-500">
              <RenderRankList data={etecRank} title="Master ETEC 2024" color="bg-indigo-600" />
            </TabsContent>
            <TabsContent value="enem" className="animate-in fade-in slide-in-from-bottom-6 duration-500">
              <RenderRankList data={enemRank} title="Elite ENEM 2024" color="bg-purple-600" />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

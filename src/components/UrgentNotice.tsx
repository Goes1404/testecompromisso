"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, X, Megaphone } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

export function UrgentNotice() {
  const { user, profile } = useAuth();
  const [notice, setNotice] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchUrgent() {
      try {
        let query = supabase.from('announcements')
          .select('*')
          .eq('priority', 'high')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (profile) {
          query = query.or(`target_group.eq.all,target_group.eq.${profile?.profile_type},target_group.eq.${profile?.class_id}`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const latest = data[0];
          // if published in the last 24h
          const created = new Date(latest.created_at);
          const diffHour = (new Date().getTime() - created.getTime()) / (1000 * 3600);
          
          if (diffHour < 24) {
            const seenFlag = localStorage.getItem(`seen_urgent_${latest.id}`);
            if (!seenFlag) {
              setNotice(latest);
              // auto dismiss in 5s
              setTimeout(() => {
                setNotice(null);
                localStorage.setItem(`seen_urgent_${latest.id}`, 'true');
              }, 5000);
            }
          }
        } else if (error) {
           // fallback case if target_group fails
           const fallback = await supabase.from('announcements').select('*').eq('priority', 'high').order('created_at', { ascending: false }).limit(1);
           if (!fallback.error && fallback.data && fallback.data.length > 0) {
               const latest = fallback.data[0];
               const created = new Date(latest.created_at);
               if ((new Date().getTime() - created.getTime()) / (1000 * 3600) < 24) {
                   const seenFlag = localStorage.getItem(`seen_urgent_${latest.id}`);
                   if (!seenFlag) {
                       setNotice(latest);
                       setTimeout(() => {
                           setNotice(null);
                           localStorage.setItem(`seen_urgent_${latest.id}`, 'true');
                       }, 5000);
                   }
               }
           }
        }
      } catch (err) {}
    }

    fetchUrgent();
  }, [user, profile]);

  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-red-600/95 backdrop-blur-md animate-in fade-in zoom-in duration-500 overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      
      <button 
        onClick={() => {
            setNotice(null);
            localStorage.setItem(`seen_urgent_${notice.id}`, 'true');
        }} 
        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
      >
        <X className="h-8 w-8" />
      </button>

      <div className="flex flex-col items-center justify-center text-center max-w-4xl px-6 space-y-8 z-10">
        <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center shadow-2xl animate-bounce">
          <AlertOctagon className="h-16 w-16 text-red-600" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-2xl italic leading-tight">
          Aviso Urgente
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl md:text-4xl font-bold text-white/90">{notice.title}</h2>
          <p className="text-lg md:text-2xl font-medium text-white/80 max-w-2xl mx-auto italic">
            "{notice.message}"
          </p>
        </div>

        <div className="w-full bg-white/20 h-2 rounded-full mt-10 overflow-hidden">
          <div className="bg-white h-full animate-[progress_5s_linear_forwards]" />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />
    </div>
  );
}


"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ChevronRight, Loader2, Sparkles, UserCircle, Users, GraduationCap, AlertCircle, UserPlus, BookOpen, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured, isUsingSecretKeyInBrowser } from "@/app/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-black">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      {/* Importa e renderiza o formulário interativo como um Client Component */}
      <LoginForm />
    </div>
  );
}

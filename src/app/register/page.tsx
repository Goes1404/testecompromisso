
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, School, User, ArrowRight, Loader2, Mail, Lock, Sparkles, UserPlus, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { SCHOOL_LIST } from "@/lib/constants";

type Step = 1 | 2 | 3;
type ProfileType = "etec" | "enem";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [profileType, setProfileType] = useState<ProfileType>("etec");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/7/77/Santana_Parna%C3%ADba.PNG";

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    school: "",
    course: "",
    university: "",
    major: "",
    interests: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  const nextStep = () => {
    if (step === 1 && (!formData.email || !formData.password || !formData.firstName || !formData.lastName)) {
      toast({ title: "Dados Incompletos", description: "Nome, sobrenome, e-mail e senha são obrigatórios.", variant: "destructive" });
      return;
    }
    setStep((s) => (s + 1) as Step);
  };
  
  const prevStep = () => setStep((s) => (s - 1) as Step);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFinish = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({ variant: "destructive", title: "Dados Incompletos", description: "Preencha todos os campos obrigatórios." });
      return;
    }

    if (!isSupabaseConfigured) {
      toast({ variant: "destructive", title: "Erro de Configuração", description: "O sistema não está conectado ao banco de dados." });
      return;
    }

    setLoading(true);

    try {
      // PADRÃO CORPORATIVO: Nome de exibição é sempre Primeiro + Último
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // CONTROLE DE DUPLICIDADE: Username gerado inclui nome do meio se disponível para evitar conflitos
      const rawUsername = `${formData.firstName}${formData.middleName || ''}${formData.lastName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9]/g, ""); // remove caracteres especiais

      let institutionValue = "";
      let courseValue = "";

      if (profileType === 'etec') {
        institutionValue = formData.school || "ETEC";
        courseValue = formData.course;
      } else if (profileType === 'enem') {
        institutionValue = formData.university || "ENEM";
        courseValue = formData.major || "Vestibulando";
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            username: rawUsername,
            profile_type: profileType,
            institution: institutionValue,
            course: courseValue
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({ 
            title: "Conta já existe", 
            description: "Este e-mail já está cadastrado. Tente fazer login.", 
            variant: "default" 
          });
          router.push("/login");
          return;
        }
        throw authError;
      }

      toast({ 
        title: "Cadastro Realizado! 🚀", 
        description: "Seu perfil foi criado com sucesso. Redirecionando..." 
      });
      
      setTimeout(() => {
        window.location.href = "/dashboard/home";
      }, 1000);

    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      toast({ 
        title: "Falha no Cadastro", 
        description: err.message || "Ocorreu um erro no servidor.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-gradient p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <Button asChild className="bg-white text-primary hover:bg-white/90 font-black uppercase text-[10px] tracking-[0.2em] gap-2 rounded-xl shadow-2xl transition-all active:scale-95 border-none h-10 px-4 md:px-6">
          <Link href="/">
            <ChevronLeft className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">Voltar ao Início</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </Button>
      </div>

      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="space-y-4 text-center">
          <div className="relative h-20 w-20 mx-auto overflow-hidden rounded-2xl shadow-xl bg-white p-2">
            <Image 
              src={logoUrl} 
              alt="Logo Santana de Parnaíba" 
              fill 
              unoptimized
              className="object-contain p-1"
            />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 italic">
            Cadastro <span className="text-accent">Compromisso</span>
          </h1>
          <p className="text-white/70 text-lg font-medium italic">Sua rota de aprovação começa agora.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black text-white uppercase tracking-widest">
            <span>Passo {step} de 3: {step === 1 ? "Acesso" : step === 2 ? "Perfil" : "Detalhes"}</span>
            <span className="text-accent italic">{Math.round((step / 3) * 100)}%</span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2 bg-white/20 rounded-full overflow-hidden" />
        </div>

        <Card className="shadow-[0_30px_80px_rgba(0,0,0,0.1)] border-none overflow-hidden bg-white/95 backdrop-blur-md rounded-[3rem]">
          <CardHeader className="bg-primary/5 pb-8 pt-8 border-b border-dashed">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-3 italic">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground text-sm font-black shadow-lg">
                {step}
              </span>
              {step === 1 && "Credenciais de Acesso"}
              {step === 2 && "Escolha sua Categoria"}
              {step === 3 && "Configurações Acadêmicas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 min-h-[450px]">
             {step === 1 && (
              <div key="step1" className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-bold text-primary/60 ml-2">Nome</Label>
                    <Input id="firstName" placeholder="Seu nome" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName" className="font-bold text-primary/60 ml-2">Nome do Meio</Label>
                    <Input id="middleName" placeholder="Opcional" value={formData.middleName} onChange={(e) => updateField("middleName", e.target.value)} className="h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold text-primary/60 ml-2">Sobrenome</Label>
                    <Input id="lastName" placeholder="Seu sobrenome" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-primary/60 ml-2">E-mail</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input id="email" type="email" placeholder="nome@exemplo.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-12 h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" title="Senha" className="font-bold text-primary/60 ml-2">Senha de Segurança</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Mínimo 6 caracteres" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      className="pl-12 pr-12 h-12 bg-white/50 rounded-2xl border-muted/20" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
               <div key="step2" className="animate-in fade-in slide-in-from-right-4 duration-500">
                 <RadioGroup 
                  value={profileType} 
                  onValueChange={(v) => setProfileType(v as ProfileType)} 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div key="etec">
                    <Label
                      htmlFor="etec"
                      className={`flex flex-col items-center justify-center rounded-[2rem] border-4 p-8 hover:bg-white cursor-pointer transition-all h-full text-center group ${
                        profileType === "etec" ? "border-accent bg-white shadow-xl ring-8 ring-accent/5" : "border-transparent bg-white/50"
                      }`}
                    >
                      <RadioGroupItem value="etec" id="etec" className="sr-only" />
                      <div className={`p-6 rounded-2xl mb-4 transition-all shadow-md ${profileType === "etec" ? "bg-accent text-accent-foreground scale-110" : "bg-muted text-primary"}`}>
                        <School className="h-10 w-10" />
                      </div>
                      <p className="font-black text-primary italic leading-none text-lg">Aluno ETEC</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-3">Formação Técnica</p>
                    </Label>
                  </div>

                  <div key="enem">
                    <Label
                      htmlFor="enem"
                      className={`flex flex-col items-center justify-center rounded-[2rem] border-4 p-8 hover:bg-white cursor-pointer transition-all h-full text-center group ${
                        profileType === "enem" ? "border-accent bg-white shadow-xl ring-8 ring-accent/5" : "border-transparent bg-white/50"
                      }`}
                    >
                      <RadioGroupItem value="enem" id="enem" className="sr-only" />
                      <div className={`p-6 rounded-2xl mb-4 transition-all shadow-md ${profileType === "enem" ? "bg-accent text-accent-foreground scale-110" : "bg-muted text-primary"}`}>
                        <GraduationCap className="h-10 w-10" />
                      </div>
                      <p className="font-black text-primary italic leading-none text-lg">Aluno ENEM</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-3">Foco Vestibular</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div key="step3" className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {profileType === "etec" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school" className="font-bold text-primary/60 ml-2">Unidade Escolar / Polo</Label>
                      <Select value={formData.school} onValueChange={(v) => updateField("school", v)}>
                        <SelectTrigger className="h-12 bg-white/50 rounded-xl border-muted/20">
                          <SelectValue placeholder="Selecione sua escola..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl max-h-80">
                          {SCHOOL_LIST.map(school => (
                            <SelectItem key={school} value={school}>{school}</SelectItem>
                          ))}
                          <SelectItem value="Outra Rede">Outra Rede / Não Listada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course" className="font-bold text-primary/60 ml-2">Curso Atual ou Série</Label>
                      <Input id="course" placeholder="Ex: Informática ou 3º Ano Médio" value={formData.course} onChange={(e) => updateField("course", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}

                {profileType === "enem" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="university" className="font-bold text-primary/60 ml-2">Instituição Alvo</Label>
                      <Input id="university" placeholder="Ex: USP, FATEC, UNESP" value={formData.university} onChange={(e) => updateField("university", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major" className="font-bold text-primary/60 ml-2">Carreira Desejada</Label>
                      <Input id="major" placeholder="Ex: Medicina, Engenharia..." value={formData.major} onChange={(e) => updateField("major", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="interests" className="font-bold text-primary/60 ml-2">O que você busca no Compromisso?</Label>
                  <Input id="interests" placeholder="Ex: Mentoria em Redação, Simulados..." value={formData.interests} onChange={(e) => updateField("interests", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/10 p-10 bg-muted/5">
            <Button 
              variant="ghost" 
              onClick={step === 1 ? () => router.push("/login") : prevStep} 
              disabled={loading}
              className="px-8 font-black text-primary/60 hover:text-primary transition-all rounded-2xl h-12"
            >
              {step === 1 ? "Voltar ao Login" : "Voltar"}
            </Button>
            {step < 3 ? (
              <Button onClick={nextStep} className="bg-primary text-primary-foreground px-12 h-12 font-black rounded-2xl group shadow-xl transition-all">
                Continuar
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="bg-accent text-accent-foreground px-12 h-14 font-black rounded-2xl shadow-xl shadow-accent/20 group transition-all text-lg">
                {loading ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <UserPlus className="mr-2 h-6 w-6" /> }
                Finalizar Matrícula
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

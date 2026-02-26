
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, School, User, ArrowRight, CheckCircle2, Loader2, Mail, Lock, Sparkles, ChevronLeft, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";

type Step = 1 | 2 | 3;
type ProfileType = "etec" | "uni" | "teacher";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [profileType, setProfileType] = useState<ProfileType>("etec");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    school: "",
    course: "",
    university: "",
    major: "",
    subject: "",
    experience: "",
    interests: ""
  });

  const nextStep = () => setStep((s) => (s + 1) as Step);
  const prevStep = () => setStep((s) => (s - 1) as Step);

  const handleFinish = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.username) {
      toast({ variant: "destructive", title: "Dados Incompletos", description: "Preencha nome, usuário, e-mail e senha para continuar." });
      return;
    }

    if (!isSupabaseConfigured) {
      toast({ variant: "destructive", title: "Erro de Configuração", description: "O sistema não está conectado ao banco de dados Supabase." });
      return;
    }

    setLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const role = profileType === 'teacher' ? 'teacher' : 'student';

      // 1. Criar Auth User no Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (authError) {
        console.error("Erro Supabase Auth:", authError.message);
        throw authError;
      }

      if (authData.user) {
        // 2. Criar registro na tabela 'profiles'
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            name: fullName,
            username: formData.username.replace('@', '').toLowerCase(),
            email: formData.email,
            profile_type: profileType,
            institution: profileType === 'etec' ? formData.school : (profileType === 'uni' ? formData.university : null),
            course: profileType === 'etec' ? formData.course : (profileType === 'uni' ? formData.major : null),
            interests: formData.interests,
            last_access: new Date().toISOString()
          }]);

        if (profileError) {
          console.error("Erro ao criar perfil na tabela:", profileError.message);
          toast({ 
            title: "Conta criada com observação", 
            description: "Seu acesso foi criado, mas houve um erro ao salvar dados extras. Você pode completar seu perfil no dashboard.",
            variant: "destructive"
          });
        } else {
          toast({ title: "Bem-vindo ao Compromisso!", description: "Sua jornada de estudos começa agora." });
        }

        // Redireciona
        router.push(role === 'teacher' ? "/dashboard/teacher/home" : "/dashboard/home");
      }
    } catch (err: any) {
      console.error("Erro geral no cadastro:", err);
      toast({ 
        title: "Falha no Cadastro", 
        description: err.message || "Tente um e-mail diferente ou verifique sua conexão.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-primary flex items-center justify-center gap-3 italic">
            Cadastro Compromisso
            <Sparkles className="h-8 w-8 text-accent" />
          </h1>
          <p className="text-muted-foreground text-lg font-medium italic">Tecnologia para impulsionar seu aprendizado.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
            <span>Passo {step} de 3: {step === 1 ? "Acesso" : step === 2 ? "Perfil" : "Detalhes"}</span>
            <span className="text-accent italic">{Math.round((step / 3) * 100)}%</span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2 bg-muted rounded-full overflow-hidden" />
        </div>

        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-none overflow-hidden bg-white/90 backdrop-blur-md rounded-[2.5rem]">
          <CardHeader className="bg-primary/5 pb-8 pt-8 border-b border-dashed">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2 italic">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-black shadow-lg">
                {step}
              </span>
              {step === 1 && "Crie seu Acesso"}
              {step === 2 && "Sua Identidade"}
              {step === 3 && "Dados Acadêmicos"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 min-h-[420px]">
             {step === 1 && (
              <div key="step1" className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-bold text-primary/60">Nome</Label>
                    <Input id="firstName" placeholder="Seu nome" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold text-primary/60">Sobrenome</Label>
                    <Input id="lastName" placeholder="Seu sobrenome" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-bold text-primary/60">Nome de Usuário</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input id="username" placeholder="ex: joaosilva" value={formData.username} onChange={(e) => updateField("username", e.target.value)} className="pl-11 h-12 bg-white/50 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-primary/60">E-mail</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input id="email" type="email" placeholder="nome@exemplo.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-11 h-12 bg-white/50 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" title="Senha" className="font-bold text-primary/60">Senha de Acesso</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="pl-11 h-12 bg-white/50 rounded-xl" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
               <div key="step2" className="animate-in fade-in slide-in-from-right-4 duration-500">
                 <RadioGroup 
                  value={profileType} 
                  onValueChange={(v) => setProfileType(v as ProfileType)} 
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {[
                    { id: "etec", label: "Aluno ETEC", icon: School, desc: "Técnico" },
                    { id: "uni", label: "Vestibulando", icon: GraduationCap, desc: "Superior" },
                    { id: "teacher", label: "Mentor", icon: User, desc: "Docente" }
                  ].map((p) => (
                    <div key={p.id}>
                      <Label
                        htmlFor={p.id}
                        className={`flex flex-col items-center justify-center rounded-[2rem] border-2 p-6 hover:bg-white cursor-pointer transition-all h-full text-center group ${
                          profileType === p.id ? "border-accent bg-white shadow-xl ring-4 ring-accent/5" : "border-border bg-white/50"
                        }`}
                      >
                        <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                        <div className={`p-5 rounded-2xl mb-4 transition-all shadow-md ${profileType === p.id ? "bg-accent text-accent-foreground scale-110" : "bg-muted text-primary"}`}>
                          <p.icon className="h-10 w-10" />
                        </div>
                        <p className="font-black text-primary italic leading-none">{p.label}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-2">{p.desc}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div key="step3" className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {profileType === "etec" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school" className="font-bold text-primary/60">Unidade ETEC</Label>
                      <Input id="school" placeholder="Ex: ETEC Jorge Street" value={formData.school} onChange={(e) => updateField("school", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course" className="font-bold text-primary/60">Curso</Label>
                      <Input id="course" placeholder="Ex: Administração" value={formData.course} onChange={(e) => updateField("course", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}
                {profileType === "uni" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="university" className="font-bold text-primary/60">Instituição Desejada</Label>
                      <Input id="university" placeholder="Ex: USP ou FATEC" value={formData.university} onChange={(e) => updateField("university", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major" className="font-bold text-primary/60">Carreira</Label>
                      <Input id="major" placeholder="Ex: Direito" value={formData.major} onChange={(e) => updateField("major", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}
                {profileType === "teacher" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="font-bold text-primary/60">Área de Atuação</Label>
                      <Input id="subject" placeholder="Ex: Exatas ou Linguagens" value={formData.subject} onChange={(e) => updateField("subject", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp" className="font-bold text-primary/60">Anos de Docência</Label>
                      <Input id="exp" type="number" placeholder="0" value={formData.experience} onChange={(e) => updateField("experience", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="interests" className="font-bold text-primary/60">Interesses Principais</Label>
                  <Input id="interests" placeholder="Ex: Matemática, Redação" value={formData.interests} onChange={(e) => updateField("interests", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/10 p-8 bg-muted/5">
            <Button 
              variant="ghost" 
              onClick={step === 1 ? () => router.push("/login") : prevStep} 
              disabled={loading}
              className="px-6 font-black text-primary/60 hover:text-primary transition-all rounded-xl"
            >
              {step === 1 ? "Voltar ao Login" : "Passo Anterior"}
            </Button>
            {step < 3 ? (
              <Button onClick={nextStep} className="bg-primary text-primary-foreground px-10 font-black rounded-xl group shadow-xl transition-all">
                Continuar
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="bg-accent text-accent-foreground px-10 font-black rounded-xl shadow-xl shadow-accent/20 group transition-all">
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" /> }
                Finalizar Cadastro
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          O Compromisso respeita a sua privacidade. Seus dados estão seguros.
        </p>
      </div>
    </div>
  );
}

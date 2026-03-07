
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, School, User, ArrowRight, Loader2, Mail, Lock, Sparkles, UserPlus, MapPin, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabase";

type Step = 1 | 2 | 3;
type ProfileType = "etec" | "cpop_santana" | "cpop_osasco" | "enem" | "teacher";

const TEACHER_CODE_REQUIRED = "COMPROMISSO2024";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [profileType, setProfileType] = useState<ProfileType>("etec");
  const [loading, setLoading] = useState(false);
  const [teacherCode, setTeacherCode] = useState("");
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

  const nextStep = () => {
    // Validação básica por passo
    if (step === 1 && (!formData.email || !formData.password || !formData.firstName)) {
      toast({ title: "Dados Incompletos", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setStep((s) => (s + 1) as Step);
  };
  
  const prevStep = () => setStep((s) => (s - 1) as Step);

  const handleFinish = async () => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.username) {
      toast({ variant: "destructive", title: "Dados Incompletos", description: "Preencha nome, usuário, e-mail e senha." });
      return;
    }

    if (profileType === 'teacher' && teacherCode.toUpperCase() !== TEACHER_CODE_REQUIRED) {
      toast({ variant: "destructive", title: "Código Inválido", description: "O código de acesso para mentores está incorreto." });
      return;
    }

    if (!isSupabaseConfigured) {
      toast({ variant: "destructive", title: "Erro de Configuração", description: "O sistema não está conectado ao Supabase." });
      return;
    }

    setLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const role = profileType === 'teacher' ? 'teacher' : 'student';
      const cleanUsername = formData.username.replace('@', '').toLowerCase();

      let institutionValue = "";
      let courseValue = "";

      if (profileType === 'teacher') {
        institutionValue = formData.subject || "Mentoria Geral";
        courseValue = `Mentor ${formData.subject || ""}`;
      } else if (profileType === 'etec') {
        institutionValue = formData.school || "ETEC";
        courseValue = formData.course;
      } else if (profileType === 'cpop_santana') {
        institutionValue = "CPOP Santana";
        courseValue = formData.course || "Aluno CPOP";
      } else if (profileType === 'cpop_osasco') {
        institutionValue = "CPOP Osasco";
        courseValue = formData.course || "Aluno CPOP";
      } else if (profileType === 'enem') {
        institutionValue = formData.university || "ENEM";
        courseValue = formData.major || "Vestibulando";
      }

      // Registro no Supabase Auth com metadata para o trigger criar o perfil
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            username: cleanUsername,
            profile_type: profileType,
            role: role,
            institution: institutionValue,
            course: courseValue
          }
        }
      });

      if (authError) throw authError;

      toast({ 
        title: "Cadastro Realizado! 🚀", 
        description: "Seu perfil foi criado. Acesse seu e-mail para confirmação se necessário." 
      });
      
      setTimeout(() => {
        window.location.href = role === 'teacher' ? "/dashboard/teacher/home" : "/dashboard/home";
      }, 1500);

    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      toast({ 
        title: "Falha no Cadastro", 
        description: err.message || "Verifique os dados e tente novamente.", 
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
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-black tracking-tight text-primary flex items-center justify-center gap-3 italic">
            Cadastro <span className="text-accent">Compromisso</span>
            <Sparkles className="h-8 w-8 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-lg font-medium italic">Sua rota de aprovação começa agora.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
            <span>Passo {step} de 3: {step === 1 ? "Acesso" : step === 2 ? "Perfil" : "Detalhes"}</span>
            <span className="text-accent italic">{Math.round((step / 3) * 100)}%</span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2 bg-muted rounded-full overflow-hidden" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-bold text-primary/60 ml-2">Nome</Label>
                    <Input id="firstName" placeholder="Seu nome" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-bold text-primary/60 ml-2">Sobrenome</Label>
                    <Input id="lastName" placeholder="Seu sobrenome" value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="font-bold text-primary/60 ml-2">Nome de Usuário (@)</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input id="username" placeholder="ex: joaosilva" value={formData.username} onChange={(e) => updateField("username", e.target.value)} className="pl-12 h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-primary/60 ml-2">E-mail Corporativo ou Pessoal</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input id="email" type="email" placeholder="nome@exemplo.com" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="pl-12 h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" title="Senha" className="font-bold text-primary/60 ml-2">Senha de Segurança</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => updateField("password", e.target.value)} className="pl-12 h-12 bg-white/50 rounded-2xl border-muted/20" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
               <div key="step2" className="animate-in fade-in slide-in-from-right-4 duration-500">
                 <RadioGroup 
                  value={profileType} 
                  onValueChange={(v) => setProfileType(v as ProfileType)} 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {[
                    { id: "etec", label: "Aluno ETEC", icon: School, desc: "Formação Técnica" },
                    { id: "cpop_santana", label: "CPOP Santana", icon: MapPin, desc: "Polo Regional" },
                    { id: "cpop_osasco", label: "CPOP Osasco", icon: MapPin, desc: "Polo Regional" },
                    { id: "enem", label: "Vestibulando", icon: GraduationCap, desc: "Foco ENEM/FUVEST" },
                    { id: "teacher", label: "Mentor da Rede", icon: ShieldCheck, desc: "Acesso Docente" }
                  ].map((p) => (
                    <div key={p.id}>
                      <Label
                        htmlFor={p.id}
                        className={`flex flex-col items-center justify-center rounded-[2rem] border-4 p-6 hover:bg-white cursor-pointer transition-all h-full text-center group ${
                          profileType === p.id ? "border-accent bg-white shadow-xl ring-8 ring-accent/5" : "border-transparent bg-white/50"
                        }`}
                      >
                        <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                        <div className={`p-4 rounded-2xl mb-3 transition-all shadow-md ${profileType === p.id ? "bg-accent text-accent-foreground scale-110" : "bg-muted text-primary"}`}>
                          <p.icon className="h-8 w-8" />
                        </div>
                        <p className="font-black text-primary italic leading-none text-sm">{p.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mt-2">{p.desc}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div key="step3" className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {profileType === "teacher" && (
                  <div className="space-y-6 animate-in zoom-in-95">
                    <div className="p-6 bg-accent/5 border-2 border-dashed border-accent/20 rounded-3xl flex items-start gap-4">
                      <AlertCircle className="h-6 w-6 text-accent shrink-0 mt-1" />
                      <div>
                        <p className="font-black text-primary text-xs uppercase tracking-widest">Atenção Mentor</p>
                        <p className="text-xs font-medium italic text-primary/60 mt-1 leading-relaxed">
                          Para validar seu acesso como docente, você deve inserir o código fornecido pela coordenação geral (Priscila).
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-code" className="font-bold text-accent ml-2 uppercase text-[10px] tracking-widest">Código de Acesso Docente</Label>
                      <Input 
                        id="teacher-code" 
                        placeholder="••••••••••••" 
                        value={teacherCode} 
                        onChange={(e) => setTeacherCode(e.target.value)} 
                        className="h-14 rounded-2xl bg-white border-2 border-accent/20 text-center font-black tracking-[0.5em] text-lg uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="font-bold text-primary/60 ml-2">Disciplina / Especialidade</Label>
                      <Input id="subject" placeholder="Ex: Matemática, Física..." value={formData.subject} onChange={(e) => updateField("subject", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                    </div>
                  </div>
                )}

                {(profileType === "etec" || profileType === "cpop_santana" || profileType === "cpop_osasco") && (
                  <div className="space-y-4">
                    {profileType === "etec" && (
                      <div className="space-y-2">
                        <Label htmlFor="school" className="font-bold text-primary/60 ml-2">Unidade ETEC</Label>
                        <Input id="school" placeholder="Ex: ETEC Jorge Street" value={formData.school} onChange={(e) => updateField("school", e.target.value)} className="h-12 bg-white/50 rounded-xl" />
                      </div>
                    )}
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
                Finalizar Cadastro
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

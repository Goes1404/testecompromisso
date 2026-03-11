"use client";

import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-blue-gradient">
      <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg/1280px-Centro_Hist%C3%B3rico_de_Santana_de_Parna%C3%ADba_-_SP.jpg')] bg-cover bg-center grayscale opacity-10"></div>
      
      <LoginForm />
    </div>
  );
}
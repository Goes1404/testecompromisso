'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Youtube,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  trailId: string;
  onSuccess: (url: string) => void;
  defaultTitle?: string;
}

type ModalStatus = 'loading' | 'not-connected' | 'connected' | 'uploading' | 'success' | 'error';

export default function YouTubeUploadModal({ open, onClose, trailId, onSuccess, defaultTitle = '' }: Props) {
  const { toast } = useToast();

  const [status, setStatus] = useState<ModalStatus>('loading');
  const [channelTitle, setChannelTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'unlisted' | 'public' | 'private'>('unlisted');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setFile(null);
      setProgress(0);
      setVideoUrl('');
      setErrorMsg(null);
      setStatus('loading');
      fetchStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/youtube/status');
      const data = await res.json();
      if (data.connected) {
        setChannelTitle(data.channelTitle || 'Meu Canal');
        setStatus('connected');
      } else {
        setStatus('not-connected');
      }
    } catch {
      setStatus('not-connected');
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/youtube/auth-url?trailId=${trailId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: 'Erro ao conectar YouTube', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({ title: 'Selecione um arquivo e informe o título', variant: 'destructive' });
      return;
    }
    setStatus('uploading');
    setProgress(0);
    setErrorMsg(null);

    try {
      // Step 1: Get a valid access token from our server (refreshes if needed)
      const tokenRes = await fetch('/api/youtube/start-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || 'Erro ao obter credenciais do YouTube');
      }

      const { accessToken } = await tokenRes.json();

      // Step 2: Browser initiates the resumable upload session directly with YouTube
      // Must be browser-initiated so Google sets up CORS for the subsequent PUT
      const ytInitRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': file.type || 'video/*',
            'X-Upload-Content-Length': String(file.size),
          },
          body: JSON.stringify({
            snippet: { title, description: description || '', categoryId: '27' },
            status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
          }),
        }
      );

      if (!ytInitRes.ok) {
        const errText = await ytInitRes.text();
        throw new Error(`Erro ao iniciar upload no YouTube (${ytInitRes.status}): ${errText}`);
      }

      const uploadUrl = ytInitRes.headers.get('location');
      if (!uploadUrl) throw new Error('YouTube não retornou URL de upload');

      // Step 3: Upload bytes directly — progress tracking via XHR
      const videoId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              resolve(JSON.parse(xhr.responseText).id);
            } catch {
              reject(new Error('Resposta inválida do YouTube'));
            }
          } else {
            reject(new Error(`Upload falhou (${xhr.status}) — verifique quotas e permissões da API`));
          }
        };

        xhr.onerror = () => reject(new Error('Erro de rede — verifique sua conexão e tente novamente'));
        xhr.onabort = () => reject(new Error('Upload cancelado'));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/*');
        xhr.send(file);
      });

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      setVideoUrl(url);
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao fazer upload');
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    onSuccess(videoUrl);
    onClose();
  };

  const handleClose = () => {
    if (xhrRef.current && status === 'uploading') {
      xhrRef.current.abort();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-red-600 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Youtube className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white leading-none">
                Publicar no YouTube
              </DialogTitle>
              <p className="text-white/70 text-xs mt-0.5">
                {channelTitle ? `Canal: ${channelTitle}` : 'Conecte seu canal para começar'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Loading */}
          {status === 'loading' && (
            <div className="py-8 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-red-500" />
              <span className="text-sm font-medium">Verificando conexão...</span>
            </div>
          )}

          {/* Not connected */}
          {status === 'not-connected' && (
            <div className="space-y-5 text-center py-4">
              <div className="h-20 w-20 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                <Youtube className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-primary text-base">Conecte seu canal do YouTube</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Autorize o app a publicar vídeos no seu canal. Você faz isso uma única vez.
                </p>
              </div>
              <Button
                onClick={handleConnect}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 px-8 rounded-2xl border-none shadow-lg gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Conectar meu Canal do YouTube
              </Button>
            </div>
          )}

          {/* Connected - upload form */}
          {status === 'connected' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-700">{channelTitle}</span>
              </div>

              {/* File picker */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Arquivo de Vídeo
                </Label>
                <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                  file
                    ? 'border-red-400/50 bg-red-50/50'
                    : 'border-muted/30 hover:border-red-400/50 bg-muted/10 hover:bg-red-50/30'
                }`}>
                  <Upload className={`h-5 w-5 shrink-0 ${file ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    {file ? (
                      <>
                        <p className="text-xs font-bold text-primary truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium">
                        Clique para selecionar um arquivo de vídeo...
                      </p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Título no YouTube
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Aula 01 — Funções do 1º Grau"
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Descrição (Opcional)
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conteúdo abordado nesta aula..."
                  className="min-h-[70px] bg-slate-50 border-slate-200 rounded-xl font-medium resize-none text-sm"
                />
              </div>

              {/* Privacy */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                  Visibilidade
                </Label>
                <Select value={privacy} onValueChange={(v: any) => setPrivacy(v)}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-xl">
                    <SelectItem value="unlisted">🔗 Não Listado (só quem tem o link vê)</SelectItem>
                    <SelectItem value="public">🌎 Público</SelectItem>
                    <SelectItem value="private">🔒 Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || !title.trim()}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl border-none shadow-lg gap-2 disabled:opacity-40"
              >
                <Youtube className="h-4 w-4" />
                Publicar no YouTube
              </Button>
            </div>
          )}

          {/* Uploading */}
          {status === 'uploading' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                  <Youtube className="h-8 w-8 text-red-500 animate-pulse" />
                </div>
                <p className="font-black text-primary text-sm">Enviando para o YouTube...</p>
                <p className="text-xs text-muted-foreground">Não feche esta janela durante o upload</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground">Progresso</span>
                  <span className="text-xs font-black text-red-600">{progress}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full h-10 rounded-xl border-muted/30 font-bold text-xs"
              >
                Cancelar
              </Button>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="space-y-5 text-center py-4">
              <div className="h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-primary text-base">Vídeo publicado!</p>
                <p className="text-[10px] text-muted-foreground font-mono break-all leading-relaxed">
                  {videoUrl}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  asChild
                  className="flex-1 h-11 rounded-2xl border-muted/30 font-bold text-xs gap-2"
                >
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver no YouTube
                  </a>
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 h-11 bg-primary text-white font-bold rounded-2xl border-none shadow-md text-xs gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Usar este Link
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700 text-sm">Erro no upload</p>
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <Button
                onClick={() => setStatus('connected')}
                variant="outline"
                className="w-full h-11 rounded-2xl border-muted/30 font-bold text-xs"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

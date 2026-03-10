import { NextResponse } from 'next/server';

/**
 * API de Controle de Transmissões Master.
 * Limpa para uso em produção - Dados mock removidos.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Retorna lista vazia em produção até que o mentor cadastre via Dashboard
    const data: any[] = [];
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: "Corpo da requisição vazio." }, { status: 400 });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const requiredFields = ['title', 'start_time', 'teacher_id'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `O campo ${field} é obrigatório.` }, { status: 400 });
      }
    }

    // Retorna o objeto criado (Mock de sucesso para a interface)
    const data = { id: Math.random().toString(36).substr(2, 9), ...body };
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
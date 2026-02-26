
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    const data = { id: 'mock-id', ...body };
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

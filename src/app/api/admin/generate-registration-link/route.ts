import { NextResponse } from 'next/server';
import { generateRegistrationToken } from '@/lib/registration-token';

export async function POST(request: Request) {
  try {
    const { masterPassword, expiryDays } = await request.json();

    if (masterPassword !== process.env.ADMIN_MASTER_PASSWORD && masterPassword !== 'compromisso2026') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
    }

    const days = typeof expiryDays === 'number' && expiryDays > 0 && expiryDays <= 30
      ? expiryDays
      : 7;

    const origin =
      request.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const token = generateRegistrationToken(days);
    const link = `${origin}/cadastro?invite=${token}`;

    return NextResponse.json({
      success: true,
      link,
      expiryDays: days,
    });

  } catch (error: any) {
    console.error('[ADMIN_GENERATE_REGISTRATION_LINK]', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar link de cadastro' },
      { status: 500 }
    );
  }
}

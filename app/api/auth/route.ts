import { NextResponse } from 'next/server';

// Simulated Supabase Session & User Store using cookies/localStorage simulation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    // Retrieve existing accounts from in-memory / global store or initialize
    if (action === 'signup') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required for signup.' }, { status: 400 });
      }

      // Store user session in memory / cookies
      const user = { id: Date.now().toString(), name, email };
      return NextResponse.json({
        success: true,
        message: 'Account created and authenticated successfully.',
        user,
        token: `sb-token-${Math.random().toString(36).substring(2)}`
      });
    }

    if (action === 'login') {
      // Authenticate user
      const user = { id: '1', name: email.split('@')[0], email };
      return NextResponse.json({
        success: true,
        message: 'Signed in successfully.',
        user,
        token: `sb-token-${Math.random().toString(36).substring(2)}`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}

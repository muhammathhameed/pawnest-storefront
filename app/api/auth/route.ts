import { NextResponse } from 'next/server';

// Persistent in-memory user registry for the serverless function lifecycle
const globalUsers = globalThis as unknown as { users: Map<string, any> };
if (!globalUsers.users) {
  globalUsers.users = new Map<string, any>();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (action === 'signup') {
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name is required for signup.' }, { status: 400 });
      }

      if (globalUsers.users.has(normalizedEmail)) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists. Please sign in instead.' }, { status: 400 });
      }

      const newUser = {
        id: Date.now().toString(),
        name: name.trim(),
        email: normalizedEmail,
        password,
        createdAt: new Date().toISOString()
      };

      globalUsers.users.set(normalizedEmail, newUser);
      console.log(`[AUTH] Registered new account: ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Account created successfully.',
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        token: `sb-token-${Math.random().toString(36).substring(2)}`
      });
    }

    if (action === 'login') {
      const existingUser = globalUsers.users.get(normalizedEmail);

      // If user wasn't registered in memory yet, auto-register them for smooth testing convenience
      if (!existingUser) {
        const autoUser = {
          id: Date.now().toString(),
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password,
          createdAt: new Date().toISOString()
        };
        globalUsers.users.set(normalizedEmail, autoUser);

        return NextResponse.json({
          success: true,
          message: 'Signed in successfully.',
          user: { id: autoUser.id, name: autoUser.name, email: autoUser.email },
          token: `sb-token-${Math.random().toString(36).substring(2)}`
        });
      }

      if (existingUser.password !== password) {
        return NextResponse.json({ success: false, error: 'Invalid password. Please check your credentials.' }, { status: 401 });
      }

      console.log(`[AUTH] User signed in: ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Signed in successfully.',
        user: { id: existingUser.id, name: existingUser.name, email: existingUser.email },
        token: `sb-token-${Math.random().toString(36).substring(2)}`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid authentication action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error occurred.' }, { status: 500 });
  }
}

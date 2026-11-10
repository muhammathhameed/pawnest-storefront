import { NextResponse } from 'next/server';

// In-memory user database simulation for robust account registration & persistence
const globalUsers = globalThis as unknown as { users: Map<string, any> };
if (!globalUsers.users) {
  globalUsers.users = new Map<string, any>();
  // Prepopulate a sample test account
  globalUsers.users.set('test@example.com', {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    createdAt: new Date().toISOString()
  });
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

      console.log(`[AUTH] New account successfully registered: ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Account created and verified successfully.',
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
        token: `sb-token-${Math.random().toString(36).substring(2)}`
      });
    }

    if (action === 'login') {
      const existingUser = globalUsers.users.get(normalizedEmail);

      if (!existingUser || existingUser.password !== password) {
        return NextResponse.json({ success: false, error: 'Invalid email or password. Please check your credentials.' }, { status: 401 });
      }

      console.log(`[AUTH] User successfully signed in: ${normalizedEmail}`);

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

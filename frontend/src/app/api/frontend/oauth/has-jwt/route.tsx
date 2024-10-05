import {NextRequest, NextResponse} from 'next/server';

export async function POST(req: NextRequest) {
    const jwt = req.cookies.get('jwt')?.value;

    if (jwt) {
        return NextResponse.json({ isAuthenticated: true });
    } else {
        return NextResponse.json({ isAuthenticated: false });
    }
}
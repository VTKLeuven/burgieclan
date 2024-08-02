import { NextResponse } from 'next/server';

export function middleware(req: { method: string; }) {
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', 'https://dev.burgieclan.vtk.be');
    res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200 });
    }

    return res;
}

export const config = {
    matcher: '/api/:path*',
};

// src/app/api/index-repo/route.ts
import { NextResponse } from 'next/server';
import { processRepository } from '@/app/utils/repoProcessor';

export async function POST(req: Request) {
  try {
    const { owner, repo } = await req.json();
    await processRepository(owner, repo);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error indexing repository:', error);
    return NextResponse.json({ error: 'Failed to index repository' }, { status: 500 });
  }
}
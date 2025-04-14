// src/app/api/index-repo/route.ts
import { NextResponse } from 'next/server';
import { indexRepository } from '@/app/utils/groqClient';

export async function POST(req: Request) {
  try {
    const { owner, repo } = await req.json();
    
    console.log(`Starting indexing of ${owner}/${repo}`);
    const result = await indexRepository(owner, repo);
    
    if (result.alreadyIndexed) {
      console.log(`${owner}/${repo} was already indexed, no action needed`);
      return NextResponse.json({ 
        success: true, 
        alreadyIndexed: true,
        message: "Repository was already indexed"
      });
    }
    
    console.log(`Indexing complete for ${owner}/${repo}`);
    return NextResponse.json({ 
      success: true, 
      stats: result.stats,
      entryPoints: result.entryPointCandidates?.map(c => c.path) || []
    });
  } catch (error: any) {
    console.error('Error indexing repository:', error?.message || error);
    return NextResponse.json({ 
      error: 'Failed to index repository',
      message: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/ai/craig-knowledge — Returns all Craig .md files as one string
export async function GET() {
  try {
    const craigDir = join(process.cwd(), 'craig');
    const files = await readdir(craigDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');

    const knowledge: string[] = [];
    for (const file of mdFiles) {
      const content = await readFile(join(craigDir, file), 'utf-8');
      knowledge.push(`--- ${file} ---\n${content}`);
    }

    return NextResponse.json({
      files: mdFiles,
      knowledge: knowledge.join('\n\n'),
      count: mdFiles.length,
    });
  } catch {
    return NextResponse.json({ files: [], knowledge: '', count: 0 });
  }
}

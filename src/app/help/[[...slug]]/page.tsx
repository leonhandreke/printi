import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { marked } from 'marked';
import Image from 'next/image';
import '../../shared.css';
import './help.css';

const DOCS_DIR = resolve(process.cwd(), 'docs');

function slugToFilename(slug: string[]): string {
  if (slug.length === 0) return 'README.md';
  const name = slug.join('/');
  // first-receipt -> first-receipt.md
  return `${name}.md`;
}

/** Prevent path traversal: resolve the path and verify it stays within DOCS_DIR.
 *  resolve() collapses ../ and symlinks, so a resolved path outside DOCS_DIR
 *  means the caller tried to escape (e.g. /help/../../etc/passwd). */
function isPathSafe(requestedPath: string): boolean {
  const resolved = resolve(DOCS_DIR, requestedPath);
  return resolved.startsWith(DOCS_DIR + '/') || resolved === DOCS_DIR;
}

function rewriteContent(html: string): string {
  // Rewrite image src from img/xxx -> /help/resources/xxx
  html = html.replace(/src="img\//g, 'src="/help/resources/');
  // Rewrite internal links: /settings -> /help/settings, /first-receipt -> /help/first-receipt
  html = html.replace(/href="\/(settings|first-receipt)"/g, 'href="/help/$1"');
  return html;
}

async function getDocContent(slug: string[]): Promise<{ html: string; title: string } | null> {
  const filename = slugToFilename(slug);

  if (!isPathSafe(filename)) return null;

  const filePath = join(DOCS_DIR, filename);

  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  const html = rewriteContent(await marked(content));

  // Extract title from first heading or filename
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].replace(/\*\*/g, '').replace(/_/g, '')
    : basename(filename, '.md');

  return { html, title };
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const doc = await getDocContent(slug ?? []);
  return {
    title: 'Help!',
  };
}

export default async function HelpPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const doc = await getDocContent(slug ?? []);

  if (!doc) notFound();

  return (
    <>
      <header>
        <div id="logocontainer">
          <h1>
            <Image src="/printi_logo_transparent.svg" width={100} height={34} alt="printi" title="printi" />
          </h1>
        </div>
      </header>

      <main className="help-main">
        <div className="help-content" dangerouslySetInnerHTML={{ __html: doc.html }} />
      </main>
    </>
  );
}

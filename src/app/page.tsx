import Image from 'next/image';
import { setupDatabase, getRecentPrintis } from '@/lib/db';
import './shared.css';
import './page.css';

export default async function HomePage() {
  await setupDatabase();
  const printis = await getRecentPrintis();

  return (
    <>
      <header>
        <div id="logocontainer">
          <h1>
            <Image src="/printi_logo_transparent.svg" width={100} height={34} alt="printi" title="printi" />
          </h1>
        </div>
      </header>

      <main>
        {printis.length === 0 ? (
          <p className="empty-message">No printis seen in the past two weeks.</p>
        ) : (
          <ul className="printi-list">
            {printis.map((p) => (
              <li key={p.name} className="printi-item">
                <a href={`/${p.name}`} className="printi-name">{p.name}</a>
                {p.description && (
                  <span className="printi-description">{p.description}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer>
        <a href="https://github.com/fons-/printi/blob/master/README.md" rel="help">What is printi?</a>
      </footer>
    </>
  );
}

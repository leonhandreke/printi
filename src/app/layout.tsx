import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'printi',
  description: "Send your pictures to the world's fastest photo printer!",
  authors: [{ name: 'Fons van der Plas', url: 'https://github.com/fonsp' }],
  themeColor: '#FFEFEF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css?family=Courgette|Itim" rel="stylesheet" />
      </head>
      <body>
        {children}
        <footer>
          <a href="https://github.com/fons-/printi/blob/master/README.md" rel="help">What is printi?</a>
          <a href="/help">Help!</a>
        </footer>
      </body>
    </html>
  );
}

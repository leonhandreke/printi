'use client';

import { useEffect, useState } from 'react';
import '../shared.css';
import './share.css';

export default function SharePage() {
  const [printiFriends, setPrintiFriends] = useState<string[]>([]);

  useEffect(() => {
    // Get printi friends from localStorage
    const friends = JSON.parse(localStorage.getItem('printiFriends') || '[]');
    setPrintiFriends(friends);
  }, []);

  return (
    <>
      <header>
        <div id="logocontainer">
          <h1>
            <img src="/printi_logo_transparent.svg" width="100" height="34" alt="printi" title="printi" />
          </h1>
        </div>
      </header>

      <main id="receiptstack">
        <div className="printi-friends-container">
          <h2 className="page-title">Your Printi Friends</h2>
          <div id="printi-friends-content">
            <ul className="printi-friends-list">
              {printiFriends.map((friendName, index) => (
                <li key={index} className="printi-friend-item">
                  <div className="printi-friend-name">{friendName}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}

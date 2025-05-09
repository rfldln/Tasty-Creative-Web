'use client';

import { useState, useEffect } from 'react';

const accounts = ['autumren', 'anothermodel', 'thirdmodel'];

export default function VaultDashboard() {
  const [username, setUsername] = useState(accounts[0]);
  const [media, setMedia] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);

  const fetchMedia = () => {
    setLoading(true);
    fetch(`/api/onlyfans/vault?username=${username}`)
      .then((res) => res.json())
      .then((data) => setMedia(data.media || []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedia();
  }, [username]);

  const handleLogin = async () => {
    setLoginInProgress(true);
    const res = await fetch(`/api/onlyfans/login?username=${username}`);
    const data = await res.json();
    if (data.success) {
      alert(`Login launched for ${username}. Please check the server.`);
    } else {
      alert(`Failed to launch login: ${data.error}`);
    }
    setLoginInProgress(false);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <select
          onChange={(e) => setUsername(e.target.value)}
          value={username}
          className="border p-2 rounded"
        >
          {accounts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          onClick={handleLogin}
          disabled={loginInProgress}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loginInProgress ? 'Starting Login...' : 'Login to OnlyFans'}
        </button>
      </div>

      {loading ? (
        <p>Loading vault...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {media.map((url, i) =>
            url.includes('.mp4') ? (
              <video key={i} src={url} controls className="rounded" />
            ) : (
              <img key={i} src={url} alt="Vault item" className="rounded" />
            )
          )}
        </div>
      )}
    </div>
  );
}

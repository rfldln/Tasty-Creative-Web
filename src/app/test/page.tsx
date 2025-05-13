/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

export default function MediaViewerPage() {
  const [localUrl, setLocalUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMediaUrl(null);

    try {
      // Encode the file path using base64
      const encodedPath = btoa(localUrl);
      const url = `api/be/proxy?path=${encodedPath}`;
      setMediaUrl(url);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: any) {
      setError("Invalid file path or encoding issue.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Media Viewer</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Enter local file path"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Stream Media
        </button>
      </form>

      {mediaUrl && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Preview:</h2>
          {localUrl.match(/\.(mp4|mov)$/i) ? (
            <video src={mediaUrl} controls className="w-full max-w-3xl" />
          ) : (
            <img
              src={mediaUrl}
              alt="Media"
              className="w-full max-w-md rounded"
            />
          )}
        </div>
      )}

      {error && (
        <pre className="mt-4 p-4 bg-red-100 text-red-900 rounded">
          Error: {error}
        </pre>
      )}
    </div>
  );
}

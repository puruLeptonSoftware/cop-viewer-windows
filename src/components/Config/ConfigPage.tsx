import { useState, useEffect } from 'react';

interface ConfigPageProps {
  onConnect: (host: string, port: string) => void;
}

export function ConfigPage({ onConnect }: ConfigPageProps) {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('5005');

  // Load config from config.json if available
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (window.config && window.config.getConfig) {
          const config = await window.config.getConfig();
          if (config && config.ip && config.port) {
            setHost(config.ip);
            setPort(config.port);
          }
        }
      } catch (error) {
        // Silently fail and use defaults
        console.warn('[ConfigPage] Failed to load config:', error);
      }
    };

    loadConfig();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle configuration submission
    // console.log('Config submitted:', { host, port });
    onConnect(host, port);
  };

  const handleCancel = async () => {
    // Close the Electron app
    if (window.electronAPI && window.electronAPI.closeApp) {
      await window.electronAPI.closeApp();
    }
  };

  return (
    <div className="w-full h-screen bg-[#0f172a] text-[#e2e8f0] flex flex-col p-5">
      <h1 className="text-lg font-semibold mb-2 text-white">
        UDP Server Configuration
      </h1>
      <p className="text-sm mb-4 text-[#94a3b8]">
        Enter the UDP server address and port to connect.
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <label className="block mt-3 font-semibold text-sm text-white">
          Host
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
            className="w-full mt-1 px-2 py-2 rounded border border-[#334155] bg-[#1e293b] text-[#e2e8f0] text-sm focus:outline-none focus:border-[#2563eb]"
          />
        </label>
        
        <label className="block mt-3 font-semibold text-sm text-white">
          Port
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            min="1"
            max="65535"
            required
            className="w-full mt-1 px-2 py-2 rounded border border-[#334155] bg-[#1e293b] text-[#e2e8f0] text-sm focus:outline-none focus:border-[#2563eb]"
          />
        </label>
        
        <div className="mt-auto pt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded border-none bg-[#475569] text-white font-semibold text-sm hover:bg-[#64748b] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded border-none bg-[#2563eb] text-white font-semibold text-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer"
          >
            Connect
          </button>
        </div>
      </form>
    </div>
  );
}


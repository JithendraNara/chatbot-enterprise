// Commands to call from Rust backend (if needed later)
// For now, the web frontend handles all logic via Tauri plugins
// This file provides TypeScript bindings for any custom Tauri commands
// import { invoke } from '@tauri-apps/api/core';

export interface TauriCommandsAPI {
  // Add custom command signatures here as needed
  // Example: greet: (name: string) => Promise<string>;
}

export const useTauriCommands = (): TauriCommandsAPI => {
  // Custom command invocation example:
  // const greet = async (name: string): Promise<string> => {
  //   return await invoke<string>('greet', { name });
  // };

  return {
    // Expose custom commands here
  };
};

import { useDesktopNative } from './hooks/useDesktopNative';

function App() {
  const { getPlatform, showNotifications } = useDesktopNative();

  const handlePlatform = async () => {
    const platform = await getPlatform();
    alert(`Running on: ${platform}`);
  };

  const handleNotify = async () => {
    await showNotifications('MiniChat', 'Hello from the desktop app!');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>MiniChat Desktop</h1>
      <p>Enterprise AI Chatbot - Tauri 2.x</p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={handlePlatform} style={{ marginRight: '10px' }}>
          Detect Platform
        </button>
        <button onClick={handleNotify}>Send Notification</button>
      </div>
    </div>
  );
}

export default App;

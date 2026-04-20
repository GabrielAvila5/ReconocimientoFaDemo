import { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import CameraView from './components/CameraView';
import UsersList from './components/UsersList';
import { ShieldCheck, UserPlus, Fingerprint } from 'lucide-react';

function App() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [mode, setMode] = useState<'validate' | 'register' | 'users'>('validate');

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center">
      <header className="mb-8 text-center flex flex-col justify-center items-center gap-3">
        <div className="bg-primary/20 p-4 rounded-full border border-primary-dark shadow-[0_0_20px_var(--color-primary)]">
          <Fingerprint size={48} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400">
            DemoRF
          </h1>
          <p className="text-gray-400 text-sm mt-1">Proof of Concept: Local Face Recognition</p>
        </div>
      </header>

      <main className="w-full max-w-4xl grid md:grid-cols-3 gap-6">
        
        {/* Sidebar Controls */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <button 
            onClick={() => setMode('validate')}
            className={`p-4 rounded-xl backdrop-blur-md border transition-all flex items-center gap-3 ${mode === 'validate' ? 'bg-primary-dark/80 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-glass border-glass-border hover:bg-gray-800/50'}`}
          >
            <ShieldCheck size={24} className={mode === 'validate' ? 'text-blue-400' : 'text-gray-400'} />
            <div className="text-left">
              <h3 className="font-semibold">Modo Validación</h3>
              <p className="text-xs text-gray-400">Escaneo continuo</p>
            </div>
          </button>

          <button 
            onClick={() => setMode('register')}
            className={`p-4 rounded-xl backdrop-blur-md border transition-all flex items-center gap-3 ${mode === 'register' ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-glass border-glass-border hover:bg-gray-800/50'}`}
          >
            <UserPlus size={24} className={mode === 'register' ? 'text-red-400' : 'text-gray-400'} />
            <div className="text-left">
              <h3 className="font-semibold">Modo Registro</h3>
              <p className="text-xs text-gray-400">Alta de usuario (Multi-shot)</p>
            </div>
          </button>

          <button 
            onClick={() => setMode('users')}
            className={`p-4 rounded-xl backdrop-blur-md border transition-all flex items-center gap-3 ${mode === 'users' ? 'bg-green-900/40 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-glass border-glass-border hover:bg-gray-800/50'}`}
          >
            <Fingerprint size={24} className={mode === 'users' ? 'text-green-400' : 'text-gray-400'} />
            <div className="text-left">
              <h3 className="font-semibold">Perfiles</h3>
              <p className="text-xs text-gray-400">Ver base de datos</p>
            </div>
          </button>
        </div>

        {/* Viewfinder */}
        <div className="md:col-span-2">
          {mode === 'users' ? (
            <UsersList />
          ) : !modelsLoaded ? (
            <div className="h-96 w-full rounded-2xl bg-glass border border-glass-border flex items-center justify-center backdrop-blur-sm shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-200 animate-pulse font-medium tracking-wide">Cargando Modelos Neuronales...</p>
              </div>
            </div>
          ) : (
            <CameraView mode={mode} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

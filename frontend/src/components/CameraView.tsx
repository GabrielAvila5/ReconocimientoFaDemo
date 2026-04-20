import { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

interface CameraViewProps {
  mode: 'validate' | 'register';
}

const API_URL = 'http://localhost:3000/api';

export default function CameraView({ mode }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [name, setName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'warning'} | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [progress, setProgress] = useState(0);

  // Iniciar Webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error webcam: ', err);
      }
    };
    startVideo();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Lógica principal cada interval
  useEffect(() => {
    let interval: any;
    
    const tick = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (videoRef.current.paused || videoRef.current.ended) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Detectar rostro
      const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      // Limpiar y dimensionar canvas
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        // Redimensionar resultados
        const resized = faceapi.resizeResults(detection, displaySize);
        // Dibujar mesh (landmarks) para feedback visual!
        faceapi.draw.drawFaceLandmarks(canvas, resized);

        // Si estamos en modo validar, mandar al servidor TODO el tiempo
        if (mode === 'validate') {
          setStatusMsg('Rostro detectado, verificando...');
          try {
            const res = await fetch(`${API_URL}/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ descriptor: Array.from(resized.descriptor) })
            });
            const data = await res.json();
            if (data.match) {
              setToast({ 
                 msg: data.actuallyLogged ? `Acceso Registrado: ${data.user} (${data.distance.toFixed(3)})` : `Acceso Cooldown: ${data.user}`, 
                 type: data.actuallyLogged ? 'success' : 'warning' 
              });
              setTimeout(() => setToast(null), 3000);
            } else {
              setStatusMsg('Usuario Desconocido');
            }
          } catch (e) {
             console.error(e);
             setStatusMsg('Fallo de Red');
          }
        }
      } else {
         if (mode === 'validate') {
            setStatusMsg('Buscando rostro en la cámara...');
         }
      }
    };

    // Validar cada 1.5s
    if (mode === 'validate') {
      interval = setInterval(tick, 1500);
    } else {
      // En modo registro dibujamos libremente a más FPS pero no mandamos fetch
      interval = setInterval(tick, 200);
    }

    return () => clearInterval(interval);
  }, [mode]);

  const handleRegister = async () => {
    if (!name) return alert('Debes escribir un nombre');
    setIsRegistering(true);
    
    let captures: number[][] = [];
    
    // Instrucciones dinámicas para cada toma
    const prompts = [
      "1/5: Mira directamente a la cámara...",
      "2/5: Gira tu cabeza ligeramente a la IZQUIERDA...",
      "3/5: Gira tu cabeza ligeramente a la DERECHA...",
      "4/5: Inclina el rostro un poco hacia ARRIBA...",
      "5/5: Sonríe viendo a la cámara..."
    ];
    
    for(let i=0; i<5; i++) {
        setStatusMsg(prompts[i]);
        // Damos tiempo extra para que el usuario lea y asimile (1.5s)
        await new Promise(r => setTimeout(r, 1500));
        setProgress((i + 1) * 20);
        
        if (videoRef.current) {
           const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
           if (detection) {
             captures.push(Array.from(detection.descriptor));
           }
        }
    }

    if (captures.length === 0) {
       setStatusMsg('Fallo: No se detectaron rostros en ninguna toma.');
       setIsRegistering(false);
       return;
    }

    setStatusMsg(`Se capturaron ${captures.length} rostros validos. Guardando...`);

    // Enviar Multi-shot al servidor
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, descriptors: captures })
      });
      if(res.ok) {
         setToast({ msg: 'Usuario guardado exitosamente', type: 'success' });
      } else {
         setToast({ msg: 'Error de servidor', type: 'error' });
      }
    } catch(e) {
      console.error(e);
    }

    setIsRegistering(false);
    setProgress(0);
    setName('');
    setTimeout(() => {
        setStatusMsg('');
        setToast(null);
    }, 3000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-glass border border-glass-border shadow-2xl backdrop-blur-md flex flex-col h-full">
      {/* Toast Overlay */}
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full font-bold shadow-lg text-white transition-all transform scale-100 ${
          toast.type === 'success' ? 'bg-green-500/90 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 
          toast.type === 'warning' ? 'bg-amber-500/90 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 
          'bg-red-500/90 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Camera / Canvas */}
      {/* El uso de aspectRatio o object-contain arregla que los landmarks no se desfacen en pantallas alargadas/móviles */}
      <div className="relative w-full bg-black/50 flex-1 flex items-center justify-center overflow-hidden min-h-[300px]">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          className="absolute max-w-full max-h-full -scale-x-100" 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute max-w-full max-h-full -scale-x-100" 
        />
      </div>

      {/* Controls Container */}
      <div className="p-6">
        {mode === 'validate' ? (
           <div className="text-center space-y-2">
             <div className="inline-block relative">
                 <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping absolute top-0 left-0"></div>
                 <div className="w-4 h-4 bg-blue-500 rounded-full relative"></div>
             </div>
             <p className="text-blue-300 font-medium tracking-wide">
               {statusMsg || 'Escaneo en curso. Por favor mire hacia la cámara.'}
             </p>
           </div>
        ) : (
           <div className="space-y-4">
             <div className="flex gap-4">
               <input 
                 type="text" 
                 disabled={isRegistering}
                 placeholder="Nombre del Usuario" 
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
               />
               <button 
                 onClick={handleRegister} 
                 disabled={isRegistering}
                 className="bg-accent hover:bg-red-600 text-white px-6 py-2 rounded-xl font-medium shadow-[0_0_15px_rgba(185,28,28,0.5)] transition-all disabled:opacity-50"
               >
                 {isRegistering ? 'Capturando...' : 'Alta de Usuario'}
               </button>
             </div>
             
             {isRegistering && (
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                   <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
             )}
             
             {statusMsg && (
                 <p className="text-center text-red-300 text-sm font-medium">{statusMsg}</p>
             )}
           </div>
        )}
      </div>
    </div>
  );
}

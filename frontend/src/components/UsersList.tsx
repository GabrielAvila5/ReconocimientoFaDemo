import { useEffect, useState } from 'react';
import { Users, Clock, Trash2 } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  totalScans: number;
}

export default function UsersList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetch(`${API_URL}/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar a ${name} y todos sus registros de asistencia?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
         setUsers(users.filter(u => u.id !== id));
      } else {
         alert('Hubo un error al eliminar el usuario');
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-2xl bg-glass border border-glass-border shadow-2xl backdrop-blur-md p-6 min-h-[300px] flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
        <Users className="text-blue-400" /> Perfiles Registrados
      </h2>
      
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
           <Users size={48} className="opacity-20 mb-3" />
           <p>No hay perfiles registrados aú</p>
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[400px] pr-2 space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors">
               <div>
                  <h3 className="font-semibold text-lg text-white">{u.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                     <Clock size={12} /> {new Date(u.createdAt).toLocaleString()}
                  </p>
               </div>
               <div className="flex items-center gap-4 text-right">
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-md font-medium border border-blue-500/30">
                    {u.totalScans} Accesos
                  </span>
                  <button 
                     onClick={() => handleDelete(u.id, u.name)}
                     className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-md transition-colors"
                  >
                     <Trash2 size={16} />
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

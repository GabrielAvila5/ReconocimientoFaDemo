import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Caché en Memoria
interface CachedUser {
  id: string;
  name: string;
  descriptor: number[];
}

let cachedUsers: CachedUser[] = [];

// Cargar Usuarios a Memoria
const loadUsersIntoCache = async () => {
  const users = await prisma.user.findMany();
  cachedUsers = users.map(user => {
    // Prisma nos entrega el JsonValue. Como sabemos que guardamos un array, hacemos el casting
    const descriptorArray = user.faceDescriptor as Prisma.JsonArray;
    return {
      id: user.id,
      name: user.name,
      // Forzamos conversión a number[] para operar matemáticamente rápido
      descriptor: descriptorArray as number[] 
    };
  });
  console.log(`[Cache] Cargados ${cachedUsers.length} usuarios en memoria RAM.`);
};

// Matemática Euclidiana
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] || 0;
    const bi = b[i] || 0;
    const diff = ai - bi;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Promediar Multishots (Para tener un solo descriptor robusto de varios)
function averageDescriptors(descriptors: number[][]): number[] {
  if (!descriptors || descriptors.length === 0) return [];
  const len = descriptors[0]?.length || 128;
  const avg = new Array(len).fill(0);
  
  for (const desc of descriptors) {
    for (let i = 0; i < len; i++) {
      avg[i] += desc[i] || 0;
    }
  }
  for (let i = 0; i < len; i++) {
    avg[i] /= descriptors.length;
  }
  return avg;
}

// Ruta para Registrar Usuario Multi-Shot
app.post('/api/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, descriptors } = req.body; // descriptors is number[][]

    if (!name || !descriptors || descriptors.length === 0) {
      return res.status(400).json({ error: 'Name and descriptors array are required.' });
    }

    // Promediar descriptores capturados localmente
    const finalDescriptor = averageDescriptors(descriptors);

    // Guardar en DB
    const newUser = await prisma.user.create({
      data: {
        name,
        faceDescriptor: finalDescriptor as Prisma.JsonArray
      }
    });

    // Actualizar Caché en Memoria para validar instantáneamente el que se acaba de registrar
    cachedUsers.push({
      id: newUser.id,
      name: newUser.name,
      descriptor: finalDescriptor
    });

    return res.status(201).json({ message: 'User registered properly with multi-shot accuracy', user: newUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Guardamos la última vez que un usuario tuvo un logueo exitoso
const lastAccessTime: Record<string, number> = {};

// Ruta para Validar (Asistencia y Acceso)
app.post('/api/validate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { descriptor } = req.body; // number[] desde la camara web

    if (!descriptor || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid descriptor format.' });
    }

    let minDistance = Infinity;
    let matchedUser: CachedUser | null = null;
    const THRESHOLD = 0.55; 

    // Operar en Memoria RAM [Instantaneo]
    for (const cachedUser of cachedUsers) {
      const distance = euclideanDistance(descriptor, cachedUser.descriptor);
      if (distance < minDistance) {
        minDistance = distance;
        matchedUser = cachedUser;
      }
    }

    if (matchedUser && minDistance <= THRESHOLD) {
      const now = Date.now();
      const COOLDOWN_MS = 60000; // 60 segundos de cooldown para no 스pammar accesos
      
      let logged = false;
      if (!lastAccessTime[matchedUser.id] || now - lastAccessTime[matchedUser.id] > COOLDOWN_MS) {
         // Loggear Attendance
         await prisma.attendance.create({
           data: {
             userId: matchedUser.id,
             confidence: minDistance
           }
         });
         lastAccessTime[matchedUser.id] = now;
         logged = true;
      }

      return res.status(200).json({
        match: true,
        user: matchedUser.name,
        distance: minDistance,
        message: logged ? 'Acceso Registrado' : 'Acceso Previamente Registrado',
        actuallyLogged: logged
      });
    }

    // No match
    return res.status(401).json({ match: false, error: 'User not recognized or not enough confidence.', distance: minDistance });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Ruta para Obtener Usuarios
app.get('/api/users', async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { attendances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      totalScans: u._count.attendances
    }));
    
    return res.json(safeUsers);
  } catch(error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Ruta para Eliminar un Usuario
app.delete('/api/users/:id', async (req: Request, res: Response): Promise<any> => {
   try {
     const id = req.params.id as string;
     
     // Primero borrar dependencias (Attendances)
     await prisma.attendance.deleteMany({
        where: { userId: id }
     });

     // Luego borrar usuario de DB
     await prisma.user.delete({
        where: { id }
     });

     // Borrar del caché en memoria
     cachedUsers = cachedUsers.filter(u => u.id !== id);
     delete lastAccessTime[id];

     return res.json({ success: true, message: 'Usuario Eliminado' });
   } catch(error) {
     console.error(error);
     return res.status(500).json({ error: 'Fallo al eliminar' });
   }
});

// Ruta para Obtener Usuarios
app.get('/api/users', async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { attendances: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      totalScans: u._count.attendances
    }));
    
    return res.json(safeUsers);
  } catch(error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Boot Sequence
app.listen(PORT, async () => {
  console.log(`Backend de reconocimiento biometríco iniciado en: http://localhost:${PORT}`);
  await loadUsersIntoCache();
});

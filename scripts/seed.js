import { initDb } from '../services/dbService.js'
import { Canvas } from '../models/canvasSchema.js'

await initDb();

// Crea el canvas por defecto si no existe
const canvas = await Canvas.findOne({ _id: "default" });
if (!canvas) {
    await Canvas.updateOne(
        { _id: "default" },
        {
            $setOnInsert: {
                _id: "default",
                name: "Default Canvas",
                description: "",
                thumbnail: "",
                data: {}
            }
        },
        { upsert: true }
    )
    console.log('Canvas por defecto creado');
} else {
    console.log('Canvas por defecto ya existe');
}

// Finaliza el proceso
process.exit(0);

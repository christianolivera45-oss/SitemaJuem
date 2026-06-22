async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/articulos');
    if (res.ok) {
       const arts = await res.json() as any[];
       for (const a of arts) {
          if (a.tipo === 'compuesto') {
             console.log(`Composite item: ${a.codigo} - ${a.nombre}`);
             console.log("Components:", a.componentes);
          }
       }
    }
  } catch(err: any) {
    console.error(err.message);
  }
}
run();

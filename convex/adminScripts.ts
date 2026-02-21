import { query } from "./_generated/server";

export const verifyUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const newNames = [
      "Carlos Vargas", "Armando Lavado", "Salma Maas", "Samuel Russo", 
      "Enma Bascuñana", "Franco Ferrer", "Said Hassoun", "Johana Andrade", 
      "José Hernández", "Raúl Bracho", "Simón Hallak", "Gabriel Olano", 
      "Ricardo Bermengui", "Salma Maaz", "Raul Bracho", "Simon Hallak"
    ];
    
    // log all users that matched
    const matched = users.filter(u => newNames.some(n => u.nombre.includes(n.split(' ')[0])));
    let out = "MATCHED USERS:\n";
    for (const u of matched) {
        out += `[${u._id}] ${u.nombre} - ${u.estado} - ${new Date(u.fechaIngreso).toISOString()}\n`;
    }
    return out;
  }
});

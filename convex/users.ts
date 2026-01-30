
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db
            .query("users")
            .withIndex("by_nombre")
            .collect();
        // Filter out archived users client-side or here? 
        // Usually better to filter in query if index supports it, but simple filter here is fine for now
        return users.filter((u) => !u.isArchived).sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
});

export const create = mutation({
    args: {
        nombre: v.string(),
        fechaIngreso: v.number(),
        estado: v.union(v.literal("Interno"), v.literal("Casas"), v.literal("Mantenimiento"), v.literal("Desconocido")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_nombre", (q) => q.eq("nombre", args.nombre))
            .first();

        if (existing) {
            // already exists
        }

        await ctx.db.insert("users", {
            nombre: args.nombre,
            fechaIngreso: args.fechaIngreso,
            estado: args.estado,
            isArchived: false,
        });
    },
});



export const edit = mutation({
    args: {
        id: v.id("users"),
        nombre: v.string(),
        estado: v.optional(v.union(v.literal("Interno"), v.literal("Casas"), v.literal("Mantenimiento"), v.literal("Desconocido"))),
    },
    handler: async (ctx, args) => {
        const patch: any = { nombre: args.nombre };
        if (args.estado) {
            patch.estado = args.estado;
        }
        await ctx.db.patch(args.id, patch);
    },
});

export const archive = mutation({
    args: {
        id: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            isArchived: true,
        });
    },
});

// Seed function
export const seedUsers = mutation({
    args: {},
    handler: async (ctx) => {
        const usersList = [
            "Aaron", "Adrian Avila", "Alan Perez", "Alejandro Gonzales", "Alejandro Marquez",
            "Alejandro Mirt", "Anna Chirico", "Belen Muñoz", "Camila Gonzales", "Carlos Gorrin",
            "Cesar Daniel Alizo", "Cesar Gonzales", "Daniel Barinas", "Daniel Medina", "Eduardo Casasola",
            "Ernesto De Lucca", "Franchezco", "Jammoul Nawar", "Jeroni Falgas", "Jesus Perozo",
            "Jose Silva", "Juan Andres Perez", "Juan Carlos Pinto", "Jorge Figueroa", "Kluiverth Ramirez",
            "Maria Ines Delgado", "Miguel Velasquez", "Nicolas Arriaga", "Oscar Martin", "Rafael Adriàn",
            "Rafael Nuñez", "Raul Bracho", "Reinier Gomes", "Ricardo Bermengui", "Salma Maaz",
            "Santiago Solorzano", "Santiago Sprik", "Sayed", "Simon Hallak", "Xavier Galli"
        ];

        const fechaIngreso = new Date("2026-01-01T12:00:00").getTime(); // 01/01/2026 noon to be safe from TZ issues

        // First, verify if we already have these users to avoid duplicates if run multiple times
        // For a clean seed, we could delete everything or just check. 
        // Let's check individually or just insert if this is a "run once" tool.

        for (const name of usersList) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_nombre", (q) => q.eq("nombre", name))
                .first();

            if (!existing) {
                await ctx.db.insert("users", {
                    nombre: name,
                    fechaIngreso,
                    estado: "Interno", // Default for new seed
                    isArchived: false,
                });
            } else if (!existing.estado) {
                // Backfill for existing users from previous seed
                await ctx.db.patch(existing._id, {
                    estado: "Interno"
                });
            }
        }
    },
});

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Variables de Entorno Requeridas

Para el deploy en producción, necesitas configurar las siguientes variables de entorno en Vercel:

1. **NEXT_PUBLIC_CONVEX_URL** (Requerida)
   - Obtén esta URL desde tu dashboard de Convex: https://dashboard.convex.dev
   - Ejemplo: `https://kindred-jay-853.convex.cloud`
   - Esta variable es pública y se usa en el cliente

### Cómo configurar en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega `NEXT_PUBLIC_CONVEX_URL` con el valor de tu deployment de Convex
4. Selecciona los ambientes donde aplica (Production, Preview, Development)
5. Guarda y redeploya

### Deploy de Convex

Antes de hacer deploy de Next.js, asegúrate de tener tu backend Convex desplegado:

```bash
npm run convex:deploy
```

Esto creará/actualizará tu deployment de Convex y te dará la URL que necesitas para `NEXT_PUBLIC_CONVEX_URL`.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

import { Poppins, Work_Sans } from 'next/font/google';

export const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-heading',
    display: 'swap',
});

export const workSans = Work_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-body',
    display: 'swap',
});

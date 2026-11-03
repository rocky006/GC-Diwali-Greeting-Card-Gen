export interface Creative {
  id: string;
  number: number;
  title: string;
  url: string;
  fallbackUrl: string;
  nameColor: string;
  desigColor: string;
  nameFontSize: number;
  desigFontSize: number;
  defaultY: number;
  suggestedAlignment: 'center' | 'left' | 'right';
}

export const CREATIVES: Creative[] = [
  {
    id: 'creative-1',
    number: 1,
    title: 'Divine Diya',
    url: 'https://ik.imagekit.io/l5hh7c8ss/Diwali/Diwali%20(1).png',
    fallbackUrl: '/creatives/template_1.jpg',
    nameColor: '#7D1848',
    desigColor: '#555555',
    nameFontSize: 42,
    desigFontSize: 24,
    defaultY: 1235,
    suggestedAlignment: 'center',
  },
  {
    id: 'creative-2',
    number: 2,
    title: 'Festive Night',
    url: 'https://ik.imagekit.io/l5hh7c8ss/Diwali/Diwali%20(2).png',
    fallbackUrl: '/creatives/template_2.jpg',
    nameColor: '#ffffff',
    desigColor: '#ffffff',
    nameFontSize: 42,
    desigFontSize: 24,
    defaultY: 1235,
    suggestedAlignment: 'center',
  },
  {
    id: 'creative-3',
    number: 3,
    title: 'Rangoli Diya',
    url: 'https://ik.imagekit.io/l5hh7c8ss/Diwali/Diwali%20(3).png',
    fallbackUrl: '/creatives/template_3.jpg',
    nameColor: '#7D1848',
    desigColor: '#555555',
    nameFontSize: 42,
    desigFontSize: 24,
    defaultY: 1235,
    suggestedAlignment: 'center',
  },
  {
    id: 'creative-4',
    number: 4,
    title: 'Lotus Lamp',
    url: 'https://ik.imagekit.io/l5hh7c8ss/Diwali/Diwali%20(4).png',
    fallbackUrl: '/creatives/template_4.jpg',
    nameColor: '#ffffff',
    desigColor: '#ffffff',
    nameFontSize: 42,
    desigFontSize: 24,
    defaultY: 1235,
    suggestedAlignment: 'center',
  },
  {
    id: 'creative-5',
    number: 5,
    title: 'Golden Mandala',
    url: 'https://ik.imagekit.io/l5hh7c8ss/Diwali/Diwali%20(5).png',
    fallbackUrl: '/creatives/template_5.jpg',
    nameColor: '#7D1848',
    desigColor: '#555555',
    nameFontSize: 42,
    desigFontSize: 24,
    defaultY: 1235,
    suggestedAlignment: 'center',
  },
];

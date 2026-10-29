/**
 * `lite-youtube-embed` ships no type declarations. Importing it only registers
 * the `<lite-youtube>` custom element as a side effect (the `youtube` home
 * block), so an empty ambient module is enough. This file has no imports so the
 * declaration is global/ambient and reliably picked up.
 */
declare module 'lite-youtube-embed';

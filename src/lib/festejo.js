/** Festejo visual: una flor que florece con pétalos que se esparcen. La disparan los avisos de «guardado», «subido», «editado»… (ver components/Festejo.jsx). */
export const festejar = flor => window.dispatchEvent(new CustomEvent('tm-festejo', { detail: { flor } }));

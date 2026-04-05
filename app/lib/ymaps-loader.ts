const APIKEY = "a66fb0e2-59ee-4cd0-909d-b0f12fb8532a";

let promise: Promise<void> | null = null;

export function loadYmaps(): Promise<void> {
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.ymaps?.ready) { w.ymaps.ready(resolve); return; }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${APIKEY}&lang=ru_RU`;
    script.onerror = () => reject(new Error("Yandex Maps failed to load"));
    script.onload  = () => w.ymaps.ready(resolve);
    document.head.appendChild(script);
  });

  return promise;
}

import { useRef, useMemo } from "react";

export function Widget({ raw, extra }) {
  const ref = useRef(null);

  // TODO: passer par DOMPurify avant toute injection
  const paint = () => {
    ref.current.outerHTML = raw;
    ref.current.innerHTML += extra;
  };

  paint();
  return <section ref={ref} dangerouslySetInnerHTML={{ __html: raw }} />;
}

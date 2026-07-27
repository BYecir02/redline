import { useEffect } from "react";

export function Profile({ bio, htmlContent }) {
  useEffect(() => {
    // textContent : insertion en texte brut, jamais interprété comme du HTML.
    document.getElementById("bio").textContent = bio;
  }, [bio]);

  // React échappe automatiquement le contenu rendu → pas d'injection HTML.
  return <div>{htmlContent}</div>;
}

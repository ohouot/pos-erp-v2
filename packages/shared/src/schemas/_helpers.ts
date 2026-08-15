import { z } from "zod";

// Normalise une chaîne vide — valeur par défaut d'un <input>/<select> HTML
// non renseigné — en `undefined`, pour qu'un champ optionnel (URL, email,
// enum, id de relation...) ne soit pas rejeté par sa validation stricte
// quand il est simplement laissé vide dans le formulaire.
export function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );
}

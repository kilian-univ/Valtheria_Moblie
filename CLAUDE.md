@AGENTS.md

## Langue

- Toujours répondre en français, y compris dans les messages intermédiaires et les comptes rendus.

## Zone protégée

- Ne jamais modifier `src/context/ApiContext.tsx` ni aucun fichier d'environnement (`.env`, `.env.local`, et toute variante), ni par l'éditeur ni par une commande du terminal. Deux règles hookify le bloquent : `.claude/hookify.block-backend-files.local.md` et `.claude/hookify.block-backend-bash.local.md`. Elles sont locales, exclues de Git par `.git/info/exclude`.
- Ne jamais contourner ce blocage. Si une modification de cette zone semble nécessaire, s'arrêter et expliquer pourquoi.
- Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications.

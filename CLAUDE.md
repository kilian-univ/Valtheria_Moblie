@AGENTS.md

## Langue

- Toujours répondre en français, y compris dans les messages intermédiaires et les comptes rendus.

## Zone protégée

- Ne jamais modifier `src/context/ApiContext.tsx` ni aucun fichier d'environnement (`.env`, `.env.local`, et toute variante), ni par l'éditeur ni par une commande du terminal. Deux règles hookify le bloquent : `.claude/hookify.block-backend-files.local.md` et `.claude/hookify.block-backend-bash.local.md`. Elles sont locales, exclues de Git par `.git/info/exclude`.
- Ne jamais contourner ce blocage. Si une modification de cette zone semble nécessaire, s'arrêter et expliquer pourquoi.
- Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications.

## Branches et fusion

Règle obligatoire, pour chaque chantier :
1. ne jamais pousser sur `main` ni sur `design/ui`, et ne jamais fusionner quoi que ce soit ;
2. créer une branche dédiée depuis `main` à jour (`git fetch origin && git checkout -b <nom-du-chantier> origin/main`), nommée d'après le chantier (par exemple `lot-0-securite-et-cadre`) ;
3. y faire les commits du chantier, puis la pousser (`git push -u origin <nom-du-chantier>`) ;
4. terminer par une demande de fusion (pull request) vers `main`, qui décrit ce qui change, ce qui a été vérifié (tsc, ESLint, tests) et ce que le relecteur doit regarder ;
5. Kilian relit et fusionne lui-même. Ne jamais fusionner, ne jamais forcer un push, ne jamais réécrire l'historique d'une branche poussée.

Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications (voir « Zone protégée »). Le compte rendu de fin de chantier donne l'adresse de la pull request.

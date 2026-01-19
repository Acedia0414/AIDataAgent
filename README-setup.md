
## Scratchpad

```sh
node -v     #
npm -v      #
nvm -v      #
pnpm -v     # npm install -g pnpm
tsc -v      # npm install -g typescript
vitest -v   # npm install -g vitest
# Vite is installed via dependencies, so no global install needed (AI said so)

pnpm install

# packages' installation that require native build scripts were blocked by pnpm
# so we need to approve them manually
pnpm approve-builds


brew install mysql
brew services start mysql && mysql --version
brew services list
mysql_secure_installation

mysql -u root -p  # type password set ("d365aiagent")
# mysql shell --> CREATE DATABASE IF NOT EXISTS d365_agent;
pnpm db:push
```

## Notes

- What would be handled by us now, manually:
    - The database (may use SQL Server or else)
    - The LLM API
    - The authentication

## Misc

```sh
repomix .
    --include "README.md,docs/deployment/local-setup.md,DEVELOPER_GUIDE.md"
    --output output-repomix.md
    --style markdown


clippy README.md example.png
```
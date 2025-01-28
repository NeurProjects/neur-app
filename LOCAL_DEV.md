# Local Development

This describes steps to spin up Neur.sh locally:

## Environment Variables

You will need to sign up for [Privy](https://www.privy.io/) and create a development app.

Choice of model provider:

- [OpenRouter](https://openrouter.ai/) API key (Accepts payments via crypto)
- [Anthropic](https://www.anthropic.com/) API key
- [OpenAI](https://platform.openai.com/) API key

You also need to have

- [ImgBB](https://api.imgbb.com/) API key for image uploads
- [Jina AI](https://jina.ai/) API key for url retrieval

Create a `.env` file:

```
# Required Model Secrets (Either OpenAI compatible or Anthropic directly)

OPENAI_API_KEY=<YOUR_OPENAI_API_KEY> # Recommended from https://openrouter.ai/
OPENAI_BASE_URL=<YOUR_OPENAI_BASE_URL> # Recommended: https://openrouter.ai/
OPENAI_MODEL_NAME=<YOUR_OPENAI_MODEL_NAME> # Recommended: anthropic/claude-3.5-sonnet
# OR
ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_API_KEY>


# Required Secrets
PRIVY_APP_SECRET=<YOUR_PRIVY_APP_SECRET>
WALLET_ENCRYPTION_KEY=<YOUR_WALLET_ENCRYPTION_KEY>
HELIUS_API_KEY=<YOUR_HELIUS_API_KEY> # Helius SDK is used on the backend for smart transactions for swaps

# Optional Secrets (tools might not work)
JINA_API_KEY=<YOUR_JINA_API_KEY> # web scraping
CG_API_KEY=<YOUR_COIN_GECKO_API_KEY> # charts
CG_BASE_URL=<BASE_URL_FOR_COIN_GECKO> # there are different urls for demo vs pro
TELEGRAM_BOT_TOKEN=<YOUR_TG_BOT_TOKEN> # sending notifications through telegram
TELEGRAM_BOT_USERNAME=<YOUR_TG_BOT_USERNAME> # optional, but saves an API call
DISCORD_BOT_TOKEN=<YOUR_DISCORD_BOT_TOKEN> # used for discord integrations
DISCORD_GUILD_ID=<YOUR_DISCORD_GUILD_ID> # used for a specific discord server
DISCORD_ROLE_ID=<YOUR_DISCORD_ROLE_ID> # used for a specific discord role


# Public
NEXT_PUBLIC_MAINTENANCE_MODE=false
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_PRIVY_APP_ID=<YOUR_PRIVY_APP_ID>
NEXT_PUBLIC_IMGBB_API_KEY=<YOUR_IMGBB_API_KEY>
NEXT_PUBLIC_EAP_RECEIVE_WALLET_ADDRESS=<YOUR_EAP_RECEIVE_WALLET_ADDRESS>
NEXT_PUBLIC_HELIUS_RPC_URL=<YOUR_HELIUS_RPC_URL>

# DB
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin

# Privy Embedded Wallet Delegated Actions
PRIVY_SIGNING_KEY=<YOUR_PRIVY_SIGNING_KEY>
```

Optionall you can provide a [Helius](https://www.helius.dev/) private RPC URL.

### YOUR_WALLET_ENCRYPTION_KEY

Use openSSL to create this:

```
openssl rand -base64 32
```

### YOUR_EAP_RECEIVE_WALLET_ADDRESS

This can be any wallet address, it is not used in local development

## Docker setup

If you're building the image run

```
pnpm run dev:up-build
```

If you're starting from an existing image run

```
pnpm run dev:up
```

### Docker troubleshooting

Sometimes if you add a dependecy you'll have to rebuild the image and clear existing volumes. If you run into issues with dependencies not adding clear your image, volumes, and build cache:

```
docker ps -a --filter "name=neur-app-" --format "{{.ID}}" | xargs -r docker rm -f
docker volume rm root_node_modules
docker volume rm webapp_next
docker builder prune --all
```

## Initial User Setup

When you first start, you'll have to make a user account with Privy, log in and do so. Then navigate to `http://localhost:5555/` , where an instance of [Prisma Studio](https://github.com/prisma/studio) should be running. There you can edit the `User` you just made and set `earlyAccess` to true. This will allow you to do local development without having to send sol around.

import { createBackend } from './backend.ts';
import { loadConfig } from './config.ts';
import { createCollabServer } from './server.ts';

const config = loadConfig();

const server = createCollabServer({
    port: config.port,
    secret: config.secret,
    debounce: config.debounce,
    maxDebounce: config.maxDebounce,
    backend: createBackend({ baseUrl: config.backendUrl, secret: config.secret }),
});

await server.listen();

console.info(`Collab server listening on :${server.address.port}, storing through ${config.backendUrl}`);

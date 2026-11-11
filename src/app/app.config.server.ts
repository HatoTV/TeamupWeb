import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appConfig } from './app.config';
import { HttpBackend } from '@angular/common/http';
import { SERVER_ASSET_READER, ServerAssetsBackend } from './core/server-assets';

/** Prerendering runs from the workspace root: public assets are read from ./public. */
function readPublicAsset(path: string): string | null {
  try {
    return readFileSync(join(process.cwd(), 'public', path), 'utf8');
  } catch {
    return null;
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: SERVER_ASSET_READER, useValue: readPublicAsset },
    { provide: HttpBackend, useClass: ServerAssetsBackend },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

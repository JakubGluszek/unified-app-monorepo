import { merge } from 'lodash';
import type { Config } from 'tailwindcss';
import uiConfig from '@repo/ui/tailwind.config';

const config: Config = merge({}, uiConfig, {
  theme: {
    extend: {
      fontFamily: {
        mono: ['DepartureMono', 'monospace'],
      },
    },
  },
});

export default config;

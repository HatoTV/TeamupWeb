// postcss.config.js
import autoprefixer from 'autoprefixer';
import purgecss from '@fullhuman/postcss-purgecss';

const purgeCssPlugin = purgecss({
  content: [
    './src/**/*.html',
    './src/**/*.ts'
  ],
  defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || []
});

export default {
  plugins: [
    autoprefixer,
    ...(process.env.NODE_ENV === 'production' ? [purgeCssPlugin] : [])
  ]
};

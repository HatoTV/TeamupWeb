// postcss.config.js
module.exports = {
    plugins: [
      require('postcss-import'),
      require('postcss-nested'),
      require('autoprefixer'),
      require('@fullhuman/postcss-purgecss')({
        content: [
          './src/**/*.html',
          './src/**/*.ts',
          // Ajoutez d'autres chemins si nécessaire
        ],
        safelist: [],
        // Si vous utilisez des frameworks comme TailwindCSS, ajoutez ici les options spécifiques
      }),
    ],
  };